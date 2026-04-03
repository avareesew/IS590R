import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { clientName } = await req.json();

  if (!clientName?.trim()) {
    return NextResponse.json({ error: "clientName is required" }, { status: 400 });
  }

  const token = randomBytes(16).toString("hex");

  const sql = getSql();
  await sql`
    INSERT INTO intake_tokens (token, client_name, status)
    VALUES (${token}, ${clientName.trim()}, 'pending')
  `;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;

  return NextResponse.json({
    token,
    clientName: clientName.trim(),
    intakeUrl: `${baseUrl}/intake/${token}`,
  });
}
