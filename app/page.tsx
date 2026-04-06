"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-black">Replay Parser</span>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black transition-colors">
          Dashboard →
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-black">New client</h1>
            <p className="text-sm text-gray-500">
              Generate an intake link to send to your client.
            </p>
          </div>

          {!intakeUrl ? (
            <form onSubmit={createClient} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Client name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. United Auto Hail"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-black focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !clientName.trim()}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-30 hover:bg-gray-900 transition-colors"
              >
                {loading ? "Generating…" : "Generate link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Intake link</p>
                <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">
                  {intakeUrl}
                </p>
              </div>
              <button
                onClick={copyLink}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button
                onClick={() => { setIntakeUrl(""); setClientName(""); }}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-black transition-colors"
              >
                Create another
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
