"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { matches as matchesApi, type MatchData } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MatchScore } from "@/components/MatchScore";
import { SkillBadge } from "@/components/SkillBadge";

export default function MatchesPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<{ matches: MatchData[]; remaining_quota: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !token) {
      router.push("/auth");
      return;
    }
    matchesApi
      .get(token)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, authLoading, router]);

  if (loading || authLoading) {
    return <p className="text-center py-20 text-gray-500">Loading matches...</p>;
  }
  if (!data) {
    return <p className="text-center py-20 text-gray-500">Could not load matches.</p>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Your Job Matches</h1>
        <span className="text-sm text-gray-500">
          {data.remaining_quota} matches remaining this month
        </span>
      </div>

      {data.matches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-600 mb-4">No matches yet. Upload your CV to get started!</p>
          <a
            href="/profile"
            className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-brand-700 touch-target"
          >
            Upload CV
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {data.matches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-xl border p-4 sm:p-6 hover:shadow-md transition"
            >
              <div className="flex gap-4 items-start">
                <MatchScore
                  score={match.score}
                  breakdown={{
                    vector: match.vector_score,
                    skill: match.skill_score,
                    bonus: match.bonus_score,
                  }}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-base sm:text-lg">
                    {match.job.title}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {match.job.company || "Company not specified"} &middot;{" "}
                    {match.job.location || "Location not specified"}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {match.matched_skills.map((s) => (
                  <SkillBadge key={s} skill={s} matched />
                ))}
                {match.missing_skills.slice(0, 4).map((s) => (
                  <SkillBadge key={s} skill={s} matched={false} />
                ))}
              </div>

              {/* Expand for explanation */}
              {match.explanation && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      setExpanded(expanded === match.id ? null : match.id)
                    }
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium touch-target"
                    type="button"
                  >
                    {expanded === match.id ? "Hide explanation" : "Why this match?"}
                  </button>
                  {expanded === match.id && (
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {match.explanation}
                    </p>
                  )}
                </div>
              )}

              {match.job.closing_date && (
                <p className="mt-2 text-xs text-gray-400">
                  Closes: {new Date(match.job.closing_date).toLocaleDateString("en-ZM")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
