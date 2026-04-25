"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useIntersectionObserver";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedCounter({
  value,
  label,
  suffix = "+",
  className,
}: {
  value: number;
  label: string;
  suffix?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduce = useReducedMotion() ?? false;
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) {
      return;
    }
    if (reduce) {
      setN(value);
      return;
    }
    const duration = 1200;
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.floor(p * value));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={cn("text-center", className)}>
      <p className="text-2xl sm:text-4xl font-bold tabular-nums text-primary">
        {n}
        {suffix}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
