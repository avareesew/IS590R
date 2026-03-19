# Product Requirements Document (PRD)

## AI Onboarding Parser Agent — Replay


| Field                | Value                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Document version** | 0.2                                                                                                    |
| **Last updated**     | 2026-03-19                                                                                             |
| **Status**           | Draft — aligned with course final deliverable                                                          |
| **Related docs**     | [project_proposal.md](./project_proposal.md) (business case, personas, stories, lifecycle, cost model) |


---

## 1. Executive summary

Replay’s onboarding is bottlenecked by **manual extraction** of sales training signal from client PDFs (scripts, objections, rubrics, personas). This product is a **local web application** that:

1. Ingests one or more **PDFs** per client onboarding.
2. Builds a **canonical document** from the PDF **text layer** plus a **vision LLM pass** over **page images** so diagrams, slides, and image-embedded copy are not lost.
3. Runs a **four-step AI pipeline** (denoise → understand → plan → generate) using **Anthropic Claude** on that merged source.
4. Produces a **structured, Replay-oriented JSON config** describing a ordered **learning flow** of training activities.
5. Requires **human-in-the-loop (HITL)** review and approval before export.

**MVP posture:** Standalone tool running on the founder’s machine; **JSON download** is the integration surface unless/until Replay exposes a formal import API.

---

## 2. Problem statement

- **Today:** The founder spends ~**5 hours** per client reading materials and structuring content before the technical “deep build” (~20–30 min).
- **Impact:** High cost per onboarding, capped deal capacity, SMB segment economically marginal.
- **Desired:** Cut **technical structuring time** to **< 30 seconds** of machine time and **minimal** founder review time, with **no reduction in quality** vs. manual extraction.

*(Quantified business case: see proposal §1, §4, Appendix A.)*

---

## 3. Goals & success metrics


| Goal ID | Goal                                                 | Metric                                               | Target                                                         |
| ------- | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| G1      | Reduce time spent structuring training from raw docs | Wall-clock from upload → draft config ready          | **< 30 s** (typical 25–30 page PDF, local network)             |
| G2      | Keep founder as quality gate                         | % of exports that pass review without major rewrites | **≥ 90%** “draft usable” *(founder-judged; see §14)*           |
| G3      | Make review efficient                                | Active HITL time to approve + export                 | **~30 s–2 min** *(aspirational; validate with user testing)*   |
| G4      | Operate at predictable cost                          | API cost per onboarding                              | **Budget TBD** — multimodal (vision) per page increases cost vs. text-only; document estimates after model + page policy locked *(see proposal §5 baseline + PRD §14 Q7)* |
| G5      | Recover from failure                                 | Jobs survive restart; failed step identifiable       | 100% of jobs have **auditable state** and **actionable error** |


**Non-goals for metric purposes:** This PRD does *not* require proving full **250 deals/year** capacity in the course scope — that remains a **business projection** tied to org process, not only this tool.

**Note on G1:** A full **per-page vision** pass can push end-to-end time above **30 s** for long PDFs. Treat **30 s** as a target for the **core four-step pipeline** once canonical text exists, or revisit after implementing **selective vision** (FR-02e).

---

## 4. Non-goals & out of scope (MVP)


| ID  | Out of scope                                                       | Rationale                                                                                   |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| NG1 | Automatic deployment into Replay production without human approval | HITL is a core safety and quality requirement                                               |
| NG2 | Standalone OCR library stack as the **primary** extraction path (e.g. Tesseract-only pipeline) | **Rejected for MVP** — past attempts were brittle; **vision-capable LLM** is the primary way to read diagram/slide pages |
| NG3 | Multi-tenant SaaS, auth, cloud hosting                             | MVP is **single-user local**; reduces security and ops surface                              |
| NG4 | Real-time collaborative editing                                    | Single reviewer workflow                                                                    |
| NG5 | Guaranteed legal/compliance sign-off for all verticals             | Tool assists extraction; **founder** remains responsible for client-facing content          |


**Future (post-MVP):** Optional **retrieval augmentation** from a **Replay-curated generic playbook** when client docs are sparse — gated, **provenance-labeled**, never overriding client-sourced content. *(Not required for MVP; see §12 P3.)*

---

## 5. Users & personas


| Persona                    | Role                  | Relationship to product                                                                                                                   |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **P1 — Founder**           | CEO; primary user     | Uploads PDFs, reviews/edits all activities, approves, exports JSON                                                                        |
| **P2 — Ops hire (future)** | Onboarding specialist | May run uploads and **flag** items for founder; **does not** replace final approval in v1 unless explicitly decided *(open question §14)* |


