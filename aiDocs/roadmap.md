# Replay AI Parser Agent — Project Roadmap

> **Core goal:** Reduce onboarding cycle from 5 hours → ~1.5 hours, and technical build time from 30 min → 30 seconds. Client fills out their own intake form and uploads their own PDFs via a link — no first interview needed.

**Test PDFs:** Drop real training documents under `fixtures/training-docs/<company-slug>/` (see [fixtures/training-docs/README.md](../fixtures/training-docs/README.md)).

---

## Architecture Summary

The parser is a **4-step unified pipeline** that both plans the training activity sequence AND generates the content configs in one automated pass. This replaces a two-step manual workflow (human reads docs → human decides what to build → human builds it).

```
Founder creates client → unique intake link → sent to client
                                                    ↓
                              Client fills brief (topics, doc notes)
                              + uploads PDFs → Vercel Blob
                                                    ↓
Training Brief + PDFs → [1] Signal Denoising → [2] Document Understanding
                      → [3] Activity Planning → [4] Content Generation → learningFlow[]
                               ↑ brief used as directive in Steps 2 & 3 ↑
                                                                              ↓
                                                                    HITL Review Dashboard (founder)
                                                                              ↓
                                                                    Approved Export (JSON)
```

**Output schema:** `ParsedTrainingConfig`

```json
{
  "metadata": { "clientName", "generatedAt", "documentCount", "confidence" },
  "persona": { "name", "role", "tone[]", "communicationStyle", "industryContext" },
  "learningFlow": [
    {
      "activityType": "Lesson | Memorization | RolePlay | RapidFire | Mirroring",
      "sequencePosition": 1,
      "title": "string",
      "sourceDocument": "string",
      "sourceSection": "string",
      "config": { /* typed per activityType — see Phase 1, content generation */ }
    }
  ]
}
```

---

## Phase 0 — Setup & scaffold

**Prerequisites:** None.
**Goal:** Working Vercel-deployed app with verified PDF parsing, Postgres, Blob storage, and client intake link.

### Milestones

**Batch A — Project scaffold & infra** ✅ COMPLETE

- Initialize Next.js 14 app with App Router, TypeScript, Tailwind CSS
- Install core dependencies: `pdf-parse`, `@anthropic-ai/sdk`, `@vercel/blob`, Postgres client (e.g. `@neondatabase/serverless` or `postgres`)
- Create `.env.local` with `ANTHROPIC_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`
- Provision **Neon Postgres** (free tier) and **Vercel Blob** storage; confirm connections locally
- Establish file structure:
  ```
  src/
  ├── types/index.ts          ← ParsedTrainingConfig, ParseJob, TrainingBrief, IntakeToken, activity config types
  ├── lib/
  │   ├── db.ts               ← Postgres client + schema (jobs, intake_tokens, training_briefs)
  │   ├── blob.ts             ← Vercel Blob upload/download helpers
  │   ├── parser/pipeline.ts  ← pipeline orchestrator (stub)
  │   └── utils/pdf.ts        ← PDF extraction utility
  └── app/
      ├── intake/[token]/page.tsx  ← client-facing intake form (brief + PDF upload)
      ├── dashboard/
      │   ├── page.tsx             ← founder job list + "New Client" button
      │   └── [id]/page.tsx        ← HITL review
      └── api/
          ├── clients/route.ts     ← POST: create client + generate intake token
          ├── intake/[token]/route.ts ← POST: submit brief + PDFs, create job
          ├── parse/route.ts       ← internal: trigger pipeline for a job
          └── jobs/[id]/route.ts   ← GET/PATCH: job status, edits, approval
  ```

**Batch A2 — Client intake link & form** ✅ COMPLETE

