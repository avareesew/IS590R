import Anthropic from "@anthropic-ai/sdk";
import { TaggedSection, PlannedActivity, TrainingBrief } from "@/types";

export type PlanResult = PlannedActivity[];

const SYSTEM_PROMPT = `You are a sales training architect. Given a set of tagged training sections and a training brief, produce an ordered activity plan.

Activity types and when to use them:

- "Lesson" — foundational knowledge only (frameworks, mindset, process overviews, terminology). Content is text, images, and video — no interactive elements. Use when reps need to absorb knowledge before practicing.
- "Memorization" — when the training contains a specific word-for-word script reps must internalize. Each segment should take ~1–1.5 min to recite. If the full script is longer, split into logical parts (e.g. "Part 1: The Opening", "Part 2: The Close").
- "RolePlay" — for tactical conversational skills. Three sub-types: (1) skill-specific (one skill like objection handling), (2) situation-specific (one step of a process), (3) full-conversation (entire interaction end-to-end). When a Memorization script exists, always recommend a companion script-derived RolePlay where the rep practices the same conversation but the AI customer is now unscripted and dynamic.
- "RapidFire" — ONLY for quick snap-back objections where the response is one sentence. If an objection requires probing, follow-up questions, or multi-step handling → RolePlay instead. 5–10 objections is the sweet spot.
- "Mirroring" — ONLY when video-reference sections exist. If absent, skip entirely.

Consolidation rules (critical — keep the plan tight):
- Combine ALL foundational sections (industry-context, value-prop, process-steps, persona) into ONE Lesson unless topics are genuinely unrelated
- Combine ALL intro script variants into ONE Memorization activity
- Combine ALL close script variants into ONE Memorization activity
- Combine ALL quick objections into ONE RapidFire activity
- Only create multiple activities of the same type when the content serves clearly distinct training goals
- Target 4–8 total activities for a typical single document

Sequencing rules (enforce strictly):
1. Lessons first — foundational knowledge before anything else
2. Memorization second — internalize the script
3. Script-derived RolePlays third — same conversation, now with unscripted AI customer (note the pairing explicitly)
4. RapidFire drills fourth — build snap-back muscle memory
5. Situation-specific and full-conversation RolePlays last

RapidFire vs RolePlay test: "Can this be handled in one sentence?" If yes → RapidFire. If no → RolePlay.

Training brief directive: prioritize activities that match the stated topics. Never omit a type that has strong source material even if not in the brief.

Return a JSON array with no markdown formatting, no code fences, no explanation. Just the raw JSON array.

Schema:
[
  {
    "activityType": "Lesson" | "Memorization" | "RolePlay" | "RapidFire" | "Mirroring",
    "sequencePosition": 1,
    "title": "short descriptive title",
    "rationale": "1–2 sentence explanation of why this activity and why this position",
    "sourceSection": "which tagged section(s) this draws from"
  }
]`;

function summarizeSections(sections: TaggedSection[]): string {
  const grouped: Record<string, string[]> = {};
  for (const s of sections) {
    if (!grouped[s.tag]) grouped[s.tag] = [];
    grouped[s.tag].push(s.sourceSection);
  }
  return Object.entries(grouped)
    .map(([tag, labels]) => `${tag}: ${labels.join(", ")}`)
    .join("\n");
}

function buildUserMessage(
  sections: TaggedSection[],
  brief: TrainingBrief
): string {
  const topicLine =
    brief.topics.length > 0
      ? `Training brief topics (prioritize these): ${brief.topics.join(", ")}`
      : "No specific topics specified — cover all available material.";

  const notesLine = brief.documentationNotes?.trim()
    ? `Client notes: ${brief.documentationNotes}`
    : "";

  const sectionSummary = summarizeSections(sections);

  return [topicLine, notesLine, `\nAvailable sections:\n${sectionSummary}`]
    .filter(Boolean)
    .join("\n");
}

function parseJson(raw: string): PlannedActivity[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function plan(
  sections: TaggedSection[],
  brief: TrainingBrief,
  client: Anthropic
): Promise<PlanResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserMessage(sections, brief),
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("")
    .trim();

  const activities = parseJson(raw);

  // Enforce sequencePosition is 1-based and ordered
  return activities.map((a, i) => ({ ...a, sequencePosition: i + 1 }));
}
