# Zed CV authentication model

End-to-end sign-in for Zed Apply: phone identity, one-time codes, optional trusted devices, and JWT sessions.

## Overview

| Step | Endpoint | Purpose |
|------|----------|---------|
| Trusted login | `POST /api/v1/auth/login` | Skip OTP when `X-Device-Token` matches `trusted_devices` |
| Request OTP | `POST /api/v1/auth/otp/request` | Send 6-digit code via email or WhatsApp |
| Verify OTP | `POST /api/v1/auth/otp/verify` | Validate code, issue JWTs, optionally register device |

Users are keyed by Zambian mobile in E.164 (`+260XXXXXXXXX`). Access and refresh tokens are issued by the FastAPI backend (not Supabase Auth sessions for the app UI).

## JWT refresh token TTL

Set in the **Supabase dashboard** (not via SQL migration):

1. **Authentication → JWT Settings**
2. **JWT expiry**: `3600` (1 hour access token)
3. **Refresh token expiry**: `7776000` (90 days)

The backend also signs its own refresh JWTs with `refresh_token_expire_days` (default **90** in `app/core/config.py`). Keep dashboard and backend TTL aligned so clients do not expire sessions unexpectedly.

## OTP delivery channels

Column `users.otp_channel_preference`: `email` | `whatsapp` | `both`.

| User type | Default channel |
|-----------|-----------------|
| New signup (free tier) | `email` |
| Existing users (at migration 063) | `whatsapp` (preserved behaviour) |
| Paid tiers (`starter`, `professional`, `super_standard`) | `whatsapp` |

`POST /auth/otp/request` accepts optional `channel` to override for that request. Email OTP requires a stored user email (signup collects email).

Delivery:

- **email** — Resend (`app/services/email.py` → `send_otp_email`)
- **whatsapp** — WAHA (`send_whatsapp_otp`)
- **both** — both channels when email is on file

## Trusted devices (“Remember this device”)

Migration `063_trusted_devices_and_sensitive_actions.sql` adds `trusted_devices`:

- Stores **SHA-256** of a 32-byte random token (never the raw token).
- Default lifetime **365 days** (`expires_at`).
- Revocation via `revoked_at` (future admin/user flows).

### Registering trust

On `POST /auth/otp/verify` with `remember_device: true`:

1. Backend generates `secrets.token_urlsafe(32)`.
2. Hash stored in `trusted_devices`.
3. Raw token returned as `device_token` in `AuthTokens`.

Frontend stores it in `localStorage` under **`zedapply_device_token`** and sends **`X-Device-Token`** on:

- `POST /auth/login`
- Subsequent auth calls that use the shared API client helper

### Skipping login OTP

`POST /auth/login` with body `{ "phone": "+260…" }` and valid `X-Device-Token`:

- Looks up user by phone.
- If hash matches a non-revoked, non-expired row → issues JWTs with `trusted_device_login: true`.
- Otherwise **401** `OTP required` — client falls back to OTP request.

**Manual test after deploy**

1. Sign in with “Remember this device” checked; confirm `zedapply_device_token` in DevTools → Application → Local Storage.
2. Wait a few minutes, clear **cookies only** (not localStorage), reload `/auth`.
3. Enter the same phone → should hit `/auth/login`, bypass OTP, land on dashboard.

## Sensitive actions (re-OTP required)

Defined in `app/services/otp.py` as `SENSITIVE_ACTIONS`:

- `delete_account`
- `change_tier`
- `change_phone`
- `change_email`
- `export_data`

These actions must **not** rely on trusted-device login alone. Callers should require a fresh OTP (or step-up verification) even when `X-Device-Token` is valid. Helper: `requires_otp_for_action(action)`.

Normal session refresh and dashboard access do **not** require re-OTP when the device is trusted and refresh JWT is valid.

## OTP storage (security)

Plaintext OTPs are never stored. `otp_codes.code` holds `HMAC-SHA256(jwt_secret, phone:code)` (see task #76). Rate limits: 3 requests/minute, 10 verify/minute; cooldown between requests from settings.

## Cost note

Trusted devices + 90-day refresh tokens target ~80% fewer WhatsApp OTP sends at scale. Email OTP for free tier shifts variable cost to Resend (within free tier where possible).
