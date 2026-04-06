import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export async function GET() {
  const sql = getSql();
  const rows = await sql`
    SELECT id, client_name, status, progress, created_at
    FROM jobs
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}
