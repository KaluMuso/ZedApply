"""Unit tests for payment_method normalization."""
import pytest
from fastapi import HTTPException

from app.services.payment_methods import (
    infer_lenco_method_from_phone,
    normalize_payment_method,
)


class TestInferLencoFromPhone:
    def test_mtn_97x(self):
        assert infer_lenco_method_from_phone("+260979370372") == "lenco_mtn_money"

    def test_airtel_96x(self):
        assert infer_lenco_method_from_phone("+260961234567") == "lenco_airtel_money"

    def test_zamtel_rejected(self):
        with pytest.raises(HTTPException) as exc:
            infer_lenco_method_from_phone("+260951234567")
        assert exc.value.status_code == 400


class TestNormalizePaymentMethod:
    def test_passthrough_lenco_subchannel(self):
        assert (
            normalize_payment_method("lenco_mtn_money", "+260979370372")
            == "lenco_mtn_money"
        )

    def test_generic_lenco_infers_mtn(self):
        assert (
            normalize_payment_method("lenco", "+260979370372")
            == "lenco_mtn_money"
        )

    def test_dpo_short_mtn(self):
        assert normalize_payment_method("mtn", "+260979370372") == "mtn_money"
