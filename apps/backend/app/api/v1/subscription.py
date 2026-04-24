"""Subscription and payment routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.deps import get_current_user_id, get_supabase
from app.schemas.subscription import PaymentInitiate, PaymentInitiateResponse, Subscription
from app.services.dpo_pay import create_payment_token as create_dpo_payment_token
from app.services.lenco_pay import create_payment_token as create_lenco_payment_token

router = APIRouter(prefix="/subscription", tags=["Subscription"])

TIER_PRICING = {
    "mwezi": {"amount": 7900, "matches_limit": 25},
    "bwino": {"amount": 19900, "matches_limit": 999999},
}


@router.get("", response_model=Subscription)
async def get_subscription(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    """Return current user's subscription."""
    result = (
        supabase.table("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    return Subscription(**result.data[0])


@router.post("/pay", response_model=PaymentInitiateResponse)
async def initiate_payment(
    body: PaymentInitiate,
    user_id: str = Depends(get_current_user_id),
    settings: Settings = Depends(get_settings),
    supabase=Depends(get_supabase),
):
    """Initiate mobile money payment for a subscription upgrade."""
    tier = body.tier.value
    if tier not in TIER_PRICING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only mwezi and bwino plans are payable",
        )

    plan = TIER_PRICING[tier]
    amount = int(plan["amount"])
    description = f"Zed CV {tier.capitalize()} subscription"

    provider = settings.payment_provider
    if provider == "lenco":
        payment = await create_lenco_payment_token(
            amount, body.phone, description, body.payment_method
        )
    else:
        provider = "dpo_pay"
        payment = await create_dpo_payment_token(amount, body.phone, description)

    sub_result = (
        supabase.table("subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    subscription_id = sub_result.data[0]["id"] if sub_result.data else None

    webhook_extra: dict = {}
    if provider == "lenco" and payment.get("lenco_collection_id"):
        webhook_extra["lenco_collection_id"] = payment["lenco_collection_id"]

    supabase.table("payments").insert(
        {
            "user_id": user_id,
            "subscription_id": subscription_id,
            "amount": amount,
            "currency": "ZMW",
            "payment_method": body.payment_method.value,
            "provider": provider,
            "provider_ref": payment["provider_ref"],
            "status": "pending",
            "webhook_data": {"requested_tier": tier, **webhook_extra},
        }
    ).execute()

    return PaymentInitiateResponse(
        transaction_token=payment["transaction_token"],
        payment_url=payment["payment_url"],
        status="redirect",
    )
