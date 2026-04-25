import { SkillBadge } from "./SkillBadge";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

function getScoreClass(score: number): string {
  if (score >= 80) {
    return "bg-primary/15 text-primary border border-primary/30";
  }
  if (score >= 60) {
    return "bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-200";
  }
  return "bg-destructive/10 text-destructive border border-destructive/30";
}

function closingSoon(d: string | null): boolean {
  if (!d) {
    return false;
  }
  const t = new Date(d).getTime() - Date.now();
  return t > 0 && t < 7 * 24 * 60 * 60 * 1000;
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
  const hasMatch = matchedSet.size > 0;
  const soon = closingSoon(closingDate);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full min-h-11 text-left transition rounded-xl border border-border",
        "bg-card p-4 sm:p-6",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      type="button"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base sm:text-lg truncate text-foreground">{title}</h3>
          <p className="text-sm mt-1 text-muted-foreground">
            {company || "Company not listed"}
            {location && <span className="ml-1">&middot; {location}</span>}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <Badge
            className={cn("border font-semibold tabular-nums", getScoreClass(qualityScore))}
            variant="secondary"
          >
            {Math.round(qualityScore)}% quality
          </Badge>
          {soon && closingDate && (
            <Badge variant="destructive" className="text-[0.65rem]">
              Closing soon
            </Badge>
          )}
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 8).map((sk) => (
            <SkillBadge
              key={sk}
              skill={sk}
              matched={!hasMatch || matchedSet.has(sk.toLowerCase())}
            />
          ))}
          {skills.length > 8 && (
            <span className="self-center text-xs text-muted-foreground">+{skills.length - 8} more</span>
          )}
        </div>
      )}

      {closingDate && (
        <p className="mt-3 text-xs text-muted-foreground">
          Closes: {new Date(closingDate).toLocaleDateString("en-ZM")}
        </p>
      )}
    </button>
  );
}