*Full persona tables: [project_proposal.md §6](./project_proposal.md)*

---

## 6. Key user journeys

### 6.1 Happy path — Founder

1. Open local app → **Upload** 1–3 PDFs for a client (optional client name).
2. System creates a **job**, shows **pipeline progress** (denoising → understanding → planning → generating).
3. On completion, open **job detail** → review **ordered learning flow** (cards/list).
4. Open each activity → **edit** fields inline; **regenerate** single activity if needed.
5. **Approve** activities (or approve all) → **Export JSON** → file saved locally.
6. Founder imports or pastes config into Replay’s builder **per current Replay workflow** *(mechanism TBD §14)*.

### 6.2 Failure path — Bad PDF

1. Upload corrupt PDF or total extraction failure (text + vision) → job enters **`error`** with message naming the failure (**extraction** vs **API** vs **step**).
2. Founder replaces file or retries failed step when supported.

### 6.3 Recovery path — Restart

1. App or machine restarts mid-job → job resumes from **last completed step** (or shows **retry** for failed step); **no silent data loss** of prior draft.

---

## 7. Functional requirements

### 7.1 Ingestion & jobs


| ID     | Requirement                                                                                                                                                                                                                                                                                                                                 | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01  | Accept **multi-file upload** (PDF) per job; reject unsupported types with clear error                                                                                                                                                                                                                                                       | P0       |
| FR-02  | Extract **plain text** from each PDF’s **text layer** locally (e.g. `pdf-parse`); when possible, record **per-page** or per-document character counts to drive logging and optional **selective vision**                                                                                                                                      | P0       |
| FR-02b | **Rasterize** PDF pages to images (e.g. **pdfjs-dist** or Poppler `pdftoppm`); respect **max dimension / DPI** and **page caps** suitable for the chosen vision API                                                                                                                                                                         | P0       |
| FR-02c | For each page sent to vision, call a **vision-capable LLM** (same stack as the rest of the product: **Anthropic Claude with image input**) to: transcribe **visible text**, summarize **diagrams / flowcharts** (nodes, arrows, labels), and return **structured plain text** suitable for merging into the pipeline                         | P0       |
| FR-02d | **Merge** text-layer and vision outputs into one **canonical plain-text representation** per document with **provenance** (e.g. `text_layer`, `vision:page=12`) so downstream steps and HITL can see what came from where; **prefer text layer** for verbatim copy when both exist; **append** vision for diagram-only or supplemental content | P0       |
| FR-02e | **Optional optimization (P1):** run vision only on pages below a **text-density threshold** to reduce cost; MVP may process **all pages** first, then add selectivity once baseline quality is proven                                                                                                                                          | P1       |
| FR-03  | Create a **parse job** with unique `jobId`, timestamps, and **status** per lifecycle (proposal §8)                                                                                                                                                                                                                                          | P0       |
| FR-04  | Run pipeline **asynchronously**; API returns `jobId` immediately                                                                                                                                                                                                                                                                            | P0       |


### 7.2 AI pipeline


| ID    | Requirement                                                                                                                                                                                                                                              | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-10 | **Step 1 — Denoise:** Remove non-conversational noise (schedules, TOC, commissions, legal boilerplate, etc.) while **preserving** scripts, objections, value props, personas, rubric-like content                                                        | P0       |
| FR-11 | **Step 2 — Understand:** Emit a **tagged section map** (e.g. `script`, `objection-list`, `value-prop`, `persona`, `tactical-advice`, `process-steps`, `industry-context`, `video-reference`) with **source document/section** attribution where possible | P0       |
| FR-12 | **Step 3 — Plan:** Produce an **ordered activity plan** from allowed types: `Lesson`, `Memorization`, `RolePlay`, `RapidFire`, `Mirroring` — with **documented sequencing rules** (foundational → scripts → practice → drills → full roleplay)           | P0       |
| FR-13 | **Step 4 — Generate:** For each planned activity, output a **typed config object** matching the activity schema (see §10)                                                                                                                                | P0       |
| FR-14 | Attach `metadata.confidence` (0–1) at job/config level reflecting **source completeness** (heuristic + model judgment, documented in implementation)                                                                                                      | P1       |
| FR-15 | Support **per-activity regeneration** (re-run Step 4 for one activity) without full pipeline re-run                                                                                                                                                      | P1       |


### 7.3 Human-in-the-loop (HITL)


