/** Limits for match skill chips in compact vs expanded surfaces. */
export const MATCH_CARD_MAX_MATCHED_SKILLS = 6;
export const MATCH_CARD_MAX_MISSING_SKILLS = 4;
export const MATCH_EXPLANATION_MAX_MATCHED_SKILLS = 12;
export const MATCH_EXPLANATION_MAX_MISSING_SKILLS = 12;

export type TruncatedSkillList = {
  visible: string[];
  overflowCount: number;
};

/** Slice skills for UI display; overflow count drives a “+N more” suffix. */
export function truncateSkillList(
  skills: readonly string[],
  maxVisible: number,
): TruncatedSkillList {
  if (maxVisible <= 0 || skills.length === 0) {
    return { visible: [], overflowCount: 0 };
  }
  const visible = skills.slice(0, maxVisible);
  return {
    visible,
    overflowCount: Math.max(0, skills.length - visible.length),
  };
}

export function formatSkillOverflowSuffix(overflowCount: number): string | null {
  if (overflowCount <= 0) return null;
  return overflowCount === 1 ? "+1 more" : `+${overflowCount} more`;
}
