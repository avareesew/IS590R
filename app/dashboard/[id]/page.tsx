"use client";

import { useEffect, useRef, useState } from "react";
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
  draft: "bg-gray-100 text-gray-500",
  approved: "bg-green-50 text-green-700",
  flagged: "bg-red-50 text-red-500",
};

const PROCESSING_STATUSES = new Set(["queued", "denoising", "understanding", "planning", "generating"]);

const STEP_LABELS: Record<string, string> = {
  queued: "Queued",
  denoising: "Signal Denoising",
  understanding: "Document Understanding",
  planning: "Activity Planning",
  generating: "Content Generation",
};

interface JobData {
  id: string;
  clientName: string;
  status: string;
  progress?: { step: string; percent: number };
  error?: string;
  result?: ParsedTrainingConfig;
}

// ─── Read-only detail components ──────────────────────────────────────────────

function LessonDetail({ config }: { config: LessonConfig }) {
  return (
    <div className="space-y-4">
      {config.topics.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Topics</p>
          <ul className="space-y-1">
            {config.topics.map((t, i) => (
              <li key={i} className="text-sm text-gray-700">{t}</li>
            ))}
          </ul>
        </div>
      )}
      {config.keyTerms.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Key Terms</p>
          <div className="space-y-2">
            {config.keyTerms.map((kt, i) => (
              <div key={i}>
                <span className="text-sm font-medium text-gray-900">{kt.term}</span>
                <span className="text-sm text-gray-500"> — {kt.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {config.concepts.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Concepts</p>
          <ul className="space-y-1">
            {config.concepts.map((c, i) => (
              <li key={i} className="text-sm text-gray-700">{c}</li>
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
        <p className="text-sm text-gray-500 italic">{config.notes}</p>
      )}
      {config.segments.map((seg, i) => (
        <div key={i}>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">
            {seg.label} · ~{seg.estimatedDurationMin} min
          </p>
          <div className="space-y-1.5">
            {seg.lines.map((line, j) => (
              <div key={j} className="flex gap-3">
                <span className={`text-xs font-medium w-16 shrink-0 pt-0.5 ${line.speaker === "rep" ? "text-blue-600" : "text-gray-400"}`}>
                  {line.speaker === "rep" ? "REP" : "CUSTOMER"}
                </span>
                <p className="text-sm text-gray-700">{line.text}</p>
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
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">Objective</p>
        <p className="text-sm text-gray-700">{config.objective}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">AI Instructions</p>
        <p className="text-sm text-gray-700">{config.instructions}</p>
      </div>
      {config.customerPersona && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Customer Persona</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-gray-900">{config.customerPersona.name} · {config.customerPersona.role}</p>
            <p className="text-sm text-gray-500">{config.customerPersona.demeanor}</p>
            <p className="text-sm text-gray-600">{config.customerPersona.backstory}</p>
          </div>
        </div>
      )}
      {config.sections?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Scorecard</p>
          <div className="space-y-3">
            {config.sections.map((section, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-700 mb-1">{section.title}</p>
                <ul className="space-y-1">
                  {section.criteria.map((c, j) => (
                    <li key={j} className="flex gap-2 text-sm">
                      <span className="text-gray-400 shrink-0">·</span>
                      <span className="text-gray-600">{c.title}</span>
                      <span className="text-gray-400 text-xs pt-0.5">({c.criterionType})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-4 text-sm text-gray-500">
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
        <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">"{obj.trigger}"</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              obj.intent === "Agree" ? "bg-green-50 text-green-700" :
              obj.intent === "Redirect" ? "bg-amber-50 text-amber-700" :
              "bg-blue-50 text-blue-700"
            }`}>{obj.intent}</span>
          </div>
          <div className="space-y-1">
            {obj.responseOptions.map((r, j) => (
              <p key={j} className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200">{r}</p>
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
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">Video Reference</p>
        <p className="text-sm text-gray-700">{config.videoReference}</p>
      </div>
      {config.focusPoints.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Focus Points</p>
          <ul className="space-y-1">
            {config.focusPoints.map((fp, i) => (
              <li key={i} className="text-sm text-gray-700">· {fp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Edit components ──────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#1787ff] focus:outline-none";
const labelCls = "text-xs font-medium uppercase tracking-widest text-gray-400 mb-1 block";

function LessonEdit({ config, onChange }: { config: LessonConfig; onChange: (c: LessonConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Topics (one per line)</label>
        <textarea
          className={inputCls}
          rows={config.topics.length + 1}
          value={config.topics.join("\n")}
          onChange={(e) => onChange({ ...config, topics: e.target.value.split("\n") })}
        />
      </div>
      <div>
        <label className={labelCls}>Key Terms</label>
        <div className="space-y-2">
          {config.keyTerms.map((kt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputCls}
                placeholder="Term"
                value={kt.term}
                onChange={(e) => {
                  const updated = [...config.keyTerms];
                  updated[i] = { ...updated[i], term: e.target.value };
                  onChange({ ...config, keyTerms: updated });
                }}
              />
              <input
                className={inputCls}
                placeholder="Definition"
                value={kt.definition}
                onChange={(e) => {
                  const updated = [...config.keyTerms];
                  updated[i] = { ...updated[i], definition: e.target.value };
                  onChange({ ...config, keyTerms: updated });
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Concepts (one per line)</label>
        <textarea
          className={inputCls}
          rows={config.concepts.length + 1}
          value={config.concepts.join("\n")}
          onChange={(e) => onChange({ ...config, concepts: e.target.value.split("\n") })}
        />
      </div>
    </div>
  );
}

function MemorizationEdit({ config, onChange }: { config: MemorizationConfig; onChange: (c: MemorizationConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Notes</label>
        <input
          className={inputCls}
          value={config.notes}
          onChange={(e) => onChange({ ...config, notes: e.target.value })}
        />
      </div>
      {config.segments.map((seg, si) => (
        <div key={si}>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">
            {seg.label} · ~{seg.estimatedDurationMin} min
          </p>
          <div className="space-y-2">
            {seg.lines.map((line, li) => (
              <div key={li} className="flex gap-3 items-start">
                <span className={`text-xs font-medium w-16 shrink-0 pt-2 ${line.speaker === "rep" ? "text-blue-600" : "text-gray-400"}`}>
                  {line.speaker === "rep" ? "REP" : "CUSTOMER"}
                </span>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={line.text}
                  onChange={(e) => {
                    const updatedSegs = config.segments.map((s, sIdx) => {
                      if (sIdx !== si) return s;
                      const updatedLines = s.lines.map((l, lIdx) =>
                        lIdx === li ? { ...l, text: e.target.value } : l
                      );
                      return { ...s, lines: updatedLines };
                    });
                    onChange({ ...config, segments: updatedSegs });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RolePlayEdit({ config, onChange }: { config: RolePlayConfig; onChange: (c: RolePlayConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Objective</label>
        <textarea
          className={inputCls}
          rows={2}
          value={config.objective}
          onChange={(e) => onChange({ ...config, objective: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>AI Instructions</label>
        <textarea
          className={inputCls}
          rows={3}
          value={config.instructions}
          onChange={(e) => onChange({ ...config, instructions: e.target.value })}
        />
      </div>
      {config.customerPersona && (
        <div>
          <label className={labelCls}>Customer Persona</label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="Name"
                value={config.customerPersona.name}
                onChange={(e) => onChange({ ...config, customerPersona: { ...config.customerPersona, name: e.target.value } })}
              />
              <input
                className={inputCls}
                placeholder="Role"
                value={config.customerPersona.role}
                onChange={(e) => onChange({ ...config, customerPersona: { ...config.customerPersona, role: e.target.value } })}
              />
            </div>
            <input
              className={inputCls}
              placeholder="Demeanor"
              value={config.customerPersona.demeanor}
              onChange={(e) => onChange({ ...config, customerPersona: { ...config.customerPersona, demeanor: e.target.value } })}
            />
            <textarea
              className={inputCls}
              rows={2}
              placeholder="Backstory"
              value={config.customerPersona.backstory}
              onChange={(e) => onChange({ ...config, customerPersona: { ...config.customerPersona, backstory: e.target.value } })}
            />
          </div>
        </div>
      )}
      {config.sections?.length > 0 && (
        <div>
          <label className={labelCls}>Scorecard</label>
          <div className="space-y-3">
            {config.sections.map((section, si) => (
              <div key={si}>
                <p className="text-sm font-medium text-gray-700 mb-2">{section.title}</p>
                <div className="space-y-2">
                  {section.criteria.map((c, ci) => (
                    <div key={ci} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <input
                          className={inputCls}
                          placeholder="Criterion title"
                          value={c.title}
                          onChange={(e) => {
                            const updatedSections = config.sections.map((s, sIdx) => {
                              if (sIdx !== si) return s;
                              const updatedCriteria = s.criteria.map((cr, crIdx) =>
                                crIdx === ci ? { ...cr, title: e.target.value } : cr
                              );
                              return { ...s, criteria: updatedCriteria };
                            });
                            onChange({ ...config, sections: updatedSections });
                          }}
                        />
                        <input
                          className={inputCls}
                          placeholder="Evaluator prompt"
                          value={c.prompt}
                          onChange={(e) => {
                            const updatedSections = config.sections.map((s, sIdx) => {
                              if (sIdx !== si) return s;
                              const updatedCriteria = s.criteria.map((cr, crIdx) =>
                                crIdx === ci ? { ...cr, prompt: e.target.value } : cr
                              );
                              return { ...s, criteria: updatedCriteria };
                            });
                            onChange({ ...config, sections: updatedSections });
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 pt-2 shrink-0">{c.criterionType}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className={labelCls}>Passing Score (%)</label>
          <input
            className={inputCls}
            type="number"
            min={0}
            max={100}
            value={config.passingScore}
            onChange={(e) => onChange({ ...config, passingScore: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

function RapidFireEdit({ config, onChange }: { config: RapidFireConfig; onChange: (c: RapidFireConfig) => void }) {
  return (
    <div className="space-y-3">
      {config.objections.map((obj, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              className={inputCls}
              placeholder="Trigger"
              value={obj.trigger}
              onChange={(e) => {
                const updated = [...config.objections];
                updated[i] = { ...updated[i], trigger: e.target.value };
                onChange({ ...config, objections: updated });
              }}
            />
            <select
              className={`${inputCls} w-32 shrink-0`}
              value={obj.intent}
              onChange={(e) => {
                const updated = [...config.objections];
                updated[i] = { ...updated[i], intent: e.target.value as "Agree" | "Respond" | "Redirect" };
                onChange({ ...config, objections: updated });
              }}
            >
              <option>Agree</option>
              <option>Respond</option>
              <option>Redirect</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Response options (one per line)</label>
            <textarea
              className={inputCls}
              rows={obj.responseOptions.length + 1}
              value={obj.responseOptions.join("\n")}
              onChange={(e) => {
                const updated = [...config.objections];
                updated[i] = { ...updated[i], responseOptions: e.target.value.split("\n") };
                onChange({ ...config, objections: updated });
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MirroringEdit({ config, onChange }: { config: MirroringConfig; onChange: (c: MirroringConfig) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Video Reference</label>
        <input
          className={inputCls}
          value={config.videoReference}
          onChange={(e) => onChange({ ...config, videoReference: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Focus Points (one per line)</label>
        <textarea
          className={inputCls}
          rows={config.focusPoints.length + 1}
          value={config.focusPoints.join("\n")}
          onChange={(e) => onChange({ ...config, focusPoints: e.target.value.split("\n") })}
        />
      </div>
    </div>
  );
}

// ─── Config dispatcher ────────────────────────────────────────────────────────

function ActivityConfigView({ item }: { item: LearningFlowItem }) {
  switch (item.activityType) {
    case "Lesson": return <LessonDetail config={item.config as LessonConfig} />;
    case "Memorization": return <MemorizationDetail config={item.config as MemorizationConfig} />;
    case "RolePlay": return <RolePlayDetail config={item.config as RolePlayConfig} />;
    case "RapidFire": return <RapidFireDetail config={item.config as RapidFireConfig} />;
    case "Mirroring": return <MirroringDetail config={item.config as MirroringConfig} />;
  }
}

function ActivityConfigEdit({ item, onChange }: { item: LearningFlowItem; onChange: (c: LearningFlowItem["config"]) => void }) {
  switch (item.activityType) {
    case "Lesson": return <LessonEdit config={item.config as LessonConfig} onChange={onChange} />;
    case "Memorization": return <MemorizationEdit config={item.config as MemorizationConfig} onChange={onChange} />;
    case "RolePlay": return <RolePlayEdit config={item.config as RolePlayConfig} onChange={onChange} />;
    case "RapidFire": return <RapidFireEdit config={item.config as RapidFireConfig} onChange={onChange} />;
    case "Mirroring": return <MirroringEdit config={item.config as MirroringConfig} onChange={onChange} />;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobData | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<LearningFlowItem | null>(null);
  const [displayPercent, setDisplayPercent] = useState(0);
  const displayPercentRef = useRef(0);

  // Smoothly animate displayPercent toward the real server percent.
  // Moves quickly when far behind, slows as it approaches the target —
  // never overshoots. Gives a continuous feel between poll ticks.
  useEffect(() => {
    const target = job?.progress?.percent ?? 0;
    const interval = setInterval(() => {
      const current = displayPercentRef.current;
      if (current >= target) return;
      const gap = target - current;
      const step = Math.max(0.3, gap * 0.06);
      const next = Math.min(target, current + step);
      displayPercentRef.current = next;
      setDisplayPercent(next);
    }, 50);
    return () => clearInterval(interval);
  }, [job?.progress?.percent]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (!cancelled) setJob(data);
      if (!cancelled && PROCESSING_STATUSES.has(data.status)) {
        setTimeout(poll, 2000);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [id]);

  // Exit edit mode when switching activities
  useEffect(() => {
    setEditing(false);
    setEditDraft(null);
  }, [selected]);

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Pipeline error</p>
          <h1 className="text-2xl font-bold tracking-tight text-black">{job.clientName}</h1>
          <p className="text-sm text-red-500">{job.error}</p>
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
            className="w-full rounded-xl bg-[#1787ff] hover:bg-[#1270e0] px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            Retry pipeline
          </button>
          <Link href="/dashboard" className="block text-sm text-gray-400 hover:text-black transition-colors">← Back to jobs</Link>
        </div>
      </div>
    );
  }

  if (!job.result) {
    const stepLabel = job.progress?.step ?? STEP_LABELS[job.status] ?? job.status;
    const steps = ["denoising", "understanding", "planning", "generating"];

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (displayPercent / 100) * circumference;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Processing</p>
            <h1 className="text-2xl font-bold tracking-tight text-black">{job.clientName}</h1>
          </div>

          {/* Circular progress ring */}
          <div className="flex justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
              {/* Track */}
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="10"
              />
              {/* Progress arc */}
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                stroke="#1787ff"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 70 70)"
                style={{ transition: "none" }}
              />
              {/* Percent label */}
              <text x="70" y="66" textAnchor="middle" className="fill-black" style={{ fontSize: 22, fontWeight: 700, fontFamily: "inherit" }}>
                {Math.round(displayPercent)}%
              </text>
              {/* Step label */}
              <text x="70" y="84" textAnchor="middle" style={{ fontSize: 10, fill: "#9ca3af", fontFamily: "inherit" }}>
                {stepLabel.length > 22 ? stepLabel.slice(0, 22) + "…" : stepLabel}
              </text>
            </svg>
          </div>

          {/* Step indicators */}
          <div className="space-y-2">
            {steps.map((s) => {
              const stepIdx = steps.indexOf(s);
              const currentIdx = steps.indexOf(job.status);
              const isDone = stepIdx < currentIdx;
              const isActive = s === job.status;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    isDone ? "bg-green-400" : isActive ? "bg-[#1787ff]" : "bg-gray-200"
                  }`} />
                  <span className={`text-sm transition-colors ${
                    isDone ? "text-gray-300 line-through" : isActive ? "text-black font-medium" : "text-gray-300"
                  }`}>{STEP_LABELS[s]}</span>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-400 min-h-[1rem]">{stepLabel}</p>

          <Link href="/dashboard" className="block text-center text-sm text-gray-400 hover:text-black transition-colors">← Back to jobs</Link>
        </div>
      </div>
    );
  }

  const flow = job.result.learningFlow;
  const activity = flow[selected];
  const displayItem = editing && editDraft ? editDraft : activity;

  async function regenerateActivity(index: number) {
    if (!job?.result) return;
    setRegenerating(true);
    const res = await fetch(`/api/jobs/${id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityIndex: index }),
    });
    const data = await res.json();
    if (data.activity) {
      const updated = { ...job.result };
      updated.learningFlow = [...updated.learningFlow];
      updated.learningFlow[index] = data.activity;
      setJob({ ...job, result: updated });
    }
    setRegenerating(false);
  }

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

  async function saveEdit() {
    if (!job?.result || !editDraft) return;
    setSaving(true);
    const updated = { ...job.result };
    updated.learningFlow = [...updated.learningFlow];
    updated.learningFlow[selected] = editDraft;
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: updated }),
    });
    setJob({ ...job, result: updated });
    setEditing(false);
    setEditDraft(null);
    setSaving(false);
  }

  function startEdit() {
    setEditDraft(JSON.parse(JSON.stringify(activity)));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditDraft(null);
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-black transition-colors">← Jobs</Link>
          <div>
            <h1 className="text-sm font-semibold text-black">{job.clientName}</h1>
            <p className="text-xs text-gray-400">
              {flow.length} activities · {approvedCount} approved · confidence {Math.round(confidence * 100)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={approveAll}
            disabled={saving}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-40 transition-colors"
          >
            Approve all
          </button>
          <button
            onClick={exportJson}
            disabled={approvedCount === 0}
            className="rounded-xl bg-[#1787ff] hover:bg-[#1270e0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-30 transition-colors"
          >
            Export JSON ({approvedCount})
          </button>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex-1 flex gap-0">
        {/* Left: activity list */}
        <div className="w-64 shrink-0 border-r border-gray-100 p-4 space-y-1.5 overflow-y-auto">
          {flow.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                selected === i
                  ? "border-[#1787ff] bg-white"
                  : "border-gray-100 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTIVITY_COLORS[item.activityType]}`}>
                  {item.activityType}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_COLORS[item.approvalStatus]}`}>
                  {item.approvalStatus}
                </span>
              </div>
              <p className="text-xs text-black font-medium leading-snug">{item.title}</p>
            </button>
          ))}
        </div>

        {/* Right: activity detail */}
        <div className="flex-1 min-w-0 p-8 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            {/* Activity header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ACTIVITY_COLORS[activity.activityType]}`}>
                    {activity.activityType}
                  </span>
                  <span className="text-xs text-gray-400">#{activity.sequencePosition}</span>
                </div>
                {editing && editDraft ? (
                  <input
                    className="text-xl font-bold tracking-tight text-black w-full border-b border-gray-200 pb-1 focus:border-[#1787ff] focus:outline-none bg-transparent"
                    value={editDraft.title}
                    onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                  />
                ) : (
                  <h2 className="text-xl font-bold tracking-tight text-black">{activity.title}</h2>
                )}
                <p className="text-xs text-gray-400">Source: {activity.sourceSection}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editing ? (
                  <>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="rounded-xl bg-[#1787ff] hover:bg-[#1270e0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 transition-colors"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startEdit}
                      disabled={saving || regenerating}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => regenerateActivity(selected)}
                      disabled={saving || regenerating}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
                    >
                      {regenerating ? "Regenerating…" : "Regenerate"}
                    </button>
                    <button
                      onClick={() => setApprovalStatus(selected, "flagged")}
                      disabled={saving}
                      className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                        activity.approvalStatus === "flagged"
                          ? "border-red-300 bg-red-50 text-red-500"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      Flag
                    </button>
                    <button
                      onClick={() => setApprovalStatus(selected, "approved")}
                      disabled={saving}
                      className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                        activity.approvalStatus === "approved"
                          ? "border-[#1787ff] bg-[#e8f3ff] text-[#1787ff]"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Activity config — view or edit */}
            {editing && editDraft ? (
              <ActivityConfigEdit
                item={editDraft}
                onChange={(config) => setEditDraft({ ...editDraft, config })}
              />
            ) : (
              <ActivityConfigView item={displayItem} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
