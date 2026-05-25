from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SmsResult:
    success: bool
    message_id: str | None = None
    error: str | None = None


class SmsProvider(ABC):
    @abstractmethod
    async def send(self, to: str, message: str) -> SmsResult:
        ...
