"""Auth routes — OTP via WhatsApp."""
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from app.core.config import get_settings, Settings
from app.core.deps import get_supabase
from app.core.rate_limit import limiter
from app.schemas.auth import OTPRequest, OTPVerify, AuthTokens
from app.services.whatsapp import send_whatsapp_otp

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/otp/request")
@limiter.limit("3/minute")
async def request_otp(request: Request, body: OTPRequest, settings: Settings = Depends(get_settings), supabase=Depends(get_supabase)):
    recent = (
        supabase.table("otp_codes").select("created_at").eq("phone", body.phone)
        .gte("created_at", (datetime.now(timezone.utc) - timedelta(seconds=settings.otp_cooldown_seconds)).isoformat())
        .execute()
    )
    if recent.data:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Wait {settings.otp_cooldown_seconds}s between OTP requests")

    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    supabase.table("otp_codes").insert({
        "phone": body.phone, "code": code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
    }).execute()
    await send_whatsapp_otp(body.phone, code)
    return {"message": "OTP sent to your WhatsApp"}


@router.post("/otp/verify", response_model=AuthTokens)
async def verify_otp(body: OTPVerify, settings: Settings = Depends(get_settings), supabase=Depends(get_supabase)):
    result = (
        supabase.table("otp_codes").select("*").eq("phone", body.phone).eq("code", body.code)
        .eq("verified", False).gte("expires_at", datetime.now(timezone.utc).isoformat())
        .order("created_at", desc=True).limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    otp = result.data[0]
    if otp["attempts"] >= settings.max_otp_attempts:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Too many attempts. Request a new OTP.")

    supabase.table("otp_codes").update({"verified": True}).eq("id", otp["id"]).execute()

    user_result = supabase.table("users").select("id, role").eq("phone", body.phone).limit(1).execute()
    if user_result.data:
        user_id = user_result.data[0]["id"]
    else:
        # Auto-assign superadmin role if phone matches SUPERADMIN_PHONE env var
        role = "superadmin" if (settings.superadmin_phone and body.phone == settings.superadmin_phone) else "user"
        new_user = supabase.table("users").insert({"phone": body.phone, "role": role}).execute()
        user_id = new_user.data[0]["id"]

        # Superadmin gets top tier; regular users start on free
        if role == "superadmin":
            supabase.table("subscriptions").insert({"user_id": user_id, "tier": "professional", "status": "active", "matches_limit": 125}).execute()
        else:
            supabase.table("subscriptions").insert({"user_id": user_id, "tier": "free", "status": "active", "matches_limit": 10}).execute()

    now = datetime.now(timezone.utc)
    access_token = jwt.encode({"sub": user_id, "phone": body.phone, "exp": now + timedelta(minutes=settings.jwt_expire_minutes), "iat": now}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    refresh_token = jwt.encode({"sub": user_id, "type": "refresh", "exp": now + timedelta(days=30), "iat": now}, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return AuthTokens(access_token=access_token, refresh_token=refresh_token, user_id=user_id)
