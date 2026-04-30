"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jobs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Awaited<ReturnType<typeof jobs.get>> | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    jobs
      .get(params.id)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <p className="text-sm text-muted-foreground py-8">Loading job…</p>;
  if (!job) return <EmptyState title="Job not found" description="This listing may have been removed." />;

  return (
    <article className="space-y-4">
      <Button type="button" variant="outline" onClick={() => router.push("/jobs")}>
        Back to jobs
      </Button>
      <h1 className="text-2xl font-bold">{job.title}</h1>
      <p className="text-sm text-muted-foreground">
        {job.company || "Company TBC"}
        {job.location ? ` · ${job.location}` : ""}
      </p>
      <div className="rounded-xl border border-border p-4">
        <p className="whitespace-pre-wrap text-sm leading-6">{job.description || "No description available."}</p>
      </div>
    </article>
  );
}
