import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { uploadPdf } from "@/lib/blob";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const sql = getSql();

  // Validate token
  const rows = await sql`
    SELECT * FROM intake_tokens WHERE token = ${token}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid intake link" }, { status: 404 });
  }

  const record = rows[0];

  if (record.status === "submitted") {
    return NextResponse.json(
      { error: "This intake link has already been submitted" },
      { status: 409 }
    );
  }

  const formData = await req.formData();
  const topics = formData.getAll("topics") as string[];
  const documentationNotes = formData.get("documentationNotes") as string ?? "";
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one PDF is required" }, { status: 400 });
  }

  // Upload PDFs to Vercel Blob
  const blobUrls: string[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadPdf(file.name, buffer);
    blobUrls.push(url);
  }

  const jobId = randomUUID();
  const trainingBrief = { topics, documentationNotes };

  // Create job
  await sql`
    INSERT INTO jobs (id, client_name, training_brief, blob_urls, status, progress)
    VALUES (
      ${jobId},
      ${record.client_name},
      ${JSON.stringify(trainingBrief)},
      ${JSON.stringify(blobUrls)},
      'queued',
      ${JSON.stringify({ step: "queued", percent: 0 })}
    )
  `;

  // Mark token as used
  await sql`
    UPDATE intake_tokens SET status = 'submitted' WHERE token = ${token}
  `;

  // Kick off pipeline (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
  fetch(`${baseUrl}/api/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  }).catch(() => {});

  return NextResponse.json({ jobId });
}