| ID    | Requirement                                                                                                                                        | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-20 | **Job list** view: all jobs with status, client label, doc count, updated time                                                                     | P0       |
| FR-21 | **Job detail** view: ordered activities with type badge; select activity to edit                                                                   | P0       |
| FR-22 | **Inline edit** for all user-visible fields per activity type                                                                                      | P0       |
| FR-23 | **Visual flag** for low-confidence activities/sections (threshold configurable)                                                                    | P1       |
| FR-24 | Actions: **Approve** activity, **Flag for revision**, **Regenerate** (single activity), **Delete** activity from flow                              | P1       |
| FR-25 | **Approve all** + **Export JSON** (export contains **only approved** activities unless export draft is explicitly chosen — default: approved only) | P0       |


### 7.4 API (MVP)


| ID    | Requirement                                                               | Priority |
| ----- | ------------------------------------------------------------------------- | -------- |
| FR-30 | `POST /api/parse` — multipart upload, returns `{ jobId }`                 | P0       |
| FR-31 | `GET /api/jobs` — list jobs                                               | P0       |
| FR-32 | `GET /api/jobs/[id]` — job status, progress, result/draft                 | P0       |
| FR-33 | `PATCH /api/jobs/[id]` — persist edits, approval flags, regenerate action | P0       |


*Lifecycle & error behavior: [project_proposal.md §8](./project_proposal.md)*

---

## 8. Non-functional requirements


| ID     | Category            | Requirement                                                                                             |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------- |
| NFR-01 | **Privacy**         | MVP runs **locally**; **PDF text**, **page images** (or downscaled renders), and prompts are sent to **Anthropic** per founder acceptance |
| NFR-08 | **Multimodal**      | Vision calls use a **documented** model ID, image size limits, and retry policy; failures on a subset of pages MUST NOT silently drop pages — surface partial success + which pages failed |
| NFR-02 | **Reliability**     | Persist jobs to **SQLite** (or equivalent); survive normal app restarts                                 |
| NFR-03 | **Observability**   | Each job records **current step**, **percent/progress**, **last error**                                 |
| NFR-04 | **Resilience**      | Claude calls: **retry with backoff** (e.g. 3×) on timeout/rate limit                                    |
| NFR-05 | **Maintainability** | TypeScript types for **job**, **config**, and **per-activity** payloads; version field on exported JSON |
| NFR-06 | **Usability**       | Founder can complete happy path **without CLI**                                                         |
| NFR-07 | **Performance**     | Typical single-doc onboarding completes pipeline within **G1** target under normal conditions           |


---

## 9. System architecture (summary)

- **Client:** Next.js (App Router) + React + Tailwind — **local** `npm run dev` or local production build.
- **Server:** Next.js **API routes** for parse/jobs/patch.
- **Ingestion:** Text extraction locally + **page rasterization** → **Claude vision** → merged canonical text.
- **Pipeline:** Node async worker pattern (in-process or queue) calling **Claude** per step (text + prior multimodal merge).
- **Storage:** **SQLite** for job records and draft configs.
- **External:** **Anthropic API** (model version **pinned** in config — open question §14).

*Mermaid architecture diagram: [project_proposal.md §2, Figure 1](./project_proposal.md)*

---

## 10. Data model & export schema (canonical MVP)

### 10.1 Top-level export: `ParsedTrainingConfig`

```json
{
  "metadata": {
    "clientName": "string",
    "generatedAt": "ISO-8601",
    "documentCount": 0,
    "schemaVersion": "string",
    "confidence": 0.0
  },
  "persona": {
    "name": "string",
    "role": "string",
    "tone": ["string"],
    "communicationStyle": "string",
    "industryContext": "string"
  },
  "learningFlow": [
    {
      "activityType": "Lesson | Memorization | RolePlay | RapidFire | Mirroring",
      "sequencePosition": 1,
      "title": "string",
      "sourceDocument": "string",
      "sourceSection": "string",
      "approvalStatus": "draft | approved | flagged",
      "config": { }
    }
  ]
}
```

### 10.2 Activity configs (per-type shapes)

Implementations MUST validate `config` against the activity type.

- **Lesson:** `topics[]`, `keyTerms[]` `{ term, definition }`, `concepts[]`
- **Memorization:** `segments[]` with `label`, `lines[]` `{ speaker: "rep" | "customer", text }`, `estimatedDurationMin`, optional `notes`
- **RolePlay:** `persona` (name, role, demeanor, backstory, commonObjections[]), `scenario`, `difficulty`, `passingScore`, `scorecard[]` (section, criteria, maxPoints, evaluationMethod)
- **RapidFire:** `objections[]` — `trigger`, `intent` (`Agree` | `Respond` | `Redirect`), `goodResponseIndicators[]`, `responseOptions[]` *(multi-variant from real docs)*
- **Mirroring:** Only when `video-reference` exists in source; otherwise planner MUST **omit** or **explicitly document skip** in plan output

