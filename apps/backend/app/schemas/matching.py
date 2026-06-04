from pydantic import BaseModel, Field, computed_field, model_validator
from datetime import datetime, timezone
from typing import Any, Optional
from app.schemas.jobs import Job


# Field validation allows legacy raw 0–100 rows; RPC 060+ returns pre-weighted buckets.
COMPONENT_SCORE_MAX = 100.0
SEMANTIC_WEIGHT = 0.50
SKILLS_WEIGHT = 0.20
EXPERIENCE_WEIGHT = 0.15
LOCATION_WEIGHT = 0.10
RECENCY_WEIGHT = 0.05

# match_jobs_for_user (migration 060) additive caps — sum to 100.
V2_SEMANTIC_CAP = 50.0
V2_SKILLS_CAP = 20.0
V2_EXPERIENCE_CAP = 15.0
V2_LOCATION_CAP = 10.0
V2_RECENCY_CAP = 5.0
V2_BUCKET_CAPS = (
    V2_SEMANTIC_CAP,
    V2_SKILLS_CAP,
    V2_EXPERIENCE_CAP,
    V2_LOCATION_CAP,
    V2_RECENCY_CAP,
)


def row_uses_v2_weighted_buckets(
    *,
    semantic: float,
    skills: float,
    experience: float,
    location: float,
    recency: float,
    total_score: float,
) -> bool:
    """True when component scores are RPC 060 pre-weighted buckets, not raw 0–100."""
    components = (semantic, skills, experience, location, recency)
    if any(value > cap + 1e-6 for value, cap in zip(components, V2_BUCKET_CAPS)):
        return False
    if sum(components) < 1e-6:
        return False
    return abs(sum(components) - total_score) <= 5.0


