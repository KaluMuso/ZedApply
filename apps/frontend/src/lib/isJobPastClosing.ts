/**
 * True when a job's closing_date is strictly before the local calendar
 * start of `ref` (default: today). Jobs with no closing_date are never
 * treated as expired here.
 */
export function isJobPastClosing(
  closingDate: string | null | undefined,
  ref: Date = new Date(),
): boolean {
  if (!closingDate) return false;
  const end = new Date(closingDate);
  if (Number.isNaN(end.getTime())) return false;
  const refStart = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate(),
  ).getTime();
  const closeStart = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  ).getTime();
  return closeStart < refStart;
}
