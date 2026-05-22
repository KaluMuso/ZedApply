/**
 * Hide user-facing listings when closing_date is more than 3 calendar days
 * in the past. Jobs without a closing_date stay visible.
 */
export function isJobHiddenFromUserFeed(
  closingDate: string | null | undefined,
  ref: Date = new Date(),
): boolean {
  if (!closingDate) return false;
  const end = new Date(closingDate);
  if (Number.isNaN(end.getTime())) return false;
  const days = Math.ceil((end.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  return days < -3;
}
