// Run with: node --env-file=.env.local scripts/smoke-pdf.mjs
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const FIXTURES = "fixtures/training-docs";

function findPdfs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...findPdfs(full));
    else if (extname(entry).toLowerCase() === ".pdf") results.push(full);
  }
  return results;
}

const pdfs = findPdfs(FIXTURES);
console.log(`\nFound ${pdfs.length} PDF(s)\n`);

for (const filepath of pdfs) {
  console.log(`── ${filepath} ──`);
  try {
    const buffer = readFileSync(filepath);
    const data = await pdfParse(buffer);
    const charCount = data.text.length;
    const preview = data.text.slice(0, 300).replace(/\n+/g, " ").trim();

    console.log(`  Pages     : ${data.numpages}`);
    console.log(`  Chars     : ${charCount}`);
    console.log(`  Density   : ~${Math.round(charCount / data.numpages)} chars/page`);
    console.log(`  Preview   : ${preview}`);
    console.log();
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}\n`);
  }
}
