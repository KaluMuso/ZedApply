"""Admin broadcast notification schemas."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.subscription import SubscriptionTier


class NotificationTargetAudience(str, Enum):
    all = "all"
    tier = "tier"


class AdminNotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=500)
    url: str | None = Field(None, max_length=512)
    target_audience: NotificationTargetAudience
    target_tier: SubscriptionTier | None = None
    scheduled_at: datetime | None = None

    @model_validator(mode="after")
    def tier_required_for_tier_audience(self) -> AdminNotificationCreate:
        if self.target_audience == NotificationTargetAudience.tier and self.target_tier is None:
            raise ValueError("target_tier is required when target_audience is tier")
        if self.target_audience == NotificationTargetAudience.all and self.target_tier is not None:
            raise ValueError("target_tier must be omitted when target_audience is all")
        return self


class AdminNotificationCreateResponse(BaseModel):
    campaign_id: str
    status: Literal["scheduled", "sending", "completed"]
    target_audience: NotificationTargetAudience
    target_tier: SubscriptionTier | None = None
    recipients_queued: int
    scheduled_at: datetime | None = None
    message: str


class AdminNotificationDispatchResponse(BaseModel):
    campaigns_processed: int
    recipients_sent: int
    recipients_failed: int
