"""WAHA channel scraper bootstrap — session + configured channels."""
from __future__ import annotations

import logging
from typing import List

import httpx

from app.core.config import get_settings
from app.services.whatsapp import ensure_session_started

logger = logging.getLogger(__name__)


def parse_scrape_channels(raw: str) -> list[str]:
    """Parse WHATSAPP_SCRAPE_CHANNELS CSV into normalized channel chat ids."""
    out: list[str] = []
    for part in (raw or "").split(","):
        ch = part.strip()
        if not ch:
            continue
        if "@" not in ch and ch.isdigit():
            ch = f"{ch}@newsletter"
        out.append(ch)
    return out


def channel_matches_config(chat_id: str, configured: list[str]) -> bool:
    """True when message chat_id is one of the scrape targets."""
    if not chat_id or not configured:
        return False
    normalized = chat_id.strip()
    for target in configured:
        if target == normalized or target in normalized or normalized in target:
            return True
    return False


def whatsapp_source_for_channel(channel_id: str) -> str:
    """jobs.source value: whatsapp_<channel_id> (sanitized)."""
    safe = channel_id.replace("@", "_at_").replace(".", "_")[:100]
    return f"whatsapp_{safe}"


async def bootstrap_scrape_channels() -> None:
    """Ensure WAHA session is WORKING; log channel join guidance.

    Channels must be joined on the linked WhatsApp account (phone) before
    WAHA can receive @newsletter messages. Invite-link join via API is
    best-effort when WHATSAPP_CHANNEL_INVITE_CODES is set (optional).
    """
    settings = get_settings()
    channels = parse_scrape_channels(settings.whatsapp_scrape_channels)
    if not channels:
        logger.info(
            "WhatsApp scraper: no WHATSAPP_SCRAPE_CHANNELS configured — "
            "scraper webhook will ignore channel traffic until set."
        )
        return

    if not settings.waha_api_url:
        logger.warning("WhatsApp scraper: WAHA_API_URL unset — skip bootstrap")
        return

    session = settings.waha_session_name
    working = await ensure_session_started(session)
    if not working:
        logger.warning(
            "WhatsApp scraper: WAHA session %r not WORKING — join channels "
            "after scanning QR (see docs/whatsapp_scraping.md).",
            session,
        )
        return

    headers = {"X-Api-Key": settings.waha_api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        for channel_id in channels:
            try:
                # Best-effort: list groups/chats to confirm visibility.
                r = await client.get(
                    f"{settings.waha_api_url}/api/{session}/chats",
                    headers=headers,
                    params={"limit": 200},
                )
                if r.status_code == 200:
                    chats = r.json()
                    ids = {
                        c.get("id") or c.get("chatId") or ""
                        for c in (chats if isinstance(chats, list) else [])
                        if isinstance(c, dict)
                    }
                    if any(channel_id in cid or cid in channel_id for cid in ids):
                        logger.info(
                            "WhatsApp scraper: channel %s visible in WAHA chats",
                            channel_id,
                        )
                        continue
                logger.info(
                    "WhatsApp scraper: channel %s — ensure joined on phone; "
                    "WAHA must be subscribed to @newsletter updates.",
                    channel_id,
                )
            except Exception as exc:
                logger.info(
                    "WhatsApp scraper: could not verify channel %s: %s",
                    channel_id,
                    exc,
                )
