"use client";

import { cn } from "@/lib/utils";

export type DeadlineTone = "green" | "red" | "grey" | "none";

export function deadlineTone(closingDate: string | null | undefined): DeadlineTone {
  if (!closingDate) return "none";
  const end = new Date(closingDate);
  if (Number.isNaN(end.getTime())) return "none";
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "grey";
  if (days < 3) return "red";
  return "green";
}

export function deadlineLabel(closingDate: string | null | undefined): string | null {
  if (!closingDate) return null;
  const end = new Date(closingDate);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}

export function DeadlineBadge({
  closingDate,
  className = "",
}: {
  closingDate: string | null | undefined;
  className?: string;
}) {
  const label = deadlineLabel(closingDate);
  const tone = deadlineTone(closingDate);
  if (!label || tone === "none") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "red" && "text-red-500 dark:text-red-400",
        tone === "green" && "text-green-500 dark:text-green-400",
        tone === "grey" && "text-muted-foreground dark:text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
