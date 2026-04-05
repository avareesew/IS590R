import Anthropic from "@anthropic-ai/sdk";
import { TaggedSection, TrainingBrief } from "@/types";

export type UnderstandResult = TaggedSection[];

const SYSTEM_PROMPT = `You are analyzing filtered sales training content. Your job is to break the document into typed sections so a training activity planner knows exactly what material is available.

Assign each distinct chunk of content one of these tags:
- "script" — word-for-word talk tracks the rep must say (intro scripts, close scripts, pitch questions)
- "objection-list" — a list or set of objections with response variants
- "tactical-advice" — guidance on HOW to handle conversations, frameworks, techniques (e.g. Funnel Concept, Question-Based Selling, AGREE/RESPOND/REDIRECT)
- "value-prop" — product or service differentiators the rep must be able to explain to customers
- "process-steps" — a sequential process walkthrough involving customer interaction
- "persona" — customer demographic descriptions, ideal prospect profiles
- "industry-context" — domain knowledge, terminology, background info the rep needs to understand
- "video-reference" — explicit references to training videos or recordings to watch/mirror

Rules:
- One section can appear multiple times with different tags if the content is distinct
- For "script" sections, also set "subtype" to "intro", "close", or null
- Keep the full original content in each section — do not truncate or summarize
- Set sourceSection to a short descriptive label (e.g. "Objection Rolodex", "Intro Scripts", "Overview")
- sourceDocument will be filled in by the caller — leave it as an empty string

Return a JSON array with no markdown formatting, no code fences, no explanation. Just the raw JSON array.

Schema:
[
  {
    "tag": "script" | "objection-list" | "tactical-advice" | "value-prop" | "process-steps" | "persona" | "industry-context" | "video-reference",
    "subtype": "intro" | "close" | null,
    "content": "full content here",
    "sourceDocument": "",
    "sourceSection": "short label"
  }
]`;

const CHUNK_SIZE = 10000;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function buildUserMessage(filteredText: string, brief: TrainingBrief): string {
  const topicLine =
    brief.topics.length > 0
      ? `Priority topics from training brief: ${brief.topics.join(", ")}. Tag sections matching these topics with higher granularity — e.g. split objection lists into individual entries rather than one block.`
      : "";

  const notesLine = brief.documentationNotes?.trim()
    ? `Additional context from client: ${brief.documentationNotes}`
    : "";

  const directive = [topicLine, notesLine].filter(Boolean).join("\n");

  return directive
    ? `${directive}\n\n---\n\n${filteredText}`
    : filteredText;
}

function parseJson(raw: string): TaggedSection[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function understandChunk(
  chunk: string,
  brief: TrainingBrief,
  client: Anthropic
): Promise<TaggedSection[]> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(chunk, brief) }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("")
    .trim();

  return parseJson(raw);
}

export async function understand(
  filteredText: string,
  brief: TrainingBrief,
  sourceDocument: string,
  client: Anthropic
): Promise<UnderstandResult> {
  const chunks = chunkText(filteredText);
  const chunkResults = await Promise.all(
    chunks.map((chunk) => understandChunk(chunk, brief, client))
  );

  const sections: TaggedSection[] = chunkResults.flat();

  // Stamp sourceDocument on every section
  return sections.map((s) => ({ ...s, sourceDocument }));
}
