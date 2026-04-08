# Replay — AI Onboarding Parser Agent

**One-page summary** · [Full PRD →](./PRD.md) · [Proposal & ROI →](./project_proposal.md)

---

## What it is

A **hosted web app** (Vercel) for **Replay** that replaces two manual steps — a first client interview and hours of PDF review — with a **client-facing intake link + AI pipeline**. The founder creates a new client, copies a link, and sends it. The client fills out a 30-second brief (what they want to train on) and uploads their own PDFs. The pipeline runs automatically; the founder reviews and approves a structured JSON learning plan (lessons, memorization, role-plays, rapid-fire objections, etc.) and exports. Ingestion merges **PDF text** with a **Claude vision** pass over **page images** (diagrams, slides, image-embedded copy). **Anthropic Claude** runs the pipeline guided by the training brief.

---

## Problem

Onboarding is **founder-limited**: a first interview to learn what the client wants to train on, then ~**5 hours** per client to read PDFs and extract scripts, objections, and rubrics before the real “build.” That caps capacity and makes low-ACV deals expensive to serve.

---

## Solution (in one flow)


| Step         | Who     | What happens                                                                                                    |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| **Link**     | Founder | Creates new client in dashboard → copies unique intake link → sends to client                                   |
| **Intake**   | Client  | Opens link → selects training topics → adds doc notes → drags and drops PDFs → submits                          |
| **Ingest**   | System  | PDFs pulled from Vercel Blob; text layer + **vision per page** → **merged canonical doc**                       |
| **Pipeline** | System  | **Denoise** → **tag sections** → **plan activities** → **generate configs** (training brief guides Steps 2 & 3) |
| **Review**   | Founder | Edits, flags, or regenerates single activities                                                                  |
| **Export**   | Founder | **Approved JSON** downloaded for import into Replay *(exact import path TBD with stakeholder)*                  |


---

## Why it’s safe enough for v1

- **Human-in-the-loop** is mandatory — no silent ship to clients.  
- **Runs locally**; **text + page images** + prompts go to Claude (accepted by stakeholder).  
- **Source attribution** on activities where possible; **SQLite** persists jobs across restarts.

---

## Targets (product)


| Metric                     | Aim                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Draft after upload         | **< ~30 s** typical doc                                                                                           |
| Draft quality (pre-review) | **~90%** usable *(founder-judged; needs golden PDF checklist)*                                                    |
| API cost                   | **Text baseline ~$1** / onboarding; **+ vision per page** — re-estimate after MVP benchmark *(proposal §5 + PRD)* |
| Infra cost (MVP)           | **$0** (local)                                                                                                    |


---

## Stack (MVP)

**Next.js** · **React** · **Tailwind** · **Vercel** · **Vercel Blob** · **Postgres (Neon)** · **pdf text extract** · **page rasterization** · **Anthropic API (text + vision)**

---

## Out of scope (MVP)

Library-only OCR as the **primary** path (vision LLM is MVP) · multi-tenant auth · auto-deploy without approval · optional later: **RAG** from Replay-owned generic playbooks for **sparse** client docs (labeled provenance).

---

## Docs in this repo


| Doc                                   | Use when                                                           |
| ------------------------------------- | ------------------------------------------------------------------ |
| **This page**                         | 2-minute orientation                                               |
| **[PRD](./PRD.md)**                   | Requirements, schema, API, risks, open questions                   |
| **[Proposal](./project_proposal.md)** | Business case, personas, user stories, architecture diagram, costs |


*IS590R — March 2026*