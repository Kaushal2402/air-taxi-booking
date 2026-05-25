from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


class PaymentStatus(str, Enum):
    INITIATED = "initiated"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


@dataclass
class PaymentOrder:
    gateway_order_id: str
    amount_minor: int
    currency: str
    receipt: str
    gateway_payload: dict


@dataclass
class PaymentCapture:
    gateway_payment_id: str
    status: PaymentStatus
    amount_minor: int
    gateway_payload: dict


@dataclass
class RefundResult:
    gateway_refund_id: str
    amount_minor: int
    status: str
    gateway_payload: dict


class PaymentProvider(ABC):
    @abstractmethod
    async def create_order(
        self, amount_minor: int, currency: str, receipt: str, notes: dict | None = None
    ) -> PaymentOrder:
        ...

    @abstractmethod
    async def capture_payment(self, gateway_payment_id: str, amount_minor: int) -> PaymentCapture:
        ...

    @abstractmethod
    async def refund(
        self, gateway_payment_id: str, amount_minor: int, reason: str = ""
    ) -> RefundResult:
        ...

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        ...
