import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-6xl space-y-6 py-8", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export function MatchesSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("max-w-[1280px] mx-auto px-6 py-8 space-y-8", className)}>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full max-w-lg" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export function PricingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("max-w-[1280px] mx-auto px-6 py-12", className)}>
      <Skeleton className="h-10 w-48 mx-auto mb-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function JobListPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("max-w-[1280px] mx-auto px-6 py-8 space-y-6", className)}>
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
