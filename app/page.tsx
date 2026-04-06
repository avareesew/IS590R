"use client";

import { useState } from "react";

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [intakeUrl, setIntakeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName }),
      });
      const data = await res.json();
      setIntakeUrl(data.intakeUrl);
      setClientName("");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Replay Parser</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create a client to generate an intake link you can send them.
          </p>
        </div>

        {!intakeUrl ? (
          <form onSubmit={createClient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Client name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. United Auto Hail"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !clientName.trim()}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-700 transition-colors"
            >
              {loading ? "Creating…" : "New Client"}
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-700">Intake link ready</p>
            <p className="text-xs text-zinc-500 break-all font-mono bg-zinc-50 rounded p-2">
              {intakeUrl}
            </p>
            <button
              onClick={copyLink}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={() => { setIntakeUrl(""); setClientName(""); }}
              className="w-full rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Create another
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200">
          <a
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            View all jobs →
          </a>
        </div>
      </div>
    </div>
  );
}
