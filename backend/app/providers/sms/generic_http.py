import httpx

from app.config import get_settings
from app.providers.base.sms import SmsProvider, SmsResult

settings = get_settings()


class GenericHttpSmsAdapter(SmsProvider):
    """Config-driven SMS adapter — POST to buyer-supplied endpoint."""

    async def send(self, to: str, message: str) -> SmsResult:
        if not settings.SMS_ENDPOINT:
            return SmsResult(success=False, error="SMS_ENDPOINT not configured")
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    settings.SMS_ENDPOINT,
                    json={
                        "to": to,
                        "message": message,
                        "sender": settings.SMS_SENDER_ID,
                        "api_key": settings.SMS_API_KEY,
                    },
                )
                r.raise_for_status()
                return SmsResult(success=True)
        except Exception as exc:
            return SmsResult(success=False, error=str(exc))
