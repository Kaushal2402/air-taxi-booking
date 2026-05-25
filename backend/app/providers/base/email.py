from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List


@dataclass
class EmailMessage:
    to: List[str]
    subject: str
    html_body: str
    text_body: str = ""
    cc: List[str] = field(default_factory=list)
    bcc: List[str] = field(default_factory=list)
    reply_to: str | None = None


@dataclass
class EmailResult:
    success: bool
    message_id: str | None = None
    error: str | None = None


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, message: EmailMessage) -> EmailResult:
        ...
