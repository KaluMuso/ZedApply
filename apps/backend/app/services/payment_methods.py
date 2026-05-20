"""Normalize frontend payment_method values to DB CHECK constraint values."""
from __future__ import annotations

from fastapi import HTTPException

# Must stay in sync with payments_payment_method_check (migration 008).
ALLOWED_PAYMENT_METHODS: frozenset[str] = frozenset({
    "mtn_money",
    "airtel_money",
    "card",
    "card_money",
    "lenco_mtn_money",
    "lenco_airtel_money",
    "lenco_card",
})

# Frontend short names for DPO Pay (non-Lenco).
_DPO_SHORT_TO_DB: dict[str, str] = {
    "mtn": "mtn_money",
    "airtel": "airtel_money",
    "card": "card_money",
}


def infer_lenco_method_from_phone(phone: str) -> str:
    """Path B: map +260 mobile prefix to Lenco sub-channel.

    Zambia prefixes (national significant number after +260):
      96x, 76x → Airtel
      97x, 77x → MTN
      95x, 75x → Zamtel (unsupported by Lenco)
    """
    digits = phone.strip()
    if digits.startswith("+260"):
        digits = digits[4:]
    elif digits.startswith("260") and len(digits) >= 12:
        digits = digits[3:]
    if len(digits) != 9 or not digits.isdigit():
        raise HTTPException(
            status_code=422,
            detail="Invalid Zambian phone number for mobile money.",
        )

    prefix2 = digits[:2]
    if prefix2 in ("96", "76"):
        return "lenco_airtel_money"
    if prefix2 in ("97", "77"):
        return "lenco_mtn_money"
    if prefix2 in ("95", "75"):
        raise HTTPException(
            status_code=400,
            detail="Zamtel numbers are not supported for Lenco mobile money.",
        )
    raise HTTPException(
        status_code=422,
        detail="Could not determine mobile network from phone number.",
    )


def normalize_payment_method(method: str, phone: str) -> str:
    """Map API input to a payments.payment_method CHECK value."""
    raw = (method or "").strip().lower()
    if not raw:
        raise HTTPException(status_code=422, detail="payment_method is required")

    if raw in ALLOWED_PAYMENT_METHODS:
        return raw

    if raw in _DPO_SHORT_TO_DB:
        return _DPO_SHORT_TO_DB[raw]

    if raw == "lenco":
        return infer_lenco_method_from_phone(phone)

    if raw.startswith("lenco_"):
        candidate = raw
        if candidate in ALLOWED_PAYMENT_METHODS:
            return candidate

    raise HTTPException(
        status_code=422,
        detail=(
            "Invalid payment_method. Use mtn, airtel, card, or a Lenco "
            "sub-channel (lenco_mtn_money, lenco_airtel_money, lenco_card)."
        ),
    )
