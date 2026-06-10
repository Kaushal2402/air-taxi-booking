from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import UTCDateTime, UUIDPrimaryKeyMixin


# ── Platform Settings (single-row, id=1) ─────────────────────────────────────

class PlatformSettings(Base):
    __tablename__ = "platform_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    legal_entity: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    primary_region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    base_currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    fiscal_year_start: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    settlement_cycle: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    driver_payout_day: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    surge_ceiling: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_edited_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    last_edited_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Booking rules ──────────────────────────────────────────────────────────
    # Scheduling
    max_advance_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_advance_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Cancellation
    cancellation_free_window_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cancellation_fee_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_cancellations_per_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # No-show
    no_show_wait_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    no_show_fee_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Dispatch
    driver_acceptance_timeout_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_dispatch_retries: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    auto_assign_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # Dispatch radius
    dispatch_initial_radius_m: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dispatch_radius_step_m: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dispatch_max_radius_m: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Driver ranking weights (should sum to 100)
    rank_weight_distance: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rank_weight_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rank_weight_acceptance: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Waiting time
    free_waiting_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    waiting_charge_per_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Rider limits
    max_active_bookings_per_rider: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Commission & refunds
    default_commission_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    refund_destination_default: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Air booking
    air_min_advance_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    carbon_offset_amount_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # default 500 paise
    # Quiet hours
    quiet_hours_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    quiet_hours_start: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)   # HH:MM
    quiet_hours_end: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)     # HH:MM
    quiet_hours_action: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # cap_surge | pause_bookings

    # ── Safety & SOS ──────────────────────────────────────────────────────────
    # SOS & Emergency
    sos_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    sos_contact_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sos_share_location: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    sos_alert_admin: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # Driver onboarding policy
    driver_grace_period_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    driver_grace_period_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    operator_site_visit_required: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # Auto-suspension thresholds
    driver_min_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    driver_max_cancellation_rate_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    driver_min_acceptance_rate_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    driver_threshold_window_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # SLA timers
    sla_dispatch_alert_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sla_pickup_alert_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sla_trip_overrun_alert_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── Data & Privacy ────────────────────────────────────────────────────────
    # Retention windows
    data_retention_trip_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)       # booking/trip records
    data_retention_pii_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)        # customer PII after last activity
    data_retention_financial_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # financial records (legal min)
    data_retention_audit_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)     # audit logs
    # Privacy request handling
    privacy_export_sla_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    privacy_deletion_sla_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    privacy_auto_anonymize: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # Consent & tracking
    consent_marketing_opt_in: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    consent_analytics_tracking: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    consent_cookie_banner: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    data_share_authorities: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # ── Localization ──────────────────────────────────────────────────────────
    default_language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)   # BCP-47, e.g. "en"
    supported_languages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)     # ["en","hi","ar"]
    rtl_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    date_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)        # DD/MM/YYYY etc.
    time_format: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)         # "24h" | "12h"
    week_starts_on: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)     # "Monday" | "Sunday"
    currency_symbol_position: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "before" | "after"
    decimal_separator: Mapped[Optional[str]] = mapped_column(String(1), nullable=True)   # "." | ","
    thousands_separator: Mapped[Optional[str]] = mapped_column(String(1), nullable=True) # "," | "."


# ── Platform Toggles ──────────────────────────────────────────────────────────

class PlatformToggle(Base):
    __tablename__ = "platform_toggles"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


# ── Feature Flags ─────────────────────────────────────────────────────────────

class FeatureFlag(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "feature_flags"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    environment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rollout_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    targeting: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)


# ── Kill Switches ─────────────────────────────────────────────────────────────

class KillSwitch(Base):
    __tablename__ = "kill_switches"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tone: Mapped[str] = mapped_column(String(10), default="warn", nullable=False)


# ── Maintenance Windows ───────────────────────────────────────────────────────

class MaintenanceWindow(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "maintenance_windows"

    region_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
