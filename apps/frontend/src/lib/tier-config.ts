/** Mirrors backend UNLIMITED_MATCHES sentinel (super_standard). */
export const UNLIMITED_MATCHES = 99999;

export function formatMatchesLimit(limit: number): string {
  if (limit >= UNLIMITED_MATCHES) {
    return "Unlimited";
  }
  return String(limit);
}

export function formatPriceLabel(priceNgwee: number, tier: string): string {
  if (tier === "free" || priceNgwee <= 0) {
    return "K0";
  }
  return `K${priceNgwee / 100}`;
}
