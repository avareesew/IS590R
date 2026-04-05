// Run with: node --env-file=.env.local scripts/smoke-pipeline.mjs
// End-to-end test of all 4 pipeline steps on a fixture PDF.
// Does NOT require Postgres or Blob — reads fixtures directly.

import { readFileSync } from "fs";
import { createRequire } from "module";
import { writeFileSync } from "fs";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk").default;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Config ────────────────────────────────────────────────────────────────────
// Change this to test a different fixture
const FIXTURE = "fixtures/training-docs/examplethree/2025 Alta Start Script (With Visual Aids).pdf";
const TRAINING_BRIEF = {
  topics: ["Objection Handling", "Intro Scripts", "Closing Scripts", "Value Props"],
  documentationNotes: "",
};

// ── Step helpers (inline to avoid TS compilation) ─────────────────────────────

function stripFences(raw) {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

async function extractText(buffer) {
  return pdfParse(buffer);
}

async function extractWithVision(buffer) {
  const base64 = buffer.toString("base64");
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: `Extract all training content from this PDF.

<transcribed_text>
[all visible text]
</transcribed_text>

<diagram_descriptions>
[one description per visual element, or "None."]
</diagram_descriptions>` },
      ],
    }],
  });
  const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
  const transcribed = raw.match(/<transcribed_text>([\s\S]*?)<\/transcribed_text>/)?.[1]?.trim() ?? "";
  const diagramRaw = raw.match(/<diagram_descriptions>([\s\S]*?)<\/diagram_descriptions>/)?.[1]?.trim() ?? "";
  const diagrams = diagramRaw === "None." || !diagramRaw ? [] : diagramRaw.split(/\n{2,}/).map(d => d.trim()).filter(Boolean);
  return { transcribed, diagrams };
}

async function denoise(text) {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: `You are a training content filter. Strip noise (welcome letters, commission tables, schedules, dress code, motivational content) while keeping scripts, objections, value props, personas, frameworks, and process steps. Return ONLY the filtered text. Do not write any preamble, intro sentence, header, or explanation before or after the content.`,
    messages: [{ role: "user", content: text }],
  });
  return response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
}

async function understand(filteredText, brief) {
  const topicLine = brief.topics.length > 0
    ? `Priority topics: ${brief.topics.join(", ")}. Tag matching sections with higher granularity.`
    : "";
  const userContent = topicLine ? `${topicLine}\n\n---\n\n${filteredText}` : filteredText;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: `Analyze filtered sales training content. Break it into typed sections. Tags: "script" (with subtype "intro"|"close"|null), "objection-list", "tactical-advice", "value-prop", "process-steps", "persona", "industry-context", "video-reference". Return raw JSON array only — no markdown, no code fences. Schema: [{"tag":"...","subtype":null,"content":"...","sourceDocument":"","sourceSection":"short label"}]`,
    messages: [{ role: "user", content: userContent }],
  });

  const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  return JSON.parse(stripFences(raw));
}

async function planActivities(sections, brief) {
  const grouped = {};
  for (const s of sections) {
    if (!grouped[s.tag]) grouped[s.tag] = [];
    grouped[s.tag].push(s.sourceSection);
  }
  const sectionSummary = Object.entries(grouped).map(([tag, labels]) => `${tag}: ${labels.join(", ")}`).join("\n");
  const topicLine = brief.topics.length > 0 ? `Training brief topics: ${brief.topics.join(", ")}` : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: `You are a sales training architect. Create an ordered activity plan from tagged sections. Types: Lesson (for industry-context/value-prop/process-steps/persona), Memorization (for script), RolePlay (for script/tactical-advice), RapidFire (for objection-list, one-sentence responses only), Mirroring (ONLY if video-reference exists). Sequence: Lessons → Memorization → script RolePlays → RapidFire → full RolePlays. Return raw JSON array only — no markdown. Schema: [{"activityType":"...","sequencePosition":1,"title":"...","rationale":"...","sourceSection":"..."}]`,
    messages: [{ role: "user", content: `${topicLine}\n\nAvailable sections:\n${sectionSummary}` }],
  });

  const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  const activities = JSON.parse(stripFences(raw));
  return activities.map((a, i) => ({ ...a, sequencePosition: i + 1 }));
}

