/**
 * Canonical matching weights (migration 060 / AGENTS.md invariants).
 * Keep marketing, FAQ, and Bwana-facing site copy aligned with prod RPC.
 */
export const MATCH_WEIGHTS = {
  semantic: 50,
  skills: 20,
  experience: 15,
  location: 10,
  recency: 5,
} as const;

export const MATCH_WEIGHT_COMPONENT_COUNT = 5;

/** One-line summary for step cards and hero subcopy. */
export const MATCH_WEIGHTS_HYBRID_LINE =
  "Hybrid match: 50% semantic similarity + 20% skills overlap + 15% experience + 10% location + 5% recency.";

/** Homepage / pricing FAQ answer for “What's the matching score?” */
export const MATCH_SCORE_FAQ_ANSWER =
  "Every job gets a 0–100 score from your CV. It's a blend of five signals: semantic similarity between your CV and the job description (50%), how your skills overlap with what the role asks for (20%), experience fit (15%), location (10%), and how fresh the listing is (5%). Each match shows you the full breakdown.";

/** Labels + weight % for score breakdown visuals (bar width = weight, not sub-score). */
export const MATCH_WEIGHT_BARS = [
  { label: "Semantic similarity", pct: MATCH_WEIGHTS.semantic, bar: "bg-emerald-500" },
  { label: "Skills overlap", pct: MATCH_WEIGHTS.skills, bar: "bg-amber-500" },
  { label: "Experience fit", pct: MATCH_WEIGHTS.experience, bar: "bg-sky-500" },
  { label: "Location", pct: MATCH_WEIGHTS.location, bar: "bg-violet-500" },
  { label: "Recency", pct: MATCH_WEIGHTS.recency, bar: "bg-slate-400" },
] as const;

/** Bullet list for transparent scoring section. */
export const MATCH_WEIGHT_BULLETS = [
  {
    title: "Semantic similarity (50%)",
    body: "Vector match between your CV and the job description",
  },
  {
    title: "Skills overlap (20%)",
    body: "How many required skills you have, canonicalised",
  },
  {
    title: "Experience fit (15%)",
    body: "Seniority and years aligned with what the role asks for",
  },
  {
    title: "Location (10%)",
    body: "Province, remote/hybrid preference, and commute signals",
  },
  {
    title: "Recency (5%)",
    body: "Fresh listings score slightly higher so you see active roles first",
  },
] as const;
