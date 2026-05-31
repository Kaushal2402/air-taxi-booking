from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.settings import (
    FeatureFlag,
    KillSwitch,
    MaintenanceWindow,
    PlatformSettings,
    PlatformToggle,
)


# ── Defaults ──────────────────────────────────────────────────────────────────

_DEFAULT_SETTINGS = {
    "legal_entity": "Acme Mobility Pvt Ltd",
    "gstin": "29ABCDE1234F1Z5",
    "primary_region": "India",
    "base_currency": "INR",
    "timezone": "Asia/Kolkata",
    "fiscal_year_start": "April",
    "settlement_cycle": "T+1",
    "driver_payout_day": "Monday",
    "surge_ceiling": 2.0,
    "last_edited_at": None,
    "last_edited_by": None,
    # Booking rules defaults
    "max_advance_days": 7,
    "min_advance_minutes": 15,
    "cancellation_free_window_min": 5,
    "cancellation_fee_pct": 10.0,
    "max_cancellations_per_day": 3,
    "no_show_wait_minutes": 5,
    "no_show_fee_pct": 25.0,
    "driver_acceptance_timeout_sec": 30,
    "max_dispatch_retries": 3,
    "auto_assign_enabled": True,
    "dispatch_initial_radius_m": 2000,
    "dispatch_radius_step_m": 1000,
    "dispatch_max_radius_m": 8000,
    "rank_weight_distance": 50,
    "rank_weight_rating": 30,
    "rank_weight_acceptance": 20,
    "free_waiting_minutes": 3,
    "waiting_charge_per_min": 1.5,
    "max_active_bookings_per_rider": 2,
    "default_commission_pct": 20.0,
    "refund_destination_default": "original",
    "air_min_advance_hours": 4,
    # Quiet hours
    "quiet_hours_enabled": False,
    "quiet_hours_start": "23:00",
    "quiet_hours_end": "05:00",
    "quiet_hours_action": "cap_surge",
    # Safety & SOS
    "sos_enabled": True,
    "sos_contact_number": "112",
    "sos_share_location": True,
    "sos_alert_admin": True,
    "driver_grace_period_enabled": False,
    "driver_grace_period_days": 7,
    "operator_site_visit_required": False,
    "driver_min_rating": 3.5,
    "driver_max_cancellation_rate_pct": 30.0,
    "driver_min_acceptance_rate_pct": 60.0,
    "driver_threshold_window_days": 30,
    "sla_dispatch_alert_min": 3,
    "sla_pickup_alert_min": 10,
    "sla_trip_overrun_alert_min": 120,
    # Data & Privacy
    "data_retention_trip_days": 2555,          # 7 years
    "data_retention_pii_days": 1095,           # 3 years after last activity
    "data_retention_financial_years": 7,       # regulatory minimum
    "data_retention_audit_years": 7,
    "privacy_export_sla_hours": 72,
    "privacy_deletion_sla_days": 30,
    "privacy_auto_anonymize": False,
    "consent_marketing_opt_in": True,
    "consent_analytics_tracking": True,
    "consent_cookie_banner": True,
    "data_share_authorities": False,
    # Localization
    "default_language": "en",
    "supported_languages": ["en", "hi"],
    "rtl_enabled": False,
    "date_format": "DD/MM/YYYY",
    "time_format": "24h",
    "week_starts_on": "Monday",
    "currency_symbol_position": "before",
    "decimal_separator": ".",
    "thousands_separator": ",",
}

_DEFAULT_TOGGLES = [
    {"key": "guest_checkout",  "name": "Allow guest checkout", "description": "Book without an account · OTP at confirm", "enabled": False},
    {"key": "cash_payments",   "name": "Cash payments",        "description": "Accept cash for road trips (not air)",     "enabled": True},
    {"key": "scheduled_rides", "name": "Scheduled rides",      "description": "Book up to 7 days ahead",                  "enabled": True},
    {"key": "in_app_tipping",  "name": "In-app tipping",       "description": "Riders can tip drivers post-trip",         "enabled": True},
    {"key": "carbon_offset",   "name": "Carbon offset",        "description": "Optional ₹5 offset per trip",             "enabled": False},
]

