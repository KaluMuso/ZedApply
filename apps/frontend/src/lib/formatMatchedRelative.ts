/**
 * Human-readable "Matched …" label for match cards.
 * Uses local calendar days for today / yesterday, then compact day counts.
 */
export function formatMatchedRelative(
  iso: string,
  now: Date = new Date(),
): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  if (t > now.getTime()) return "Matched recently";

  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const dayMs = 86400000;
  const dThen = new Date(t);
  const diffDays = Math.round((startOf(now) - startOf(dThen)) / dayMs);

  if (diffDays === 0) return "Matched today";
  if (diffDays === 1) return "Matched yesterday";
  if (diffDays >= 2 && diffDays <= 6) return `Matched ${diffDays} days ago`;
  if (diffDays < 14) return `Matched ${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 8) return `Matched ${weeks}w ago`;
  const months = Math.floor(diffDays / 30);
  return `Matched ${Math.max(months, 1)}mo ago`;
}
