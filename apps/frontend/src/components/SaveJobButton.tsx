"use client";

import { Icon } from "@/components/ui/Icon";
import { useSavedJobs } from "@/lib/SavedJobsProvider";
import { useAuth } from "@/lib/auth";

interface SaveJobButtonProps {
  jobId: string;
  className?: string;
  /** Stop click from bubbling to parent card handlers. */
  stopPropagation?: boolean;
}

export function SaveJobButton({
  jobId,
  className = "btn btn-ghost",
  stopPropagation = true,
}: SaveJobButtonProps) {
  const { isAuthenticated } = useAuth();
  const { isSaved, toggle, loading } = useSavedJobs();
  const saved = isSaved(jobId);

  if (!isAuthenticated) return null;

  return (
    <button
      type="button"
      className={className}
      aria-label={saved ? "Remove from saved" : "Save job"}
      title={saved ? "Remove from saved" : "Save job"}
      disabled={loading}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        void toggle(jobId);
      }}
      onKeyDown={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
    >
      <Icon name="bookmark" size={16} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
