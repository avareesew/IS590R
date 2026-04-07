// ─── Training Brief ───────────────────────────────────────────────────────────

export type TrainingTopic =
  | "Objection Handling"
  | "Intro Scripts"
  | "Closing Scripts"
  | "Product Knowledge"
  | "Process Steps"
  | "Value Props";

export interface TrainingBrief {
  topics: TrainingTopic[];
  documentationNotes: string;
}

// ─── Intake Token ─────────────────────────────────────────────────────────────

export interface IntakeToken {
  token: string;
  clientName: string;
  status: "pending" | "submitted";
  createdAt: string;
}

// ─── Section Tags (Step 2 output) ────────────────────────────────────────────

export type SectionTag =
  | "script"
  | "objection-list"
  | "value-prop"
  | "process-steps"
  | "persona"
  | "industry-context"
  | "tactical-advice"
  | "video-reference";

export type ScriptSubtype = "intro" | "close" | null;

export interface TaggedSection {
  tag: SectionTag;
  subtype: ScriptSubtype; // only populated when tag === "script"
  content: string;
  sourceDocument: string;
  sourceSection: string;
}

// ─── Activity Plan (Step 3 output) ───────────────────────────────────────────

export type ActivityType =
  | "Lesson"
  | "Memorization"
  | "RolePlay"
  | "RapidFire"
  | "Mirroring";

export interface PlannedActivity {
  activityType: ActivityType;
  sequencePosition: number;
  title: string;
  rationale: string;
  sourceSection: string;
}

// ─── Activity Configs (Step 4 output) ────────────────────────────────────────

export interface LessonConfig {
  topics: string[];
  keyTerms: { term: string; definition: string }[];
  concepts: string[];
}

export interface MemorizationConfig {
  segments: {
    label: string;
    lines: { speaker: "rep" | "customer"; text: string }[];
    estimatedDurationMin: number;
  }[];
  notes: string;
}

export interface RolePlayCriterion {
  title: string;
  prompt: string;
  description: string;
  criterionType: "YesNoQuestion" | "RangeQuestion" | "OpenEndedQuestion";
}

export interface RolePlaySection {
  title: string;
  criteria: RolePlayCriterion[];
}

export interface RolePlayConfig {
  title: string;
  instructions: string;
  objective: string;
  passingScore: number;
  conversationStarters: string[];
  language: string;
  isBlind: boolean;
  roleplayType: "Train" | "Assess";
  shouldActAsCustomer: boolean;
  tags: string[];
  keyterms: string[];
  customerPersona: {
    name: string;
    role: string;
    demeanor: string;
    backstory: string;
    commonObjections: string[];
  };
  sections: RolePlaySection[];
  variables: {
    name: string;
    variants: { name: string; content: string }[];
    selectedVariantName: string;
  }[];
}

export interface RapidFireConfig {
  objections: {
    trigger: string;
    intent: "Agree" | "Respond" | "Redirect";
    goodResponseIndicators: string[];
    responseOptions: string[];
  }[];
}

export interface MirroringConfig {
  videoReference: string;
  focusPoints: string[];
}

export type ActivityConfig =
  | LessonConfig
  | MemorizationConfig
  | RolePlayConfig
  | RapidFireConfig
  | MirroringConfig;

// ─── Learning Flow Item ───────────────────────────────────────────────────────

export interface LearningFlowItem {
  activityType: ActivityType;
  sequencePosition: number;
  title: string;
  sourceDocument: string;
  sourceSection: string;
  approvalStatus: "draft" | "approved" | "flagged";
  config: ActivityConfig;
}

// ─── Parsed Training Config (export schema) ───────────────────────────────────

export interface ParsedTrainingConfig {
  metadata: {
    clientName: string;
    generatedAt: string;
    documentCount: number;
    schemaVersion: string;
    confidence: number;
    trainingBrief: TrainingBrief;
  };
  learningFlow: LearningFlowItem[];
}

// ─── Parse Job ────────────────────────────────────────────────────────────────

export type JobStatus =
  | "queued"
  | "denoising"
  | "understanding"
  | "planning"
  | "generating"
  | "review"
  | "approved"
  | "error";

export interface ParseJob {
  id: string;
  clientName: string;
  trainingBrief: TrainingBrief;
  blobUrls: string[]; // Vercel Blob URLs for uploaded PDFs
  status: JobStatus;
  progress: {
    step: string;
    percent: number;
  };
  result?: ParsedTrainingConfig;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Brief topic → pipeline mapping ──────────────────────────────────────────

export const TOPIC_TO_SECTION_TAGS: Record<TrainingTopic, SectionTag[]> = {
  "Objection Handling": ["objection-list", "tactical-advice"],
  "Intro Scripts": ["script"],
  "Closing Scripts": ["script"],
  "Product Knowledge": ["value-prop", "industry-context"],
  "Process Steps": ["process-steps"],
  "Value Props": ["value-prop"],
};

export const TOPIC_TO_SCRIPT_SUBTYPE: Partial<
  Record<TrainingTopic, ScriptSubtype>
> = {
  "Intro Scripts": "intro",
  "Closing Scripts": "close",
};

export const TOPIC_TO_ACTIVITY_TYPES: Record<TrainingTopic, ActivityType[]> = {
  "Objection Handling": ["RapidFire", "RolePlay"],
  "Intro Scripts": ["Memorization", "RolePlay"],
  "Closing Scripts": ["Memorization", "RolePlay"],
  "Product Knowledge": ["Lesson"],
  "Process Steps": ["Lesson"],
  "Value Props": ["Lesson", "RolePlay"],
};