_DEFAULT_FLAGS = [
    {
        "key": "new-dispatch-engine", "name": "New dispatch engine v3",
        "description": "Graph-based matching replacing the legacy nearest-driver loop. Currently 35% in Bengaluru & Mumbai with automatic rollback if assignment latency exceeds 800ms p95.",
        "environment": "prod", "rollout_pct": 35, "targeting": "BLR, MUM · gradual", "owner": "Ops", "enabled": True,
        "metrics": {"assign_latency_ms": 612, "match_rate_pct": 94.8, "cancellation_rate_pct": 4.2, "rollback_armed": True,
                    "latency_label": "p95 · under 800ms cap", "match_rate_label": "+2.1pt vs control", "cancellation_label": "−0.6pt vs baseline"},
    },
    {
        "key": "ai-eta-engine", "name": "AI ETA engine",
        "description": "ML-based ETA predictions replacing rule-based estimates. Running at 100% with accuracy tracking.",
        "environment": "prod", "rollout_pct": 100, "targeting": "All users", "owner": "Eng", "enabled": True,
        "metrics": {"assign_latency_ms": None, "match_rate_pct": 96.1, "cancellation_rate_pct": None, "rollback_armed": True,
                    "latency_label": None, "match_rate_label": "+3.4pt vs baseline", "cancellation_label": None},
    },
    {
        "key": "dynamic-surge-v2", "name": "Dynamic surge v2",
        "description": "Real-time zone-level surge based on supply-demand ratio. Partial rollout to Mumbai and Delhi.",
        "environment": "prod", "rollout_pct": 50, "targeting": "MUM, DEL · gradual", "owner": "Pricing", "enabled": True,
        "metrics": {"assign_latency_ms": None, "match_rate_pct": None, "cancellation_rate_pct": 3.8, "rollback_armed": False,
                    "latency_label": None, "match_rate_label": None, "cancellation_label": "−0.4pt vs 1.0× baseline"},
    },
    {
        "key": "smart-route-optimizer", "name": "Smart route optimizer",
        "description": "AI-powered multi-stop route optimization for drivers. Deployed to premium driver tier.",
        "environment": "prod", "rollout_pct": 75, "targeting": "Premium drivers", "owner": "Ops", "enabled": True,
        "metrics": {"assign_latency_ms": 284, "match_rate_pct": None, "cancellation_rate_pct": None, "rollback_armed": False,
                    "latency_label": "route compute · p95", "match_rate_label": None, "cancellation_label": None},
    },
    {
        "key": "ride-share-pooling", "name": "Ride-share pooling",
        "description": "Pool multiple riders going in the same direction. Internal beta only.",
        "environment": "staging", "rollout_pct": 10, "targeting": "Internal beta", "owner": "Product", "enabled": False,
        "metrics": None,
    },
    {
        "key": "carbon-offset-ui", "name": "Carbon offset UI widget",
        "description": "Show carbon offset option at booking confirmation step.",
        "environment": "staging", "rollout_pct": 0, "targeting": "All users", "owner": "Growth", "enabled": False,
        "metrics": None,
    },
    {
        "key": "in-app-chat", "name": "In-app rider-driver chat",
        "description": "Real-time chat between rider and driver during trip. BLR pilot.",
        "environment": "staging", "rollout_pct": 20, "targeting": "BLR pilot", "owner": "Product", "enabled": True,
        "metrics": None,
    },
]

_DEFAULT_KILL_SWITCHES = [
    {"key": "new_bookings",       "name": "New bookings",       "description": "Stop accepting all new ride requests",  "enabled": True,  "tone": "danger"},
    {"key": "surge_pricing",      "name": "Surge pricing",      "description": "Force surge to 1.0× everywhere",        "enabled": True,  "tone": "warn"},
    {"key": "promotions_engine",  "name": "Promotions engine",  "description": "Disable all promo redemptions",         "enabled": False, "tone": "warn"},
    {"key": "air_booking",        "name": "Heli / air booking", "description": "Pause air reservations",               "enabled": True,  "tone": "danger"},
    {"key": "driver_onboarding",  "name": "Driver onboarding",  "description": "Pause new driver signups",             "enabled": True,  "tone": "warn"},
]


# ── Helper ────────────────────────────────────────────────────────────────────

async def _seed_if_empty(db: AsyncSession, model, defaults: list) -> list:
    """Insert defaults if table is empty, then return all rows."""
    count_result = await db.execute(select(func.count()).select_from(model))
    count = count_result.scalar_one()
    if count == 0:
        now = datetime.now(timezone.utc)
        for item in defaults:
            row_data = dict(item)
            # Add UUID if model uses it
            if hasattr(model, "id") and model.__table__.c["id"].type.__class__.__name__ in ("String", "VARCHAR"):
                row_data.setdefault("id", str(uuid.uuid4()))
            # Add timestamps if model has them
            if hasattr(model, "created_at"):
                row_data.setdefault("created_at", now)
            if hasattr(model, "updated_at"):
                row_data.setdefault("updated_at", now)
            db.add(model(**row_data))
        await db.commit()
    result = await db.execute(select(model))
    return list(result.scalars().all())


