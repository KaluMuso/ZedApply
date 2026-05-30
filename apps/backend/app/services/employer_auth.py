"""Employer account registration and team invites."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.core.config import get_settings
from app.schemas.employer import EmployerRegisterBody, EmployerUserRole

logger = logging.getLogger(__name__)


def _first_row(data: Any) -> dict[str, Any] | None:
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


async def register_employer(
    supabase: Client,
    *,
    user_id: str,
    body: EmployerRegisterBody,
) -> dict[str, Any]:
    """Create employer + owner seat atomically."""
    existing = (
        supabase.table("employer_users")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already belong to an employer account",
        )

    emp_insert = supabase.table("employers").insert(
        {
            "company_name": body.company_name.strip(),
            "industry": body.industry,
            "size_band": body.size_band.value if body.size_band else None,
            "website": body.website,
        }
    ).execute()
    employer = _first_row(emp_insert.data)
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create employer",
        )

    employer_id = employer["id"]
    now = datetime.now(timezone.utc).isoformat()
    seat_insert = supabase.table("employer_users").insert(
        {
            "employer_id": employer_id,
            "user_id": user_id,
            "role": EmployerUserRole.owner.value,
            "accepted_at": now,
        }
    ).execute()
    if not _first_row(seat_insert.data):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not link owner seat",
        )

    logger.info("Employer registered id=%s user=%s", employer_id, user_id)
    return employer


async def invite_team_member(
    supabase: Client,
    *,
    employer_id: str,
    inviter_user_id: str,
    email: str,
    role: EmployerUserRole,
) -> dict[str, Any]:
    """Invite by email — creates pending seat; sends Resend invite."""
    from app.services.email import send_employer_invite_email

    inviter_role = (
        supabase.table("employer_users")
        .select("role")
        .eq("employer_id", employer_id)
        .eq("user_id", inviter_user_id)
        .limit(1)
        .execute()
    )
    seat = _first_row(inviter_role.data)
    if not seat or seat.get("role") not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can invite teammates",
        )

    user_lookup = (
        supabase.table("users")
        .select("id, email")
        .eq("email", email.strip().lower())
        .limit(1)
        .execute()
    )
    invitee = _first_row(user_lookup.data)
    invitee_id = invitee["id"] if invitee else None

    dup = (
        supabase.table("employer_users")
        .select("id")
        .eq("employer_id", employer_id)
        .eq("invite_email", email.strip().lower())
        .limit(1)
        .execute()
    )
    if dup.data or (
        invitee_id
        and supabase.table("employer_users")
        .select("id")
        .eq("employer_id", employer_id)
        .eq("user_id", invitee_id)
        .limit(1)
        .execute()
        .data
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This person is already invited or on the team",
        )

    if not invitee_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No Zed Apply account for this email yet. Ask them to sign up, "
                "then invite again."
            ),
        )

    token = secrets.token_urlsafe(24)
    row: dict[str, Any] = {
        "employer_id": employer_id,
        "user_id": invitee_id,
        "role": role.value,
        "invite_email": email.strip().lower(),
    }

    ins = supabase.table("employer_users").insert(row).execute()
    new_seat = _first_row(ins.data)
    if not new_seat:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invite failed",
        )

    emp = (
        supabase.table("employers")
        .select("company_name")
        .eq("id", employer_id)
        .limit(1)
        .execute()
    )
    company = (_first_row(emp.data) or {}).get("company_name", "your team")
    settings = get_settings()
    invite_url = f"{settings.app_url}/employer/team?invite={token}"
    await send_employer_invite_email(email, company_name=company, invite_url=invite_url)
    return new_seat
