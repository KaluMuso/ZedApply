"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { savedJobs, type Job } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { JobDetailBody } from "@/components/JobDetailBody";

/**
 * Thin client wrapper around JobDetailBody so the parent page can stay
 * server-rendered (for proper generateMetadata + og:image / Twitter
 * preview support). Only handles the one piece of state that requires
 * a router: the "All jobs" back link.
 */
export function JobDetailClient({ job }: { job: Job }) {
  const router = useRouter();
  const { token } = useAuth();
  const [jobSaved, setJobSaved] = useState(false);

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

  return (
    <JobDetailBody
      job={job}
      showBack
      backLabel="All jobs"
      onBack={() => router.push("/jobs")}
      authToken={token}
      jobSaved={jobSaved}
      onSavedChange={setJobSaved}
    />
  );
}
