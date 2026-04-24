"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { clearAccessToken, getStoredAccessToken, jobs as jobsApi, type Job, type JobList } from "@/lib/api";

const LOCATIONS = [
  "All locations",
  "Lusaka",
  "Kitwe",
  "Ndola",
  "Livingstone",
  "Kabwe",
  "Chingola",
  "Mufulira",
];

function QualityBadge({ score }: { score: number }) {
  const tone =
    score >= 75 ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20" : "bg-zinc-50 text-zinc-800 ring-zinc-600/10";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      Quality {score}
    </span>
  );
}

function looksLikeAuthFailure(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("not authenticated") ||
    m.includes("credentials") ||
    m.includes("could not validate") ||
    m.includes("invalid token")
  );
}

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All locations");
  const [expanded, setExpanded] = useState<Record<string, Job>>({});
  const [listState, setListState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: JobList }
  >({ status: "idle" });

  const perPage = 20;

  const queryKey = useMemo(
    () => `${page}|${search.trim()}|${location}`,
    [page, search, location],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getStoredAccessToken()) {
        setListState({
          status: "error",
          message: "You are not signed in. Job listings require a JWT from WhatsApp OTP sign-in.",
        });
        return;
      }
      setListState({ status: "loading" });
      try {
        const data = await jobsApi.list({
          page,
          per_page: perPage,
          search: search.trim() ? search.trim() : undefined,
          location: location === "All locations" ? undefined : location,
        });
        if (cancelled) return;
        setListState({ status: "ready", data });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load jobs";
        if (cancelled) return;
        setListState({ status: "error", message });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, perPage, queryKey, search, location]);

  async function toggleExpand(job: Job) {
    if (!getStoredAccessToken()) {
      setListState({
        status: "error",
        message: "You are not signed in. Sign in to load full job details.",
      });
      return;
    }
    if (expanded[job.id]) {
      setExpanded((m) => {
        const next = { ...m };
        delete next[job.id];
        return next;
      });
      return;
    }

    try {
      const full = await jobsApi.get(job.id);
      setExpanded((m) => ({ ...m, [job.id]: full }));
    } catch {
      // If detail fetch fails, fall back to list payload
      setExpanded((m) => ({ ...m, [job.id]: job }));
    }
  }

  const totalPages =
    listState.status === "ready" ? Math.max(1, Math.ceil(listState.data.total / perPage)) : 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Browse active listings. Click a card to expand details.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900">
            Home
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
          <Link
            href="/profile"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Profile
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          <div className="mb-1 text-zinc-600 dark:text-zinc-400">Search</div>
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Title, company, description…"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="text-sm">
          <div className="mb-1 text-zinc-600 dark:text-zinc-400">Location</div>
          <select
            value={location}
            onChange={(e) => {
              setPage(1);
              setLocation(e.target.value);
            }}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </section>

      {listState.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          <p>{listState.message}</p>
          {!getStoredAccessToken() || looksLikeAuthFailure(listState.message) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/login"
                className="inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAccessToken();
                  window.location.reload();
                }}
                className="inline-flex rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-50 dark:hover:bg-red-950/50"
              >
                Clear saved token
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {listState.status === "loading" || (listState.status === "idle" && !!getStoredAccessToken()) ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          Loading jobs…
        </div>
      ) : null}

      {listState.status === "ready" ? (
        <section className="flex flex-col gap-3">
          {listState.data.jobs.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              No jobs found for these filters.
            </div>
          ) : (
            listState.data.jobs.map((job) => {
              const detail = expanded[job.id];
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => void toggleExpand(job)}
                  className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{job.title}</div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {job.company ?? "Unknown company"}
                        {job.location ? ` · ${job.location}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <QualityBadge score={job.quality_score} />
                      {job.closing_date ? (
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Closes {job.closing_date}</span>
                      ) : (
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">No closing date</span>
                      )}
                    </div>
                  </div>

                  {detail ? (
                    <div className="mt-4 border-t border-zinc-200 pt-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                      <div className="whitespace-pre-wrap">{detail.description}</div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {detail.apply_url ? (
                          <a
                            href={detail.apply_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Apply (link)
                          </a>
                        ) : null}
                        {detail.apply_email ? (
                          <a
                            href={`mailto:${detail.apply_email}`}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Apply (email)
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Click to expand</div>
                  )}
                </button>
              );
            })
          )}

          <div className="flex items-center justify-between pt-2 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              Page {listState.data.page} of {totalPages} · {listState.data.total} total
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
