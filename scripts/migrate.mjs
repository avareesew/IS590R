// Run with: node --env-file=.env.local scripts/migrate.mjs
// Creates the jobs and intake_tokens tables in Neon Postgres.
// Safe to re-run — uses CREATE TABLE IF NOT EXISTS.

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

console.log("Running migrations...\n");

await sql`
  CREATE TABLE IF NOT EXISTS intake_tokens (
    token        TEXT PRIMARY KEY,
    client_name  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'submitted'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log("✓ intake_tokens");

await sql`
  CREATE TABLE IF NOT EXISTS jobs (
    id             TEXT PRIMARY KEY,
    client_name    TEXT NOT NULL,
    training_brief JSONB NOT NULL DEFAULT '{}',
    blob_urls      JSONB NOT NULL DEFAULT '[]',
    status         TEXT NOT NULL DEFAULT 'queued',
    progress       JSONB NOT NULL DEFAULT '{"step":"","percent":0}',
    result         JSONB,
    error          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log("✓ jobs");

console.log("\nMigrations complete.");
