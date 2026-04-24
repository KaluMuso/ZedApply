"""Lenco payment adapter (Access API v2 — mobile money collections).

Official flow aligns with Lenco docs / SDK: POST `collections/mobile-money` with
`amount`, `currency`, `reference`, `phone`, `operator`, `country`; poll or use webhooks.
See: https://lenco-api.readme.io/ (v2 collections).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.schemas.subscription import PaymentMethod


def _unwrap_lenco_payload(body: dict) -> dict:
    """Lenco responses are often wrapped as {status, message, data: {...}}."""
    data = body.get("data")
    if isinstance(data, dict):
        return data
    return body


def _phone_msisdn(phone_e164: str) -> str:
    """Strip + for Lenco MSISDN (e.g. +260… -> 260…)."""
    return phone_e164.replace("+", "").replace(" ", "")


def _operator_for_payment_method(method: PaymentMethod) -> str:
    if method == PaymentMethod.mtn_money:
        return "mtn"
    if method == PaymentMethod.airtel_money:
        return "airtel"
    raise ValueError("Unsupported payment method for Lenco mobile money")


async def create_payment_token(
    amount_ngwee: int,
    phone: str,
    description: str,
    payment_method: PaymentMethod,
) -> dict[str, str]:
    """Initiate a Lenco mobile-money collection (v2)."""
    settings = get_settings()
    if not settings.lenco_secret_key:
        raise ValueError("Lenco is not configured")

    reference = f"zedcv-{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{secrets.token_hex(4)}"
    amount_major = f"{amount_ngwee / 100:.2f}"
    operator = _operator_for_payment_method(payment_method)

    payload: dict = {
        "amount": amount_major,
        "currency": "ZMW",
        "reference": reference,
        "phone": _phone_msisdn(phone),
        "operator": operator,
        "country": "ZM",
    }
    if description:
        payload["metadata"] = {"description": description[:500]}

    headers = {
        "Authorization": f"Bearer {settings.lenco_secret_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    path = settings.lenco_checkout_path.strip("/")
    url = f"{settings.lenco_api_url.rstrip('/')}/{path}"

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, json=payload, headers=headers)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Lenco response was not a JSON object")

    data = _unwrap_lenco_payload(body)
    collection_id = str(data.get("id") or "").strip()
    ref = str(data.get("reference") or reference).strip()
    auth_url = str(data.get("authorizationUrl") or data.get("authorization_url") or "").strip()

    base = settings.app_public_url.rstrip("/")
    payment_url = auth_url or f"{base}/profile?payment=pending&ref={ref}"

    if not ref:
        raise ValueError("Lenco response missing collection reference")

    return {
        "transaction_token": ref,
        "payment_url": payment_url,
        "provider_ref": ref,
        "lenco_collection_id": collection_id,
    }


async def verify_payment(transaction_token: str) -> dict[str, str]:
    """Requery a collection by merchant reference or Lenco collection id."""
    settings = get_settings()
    if not settings.lenco_secret_key:
        raise ValueError("Lenco is not configured")

    headers = {
        "Authorization": f"Bearer {settings.lenco_secret_key}",
        "Accept": "application/json",
    }
    base = settings.lenco_api_url.rstrip("/")
    status_prefix = settings.lenco_verify_status_prefix.strip("/")
    by_id_path = settings.lenco_verify_path.strip("/")

    urls = [
        f"{base}/{status_prefix}/{transaction_token}",
        f"{base}/{by_id_path}/{transaction_token}",
    ]

    last_exc: Exception | None = None
    body: dict | None = None
    async with httpx.AsyncClient(timeout=20.0) as client:
        for url in urls:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 404:
                    continue
                response.raise_for_status()
                parsed = response.json()
                if isinstance(parsed, dict):
                    body = parsed
                    break
            except (httpx.HTTPError, ValueError) as e:
                last_exc = e
                continue

    if body is None:
        raise ValueError(last_exc and str(last_exc) or "Lenco verify failed")

    data = _unwrap_lenco_payload(body)
    raw_status = str(data.get("status") or data.get("payment_status") or "").lower()
    if raw_status in ("success", "successful", "completed", "paid", "settled"):
        status = "completed"
    elif raw_status in ("failed", "cancelled", "reversed", "declined"):
        status = "failed"
    else:
        status = "pending"
    return {
        "status": status,
        "result_code": str(data.get("code") or ""),
        "result_message": str(data.get("message") or ""),
        "transaction_ref": str(data.get("reference") or transaction_token),
    }
