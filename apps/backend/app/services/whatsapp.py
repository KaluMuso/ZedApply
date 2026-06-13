"""WAHA WhatsApp integration."""
import asyncio
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_whatsapp_message(phone: str, text: str) -> dict:
    settings = get_settings()
    chat_id = phone.replace("+", "") + "@c.us"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.waha_api_url}/api/sendText",
            json={"chatId": chat_id, "text": text, "session": "default"},
            headers={"X-Api-Key": settings.waha_api_key},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


async def send_whatsapp_otp(phone: str, code: str) -> dict:
    return await send_whatsapp_message(
        phone,
        f"*Zed CV* - Your verification code\n\nYour OTP code is: *{code}*\n\n"
        f"This code expires in 5 minutes.\nDo not share this code with anyone.",
    )


async def send_match_digest(phone: str, matches: list[dict]) -> dict:
    if not matches:
        return await send_whatsapp_message(
            phone, "No new job matches today. We'll keep looking! Update your CV for better results."
        )
    lines = ["*Zed CV* - Your Daily Job Matches\n"]
    for i, m in enumerate(matches[:5], 1):
        lines.append(f"{i}. *{m.get('title', 'Unknown')}* at {m.get('company', 'Unknown')}")
        lines.append(f"   Match: {round(m.get('score', 0))}%")
        skills = m.get("matched_skills", [])
        if skills:
            lines.append(f"   Skills: {', '.join(skills[:3])}")
        lines.append("")
    count = len(matches[:5])
    lines.append(f"Reply with a number (1-{count}) to see details.")
    return await send_whatsapp_message(phone, "\n".join(lines))


async def ensure_session_started(
    session_name: str = "default",
    timeout_seconds: int = 45,
) -> bool:
    """Idempotently ensure a WAHA session is in WORKING state.

    WAHA persists `creds.json` to its volume across container restarts
    but does NOT auto-start the saved session on boot — that requires
    an explicit POST /api/sessions/start. On 2026-05-12 we discovered
    this the hard way when OTP delivery silently broke after a WAHA
    restart even though all the credentials were on disk. This function
    is called from the backend startup hook so recovery is automatic
    from then on; it's also safe to call mid-runtime if a session goes
    STOPPED.

    Returns True if a session named `session_name` is WORKING by the
    time we return; False if WAHA was unreachable, the start call
    failed, or the session didn't reach WORKING within `timeout_seconds`.
    Best-effort — the caller should log on False rather than fail.
    """
    settings = get_settings()
    if not settings.waha_api_url:
        # Dev environment with no WAHA configured — no-op, not an error.
        return False

    headers = {"X-Api-Key": settings.waha_api_key}
    deadline = asyncio.get_event_loop().time() + timeout_seconds

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Fast path: session already WORKING.
        try:
            r = await client.get(f"{settings.waha_api_url}/api/sessions", headers=headers)
            if r.status_code == 200:
                sessions = r.json()
                if isinstance(sessions, list) and any(
                    s.get("name") == session_name and s.get("status") == "WORKING"
                    for s in sessions
                ):
                    return True
        except Exception as e:
            # WAHA unreachable. Backend startup shouldn't block on this —
            # OTP requests will surface the failure with a clean 503 (auth.py
            # try/except added 2026-05-12).
            logger.warning("ensure_session_started: WAHA unreachable: %s", e)
            return False

        # 2. Try to start the session. Two endpoint shapes have shipped across
        #    WAHA versions — try both, accept the first that returns < 400.
        started_ok = False
        for path in (f"/api/sessions/{session_name}/start", "/api/sessions/start"):
            try:
                r = await client.post(
                    f"{settings.waha_api_url}{path}",
                    json={"name": session_name},
                    headers=headers,
                )
                # 422 with "session already exists" is acceptable — it means
                # we're racing another caller, the next poll will see WORKING.
                if r.status_code < 400 or "already" in r.text.lower():
                    started_ok = True
                    break
                logger.info(
                    "ensure_session_started: POST %s → %s %s",
                    path, r.status_code, r.text[:200],
                )
            except Exception as e:
                logger.info("ensure_session_started: POST %s failed: %s", path, e)
                continue

        if not started_ok:
            logger.warning(
                "ensure_session_started: no /sessions/start variant accepted"
            )
            return False

        # 3. Poll until WORKING or deadline. NOWEB engine usually takes 3-8s.
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(3)
            try:
                r = await client.get(
                    f"{settings.waha_api_url}/api/sessions", headers=headers
                )
                if r.status_code == 200:
                    sessions = r.json()
                    if isinstance(sessions, list) and any(
                        s.get("name") == session_name and s.get("status") == "WORKING"
                        for s in sessions
                    ):
                        return True
            except Exception:
                # Transient network errors during boot are normal. Keep polling.
                continue

        logger.warning(
            "ensure_session_started: session %r did not reach WORKING within %ss",
            session_name, timeout_seconds,
        )
        return False


async def check_waha_health() -> bool:
    """Return True only if WAHA has at least one session in WORKING state.

    A bare 200 from /api/sessions is misleading — it stays 200 when the
    sessions list is empty or every session is STOPPED. We learned this
    the hard way on 2026-05-12 when OTP delivery silently failed for hours
    while monitoring reported "green". The endpoint is unusable for OTP
    delivery unless at least one session has status == "WORKING", so that's
    what we check.
    """
    settings = get_settings()
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{settings.waha_api_url}/api/sessions",
                headers={"X-Api-Key": settings.waha_api_key},
                timeout=5.0,
            )
            if r.status_code != 200:
                return False
            sessions = r.json()
            if not isinstance(sessions, list) or not sessions:
                return False
            return any(s.get("status") == "WORKING" for s in sessions)
    except Exception:
        return False
