"use client";

import { useMemo, useState } from "react";
import { adminNotifications, type AdminNotificationCreate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";

const TIERS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "super_standard", label: "Super Standard" },
] as const;

type TargetAudience = "all" | "tier";

export function NotificationsTab({ token }: { token: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/matches");
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("all");
  const [targetTier, setTargetTier] = useState<string>("starter");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const preview = useMemo(
    () => ({
      title: title.trim() || "Notification title",
      body: body.trim() || "Your message will appear here.",
      url: url.trim() || "/matches",
    }),
    [title, body, url]
  );

  const audienceLabel =
    targetAudience === "all"
      ? "All users"
      : `Tier: ${TIERS.find((t) => t.value === targetTier)?.label ?? targetTier}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      notify.error("Title and body are required");
      return;
    }
    if (targetAudience === "tier" && !targetTier) {
      notify.error("Select a subscription tier");
      return;
    }

    const payload: AdminNotificationCreate = {
      title: title.trim(),
      body: body.trim(),
      url: url.trim() || undefined,
      target_audience: targetAudience,
      target_tier: targetAudience === "tier" ? targetTier : undefined,
      scheduled_at:
        scheduleEnabled && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
    };

    setSubmitting(true);
    setLastResult(null);
    try {
      const result = await adminNotifications.create(token, payload);
      setLastResult(result.message);
      notify.success(result.message);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Compose notification</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Strong matches this week"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">Message</Label>
              <textarea
                id="notif-body"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Tap to see roles that fit your CV."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-url">Deep link (optional)</Label>
              <Input
                id="notif-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/matches"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Audience</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audience"
                  checked={targetAudience === "all"}
                  onChange={() => setTargetAudience("all")}
                />
                All users
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audience"
                  checked={targetAudience === "tier"}
                  onChange={() => setTargetAudience("tier")}
                />
                By subscription tier
              </label>
              {targetAudience === "tier" ? (
                <select
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={targetTier}
                  onChange={(e) => setTargetTier(e.target.value)}
                >
                  {TIERS.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </fieldset>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                Schedule for later
              </label>
              {scheduleEnabled ? (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              ) : null}
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Sending…"
                : scheduleEnabled
                  ? "Schedule notification"
                  : "Send now"}
            </Button>
            {lastResult ? (
              <p className="text-sm text-muted-foreground">{lastResult}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Audience: {audienceLabel}</p>
          <div className="rounded-lg border bg-muted/40 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 shrink-0 rounded-md bg-primary/10"
                aria-hidden
              />
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-muted-foreground">Zed Apply · now</p>
                <p className="font-semibold leading-snug">{preview.title}</p>
                <p className="text-sm text-muted-foreground">{preview.body}</p>
                <p className="truncate text-xs text-primary">{preview.url}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Web Push delivery requires users to have enabled browser notifications.
            Users without an active subscription are marked skipped.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
