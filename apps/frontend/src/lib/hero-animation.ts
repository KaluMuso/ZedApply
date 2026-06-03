/**
 * Hero floating-card animation timing.
 *
 * ANIMATION_SPEED_FACTOR multiplies cycle durations: 0.67 ≈ 50% faster
 * (same motion in ~2/3 the time; rate ×1.5).
 *
 * Used by `tailwind.config.ts` float utilities and respected via
 * `motion-reduce:animate-none` on {@link FloatingCard}.
 */
export const ANIMATION_SPEED_FACTOR = 0.67;

/** Baseline durations (seconds) before ANIMATION_SPEED_FACTOR. */
const HERO_FLOAT_BASE = {
  primary: 6,
  staggered: 7,
  delay1: 0.5,
  delay2: 1,
} as const;

function scaleDuration(seconds: number): number {
  return Number((seconds * ANIMATION_SPEED_FACTOR).toFixed(2));
}

/** Scaled hero float timings for Tailwind `animation` utilities. */
export const HERO_FLOAT_DURATIONS = {
  primary: scaleDuration(HERO_FLOAT_BASE.primary),
  staggered: scaleDuration(HERO_FLOAT_BASE.staggered),
  delay1: scaleDuration(HERO_FLOAT_BASE.delay1),
  delay2: scaleDuration(HERO_FLOAT_BASE.delay2),
} as const;
