import { SkillBadge } from "./SkillBadge";

interface JobCardProps {
  title: string;
  company: string | null;
  location: string | null;
  qualityScore: number;
  skills: string[];
  closingDate: string | null;
  matchedSkills?: string[];
  onClick?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function JobCard({
  title,
  company,
  location,
  qualityScore,
  skills,
  closingDate,
  matchedSkills = [],
  onClick,
}: JobCardProps) {
  const matchedSet = new Set(matchedSkills.map((s) => s.toLowerCase()));

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition"
      type="button"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base sm:text-lg truncate">{title}</h3>
          <p className="text-gray-600 text-sm mt-1">
            {company || "Company not listed"}
            {location && (
              <span className="ml-1">
                &middot; {location}
              </span>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreColor(qualityScore)}`}
        >
          {Math.round(qualityScore)}%
        </span>
      </div>

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 8).map((skill) => (
            <SkillBadge
              key={skill}
              skill={skill}
              matched={matchedSet.has(skill.toLowerCase())}
            />
          ))}
          {skills.length > 8 && (
            <span className="text-xs text-gray-400 self-center">
              +{skills.length - 8} more
            </span>
          )}
        </div>
      )}

      {closingDate && (
        <p className="mt-3 text-xs text-gray-400">
          Closes: {new Date(closingDate).toLocaleDateString("en-ZM")}
        </p>
      )}
    </button>
  );
}
