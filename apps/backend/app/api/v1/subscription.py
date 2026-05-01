"""Subscription and payment routes."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.deps import get_supabase, get_current_user_id
from app.core.rate_limit import limiter
from app.schemas.subscription import (
    Subscription,
    PaymentInitiate,
    PaymentInitiateResponse,
)

router = APIRouter(prefix="/subscription", tags=["Subscription"])

TIER_LIMITS = {"free": 5, "starter": 25, "professional": 125, "super_standard": 99999}
TIER_PRICES_NGWEE = {"starter": 12500, "professional": 25000, "super_standard": 50000}


@router.get("", response_model=Subscription)
async def get_subscription(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    result = (
        supabase.table("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No subscription found")

    sub = result.data
    return Subscription(
        tier=sub["tier"],
        matches_used=sub["matches_used"],
        matches_limit=sub["matches_limit"],
        active=sub["status"] == "active",
        expires_at=sub.get("current_period_end"),
    )


@router.post("/pay", response_model=PaymentInitiateResponse)
@limiter.limit("3/minute")
async def initiate_payment(
    request: Request,
    body: PaymentInitiate,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    tier_value = body.tier.value if hasattr(body.tier, "value") else body.tier
    if tier_value not in TIER_PRICES_NGWEE:
        raise HTTPException(
            status_code=422,
            detail="Invalid tier. Choose starter, professional, or super_standard.",
        )

    amount_ngwee = TIER_PRICES_NGWEE[tier_value]

    # Get or verify subscription exists
    sub_result = (
        supabase.table("subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not sub_result.data:
        raise HTTPException(status_code=404, detail="No subscription record found")

    subscription_id = sub_result.data["id"]

    # Determine payment provider from payment_method
    provider = "lenco" if body.payment_method.startswith("lenco") else "dpo_pay"

    # Create payment record
    payment_result = supabase.table("payments").insert({
        "user_id": user_id,
        "subscription_id": subscription_id,
        "amount": amount_ngwee,
        "currency": "ZMW",
        "payment_method": f"{body.payment_method}_money",
        "provider": provider,
        "status": "pending",
    }).execute()

    if not payment_result.data:
        raise HTTPException(status_code=500, detail="Failed to create payment record")

    payment_id = payment_result.data[0]["id"]
    amount_zmw = amount_ngwee / 100
    tier_name = {
        "starter": "Starter",
        "professional": "Professional",
        "super_standard": "Super Standard",
    }.get(tier_value, "Plan")

    # Route to the appropriate payment provider
    if provider == "lenco":
        from app.services.lenco import create_lenco_payment
        try:
            lenco_result = await create_lenco_payment(
                amount_zmw=amount_zmw,
                phone=body.phone,
                description=f"Zed CV {tier_name} Plan - 1 Month",
                payment_ref=payment_id,
            )
            supabase.table("payments").update({
                "provider_ref": lenco_result["transaction_id"],
            }).eq("id", payment_id).execute()

            return PaymentInitiateResponse(
                message=f"Payment of K{int(amount_zmw)} initiated via Lenco. "
                        f"Check your phone for a prompt.",
                transaction_id=payment_id,
            )
        except ValueError as e:
            logging.warning(f"Lenco payment failed: {e}")
            return PaymentInitiateResponse(
                message=f"Payment of K{int(amount_zmw)} recorded. {str(e)}",
                transaction_id=payment_id,
            )
    else:
        # DPO Pay (default)
        from app.services.dpo_pay import create_payment_token
        try:
            dpo_result = await create_payment_token(
                amount_zmw=amount_zmw,
                phone=body.phone,
                description=f"Zed CV {tier_name} Plan - 1 Month",
                payment_ref=payment_id,
            )
            supabase.table("payments").update({
                "provider_ref": dpo_result["token"],
            }).eq("id", payment_id).execute()

            logging.info(
                f"Payment token created: user={user_id}, tier={tier_value}, "
                f"amount=K{amount_zmw}, token={dpo_result['token']}"
            )

            return PaymentInitiateResponse(
                message=f"Payment of K{int(amount_zmw)} initiated. "
                        f"Complete payment at the redirect URL or check your phone for a prompt.",
                transaction_id=payment_id,
            )

        except ValueError as e:
            logging.warning(f"DPO Pay token creation failed: {e}")
            return PaymentInitiateResponse(
                message=f"Payment of K{int(amount_zmw)} recorded. {str(e)}",
                transaction_id=payment_id,
            )
