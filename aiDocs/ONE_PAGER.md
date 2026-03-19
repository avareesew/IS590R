# Replay — AI Onboarding Parser Agent  
**One-page summary** · [Full PRD →](./PRD.md) · [Proposal & ROI →](./project_proposal.md)

---

## What it is

A **local web app** for **Replay** that turns client **training PDFs** into a **structured JSON learning plan** (lessons, memorization, role-plays, rapid-fire objections, etc.). **Anthropic Claude** runs a guided pipeline; the **founder reviews and approves** everything before export.

---

## Problem

Onboarding is **founder-limited**: ~**5 hours** per client to read PDFs and extract scripts, objections, and rubrics before the real “build.” That caps capacity and makes low-ACV deals expensive to serve.

---

## Solution (in one flow)

| Step | What happens |
| --- | --- |
| **Upload** | 1+ PDFs → async **job** |
| **Pipeline** | **Denoise** → **tag sections** → **plan activities** → **generate configs** |
| **Review** | Founder edits, flags, or regenerates single activities |
| **Export** | **Approved JSON** downloaded for import into Replay *(exact import path TBD with stakeholder)* |

---

## Why it’s safe enough for v1

- **Human-in-the-loop** is mandatory — no silent ship to clients.  
- **Runs locally**; only text + prompts go to Claude (accepted by stakeholder).  
- **Source attribution** on activities where possible; **SQLite** persists jobs across restarts.

---

## Targets (product)

| Metric | Aim |
| --- | --- |
| Draft after upload | **&lt; ~30 s** typical doc |
| Draft quality (pre-review) | **~90%** usable *(founder-judged; needs golden PDF checklist)* |
| API cost | **~$1** / onboarding *(see proposal §5)* |
| Infra cost (MVP) | **$0** (local) |

---

## Stack (MVP)

**Next.js** · **React** · **Tailwind** · **SQLite** · **pdf text extract** · **Anthropic API**

---

## Out of scope (MVP)

Scanned-only PDFs without text · multi-tenant cloud · auto-deploy without approval · optional later: **RAG** from Replay-owned generic playbooks for **sparse** client docs (labeled provenance).

---

## Docs in this repo

| Doc | Use when |
| --- | --- |
| **This page** | 2-minute orientation |
| **[PRD](./PRD.md)** | Requirements, schema, API, risks, open questions |
| **[Proposal](./project_proposal.md)** | Business case, personas, user stories, architecture diagram, costs |

*IS590R — March 2026*
