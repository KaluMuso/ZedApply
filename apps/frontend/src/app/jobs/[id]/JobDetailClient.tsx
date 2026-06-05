"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { savedJobs, matches, profile as profileApi, type Job, type MatchData } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { JobDetailBody } from "@/components/JobDetailBody";
import { computeJobVisibilityStatus } from "@/lib/jobVisibility";
import { MATCHES_FETCH_LIMIT } from "@/lib/matchConstants";
import { clearMatchHandoff, readMatchHandoff } from "@/lib/matchHandoff";

/**
 * Thin client wrapper around JobDetailBody so the parent page can stay
 * server-rendered (for proper generateMetadata + og:image / Twitter
 * preview support). Loads saved state and personalised match breakdown.
 */
export function JobDetailClient({ job }: { job: Job }) {
  const router = useRouter();
  const { token } = useAuth();
  const [jobSaved, setJobSaved] = useState(false);
  const [match, setMatch] = useState<MatchData | null>(() => readMatchHandoff(job.id));
  const [matchLoading, setMatchLoading] = useState(() => Boolean(token) && !readMatchHandoff(job.id));
  const [similarMatches, setSimilarMatches] = useState<MatchData[]>([]);
  const [viewerName, setViewerName] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setJobSaved(false);
      return;
    }
    let cancelled = false;
    savedJobs
      .list(token)
      .then((res) => {
        if (!cancelled) setJobSaved(res.jobs.some((j) => j.id === job.id));
      })
      .catch(() => {
        if (!cancelled) setJobSaved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, job.id]);

  useEffect(() => {
    if (!token) {
      setMatch(null);
      setMatchLoading(false);
      setSimilarMatches([]);
      setViewerName(null);
      setSubscriptionTier(null);
      clearMatchHandoff();
      return;
    }

    const handoff = readMatchHandoff(job.id);
    if (handoff) {
      setMatch(handoff);
      setMatchLoading(false);
    } else {
      setMatchLoading(true);
    }

    let cancelled = false;
    Promise.all([
      matches.get(token, { limit: MATCHES_FETCH_LIMIT }),
      profileApi.get(token).catch(() => null),
    ])
      .then(([res, profile]) => {
        if (cancelled) return;
        const forJob = res.matches.find((m) => m.job.id === job.id) ?? handoff ?? null;
        setMatch(forJob);
        setSimilarMatches(
          [...res.matches]
            .filter((m) => m.job.id !== job.id)
            .filter((m) => computeJobVisibilityStatus(m.job) === "open")
            .sort((a, b) => b.score - a.score)
            .slice(0, 3),
        );
        if (profile) {
          setViewerName(profile.full_name ?? null);
          setSubscriptionTier(profile.subscription_tier);
        }
        clearMatchHandoff();
      })
      .catch(() => {
        if (!cancelled && !handoff) {
          setMatch(null);
          setSimilarMatches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMatchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, job.id]);

  return (
    <JobDetailBody
      job={job}
      showBack
      backLabel="All jobs"
      onBack={() => router.push("/jobs")}
      authToken={token}
      jobSaved={jobSaved}
      onSavedChange={setJobSaved}
      match={match}
      matchLoading={matchLoading}
      similarMatches={similarMatches}
      viewerName={viewerName}
      subscriptionTier={subscriptionTier}
    />
  );
}
