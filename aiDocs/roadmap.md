# Replay AI Parser Agent — Project Roadmap

> **Core goal:** Reduce onboarding cycle from 5 hours → ~1.5 hours, and technical build time from 30 min → 30 seconds.

**Phases, not sprints:** Work is grouped into **Phase 0 → 1 → 2** with exit criteria. Subheadings like “Days 3–4” are **suggested batching order**, not fixed calendar — adjust to your bandwidth.

**Test PDFs:** Drop real training documents under `fixtures/training-docs/<company-slug>/` (see [fixtures/training-docs/README.md](../fixtures/training-docs/README.md)).

---

## Architecture Summary

The parser is a **4-step unified pipeline** that both plans the training activity sequence AND generates the content configs in one automated pass. This replaces a two-step manual workflow (human reads docs → human decides what to build → human builds it).

```
Client PDFs → [1] Signal Denoising → [2] Document Understanding
           → [3] Activity Planning → [4] Content Generation → learningFlow[]
                                                                     ↓
                                                           HITL Review Dashboard
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
**Goal:** Working local dev environment with verified PDF parsing.

### Milestones

**Batch A — Project scaffold**
- [ ] Initialize Next.js 14 app with App Router, TypeScript, Tailwind CSS
- [ ] Install core dependencies: `pdf-parse`, `@anthropic-ai/sdk`
- [ ] Create `.env.local` with `ANTHROPIC_API_KEY`
- [ ] Establish file structure per `SPEC.md`:
  ```
  src/
  ├── types/index.ts       ← define ParsedTrainingConfig, ParseJob, activity config types
  ├── lib/
  │   ├── store.ts         ← in-memory job store (stub)
  │   ├── parser/pipeline.ts  ← pipeline orchestrator (stub)
  │   └── utils/pdf.ts     ← PDF extraction utility
  └── app/
      ├── upload/page.tsx
      ├── dashboard/
      │   ├── page.tsx
      │   └── [id]/page.tsx
      └── api/
          ├── parse/route.ts
          └── jobs/[id]/route.ts
  ```

**Batch B — PDF smoke test (text layer)**
- [ ] Implement `src/lib/utils/pdf.ts`: accepts one or more PDF file buffers, returns raw extracted text per document
- [ ] Test on a fixture under `fixtures/training-docs/`
- [ ] Verify: raw text includes sales scripts and objection sections where a text layer exists
- [ ] Verify: table of contents, commission tables, and image captions are present when embedded as text (to be filtered in Step 1)
- [ ] Log character count and rough section detection

**Batch C — Multimodal capture (MVP, PRD FR-02b–02d)**
- [ ] Rasterize each PDF page to an image (e.g. `pdfjs-dist` or Poppler); enforce max width/height for API limits
- [ ] Call **Claude vision** per page (or implement **P1** selective pass: low text-density pages only — see PRD Q7)
- [ ] Prompt: transcribe visible text + describe diagrams (flows, labels); output plain text blocks
- [ ] Merge with text-layer output with **provenance** (`text_layer` vs `vision:page=N`); prefer text layer for duplicate copy
- [ ] Fixture check: a PDF where **critical training content lives only in diagrams** still produces usable merged text for Step 1

**Definition of Done:** `npm run dev` starts successfully; **merged** canonical text (text + vision) is produced without error on a multi-page, diagram-heavy document

---

## Phase 1 — Prototype: unified pipeline

**Prerequisites:** Phase 0 complete.  
**Goal:** End-to-end pipeline producing a `learningFlow[]` from raw PDFs in < 30 seconds.  
**Primary validation input:** At least one fixture PDF under `fixtures/training-docs/` (e.g. UHP / Eco Auto Body if available).

---

### Step 1 — Signal Denoising (early Phase 1)

**File:** `src/lib/parser/steps/denoise.ts`

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

**Validation checkpoint:** Run UHP PDF through Step 1. Target: < 10% noise content remaining. Manually scan output and confirm Objection Rolodex, sales pitch scripts, and value props are fully intact.

---

### Step 2 — Document Understanding (mid Phase 1)

**File:** `src/lib/parser/steps/understand.ts`

**What it does:** Categorizes filtered content into typed section tags so the Activity Planner knows what material is available.

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

**Validation checkpoint:** UHP PDF should produce sections tagged: `script` (4 intro variants, 7 close variants), `objection-list` (17 entries with 1–4 response variants each), `tactical-advice` (Funnel Concept, Question-Based Selling, Follow Up), `value-prop` (PDR, DRP, Rental, Quality), `process-steps` (4-step deal process), `persona` (demographics section), `industry-context` (Overview section + Glossary).

---

### Step 3 — Activity Planning (paired with Step 2)

**File:** `src/lib/parser/steps/plan.ts`

**What it does:** Decides which activity types to build and in what sequence, using the tagged section map as input. This step replaces the founder's manual Training Orchestration workflow.

**Activity types and when to recommend them:**

| Type | Trigger condition |
|---|---|
| `Lesson` | `industry-context`, `value-prop`, `process-steps`, or `persona` sections exist → foundational knowledge goes first |
| `Memorization` | `script` sections exist → rep must internalize word-for-word talk tracks |
| `RolePlay` | `tactical-advice` or `script` sections exist → free-form practice of a conversation phase |
| `RapidFire` | `objection-list` exists → quick snap-back objections only (multi-step objections → RolePlay instead) |
| `Mirroring` | `video-reference` exists → skip if absent, document why |

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

**Validation checkpoint:** UHP PDF should produce a plan of at least: 1 Lesson (industry overview + value props), 2 Memorization (intro scripts, close scripts), 2 RolePlays (door knock pitch practice, full-conversation), 1 RapidFire (quick smoke-screen objections), 0 Mirroring (no video references in document). No Mirroring should be recommended — verify this is explicitly noted in output.

---

### Step 4 — Content Generation (late Phase 1)

**File:** `src/lib/parser/steps/generate.ts`

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
  persona: {
    name: string; role: string; demeanor: string
    backstory: string; commonObjections: string[]
  }
  scenario: string
  difficulty: "beginner" | "intermediate" | "advanced"
  passingScore: number     // 0–100
  scorecard: {
    section: string
    criteria: string
    maxPoints: number
    evaluationMethod: "keyword_match" | "sentiment" | "manual"
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

**Pipeline orchestrator:** `src/lib/parser/pipeline.ts` chains Steps 1–4, tracks progress per step, writes to the job store.

**Validation checkpoint:** Generate full `learningFlow[]` from UHP PDF. Manually verify:
- All 17 objections are in RapidFire or RolePlay (not lost)
- At least 4 intro script lines appear in a Memorization segment
- Scorecard sections reference the AGREE/RESPOND/REDIRECT framework
- `metadata.confidence` reflects completeness (should be high for UHP PDF — dense source material)

---

### Job store, API routes, upload form (close out Phase 1)

**Files:** `src/lib/store.ts`, `src/app/api/parse/route.ts`, `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/route.ts`, `src/app/upload/page.tsx`

**Tasks:**
- [ ] Implement in-memory job store: `{ id, status, createdAt, progress: { step, percent }, result? }`
- [ ] `POST /api/parse` — accept multi-file upload, start async pipeline, return `jobId`
- [ ] `GET /api/jobs` — list all jobs with status
- [ ] `GET /api/jobs/[id]` — return job status + result when complete
- [ ] `PATCH /api/jobs/[id]` — accept draft edits or approval status
- [ ] Upload form: multi-file drag-and-drop (accept `.pdf`), shows job status after submission

**Phase 1 exit:** Upload a fixture PDF → pipeline completes in < 30 seconds → `learningFlow[]` is returned via `GET /api/jobs/[id]`

---

## Phase 2 — HITL review dashboard & export

**Prerequisites:** Phase 1 exit met.  
**Goal:** Founder can review, edit, and approve a full learning plan quickly, then export JSON.

---

### Job list dashboard

**File:** `src/app/dashboard/page.tsx`

- [ ] List all parse jobs with: client name, document count, status badge, timestamp
- [ ] Poll `GET /api/jobs` every 2 seconds while any job is `processing`
- [ ] Status states: `queued`, `denoising`, `understanding`, `planning`, `generating`, `review`, `approved`
- [ ] Click row → navigate to job detail view

---

### Activity review dashboard

**File:** `src/app/dashboard/[id]/page.tsx`

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

- [ ] `Approve All` button — marks all unflagged activities as approved
- [ ] `Export JSON` — downloads the full `ParsedTrainingConfig` with only approved activities
- [ ] Export includes metadata, persona, and filtered `learningFlow[]` (approved only)
- [ ] Optionally: export individual activity configs as separate JSON files

---

### Progress indicators + persistent storage

- [ ] Pipeline step progress bar during processing (Denoising → Understanding → Planning → Generating)
- [ ] Swap in-memory store for SQLite via `better-sqlite3` (or file-based JSON store)
- [ ] Jobs survive server restart
- [ ] Basic error recovery: if one step fails, job status shows which step failed

---

### Polish + multi-document support

- [ ] Multi-document upload: display source document attribution per activity in dashboard
- [ ] Combined learning flow correctly merges and sequences activities across documents
- [ ] Error states: unsupported file type, empty PDF, API timeout
- [ ] Loading skeletons on dashboard while job is processing

**Phase 2 exit:** Upload fixture PDF → review dashboard → approve all activities → export JSON — interaction time minimal vs. manual process.

---

## After Phase 2 — Validation & demo prep

**Prerequisites:** Phase 2 exit met.  
**Goal:** Confirmed accuracy + demo-ready presentation

### Validation Runs

**Run 1 — UHP Training PDF (primary)**
- [ ] Upload the 29-page UHP/Eco Auto Body PDF
- [ ] Confirm pipeline completes in < 30 sec
- [ ] Compare output `learningFlow[]` against manually-expected activities
- [ ] Document accuracy per activity type (script coverage, objection count, scorecard completeness)
- [ ] Record `metadata.confidence` score

**Run 2 — Second client document (TBD)**
- [ ] Upload a second, structurally different training document
- [ ] Confirm pipeline handles document variation without prompt changes
- [ ] Note any activity types that are missed or miscategorized

**Accuracy Target:** > 90% of conversational content correctly mapped to activity configs before HITL review

### Demo Script

1. CEO uploads 1 training PDF via the upload form
2. Pipeline progress bar advances through 4 steps (visible in dashboard)
3. Dashboard shows completed learning flow with typed activities
4. CEO opens one RolePlay, edits a scorecard criterion, clicks Approve
5. CEO clicks Approve All on remaining activities
6. CEO exports JSON — done in < 30 seconds of active interaction

### Known Risks

| Risk | Mitigation |
|---|---|
| LLM hallucinates objection responses | HITL is mandatory — all configs require CEO review before export |
| Multi-doc conflicts (overlapping content) | Step 3 deduplication logic; source attribution per activity |
| PDF text extraction quality (images, columns, mixed layouts) | `pdf-parse` handles text layers only; image content is skipped (acceptable for text-heavy training docs) |
| Objection misclassification (RapidFire vs. RolePlay) | Explicit rule in Step 3 prompt: "Can this be handled in one sentence?" — if no → RolePlay |
| Token limits on large multi-doc uploads | Steps 1–3 run per-document; Step 4 generates activity-by-activity with separate API calls |

---

## Success Metrics

| Metric | Current State | Target |
|---|---|---|
| Technical build time | 20–30 min (manual) | < 30 seconds (automated) |
| Total onboarding cycle | 5 hours | ~1.5 hours (meetings + HITL review) |
| Cost per onboarding | $500 | ~$150 |
| Annual capacity | ~60 deals | 250+ deals |
| Draft accuracy before HITL | N/A | > 90% |
