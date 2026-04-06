"use client";

import { useState, useCallback, useRef } from "react";
import { TrainingTopic } from "@/types";

const TOPICS: TrainingTopic[] = [
  "Objection Handling",
  "Intro Scripts",
  "Closing Scripts",
  "Product Knowledge",
  "Process Steps",
  "Value Props",
];

const MAX_FILES = 3;

export default function IntakeForm({
  token,
  clientName,
}: {
  token: string;
  clientName: string;
}) {
  const [selectedTopics, setSelectedTopics] = useState<TrainingTopic[]>([]);
  const [documentationNotes, setDocumentationNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleTopic(topic: TrainingTopic) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs].slice(0, MAX_FILES));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (selectedTopics.length === 0) {
      setError("Please select at least one training topic.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one PDF.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      selectedTopics.forEach((t) => formData.append("topics", t));
      formData.append("documentationNotes", documentationNotes);
      files.forEach((f) => formData.append("files", f));

      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-[#1a5eba] flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Materials received</h1>
          <p className="text-sm text-gray-500">
            Thanks — your training documents and preferences have been submitted.
            Your Replay representative will follow up soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-4">
        <span className="text-sm font-semibold tracking-tight text-black">Replay</span>
      </header>

      <main className="py-12 px-4">
        <div className="mx-auto max-w-xl space-y-10">
          {/* Title */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Training intake
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-black">{clientName}</h1>
            <p className="text-sm text-gray-500">
              Tell us what you want to train on and upload your documents. Takes about 2 minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Topics */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-black">
                What do you want to train your team on?
                <span className="text-gray-400 font-normal ml-1.5">Select all that apply</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => {
                  const active = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                        active
                          ? "bg-[#1a5eba] text-white border-[#1a5eba]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-black">
                What documentation do you have?
                <span className="text-gray-400 font-normal ml-1.5">Optional</span>
              </label>
              <textarea
                value={documentationNotes}
                onChange={(e) => setDocumentationNotes(e.target.value)}
                placeholder="e.g. We have a 30-page sales playbook and a one-pager on our value props"
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-black focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-black">
                Upload your training documents
                <span className="text-gray-400 font-normal ml-1.5">PDF only · up to 3 files</span>
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragging
                    ? "border-black bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <p className="text-sm text-gray-500">
                  Drag and drop PDFs here, or{" "}
                  <span className="text-black font-semibold">browse</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((file, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                    >
                      <span className="text-black font-medium truncate max-w-xs">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="ml-3 text-gray-400 hover:text-black transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#1a5eba] hover:bg-[#1649a0] px-4 py-3 text-sm font-semibold text-white disabled:opacity-30 transition-colors"
            >
              {submitting ? "Uploading…" : "Submit materials"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your documents will be processed by Replay&apos;s AI pipeline and reviewed
              by your representative before any training is built.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
