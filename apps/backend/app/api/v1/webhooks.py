"""Payment webhooks (DPO + Lenco)."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.deps import get_supabase
from app.services.dpo_pay import verify_payment as verify_dpo_payment
from app.services.payment_fulfillment import (
    apply_subscription_upgrade,
    find_payment_for_lenco,
    verify_lenco_signature,
)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/dpo")
async def dpo_webhook(
    request: Request,
    supabase=Depends(get_supabase),
):
    """Handle DPO Pay payment confirmation webhook.

    DPO sends XML payloads. We verify the transaction and update subscription.
    """
    raw = await request.body()
    root = ET.fromstring(raw.decode("utf-8", errors="ignore"))
    lookup = {elem.tag.split("}")[-1]: (elem.text or "").strip() for elem in root.iter()}

    transaction_token = (
        lookup.get("TransactionToken")
        or lookup.get("TransToken")
        or lookup.get("Token")
        or ""
    )
    if not transaction_token:
        return {"status": "ignored", "reason": "missing token"}

    verification = await verify_dpo_payment(transaction_token)
    payment_status = verification["status"]

    payment_result = (
        supabase.table("payments")
        .select("id,user_id,amount,provider,status,webhook_data")
        .eq("provider_ref", transaction_token)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not payment_result.data:
        return {"status": "ignored", "reason": "payment not found"}

    payment = payment_result.data[0]
    prior_status = payment.get("status")
    update_payload: dict[str, Any] = {
        "status": payment_status,
        "webhook_data": {"dpo_payload": lookup, "verification": verification},
    }
    if payment_status == "completed":
        update_payload["completed_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("payments").update(update_payload).eq("id", payment["id"]).execute()

    if payment_status != "completed":
        return {"status": "processed", "payment_status": payment_status}

    if prior_status == "completed":
        return {"status": "processed", "payment_status": "completed", "note": "already completed"}

    requested_tier = (payment.get("webhook_data") or {}).get("requested_tier", "mwezi")
    await apply_subscription_upgrade(payment["user_id"], requested_tier, supabase)

    return {"status": "processed", "payment_status": "completed"}


@router.post("/lenco")
async def lenco_webhook(request: Request, supabase=Depends(get_supabase)):
    """Handle Lenco webhook events (collections).

    Signature verification follows Lenco docs:
    webhook_hash_key = SHA256(api_token); signature = HMAC-SHA512(raw_body, webhook_hash_key)
    """
    raw = await request.body()
    signature = request.headers.get("x-lenco-signature") or request.headers.get("X-Lenco-Signature")

    if not verify_lenco_signature(raw, signature):
        return Response(status_code=status.HTTP_401_UNAUTHORIZED)

    try:
        event = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {"status": "ignored", "reason": "invalid json"}

    event_name = str(event.get("event") or "")
    data = event.get("data") or {}
    if not isinstance(data, dict):
        return {"status": "ignored", "reason": "invalid payload"}

    reference = str(data.get("reference") or "").strip()
    lenco_reference = str(data.get("lencoReference") or "").strip()
    payment = find_payment_for_lenco(reference, lenco_reference, supabase)
    if not payment:
        return {"status": "ignored", "reason": "payment not found"}

    prior_status = payment.get("status")

    collection_status = str(data.get("status") or "").lower()
    success_events = {"collection.successful", "collection.settled"}
    failure_events = {"collection.failed"}

    new_status: str | None = None
    if event_name in success_events and collection_status == "successful":
        new_status = "completed"
    elif event_name in failure_events or collection_status == "failed":
        new_status = "failed"

    if new_status is None:
        supabase.table("payments").update({"webhook_data": {"lenco_event": event}}).eq("id", payment["id"]).execute()
        return {"status": "acknowledged", "event": event_name}

    update_payload: dict[str, Any] = {
        "status": new_status,
        "webhook_data": {"lenco_event": event},
    }
    if new_status == "completed":
        update_payload["completed_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("payments").update(update_payload).eq("id", payment["id"]).execute()

    if new_status != "completed":
        return {"status": "processed", "payment_status": new_status}

    if prior_status == "completed":
        return {"status": "processed", "payment_status": "completed", "note": "already completed"}

    requested_tier = (payment.get("webhook_data") or {}).get("requested_tier", "mwezi")
    await apply_subscription_upgrade(payment["user_id"], requested_tier, supabase)
    return {"status": "processed", "payment_status": "completed"}
