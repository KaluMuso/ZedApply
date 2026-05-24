"""Lenco v2 collections — status verification for the inline payment widget."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


def is_lenco_production(settings: Settings | None = None) -> bool:
    """Whether Lenco collections/status calls use the production API host."""
    resolved = settings or get_settings()
    return resolved.is_lenco_production


class LencoApiError(Exception):
    """Lenco API returned an unexpected HTTP status."""

    def __init__(self, status_code: int, message: str = ""):
        self.status_code = status_code
        self.message = message
        super().__init__(message or f"Lenco API error {status_code}")


def map_lenco_payment_method(data: dict[str, Any]) -> str:
    """Map Lenco collection payload to payments.payment_method CHECK values."""
    ptype = (data.get("type") or "").lower()
    if ptype == "card":
        return "lenco_card"
    if ptype == "mobile-money":
        details = data.get("mobileMoneyDetails") or {}
        operator = (details.get("operator") or "").lower()
        if operator == "mtn":
            return "lenco_mtn_money"
        if operator == "airtel":
            return "lenco_airtel_money"
        logger.warning(
            "Lenco mobile-money operator %r unmapped; defaulting to lenco_card",
            operator,
        )
        return "lenco_card"
    logger.warning(
        "Lenco collection type %r unmapped; defaulting to lenco_card", ptype
    )
    return "lenco_card"


def amount_to_ngwee(data: dict[str, Any]) -> int | None:
    """Widget/status API amounts are decimal kwacha strings (e.g. '125.00')."""
    raw = data.get("amount")
    if raw is None:
        return None
    try:
        return int(round(float(raw) * 100))
    except (TypeError, ValueError):
        return None


def normalize_collection_status(data: dict[str, Any]) -> str:
    """Return canonical status: successful | failed | processing."""
    status = (data.get("status") or "").lower()
    if status in {"successful", "success", "completed", "paid"}:
        return "successful"
    if status in {"failed", "declined", "reversed"}:
        return "failed"
    return "processing"


async def fetch_collection_status(reference: str) -> dict[str, Any]:
    """GET /collections/status/:reference — widget verification step."""
    settings = get_settings()
    if not settings.lenco_api_key:
        raise ValueError("Lenco is not configured.")

    if is_lenco_production(settings):
        logger.debug("Lenco status lookup: production API host")

    base = settings.effective_lenco_api_url.rstrip("/")
    url = f"{base}/collections/status/{reference}"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {settings.lenco_api_key}"},
            )
        except httpx.TimeoutException as exc:
            logger.error("Lenco status request timed out ref=%s", reference)
            raise LencoApiError(504, "Lenco status request timed out") from exc
        except httpx.HTTPError as exc:
            logger.error("Lenco status HTTP error ref=%s: %s", reference, exc)
            raise LencoApiError(502, "Lenco status request failed") from exc

    if response.status_code == 404:
        raise LencoApiError(404, "Collection not found")

    if response.status_code != 200:
        logger.error(
            "Lenco status %s ref=%s body=%s",
            response.status_code,
            reference,
            response.text[:300],
        )
        raise LencoApiError(response.status_code, "Lenco status request failed")

    payload = response.json()
    if not isinstance(payload, dict):
        raise LencoApiError(502, "Invalid Lenco response")

    if payload.get("status") is False:
        message = payload.get("message") or "Lenco rejected status lookup"
        raise LencoApiError(502, message)

    data = payload.get("data")
    if not isinstance(data, dict):
        raise LencoApiError(502, "Missing Lenco collection data")

    return data
