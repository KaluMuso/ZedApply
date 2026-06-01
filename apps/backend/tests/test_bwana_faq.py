"""Bwana FAQ intents — tiers and matching weights."""
from app.services.bwana_faq import (
    is_contact_admin_request,
    is_unsatisfied_request,
    match_faq,
)
from app.services.matching_weights_copy import MATCH_WEIGHTS


def test_algorithm_faq_uses_50_20_15_10_5():
    match = match_faq("how does matching work?")
    assert match is not None
    assert match.intent_id == "algorithm"
    assert "50%" in match.response
    assert "20%" in match.response
    assert "15%" in match.response
    assert "10%" in match.response
    assert "5%" in match.response


def test_starter_tier_no_tailored_cv_claim():
    match = match_faq("tell me about starter plan")
    assert match is not None
    assert match.intent_id == "starter_tier"
    lower = match.response.lower()
    assert "professional" in lower
    assert "tailored cvs start on professional" in lower


def test_matching_weights_constants():
    assert MATCH_WEIGHTS["semantic"] == 50
    assert sum(MATCH_WEIGHTS.values()) == 100


def test_contact_admin_detection():
    assert is_contact_admin_request("what's your support email?")
    assert is_unsatisfied_request("I'm not satisfied with this")
