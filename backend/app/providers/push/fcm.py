from __future__ import annotations

import json
import time
from typing import List, Optional, Tuple

import httpx
from jose import jwt

from app.dynamic_config import dyn
from app.providers.base.push import PushMessage, PushProvider, PushResult

FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
TOKEN_URL = "https://oauth2.googleapis.com/token"
FCM_SEND_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"


class FCMAdapter(PushProvider):
    """FCM HTTP v1 API — authenticates with a service account JSON (OAuth 2.0)."""

    def __init__(self, service_account_json: Optional[str] = None):
        raw = service_account_json or dyn.get("FCM_SERVICE_ACCOUNT_JSON")
        if not raw:
            raise ValueError(
                "FCM_SERVICE_ACCOUNT_JSON is not configured. "
                "Download a service account key from Firebase Console → Project Settings → Service Accounts."
            )
        self._sa: dict = json.loads(raw)
        self._project_id: str = self._sa["project_id"]
        # (access_token, expires_at_unix)
        self._token_cache: Optional[Tuple[str, float]] = None

    async def _access_token(self) -> str:
        """Return a cached OAuth 2.0 access token, refreshing when < 60 s remain."""
        now = time.time()
        if self._token_cache:
            token, expires_at = self._token_cache
            if now < expires_at - 60:
                return token

        # Build a signed JWT assertion
        iat = int(now)
        assertion = jwt.encode(
            {
                "iss": self._sa["client_email"],
                "scope": FCM_SCOPE,
                "aud": TOKEN_URL,
                "iat": iat,
                "exp": iat + 3600,
            },
            self._sa["private_key"],
            algorithm="RS256",
        )

        async with httpx.AsyncClient() as client:
            r = await client.post(
                TOKEN_URL,
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )
            r.raise_for_status()
            data = r.json()

        access_token: str = data["access_token"]
        self._token_cache = (access_token, now + int(data.get("expires_in", 3600)))
        return access_token

    def _build_message(self, target: dict, message: PushMessage) -> dict:
        """Build the FCM v1 message payload for a given target (token / topic)."""
        # Strip internal 'priority' key — use android/apns priority instead
        extra_data = {k: str(v) for k, v in (message.data or {}).items() if k != "priority"}
        fcm_priority = (message.data or {}).get("priority", "normal")

        notification: dict = {"title": message.title, "body": message.body}
        if message.image_url:
            notification["image"] = message.image_url

        msg: dict = {
            **target,
            "notification": notification,
            "android": {
                "priority": "high" if fcm_priority == "high" else "normal",
            },
            "apns": {
                "headers": {"apns-priority": "10" if fcm_priority == "high" else "5"},
            },
        }
        if extra_data:
            msg["data"] = extra_data
        return msg

    async def send(self, device_token: str, message: PushMessage) -> PushResult:
        token = await self._access_token()
        url = FCM_SEND_URL.format(project_id=self._project_id)
        payload = {"message": self._build_message({"token": device_token}, message)}

        async with httpx.AsyncClient() as client:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code >= 400:
                err = r.json().get("error", {}).get("message", r.text)
                return PushResult(success=False, error=err)
            return PushResult(success=True, message_id=r.json().get("name"))

    async def send_multicast(
        self, device_tokens: List[str], message: PushMessage
    ) -> List[PushResult]:
        # FCM v1 has no native multicast — send individually (batch API requires HTTP/2)
        results = []
        for dt in device_tokens:
            results.append(await self.send(dt, message))
        return results

    async def send_to_topic(self, topic: str, message: PushMessage) -> PushResult:
        token = await self._access_token()
        url = FCM_SEND_URL.format(project_id=self._project_id)
        payload = {"message": self._build_message({"topic": topic}, message)}

        async with httpx.AsyncClient() as client:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code >= 400:
                err = r.json().get("error", {}).get("message", r.text)
                return PushResult(success=False, error=err)
            return PushResult(success=True, message_id=r.json().get("name"))
