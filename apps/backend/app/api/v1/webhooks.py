"""Webhook handlers for WAHA WhatsApp and DPO Pay."""
import logging
from fastapi import APIRouter, Request, Depends
from app.core.deps import get_supabase
from app.services.whatsapp import send_whatsapp_message, send_match_digest

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

COMMANDS = {"hi": "welcome", "hello": "welcome", "menu": "menu", "help": "menu",
            "matches": "matches", "jobs": "matches", "cv": "cv_info", "plan": "subscription", "upgrade": "subscription", "more": "more_matches"}


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, supabase=Depends(get_supabase)):
    body = await request.json()
    if body.get("event") != "message":
        return {"status": "ignored"}

    payload = body.get("payload", {})
    message_body = payload.get("body", "").strip().lower()
    from_number = payload.get("from", "").replace("@c.us", "")
    if not from_number or not message_body:
        return {"status": "ignored"}

    phone = f"+{from_number}"
    command = COMMANDS.get(message_body, "unknown")

    if command == "welcome":
        await send_whatsapp_message(phone, "*Welcome to Zed CV!*\n\nI help you find jobs that match your skills in Zambia.\n\nCommands:\n*matches* - See your job matches\n*cv* - Check your CV status\n*plan* - View subscription info\n*help* - Show this menu")
    elif command == "menu":
        await send_whatsapp_message(phone, "*Zed CV Menu*\n\n*matches* - See your job matches\n*cv* - Check CV status\n*plan* - View your plan\n*upgrade* - Upgrade plan")
    elif command == "matches":
        user = supabase.table("users").select("id").eq("phone", phone).limit(1).execute()
        if not user.data:
            await send_whatsapp_message(phone, "You haven't signed up yet! Visit zedcv.com to create your account.")
        else:
            mr = supabase.table("matches").select("*, jobs(title, company)").eq("user_id", user.data[0]["id"]).order("score", desc=True).limit(5).execute()
            if mr.data:
                await send_match_digest(phone, [{"title": m.get("jobs", {}).get("title", "?"), "company": m.get("jobs", {}).get("company", "?"), "score": m["score"], "matched_skills": m.get("matched_skills", [])} for m in mr.data])
            else:
                await send_whatsapp_message(phone, "No matches yet. Upload your CV at zedcv.com and we'll start matching!")
    elif command == "subscription":
        user = supabase.table("users").select("id, subscription_tier").eq("phone", phone).limit(1).execute()
        if user.data:
            tier = user.data[0]["subscription_tier"]
            info = {"mwana": "Mwana (Free) - 5 matches/month", "mwezi": "Mwezi (K79/mo) - 25 matches/month", "bwino": "Bwino (K199/mo) - Unlimited"}
            await send_whatsapp_message(phone, f"*Your Plan:* {info.get(tier, tier)}\n\nVisit zedcv.com/pricing to upgrade.")
    elif message_body.isdigit() and 1 <= int(message_body) <= 5:
        await send_whatsapp_message(phone, f"Opening job #{message_body} details...\nVisit zedcv.com/matches for full details.")
    else:
        await send_whatsapp_message(phone, "I didn't understand that. Reply *help* to see available commands.")
    return {"status": "ok"}


@router.post("/dpo")
async def dpo_webhook(request: Request, supabase=Depends(get_supabase)):
    """Process DPO Pay webhook — verify payment and upgrade subscription."""
    from app.services.dpo_pay import parse_dpo_webhook_xml, verify_payment

    body = await request.body()
    logging.info(f"DPO webhook received: {body[:500]}")

    parsed = parse_dpo_webhook_xml(body)
    if not parsed or not parsed.get("transaction_token"):
        logging.warning("DPO webhook: missing or unparseable payload")
        return {"status": "ignored"}

    # Verify the payment with DPO
    try:
        verification = await verify_payment(parsed["transaction_token"])
    except ValueError as e:
        logging.error(f"DPO verification failed: {e}")
        return {"status": "verification_failed"}

    # Find payment record by provider_ref (transaction token)
    payment_result = (
        supabase.table("payments")
        .select("*, subscriptions(id, user_id, tier)")
        .eq("provider_ref", parsed["transaction_token"])
        .limit(1)
        .execute()
    )

    # If no match by token, try by payment ID in company_ref
    if not payment_result.data and parsed.get("company_ref"):
        payment_result = (
            supabase.table("payments")
            .select("*, subscriptions(id, user_id, tier)")
            .eq("id", parsed["company_ref"])
            .limit(1)
            .execute()
        )

    if not payment_result.data:
        logging.warning(f"DPO webhook: no matching payment for token={parsed['transaction_token']}")
        return {"status": "no_matching_payment"}

    payment = payment_result.data[0]
    payment_id = payment["id"]
    user_id = payment["user_id"]

    if verification["is_paid"]:
        from datetime import datetime, timedelta, timezone

        # Update payment as completed
        supabase.table("payments").update({
            "status": "completed",
            "provider_ref": parsed.get("transaction_ref", parsed["transaction_token"]),
            "webhook_data": parsed,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", payment_id).execute()

        # Determine tier from payment amount (ngwee)
        amount_ngwee = payment["amount"]
        new_tier = "mwezi" if amount_ngwee <= 10000 else "bwino"
        new_limit = 25 if new_tier == "mwezi" else 999999
        now = datetime.now(timezone.utc)

        # Upgrade subscription
        supabase.table("subscriptions").update({
            "tier": new_tier,
            "status": "active",
            "matches_limit": new_limit,
            "matches_used": 0,
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
        }).eq("user_id", user_id).execute()

        # Update user's subscription_tier field
        supabase.table("users").update({
            "subscription_tier": new_tier,
        }).eq("id", user_id).execute()

        # Send WhatsApp confirmation
        user = supabase.table("users").select("phone").eq("id", user_id).single().execute()
        if user.data:
            tier_name = "Mwezi (K79/mo)" if new_tier == "mwezi" else "Bwino (K199/mo)"
            try:
                await send_whatsapp_message(
                    user.data["phone"],
                    f"*Zed CV - Payment Confirmed!*\n\n"
                    f"Your payment of K{amount_ngwee // 100} has been received.\n"
                    f"You are now on the *{tier_name}* plan.\n\n"
                    f"Reply *matches* to see your job matches!"
                )
            except Exception as e:
                logging.error(f"Failed to send payment confirmation WhatsApp: {e}")

        logging.info(f"Payment completed: user={user_id}, tier={new_tier}")
        return {"status": "completed"}

    else:
        # Payment failed or declined
        supabase.table("payments").update({
            "status": "failed",
            "webhook_data": parsed,
        }).eq("id", payment_id).execute()

        logging.info(f"Payment failed: user={user_id}, code={verification['result_code']}")
        return {"status": "failed"}
