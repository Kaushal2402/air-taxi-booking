"""
Provider Adapter Layer — resolves the active adapter for each capability
from the deployment's configuration.  Business logic calls these functions
instead of importing adapters directly; swapping a provider is a config change.
"""
from functools import lru_cache

from app.config import get_settings
from app.providers.base.call_masking import CallMaskingProvider
from app.providers.base.email import EmailProvider
from app.providers.base.kyc import KycProvider
from app.providers.base.maps import MapsProvider
from app.providers.base.payments import PaymentProvider
from app.providers.base.push import PushProvider
from app.providers.base.sms import SmsProvider
from app.providers.base.storage import StorageProvider
from app.providers.base.whatsapp import WhatsAppProvider

settings = get_settings()


@lru_cache
def get_maps_provider() -> MapsProvider:
    if settings.MAPS_PROVIDER == "google":
        from app.providers.maps.google_maps import GoogleMapsAdapter
        return GoogleMapsAdapter()
    raise ValueError(f"Unknown maps provider: {settings.MAPS_PROVIDER}")


@lru_cache
def get_payment_provider() -> PaymentProvider:
    if settings.PAYMENT_PROVIDER == "razorpay":
        from app.providers.payments.razorpay import RazorpayAdapter
        return RazorpayAdapter()
    raise ValueError(f"Unknown payment provider: {settings.PAYMENT_PROVIDER}")


@lru_cache
def get_push_provider() -> PushProvider:
    if settings.PUSH_PROVIDER == "fcm":
        from app.providers.push.fcm import FCMAdapter
        return FCMAdapter()
    raise ValueError(f"Unknown push provider: {settings.PUSH_PROVIDER}")


@lru_cache
def get_sms_provider() -> SmsProvider:
    if settings.SMS_PROVIDER == "generic_http":
        # Fall back to the console adapter when SMS_ENDPOINT is not configured so
        # developers can see outgoing messages in the terminal without needing
        # real credentials.
        if not settings.SMS_ENDPOINT:
            import warnings
            warnings.warn(
                "SMS_ENDPOINT is not set — falling back to the console SMS adapter. "
                "Messages will be printed to stdout. "
                "Set SMS_ENDPOINT (and credentials) in your .env to send real SMS.",
                stacklevel=2,
            )
            from app.providers.sms.console import ConsoleSmsAdapter
            return ConsoleSmsAdapter()
        from app.providers.sms.generic_http import GenericHttpSmsAdapter
        return GenericHttpSmsAdapter()
    raise ValueError(f"Unknown SMS provider: {settings.SMS_PROVIDER}")


@lru_cache
def get_whatsapp_provider() -> WhatsAppProvider:
    from app.providers.whatsapp.generic_cloud_api import GenericCloudApiWhatsAppAdapter
    return GenericCloudApiWhatsAppAdapter()


@lru_cache
def get_email_provider() -> EmailProvider:
    if settings.EMAIL_PROVIDER == "console":
        from app.providers.email.console import ConsoleEmailAdapter
        return ConsoleEmailAdapter()

    if settings.EMAIL_PROVIDER == "smtp":
        # Fall back to the console adapter when SMTP is not configured so
        # developers can see outgoing emails in the terminal without needing
        # real credentials.
        if not settings.SMTP_HOST:
            import warnings
            warnings.warn(
                "SMTP_HOST is not set — falling back to the console email adapter. "
                "Emails will be printed to stdout. Set SMTP_HOST (and credentials) "
                "in your .env to send real emails.",
                stacklevel=2,
            )
            from app.providers.email.console import ConsoleEmailAdapter
            return ConsoleEmailAdapter()

        from app.providers.email.smtp import SmtpAdapter
        return SmtpAdapter()

    raise ValueError(f"Unknown email provider: {settings.EMAIL_PROVIDER}")


@lru_cache
def get_storage_provider() -> StorageProvider:
    if settings.STORAGE_PROVIDER == "s3":
        from app.providers.storage.s3 import S3Adapter
        return S3Adapter()
    raise ValueError(f"Unknown storage provider: {settings.STORAGE_PROVIDER}")


@lru_cache
def get_kyc_provider() -> KycProvider:
    from app.providers.kyc.noop import NoOpKycAdapter
    return NoOpKycAdapter()


@lru_cache
def get_call_masking_provider() -> CallMaskingProvider:
    from app.providers.call_masking.noop import NoOpCallMaskingAdapter
    return NoOpCallMaskingAdapter()
