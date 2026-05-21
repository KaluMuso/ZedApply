import { cn } from "@/lib/utils";

export function StepProgress({
  current,
  total,
  labels,
  className,
}: {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-label={`Step ${current} of ${total}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">
          Step {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        {labels?.[current - 1] ? (
          <span className="text-xs text-muted-foreground">{labels[current - 1]}</span>
        ) : null}
      </div>
      <div className="flex gap-1" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i < current ? "bg-primary" : "bg-line"
            )}
          />
        ))}
      </div>
    </div>
  );
}
