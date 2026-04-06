import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSql } from "@/lib/db";
import { generateActivity } from "@/lib/parser/steps/generate";
import { ParsedTrainingConfig, TaggedSection, PlannedActivity } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { activityIndex } = await req.json();

  const sql = getSql();
  const rows = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const row = rows[0];
  const result: ParsedTrainingConfig = row.result;
  if (!result) {
    return NextResponse.json({ error: "Job has no result to regenerate from" }, { status: 400 });
  }

  const item = result.learningFlow[activityIndex];
  if (!item) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  // Reconstruct a PlannedActivity from the existing item
  const activity: PlannedActivity = {
    activityType: item.activityType,
    sequencePosition: item.sequencePosition,
    title: item.title,
    rationale: "",
    sourceSection: item.sourceSection,
  };

  // We don't store the tagged sections, so re-derive them from the result's
  // learning flow by pulling content from all activities as a best-effort proxy.
  // For a proper regen, ideally we'd store sections — but this works for now.
  const sections: TaggedSection[] = result.learningFlow.map((f) => ({
    tag: "tactical-advice" as const,
    subtype: null,
    content: JSON.stringify(f.config),
    sourceDocument: f.sourceDocument,
    sourceSection: f.sourceSection,
  }));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const regenerated = await generateActivity(activity, sections, client);

  // Patch only this activity in the result
  const updated: ParsedTrainingConfig = {
    ...result,
    learningFlow: result.learningFlow.map((f, i) =>
      i === activityIndex ? { ...regenerated, approvalStatus: "draft" } : f
    ),
  };

  const sqlUpdate = getSql();
  await sqlUpdate`
    UPDATE jobs SET result = ${JSON.stringify(updated)}, updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ activity: updated.learningFlow[activityIndex] });
}
