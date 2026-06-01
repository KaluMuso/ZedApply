"""Pydantic models for Bwana platform config (admin + public)."""
from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.phone import normalize_zambian_e164_phone

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

BwanaEscalationReason = Literal["human_request", "unsatisfied", "contact_admin"]


class BwanaConfigBase(BaseModel):
    chatbot_display_name: str = Field(default="Bwana", min_length=1, max_length=64)
    operator_display_name: str = Field(
        default="ZedApply Support", min_length=1, max_length=128
    )
    support_email: str = Field(..., min_length=3, max_length=254)
    support_phone: str
    escalation_whatsapp_phone: str
    escalation_sla_hours: int = Field(default=24, ge=1, le=168)
    human_escalation_reply_template: str = Field(..., min_length=10, max_length=2000)
    unsatisfied_reply_template: str = Field(..., min_length=10, max_length=2000)
    contact_admin_reply_template: str = Field(..., min_length=10, max_length=2000)
    public_knowledge_extra: str = Field(default="", max_length=2000)
    enable_email_escalation: bool = True

    @field_validator("support_email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("support_email must be a valid email address")
        return email

    @field_validator("support_phone", "escalation_whatsapp_phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return normalize_zambian_e164_phone(value)


class BwanaConfig(BwanaConfigBase):
    """Full config row from DB."""

    id: int = 1
    updated_at: str | None = None
    updated_by: str | None = None


class BwanaConfigPatch(BaseModel):
    """Partial admin update — all fields optional."""

    chatbot_display_name: str | None = Field(default=None, min_length=1, max_length=64)
    operator_display_name: str | None = Field(default=None, min_length=1, max_length=128)
    support_email: str | None = Field(default=None, min_length=3, max_length=254)
    support_phone: str | None = None
    escalation_whatsapp_phone: str | None = None
    escalation_sla_hours: int | None = Field(default=None, ge=1, le=168)
    human_escalation_reply_template: str | None = Field(
        default=None, min_length=10, max_length=2000
    )
    unsatisfied_reply_template: str | None = Field(
        default=None, min_length=10, max_length=2000
    )
    contact_admin_reply_template: str | None = Field(
        default=None, min_length=10, max_length=2000
    )
    public_knowledge_extra: str | None = Field(default=None, max_length=2000)
    enable_email_escalation: bool | None = None

    @field_validator("support_email")
    @classmethod
    def _validate_email_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return BwanaConfigBase._validate_email(value)  # type: ignore[attr-defined]

    @field_validator("support_phone", "escalation_whatsapp_phone")
    @classmethod
    def _validate_phone_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_zambian_e164_phone(value)


class BwanaPublicConfig(BaseModel):
    chatbot_display_name: str
    support_email: str
    support_phone: str
    escalation_sla_hours: int


class BwanaConfigPreview(BaseModel):
    system_prompt_preview: str
    char_count: int
