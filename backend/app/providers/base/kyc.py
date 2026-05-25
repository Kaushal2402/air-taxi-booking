from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


class KycStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class KycResult:
    status: KycStatus
    reference_id: str | None = None
    reason: str | None = None


class KycProvider(ABC):
    """Interface for KYC/identity verification. Stubbed (NoOp) in v1."""

    @abstractmethod
    async def verify_document(
        self, document_type: str, document_data: bytes, metadata: dict
    ) -> KycResult:
        ...
