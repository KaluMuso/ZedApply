"""DPO Pay integration service (XML API)."""

from datetime import datetime
import xml.etree.ElementTree as ET

import httpx

from app.core.config import get_settings


def _get_xml_text(root: ET.Element, *tags: str) -> str | None:
    """Return the first non-empty XML text value found by local tag name."""
    lookup = {elem.tag.split("}")[-1]: (elem.text or "").strip() for elem in root.iter()}
    for tag in tags:
        value = lookup.get(tag)
        if value:
            return value
    return None


async def create_payment_token(amount_zmw: int, phone: str, description: str) -> dict[str, str]:
    """Create a DPO payment token and return token plus payment URL."""
    settings = get_settings()
    amount_kwacha = f"{amount_zmw / 100:.2f}"
    transaction_ref = f"zedcv-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
    public = settings.app_public_url.rstrip("/")
    redirect_url = settings.dpo_pay_redirect_url.strip() or f"{public}/profile?payment=success"
    back_url = settings.dpo_pay_back_url.strip() or f"{public}/profile?payment=cancel"
    checkout_base = settings.dpo_pay_checkout_url.split("?")[0].rstrip("/")

    xml_body = f"""<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>{settings.dpo_pay_company_token}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>{amount_kwacha}</PaymentAmount>
    <PaymentCurrency>ZMW</PaymentCurrency>
    <CompanyRef>{transaction_ref}</CompanyRef>
    <CustomerPhone>{phone}</CustomerPhone>
    <CustomerEmail>payments@zedcv.com</CustomerEmail>
    <DefaultPayment>MO</DefaultPayment>
    <RedirectURL>{redirect_url}</RedirectURL>
    <BackURL>{back_url}</BackURL>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>30</PTL>
    <Description>{description}</Description>
    <ServiceType>{settings.dpo_pay_service_type}</ServiceType>
  </Transaction>
</API3G>"""

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.dpo_pay_api_url,
            content=xml_body,
            headers={"Content-Type": "application/xml; charset=utf-8"},
        )
    response.raise_for_status()

    root = ET.fromstring(response.text)
    result = _get_xml_text(root, "Result", "ResultCode")
    if result not in ("000", "0", "success", "SUCCESS"):
        message = _get_xml_text(root, "ResultExplanation", "ResultMessage", "Message")
        raise ValueError(message or "DPO payment token creation failed")

    token = _get_xml_text(root, "TransToken", "TransactionToken", "Token")
    if not token:
        raise ValueError("DPO response did not include transaction token")

    payment_url = f"{checkout_base}?ID={token}"
    return {
        "transaction_token": token,
        "payment_url": payment_url,
        "provider_ref": token,
    }


async def verify_payment(transaction_token: str) -> dict[str, str]:
    """Verify a DPO transaction token."""
    settings = get_settings()
    xml_body = f"""<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>{settings.dpo_pay_company_token}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>{transaction_token}</TransactionToken>
</API3G>"""

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.dpo_pay_api_url,
            content=xml_body,
            headers={"Content-Type": "application/xml; charset=utf-8"},
        )
    response.raise_for_status()

    root = ET.fromstring(response.text)
    result = _get_xml_text(root, "Result", "ResultCode")
    status = "completed" if result in ("000", "0", "success", "SUCCESS") else "failed"

    return {
        "status": status,
        "result_code": result or "",
        "result_message": _get_xml_text(root, "ResultExplanation", "ResultMessage", "Message") or "",
        "transaction_ref": _get_xml_text(root, "TransRef", "TransactionRef") or "",
    }
