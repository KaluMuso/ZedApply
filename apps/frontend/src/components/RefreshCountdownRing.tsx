"use client";

interface RefreshCountdownRingProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
}

/**
 * Circular countdown ring — stroke animates as remainingSeconds ticks down.
 */
export function RefreshCountdownRing({
  totalSeconds,
  remainingSeconds,
  size = 44,
}: RefreshCountdownRingProps) {
  const stroke = 3;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.max(0, Math.min(1, remainingSeconds / safeTotal));
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${remainingSeconds} seconds remaining`}
      className="shrink-0"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--green-500)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.95s linear" }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono"
        style={{ fontSize: 11, fill: "var(--ink-2)" }}
      >
        {remainingSeconds}
      </text>
    </svg>
  );
}
