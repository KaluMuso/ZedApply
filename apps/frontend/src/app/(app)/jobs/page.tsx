"use client";

import { useCallback, useEffect, useState } from "react";
import { jobs as jobsApi, type Job, coverLetter } from "@/lib/api";
import { JobCard } from "@/components/features/JobCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { JobListSkeleton } from "@/components/shared/JobListSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FEATURE_JOBS, ZAMBIAN_CITIES } from "@/lib/constants";
import { LayoutGrid, List, MapPin, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const LOC_ENTRIES = [
  { key: "all", value: "All locations" as string },
  ...ZAMBIAN_CITIES.map((c) => ({ key: c, value: c })),
];

function isClosingSoon(d: string | null) {
  if (!d) {
    return false;
  }
  const t = new Date(d).getTime() - Date.now();
  return t > 0 && t < 7 * 24 * 60 * 60 * 1000;
}

export default function JobsPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<string>("all");
  const locParam = location === "all" ? "" : location;
  const [typeFilter, setTypeFilter] = useState("All types");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [detail, setDetail] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsApi.list({
        page,
        search: search || undefined,
        location: locParam || undefined,
      });
      setJobsList(res.jobs);
      setTotalPages(res.pages);
    } catch {
      setJobsList([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, locParam]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const openDetail = (id: string) => {
    setDetail(null);
    setDetailLoading(true);
    jobsApi
      .get(id)
      .then((j) => {
        setDetail(j);
      })
      .catch(() => {
        toast.error("Job could not be opened.");
      })
      .finally(() => setDetailLoading(false));
  };

  const searchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const displayJobs =
    typeFilter === "All types"
      ? jobsList
      : jobsList.filter((j) => j.title.toLowerCase().includes(typeFilter.toLowerCase().split("-")[0]!));

  const onCover = async (jobId: string) => {
    if (!token) {
      router.push("/auth");
      return;
    }
    setCoverLoading(true);
    try {
      const r = await coverLetter.generate(token, jobId, "formal");
      const blob = new Blob([r.letter], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cover-letter.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Download started. Paste into your email or form.");
    } catch (e) {
      const { message } = getErrorMessage(
        e,
        "We could not generate a letter. Bwino tier (or support) is required in most cases."
      );
      toast.error(message);
    } finally {
      setCoverLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Browse jobs</h1>
        <p className="text-sm text-muted-foreground sm:text-right">Live listings. Tap a card for full details.</p>
      </div>

      <form
        onSubmit={searchSubmit}
        className="mb-4 flex flex-col gap-3 md:flex-row md:items-stretch"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search by title, company, skill…"
            className="h-11 min-h-11 pl-9"
            name="q"
            autoComplete="on"
            enterKeyHint="search"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm text-muted-foreground sm:sr-only" htmlFor="location">
            Place
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <select
              id="location"
              className="h-11 w-full min-h-11 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            >
              {LOC_ENTRIES.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.value}
                </option>
              ))}
            </select>
          </div>
          <select
            className="h-11 w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
            }}
          >
            {FEATURE_JOBS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="min-h-11 w-full sm:w-28">
            Refine
          </Button>
          <div
            className="flex rounded-md border border-border p-0.5"
            role="group"
            aria-label="View"
          >
            <button
              type="button"
              className={cn(
                "min-h-10 w-10 rounded sm:w-9 flex items-center justify-center",
                view === "list" && "bg-muted"
              )}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "min-h-10 w-10 rounded sm:w-9 flex items-center justify-center",
                view === "grid" && "bg-muted"
              )}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <JobListSkeleton n={view === "list" ? 4 : 6} />
      ) : displayJobs.length === 0 ? (
        <EmptyState
          title="No jobs match your search"
          description="Try removing one filter, searching a different skill, or another city. Listings are updated as new opportunities arrive."
        />
      ) : (
        <div
          className={cn("gap-4", view === "grid" ? "grid sm:grid-cols-2" : "grid grid-cols-1 max-w-3xl")}
        >
          {displayJobs.map((job) => (
            <JobCard
              key={job.id}
              title={job.title}
              company={job.company}
              location={job.location}
              qualityScore={job.quality_score}
              skills={job.skills}
              closingDate={job.closing_date}
              onClick={() => openDetail(job.id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, k) => k + 1).map((n) => (
            <Button
              key={n}
              className="min-w-9 min-h-9"
              variant={n === page ? "default" : "outline"}
              onClick={() => {
                setPage(n);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              type="button"
            >
              {n}
            </Button>
          ))}
        </div>
      )}

      <Dialog
        open={detail != null || detailLoading}
        onOpenChange={(o) => {
          if (!o) {
            setDetail(null);
            setDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-4">{detail?.title || "…"}</DialogTitle>
            {detail?.company && (
              <p className="text-sm text-muted-foreground">
                {detail.company}
                {detail.location && ` \u00b7 ${detail.location}`}
              </p>
            )}
            {isClosingSoon(detail?.closing_date ?? null) && (
              <Badge variant="destructive" className="w-fit">
                Closing soon
              </Badge>
            )}
          </DialogHeader>
          {detailLoading && (
            <p className="text-sm text-muted-foreground">Loading full description…</p>
          )}
          {detail && (
            <>
              <p className="text-sm text-muted-foreground">Quality score: {Math.round(detail.quality_score)}</p>
              {detail.closing_date && (
                <p className="text-sm text-muted-foreground">
                  Close date: {new Date(detail.closing_date).toLocaleDateString("en-ZM")}
                </p>
              )}
              <div className="prose dark:prose-invert text-sm text-foreground max-w-none">
                {detail.description ? <p className="whitespace-pre-wrap">{detail.description}</p> : <p>Description not available.</p>}
              </div>
            </>
          )}
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            {isAuthenticated && (
              <Button
                type="button"
                variant="outline"
                className="min-h-10"
                disabled={!detail || !token}
                onClick={() => (detail && token ? onCover(detail.id) : undefined)}
              >
                {coverLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Download cover letter"}
              </Button>
            )}
            {!isAuthenticated && (
              <Button
                className="min-h-10"
                type="button"
                onClick={() => { setDetail(null); router.push("/auth"); }}
              >
                Sign in for cover letter
              </Button>
            )}
            <Button className="min-h-10" type="button" variant="secondary" onClick={() => { setDetail(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
