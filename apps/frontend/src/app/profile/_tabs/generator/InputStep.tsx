"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type InputStepValues = {
  jobTitle: string;
  company: string;
  jobDescription: string;
};

export function InputStep({
  initial,
  tierAllowed,
  loading,
  error,
  onSubmit,
}: {
  initial?: InputStepValues;
  tierAllowed: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: (values: InputStepValues) => void;
}) {
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [jobDescription, setJobDescription] = useState(initial?.jobDescription ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      setLocalError("Job title is required.");
      return;
    }
    setLocalError(null);
    onSubmit({
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      jobDescription: jobDescription.trim(),
    });
  };

  const inputStyle = {
    border: "1px solid var(--line-2)",
    background: "var(--surface)",
    color: "var(--ink)",
  };

  return (
    <div className="card p-6">
      <div className="eyebrow mb-1">Tailored CV generator</div>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        Rewrite your CV for a specific role.{" "}
        {tierAllowed
          ? "We'll draft a one-page version using your uploaded CV as the source."
          : "Requires the Starter or Professional plan."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--ink-2)" }}>
              Job title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Accountant"
              className="w-full h-10 px-3 rounded-md text-sm"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--ink-2)" }}>
              Company
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. ZANACO, MTN, Airtel"
              className="w-full h-10 px-3 rounded-md text-sm"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--ink-2)" }}>
            Job description (optional)
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the JD if you have it — improves tailoring."
            rows={5}
            className="w-full p-3 rounded-md text-sm"
            style={inputStyle}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Takes 10-30s. You can preview, edit, and download afterwards.
          </p>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                Generate <Icon name="arrowRight" size={14} />
              </>
            )}
          </button>
        </div>
        {(error || localError) && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error || localError}
          </p>
        )}
      </form>
    </div>
  );
}
