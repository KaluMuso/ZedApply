/**
 * Human-readable relative time for match.created_at.
 * Uses calendar-day boundaries in local time (today / yesterday / Nd ago).
 */
export function formatMatchRelativeTime(
  iso: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const todayStart = startOfDay(now).getTime();
  const thenStart = startOfDay(then).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((todayStart - thenStart) / dayMs);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Matched today";
  if (diffDays === 1) return "Matched yesterday";
  return `Matched ${diffDays}d ago`;
}
