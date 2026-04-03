import { ParseJob } from "@/types";
import { getSql } from "@/lib/db";

// Stub — steps will be implemented in Phase 1
export async function runPipeline(job: ParseJob): Promise<void> {
  const sql = getSql();
  const updateStatus = async (status: string, step: string, percent: number) => {
    await sql`
      UPDATE jobs
      SET status = ${status}, progress = ${JSON.stringify({ step, percent })}, updated_at = NOW()
      WHERE id = ${job.id}
    `;
  };

  try {
    await updateStatus("denoising", "Signal Denoising", 10);
    // Step 1: denoise — coming in Phase 1

    await updateStatus("understanding", "Document Understanding", 35);
    // Step 2: understand — coming in Phase 1

    await updateStatus("planning", "Activity Planning", 60);
    // Step 3: plan — coming in Phase 1

    await updateStatus("generating", "Content Generation", 80);
    // Step 4: generate — coming in Phase 1

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
