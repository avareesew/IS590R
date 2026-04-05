import Anthropic from "@anthropic-ai/sdk";

// Import from internal path to avoid pdf-parse's self-test running at build time
// (the default entry point reads ./test/data/05-versions-space.pdf on load)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> =
  require("pdf-parse/lib/pdf-parse.js");

// ─── Text layer extraction (FR-02) ────────────────────────────────────────────

export interface ExtractedDocument {
  filename: string;
  text: string;
  pageCount: number;
  charCount: number;
}

export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<ExtractedDocument> {
  const data = await pdfParse(buffer);
  return {
    filename,
    text: data.text,
    pageCount: data.numpages,
    charCount: data.text.length,
  };
}

// ─── Vision extraction (FR-02b–02c) ───────────────────────────────────────────

export interface VisionExtractedDocument {
  filename: string;
  /** Raw text Claude extracted/transcribed from the PDF */
  text: string;
  /** Diagram and visual element descriptions Claude found */
  diagramDescriptions: string[];
}

const VISION_PROMPT = `You are processing a sales training PDF. Your job is to extract all training-relevant content so it can be used to build a structured training program.

Please do two things:

1. TRANSCRIBE all visible text exactly as it appears — scripts, objections, value props, process steps, personas, industry terms, frameworks. Do not summarize; copy the text faithfully.

2. DESCRIBE any diagrams, flowcharts, tables, or visual elements that contain training content — list nodes, arrows, labels, and relationships in plain text. Skip decorative images.

Return your response in this exact format:

<transcribed_text>
[all visible text here]
</transcribed_text>

<diagram_descriptions>
[one description per visual element, separated by blank lines. If none, write "None."]
</diagram_descriptions>`;

export async function extractWithVision(
  buffer: Buffer,
  filename: string,
  client: Anthropic
): Promise<VisionExtractedDocument> {
  const base64 = buffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: VISION_PROMPT,
          },
        ],
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("");

  const transcribed = raw.match(/<transcribed_text>([\s\S]*?)<\/transcribed_text>/)?.[1]?.trim() ?? "";
  const diagramRaw = raw.match(/<diagram_descriptions>([\s\S]*?)<\/diagram_descriptions>/)?.[1]?.trim() ?? "";
  const diagramDescriptions =
    diagramRaw === "None." || diagramRaw === ""
      ? []
      : diagramRaw.split(/\n{2,}/).map((d) => d.trim()).filter(Boolean);

  return { filename, text: transcribed, diagramDescriptions };
}

// ─── Merge (FR-02d) ───────────────────────────────────────────────────────────

export interface CanonicalDocument {
  filename: string;
  /** Final merged text passed into the pipeline */
  canonicalText: string;
  /** Per-block provenance for HITL transparency */
  blocks: { provenance: string; content: string }[];
  pageCount: number;
  charCount: number;
}

const CHARS_PER_PAGE_THRESHOLD = 300;

export function mergeExtractions(
  textLayer: ExtractedDocument,
  vision: VisionExtractedDocument
): CanonicalDocument {
  const blocks: { provenance: string; content: string }[] = [];

  const textDensity = textLayer.charCount / textLayer.pageCount;
  const hasRichTextLayer = textDensity >= CHARS_PER_PAGE_THRESHOLD;

  // Always include the text layer as primary source
  if (textLayer.text.trim()) {
    blocks.push({ provenance: "text_layer", content: textLayer.text.trim() });
  }

  // Append vision transcription when text layer is sparse
  if (!hasRichTextLayer && vision.text.trim()) {
    blocks.push({ provenance: "vision", content: vision.text.trim() });
  }

  // Always append diagram descriptions when present
  vision.diagramDescriptions.forEach((desc, i) => {
    blocks.push({ provenance: `vision:diagram=${i + 1}`, content: desc });
  });

  const canonicalText = blocks.map((b) => b.content).join("\n\n");

  return {
    filename: textLayer.filename,
    canonicalText,
    blocks,
    pageCount: textLayer.pageCount,
    charCount: canonicalText.length,
  };
}
