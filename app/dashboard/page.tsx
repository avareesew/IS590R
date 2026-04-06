"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-500",
  denoising: "bg-[#eef3fc] text-[#1a5eba]",
  understanding: "bg-[#eef3fc] text-[#1a5eba]",
  planning: "bg-[#eef3fc] text-[#1a5eba]",
  generating: "bg-[#eef3fc] text-[#1a5eba]",
  review: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-500",
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-black">Replay Parser</span>
        <Link
          href="/"
          className="rounded-xl bg-[#1a5eba] hover:bg-[#1649a0] px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          + New client
        </Link>
      </header>

      <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-black">Jobs</h1>

          {jobs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm text-gray-400">
                No jobs yet. Create a client and send them an intake link.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.map((row) => (
                <li key={row.id} className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/${row.id}`}
                    className="flex flex-1 items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-gray-400 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-black">
                        {row.client_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(row.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {row.status}
                    </span>
                  </Link>
                  <button
                    onClick={() => deleteJob(row.id)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-4 text-gray-300 hover:border-red-200 hover:text-red-400 transition-colors text-sm"
                    title="Delete job"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
