"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ParsedTrainingConfig,
  LearningFlowItem,
  LessonConfig,
  MemorizationConfig,
  RolePlayConfig,
  RapidFireConfig,
  MirroringConfig,
} from "@/types";

const ACTIVITY_COLORS: Record<string, string> = {
  Lesson: "bg-blue-50 text-blue-700",
  Memorization: "bg-purple-50 text-purple-700",
  RolePlay: "bg-amber-50 text-amber-700",
  RapidFire: "bg-orange-50 text-orange-700",
  Mirroring: "bg-teal-50 text-teal-700",
};

const APPROVAL_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500",
  approved: "bg-green-50 text-green-700",
  flagged: "bg-red-50 text-red-600",
};

interface JobData {
  id: string;
  clientName: string;
  status: string;
  error?: string;
  result?: ParsedTrainingConfig;
}

function LessonDetail({ config }: { config: LessonConfig }) {
  return (
    <div className="space-y-4">
      {config.topics.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Topics</p>
          <ul className="space-y-1">
            {config.topics.map((t, i) => (
              <li key={i} className="text-sm text-zinc-700">{t}</li>
            ))}
          </ul>
        </div>
      )}
      {config.keyTerms.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Key Terms</p>
          <div className="space-y-2">
            {config.keyTerms.map((kt, i) => (
              <div key={i}>
                <span className="text-sm font-medium text-zinc-900">{kt.term}</span>
                <span className="text-sm text-zinc-500"> — {kt.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {config.concepts.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Concepts</p>
          <ul className="space-y-1">
            {config.concepts.map((c, i) => (
              <li key={i} className="text-sm text-zinc-700">{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemorizationDetail({ config }: { config: MemorizationConfig }) {
  return (
    <div className="space-y-4">
      {config.notes && (
        <p className="text-sm text-zinc-500 italic">{config.notes}</p>
      )}
      {config.segments.map((seg, i) => (
        <div key={i}>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">
            {seg.label} · ~{seg.estimatedDurationMin} min
          </p>
          <div className="space-y-1.5">
            {seg.lines.map((line, j) => (
              <div key={j} className="flex gap-3">
                <span className={`text-xs font-medium w-16 shrink-0 pt-0.5 ${line.speaker === "rep" ? "text-blue-600" : "text-zinc-400"}`}>
                  {line.speaker === "rep" ? "REP" : "CUSTOMER"}
                </span>
                <p className="text-sm text-zinc-700">{line.text}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RolePlayDetail({ config }: { config: RolePlayConfig }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-1">Objective</p>
        <p className="text-sm text-zinc-700">{config.objective}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-1">AI Instructions</p>
        <p className="text-sm text-zinc-700">{config.instructions}</p>
      </div>
      {config.customerPersona && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Customer Persona</p>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-zinc-900">{config.customerPersona.name} · {config.customerPersona.role}</p>
            <p className="text-sm text-zinc-500">{config.customerPersona.demeanor}</p>
            <p className="text-sm text-zinc-600">{config.customerPersona.backstory}</p>
          </div>
        </div>
      )}
      {config.sections?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Scorecard</p>
          <div className="space-y-3">
            {config.sections.map((section, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-zinc-700 mb-1">{section.title}</p>
                <ul className="space-y-1">
                  {section.criteria.map((c, j) => (
                    <li key={j} className="flex gap-2 text-sm">
                      <span className="text-zinc-400 shrink-0">·</span>
                      <span className="text-zinc-600">{c.title}</span>
                      <span className="text-zinc-400 text-xs pt-0.5">({c.criterionType})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-4 text-sm text-zinc-500">
        <span>Passing score: {config.passingScore}%</span>
        <span>Type: {config.roleplayType}</span>
      </div>
    </div>
  );
}

function RapidFireDetail({ config }: { config: RapidFireConfig }) {
  return (
    <div className="space-y-3">
      {config.objections.map((obj, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900">"{obj.trigger}"</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              obj.intent === "Agree" ? "bg-green-50 text-green-700" :
              obj.intent === "Redirect" ? "bg-amber-50 text-amber-700" :
              "bg-blue-50 text-blue-700"
            }`}>{obj.intent}</span>
          </div>
          <div className="space-y-1">
            {obj.responseOptions.map((r, j) => (
              <p key={j} className="text-sm text-zinc-600 pl-3 border-l-2 border-zinc-200">{r}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MirroringDetail({ config }: { config: MirroringConfig }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-1">Video Reference</p>
        <p className="text-sm text-zinc-700">{config.videoReference}</p>
      </div>
      {config.focusPoints.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2">Focus Points</p>
          <ul className="space-y-1">
            {config.focusPoints.map((fp, i) => (
              <li key={i} className="text-sm text-zinc-700">· {fp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActivityConfig({ item }: { item: LearningFlowItem }) {
  switch (item.activityType) {
    case "Lesson":
      return <LessonDetail config={item.config as LessonConfig} />;
    case "Memorization":
      return <MemorizationDetail config={item.config as MemorizationConfig} />;
    case "RolePlay":
      return <RolePlayDetail config={item.config as RolePlayConfig} />;
    case "RapidFire":
      return <RapidFireDetail config={item.config as RapidFireConfig} />;
    case "Mirroring":
      return <MirroringDetail config={item.config as MirroringConfig} />;
  }
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobData | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
      });
  }, [id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-zinc-900">{job.clientName}</p>
          <p className="text-sm text-red-600">Pipeline error: {job.error}</p>
          <button
            onClick={async () => {
              setJob({ ...job, status: "queued" });
              await fetch("/api/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId: id }),
              });
              router.refresh();
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Retry pipeline
          </button>
          <div>
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700">← Back to jobs</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!job.result) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-zinc-900">{job.clientName}</p>
          <p className="text-sm text-zinc-500">Pipeline is still running ({job.status})...</p>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700">← Back to jobs</Link>
        </div>
      </div>
    );
  }

  const flow = job.result.learningFlow;
  const activity = flow[selected];

  async function setApprovalStatus(index: number, status: "approved" | "flagged" | "draft") {
    if (!job?.result) return;
    setSaving(true);
    const updated = { ...job.result };
    updated.learningFlow = [...updated.learningFlow];
    updated.learningFlow[index] = { ...updated.learningFlow[index], approvalStatus: status };
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: updated }),
    });
    setJob({ ...job, result: updated });
    setSaving(false);
  }

  async function approveAll() {
    if (!job?.result) return;
    setSaving(true);
    const updated = {
      ...job.result,
      learningFlow: job.result.learningFlow.map((item) => ({ ...item, approvalStatus: "approved" as const })),
    };
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: updated, status: "approved" }),
    });
    setJob({ ...job, result: updated, status: "approved" });
    setSaving(false);
  }

  function exportJson() {
    if (!job?.result) return;
    const approved = {
      ...job.result,
      learningFlow: job.result.learningFlow.filter((i) => i.approvalStatus === "approved"),
    };
    const blob = new Blob([JSON.stringify(approved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.clientName.replace(/\s+/g, "-").toLowerCase()}-training.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const approvedCount = flow.filter((i) => i.approvalStatus === "approved").length;
  const confidence = job.result.metadata.confidence;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700">← Jobs</Link>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">{job.clientName}</h1>
              <p className="text-xs text-zinc-400">
                {flow.length} activities · {approvedCount} approved · confidence {Math.round(confidence * 100)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={approveAll}
              disabled={saving}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              Approve all
            </button>
            <button
              onClick={exportJson}
              disabled={approvedCount === 0}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              Export JSON ({approvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="mx-auto max-w-6xl flex gap-6 p-6">
        {/* Left: activity list */}
        <div className="w-64 shrink-0 space-y-1.5">
          {flow.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                selected === i
                  ? "border-zinc-900 bg-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTIVITY_COLORS[item.activityType]}`}>
                  {item.activityType}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_COLORS[item.approvalStatus]}`}>
                  {item.approvalStatus}
                </span>
              </div>
              <p className="text-xs text-zinc-700 font-medium leading-snug">{item.title}</p>
            </button>
          ))}
        </div>

        {/* Right: activity detail */}
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
            {/* Activity header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTIVITY_COLORS[activity.activityType]}`}>
                    {activity.activityType}
                  </span>
                  <span className="text-xs text-zinc-400">#{activity.sequencePosition}</span>
                </div>
                <h2 className="text-base font-semibold text-zinc-900">{activity.title}</h2>
                <p className="text-xs text-zinc-400">Source: {activity.sourceSection}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setApprovalStatus(selected, "flagged")}
                  disabled={saving}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    activity.approvalStatus === "flagged"
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Flag
                </button>
                <button
                  onClick={() => setApprovalStatus(selected, "approved")}
                  disabled={saving}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    activity.approvalStatus === "approved"
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Approve
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            {/* Activity config */}
            <ActivityConfig item={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
