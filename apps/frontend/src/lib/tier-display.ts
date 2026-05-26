import { formatMatchesLimit, UNLIMITED_MATCHES } from "@/lib/tier-config";

/** Short tier label for nav and cards. */
export const TIER_NAV_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  super_standard: "Super Standard",
};

export function formatTierNavSubtitle(
  tier: string,
  matchesUsed?: number,
  matchesLimit?: number,
): string {
  const label = TIER_NAV_LABELS[tier] ?? tier.replace(/_/g, " ");
  if (matchesLimit === undefined) {
    return label;
  }
  const limitLabel =
    matchesLimit >= UNLIMITED_MATCHES
      ? "unlimited matches"
      : `${formatMatchesLimit(matchesLimit)} matches`;
  if (matchesUsed !== undefined && matchesLimit < UNLIMITED_MATCHES) {
    return `${label} · ${matchesUsed} of ${formatMatchesLimit(matchesLimit)} matches`;
  }
  return `${label} · ${limitLabel}`;
}
