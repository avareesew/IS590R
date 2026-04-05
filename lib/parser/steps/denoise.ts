import Anthropic from "@anthropic-ai/sdk";

export interface DenoiseResult {
  filteredText: string;
  /** Estimated % of input removed as noise */
  noisePercent: number;
}

const SYSTEM_PROMPT = `You are a training content filter for a sales training platform. Your job is to strip noise from raw sales training documents so only conversation-relevant content remains.

REMOVE the following (they are noise):
- Welcome letters and motivational openers ("You're in a great place!", "Stay positive!")
- Table of contents and section headers with no content
- Commission structures, income tables, pay schedules
- Daily/weekly schedules, time-blocked calendars, activity quotas
- Dress code, grooming, and personal conduct policies
- Legal boilerplate, disclaimers, and compliance text
- References to images or visuals ("see photo above", "as shown in the diagram")
- Internal company operations not relevant to customer conversations
- Glossary sections (these will be extracted separately in the next step)

KEEP the following (they are training signal):
- Sales scripts — intro variants, pitch questions, close lines, word-for-word talk tracks
- Objection handling entries — trigger phrases and response variants
- Value proposition explanations — what the product/service does and why it matters
- Conversation frameworks — Funnel Concept, Question-Based Selling, AGREE/RESPOND/REDIRECT
- Industry terminology used in customer conversations
- Customer personas and demographic descriptions
- Process steps that involve direct customer interaction
- Tactical advice on how to handle conversations

Return ONLY the filtered text. Do not write any preamble, intro sentence, header, or explanation before or after the content. Do not summarize — preserve the original wording of kept content exactly as written.`;

const CHUNK_SIZE = 12000;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  // Split on double newlines to avoid cutting mid-sentence
  const paragraphs = text.split(/\n{2,}/);
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function denoiseChunk(chunk: string, client: Anthropic): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: chunk }],
  });
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("")
    .trim();
}

export async function denoise(
  canonicalText: string,
  client: Anthropic
): Promise<DenoiseResult> {
  const chunks = chunkText(canonicalText);
  const filteredChunks = await Promise.all(
    chunks.map((chunk) => denoiseChunk(chunk, client))
  );
  const filteredText = filteredChunks.join("\n\n");

  const noisePercent =
    canonicalText.length > 0
      ? Math.round(
          ((canonicalText.length - filteredText.length) /
            canonicalText.length) *
            100
        )
      : 0;

  return { filteredText, noisePercent };
}
