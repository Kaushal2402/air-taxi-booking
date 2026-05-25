from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List


@dataclass
class PushMessage:
    title: str
    body: str
    data: dict = field(default_factory=dict)
    image_url: str | None = None


@dataclass
class PushResult:
    success: bool
    message_id: str | None = None
    error: str | None = None


class PushProvider(ABC):
    @abstractmethod
    async def send(self, device_token: str, message: PushMessage) -> PushResult:
        ...

    @abstractmethod
    async def send_multicast(
        self, device_tokens: List[str], message: PushMessage
    ) -> List[PushResult]:
        ...

    @abstractmethod
    async def send_to_topic(self, topic: str, message: PushMessage) -> PushResult:
        ...
