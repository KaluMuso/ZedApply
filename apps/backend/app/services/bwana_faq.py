"""Scripted FAQ intents for Bwana chat (sync fast path)."""
import re
from dataclasses import dataclass

from app.schemas.subscription import TIER_LIMITS, TIER_PRICES
from app.services.matching_weights_copy import MATCH_SCORE_FAQ_ANSWER
from app.services.tier_marketing import TIER_WHATSAPP_BLURB

_ESCALATION_PHRASES = (
    "talk to human",
    "speak to a human",
    "human support",
    "real person",
    "support agent",
    "customer support",
    "kaluba",
    "speak to someone",
    "talk to someone",
)
_ESCALATION_WORDS = re.compile(
    r"\b(support|agent)\b", re.IGNORECASE
)

_UNSATISFIED_PHRASES = (
    "not satisfied",
    "unsatisfied",
    "not happy",
    "unhappy with",
    "this is useless",
    "doesn't help",
    "does not help",
    "waste of time",
    "terrible service",
    "awful experience",
)

_CONTACT_ADMIN_PHRASES = (
    "contact admin",
    "contact support",
    "support email",
    "support phone",
    "admin email",
    "admin phone",
    "how do i contact",
    "how to contact",
    "customer service number",
    "support number",
    "what's your email",
    "what is your email",
    "your phone number",
    "call support",
)

_CALLBACK_PHRASES = (
    "call me back",
    "contact me back",
    "reach out to me",
    "get back to me",
    "whatsapp me back",
    "message me back",
)


@dataclass(frozen=True)
class FaqMatch:
    intent_id: str
    response: str


def _kwacha(ngwee: int) -> str:
    if ngwee == 0:
        return "K0"
    return f"K{ngwee // 100}"


def _pricing_block() -> str:
    return (
        "ZedApply plans (ZMW/month):\n"
        f"• Free — {_kwacha(TIER_PRICES['free'])}, {TIER_LIMITS['free']} matches/mo\n"
        f"• Starter — {_kwacha(TIER_PRICES['starter'])}, {TIER_LIMITS['starter']} matches/mo\n"
        f"• Professional — {_kwacha(TIER_PRICES['professional'])}, "
        f"{TIER_LIMITS['professional']} matches/mo (+ cover letters + tailored CVs)\n"
        f"• Super Standard — {_kwacha(TIER_PRICES['super_standard'])}, "
        "unlimited matches + Bwana Interview\n"
        "Upgrade at /pricing. Pay with MTN/Airtel (Lenco) or card (DPO)."
    )


def _contains_any(text: str, needles: tuple[str, ...]) -> bool:
    return any(n in text for n in needles)


def is_escalation_request(message: str) -> bool:
    """True when the user asks for a human (not contact-info-only)."""
    norm = message.strip().lower()
    if is_contact_admin_request(norm) and not wants_callback(norm):
        return False
    if _contains_any(norm, _ESCALATION_PHRASES):
        return True
    return bool(_ESCALATION_WORDS.search(norm))


def is_unsatisfied_request(message: str) -> bool:
    norm = message.strip().lower()
    return _contains_any(norm, _UNSATISFIED_PHRASES)


def is_contact_admin_request(message: str) -> bool:
    norm = message.strip().lower()
    return _contains_any(norm, _CONTACT_ADMIN_PHRASES)


def wants_callback(message: str) -> bool:
    """True when the user wants a human to reach out (not contact-info-only)."""
    norm = message.strip().lower()
    if _contains_any(norm, _CALLBACK_PHRASES):
        return True
    return _contains_any(norm, _ESCALATION_PHRASES)