- `POST /api/clients` — creates client + unique token in Postgres; returns intake URL
- `POST /api/intake/[token]` — validates token, uploads PDFs to Vercel Blob, creates job in Postgres, marks token `submitted`, fires pipeline (fire-and-forget)
- `GET /api/jobs/[id]` — returns job status + result
- `PATCH /api/jobs/[id]` — persists result or status updates
- `POST /api/parse` — loads job from Postgres, calls `runPipeline()` async
- `lib/parser/pipeline.ts` — stub orchestrator: updates job status through all 4 steps; step logic stubbed for Phase 1
- `app/intake/[token]/page.tsx` + `IntakeForm.tsx` — public intake page; shows "already submitted" or "invalid link" states; client fills brief + uploads PDFs
- `app/dashboard/page.tsx` — founder job list with status badges; links to job detail (detail page not yet built)
- **Not yet built:** `GET /api/jobs` (list route), `app/dashboard/[id]/page.tsx` (HITL review) — these are Phase 2 items

**Batch B — PDF smoke test (text layer)** ✅ COMPLETE

- Implemented `lib/utils/pdf.ts`: `extractText(buffer, filename)` returns `ExtractedDocument` with text, pageCount, charCount
- Downgraded `pdf-parse` from v2 → v1.1.1 (v2 broke Node.js compatibility — requires browser APIs like `DOMMatrix`)
- Tested on all fixtures; all three PDFs extracted cleanly
- Verified: raw text includes sales scripts and objection sections with good text layer density

**Batch C — Multimodal capture (MVP, PRD FR-02b–02d)** ✅ COMPLETE

- **Approach change from roadmap:** skipped manual rasterization (requires system binaries incompatible with Vercel). Used **Claude's native PDF document block API** instead — Claude handles page-to-image conversion internally
- `extractWithVision(buffer, filename, client)` — sends PDF as base64 document block; prompt extracts transcribed text + diagram descriptions in structured XML tags
- `mergeExtractions(textLayer, vision)` — merges with provenance:
  - `text_layer` always included as primary
  - `vision` appended when text density < 300 chars/page
  - `vision:diagram=N` appended per diagram found
- Smoke tested against 4 fixtures including a diagram-heavy doc (Alta Start Script):
  - 16 diagrams detected and described (flowcharts, objection handling trees)
  - Canonical text grew from 2,663 → 4,693 chars (76% more content recovered)
- `scripts/smoke-pdf.mjs` and `scripts/smoke-vision.mjs` added for local testing

**Definition of Done:** ✅ Merged canonical text (text + vision) produced without error on a multi-page, diagram-heavy document (Alta Start Script — 16 visual aids recovered)

---

## Phase 1 — Prototype: unified pipeline

**Prerequisites:** Phase 0 complete.  
**Goal:** End-to-end pipeline producing a `learningFlow[]` from raw PDFs in < 30 seconds.  
**Primary validation input:** At least one fixture PDF under `fixtures/training-docs/` (e.g. UHP / Eco Auto Body if available).

---

### Step 1 — Signal Denoising ✅ COMPLETE

**File:** `lib/parser/steps/denoise.ts`

**What it does:** Strips non-conversational content so the AI only reasons over relevant training signal.

**Remove:**

- Welcome letters, table of contents, "In Closing" motivational wrap-ups
- Daily/weekly schedules and time-blocked calendars
- Commission and income tables
- Dress code and personal grooming advice
- Mindset/motivational content ("Stay positive!", "You WILL BE SUCCESSFUL!")
- Glossary sections (extracted separately in Step 2)
- References to images / visual examples ("see photos above")
- DRP financial mechanics (internal rep detail, not conversation content)

**Keep:**

- Sales scripts (intro variants, pitch questions, close lines)
- Objection handling entries (trigger + response variants)
- Value proposition explanations (PDR, deductible reduction, free rental)
- Conversation frameworks (Funnel Concept, Question-Based Selling)
- Industry terminology in context (PDR, DRP, R&I, Supplement, Comprehensive Coverage)
- Customer personas and demographic descriptions
- Process steps that involve customer interaction

**Output:** Filtered plain text per document, passed to Step 2

**Validation checkpoint:** ✅ Smoke tested against all 4 fixtures:
- exampleone (29 pages): 30% noise removed — commission tables, dress code, welcome letter stripped; scripts and objections preserved
- Alta Start Script: 6% removed — doc was already mostly conversation content
- Sales.pdf + notes: 7–11% removed
- No preamble/commentary in output after prompt fix

