import { tierAtLeast } from "@/lib/tier-features";

/** Accent for tier-gated nav items (Interview Prep, etc.). */
export const PREMIUM_FEATURE_PURPLE = "#a855f7";

export function hasInterviewPrepAccess(tier: string | null | undefined): boolean {
  return tierAtLeast(tier, "super_standard");
}

export function isPremiumInterviewPrepNav(tier: string | null | undefined): boolean {
  return !hasInterviewPrepAccess(tier);
}
