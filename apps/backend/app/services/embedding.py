"""Embedding generation using Google Gemini text-embedding-004.

768 dimensions, free tier: 1,500 requests/min.
Cost on paid tier: free up to 1M tokens/day, then ~$0.00 (embeddings are free on Gemini).
"""
import asyncio
import hashlib
import logging
from functools import lru_cache

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"


async def generate_embedding(text: str) -> list[float]:
    """Generate a 768-dim embedding via Gemini text-embedding-004.

    Uses httpx async — no thread pool needed.
    """
    settings = get_settings()
    truncated = text[:32000]

    url = GEMINI_EMBED_URL.format(model=settings.embedding_model)

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                url,
                params={"key": settings.gemini_api_key},
                json={
                    "model": f"models/{settings.embedding_model}",
                    "content": {"parts": [{"text": truncated}]},
                },
            )

            if response.status_code == 401 or response.status_code == 403:
                logger.error("Gemini API key is invalid or missing")
                raise ValueError("Embedding service is not configured. Please contact support.")

            if response.status_code == 429:
                logger.warning("Gemini rate limit hit during embedding generation")
                raise ValueError("Embedding service is temporarily busy. Please try again in a moment.")

            if response.status_code != 200:
                logger.error(f"Gemini API error {response.status_code}: {response.text[:200]}")
                raise ValueError("Embedding service is temporarily unavailable.")

            data = response.json()
            return data["embedding"]["values"]

        except httpx.TimeoutException:
            logger.error("Gemini embedding request timed out")
            raise ValueError("Embedding service timed out. Please try again.")
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during Gemini embedding: {e}")
            raise ValueError("Embedding service is temporarily unavailable.")
        except KeyError:
            logger.error(f"Unexpected Gemini response format: {response.text[:200]}")
            raise ValueError("Embedding service returned an unexpected response.")


def compute_cache_key(text: str, prefix: str = "emb") -> str:
    """SHA256 hash for ai_cache deduplication."""
    return hashlib.sha256(f"{prefix}:{text}".encode()).hexdigest()
