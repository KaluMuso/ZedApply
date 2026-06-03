import { UNLIMITED_MATCHES, formatMatchesLimit } from "@/lib/tier-config";

export type MatchQuotaSource = {
  matches_used?: number;
  credited_count?: number;
  matches_limit?: number;
  matches_unlimited?: boolean;
  remaining_quota?: number;
};

export type SubscriptionQuotaSource = {
  matches_used?: number;
  matches_limit?: number;
  matches_unlimited?: boolean;
  remaining_quota?: number;
};

/** Derive delivered count from limit − remaining on the same quota payload. */
export function deriveUsedFromRemaining(
  source: MatchQuotaSource | SubscriptionQuotaSource | null | undefined,
  fallbackLimit?: number,
): number | undefined {
  if (!source || source.remaining_quota == null) return undefined;
  const limit =
    source.matches_limit ??
    (source.matches_unlimited ? UNLIMITED_MATCHES : fallbackLimit);
  if (typeof limit !== "number" || limit <= 0) return undefined;
  return Math.max(0, limit - source.remaining_quota);
}

function resolveUsedCount(
  data: MatchQuotaSource | null | undefined,
  sub: SubscriptionQuotaSource | null | undefined,
): number {
  const fromDataApi =
    typeof data?.matches_used === "number"
      ? data.matches_used
      : typeof data?.credited_count === "number"
        ? data.credited_count
        : undefined;
  const derivedFromData = deriveUsedFromRemaining(data, sub?.matches_limit);
  const fromSubApi =
    typeof sub?.matches_used === "number" ? sub.matches_used : undefined;
  const derivedFromSub = deriveUsedFromRemaining(sub);

  if (fromDataApi != null && derivedFromData != null) {
    return Math.max(fromDataApi, derivedFromData);
  }
  if (fromDataApi != null) return fromDataApi;
  if (derivedFromData != null) return derivedFromData;
  if (fromSubApi != null && derivedFromSub != null) {
    return Math.max(fromSubApi, derivedFromSub);
  }
  if (fromSubApi != null) return fromSubApi;
  if (derivedFromSub != null) return derivedFromSub;
  return 0;
}

/** Resolve used/limit for the matches page quota card. Never sums used+remaining when unlimited. */
export function resolveMatchQuotaDisplay(
  data: MatchQuotaSource | null | undefined,
  sub: SubscriptionQuotaSource | null | undefined,
): {
  matchesUsed: number;
  matchesLimit: number;
  unlimited: boolean;
  limitLabel: string;
  usagePct: number;
} {
  const matchesUsed = resolveUsedCount(data, sub);

  const rawLimit =
    data?.matches_limit ??
    sub?.matches_limit ??
    (data?.remaining_quota != null && matchesUsed >= 0
      ? matchesUsed + data.remaining_quota
      : 50);

  const unlimited =
    Boolean(data?.matches_unlimited ?? sub?.matches_unlimited) ||
    rawLimit >= UNLIMITED_MATCHES;

  const matchesLimit = unlimited ? UNLIMITED_MATCHES : rawLimit;
  const limitLabel = formatMatchesLimit(matchesLimit);
  const usagePct =
    unlimited || matchesLimit <= 0
      ? matchesUsed > 0
        ? 8
        : 0
      : Math.min(100, (matchesUsed / matchesLimit) * 100);

  return {
    matchesUsed,
    matchesLimit,
    unlimited,
    limitLabel,
    usagePct,
  };
}
