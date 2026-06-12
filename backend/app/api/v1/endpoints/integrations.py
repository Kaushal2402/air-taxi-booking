from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_admin_user
from app.dynamic_config import dyn, save_to_db
from app.models.admin_user import AdminUser

router = APIRouter()

ALLOWED_KEYS = {
    "FCM_SERVICE_ACCOUNT_JSON",
    "GOOGLE_MAPS_API_KEY",
    "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_TLS",
    "SMS_ENDPOINT", "SMS_API_KEY", "SMS_SENDER_ID",
    "WHATSAPP_ENDPOINT", "WHATSAPP_TOKEN", "WHATSAPP_FROM",
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_BUCKET",
    "REDIS_HOST", "REDIS_PORT", "REDIS_DB",
}

SECRET_KEYS = {
    "FCM_SERVICE_ACCOUNT_JSON", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
    "SMTP_PASSWORD", "SMS_API_KEY", "WHATSAPP_TOKEN", "AWS_SECRET_ACCESS_KEY",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class ConfigValueResponse(BaseModel):
    key: str
    value: str
    is_set: bool
    is_secret: bool


class ConfigResponse(BaseModel):
    values: Dict[str, ConfigValueResponse]


class UpdateConfigBody(BaseModel):
    updates: Dict[str, Optional[str]]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ConfigResponse)
async def get_config(
    _: AdminUser = Depends(get_current_admin_user),
) -> ConfigResponse:
    values: Dict[str, ConfigValueResponse] = {}
    for key in ALLOWED_KEYS:
        raw = dyn.get(key)
        is_secret = key in SECRET_KEYS
        is_set = bool(raw)
        values[key] = ConfigValueResponse(
            key=key,
            value="••••••" if (is_secret and is_set) else raw,
            is_set=is_set,
            is_secret=is_secret,
        )
    return ConfigResponse(values=values)


@router.patch("", response_model=ConfigResponse)
async def update_config(
    body: UpdateConfigBody,
    _: AdminUser = Depends(get_current_admin_user),
) -> ConfigResponse:
    forbidden = [k for k in body.updates if k not in ALLOWED_KEYS]
    if forbidden:
        raise HTTPException(400, detail=f"Keys not allowed: {forbidden}")

    for key, value in body.updates.items():
        await save_to_db(key, value or "")

    # Bust provider lru_caches so next call re-instantiates with new config
    _bust_provider_caches()

    return await get_config(_)


def _bust_provider_caches() -> None:
    """Clear lru_cache on all provider getters so they pick up new config."""
    try:
        from app.providers import (
            get_push_provider, get_maps_provider, get_payment_provider,
            get_sms_provider, get_email_provider, get_storage_provider,
            get_whatsapp_provider,
        )
        for fn in (
            get_push_provider, get_maps_provider, get_payment_provider,
            get_sms_provider, get_email_provider, get_storage_provider,
            get_whatsapp_provider,
        ):
            fn.cache_clear()
    except Exception:
        pass
