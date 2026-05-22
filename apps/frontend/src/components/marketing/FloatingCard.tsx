"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FloatingVariant = "default" | "delayed" | "delayed-2";

const floatClass: Record<FloatingVariant, string> = {
  default: "animate-float",
  delayed: "animate-float-delayed",
  "delayed-2": "animate-float-delay-2",
};

interface FloatingCardProps {
  children: ReactNode;
  className?: string;
  variant?: FloatingVariant;
}

/** Gentle vertical float for marketing hero decorations (Bucket 0). */
export function FloatingCard({
  children,
  className,
  variant = "default",
}: FloatingCardProps) {
  return (
    <div className={cn(floatClass[variant], className)}>{children}</div>
  );
}
