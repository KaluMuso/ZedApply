"""Zambian mobile numbers in E.164 (+260XXXXXXXXX)."""
from __future__ import annotations

import re

E164_ZM_RE = re.compile(r"^\+260[0-9]{9}$")


def normalize_zambian_e164_phone(raw: str) -> str:
    """Normalize phone input to +260 plus nine national digits.

    Strips leading zeros from local (0XXXXXXXXX) and +2600… forms, accepts
    260XXXXXXXXX without '+', and ignores spaces/dashes in the env value.
    """
    text = (raw or "").strip()
    if not text:
        raise ValueError("phone number is required")

    digits = re.sub(r"\D", "", text)
    if digits.startswith("260"):
        national = digits[3:].lstrip("0")
    elif digits.startswith("0"):
        national = digits[1:].lstrip("0")
    else:
        national = digits.lstrip("0")

    if len(national) != 9 or not national.isdigit():
        raise ValueError(
            "phone must be a Zambian mobile number (+260 followed by 9 digits)"
        )

    normalized = f"+260{national}"
    if not E164_ZM_RE.fullmatch(normalized):
        raise ValueError(
            "phone must be a Zambian mobile number (+260 followed by 9 digits)"
        )
    return normalized
