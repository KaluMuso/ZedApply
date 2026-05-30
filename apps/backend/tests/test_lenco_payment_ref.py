"""Tests for Lenco widget reference parsing and payment lookup."""
from __future__ import annotations

import uuid

from app.services.lenco_payment_ref import (
    is_uuid_string,
    parse_consumer_widget_reference,
)


def test_is_uuid_string_accepts_valid_uuid():
    u = str(uuid.uuid4())
    assert is_uuid_string(u) is True


def test_is_uuid_string_rejects_widget_reference():
    u = str(uuid.uuid4())
    ref = f"zedapply-{u}-1717000000000"
    assert is_uuid_string(ref) is False


def test_parse_consumer_widget_reference():
    u = str(uuid.uuid4())
    ref = f"zedapply-{u}-1717000000000"
    parsed = parse_consumer_widget_reference(ref)
    assert parsed == (u, 1717000000000)


def test_parse_consumer_widget_reference_rejects_employer():
    u = str(uuid.uuid4())
    ref = f"zedapply-emp-{u}-1717000000000"
    assert parse_consumer_widget_reference(ref) is None
