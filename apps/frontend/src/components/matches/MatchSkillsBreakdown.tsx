"use client";

import { SkillBadge } from "@/components/SkillBadge";
import {
  formatSkillOverflowSuffix,
  MATCH_EXPLANATION_MAX_MATCHED_SKILLS,
  MATCH_EXPLANATION_MAX_MISSING_SKILLS,
  truncateSkillList,
} from "@/lib/matchSkillsDisplay";

export interface MatchSkillsBreakdownProps {
  matchedSkills: readonly string[];
  missingSkills: readonly string[];
  maxMatched?: number;
  maxMissing?: number;
  className?: string;
}

function SkillOverflowHint({ overflowCount }: { overflowCount: number }) {
  const label = formatSkillOverflowSuffix(overflowCount);
  if (!label) return null;
  return (
    <span
      className="text-xs font-mono self-center"
      style={{ color: "var(--muted)" }}
      data-testid="match-skills-overflow"
    >
      {label}
    </span>
  );
}

function MatchedSkillsSection({
  skills,
  maxVisible,
}: {
  skills: readonly string[];
  maxVisible: number;
}) {
  const { visible, overflowCount } = truncateSkillList(skills, maxVisible);
  if (visible.length === 0) return null;

  return (
    <section data-testid="match-skills-matched">
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--green-700)" }}
      >
        Matched skills
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {visible.map((skill) => (
          <SkillBadge key={skill} skill={skill} matched />
        ))}
        <SkillOverflowHint overflowCount={overflowCount} />
      </div>
    </section>
  );
}

function MissingSkillsSection({
  skills,
  maxVisible,
}: {
  skills: readonly string[];
  maxVisible: number;
}) {
  const { visible, overflowCount } = truncateSkillList(skills, maxVisible);
  if (visible.length === 0) return null;

  return (
    <section data-testid="match-skills-missing" className="mt-4">
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--muted)" }}
      >
        Skills to develop
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {visible.map((skill) => (
          <span
            key={skill}
            className="tag tag-mono opacity-75"
            data-testid="match-skill-missing-chip"
          >
            {skill}
          </span>
        ))}
        <SkillOverflowHint overflowCount={overflowCount} />
      </div>
    </section>
  );
}

/** Labeled matched / missing skill chips for the “Why this match?” panel. */
export function MatchSkillsBreakdown({
  matchedSkills,
  missingSkills,
  maxMatched = MATCH_EXPLANATION_MAX_MATCHED_SKILLS,
  maxMissing = MATCH_EXPLANATION_MAX_MISSING_SKILLS,
  className,
}: MatchSkillsBreakdownProps) {
  if (matchedSkills.length === 0 && missingSkills.length === 0) {
    return null;
  }

  return (
    <div className={className} data-testid="match-skills-breakdown">
      <MatchedSkillsSection skills={matchedSkills} maxVisible={maxMatched} />
      <MissingSkillsSection skills={missingSkills} maxVisible={maxMissing} />
    </div>
  );
}
