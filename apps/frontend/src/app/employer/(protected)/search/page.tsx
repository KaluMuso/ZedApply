"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { employer, type CandidatePreview } from "@/lib/api";

export default function EmployerSearchPage() {
  const { token } = useAuth();
  const [skills, setSkills] = useState("accountant");
  const [location, setLocation] = useState("Lusaka");
  const [results, setResults] = useState<CandidatePreview[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await employer.search(token, { skills, location, limit: 20 });
      setResults(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={runSearch} className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Skills
          <input
            className="block mt-1 rounded-md border px-3 py-2 text-sm w-48"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Location
          <input
            className="block mt-1 rounded-md border px-3 py-2 text-sm w-40"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-sm text-muted-foreground">{total} candidates (anonymized)</p>
      <ul className="space-y-3">
        {results.map((c) => (
          <li key={c.candidate_id} className="rounded-lg border p-4">
            <p className="font-medium">{c.headline ?? "Candidate"}</p>
            <p className="text-sm text-muted-foreground">
              {c.location ?? "—"} · {c.years_experience ?? "?"} yrs
            </p>
            {c.skills.length > 0 ? (
              <p className="text-xs mt-2 text-muted-foreground">{c.skills.slice(0, 6).join(" · ")}</p>
            ) : null}
            <Link
              href={`/employer/candidates/${c.candidate_id}`}
              className="inline-block mt-3 text-sm text-primary font-medium"
            >
              View profile →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