class MatchResult(BaseModel):
    id: str
    job: Job
    score: float = Field(..., ge=0, le=100)
    semantic_score: float = Field(
        0,
        ge=0,
        le=COMPONENT_SCORE_MAX,
        description=(
            "Semantic points: pre-weighted 0–50 bucket from match_jobs_for_user (060+), "
            "or raw 0–100 similarity for legacy rows."
        ),
    )
    skills_score: float = Field(
        0,
        ge=0,
        le=COMPONENT_SCORE_MAX,
        description="Skills points: 0–20 v2 bucket or raw 0–100 overlap for legacy rows.",
    )
    experience_score: float = Field(
        0,
        ge=0,
        le=COMPONENT_SCORE_MAX,
        description="Experience points: 0–15 v2 bucket or raw 0–100 for legacy rows.",
    )
    location_score: float = Field(
        0,
        ge=0,
        le=COMPONENT_SCORE_MAX,
        description="Location points: 0–10 v2 bucket or raw 0–100 for legacy rows.",
    )
    recency_score: float = Field(
        0,
        ge=0,
        le=COMPONENT_SCORE_MAX,
        description="Recency points: 0–5 v2 bucket or raw 0–100 for legacy rows.",
    )
    scores_are_weighted_buckets: bool = Field(
        default=False,
        exclude=True,
        description=(
            "When True, semantic_score…recency_score are RPC 060 additive buckets; "
            "weighted_*_contribution mirrors them. When False, legacy raw 0–100 scores."
        ),
    )
    bonus_score: float = Field(
        0,
        ge=0,
        description="Legacy: location_score + recency_score for older clients",
    )
    vector_score: float = Field(
        0, ge=0, description="Alias of semantic_score for legacy clients"
    )
    skill_score: float = Field(
        0, ge=0, description="Alias of skills_score for legacy clients"
    )
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    explanation: Optional[str] = None
    created_at: datetime

    def _weighted_contribution(self, component: float, weight: float) -> float:
        if self.scores_are_weighted_buckets:
            return round(component, 2)
        return round(component * weight, 2)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weighted_semantic_contribution(self) -> float:
        return self._weighted_contribution(self.semantic_score, SEMANTIC_WEIGHT)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weighted_skills_contribution(self) -> float:
        return self._weighted_contribution(self.skills_score, SKILLS_WEIGHT)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weighted_experience_contribution(self) -> float:
        return self._weighted_contribution(self.experience_score, EXPERIENCE_WEIGHT)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weighted_location_contribution(self) -> float:
        return self._weighted_contribution(self.location_score, LOCATION_WEIGHT)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weighted_recency_contribution(self) -> float:
        return self._weighted_contribution(self.recency_score, RECENCY_WEIGHT)

    @model_validator(mode="after")
    def _sync_score_aliases(self) -> "MatchResult":
        if self.vector_score == 0 and self.semantic_score:
            object.__setattr__(self, "vector_score", self.semantic_score)
        if self.skill_score == 0 and self.skills_score:
            object.__setattr__(self, "skill_score", self.skills_score)
        if self.semantic_score == 0 and self.vector_score:
            object.__setattr__(self, "semantic_score", self.vector_score)
        if self.skills_score == 0 and self.skill_score:
            object.__setattr__(self, "skills_score", self.skill_score)
        legacy_bonus = self.location_score + self.recency_score
        if self.bonus_score == 0 and legacy_bonus > 0:
            object.__setattr__(self, "bonus_score", legacy_bonus)
        return self

    @classmethod
    def from_stored_row(
        cls,
        *,
        job: Job,
        row: dict[str, Any],
        adjusted_score: float | None = None,
        adjusted_bonus: float | None = None,
        explanation: str | None = None,
    ) -> "MatchResult":
        semantic = float(
            row.get("semantic_score") or row.get("vector_score") or 0
        )
        skills = float(row.get("skills_score") or row.get("skill_score") or 0)
        experience = float(row.get("experience_score") or 0)
        location = float(row.get("location_score") or 0)
        recency = float(row.get("recency_score") or 0)
        if location == 0 and recency == 0:
            legacy_bonus = float(row.get("bonus_score") or 0)
            location = legacy_bonus
        total = adjusted_score if adjusted_score is not None else float(row.get("score") or 0)
        bonus = adjusted_bonus if adjusted_bonus is not None else location + recency
        v2_buckets = row_uses_v2_weighted_buckets(
            semantic=semantic,
            skills=skills,
            experience=experience,
            location=location,
            recency=recency,
            total_score=total,
        )
        return cls(
            id=str(row["id"]),
            job=job,
            score=total,
            semantic_score=semantic,
            skills_score=skills,
            experience_score=experience,
            location_score=location,
            recency_score=recency,
            bonus_score=bonus,
            vector_score=semantic,
            skill_score=skills,
            matched_skills=list(row.get("matched_skills") or []),
            missing_skills=list(row.get("missing_skills") or []),
            explanation=explanation or row.get("explanation"),
            created_at=row["created_at"],
            scores_are_weighted_buckets=v2_buckets,
        )

    @classmethod
    def from_rpc_row(
        cls,
        *,
        job: Job,
        row: dict[str, Any],
        match_id: str | None = None,
        created_at: datetime | None = None,
        explanation: str | None = None,
        adjusted_score: float | None = None,
        adjusted_bonus: float | None = None,
    ) -> "MatchResult":
        semantic = float(row.get("semantic_score") or row.get("vector_score") or 0)
        skills = float(row.get("skills_score") or row.get("skill_score") or 0)
        experience = float(row.get("experience_score") or 0)
        location = float(row.get("location_score") or 0)
        recency = float(row.get("recency_score") or 0)
        if location == 0 and recency == 0:
            legacy_bonus = float(row.get("bonus_score") or 0)
            location = legacy_bonus
        total = adjusted_score if adjusted_score is not None else float(
            row.get("score") or row.get("final_score") or 0
        )
        bonus = adjusted_bonus if adjusted_bonus is not None else location + recency
        return cls(
            id=match_id or str(row["job_id"]),
            job=job,
            score=total,
            semantic_score=semantic,
            skills_score=skills,
            experience_score=experience,
            location_score=location,
            recency_score=recency,
            bonus_score=bonus,
            vector_score=semantic,
            skill_score=skills,
            matched_skills=list(row.get("matched_skills") or []),
            missing_skills=list(row.get("missing_skills") or []),
            explanation=explanation or row.get("explanation"),
            created_at=created_at or datetime.now(timezone.utc),
            scores_are_weighted_buckets=True,
        )


class MatchList(BaseModel):
    matches: list[MatchResult]
    remaining_quota: int
    matches_used: int = Field(
        0,
        description="Unique jobs credited this billing period (same as credited_count).",
    )
    credited_count: int = Field(
        0,
        description="Alias of matches_used for older clients.",
    )
    matches_limit: int = Field(
        10,
        description="Monthly delivery cap from tier_config; 99999 = unlimited.",
    )
    matches_unlimited: bool = Field(
        False,
        description="True when matches_limit uses the unlimited sentinel (99999).",
    )
    last_batch_run_at: datetime | None = None
    from_cache: bool = False


class MatchRefreshResponse(MatchList):
    """POST /matches/refresh — cached nightly batch or onboarding fallback."""

    message: str | None = None
    refresh_computing: bool = Field(
        False,
        description=(
            "True when the server is still running first-time on-demand matching; "
            "clients may show a progress affordance until the next refresh."
        ),
    )


class BatchMatchAcceptedResponse(BaseModel):
    batch_run_id: str
    message: str = "Batch matching started"


class BatchMatchResultResponse(BaseModel):
    batch_run_id: str
    users_processed: int
    matches_created: int
    error_count: int
    pruned_rows: int = 0


class CronTickResponse(BaseModel):
    users_processed: int
    new_matches_total: int


class NotificationDigestResponse(BaseModel):
    users_processed: int
    notifications_sent: int
