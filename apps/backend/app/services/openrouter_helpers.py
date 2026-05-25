"""Shared OpenRouter chat completion helpers — safe parsing and retries."""
from __future__ import annotations

import logging
from typing import Any

from openai import OpenAI
from supabase import Client

from app.lib.retry import (
    LLMCircuitOpenError,
    assert_llm_circuit_closed,
    call_with_llm_retry,
    circuit_is_open,
    is_retryable_llm_error,
)
from app.services.llm import LlmLogContext, record_openrouter_completion

logger = logging.getLogger(__name__)

# Backwards-compatible exports for tests and callers.
RETRY_BACKOFF_SECONDS = (1, 3, 10)
MAX_RETRY_ATTEMPTS = 3


def get_completion_content(
    response: Any,
    *,
    default: str = "{}",
) -> str | None:
    """Extract assistant message content; None when choices/message are missing."""
    try:
        if (
            response
            and response.choices
            and response.choices[0]
            and response.choices[0].message
        ):
            content = response.choices[0].message.content
            return content if content is not None else default
        return None
    except (AttributeError, IndexError, TypeError):
        return None


def is_retryable_openrouter_error(exc: BaseException) -> bool:
    return is_retryable_llm_error(exc)


def create_chat_completion_with_retries(
    client: OpenAI,
    *,
    log_prefix: str = "openrouter",
    log_context: LlmLogContext | None = None,
    supabase: Client | None = None,
    **kwargs: Any,
) -> Any:
    """OpenRouter chat.completions.create with retry, circuit breaker, and cost log.

    Cost rows are written only after a successful completion — not on retries
    that eventually fail.
    """
    model = str(kwargs.get("model") or "")
    response = call_with_llm_retry(
        lambda: client.chat.completions.create(**kwargs),
        log_prefix=log_prefix,
    )
    # Log only when callers pass log_context here; others call
    # record_openrouter_completion after success to avoid duplicate rows.
    if model and log_context is not None:
        record_openrouter_completion(
            response,
            model=model,
            context=log_context,
            supabase=supabase,
        )
    return response


__all__ = [
    "LLMCircuitOpenError",
    "MAX_RETRY_ATTEMPTS",
    "RETRY_BACKOFF_SECONDS",
    "assert_llm_circuit_closed",
    "circuit_is_open",
    "create_chat_completion_with_retries",
    "get_completion_content",
    "is_retryable_openrouter_error",
]
