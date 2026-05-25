from __future__ import annotations
from typing import List

import httpx

from app.config import get_settings
from app.providers.base.push import PushMessage, PushProvider, PushResult

settings = get_settings()

FCM_URL = "https://fcm.googleapis.com/fcm/send"


class FCMAdapter(PushProvider):
    def __init__(self, server_key: str | None = None):
        self._server_key = server_key or settings.FCM_SERVER_KEY

    @property
    def _headers(self):
        return {"Authorization": f"key={self._server_key}", "Content-Type": "application/json"}

    async def send(self, device_token: str, message: PushMessage) -> PushResult:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                FCM_URL,
                headers=self._headers,
                json={
                    "to": device_token,
                    "notification": {
                        "title": message.title,
                        "body": message.body,
                        **({"image": message.image_url} if message.image_url else {}),
                    },
                    "data": message.data,
                },
            )
            r.raise_for_status()
            data = r.json()
            success = data.get("success", 0) > 0
            return PushResult(
                success=success,
                message_id=data.get("results", [{}])[0].get("message_id"),
                error=data.get("results", [{}])[0].get("error") if not success else None,
            )

    async def send_multicast(
        self, device_tokens: List[str], message: PushMessage
    ) -> List[PushResult]:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                FCM_URL,
                headers=self._headers,
                json={
                    "registration_ids": device_tokens,
                    "notification": {"title": message.title, "body": message.body},
                    "data": message.data,
                },
            )
            r.raise_for_status()
            data = r.json()
            return [
                PushResult(
                    success=res.get("message_id") is not None,
                    message_id=res.get("message_id"),
                    error=res.get("error"),
                )
                for res in data.get("results", [])
            ]

    async def send_to_topic(self, topic: str, message: PushMessage) -> PushResult:
        return await self.send(f"/topics/{topic}", message)
