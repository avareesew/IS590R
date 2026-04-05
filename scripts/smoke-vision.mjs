// Run with: node --env-file=.env.local scripts/smoke-vision.mjs
// Tests the full FR-02 → FR-02d pipeline on all fixture PDFs.

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk").default;

const FIXTURES = "fixtures/training-docs";

function findPdfs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...findPdfs(full));
    else if (extname(entry).toLowerCase() === ".pdf") results.push(full);
  }
  return results;
}

function extractText(buffer) {
  return pdfParse(buffer);
}

async function extractWithVision(buffer, filename, client) {
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
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: `You are processing a sales training PDF. Your job is to extract all training-relevant content.

1. TRANSCRIBE all visible text exactly as it appears — scripts, objections, value props, process steps, personas, industry terms, frameworks. Do not summarize; copy the text faithfully.

2. DESCRIBE any diagrams, flowcharts, tables, or visual elements that contain training content — list nodes, arrows, labels, and relationships in plain text. Skip decorative images.

Return your response in this exact format:

<transcribed_text>
[all visible text here]
</transcribed_text>

<diagram_descriptions>
[one description per visual element, separated by blank lines. If none, write "None."]
</diagram_descriptions>`,
          },
        ],
      },
    ],
  });

  const raw = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const transcribed = raw.match(/<transcribed_text>([\s\S]*?)<\/transcribed_text>/)?.[1]?.trim() ?? "";
  const diagramRaw = raw.match(/<diagram_descriptions>([\s\S]*?)<\/diagram_descriptions>/)?.[1]?.trim() ?? "";
  const diagramDescriptions =
    diagramRaw === "None." || diagramRaw === ""
      ? []
      : diagramRaw.split(/\n{2,}/).map((d) => d.trim()).filter(Boolean);

  return { filename, text: transcribed, diagramDescriptions };
}

const CHARS_PER_PAGE_THRESHOLD = 300;

function merge(textLayer, vision) {
  const blocks = [];
  const textDensity = textLayer.text.length / textLayer.numpages;
  const hasRichTextLayer = textDensity >= CHARS_PER_PAGE_THRESHOLD;

  if (textLayer.text.trim()) blocks.push({ provenance: "text_layer", content: textLayer.text.trim() });
  if (!hasRichTextLayer && vision.text.trim()) blocks.push({ provenance: "vision", content: vision.text.trim() });
  vision.diagramDescriptions.forEach((desc, i) =>
    blocks.push({ provenance: `vision:diagram=${i + 1}`, content: desc })
  );

  return blocks;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pdfs = findPdfs(FIXTURES);

console.log(`\nFound ${pdfs.length} PDF(s) — running vision extraction...\n`);

for (const filepath of pdfs) {
  console.log(`── ${filepath} ──`);
  try {
    const buffer = readFileSync(filepath);

    const [textLayer, vision] = await Promise.all([
      extractText(buffer),
      extractWithVision(buffer, filepath, client),
    ]);

    const blocks = merge(textLayer, vision);
    const canonical = blocks.map((b) => b.content).join("\n\n");

    console.log(`  Pages         : ${textLayer.numpages}`);
    console.log(`  Text layer    : ${textLayer.text.length} chars (~${Math.round(textLayer.text.length / textLayer.numpages)}/page)`);
    console.log(`  Vision text   : ${vision.text.length} chars`);
    console.log(`  Diagrams found: ${vision.diagramDescriptions.length}`);
    console.log(`  Canonical text: ${canonical.length} chars`);
    console.log(`  Provenance    : ${blocks.map((b) => b.provenance).join(", ")}`);
    if (vision.diagramDescriptions.length > 0) {
      console.log(`  Diagram[0]    : ${vision.diagramDescriptions[0].slice(0, 150)}...`);
    }
    console.log();
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}\n`);
  }
}
