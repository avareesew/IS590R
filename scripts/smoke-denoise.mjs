// Run with: node --env-file=.env.local scripts/smoke-denoise.mjs
// Tests Step 1 (Signal Denoising) on all fixture PDFs.

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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pdfs = findPdfs(FIXTURES);

console.log(`\nFound ${pdfs.length} PDF(s) — running denoise...\n`);

for (const filepath of pdfs) {
  console.log(`── ${filepath} ──`);
  try {
    const buffer = readFileSync(filepath);
    const { text, numpages } = await pdfParse(buffer);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const filtered = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const noisePercent = Math.round(((text.length - filtered.length) / text.length) * 100);

    console.log(`  Pages         : ${numpages}`);
    console.log(`  Input chars   : ${text.length}`);
    console.log(`  Output chars  : ${filtered.length}`);
    console.log(`  Noise removed : ${noisePercent}%`);
    console.log(`  Preview       : ${filtered.slice(0, 300).replace(/\n+/g, " ").trim()}`);
    console.log();
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}\n`);
  }
}
