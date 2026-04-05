# Changelog

All notable documentation and product-spec changes for this repo are listed here (newest first).

---

## 2026-04-05 — Phase 1 Steps 2–4 implemented + RolePlay schema updated

**Why:** Full pipeline now operational end-to-end. Steps 2–4 built and smoke tested against Alta 2-page fixture. RolePlay config schema updated to match the actual Replay API format provided by the founder.

### `lib/parser/steps/understand.ts` (new)

- `understand(filteredText, brief, client)` — tags filtered text into typed sections: `script`, `objection-list`, `tactical-advice`, `value-prop`, `process-steps`, `persona`, `industry-context`, `video-reference`
- Training brief passed as prioritization directive — topics in brief get higher-fidelity tagging
- Returns `TaggedSection[]` with `tag`, `subtype` (for scripts: `intro` | `close` | `null`), `content`, `sourceDocument`, `sourceSection`

### `lib/parser/steps/plan.ts` (updated)

- Full prompt rewrite incorporating Training Orchestration logic from founder
- Consolidation rules: target 4–8 activities; combine all foundational sections into one Lesson; combine all scripts into Memorization; combine all quick objections into one RapidFire
- Companion pairing: when Memorization script exists, always recommend a companion script-derived RolePlay
- RapidFire vs RolePlay test: "Can this be handled in one sentence?" — if yes → RapidFire; if no → RolePlay

### `lib/parser/steps/generate.ts` (updated)

- `generateAll()` runs all activity config generations in parallel via `Promise.all` (was sequential)
- RolePlay `CONFIG_SCHEMAS` updated to match real Replay API format
- Generation rules updated: `criterionType` guidance (`YesNoQuestion` for binary, `RangeQuestion` for scored, `OpenEndedQuestion` for holistic), personality variants (Easy/Medium/Hard) always included

### `lib/parser/steps/denoise.ts` (updated)

- Chunked denoising: input split into 12k-char chunks, all chunks denoised in parallel
- Fixes multi-minute API hangs on large docs (29-page fixture was timing out as one call)

### `types/index.ts`

- `RolePlayConfig` rebuilt to match actual Replay API format
- Added `RolePlayCriterion` and `RolePlaySection` interfaces
- `criterionType`: `"YesNoQuestion" | "RangeQuestion" | "OpenEndedQuestion"`
- `sections[]` replaces old `scorecard[]`; `variables[]` with Easy/Medium/Hard personality variants added

### `scripts/smoke-pipeline.mjs` (new)

- End-to-end pipeline smoke test (no Postgres/Blob required — reads fixtures directly)
- Inline RolePlay schema updated to match Replay API format
- Smoke test result (Alta, 2-page): 11 sections tagged, 10 activities planned and generated in parallel

---

## 2026-04-05 — Phase 1 Step 1: Signal Denoising implemented

**Why:** First AI pipeline step built and smoke tested. Strips non-training noise from canonical PDF text before downstream steps run.

### `lib/parser/steps/denoise.ts` (new)

- `denoise(canonicalText, client)` — calls Claude with a system prompt that removes noise (welcome letters, commission tables, schedules, dress code) while preserving scripts, objections, value props, personas, and frameworks
- Returns `{ filteredText, noisePercent }` — noisePercent is a rough heuristic based on char count delta
- Smoke tested: 30% noise removed from exampleone (29-page doc); 6–11% from script-only docs (correct — those had minimal noise)

### `lib/parser/pipeline.ts`

- Wired in full ingest phase: downloads PDFs from Vercel Blob, runs `extractText` + `extractWithVision` in parallel, merges into canonical text
- Step 1 (`denoise`) now called with real output; Steps 2–4 still stubbed

### `aiDocs/roadmap.md`

- Step 1 marked ✅ COMPLETE with validation results
- Fixed all `src/lib/` → `lib/` and `src/app/` → `app/` path references throughout Phase 1

---

## 2026-04-05 — Phase 0 complete: infra verified + multimodal extraction implemented

**Why:** Completed all Phase 0 batches. Infra (Neon Postgres, Vercel Blob, Anthropic API) verified working. PDF text extraction and Claude vision pipeline implemented and smoke-tested against all 4 fixture PDFs including a diagram-heavy document.

### `lib/utils/pdf.ts`

