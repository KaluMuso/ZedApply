"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { matches as matchesApi, type MatchData, coverLetter } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MatchScore } from "@/components/features/MatchScore";
import { SkillBadge } from "@/components/features/SkillBadge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { X, FileText, Loader2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";

function MatchRows({
  data,
  token,
  onHide,
  onViewJob,
  onCover,
}: {
  data: MatchData[];
  token: string;
  onHide: (id: string) => void;
  onViewJob: (jobId: string) => void;
  onCover: (jobId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {data.map((match) => (
        <div
          key={match.id}
          className="rounded-xl border border-border bg-card p-4 sm:p-6 transition duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex gap-3 sm:gap-4">
            <MatchScore
              score={match.score}
              breakdown={{ vector: match.vector_score, skill: match.skill_score, bonus: match.bonus_score }}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">{match.job.title}</h2>
              <p className="text-sm text-muted-foreground">
                {match.job.company || "Company TBC"} {match.job.location && <span>· {match.job.location}</span>}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="min-h-9 text-xs"
                type="button"
                variant="outline"
                onClick={() => onViewJob(match.job.id)}
              >
                View job
              </Button>
              <Button
                className="min-h-9 text-xs"
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onCover(match.job.id)}
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> Cover
              </Button>
              <Button
                className="min-h-9 min-w-9"
                type="button"
                variant="ghost"
                aria-label="Hide from list (this device only)"
                onClick={() => onHide(match.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.matched_skills.map((s) => (
              <SkillBadge key={s} skill={s} matched />
            ))}
            {match.missing_skills.map((s) => (
              <SkillBadge key={s} skill={s} matched={false} />
            ))}
          </div>
          {match.explanation && (
            <p className="text-sm text-muted-foreground border-t border-border/60 pt-2 mt-3">
              {match.explanation}
            </p>
          )}
          {match.job.closing_date && (
            <p className="text-xs text-muted-foreground mt-1">
              Closes {new Date(match.job.closing_date).toLocaleDateString("en-ZM")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<{ matches: MatchData[]; remaining_quota: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated || !token) {
      router.push("/auth");
    }
  }, [token, isAuthenticated, authLoading, router]);

  const load = useCallback(() => {
    if (!token) {
      return;
    }
    setLoading(true);
    matchesApi
      .get(token)
      .then((d) => {
        setData(d);
        setHidden(new Set());
      })
      .catch((e) => {
        setData(null);
        const { isAuth, message } = getErrorMessage(e, "Failed to load matches");
        if (isAuth) {
          router.push("/auth");
        } else {
          toast.error(message);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, router]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated || !token) {
      return;
    }
    load();
  }, [isAuthenticated, token, authLoading, load]);

  const trigger = async () => {
    if (!token) {
      return;
    }
    setRunLoading(true);
    try {
      const res = await matchesApi.trigger(token);
      toast.success(res.message || "Your matches are updating.");
      await matchesApi
        .get(token)
        .then((d) => {
          setData(d);
          setHidden(new Set());
        });
    } catch (e) {
      const { message, isRateLimit } = getErrorMessage(
        e,
        "We could not start matching. Check your subscription limits."
      );
      toast.error(message, { duration: isRateLimit ? 10_000 : 5000 });
    } finally {
      setRunLoading(false);
    }
  };

  const onCover = (jobId: string) => {
    if (!token) {
      return;
    }
    (async () => {
      let ok = true;
      try {
        const r = await coverLetter.generate(token, jobId);
        const blob = new Blob([r.letter], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cover.txt";
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Cover letter downloaded as .txt");
      } catch (e) {
        ok = false;
        const { message } = getErrorMessage(
          e,
          "You may need a higher plan or a completed CV. Try on web after upgrading."
        );
        toast.error(message);
      }
      if (!ok) {
        // handled
      }
    })();
  };

  if (authLoading) {
    return <div className="p-6 space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }
  if (loading) {
    return <div className="p-6 text-muted-foreground">Preparing your dashboard…</div>;
  }
  if (!data) {
    return <EmptyState title="Couldn’t load your matches" description="Try signing in again from the home page." />;
  }

  const list = data.matches
    .filter((m) => !hidden.has(m.id))
    .filter((m) => m.score >= 50);
  const below = data.matches
    .filter((m) => !hidden.has(m.id))
    .filter((m) => m.score < 50);

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Your job matches</h1>
          <p className="text-sm text-muted-foreground">Sorted by match score. Hidden rows stay on this device only.</p>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data.remaining_quota} matches left this month
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          className="min-h-11 w-full sm:w-auto"
          type="button"
          onClick={trigger}
          disabled={runLoading}
        >
          {runLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run matching now"}
        </Button>
        {runLoading && !reduce && (
          <div className="w-full sm:flex-1 space-y-1.5" aria-live="polite">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
            <p className="text-xs text-muted-foreground">
              AI is comparing your CV to open roles. A slow connection can take 10–20 seconds.
            </p>
          </div>
        )}
        <a
          className="text-sm text-primary underline min-h-11 items-center sm:inline-flex"
          href="/profile"
        >
          Upload or refresh CV
        </a>
      </div>

      {list.length === 0 && !below.length && (
        <div className="text-center my-4">
          {data.matches.length > 0 ? (
            <p className="text-muted-foreground text-sm sm:text-base">
              We found matches, but all are below 50% after filtering. Strengthen your skills on your{" "}
              <a className="text-primary underline" href="/profile">profile</a> and run again.
            </p>
          ) : (
            <EmptyState
              title="No matches to show yet"
              description="Upload your CV from your profile, then use Run matching so we can score you against the board."
            />
          )}
        </div>
      )}

      {list.length > 0 && (
        <section aria-label="Top matches" className="mb-6">
          <h2 className="sr-only">At or above 50 percent</h2>
          <MatchRows
            data={list}
            token={token!}
            onHide={(id) => setHidden((h) => new Set([...h, id]))}
            onViewJob={(jobId) => {
              router.push(`/jobs?id=${jobId}`);
            }}
            onCover={onCover}
          />
        </section>
      )}

      {below.length > 0 && (
        <div className="pt-2 border-t border-dashed">
          <p className="text-sm text-muted-foreground mb-2">Lower confidence (&lt;50%)</p>
          <MatchRows
            data={below}
            token={token!}
            onHide={(id) => setHidden((h) => new Set([...h, id]))}
            onViewJob={(jobId) => {
              router.push(`/jobs?id=${jobId}`);
            }}
            onCover={onCover}
          />
        </div>
      )}

    </div>
  );
}