# ── Platform Settings ─────────────────────────────────────────────────────────

async def get_settings(db: AsyncSession) -> PlatformSettings:
    result = await db.execute(select(PlatformSettings).where(PlatformSettings.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        row = PlatformSettings(id=1, **_DEFAULT_SETTINGS)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


async def update_settings(db: AsyncSession, data: dict) -> PlatformSettings:
    row = await get_settings(db)
    data["last_edited_at"] = datetime.now(timezone.utc)
    for key, value in data.items():
        if hasattr(row, key):
            setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


# ── Platform Toggles ──────────────────────────────────────────────────────────

async def list_toggles(db: AsyncSession) -> List[PlatformToggle]:
    result = await db.execute(select(PlatformToggle))
    rows = list(result.scalars().all())
    if not rows:
        rows = await _seed_if_empty(db, PlatformToggle, _DEFAULT_TOGGLES)
    return rows


async def update_toggle(db: AsyncSession, key: str, enabled: bool) -> PlatformToggle:
    result = await db.execute(select(PlatformToggle).where(PlatformToggle.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        raise NotFoundException("PlatformToggle")
    row.enabled = enabled
    await db.commit()
    await db.refresh(row)
    return row


# ── Feature Flags ─────────────────────────────────────────────────────────────

async def list_flags(db: AsyncSession, environment: Optional[str] = None) -> List[FeatureFlag]:
    stmt = select(FeatureFlag)
    if environment:
        stmt = stmt.where(FeatureFlag.environment == environment)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    if not rows and not environment:
        rows = await _seed_if_empty(db, FeatureFlag, _DEFAULT_FLAGS)
    return rows


async def create_flag(db: AsyncSession, data: dict) -> FeatureFlag:
    now = datetime.now(timezone.utc)
    flag = FeatureFlag(
        id=str(uuid.uuid4()),
        enabled=False,
        created_at=now,
        updated_at=now,
        **data,
    )
    db.add(flag)
    await db.commit()
    await db.refresh(flag)
    return flag


async def update_flag(db: AsyncSession, flag_id: str, data: dict) -> FeatureFlag:
    result = await db.execute(select(FeatureFlag).where(FeatureFlag.id == flag_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise NotFoundException("FeatureFlag")
    for key, value in data.items():
        if hasattr(row, key):
            setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return row


async def get_flag_metrics(db: AsyncSession, flag_id: str) -> dict | None:
    result = await db.execute(
        select(FeatureFlag.metrics).where(FeatureFlag.id == flag_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise NotFoundException("FeatureFlag")
    return row  # may be None if no metrics stored


# ── Kill Switches ─────────────────────────────────────────────────────────────

async def list_kill_switches(db: AsyncSession) -> List[KillSwitch]:
    result = await db.execute(select(KillSwitch))
    rows = list(result.scalars().all())
    if not rows:
        rows = await _seed_if_empty(db, KillSwitch, _DEFAULT_KILL_SWITCHES)
    return rows


async def update_kill_switch(db: AsyncSession, key: str, enabled: bool) -> KillSwitch:
    result = await db.execute(select(KillSwitch).where(KillSwitch.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        raise NotFoundException("KillSwitch")
    row.enabled = enabled
    await db.commit()
    await db.refresh(row)
    return row


# ── Maintenance Windows ───────────────────────────────────────────────────────

async def list_maintenance_windows(db: AsyncSession) -> List[MaintenanceWindow]:
    result = await db.execute(select(MaintenanceWindow).order_by(MaintenanceWindow.starts_at))
    return list(result.scalars().all())


async def create_maintenance_window(db: AsyncSession, data: dict) -> MaintenanceWindow:
    now = datetime.now(timezone.utc)
    window = MaintenanceWindow(
        id=str(uuid.uuid4()),
        created_at=now,
        **data,
    )
    db.add(window)
    await db.commit()
    await db.refresh(window)
    return window


async def delete_maintenance_window(db: AsyncSession, window_id: str) -> None:
    result = await db.execute(select(MaintenanceWindow).where(MaintenanceWindow.id == window_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise NotFoundException("MaintenanceWindow")
    await db.delete(row)
    await db.commit()