---

### Step 2 — Document Understanding ✅ COMPLETE

**File:** `lib/parser/steps/understand.ts`

**What it does:** Categorizes filtered content into typed section tags so the Activity Planner knows what material is available. The **training brief** is passed as context so the model prioritizes tagging sections that match the stated topics (e.g. if brief says "Objection Handling", objection sections are tagged with higher fidelity).

**Section tags:**

- `script` — word-for-word talk tracks (intro scripts, close scripts)
- `tactical-advice` — guidance on how to handle conversations, frameworks, techniques
- `objection-list` — enumerated objections with response variants
- `value-prop` — product/service differentiators the rep must be able to explain
- `process-steps` — sequential process walkthrough (Close → Insurance → Repair → Delivery)
- `persona` — customer demographic description, ideal prospect profile
- `industry-context` — domain knowledge (hail damage types, insurance terms)
- `video-reference` — references to training recordings (triggers Mirroring activity)

**Output:** Tagged section map `{ tag: string, content: string, sourceDocument: string, sourceSection: string }[]`

**Validation checkpoint:** ✅ Smoke tested on Alta 2-page doc: 11 sections tagged across `script` (2), `value-prop` (5), `process-steps` (4). Training brief topics passed as prioritization directive.

---

### Step 3 — Activity Planning ✅ COMPLETE

**File:** `lib/parser/steps/plan.ts`

**What it does:** Decides which activity types to build and in what sequence, using the tagged section map as input. The **training brief** is passed as a directive — topics the CEO specified (e.g. "Objection Handling") are prioritized in the plan; activity types not relevant to the brief may be deprioritized or omitted. This step replaces the founder's manual Training Orchestration workflow.

**Activity types and when to recommend them:**


