import Anthropic from "@anthropic-ai/sdk";
import {
  PlannedActivity,
  TaggedSection,
  LearningFlowItem,
  ActivityConfig,
  LessonConfig,
  MemorizationConfig,
  RolePlayConfig,
  RapidFireConfig,
  MirroringConfig,
} from "@/types";

const CONFIG_SCHEMAS: Record<string, string> = {
  Lesson: `{
  "topics": ["string"],
  "keyTerms": [{ "term": "string", "definition": "string" }],
  "concepts": ["string"]
}`,
  Memorization: `{
  "segments": [
    {
      "label": "e.g. Part 1: The Opening",
      "lines": [{ "speaker": "rep" | "customer", "text": "exact line" }],
      "estimatedDurationMin": 1.5
    }
  ],
  "notes": "e.g. Split into 2 parts — each ~1.5 min"
}`,
  RolePlay: `{
  "title": "string",
  "instructions": "Detailed instructions for the AI persona — who they are, how they behave, what they want, how they resist",
  "objective": "What the rep is trying to achieve in this conversation",
  "passingScore": 70,
  "conversationStarters": ["opening line the AI might say to kick off the scenario"],
  "language": "en",
  "isBlind": false,
  "roleplayType": "Train",
  "shouldActAsCustomer": true,
  "tags": ["relevant", "topic", "tags"],
  "keyterms": ["key terms the rep should use"],
  "customerPersona": {
    "name": "string",
    "role": "string",
    "demeanor": "string",
    "backstory": "string",
    "commonObjections": ["objection 1", "objection 2"]
  },
  "sections": [
    {
      "title": "section title e.g. Opening & Rapport",
      "criteria": [
        {
          "title": "criterion title",
          "prompt": "Evaluator question about what the rep did",
          "description": "What this criterion is measuring",
          "criterionType": "YesNoQuestion" | "RangeQuestion" | "OpenEndedQuestion"
        }
      ]
    }
  ],
  "variables": [
    {
      "name": "Personality Traits",
      "variants": [
        { "name": "Easy", "content": "Friendly, patient, open to conversation, cooperative" },
        { "name": "Medium", "content": "Busy, skeptical, needs convincing, time-pressured" },
        { "name": "Hard", "content": "Hostile, dismissive, hang-up prone, confrontational" }
      ],
      "selectedVariantName": "Medium"
    }
  ]
}`,
  RapidFire: `{
  "objections": [
    {
      "trigger": "exact objection phrase from document",
      "intent": "Agree" | "Respond" | "Redirect",
      "goodResponseIndicators": ["string"],
      "responseOptions": ["response variant 1", "response variant 2"]
    }
  ]
}`,
  Mirroring: `{
  "videoReference": "description or title of the video to watch",
  "focusPoints": ["what to observe and mirror"]
}`,
};

function getRelevantSections(
  activity: PlannedActivity,
  allSections: TaggedSection[]
): TaggedSection[] {
  const relevantTags: Record<string, string[]> = {
    Lesson: ["industry-context", "value-prop", "process-steps", "persona"],
    Memorization: ["script"],
    RolePlay: ["script", "tactical-advice", "objection-list", "persona"],
    RapidFire: ["objection-list"],
    Mirroring: ["video-reference"],
  };

  const tags = relevantTags[activity.activityType] ?? [];
  const relevant = allSections.filter((s) => tags.includes(s.tag));

  // If sourceSection is specified, prefer matching sections first
  const preferred = relevant.filter((s) =>
    activity.sourceSection.toLowerCase().includes(s.sourceSection.toLowerCase())
  );

  return preferred.length > 0 ? preferred : relevant;
}

function buildPrompt(
  activity: PlannedActivity,
  sections: TaggedSection[]
): string {
  const schema = CONFIG_SCHEMAS[activity.activityType];
  const sectionContent = sections
    .map((s) => `[${s.tag}${s.subtype ? `:${s.subtype}` : ""} — ${s.sourceSection}]\n${s.content}`)
    .join("\n\n");

  return `Generate a ${activity.activityType} training activity config.

Activity: ${activity.title}
Rationale: ${activity.rationale}
Source: ${activity.sourceSection}

Source material:
${sectionContent}

Return ONLY a JSON object matching this schema exactly — no markdown, no code fences, no explanation:
${schema}

Rules:
- Extract content directly from the source material — do not invent scripts, objections, or personas
- For Memorization: use the exact wording from scripts in the source material
- For RapidFire: include ALL objections found in the source material (5–10 max), with ALL response variants. Only quick snap-back objections — if an objection requires probing or multi-step handling it belongs in a RolePlay not RapidFire
- For RolePlay: use criterionType "YesNoQuestion" for binary checks, "RangeQuestion" for scored 1–10 quality assessments, "OpenEndedQuestion" for holistic qualitative evaluation. Sections should map to phases of the conversation (e.g. Opening, Discovery, Close). The variables array should always include the Easy/Medium/Hard personality variants exactly as shown in the schema.
- For Lesson: keyTerms should come from industry-context and value-prop sections. Remember a Lesson is text, images, and video only — no interactive elements`;
}

function parseJson(raw: string): ActivityConfig {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function generateActivity(
  activity: PlannedActivity,
  allSections: TaggedSection[],
  client: Anthropic
): Promise<LearningFlowItem> {
  const relevantSections = getRelevantSections(activity, allSections);
  const prompt = buildPrompt(activity, relevantSections);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("")
    .trim();

  const config = parseJson(raw) as ActivityConfig;

  return {
    activityType: activity.activityType,
    sequencePosition: activity.sequencePosition,
    title: activity.title,
    sourceDocument: relevantSections[0]?.sourceDocument ?? "",
    sourceSection: activity.sourceSection,
    approvalStatus: "draft",
    config,
  };
}

export async function generateAll(
  activities: PlannedActivity[],
  sections: TaggedSection[],
  client: Anthropic
): Promise<LearningFlowItem[]> {
  const results = await Promise.all(
    activities.map((activity) => generateActivity(activity, sections, client))
  );
  // Re-sort by sequencePosition since parallel calls may resolve out of order
  return results.sort((a, b) => a.sequencePosition - b.sequencePosition);
}
