// Run with: node --env-file=.env.local scripts/check-env.mjs

import { neon } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";

let passed = 0;
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg, err) {
  console.error(`  ✗ ${msg}`);
  console.error(`    ${err?.message ?? err}`);
  failed++;
}

// 1. Env vars present
console.log("\n── Env vars ──");
for (const key of ["ANTHROPIC_API_KEY", "DATABASE_URL", "BLOB_READ_WRITE_TOKEN"]) {
  if (process.env[key]) ok(`${key} is set`);
  else fail(`${key} is missing`);
}

// 2. Postgres
console.log("\n── Postgres (Neon) ──");
try {
  const sql = neon(process.env.DATABASE_URL);
  const [{ now }] = await sql`SELECT now()`;
  ok(`Connected — server time: ${now}`);
} catch (err) {
  fail("Could not connect to Postgres", err);
}

// 3. Vercel Blob
console.log("\n── Vercel Blob ──");
let blobUrl;
try {
  const { url } = await put("_check/ping.txt", "ok", {
    access: "private",
    contentType: "text/plain",
  });
  blobUrl = url;
  ok(`Upload succeeded — ${url}`);
} catch (err) {
  fail("Blob upload failed", err);
}

if (blobUrl) {
  try {
    await del(blobUrl);
    ok("Cleanup succeeded");
  } catch {
    // non-fatal
  }
}

// 4. Anthropic (key format only — no API call to avoid spend)
console.log("\n── Anthropic ──");
const key = process.env.ANTHROPIC_API_KEY ?? "";
if (key.startsWith("sk-ant-")) ok("Key format looks correct");
else fail("Key doesn't start with sk-ant- — double check it");

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
