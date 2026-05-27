"""Employer → candidate contact requests with WhatsApp + email consent."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.employer import ContactChannel

logger = logging.getLogger(__name__)

CONSENT_TIMEOUT_DAYS = 7


def _first_row(data: Any) -> dict[str, Any] | None:
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


def _contact_status(row: dict[str, Any]) -> str:
    consented = row.get("candidate_consented")
    if consented is True:
        return "consented"
    if consented is False:
        return "declined"
    expires = row.get("expires_at")
    if expires:
        try:
            exp = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc) and row.get("sent_at"):
                return "expired"
        except (TypeError, ValueError):
            pass
    if row.get("sent_at"):
        return "pending"
    return "draft"


async def send_consent_notifications(
    supabase: Client,
    *,
    request_id: str,
    employer_name: str,
    candidate_user_id: str,
    message_text: str,
    channel: ContactChannel,
) -> None:
    from app.services.email import send_employer_consent_email
    from app.services.whatsapp import send_whatsapp_message

    user_res = (
        supabase.table("users")
        .select("id, phone, email, full_name, whatsapp_number, whatsapp_verified")
        .eq("id", candidate_user_id)
        .limit(1)
        .execute()
    )
    candidate = _first_row(user_res.data)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    snippet = message_text.strip()[:200]
    wa_body = (
        f"*{employer_name}* wants to contact you about a role on Zed Apply.\n\n"
        f"\"{snippet}\"\n\n"
        "Reply *YES* to share your phone and email with them.\n"
        "Reply *NO* to decline."
    )

    phone = None
    if candidate.get("whatsapp_verified") and candidate.get("whatsapp_number"):
        phone = str(candidate["whatsapp_number"])
    elif candidate.get("phone"):
        phone = str(candidate["phone"])

    if channel in (ContactChannel.whatsapp, ContactChannel.both) and phone:
        try:
            await send_whatsapp_message(phone, wa_body)
        except Exception as exc:
            logger.error("Employer consent WhatsApp failed: %s", exc)
            if channel == ContactChannel.whatsapp:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="WhatsApp delivery is temporarily unavailable",
                ) from exc

    email = candidate.get("email")
    if channel in (ContactChannel.email, ContactChannel.both) and email:
        await send_employer_consent_email(
            str(email),
            employer_name=employer_name,
            message_snippet=snippet,
        )


async def create_contact_request(
    supabase: Client,
    *,
    employer_id: str,
    employer_name: str,
    initiator_user_id: str,
    candidate_user_id: str,
    message_text: str,
    channel: ContactChannel,
) -> dict[str, Any]:
    cand = (
        supabase.table("users")
        .select("id, profile_visible_to_employers, is_active")
        .eq("id", candidate_user_id)
        .limit(1)
        .execute()
    )
    row = _first_row(cand.data)
    if not row or not row.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    if not row.get("profile_visible_to_employers", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate has not opted in to employer visibility",
        )

    dup = (
        supabase.table("candidate_contact_requests")
        .select("id")
        .eq("employer_id", employer_id)
        .eq("candidate_user_id", candidate_user_id)
        .is_("candidate_consented", "null")
        .execute()
    )
    if dup.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending contact request already exists for this candidate",
        )

    now = datetime.now(timezone.utc).isoformat()
    ins = supabase.table("candidate_contact_requests").insert(
        {
            "employer_id": employer_id,
            "candidate_user_id": candidate_user_id,
            "initiated_by_user_id": initiator_user_id,
            "message_text": message_text.strip(),
            "channel": channel.value,
            "sent_at": now,
        }
    ).execute()
    request = _first_row(ins.data)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create contact request",
        )

    await send_consent_notifications(
        supabase,
        request_id=str(request["id"]),
        employer_name=employer_name,
        candidate_user_id=candidate_user_id,
        message_text=message_text,
        channel=channel,
    )
    return request


async def resolve_consent_reply(
    supabase: Client,
    *,
    phone: str,
    reply: str,
) -> dict[str, Any] | None:
    """Handle YES/NO WhatsApp replies for pending employer contact requests."""
    normalized = reply.strip().upper()
    if normalized not in ("YES", "NO"):
        return None

    user_res = (
        supabase.table("users")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .execute()
    )
    user = _first_row(user_res.data)
    if not user:
        return None

    pending = (
        supabase.table("candidate_contact_requests")
        .select("*")
        .eq("candidate_user_id", user["id"])
        .is_("candidate_consented", "null")
        .not_.is_("sent_at", "null")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    req = _first_row(pending.data)
    if not req:
        return None

    now = datetime.now(timezone.utc).isoformat()
    consented = normalized == "YES"
    supabase.table("candidate_contact_requests").update(
        {
            "candidate_consented": consented,
            "candidate_responded_at": now,
        }
    ).eq("id", req["id"]).execute()

    from app.services.whatsapp import send_whatsapp_message

    if consented:
        await send_whatsapp_message(
            phone,
            "Thanks — your contact details have been shared with the employer on Zed Apply.",
        )
    else:
        await send_whatsapp_message(
            phone,
            "Understood — we won't share your details with that employer.",
        )

    return {**req, "candidate_consented": consented, "candidate_responded_at": now}


def enrich_contact_row(
    row: dict[str, Any],
    candidate: dict[str, Any] | None,
) -> dict[str, Any]:
    status_label = _contact_status(row)
    out = {
        "id": row["id"],
        "candidate_user_id": row["candidate_user_id"],
        "message_text": row["message_text"],
        "channel": row["channel"],
        "sent_at": row.get("sent_at"),
        "candidate_responded_at": row.get("candidate_responded_at"),
        "candidate_consented": row.get("candidate_consented"),
        "status": status_label,
        "candidate_phone": None,
        "candidate_email": None,
        "candidate_name": None,
    }
    if status_label == "consented" and candidate:
        out["candidate_phone"] = candidate.get("phone")
        out["candidate_email"] = candidate.get("email")
        out["candidate_name"] = candidate.get("full_name")
    elif status_label in ("declined", "expired"):
        pass
    elif not candidate:
        out["status"] = "unavailable"
    return out
