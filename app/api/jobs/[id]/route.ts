import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getSql();
  const rows = await sql`SELECT * FROM jobs WHERE id = ${id}`;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const row = rows[0];
  return NextResponse.json({
    id: row.id,
    clientName: row.client_name,
    trainingBrief: row.training_brief,
    status: row.status,
    progress: row.progress,
    result: row.result,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const sql = getSql();

  if (body.result !== undefined) {
    await sql`
      UPDATE jobs SET result = ${JSON.stringify(body.result)}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  if (body.status !== undefined) {
    await sql`
      UPDATE jobs SET status = ${body.status}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  return NextResponse.json({ ok: true });
}
