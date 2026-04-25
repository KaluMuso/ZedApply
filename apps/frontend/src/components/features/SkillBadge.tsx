import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  skill: string;
  matched?: boolean;
}

export function SkillBadge({ skill, matched = true }: SkillBadgeProps) {
  return (
    <Badge
      variant={matched ? "default" : "secondary"}
      className={cn(
        "text-xs",
        !matched && "line-through opacity-80 border-dashed"
      )}
    >
      {skill}
    </Badge>
  );
}
