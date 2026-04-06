"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-zinc-100 text-zinc-600",
  denoising: "bg-blue-50 text-blue-600",
  understanding: "bg-blue-50 text-blue-600",
  planning: "bg-blue-50 text-blue-600",
  generating: "bg-blue-50 text-blue-600",
  review: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-600",
};

interface JobRow {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then(setJobs);
  }, []);

  async function deleteJob(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">Jobs</h1>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            ← New client
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No jobs yet. Create a client and send them an intake link.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((row) => (
              <li key={row.id} className="flex items-center gap-2">
                <Link
                  href={`/dashboard/${row.id}`}
                  className="flex flex-1 items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900">
                      {row.client_name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(row.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[row.status] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {row.status}
                  </span>
                </Link>
                <button
                  onClick={() => deleteJob(row.id)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-zinc-400 hover:border-red-200 hover:text-red-500 transition-colors"
                  title="Delete job"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
