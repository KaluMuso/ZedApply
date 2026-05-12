"use client";

import { useEffect, useState, useRef } from "react";

interface CounterProps {
  to: number;
  duration?: number;
  suffix?: string;
}

/**
 * Animates from the previous displayed value up (or down) to `to` once the
 * element scrolls into view. Re-animates whenever `to` changes — important
 * for data-driven counters like total job listings, which mount with 0 and
 * update once the API resolves. (Prior version latched `started` true on
 * first mount with to=0 and never re-ran, producing "0 open roles" until
 * page reload.)
 */
export function Counter({ to, duration = 1200, suffix = "" }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const inViewRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const runAnimation = () => {
      // Cancel any in-flight animation so a fast-changing `to` doesn't
      // race against itself.
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      const start = performance.now();
      const from = fromRef.current;
      const delta = to - from;

      // Skip the RAF dance when the value is already correct.
      if (delta === 0) {
        setCount(to);
        return;
      }

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setCount(Math.round(from + delta * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          fromRef.current = to;
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inViewRef.current = true;
          runAnimation();
        }
      },
      { threshold: 0.3 }
    );

    // If the element is already in view by the time `to` changes (very
    // common — header is above the fold), run immediately instead of
    // waiting for an intersection event that may never re-fire.
    if (inViewRef.current) {
      runAnimation();
    }

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