- Added `extractWithVision(buffer, filename, client)` — sends PDF to Claude as a native document block; extracts transcribed text and diagram descriptions via structured XML response
- Added `mergeExtractions(textLayer, vision)` — combines text-layer and vision outputs into a `CanonicalDocument` with per-block provenance (`text_layer`, `vision`, `vision:diagram=N`)
- Added `CanonicalDocument` and `VisionExtractedDocument` interfaces
- Fixed `blob.ts` — changed upload access from `"public"` to `"private"` (Blob store was provisioned as private)
- Downgraded `pdf-parse` v2 → v1.1.1 (v2 requires browser APIs incompatible with Node.js)

### `scripts/`

- Added `scripts/check-env.mjs` — verifies all env vars, Postgres connection, Blob upload/delete, and Anthropic key format
- Added `scripts/smoke-pdf.mjs` — smoke tests text-layer extraction on all fixture PDFs
- Added `scripts/smoke-vision.mjs` — smoke tests full vision extraction + merge pipeline on all fixture PDFs

### `aiDocs/roadmap.md`

- Marked Batches A, A2, B, C as ✅ COMPLETE
- Documented Batch C approach change: native Claude PDF document blocks instead of manual rasterization (Vercel-compatible; no system binary dependencies)

---

All notable documentation and product-spec changes for this repo are listed here (newest first).

Format: **date**, **summary**, then bullets by file.

---

## 2026-04-02 — PRD v0.4: intake is client-facing link; app moves to Vercel + Postgres + Blob

**Why:** Instead of the founder filling out the training brief, a unique link is sent to the client. The client fills out the brief and uploads their own PDFs directly. This eliminates the first interview entirely without requiring the founder to be involved at all. Hosting moves from local to Vercel; storage migrates from SQLite/local filesystem to hosted Postgres (Neon) and Vercel Blob.

### `PRD.md` (0.3 → **0.4**)

- **§1 Executive summary:** App described as hosted (Vercel); client fills brief and uploads PDFs via link; MVP posture updated to Vercel + Postgres + Blob.
- **§2 Problem statement:** Desired state updated to "client-facing intake link."
- **§3 Goals:** G1 updated to reflect Vercel serverless context.
- **§4 Non-goals:** NG3 updated — cloud hosting is now in scope; what's out is multi-tenant auth, not hosting itself.
- **§5 Personas:** Client (P2) added as a persona; Ops hire moved to P3.
- **§6 User journeys:** Founder happy path updated (generate link, send, wait); Client happy path (6.2) added.
- **§7.0 Intake:** FR-00 revised (link generation by founder); FR-00b (client fills brief); FR-00c (client uploads PDFs to Vercel Blob, job created); FR-00d (stored in Postgres); FR-00e (directive into pipeline); FR-00f (single-use token, P1).
- **§8 NFR:** NFR-01 privacy updated for hosted context; NFR-02 reliability updated to Postgres.
- **§9 Architecture:** Full rewrite — Vercel, Vercel Blob, Postgres, token-scoped public intake route.
- **§11 Traceability:** US-00 → FR-00–00f.
- **§12 Phased delivery:** P1 scope updated.
- **§13 Risks:** Vercel timeout and client-uploaded bad PDF rows added.
- **§14 Open questions:** Q8 (Vercel plan / timeout), Q9 (intake link policy) added.
- **§15 Document history:** v0.4 entry.

### `roadmap.md`

- **Core goal:** Updated to note client self-serve intake.
- **Architecture diagram:** Full rewrite showing founder → link → client → Vercel Blob → pipeline → founder dashboard.
- **Phase 0 goal:** Updated to Vercel deployment + Postgres + Blob.
- **Batch A:** Infra setup added (Neon, Vercel Blob, env vars); file structure updated for new API routes and token-scoped intake page.
- **Batch A2:** Rewritten — now covers `POST /api/clients`, token generation, `src/app/intake/[token]/page.tsx`, PDF upload to Blob, job creation.
- **Definition of Done:** Updated to Vercel deployment + client intake link flow.
- **Known Risks:** Vercel timeout and bad client PDF rows added.

### `ONE_PAGER.md`

- **What it is:** Updated for hosted app + client-facing link flow.
- **Solution flow:** Table restructured with Who column; Intake row is now client action; Link row added for founder.
- **Stack:** SQLite replaced with Postgres (Neon) + Vercel Blob; Vercel added.
- **Out of scope:** "multi-tenant cloud" → "multi-tenant auth" (cloud is now in scope).

---

## 2026-04-02 — PRD v0.3: training brief intake replaces first client interview

**Why:** The CEO's current workflow begins with a conversation to learn what the client wants to train on (topics, available documentation). This is now replaced by a structured intake form the founder fills out before upload, so no interview is needed.

### `PRD.md` (0.2 → **0.3**)

