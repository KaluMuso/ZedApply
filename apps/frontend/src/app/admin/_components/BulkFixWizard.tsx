"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { admin, type AdminContactFixJobRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { Loader2 } from "lucide-react";

type FormState = {
  apply_url: string;
  apply_email: string;
  contact_phone: string;
};

function emptyForm(): FormState {
  return { apply_url: "", apply_email: "", contact_phone: "" };
}

function formFromJob(job: AdminContactFixJobRow): FormState {
  return {
    apply_url: job.apply_url ?? "",
    apply_email: job.apply_email ?? "",
    contact_phone: job.contact_phone ?? "",
  };
}

export function BulkFixWizard({ token }: { token: string }) {
  const [job, setJob] = useState<AdminContactFixJobRow | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [baselineTotal, setBaselineTotal] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const sessionStart = useRef(Date.now());
  const baselineCaptured = useRef(false);
  const skippedIds = useRef(new Set<string>());

  const loadNext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin.jobsNeedsContactFix(token, { page: 1, per_page: 50 });
      const effectiveRemaining = Math.max(0, res.total - skippedIds.current.size);
      setRemaining(effectiveRemaining);
      if (!baselineCaptured.current && res.total > 0) {
        baselineCaptured.current = true;
        setBaselineTotal(res.total);
      }
      const next = res.jobs.find((j) => !skippedIds.current.has(j.id)) ?? null;
      setJob(next);
      setForm(next ? formFromJob(next) : emptyForm());
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const fixedCount =
    baselineTotal !== null ? Math.max(0, baselineTotal - remaining) : 0;
  const progressLabel =
    baselineTotal !== null && baselineTotal > 0
      ? `${fixedCount} of ${baselineTotal} fixed`
      : remaining > 0
        ? `${remaining} remaining`
        : "Queue clear";

  const pct =
    baselineTotal && baselineTotal > 0
      ? Math.round((fixedCount / baselineTotal) * 100)
      : remaining === 0
        ? 100
        : 0;

  const save = async () => {
    if (!job) return;
    const payload = {
      apply_url: form.apply_url.trim() || undefined,
      apply_email: form.apply_email.trim() || undefined,
      contact_phone: form.contact_phone.trim() || undefined,
    };
    if (!payload.apply_url && !payload.apply_email && !payload.contact_phone) {
      notify.error("Enter at least one of apply URL, email, or phone.");
      return;
    }
    setBusy(true);
    try {
      await admin.patchJobContact(token, job.id, payload);
      notify.custom.success("Saved.");
      await loadNext();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const markUncontactable = async () => {
    if (!job) return;
    setBusy(true);
    try {
      await admin.patchJobContact(token, job.id, {
        mark_uncontactable: true,
        reason: "manual_uncontactable",
      });
      notify.custom.success("Marked un-contactable.");
      await loadNext();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (job) skippedIds.current.add(job.id);
    void loadNext();
  };

  if (loading && !job) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading queue…
      </p>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No jobs need contact fixes.</p>
          <Link href="/admin/jobs" className="text-sm text-primary underline">
            Back to jobs
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">{progressLabel}</span>
          <span className="text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{job.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {job.company || "Unknown company"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.source_url ? (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline break-all"
            >
              Original listing ↗
            </a>
          ) : null}

          <div className="grid gap-3">
            <label className="text-xs font-medium text-muted-foreground">
              Apply URL
              <Input
                className="mt-1"
                value={form.apply_url}
                onChange={(e) => setForm((f) => ({ ...f, apply_url: e.target.value }))}
                placeholder="https://employer.co.zm/careers/…"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Apply email
              <Input
                className="mt-1"
                type="email"
                value={form.apply_email}
                onChange={(e) => setForm((f) => ({ ...f, apply_email: e.target.value }))}
                placeholder="careers@company.co.zm"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Contact phone (+260…)
              <Input
                className="mt-1"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                placeholder="+260971234567"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & next"}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={skip}>
              Skip
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void markUncontactable()}
            >
              Mark un-contactable
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Session started {new Date(sessionStart.current).toLocaleTimeString()}.{" "}
        {remaining} job{remaining === 1 ? "" : "s"} left in queue.
      </p>
    </div>
  );
}
