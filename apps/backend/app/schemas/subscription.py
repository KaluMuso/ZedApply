from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class SubscriptionTier(str, Enum):
    mwana = "mwana"
    mwezi = "mwezi"
    bwino = "bwino"

class PaymentMethod(str, Enum):
    mtn_money = "mtn_money"
    airtel_money = "airtel_money"

class Subscription(BaseModel):
    tier: SubscriptionTier
    matches_used: int = 0
    matches_limit: int = 5
    active: bool = True
    expires_at: Optional[datetime] = None

class PaymentInitiate(BaseModel):
    tier: SubscriptionTier
    payment_method: str = Field(..., description="mtn or airtel")
    phone: str = Field(..., pattern=r"^\+260[0-9]{9}$")

class PaymentInitiateResponse(BaseModel):
    message: str
    transaction_id: str
