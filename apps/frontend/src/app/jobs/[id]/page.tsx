import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Job } from "@/lib/api";
import { JobDetailClient } from "./JobDetailClient";
import { Icon } from "@/components/ui/Icon";

/**
 * Public job-detail permalink. Server-rendered so WhatsApp / Twitter /
 * LinkedIn previews work properly when someone shares a /jobs/:id URL.
 *
 * generateMetadata fetches the job once at request time (with 60s ISR
 * revalidation) and emits og:title / og:description / og:image so
 * shares have a real card instead of "ZedApply — AI Job Matching for
 * Zambia" everywhere. The visible page reuses that same fetched data
 * via JobDetailClient.
 *
 * Anonymous-friendly: matches the public `/jobs` policy. The previous
 * `(app)/jobs/[id]` route is gone (deleted in commit 21c5d35).
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface PageParams {
  params: { id: string };
}

/**
 * Fetch the job from the backend. ISR (revalidate: 60) keeps the page
 * fast on repeat views while still picking up edits within a minute.
 * Returns null instead of throwing so the caller can choose between
 * 404 and a soft "not found" view.
 */
async function fetchJob(id: string): Promise<Job | null> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Job;
  } catch {
    return null;
  }
}

/** Strip HTML, collapse whitespace, truncate to N chars with ellipsis. */
function cleanForMeta(s: string | null | undefined, max = 160): string {
  if (!s) return "";
  const t = s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const job = await fetchJob(params.id);
  if (!job) {
    return {
      title: "Job not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${job.title}${job.company ? ` at ${job.company}` : ""}`;
  const description =
    cleanForMeta(job.description, 200) ||
    `Open role in ${job.location || "Zambia"}. Apply via ZedApply.`;
  const url = `https://www.zedapply.com/jobs/${job.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "ZedApply",
      // Fallback to the site-wide image until per-job image generation
      // is wired. Better than no image at all in WhatsApp previews.
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function JobDetailPage({ params }: PageParams) {
  const job = await fetchJob(params.id);

  if (!job) {
    // Use a soft empty-state rather than Next's notFound() because the
    // ID could plausibly be a typo and we want to offer "browse all"
    // rather than the default 404 page. Reserved notFound() for cases
    // where we never want the URL indexed.
    return (
      <div className="max-w-[820px] mx-auto px-6 py-20 text-center">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ border: "2px dashed var(--line-2)", color: "var(--muted)" }}
        >
          <Icon name="search" size={24} />
        </div>
        <h1
          className="font-display text-3xl mb-2"
          style={{ letterSpacing: "-0.01em" }}
        >
          Job not found
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          This listing may have been removed, closed, or never existed.
        </p>
        <Link href="/jobs" className="btn btn-primary btn-sm">
          <Icon name="arrowLeft" size={14} /> Browse open roles
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-[820px] mx-auto px-2 sm:px-6 py-6 md:py-10">
      <JobDetailClient job={job} />
    </article>
  );
}

