"use client";

import { useReducedMotion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ScoreBreakdown {
  vector: number;
  skill: number;
  bonus: number;
}

interface MatchScoreProps {
  score: number;
  breakdown: ScoreBreakdown;
  size?: "sm" | "md" | "lg";
}

function getScoreClass(score: number): string {
  if (score >= 80) {
    return "text-primary";
  }
  if (score >= 60) {
    return "text-amber-500";
  }
  return "text-destructive";
}

function getStrokeVar(score: number): string {
  if (score >= 80) {
    return "hsl(142.1 70.6% 45.3%)"; /* near primary green */
  }
  if (score >= 60) {
    return "hsl(45.4 96.7% 50%)";
  }
  return "hsl(0 84% 60%)";
}

const sizes = {
  sm: { box: 60, stroke: 4, radius: 24, font: "text-sm" },
  md: { box: 80, stroke: 5, radius: 34, font: "text-xl" },
  lg: { box: 100, stroke: 6, radius: 42, font: "text-2xl" },
};

export function MatchScore({ score, breakdown, size = "md" }: MatchScoreProps) {
  const reduce = useReducedMotion() ?? false;
  const { box, stroke, radius, font } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const offset = reduce ? 0 : circumference - (score / 100) * circumference;
  const colorClass = getScoreClass(score);

  return (
    <Tooltip>
      <TooltipTrigger
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center"
        type="button"
        aria-label={`Match score ${Math.round(score)} percent, view breakdown`}
      >
        <svg
          width={box}
          height={box}
          className={cn("-rotate-90", reduce ? "" : "score-circle")}
          viewBox={`0 0 ${box} ${box}`}
          role="img"
        >
          <title>Match score {Math.round(score)}</title>
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            className="stroke-muted-foreground/30"
            strokeWidth={stroke}
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={getStrokeVar(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-bold",
            font,
            colorClass
          )}
        >
          {Math.round(score)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Match breakdown (approx.)</p>
          <p>Relevance: {Math.round(breakdown.vector)}%</p>
          <p>Skills: {Math.round(breakdown.skill)}%</p>
          <p>Bonus: {Math.round(breakdown.bonus)}%</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
