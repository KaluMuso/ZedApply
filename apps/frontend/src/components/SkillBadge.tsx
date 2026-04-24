interface SkillBadgeProps {
  skill: string;
  matched?: boolean;
}

export function SkillBadge({ skill, matched = true }: SkillBadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        matched
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {skill}
    </span>
  );
}
