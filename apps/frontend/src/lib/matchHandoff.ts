import type { MatchData } from "@/lib/api";

const STORAGE_KEY = "zedapply:match-handoff";

export function stashMatchHandoff(match: MatchData): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ jobId: match.job.id, match, savedAt: Date.now() }),
    );
  } catch {
    /* private mode / quota */
  }
}

export function readMatchHandoff(jobId: string): MatchData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      jobId?: string;
      match?: MatchData;
      savedAt?: number;
    };
    if (parsed.jobId !== jobId || !parsed.match) return null;
    if (parsed.savedAt && Date.now() - parsed.savedAt > 15 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.match;
  } catch {
    return null;
  }
}

export function clearMatchHandoff(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
