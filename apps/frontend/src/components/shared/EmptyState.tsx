import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileSearch } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = FileSearch,
  title,
  description,
  ctaText,
  ctaHref,
  onCtaClick,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border border-dashed border-line bg-surface/60 py-12 px-6 text-center",
        className
      )}
      role="status"
    >
      <Icon className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1.25} aria-hidden />
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {ctaText && (ctaHref || onCtaClick) ? (
        <div className="mt-6">
          {ctaHref ? (
            <Link href={ctaHref} className={cn(buttonVariants({ variant: "primary", size: "default" }))}>
              {ctaText}
            </Link>
          ) : (
            <Button type="button" variant="primary" onClick={onCtaClick}>
              {ctaText}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
