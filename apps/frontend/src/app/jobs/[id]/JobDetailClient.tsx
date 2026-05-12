"use client";

import { useRouter } from "next/navigation";
import type { Job } from "@/lib/api";
import { JobDetailBody } from "@/components/JobDetailBody";

/**
 * Thin client wrapper around JobDetailBody so the parent page can stay
 * server-rendered (for proper generateMetadata + og:image / Twitter
 * preview support). Only handles the one piece of state that requires
 * a router: the "All jobs" back link.
 */
export function JobDetailClient({ job }: { job: Job }) {
  const router = useRouter();
  return (
    <JobDetailBody
      job={job}
      showBack
      backLabel="All jobs"
      onBack={() => router.push("/jobs")}
    />
  );
}
