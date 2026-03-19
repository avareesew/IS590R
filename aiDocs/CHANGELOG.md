# Changelog

All notable documentation and product-spec changes for this repo are listed here (newest first).

Format: **date**, **summary**, then bullets by file.

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