- **§1 Executive summary:** Added training brief intake as step 1 of the product flow; updated pipeline description to reference brief as directive.
- **§2 Problem statement:** Explicitly names first client interview as a cost; desired state is a 30-second form replacing it.
- **§6.1 Happy path:** Intake form is now step 1; upload is step 2.
- **§7.0 Training brief intake (new section):** FR-00 (form fields), FR-00b (stored in job + exported schema), FR-00c (directive into Steps 2 & 3).
- **§9 Architecture:** Intake layer called out before ingestion.
- **§10.1 Schema:** `metadata.trainingBrief` field added (`topics[]`, `documentationNotes`).
- **§11 Traceability:** US-00 → FR-00–00c added.
- **§12 Phased delivery:** P1 scope updated to include training brief intake.
- **§15 Document history:** v0.3 entry.

### `roadmap.md`

- **Architecture diagram:** Training brief shown as input feeding into Steps 2 & 3.
- **Phase 0 Batch A:** File structure updated to include `src/app/intake/page.tsx`; `TrainingBrief` type added to `types/index.ts`.
- **Phase 0 Batch A2 (new):** Training brief intake form milestone with field spec and type definition.
- **Step 2 (Understand):** Brief passed as context for prioritized section tagging.
- **Step 3 (Plan):** Brief passed as directive; stated topics prioritized in activity plan.

### `ONE_PAGER.md`

- **What it is:** Updated to describe brief + pipeline replacing both the interview and manual review.
- **Problem:** First interview named as a cost alongside PDF review time.
- **Solution flow:** Intake row added as first step; Pipeline row notes brief guides Steps 2 & 3.

---

## 2026-03-19 — PRD v0.2: multimodal (vision) ingestion in MVP

**Why:** Training PDFs often carry critical content in **diagrams and images**. MVP now specifies **LLM vision** over rasterized pages (not a library-only OCR stack as the primary path).

### `PRD.md` (0.1 → **0.2**)

- **Executive summary:** Ingestion builds a **canonical document** from PDF **text layer** + **vision pass** on **page images** before the four-step pipeline.
- **§3 Goals:** **G4** — API cost marked **TBD** until vision benchmark; note under table that **G1 (~30s)** may exclude full per-page vision until selective mode exists.
- **§4 Non-goals:** **NG2** replaced — out of scope is **Tesseract/library-only as primary**; vision LLM is MVP.
- **§6.2 Failure path:** Error if **combined** text+vision extraction fails (not “image-only unsupported”).
- **§7.1 Functional requirements:**
  - **FR-02** refined (text layer + per-page stats).
  - **FR-02b–d (P0):** rasterize pages, Claude vision (transcribe + describe diagrams), merge with **provenance** (`text_layer` vs `vision:page=N`).
  - **FR-02e (P1):** optional selective vision on low-text pages.
- **§8 NFR:** **NFR-01** includes page images to Anthropic; **NFR-08** multimodal failure/partial success behavior.
- **§9 Architecture:** Ingestion step called out (rasterization → vision → merge).
- **§11 Traceability:** **US-01** maps to FR-02b–02d.
- **§12 Phased delivery:** P1 includes multimodal ingestion; exit criteria mention **diagram-heavy** fixture.
- **§13 Risks:** Rows for vision misread, cost/latency; PDF row updated for text+vision merge.
- **§14 Open questions:** **Q7** vision policy (all pages vs selective, caps).
- **§15 Document history:** v0.2 entry.

### `project_proposal.md`

- **§5 Operational cost:** New subsection **“Multimodal ingestion (MVP)”** — existing table is **text-only baseline**; re-benchmark after vision model, image size, and page policy. Links to PRD.

### `ONE_PAGER.md`

- **What it is / flow:** Ingest row (text + vision merge); pipeline unchanged in spirit.
- **Safe / targets / stack / out of scope:** Aligned with multimodal MVP and revised cost wording.

### `roadmap.md`

- **Phase 0 Batch B:** Clarified as **text layer** smoke test; fixture path generic.
- **Phase 0 Batch C (new):** Checklist for **FR-02b–02d** (rasterize, Claude vision, merge, provenance, fixture with diagram-only content).
- **Definition of Done:** Requires **merged** canonical text on diagram-heavy PDFs.

---

## 2026-03-19 (earlier) — Initial docs push

- Added **PRD**, **one-pager**, **proposal**, **roadmap**, **`.gitignore`** (exclude `fixtures/training-docs/**` except README), **README** links.

*(Adjust dates if you consolidate commits.)*
