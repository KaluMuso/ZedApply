"""Daily LLM spend/token cap enforcement."""
from unittest.mock import MagicMock

import pytest

from app.core.config import get_settings
from app.services.llm_budget import LLMDailyCapExceeded, assert_llm_daily_budget
from tests.conftest import FakeSupabaseQuery


class _BudgetQuery(FakeSupabaseQuery):
    def __init__(self, rows):
        super().__init__(data=rows)

    def gte(self, *_a, **_kw):
        return self


@pytest.fixture
def budget_supabase(fake_supabase):
    fake_supabase.set_table(
        "llm_usage_log",
        _BudgetQuery(
            [
                {
                    "prompt_tokens": 500_000,
                    "completion_tokens": 100_000,
                    "cost_usd": 1.25,
                }
            ]
        ),
    )
    return fake_supabase


def test_cap_disabled_when_zero(monkeypatch, budget_supabase):
    monkeypatch.setenv("LLM_DAILY_SPEND_CAP_USD", "0")
    monkeypatch.setenv("LLM_DAILY_TOKEN_CAP", "0")
    get_settings.cache_clear()
    assert_llm_daily_budget(budget_supabase)


def test_usd_cap_raises(monkeypatch, budget_supabase):
    monkeypatch.setenv("LLM_DAILY_SPEND_CAP_USD", "1.0")
    monkeypatch.setenv("LLM_DAILY_TOKEN_CAP", "0")
    get_settings.cache_clear()
    with pytest.raises(LLMDailyCapExceeded):
        assert_llm_daily_budget(budget_supabase)


def test_token_cap_raises(monkeypatch, budget_supabase):
    monkeypatch.setenv("LLM_DAILY_SPEND_CAP_USD", "0")
    monkeypatch.setenv("LLM_DAILY_TOKEN_CAP", "500000")
    get_settings.cache_clear()
    with pytest.raises(LLMDailyCapExceeded):
        assert_llm_daily_budget(budget_supabase)
