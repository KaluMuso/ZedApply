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
  secondaryCtaText,
  onSecondaryCtaClick,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  secondaryCtaText?: string;
  onSecondaryCtaClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex animate-fade-up flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-elevated/60 px-6 py-12 text-center dark:border-border-dark dark:bg-surface-dark-elevated/60",
        className
      )}
      role="status"
    >
      <Icon
        className="mb-3 h-10 w-10 text-ink-muted dark:text-ink-dark-muted"
        strokeWidth={1.25}
        aria-hidden
      />
      <h2 className="font-serif text-lg font-semibold text-ink dark:text-ink-dark">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-ink-muted dark:text-ink-dark-muted">
          {description}
        </p>
      ) : null}
      {ctaText && (ctaHref || onCtaClick) ? (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {ctaHref ? (
            <Link
              href={ctaHref}
              className={cn(buttonVariants({ variant: "primary", size: "md" }))}
            >
              {ctaText}
            </Link>
          ) : (
            <Button type="button" variant="primary" onClick={onCtaClick}>
              {ctaText}
            </Button>
          )}
          {secondaryCtaText && onSecondaryCtaClick ? (
            <Button type="button" variant="ghost" onClick={onSecondaryCtaClick}>
              {secondaryCtaText}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
