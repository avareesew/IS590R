import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { runPipeline } from "@/lib/parser/pipeline";
import { ParseJob } from "@/types";

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();

  const sql = getSql();
  const rows = await sql`SELECT * FROM jobs WHERE id = ${jobId}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const row = rows[0];
  const job: ParseJob = {
    id: row.id,
    clientName: row.client_name,
    trainingBrief: row.training_brief,
    blobUrls: row.blob_urls,
    status: row.status,
    progress: row.progress,
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Run pipeline async — response returns immediately
  runPipeline(job).catch(() => {});

  return NextResponse.json({ ok: true });
}
