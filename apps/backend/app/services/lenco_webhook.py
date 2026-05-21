"""Lenco v2 webhook signature verification + event extraction.

Lenco signs each delivery with HMAC-SHA512 over the raw request body. The
signing key is derived from the API secret — not a separate webhook secret:

  webhook_hash_key = sha256(LENCO_API_KEY).hexdigest()
  expected_sig = hmac_sha512(webhook_hash_key, raw_body)

See https://lenco-api.readme.io/v2.0/reference/webhooks
"""
from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

logger = logging.getLogger(__name__)


def verify_lenco_signature(raw_body: bytes, signature: str, api_key: str) -> bool:
    """Verify X-Lenco-Signature using Lenco's sha256(api_key) derivation."""
    if not signature or not api_key:
        return False

    webhook_hash_key = hashlib.sha256(api_key.encode()).hexdigest()
    expected = hmac.new(
        webhook_hash_key.encode(),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    provided = signature.strip().lower()
    return hmac.compare_digest(expected, provided)


def extract_event_fields(payload: dict) -> dict[str, Any]:
    """Normalise the Lenco v2 webhook payload into the fields we care about.

    Primary events:
      - collection.successful — activate subscription (idempotent with verify-payment)
      - collection.failed — mark payment failed
      - collection.settled — settlement audit only (optional)
    """
    if not isinstance(payload, dict):
        return {}

    data = payload.get("data") or {}
    if not isinstance(data, dict):
        data = {}

    event = (payload.get("event") or "").lower()
    status = (data.get("status") or "").lower()

    is_paid = (
        event == "collection.successful"
        or status in {"successful", "success", "completed", "paid"}
        or event.endswith(".successful")
        or event.endswith(".success")
    )
    is_failed = (
        event == "collection.failed"
        or status in {"failed", "declined", "reversed"}
        or event.endswith(".failed")
    )
    is_settled = event == "collection.settled"

    return {
        "event": event or None,
        "company_ref": data.get("reference") or data.get("companyRef"),
        "lenco_ref": data.get("transactionRef") or data.get("id"),
        "status_raw": data.get("status"),
        "is_paid": is_paid,
        "is_failed": is_failed,
        "is_settled": is_settled,
        "amount_ngwee": _coerce_amount(data.get("amount")),
        "currency": (data.get("currency") or "ZMW").upper(),
        "raw": payload,
    }


def _coerce_amount(v: Any) -> int | None:
    """Coerce Lenco amount to int ngwee. Accepts int, float, or str."""
    if v is None:
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(round(v))
    if isinstance(v, str):
        try:
            return int(round(float(v)))
        except (TypeError, ValueError):
            return None
    return None