async function generateActivity(activity, allSections) {
  const tagMap = {
    Lesson: ["industry-context", "value-prop", "process-steps", "persona"],
    Memorization: ["script"],
    RolePlay: ["script", "tactical-advice", "objection-list", "persona"],
    RapidFire: ["objection-list"],
    Mirroring: ["video-reference"],
  };
  const tags = tagMap[activity.activityType] ?? [];
  const relevant = allSections.filter(s => tags.includes(s.tag));
  const sectionContent = relevant.map(s => `[${s.tag}${s.subtype ? `:${s.subtype}` : ""} — ${s.sourceSection}]\n${s.content}`).join("\n\n");

  const schemas = {
    Lesson: `{"topics":["string"],"keyTerms":[{"term":"string","definition":"string"}],"concepts":["string"]}`,
    Memorization: `{"segments":[{"label":"e.g. Part 1: The Opening","lines":[{"speaker":"rep","text":"exact line"}],"estimatedDurationMin":1.5}],"notes":""}`,
    RolePlay: `{"title":"string","instructions":"detailed AI persona instructions","objective":"what the rep is trying to achieve","passingScore":70,"conversationStarters":["opening line"],"language":"en","isBlind":false,"roleplayType":"Train","shouldActAsCustomer":true,"tags":[],"keyterms":[],"customerPersona":{"name":"string","role":"string","demeanor":"string","backstory":"string","commonObjections":[]},"sections":[{"title":"section title","criteria":[{"title":"criterion title","prompt":"evaluator question","description":"what this measures","criterionType":"YesNoQuestion"}]}],"variables":[{"name":"Personality Traits","variants":[{"name":"Easy","content":"Friendly, patient, open to conversation, cooperative"},{"name":"Medium","content":"Busy, skeptical, needs convincing, time-pressured"},{"name":"Hard","content":"Hostile, dismissive, hang-up prone, confrontational"}],"selectedVariantName":"Medium"}]}`,
    RapidFire: `{"objections":[{"trigger":"exact objection phrase","intent":"Respond","goodResponseIndicators":["string"],"responseOptions":["variant 1","variant 2"]}]}`,
    Mirroring: `{"videoReference":"","focusPoints":[]}`,
  };

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Generate a ${activity.activityType} training activity config for: "${activity.title}".

Source material:
${sectionContent}

Return ONLY a JSON object matching this schema — no markdown, no code fences:
${schemas[activity.activityType]}

Extract content directly from source material. For RapidFire include ALL objections with ALL response variants.`,
    }],
  });

  const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  const config = JSON.parse(stripFences(raw));

  return {
    activityType: activity.activityType,
    sequencePosition: activity.sequencePosition,
    title: activity.title,
    sourceDocument: FIXTURE,
    sourceSection: activity.sourceSection,
    approvalStatus: "draft",
    config,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n── Fixture: ${FIXTURE} ──\n`);
const buffer = readFileSync(FIXTURE);

const CHARS_PER_PAGE_THRESHOLD = 300;

console.log("Step 0: Extracting text...");
const textData = await extractText(buffer);
const density = textData.text.length / textData.numpages;
const needsVision = density < CHARS_PER_PAGE_THRESHOLD;

let canonical = textData.text;
if (needsVision) {
  const vision = await extractWithVision(buffer);
  canonical = [textData.text, ...vision.diagrams].join("\n\n");
  console.log(`  Text layer: ${textData.text.length} chars | Diagrams: ${vision.diagrams.length} (vision used — low density: ${Math.round(density)}/page)\n`);
} else {
  console.log(`  Text layer: ${textData.text.length} chars | Vision skipped (${Math.round(density)} chars/page — rich text layer)\n`);
}

console.log("Step 1: Denoising...");
const filtered = await denoise(canonical);
const noisePercent = Math.round(((canonical.length - filtered.length) / canonical.length) * 100);
console.log(`  ${noisePercent}% noise removed (${canonical.length} → ${filtered.length} chars)\n`);

console.log("Step 2: Understanding...");
const sections = await understand(filtered, TRAINING_BRIEF);
const tagCounts = {};
for (const s of sections) tagCounts[s.tag] = (tagCounts[s.tag] ?? 0) + 1;
console.log(`  ${sections.length} sections tagged:`);
for (const [tag, count] of Object.entries(tagCounts)) console.log(`    ${tag}: ${count}`);
console.log();

console.log("Step 3: Planning...");
const activities = await planActivities(sections, TRAINING_BRIEF);
console.log(`  ${activities.length} activities planned:`);
for (const a of activities) console.log(`    ${a.sequencePosition}. [${a.activityType}] ${a.title}`);
console.log();

console.log("Step 4: Generating configs (parallel)...");
const learningFlow = (
  await Promise.all(activities.map((activity) => generateActivity(activity, sections)))
).sort((a, b) => a.sequencePosition - b.sequencePosition);
console.log(`  Generated ${learningFlow.length} activities in parallel`);

const result = {
  metadata: {
    clientName: "Smoke Test",
    generatedAt: new Date().toISOString(),
    documentCount: 1,
    schemaVersion: "1.0",
    confidence: 0.9,
    trainingBrief: TRAINING_BRIEF,
  },
  persona: { name: "", role: "", tone: [], communicationStyle: "", industryContext: "" },
  learningFlow,
};

const outPath = "scripts/smoke-pipeline-output.json";
writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`\n── Complete ──`);
console.log(`  Activities: ${learningFlow.length}`);
console.log(`  Output written to: ${outPath}\n`);
