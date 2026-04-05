import Anthropic from "@anthropic-ai/sdk";
import { ParseJob, ParsedTrainingConfig } from "@/types";
import { getSql } from "@/lib/db";
import { downloadPdf } from "@/lib/blob";
import { extractText, extractWithVision, mergeExtractions } from "@/lib/utils/pdf";
import { denoise } from "@/lib/parser/steps/denoise";
import { understand } from "@/lib/parser/steps/understand";
import { plan } from "@/lib/parser/steps/plan";
import { generateAll } from "@/lib/parser/steps/generate";

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
    // ── Ingest ────────────────────────────────────────────────────────────────
    await updateStatus("denoising", "Extracting documents", 5);

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

    // ── Step 1: Signal Denoising ──────────────────────────────────────────────
    await updateStatus("denoising", "Signal Denoising", 15);
    const { filteredText, noisePercent } = await denoise(combinedCanonical, client);
    console.log(`[pipeline:${job.id}] denoise: removed ${noisePercent}% noise`);

    // ── Step 2: Document Understanding ───────────────────────────────────────
    await updateStatus("understanding", "Document Understanding", 35);
    const sourceDocument = canonicalDocs.map((d) => d.filename).join(", ");
    const sections = await understand(
      filteredText,
      job.trainingBrief,
      sourceDocument,
      client
    );
    console.log(`[pipeline:${job.id}] understand: ${sections.length} sections tagged`);

    // ── Step 3: Activity Planning ─────────────────────────────────────────────
    await updateStatus("planning", "Activity Planning", 55);
    const activities = await plan(sections, job.trainingBrief, client);
    console.log(`[pipeline:${job.id}] plan: ${activities.length} activities planned`);

    // ── Step 4: Content Generation ────────────────────────────────────────────
    await updateStatus("generating", "Content Generation", 70);
    const learningFlow = await generateAll(activities, sections, client);
    console.log(`[pipeline:${job.id}] generate: ${learningFlow.length} activities generated`);

    // ── Confidence heuristic ──────────────────────────────────────────────────
    const totalChars = combinedCanonical.length;
    const confidence = Math.min(
      1,
      Math.max(0.4, totalChars > 20000 ? 0.9 : totalChars > 5000 ? 0.75 : 0.55)
    );

    // ── Persist result ────────────────────────────────────────────────────────
    const result: ParsedTrainingConfig = {
      metadata: {
        clientName: job.clientName,
        generatedAt: new Date().toISOString(),
        documentCount: job.blobUrls.length,
        schemaVersion: "1.0",
        confidence,
        trainingBrief: job.trainingBrief,
      },
      persona: {
        name: "",
        role: "",
        tone: [],
        communicationStyle: "",
        industryContext: "",
      },
      learningFlow,
    };

    await sql`
      UPDATE jobs
      SET status = 'review',
          progress = ${JSON.stringify({ step: "Complete", percent: 100 })},
          result = ${JSON.stringify(result)},
          updated_at = NOW()
      WHERE id = ${job.id}
    `;

    console.log(`[pipeline:${job.id}] complete — confidence: ${confidence}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline:${job.id}] error: ${message}`);
    await sql`
      UPDATE jobs
      SET status = 'error', error = ${message}, updated_at = NOW()
      WHERE id = ${job.id}
    `;
  }
}
