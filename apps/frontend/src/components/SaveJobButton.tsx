"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { savedJobs, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

export interface SaveJobButtonProps {
  jobId: string;
  saved: boolean;
  token: string | null;
  disabled?: boolean;
  /** Optional extra classes for the outer button */
  className?: string;
  onChange?: (jobId: string, nextSaved: boolean) => void;
}

export function SaveJobButton({
  jobId,
  saved,
  token,
  disabled,
  className,
  onChange,
}: SaveJobButtonProps) {
  const [busy, setBusy] = useState(false);
  const [innerSaved, setInnerSaved] = useState(saved);

  useEffect(() => {
    setInnerSaved(saved);
  }, [saved]);

  const toggle = useCallback(async () => {
    if (!token) {
      toast.message("Sign in to save jobs.", {
        description: "Use Sign In in the header, then try again.",
      });
      return;
    }
    if (disabled || busy) return;
    setBusy(true);
    const wasSaved = innerSaved;
    try {
      if (wasSaved) {
        await savedJobs.unsave(token, jobId);
        setInnerSaved(false);
        onChange?.(jobId, false);
        toast.success("Removed from saved.");
      } else {
        await savedJobs.save(token, jobId);
        setInnerSaved(true);
        onChange?.(jobId, true);
        toast.success("Saved.");
      }
    } catch (e: unknown) {
      setInnerSaved(wasSaved);
      if (e instanceof ApiError) {
        toast.error(e.detail || "Could not update saved jobs.");
      } else {
        toast.error("Could not update saved jobs.");
      }
    } finally {
      setBusy(false);
    }
  }, [token, disabled, busy, innerSaved, jobId, onChange]);

  const label = innerSaved ? "Saved job" : "Save job";

  return (
    <button
      type="button"
      className={className ?? "btn btn-ghost"}
      aria-label={label}
      title={innerSaved ? "Remove from saved" : "Save this job"}
      disabled={Boolean(disabled) || busy}
      onClick={toggle}
      style={{
        opacity: busy ? 0.65 : 1,
        color: innerSaved ? "var(--green-700)" : undefined,
      }}
    >
      <Icon name="bookmark" size={16} />
    </button>
  );
}