**Traceability:** Every activity SHOULD retain **sourceDocument** / **sourceSection** where possible for HITL trust.

---

## 11. Traceability: user stories → requirements


| Story ID | Maps to                     |
| -------- | --------------------------- |
| US-01    | FR-01–04, FR-02b–02d        |
| US-02    | FR-04, FR-32, NFR-03        |
| US-03    | FR-20–22                    |
| US-04    | FR-22, FR-33                |
| US-05    | FR-25                       |
| US-06    | FR-14, FR-23                |
| US-07    | FR-15, FR-33                |
| US-08    | FR-31                       |
| US-09    | FR-24 *(+ permissions §14)* |


*Stories: [project_proposal.md §7](./project_proposal.md)*

---

## 12. Phased delivery


| Phase                    | Scope                                                                           | Exit criteria                                                      |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **P0 — PRD + alignment** | Stakeholder sign-off on schema, import path, MVP scope                          | This doc + resolved §14 blockers                                   |
| **P1 — MVP build**       | FR P0 items (including **multimodal ingestion**), SQLite, export                 | Fixture PDF with **diagram/image-heavy** pages runs end-to-end; founder can edit + export     |
| **P2 — Polish**          | P1 FRs, progress UI, regeneration, confidence flags                             | Demo script repeatable in < 5 min                                  |
| **P3 — Optional**        | RAG from **Replay-owned** template library; industry tags; strict provenance UI | Sparse-doc scenario tested; zero unlabeled template text in export |


---

## 13. Risks & mitigations


| Risk                                  | Impact                    | Mitigation                                                                     |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| LLM invents scripts/objections        | Wrong client training     | Mandatory HITL; source attribution fields; regenerate per activity             |
| PDF extraction garbage in/garbage out | Bad drafts                | **Text + vision merge**; pre-flight stats; **error** only if combined canonical doc is unusable; warn on low text *before* vision |
| Vision misreads diagram or hallucinates labels | Wrong training content | HITL; provenance tags; prompt asks for “visible text only” + explicit uncertainty; optional re-run vision for a page |
| Vision cost / latency                 | Slower or expensive runs  | P1 selective pages; page caps; document pricing in README; async job UX |
| Schema drift vs real Replay import    | Export unusable           | **§14** — lock target schema with founder; version field                       |
| Token limits on huge uploads          | Timeouts / partial output | Chunk per document; Step 4 **per activity** calls; cap pages with user warning |
| Founder acceptance of “90% draft”     | Disputed success metric   | Define rubric in §14 with 1–2 **golden** PDFs + expected counts                |


---

## 14. Open questions & decisions *(need stakeholder input)*


| #   | Question                                                                                         | Proposed default                                                                                            |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Q1  | What is the **authoritative import format** for Replay today (JSON shape, API, or manual paste)? | Treat **this PRD’s `ParsedTrainingConfig`** as MVP contract; add adapter if Replay ships a different schema |
| Q2  | Who may **approve** exports in v1 — founder only, or ops with founder override?                  | **Founder only** for MVP                                                                                    |
| Q3  | **Model ID** and pinning (e.g. Sonnet variant + date)?                                           | Pin in `.env` / config; document in README                                                                  |
| Q4  | **Golden test docs** (1–2 PDFs) + expected outputs for “90% draft” evaluation?                   | Founder provides PDF + **checklist** (e.g. objection count, script variants)                                |
| Q5  | Is **Mirroring** in scope for MVP if no video references in PDFs?                                | **Skip** unless `video-reference` sections exist                                                            |
| Q6  | **RAG / template library** in course timeline?                                                   | **P3 optional** — not blocking PRD approval                                                                 |
| Q7  | **Vision policy:** all pages vs. low-text pages only? Max resolution? Hard page cap per job?      | **Default to all pages** for MVP simplicity; add selective pass + caps when cost/latency measured on real fixtures |


---

## 15. Document history


| Version | Date       | Notes                                                     |
| ------- | ---------- | --------------------------------------------------------- |
| 0.1     | 2026-03-19 | Initial PRD from proposal + pipeline/schema consolidation |
| 0.2     | 2026-03-19 | MVP includes **LLM vision/OCR** for diagrams and image-embedded text; removed library-only OCR as primary path |


---

*End of PRD*