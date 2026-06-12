import httpx

from app.dynamic_config import dyn
from app.providers.base.sms import SmsProvider, SmsResult


class GenericHttpSmsAdapter(SmsProvider):
    """Config-driven SMS adapter — POST to buyer-supplied endpoint."""

    async def send(self, to: str, message: str) -> SmsResult:
        endpoint = dyn.get("SMS_ENDPOINT")
        if not endpoint:
            return SmsResult(success=False, error="SMS_ENDPOINT not configured")
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    endpoint,
                    json={
                        "to": to,
                        "message": message,
                        "sender": dyn.get("SMS_SENDER_ID"),
                        "api_key": dyn.get("SMS_API_KEY"),
                    },
                )
                r.raise_for_status()
                return SmsResult(success=True)
        except Exception as exc:
            return SmsResult(success=False, error=str(exc))
