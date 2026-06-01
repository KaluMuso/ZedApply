"""Canonical matching weights (migration 060 / AGENTS.md). Mirror apps/frontend matching-weights-copy.ts."""
from __future__ import annotations

MATCH_WEIGHTS: dict[str, int] = {
    "semantic": 50,
    "skills": 20,
    "experience": 15,
    "location": 10,
    "recency": 5,
}

MATCH_WEIGHTS_HYBRID_LINE = (
    "Hybrid match: 50% semantic similarity + 20% skills overlap + "
    "15% experience + 10% location + 5% recency."
)

MATCH_SCORE_FAQ_ANSWER = (
    "Every job gets a 0–100 score from your CV. It's a blend of five signals: "
    "semantic similarity between your CV and the job description (50%), "
    "how your skills overlap with what the role asks for (20%), "
    "experience fit (15%), location (10%), and how fresh the listing is (5%). "
    "Each match shows you the full breakdown."
)
