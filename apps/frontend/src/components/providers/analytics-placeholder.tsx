"use client";

/**
 * Placeholder for future GA4 or Plausible — do not run scripts until keys are in env.
 */
export function Analytics() {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    return null;
  }
  return null;
}
