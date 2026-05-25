from __future__ import annotations
import hashlib
import hmac

import httpx

from app.config import get_settings
from app.providers.base.payments import (
    PaymentCapture,
    PaymentOrder,
    PaymentProvider,
    PaymentStatus,
    RefundResult,
)

settings = get_settings()

BASE_URL = "https://api.razorpay.com/v1"


class RazorpayAdapter(PaymentProvider):
    def __init__(self, key_id: str | None = None, key_secret: str | None = None):
        self._key_id = key_id or settings.RAZORPAY_KEY_ID
        self._key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        self._webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    @property
    def _auth(self):
        return (self._key_id, self._key_secret)

    async def create_order(
        self, amount_minor: int, currency: str, receipt: str, notes: dict | None = None
    ) -> PaymentOrder:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{BASE_URL}/orders",
                auth=self._auth,
                json={
                    "amount": amount_minor,
                    "currency": currency,
                    "receipt": receipt,
                    "notes": notes or {},
                },
            )
            r.raise_for_status()
            data = r.json()
            return PaymentOrder(
                gateway_order_id=data["id"],
                amount_minor=data["amount"],
                currency=data["currency"],
                receipt=data["receipt"],
                gateway_payload=data,
            )

    async def capture_payment(self, gateway_payment_id: str, amount_minor: int) -> PaymentCapture:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{BASE_URL}/payments/{gateway_payment_id}/capture",
                auth=self._auth,
                json={"amount": amount_minor},
            )
            r.raise_for_status()
            data = r.json()
            return PaymentCapture(
                gateway_payment_id=data["id"],
                status=PaymentStatus.CAPTURED if data["status"] == "captured" else PaymentStatus.FAILED,
                amount_minor=data["amount"],
                gateway_payload=data,
            )

    async def refund(
        self, gateway_payment_id: str, amount_minor: int, reason: str = ""
    ) -> RefundResult:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{BASE_URL}/payments/{gateway_payment_id}/refund",
                auth=self._auth,
                json={"amount": amount_minor, "notes": {"reason": reason}},
            )
            r.raise_for_status()
            data = r.json()
            return RefundResult(
                gateway_refund_id=data["id"],
                amount_minor=data["amount"],
                status=data["status"],
                gateway_payload=data,
            )

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        expected = hmac.new(
            self._webhook_secret.encode(), payload, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
