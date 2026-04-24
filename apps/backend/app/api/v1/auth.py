"""Auth routes — OTP via WhatsApp."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError

from app.core.config import get_settings, Settings
from app.core.deps import get_supabase
from app.schemas.auth import OTPRequest, OTPVerify, AuthTokens, RefreshTokenRequest
from app.services.whatsapp import send_whatsapp_otp

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/otp/request")
async def request_otp(
    body: OTPRequest,
    settings: Settings = Depends(get_settings),
    supabase=Depends(get_supabase),
):
    """Send a 6-digit OTP to the user's WhatsApp."""
    # Rate limit: check recent OTP for this phone
    recent = (
        supabase.table("otp_codes")
        .select("created_at")
        .eq("phone", body.phone)
        .gte(
            "created_at",
            (datetime.now(timezone.utc) - timedelta(seconds=settings.otp_cooldown_seconds)).isoformat(),
        )
        .execute()
    )

    if recent.data:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {settings.otp_cooldown_seconds} seconds between OTP requests",
        )

    # Generate 6-digit code
    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store in DB
    supabase.table("otp_codes").insert(
        {
            "phone": body.phone,
            "code": code,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        }
    ).execute()

    # Send via WhatsApp
    await send_whatsapp_otp(body.phone, code)

    return {"message": "OTP sent to your WhatsApp"}


@router.post("/otp/verify", response_model=AuthTokens)
async def verify_otp(
    body: OTPVerify,
    settings: Settings = Depends(get_settings),
    supabase=Depends(get_supabase),
):
    """Verify OTP and return JWT tokens."""
    # Find valid OTP
    result = (
        supabase.table("otp_codes")
        .select("*")
        .eq("phone", body.phone)
        .eq("code", body.code)
        .eq("verified", False)
        .gte("expires_at", datetime.now(timezone.utc).isoformat())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    otp_record = result.data[0]

    # Check attempts
    if otp_record["attempts"] >= settings.max_otp_attempts:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Too many attempts. Request a new OTP.",
        )

    # Mark OTP as verified
    supabase.table("otp_codes").update({"verified": True}).eq(
        "id", otp_record["id"]
    ).execute()

    # Find or create user
    user_result = (
        supabase.table("users")
        .select("id")
        .eq("phone", body.phone)
        .limit(1)
        .execute()
    )

    if user_result.data:
        user_id = user_result.data[0]["id"]
    else:
        # Create new user + subscription
        new_user = (
            supabase.table("users")
            .insert({"phone": body.phone})
            .execute()
        )
        user_id = new_user.data[0]["id"]

        # Create free tier subscription
        supabase.table("subscriptions").insert(
            {
                "user_id": user_id,
                "tier": "mwana",
                "status": "active",
                "matches_limit": 5,
            }
        ).execute()

    # Generate JWT
    now = datetime.now(timezone.utc)
    access_payload = {
        "sub": user_id,
        "phone": body.phone,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
        "iat": now,
    }
    refresh_payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": now + timedelta(days=settings.jwt_refresh_expire_days),
        "iat": now,
    }

    access_token = jwt.encode(access_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    refresh_token = jwt.encode(refresh_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return AuthTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user_id,
    )


@router.post("/refresh", response_model=AuthTokens)
async def refresh_tokens(
    body: RefreshTokenRequest,
    settings: Settings = Depends(get_settings),
    supabase=Depends(get_supabase),
):
    """Issue new access (and refresh) JWTs from a valid refresh token."""
    try:
        payload = jwt.decode(
            body.refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_result = (
        supabase.table("users")
        .select("id, phone")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    phone = user_result.data[0]["phone"]
    now = datetime.now(timezone.utc)
    access_payload = {
        "sub": user_id,
        "phone": phone,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
        "iat": now,
    }
    refresh_payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": now + timedelta(days=settings.jwt_refresh_expire_days),
        "iat": now,
    }

    access_token = jwt.encode(access_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    refresh_token = jwt.encode(refresh_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return AuthTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user_id,
    )
