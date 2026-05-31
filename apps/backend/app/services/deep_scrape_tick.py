"""Batch deep-enrich cron tick (delegates to deep_enrich pipeline)."""
from __future__ import annotations

from typing import Any

from app.services.deep_enrich import run_deep_enrich_tick

__all__ = ["run_deep_enrich_tick"]
