"use client";

import { useState } from "react";

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

function getScoreColor(score: number): string {
  if (score >= 80) return "#198754";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

const sizes = {
  sm: { box: 60, stroke: 4, radius: 24, font: "text-sm" },
  md: { box: 80, stroke: 5, radius: 34, font: "text-xl" },
  lg: { box: 100, stroke: 6, radius: 42, font: "text-2xl" },
};

export function MatchScore({ score, breakdown, size = "md" }: MatchScoreProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { box, stroke, radius, font } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      className="relative inline-flex flex-col items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <svg width={box} height={box} className="-rotate-90">
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-circle"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-bold ${font}`}
        style={{ color }}
      >
        {Math.round(score)}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg p-3 min-w-[160px] z-10 shadow-lg">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>Relevance</span>
              <span className="font-medium">{Math.round(breakdown.vector)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Skills</span>
              <span className="font-medium">{Math.round(breakdown.skill)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Bonus</span>
              <span className="font-medium">{Math.round(breakdown.bonus)}%</span>
            </div>
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}
