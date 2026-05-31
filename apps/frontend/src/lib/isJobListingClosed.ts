import type { Job } from "@/lib/api";
import { isJobPastClosing } from "@/lib/isJobPastClosing";

/** True when the job should be treated as closed for apply / match feed UX. */
export function isJobListingClosed(job: {
  is_active?: boolean;
  closing_date?: string | null;
}): boolean {
  if (job.is_active === false) return true;
  return isJobPastClosing(job.closing_date);
}
