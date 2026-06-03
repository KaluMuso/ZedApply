/** Shared skills normalization and preview/PDF line formatting for the CV builder. */

/** PDF renderer prints every non-empty skill joined with middle dots (no cap). */
export const PDF_SKILLS_SEPARATOR = " · ";

/**
 * Screen preview caps visible skills so long lists stay scannable in the split pane.
 * PDF export uses the full list — see `formatSkillsLine` without a max.
 */
export const PREVIEW_MAX_VISIBLE_SKILLS = 18;

export function normalizeSkillList(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Skills shown in live preview and browser print — always from the draft array. */
export function getDraftSkillsForPreview(skills: readonly string[]): string[] {
  return normalizeSkillList(skills);
}

export type FormattedSkillsLine = {
  visible: string[];
  overflowCount: number;
  line: string;
};

/**
 * Build the skills line for preview/print. Matches PDF join order; optionally truncates
 * visible skills on screen with an "and N more" suffix.
 */
export function formatSkillsLine(
  skills: readonly string[],
  options?: { maxVisible?: number },
): FormattedSkillsLine {
  const cleaned = normalizeSkillList(skills);
  if (cleaned.length === 0) {
    return { visible: [], overflowCount: 0, line: "" };
  }

  const maxVisible = options?.maxVisible ?? cleaned.length;
  const visible = cleaned.slice(0, maxVisible);
  const overflowCount = Math.max(0, cleaned.length - visible.length);
  const joined = visible.join(PDF_SKILLS_SEPARATOR);
  const line =
    overflowCount > 0
      ? `${joined}${PDF_SKILLS_SEPARATOR}and ${overflowCount} more`
      : joined;

  return { visible, overflowCount, line };
}
