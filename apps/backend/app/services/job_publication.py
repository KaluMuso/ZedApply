"""Public job visibility — contact channels and admin override."""
from __future__ import annotations

from typing import Any


def _has_text(value: str | None) -> bool:
    return bool(value and str(value).strip())


def has_apply_contact(
    *,
    apply_url: str | None = None,
    apply_email: str | None = None,
    contact_phone: str | None = None,
) -> bool:
    """True when at least one direct apply channel is present."""
    return (
        _has_text(apply_url)
        or _has_text(apply_email)
        or _has_text(contact_phone)
    )


def is_admin_force_published(admin_published: bool | None) -> bool:
    return admin_published is True


def compute_contact_is_active(
    *,
    apply_url: str | None = None,
    apply_email: str | None = None,
    contact_phone: str | None = None,
    admin_published: bool | None = None,
) -> bool:
    """Scraper/admin activation: live when there is contact info or force-publish."""
    if is_admin_force_published(admin_published):
        return True
    return has_apply_contact(
        apply_url=apply_url,
        apply_email=apply_email,
        contact_phone=contact_phone,
    )


def is_publicly_listable(row: dict[str, Any]) -> bool:
    """Whether a job row may appear on public /jobs list and detail."""
    if row.get("is_active") is not True:
        return False
    if row.get("is_review_required") is True:
        return False
    if is_admin_force_published(row.get("admin_published")):
        return True
    return has_apply_contact(
        apply_url=row.get("apply_url"),
        apply_email=row.get("apply_email"),
        contact_phone=row.get("contact_phone"),
    )


PUBLIC_JOBS_OR_FILTER = (
    "apply_url.not.is.null,"
    "apply_email.not.is.null,"
    "contact_phone.not.is.null,"
    "admin_published.eq.true"
)


def apply_contact_activation(row: dict[str, Any]) -> dict[str, Any]:
    """Set ``is_active`` from contact channels + admin_published on a patch/insert dict."""
    row["is_active"] = compute_contact_is_active(
        apply_url=row.get("apply_url"),
        apply_email=row.get("apply_email"),
        contact_phone=row.get("contact_phone"),
        admin_published=row.get("admin_published"),
    )
    return row
