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
    setFiles((prev) => {
      const combined = [...prev, ...pdfs];
      return combined.slice(0, MAX_FILES);
    });
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-4xl">✓</div>
          <h1 className="text-xl font-semibold text-zinc-900">Materials received</h1>
          <p className="text-sm text-zinc-500">
            Thanks — your training documents and preferences have been submitted.
            Your Replay representative will follow up soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="mx-auto max-w-xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Replay Onboarding
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{clientName}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Tell us what you want to train on and upload your training documents.
            This takes about 2 minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Training topics */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700">
              What do you want to train your team on?
              <span className="text-zinc-400 font-normal ml-1">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => {
                const active = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                      active
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documentation notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              What documentation do you have?
              <span className="text-zinc-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={documentationNotes}
              onChange={(e) => setDocumentationNotes(e.target.value)}
              placeholder="e.g. We have a 30-page sales playbook and a one-pager on our value props"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none resize-none"
            />
          </div>

          {/* PDF upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700">
              Upload your training documents
              <span className="text-zinc-400 font-normal ml-1">(PDF only, up to 3 files)</span>
            </label>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragging
                  ? "border-zinc-500 bg-zinc-100"
                  : "border-zinc-300 bg-white hover:border-zinc-400"
              }`}
            >
              <p className="text-sm text-zinc-500">
                Drag and drop PDFs here, or{" "}
                <span className="text-zinc-900 font-medium underline">browse</span>
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

            {/* File list */}
            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-700 truncate max-w-xs">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-3 text-zinc-400 hover:text-zinc-700 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-700 transition-colors"
          >
            {submitting ? "Uploading…" : "Submit materials"}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            Your documents will be processed by Replay&apos;s AI pipeline and reviewed
            by your representative before any training is built.
          </p>
        </form>
      </div>
    </div>
  );
}
