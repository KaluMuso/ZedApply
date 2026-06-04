"""Regression: MatchResult accepts raw 0–100 component scores (ZEDCV-BACKEND-10)."""
from datetime import datetime, timezone

from app.schemas.jobs import Job
from app.schemas.matching import (
    COMPONENT_SCORE_MAX,
    MatchResult,
    RECENCY_WEIGHT,
    SEMANTIC_WEIGHT,
    SKILLS_WEIGHT,
    row_uses_v2_weighted_buckets,
)

# Shape returned by match_jobs_for_user (migration 060).
RPC_060_MATCH_ROW = {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "score": 82.0,
    "final_score": 82.0,
    "semantic_score": 40.0,
    "skills_score": 16.0,
    "experience_score": 12.0,
    "location_score": 10.0,
    "recency_score": 4.0,
    "vector_score": 40.0,
    "skill_score": 16.0,
    "bonus_score": 14.0,
    "matched_skills": ["python", "fastapi"],
    "missing_skills": ["kubernetes"],
    "explanation": (
        "Semantic 40/50, skills 16/20, experience 12/15, location 10/10, recency 4/5."
    ),
}


def _minimal_job() -> Job:
    return Job(
        id="job-raw-bounds",
        title="Engineer",
        description="Build things",
        source="manual",
        posted_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )


def test_match_result_accepts_raw_component_scores():
    row = {
        "id": "match-raw-1",
        "semantic_score": 66.6,
        "skills_score": 100.0,
        "experience_score": 80.0,
        "location_score": 30.0,
        "recency_score": 25.0,
        "score": 57.98,
        "matched_skills": ["python"],
        "missing_skills": [],
        "created_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
    }
    result = MatchResult.from_stored_row(
        job=_minimal_job(),
        row=row,
    )
    assert result.semantic_score == 66.6
    assert result.skills_score == 100.0
    assert result.location_score == 30.0
    assert result.score == 57.98


def test_match_result_weighted_contributions_from_raw_scores():
    result = MatchResult.from_stored_row(
        job=_minimal_job(),
        row={
            "id": "match-raw-2",
            "semantic_score": 100.0,
            "skills_score": 50.0,
            "experience_score": 0.0,
            "location_score": 0.0,
            "recency_score": 0.0,
            "score": 60.0,
            "created_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
        },
    )
    assert result.weighted_semantic_contribution == 50.0
    assert result.weighted_skills_contribution == 10.0


def test_match_result_still_accepts_legacy_weighted_rpc_shape():
    """RPC v2 rows use sub-100 buckets; they must not fail validation."""
    result = MatchResult.from_rpc_row(
        job=_minimal_job(),
        row={
            "job_id": "job-v2",
            "score": 82.0,
            "semantic_score": 40.0,
            "skills_score": 16.0,
            "experience_score": 12.0,
            "location_score": 10.0,
            "recency_score": 4.0,
            "matched_skills": [],
            "missing_skills": [],
        },
        match_id="match-v2",
    )
    assert result.semantic_score == 40.0
    assert result.skills_score == 16.0


def test_rpc_060_fixture_weighted_contributions_not_double_scaled():
    """weighted_* must mirror RPC buckets (40/50), not 40×0.5."""
    result = MatchResult.from_rpc_row(
        job=_minimal_job(),
        row=RPC_060_MATCH_ROW,
        match_id="match-rpc-060",
    )
    assert result.scores_are_weighted_buckets is True
    assert result.weighted_semantic_contribution == 40.0
    assert result.weighted_skills_contribution == 16.0
    assert result.weighted_experience_contribution == 12.0
    assert result.weighted_location_contribution == 10.0
    assert result.weighted_recency_contribution == 4.0


def test_stored_v2_row_detected_for_weighted_contributions():
    stored = {
        "id": "match-stored-v2",
        "semantic_score": 40.0,
        "skills_score": 16.0,
        "experience_score": 12.0,
        "location_score": 10.0,
        "recency_score": 4.0,
        "score": 82.0,
        "created_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
    }
    assert row_uses_v2_weighted_buckets(
        semantic=40.0,
        skills=16.0,
        experience=12.0,
        location=10.0,
        recency=4.0,
        total_score=82.0,
    )
    result = MatchResult.from_stored_row(job=_minimal_job(), row=stored)
    assert result.scores_are_weighted_buckets is True
    assert result.weighted_semantic_contribution == 40.0


def test_component_score_max_is_100():
    assert COMPONENT_SCORE_MAX == 100.0
    assert SEMANTIC_WEIGHT * 100 == 50.0
    assert SKILLS_WEIGHT * 100 == 20.0
    assert RECENCY_WEIGHT * 100 == 5.0
