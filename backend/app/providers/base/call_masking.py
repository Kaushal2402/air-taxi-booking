from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class MaskedCallSession:
    session_id: str
    virtual_number: str
    expires_at: str


class CallMaskingProvider(ABC):
    """Interface for masked calling. Stubbed (NoOp) in v1."""

    @abstractmethod
    async def create_session(
        self, caller: str, callee: str, expires_in: int = 3600
    ) -> MaskedCallSession:
        ...

    @abstractmethod
    async def end_session(self, session_id: str) -> bool:
        ...
