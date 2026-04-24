"""Lenco payment integration — stub ready for activation.

Lenco provides mobile money collections in Zambia (MTN, Airtel).
API docs: https://docs.lenco.co

This stub is wired into config but returns graceful errors until
LENCO_API_KEY is set.
"""
import logging
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def create_lenco_payment(
    amount_zmw: float,
    phone: str,
    description: str,
    payment_ref: str,
) -> dict:
    """Initiate a mobile money collection via Lenco.

    Returns: {"transaction_id": str, "status": str}
    Raises ValueError if Lenco is not configured or API fails.
    """
    settings = get_settings()

    if not settings.lenco_api_key:
        raise ValueError(
            "Lenco payments are not yet configured. "
            "Please use DPO Pay or contact support."
        )

    url = f"{settings.lenco_api_url}/collections"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.lenco_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "amount": amount_zmw,
                    "currency": "ZMW",
                    "phone_number": phone,
                    "description": description,
                    "reference": payment_ref,
                },
            )

            if response.status_code == 401:
                logger.error("Lenco API key is invalid")
                raise ValueError("Payment service configuration error.")

            if response.status_code not in (200, 201):
                logger.error(f"Lenco API error {response.status_code}: {response.text[:200]}")
                raise ValueError("Payment service temporarily unavailable.")

            data = response.json()
            return {
                "transaction_id": data.get("id") or data.get("transaction_id", ""),
                "status": data.get("status", "pending"),
            }

        except httpx.TimeoutException:
            logger.error("Lenco payment request timed out")
            raise ValueError("Payment service timed out. Please try again.")
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during Lenco payment: {e}")
            raise ValueError("Payment service is temporarily unavailable.")


async def verify_lenco_payment(transaction_id: str) -> dict:
    """Check the status of a Lenco transaction.

    Returns: {"status": str, "amount": float, "reference": str}
    """
    settings = get_settings()

    if not settings.lenco_api_key:
        raise ValueError("Lenco is not configured.")

    url = f"{settings.lenco_api_url}/collections/{transaction_id}"

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {settings.lenco_api_key}"},
        )

        if response.status_code != 200:
            raise ValueError(f"Could not verify Lenco payment: {response.status_code}")

        data = response.json()
        return {
            "status": data.get("status", "unknown"),
            "amount": data.get("amount", 0),
            "reference": data.get("reference", ""),
        }
