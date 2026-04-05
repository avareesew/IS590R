import Anthropic from "@anthropic-ai/sdk";
import { ParseJob } from "@/types";
import { getSql } from "@/lib/db";
import { downloadPdf } from "@/lib/blob";
import { extractText, extractWithVision, mergeExtractions } from "@/lib/utils/pdf";
import { denoise } from "@/lib/parser/steps/denoise";

export async function runPipeline(job: ParseJob): Promise<void> {
  const sql = getSql();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const updateStatus = async (status: string, step: string, percent: number) => {
    await sql`
      UPDATE jobs
      SET status = ${status}, progress = ${JSON.stringify({ step, percent })}, updated_at = NOW()
      WHERE id = ${job.id}
    `;
  };

  try {
    // ── Ingest: download PDFs, extract + merge canonical text ──────────────────
    await updateStatus("denoising", "Signal Denoising", 5);

    const canonicalDocs = await Promise.all(
      job.blobUrls.map(async (url) => {
        const filename = url.split("/").pop() ?? "document.pdf";
        const buffer = await downloadPdf(url);
        const [textLayer, vision] = await Promise.all([
          extractText(buffer, filename),
          extractWithVision(buffer, filename, client),
        ]);
        return mergeExtractions(textLayer, vision);
      })
    );

    const combinedCanonical = canonicalDocs
      .map((d) => d.canonicalText)
      .join("\n\n---\n\n");

    // ── Step 1: Signal Denoising ───────────────────────────────────────────────
    await updateStatus("denoising", "Signal Denoising", 10);
    const { filteredText, noisePercent } = await denoise(combinedCanonical, client);
    console.log(`[pipeline] denoise: removed ${noisePercent}% noise`);

    // ── Step 2: Document Understanding ────────────────────────────────────────
    await updateStatus("understanding", "Document Understanding", 35);
    // coming in Phase 1

    // ── Step 3: Activity Planning ──────────────────────────────────────────────
    await updateStatus("planning", "Activity Planning", 60);
    // coming in Phase 1

    // ── Step 4: Content Generation ────────────────────────────────────────────
    await updateStatus("generating", "Content Generation", 80);
    // coming in Phase 1

    void filteredText; // will be used by steps 2–4

    await updateStatus("review", "Complete", 100);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      UPDATE jobs
      SET status = 'error', error = ${message}, updated_at = NOW()
      WHERE id = ${job.id}
    `;
  }
}