| Type           | Trigger condition                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Lesson`       | `industry-context`, `value-prop`, `process-steps`, or `persona` sections exist → foundational knowledge goes first |
| `Memorization` | `script` sections exist → rep must internalize word-for-word talk tracks                                           |
| `RolePlay`     | `tactical-advice` or `script` sections exist → free-form practice of a conversation phase                          |
| `RapidFire`    | `objection-list` exists → quick snap-back objections only (multi-step objections → RolePlay instead)               |
| `Mirroring`    | `video-reference` exists → skip if absent, document why                                                            |


**Sequencing rules (enforced in output):**

1. Lessons first — foundational knowledge
2. Memorization scripts second — internalize the talk track
3. Script-derived RolePlays third — same conversation, now with unscripted AI customer
4. RapidFire drills fourth — build snap-back muscle memory
5. Situation and full-conversation RolePlays last

**Important distinction (RapidFire vs. RolePlay for objections):**

- One-sentence response → `RapidFire` (e.g., "I'm not interested" at the door)
- Multi-step handling required → `RolePlay` (e.g., "It's already taken care of" — requires probing)

**Output:** Ordered activity plan `{ activityType, sequencePosition, title, rationale, sourceSection }[]`

**Validation checkpoint:** ✅ Smoke tested on Alta 2-page doc: 10 activities planned including companion Memorization+RolePlay pairs and RapidFire. Consolidation rules (target 4–8) and one-sentence RapidFire test applied.

---

### Step 4 — Content Generation ✅ COMPLETE

**File:** `lib/parser/steps/generate.ts`

**What it does:** For each planned activity, generates the fully-typed config object. This is the most token-intensive step.

**Per-type config schemas:**

**Lesson config:**

```typescript
{
  topics: string[]
  keyTerms: { term: string; definition: string }[]
  concepts: string[]
}
```

**Memorization config:**

```typescript
{
  segments: {
    label: string          // e.g., "Part 1: The Opening"
    lines: { speaker: "rep" | "customer"; text: string }[]
    estimatedDurationMin: number
  }[]
  notes: string            // e.g., "Split into 2 parts — each ~1.5 min"
}
```

**RolePlay config:**

```typescript
{
  title: string
  instructions: string          // AI persona: who they are, how they behave, what they want
  objective: string             // what the rep is trying to achieve
  passingScore: number          // 0–100
  conversationStarters: string[]
  language: string              // "en"
  isBlind: boolean
  roleplayType: "Train" | "Assess"
  shouldActAsCustomer: boolean
  tags: string[]
  keyterms: string[]
  customerPersona: {
    name: string; role: string; demeanor: string
    backstory: string; commonObjections: string[]
  }
  sections: {
    title: string               // e.g. "Opening & Rapport", "Close"
    criteria: {
      title: string
      prompt: string            // evaluator question
      description: string
      criterionType: "YesNoQuestion" | "RangeQuestion" | "OpenEndedQuestion"
    }[]
  }[]
  variables: {
    name: string                // e.g. "Personality Traits"
    variants: { name: string; content: string }[]  // Easy / Medium / Hard
    selectedVariantName: string
  }[]
}
```

**RapidFire config:**

```typescript
{
  objections: {
    trigger: string
    intent: "Agree" | "Respond" | "Redirect"
    goodResponseIndicators: string[]
    responseOptions: string[]   // multiple response variants from source doc
  }[]
}
```

**Note:** `responseOptions: string[]` (not `responseTemplate: string`) — the real training documents contain 2–4 response variants per objection. The HITL dashboard will display all variants and let the CEO choose or edit.

**Pipeline orchestrator:** `lib/parser/pipeline.ts` chains Steps 1–4, tracks progress per step, writes to the job store.

**Validation checkpoint:** ✅ Smoke tested on Alta 2-page doc: 10 activity configs generated in parallel via `Promise.all`. RolePlay configs match real Replay API format (criterionType, sections, variables with Easy/Medium/Hard variants). Output written to `scripts/smoke-pipeline-output.json`.

---

### Job store, API routes, upload form (close out Phase 1)

**Files:** `lib/store.ts`, `app/api/parse/route.ts`, `app/api/jobs/route.ts`, `app/api/jobs/[id]/route.ts`, `app/upload/page.tsx`

**Tasks:**

- Implement in-memory job store: `{ id, status, createdAt, progress: { step, percent }, result? }`
- `POST /api/parse` — accept multi-file upload, start async pipeline, return `jobId`
- `GET /api/jobs` — list all jobs with status
- `GET /api/jobs/[id]` — return job status + result when complete
- `PATCH /api/jobs/[id]` — accept draft edits or approval status
- Upload form: multi-file drag-and-drop (accept `.pdf`), shows job status after submission

**Phase 1 exit:** Upload a fixture PDF → pipeline completes in < 30 seconds → `learningFlow[]` is returned via `GET /api/jobs/[id]`

---

## Phase 2 — HITL review dashboard & export

**Prerequisites:** Phase 1 exit met.  
**Goal:** Founder can review, edit, and approve a full learning plan quickly, then export JSON.

---

### Job list dashboard

**File:** `app/dashboard/page.tsx`

- List all parse jobs with: client name, document count, status badge, timestamp
- Poll `GET /api/jobs` every 2 seconds while any job is `processing`
- Status states: `queued`, `denoising`, `understanding`, `planning`, `generating`, `review`, `approved`
- Click row → navigate to job detail view

---

### Activity review dashboard

**File:** `app/dashboard/[id]/page.tsx`

**Layout:** Two-panel view

- **Left panel:** Learning flow overview (ordered activity cards with type badge, title, status)
- **Right panel:** Selected activity detail + inline editing

**Per-activity detail view (varies by type):**

- **Lesson:** Editable topic list, key terms table
- **Memorization:** Script segments with speaker labels, estimated duration, split notes
- **RolePlay:** Persona card, scenario text, scorecard table with editable criteria and point values
- **RapidFire:** Objection list with trigger, intent badge, all response options displayed, editable
- All types: source section citation, confidence indicator, free-form notes field

**Actions per activity:**

- `Approve` — marks activity as approved, moves to next
- `Flag for revision` — marks as needs-work, keeps in flow
- `Regenerate` — re-runs Step 4 for this activity only (calls `PATCH /api/jobs/[id]` with `{ action: "regenerate", activityIndex: N }`)
- `Delete` — removes activity from the flow

---

### Export & approval flow

- `Approve All` button — marks all unflagged activities as approved
- `Export JSON` — downloads the full `ParsedTrainingConfig` with only approved activities
- Export includes metadata, persona, and filtered `learningFlow[]` (approved only)
- Optionally: export individual activity configs as separate JSON files

---

### Progress indicators + persistent storage

- Pipeline step progress bar during processing (Denoising → Understanding → Planning → Generating)
- Swap in-memory store for SQLite via `better-sqlite3` (or file-based JSON store)
- Jobs survive server restart
- Basic error recovery: if one step fails, job status shows which step failed

---

### Polish + multi-document support

- Multi-document upload: display source document attribution per activity in dashboard
- Combined learning flow correctly merges and sequences activities across documents
- Error states: unsupported file type, empty PDF, API timeout
- Loading skeletons on dashboard while job is processing

**Phase 2 exit:** Upload fixture PDF → review dashboard → approve all activities → export JSON — interaction time minimal vs. manual process.

---

## After Phase 2 — Validation & demo prep

**Prerequisites:** Phase 2 exit met.  
**Goal:** Confirmed accuracy + demo-ready presentation

### Validation Runs

**Run 1 — UHP Training PDF (primary)**

- Upload the 29-page UHP/Eco Auto Body PDF
- Confirm pipeline completes in < 30 sec
- Compare output `learningFlow[]` against manually-expected activities
- Document accuracy per activity type (script coverage, objection count, scorecard completeness)
- Record `metadata.confidence` score

**Run 2 — Second client document (TBD)**

- Upload a second, structurally different training document
- Confirm pipeline handles document variation without prompt changes
- Note any activity types that are missed or miscategorized

**Accuracy Target:** > 90% of conversational content correctly mapped to activity configs before HITL review

### Demo Script

1. CEO uploads 1 training PDF via the upload form
2. Pipeline progress bar advances through 4 steps (visible in dashboard)
3. Dashboard shows completed learning flow with typed activities
4. CEO opens one RolePlay, edits a scorecard criterion, clicks Approve
5. CEO clicks Approve All on remaining activities
6. CEO exports JSON — done in < 30 seconds of active interaction

### Known Risks


| Risk                                                         | Mitigation                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| LLM hallucinates objection responses                         | HITL is mandatory — all configs require CEO review before export                                         |
| Multi-doc conflicts (overlapping content)                    | Step 3 deduplication logic; source attribution per activity                                              |
| PDF text extraction quality (images, columns, mixed layouts) | `pdf-parse` handles text layers only; image content is skipped (acceptable for text-heavy training docs) |
| Objection misclassification (RapidFire vs. RolePlay)         | Explicit rule in Step 3 prompt: "Can this be handled in one sentence?" — if no → RolePlay                |
| Token limits on large multi-doc uploads                      | Steps 1–3 run per-document; Step 4 generates activity-by-activity with separate API calls                |
| Vercel serverless timeout (60s hobby / 5min pro)             | Benchmark pipeline on real fixture PDF; upgrade to Pro or offload to background worker if needed          |
| Client uploads bad/corrupt PDF                               | Validate file type and extractable text on upload; surface error on intake confirmation page              |


---

## Success Metrics


| Metric                     | Current State      | Target                              |
| -------------------------- | ------------------ | ----------------------------------- |
| Technical build time       | 20–30 min (manual) | < 30 seconds (automated)            |
| Total onboarding cycle     | 5 hours            | ~1.5 hours (meetings + HITL review) |
| Cost per onboarding        | $500               | ~$150                               |
| Annual capacity            | ~60 deals          | 250+ deals                          |
| Draft accuracy before HITL | N/A                | > 90%                               |


