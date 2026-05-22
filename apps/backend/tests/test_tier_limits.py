"""Pin canonical TIER_LIMITS and TIER_PRICES (zedapply.com/pricing).

Two divergent copies (5/25/125/99999) once existed in api/v1/subscription.py
and api/v1/admin.py and silently reduced quotas. This test fails loudly if
the canonical values drift again.
"""
from app.schemas.subscription import TIER_LIMITS, TIER_PRICES


def test_tier_limits_canonical_values():
    assert TIER_LIMITS == {
        "mwana": 5,
        "mwizi": 25,
        "wino": 99999,
    }


def test_tier_prices_canonical_values():
    """Prices in ngwee — K79 / K199 on the public pricing page."""
    assert TIER_PRICES == {
        "mwana": 0,
        "mwizi": 7900,
        "wino": 19900,
    }


def test_tier_limits_covers_all_tiers():
    """Every tier in the SubscriptionTier enum must have a quota."""
    from app.schemas.subscription import SubscriptionTier

    for tier in SubscriptionTier:
        assert tier.value in TIER_LIMITS
