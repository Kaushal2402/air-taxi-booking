from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class UploadResult:
    url: str
    key: str
    size_bytes: int


class StorageProvider(ABC):
    @abstractmethod
    async def upload(
        self, file_data: bytes, key: str, content_type: str = "application/octet-stream"
    ) -> UploadResult:
        ...

    @abstractmethod
    async def delete(self, key: str) -> bool:
        ...

    @abstractmethod
    async def get_signed_url(self, key: str, expires_in: int = 3600) -> str:
        ...
