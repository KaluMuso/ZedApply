from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class SubscriptionTier(str, Enum):
    free = "free"
    starter = "starter"
    professional = "professional"
    super_standard = "super_standard"

class PaymentMethod(str, Enum):
    mtn_money = "mtn_money"
    airtel_money = "airtel_money"


# super_standard uses 99999 as a numeric "unlimited" sentinel so existing
# quota arithmetic doesn't need a NULL branch (matches migration 005).
TIER_LIMITS: dict[str, int] = {
    "free": 10,
    "starter": 50,
    "professional": 125,
    "super_standard": 99999,
}

# Prices in ngwee (1 ZMW = 100 ngwee).
TIER_PRICES: dict[str, int] = {
    "free": 0,
    "starter": 12500,
    "professional": 25000,
    "super_standard": 50000,
}


class Subscription(BaseModel):
    tier: SubscriptionTier
    matches_used: int = 0
    matches_limit: int = 10
    active: bool = True
    expires_at: Optional[datetime] = None

class PaymentInitiate(BaseModel):
    tier: SubscriptionTier
    payment_method: str = Field(..., description="mtn or airtel")
    phone: str = Field(..., pattern=r"^\+260[0-9]{9}$")

class PaymentInitiateResponse(BaseModel):
    message: str
    transaction_id: str