def match_faq(message: str) -> FaqMatch | None:
    """Return a canned FAQ answer when the message matches a known intent."""
    norm = message.strip().lower()
    if not norm:
        return None

    if is_contact_admin_request(norm):
        return None

    if is_unsatisfied_request(norm):
        return None

    if _contains_any(norm, ("how do i apply", "how to apply", "apply for job")):
        return FaqMatch(
            "apply",
            "To apply through ZedApply: upload your CV on /profile, wait for parsing "
            "(~1 min), then check /matches. Reply to your daily WhatsApp digest (around "
            "07:00) with 1–5 to see job details. Tailored CVs are on Professional+.",
        )

    if "starter" in norm and "professional" not in norm:
        return FaqMatch(
            "starter_tier",
            f"Starter: {_kwacha(TIER_PRICES['starter'])}/mo, {TIER_LIMITS['starter']} matches. "
            f"{TIER_WHATSAPP_BLURB['starter']}. Tailored CVs start on Professional. See /pricing.",
        )

    if _contains_any(
        norm,
        ("price", "pricing", "cost", "how much", " tier", "plan", "k125", "k250", "k500"),
    ):
        return FaqMatch("pricing", _pricing_block())

    if _contains_any(norm, ("cancel", "unsubscribe", "stop subscription", "stop paying")):
        return FaqMatch(
            "cancel",
            "Manage or cancel your plan in /settings → Subscription. Paid tiers renew "
            "monthly until you cancel. For billing help, ask to contact support or type "
            "\"talk to human\".",
        )

    if _contains_any(norm, ("where is my cv", "my cv", "upload cv", "cv status", "cv upload")):
        return FaqMatch(
            "cv_location",
            "Your CV lives on your profile: open /profile → CV & Skills. Upload PDF or "
            "DOCX there; we'll parse skills and refresh your matches.",
        )

    if _contains_any(norm, ("my matches", "job matches", "no matches", "see matches")):
        return FaqMatch(
            "matches",
            "View saved and fresh matches at /matches. If results are thin, add skills "
            f"on /profile or upload a fuller CV — {MATCH_SCORE_FAQ_ANSWER[:80]}…",
        )

    if _contains_any(norm, ("digest", "whatsapp time", "daily message", "07:00", "7am")):
        return FaqMatch(
            "digest",
            "We send a WhatsApp digest of your top matches around 07:00 CAT when you have "
            "new hits. Reply 1–5 for details, or MORE for extra matches.",
        )

    if _contains_any(norm, ("lenco", "mtn", "airtel", "mobile money", "dpo", "pay with")):
        return FaqMatch(
            "payment",
            "Pay in kwacha via Lenco (MTN or Airtel mobile money) or card through DPO on "
            "/pricing. You'll get a receipt on WhatsApp when payment confirms.",
        )

    if _contains_any(
        norm,
        (
            "matching works",
            "matching work",
            "how does matching",
            "match score",
            "algorithm",
            "how do you match",
        ),
    ):
        return FaqMatch("algorithm", MATCH_SCORE_FAQ_ANSWER)

    if _contains_any(norm, ("cover letter",)):
        return FaqMatch(
            "cover_letter",
            "Cover letters are on the Professional plan (K250/mo): open a match → Generate "
            "cover letter. Each letter is ~200–250 words, editable, export PDF.",
        )

    if _contains_any(norm, ("tailored cv", "rewrite cv", "cv generator")):
        return FaqMatch(
            "tailored_cv",
            "Tailored CVs are on Professional and Super Standard: pick a job on /matches → "
            "Tailored CV. Starter includes advanced CV analysis but not per-job tailoring.",
        )

    if _contains_any(norm, ("otp", "verification code", "login code")):
        return FaqMatch(
            "otp",
            "Sign in with your +260 number — we WhatsApp a 6-digit OTP (expires in 5 min). "
            "Request a new code after the cooldown if it doesn't arrive.",
        )

    if _contains_any(norm, ("settings", "account settings", "preferences")):
        return FaqMatch(
            "settings",
            "Update phone, digest preferences, and subscription at /settings.",
        )

    if _contains_any(norm, ("hours", "when open", "response time")):
        return FaqMatch(
            "support_hours",
            "Bwana is instant 24/7 for FAQs. Human support replies within 24h — ask to "
            "contact support or type \"talk to human\" to escalate.",
        )

    if _contains_any(norm, ("free plan", "free tier", "10 matches")):
        return FaqMatch(
            "free_tier",
            f"Free tier: {_kwacha(TIER_PRICES['free'])}/mo, {TIER_LIMITS['free']} matches, "
            f"{TIER_WHATSAPP_BLURB['free']}. Upgrade anytime on /pricing.",
        )

    if _contains_any(norm, ("professional", " pro plan", "pro tier")):
        return FaqMatch(
            "professional_tier",
            f"Professional: {_kwacha(TIER_PRICES['professional'])}/mo, "
            f"{TIER_LIMITS['professional']} matches, {TIER_WHATSAPP_BLURB['professional']}.",
        )

    if _contains_any(norm, ("super standard", "unlimited matches")):
        return FaqMatch(
            "super_tier",
            f"Super Standard: {_kwacha(TIER_PRICES['super_standard'])}/mo, unlimited matches, "
            "Bwana Interview prep at /interview-prep.",
        )

    if _contains_any(norm, ("interview prep", "bwana interview")):
        return FaqMatch(
            "interview",
            "Bwana Interview (quizzes, dress code, likely questions) is included on Super "
            "Standard (K500/mo) at /interview-prep.",
        )

    if _contains_any(norm, ("privacy", "delete account", "my data")):
        return FaqMatch(
            "privacy",
            "Read how we handle data at /legal/privacy. To delete your account or export "
            "data, contact support or escalate to a human.",
        )

    if _contains_any(norm, ("hi", "hello", "hey bwana", "good morning", "good afternoon")):
        return FaqMatch(
            "hello",
            "Hey — I'm Bwana, ZedApply's chatbot career assistant. Ask about pricing, your CV, "
            "matches, or interview tips. Say \"contact support\" for email/phone or "
            "\"talk to human\" to escalate.",
        )

    return None
