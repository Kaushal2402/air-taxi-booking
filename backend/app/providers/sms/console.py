import logging

from app.providers.base.sms import SmsProvider, SmsResult

logger = logging.getLogger("sms.console")


class ConsoleSmsAdapter(SmsProvider):
    """Fallback adapter for local development — prints the SMS to stdout instead of
    sending it. Useful when SMS_ENDPOINT is not configured."""

    async def send(self, to: str, message: str) -> SmsResult:
        separator = "─" * 50
        logger.info("Console SMS → %s | %s", to, message)
        print(f"\n{separator}")
        print(f"📱  Console SMS  →  {to}")
        print(f"{separator}")
        print(message)
        print(f"{separator}\n")
        return SmsResult(success=True)
