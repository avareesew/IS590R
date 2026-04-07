<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Replay Parser

A Next.js 16 app that generates AI-powered training activities from client-uploaded PDFs.

## Architecture

- **Intake flow:** Admin creates a client → gets a tokenized link (`/intake/[token]`) → client uploads PDFs + training brief → job is queued
- **Pipeline:** `POST /api/parse` kicks off `runPipeline()` async (fire-and-forget). Pipeline runs: denoise → understand → plan → generate
- **Storage:** PDFs stored in Vercel Blob (`lib/blob.ts`). Job state in Neon PostgreSQL (`lib/db.ts`)
- **Dashboard:** `/dashboard` polls job status live; supports per-activity regeneration and job deletion

## Key conventions

### DB — fresh connection per query
Always call `getSql()` at the point of use, never hoist it to module scope or reuse across async gaps. Neon serverless closes idle connections during long pipelines.
```ts
// correct
const sql = getSql();
await sql`UPDATE ...`;

// wrong — don't do this
const sql = getSql(); // top of file or reused across awaits
```

### AI model routing
- `claude-opus-4-6` — RolePlay activity generation only (complex, long-form)
- `claude-haiku-4-5-20251001` — all other activity types (Lesson, Memorization, RapidFire, Mirroring, etc.)
- Use the Anthropic SDK (`anthropic` package), not fetch

### PDF extraction
- Text-dense pages (≥300 chars/page avg): text extraction only, skip vision
- Sparse/visual pages: vision extraction via Claude, merged with text extraction

### API routes
All routes are in `app/api/`. Use `NextRequest`/`NextResponse` from `next/server`. No pages-router patterns.
