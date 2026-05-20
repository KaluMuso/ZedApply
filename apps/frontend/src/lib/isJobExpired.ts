/** True when closing_date is strictly before today (local calendar day). */
export function isJobExpired(closingDate: string | null | undefined): boolean {
  if (!closingDate) return false;
  const close = new Date(closingDate);
  if (Number.isNaN(close.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  close.setHours(0, 0, 0, 0);
  return close.getTime() < today.getTime();
}
