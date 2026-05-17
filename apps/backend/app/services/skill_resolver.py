"""Hybrid skill resolver — trigram + vector matching with canonical_of walks.

The resolver maps a raw skill name (e.g. "Postgres", "ML", "node js") to
the canonical row in `public.skills`. Resolution proceeds in four passes,
each cheaper to wrong-answer than the next; we stop on the first hit:

    1. Exact lowercase match on skills.name.
    2. pg_trgm similarity above DEFAULT_TRGM_THRESHOLD.
    3. pgvector cosine similarity above DEFAULT_VECTOR_THRESHOLD.
    4. INSERT new row with category='auto' and the just-computed embedding;
       log a `skill_auto_inserted` analytics event.

Pass 2 and Pass 3 are exposed as Postgres functions (see migration 024)
so the actual nearest-neighbour search runs inside the DB and benefits
from the GIN trigram index and HNSW vector index. The Python side just
orchestrates the passes and walks `canonical_of`.

The caller MUST be a coroutine (`await resolve_skill_id(...)`) — Pass 3
issues an embedding HTTP call. Inside a single batch, pass the same
mutable `cache` dict to every call so repeats short-circuit at Pass 0.

Failure modes the resolver swallows by design:
- Embedding API failure: log warning, skip Pass 3, fall through to insert
  without an embedding. A future cron can backfill.
- match_skill_trgm / match_skill_vector RPC missing or erroring: log
  warning and continue to the next pass. The resolver still works (less
  effectively) on a DB without migration 024 applied — exact match + insert.
- Analytics insert failure: never blocks the upload; logged at debug.

Hot path on a cache hit: ~1ms. On a fresh skill (Pass 4): a single
embedding API call (~250ms typical) plus a few cheap SQL round trips.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.services.embedding import generate_embedding

logger = logging.getLogger(__name__)

# Threshold defaults. Tuned via scripts/validate_skill_resolver.py against
# scripts/skill_resolver_fixture.json. Bump trgm to be stricter if false
# matches show up (e.g., "java" vs "javascript" — trgm 0.6 keeps them
# distinct because of the length-tiebreak in the SQL function, but raise
# this and the vector threshold if the fixture says otherwise).
DEFAULT_TRGM_THRESHOLD = 0.6
DEFAULT_VECTOR_THRESHOLD = 0.85

# Hard cap on canonical_of chain walks. Matches the SQL function in
# migration 025; both have to agree or behaviour diverges between
# application writes and raw-SQL writes.
MAX_CANONICAL_DEPTH = 5


def _normalize(name: str) -> str:
    """Canonical form for `skills.name` lookups: lowercase, stripped.

    Existing `skills.name` rows are stored lowercase (see migrations 001
    onwards). Inputs from the LLM CV parser are arbitrary case; normalize
    once here so every pass uses the same key.
    """
    if not isinstance(name, str):
        return ""
    return name.strip().lower()


def _follow_canonical(supabase: Any, skill_id: str) -> str:
    """Return the canonical id for `skill_id`, walking `canonical_of` up
    to `MAX_CANONICAL_DEPTH` hops. Cycle-safe by depth cap.

    On any read error, returns the input id unchanged — the resolver
    should fail open, not 500 the upload.
    """
    cur = skill_id
    for _ in range(MAX_CANONICAL_DEPTH):
        try:
            res = (
                supabase.table("skills")
                .select("canonical_of")
                .eq("id", cur)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            logger.warning("canonical walk read failed for %s: %s", cur, exc)
            return cur
        rows = res.data or []
        if not rows:
            return cur
        nxt = rows[0].get("canonical_of")
        if not nxt:
            return cur
        cur = nxt
    return cur


def _exact_match(supabase: Any, norm_name: str) -> Optional[dict]:
    """Pass 1 — exact lowercase name match. Returns the matched row dict
    (with `id` and `canonical_of`) or None."""
    res = (
        supabase.table("skills")
        .select("id, canonical_of")
        .eq("name", norm_name)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def _trgm_match(
    supabase: Any, norm_name: str, threshold: float
) -> Optional[dict]:
    """Pass 2 — trigram similarity. Returns the matched row or None."""
    try:
        res = supabase.rpc(
            "match_skill_trgm",
            {"query_name": norm_name, "sim_threshold": threshold},
        ).execute()
    except Exception as exc:
        logger.warning(
            "match_skill_trgm RPC failed for %r: %s", norm_name, exc
        )
        return None
    rows = res.data or []
    return rows[0] if rows else None


def _vector_match(
    supabase: Any, embedding: list[float], threshold: float
) -> Optional[dict]:
    """Pass 3 — pgvector cosine. Returns the matched row or None."""
    try:
        res = supabase.rpc(
            "match_skill_vector",
            {"query_embedding": embedding, "sim_threshold": threshold},
        ).execute()
    except Exception as exc:
        logger.warning("match_skill_vector RPC failed: %s", exc)
        return None
    rows = res.data or []
    return rows[0] if rows else None


def _insert_auto_skill(
    supabase: Any,
    norm_name: str,
    embedding: Optional[list[float]],
) -> Optional[str]:
    """Pass 4 — INSERT and return the id.

    Uses upsert + ignore_duplicates so a concurrent uploader who races us
    to the same skill name doesn't 23505 us — `skills.name` is UNIQUE.
    Always follow up with a SELECT to retrieve the id, because the
    upsert response is empty when the row already existed (i.e. another
    process inserted it first).
    """
    payload: dict[str, Any] = {"name": norm_name, "category": "auto"}
    if embedding is not None:
        payload["embedding"] = embedding
    try:
        supabase.table("skills").upsert(
            payload, on_conflict="name", ignore_duplicates=True
        ).execute()
    except Exception as exc:
        # Bare insert: a transient DB error here means the row almost
        # certainly didn't make it. We still try the SELECT below so a
        # racing inserter's success can still be returned.
        logger.error("auto-skill upsert failed for %r: %s", norm_name, exc)

    try:
        res = (
            supabase.table("skills")
            .select("id")
            .eq("name", norm_name)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.error(
            "auto-skill re-lookup failed for %r: %s", norm_name, exc
        )
        return None
    rows = res.data or []
    return rows[0]["id"] if rows else None


def _log_auto_insert(
    supabase: Any,
    norm_name: str,
    source: str,
    user_id: Optional[str],
) -> None:
    """Best-effort write to `analytics_events`. Never raises."""
    try:
        supabase.table("analytics_events").insert(
            {
                "event": "skill_auto_inserted",
                "properties": {"skill_name": norm_name, "source": source},
                "user_id": user_id,
            }
        ).execute()
    except Exception as exc:  # pragma: no cover - logging path
        logger.debug(
            "analytics_events insert failed for %r: %s", norm_name, exc
        )


async def resolve_skill_id(
    skill_name: str,
    *,
    supabase: Any,
    cache: Optional[dict[str, str]] = None,
    source: str = "cv_upload",
    user_id: Optional[str] = None,
    trgm_threshold: float = DEFAULT_TRGM_THRESHOLD,
    vector_threshold: float = DEFAULT_VECTOR_THRESHOLD,
) -> Optional[str]:
    """Resolve `skill_name` to a canonical `skills.id`.

    Args:
        skill_name: Raw skill text from the LLM parser or admin input.
        supabase: Initialised supabase-py client.
        cache: Optional per-batch dict. Keyed by normalized name → id.
            Pass the same dict across a batch (a single CV upload, an
            admin canonicalize call) so duplicates short-circuit and the
            embedding API isn't called twice for the same input.
        source: Goes into the analytics event when a new skill is
            inserted. Free-form, but use one of the values listed in
            docs (cv_upload, job_create, admin_canonicalize).
        user_id: Goes into the analytics event. Optional — admin
            canonicalization passes None.
        trgm_threshold / vector_threshold: Override the global defaults
            (mainly for the validation script and tuning experiments).

    Returns:
        The canonical `skills.id` (UUID as str), or None if the input
        is empty after normalization.
    """
    norm = _normalize(skill_name)
    if not norm:
        return None
    if cache is not None and norm in cache:
        return cache[norm]

    def _cache_and_return(sid: Optional[str]) -> Optional[str]:
        if cache is not None and sid is not None:
            cache[norm] = sid
        return sid

    # Pass 1 — exact match.
    hit = _exact_match(supabase, norm)
    if hit is not None:
        sid = hit["id"]
        if hit.get("canonical_of"):
            sid = _follow_canonical(supabase, sid)
        return _cache_and_return(sid)

    # Pass 2 — trigram similarity.
    hit = _trgm_match(supabase, norm, trgm_threshold)
    if hit is not None:
        return _cache_and_return(_follow_canonical(supabase, hit["id"]))

    # Pass 3 — vector similarity. Embedding is also reused for the
    # Pass 4 insert below if we miss, so generate it once.
    embedding: Optional[list[float]] = None
    try:
        embedding = await generate_embedding(norm)
    except Exception as exc:
        logger.warning(
            "embedding generation failed for %r (resolver continues "
            "without Pass 3 + stores skill without embedding): %s",
            norm, exc,
        )

    if embedding is not None:
        hit = _vector_match(supabase, embedding, vector_threshold)
        if hit is not None:
            return _cache_and_return(_follow_canonical(supabase, hit["id"]))

    # Pass 4 — auto-insert. Best-effort analytics event afterwards.
    new_id = _insert_auto_skill(supabase, norm, embedding)
    if new_id is None:
        return None
    _log_auto_insert(supabase, norm, source, user_id)
    return _cache_and_return(new_id)


async def resolve_skill_ids(
    skill_names: list[str],
    *,
    supabase: Any,
    source: str = "cv_upload",
    user_id: Optional[str] = None,
) -> list[str]:
    """Resolve a batch of names; deduplicate by canonical id; preserve
    first-occurrence order.

    Used by /cv/upload and admin endpoints — the typical call shape.
    Internally builds a per-batch cache so e.g. ["postgres", "Postgres",
    "PostgreSQL"] becomes one embedding call and one returned id.
    """
    cache: dict[str, str] = {}
    seen: set[str] = set()
    out: list[str] = []
    for name in skill_names:
        sid = await resolve_skill_id(
            name,
            supabase=supabase,
            cache=cache,
            source=source,
            user_id=user_id,
        )
        if sid is None or sid in seen:
            continue
        seen.add(sid)
        out.append(sid)
    return out
