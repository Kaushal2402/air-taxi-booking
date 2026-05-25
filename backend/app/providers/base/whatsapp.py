from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class WhatsAppResult:
    success: bool
    message_id: str | None = None
    error: str | None = None


class WhatsAppProvider(ABC):
    @abstractmethod
    async def send_text(self, to: str, message: str) -> WhatsAppResult:
        ...

    @abstractmethod
    async def send_template(
        self, to: str, template_name: str, language: str, components: list
    ) -> WhatsAppResult:
        ...
