from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


# ── Platform Settings ─────────────────────────────────────────────────────────

class PlatformSettingsResponse(BaseModel):
    legal_entity: Optional[str] = None
    gstin: Optional[str] = None
    primary_region: Optional[str] = None
    base_currency: Optional[str] = None
    timezone: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    settlement_cycle: Optional[str] = None
    driver_payout_day: Optional[str] = None
    surge_ceiling: Optional[float] = None
    last_edited_at: Optional[Any] = None
    last_edited_by: Optional[str] = None
    # Booking rules
    max_advance_days: Optional[int] = None
    min_advance_minutes: Optional[int] = None
    cancellation_free_window_min: Optional[int] = None
    cancellation_fee_pct: Optional[float] = None
    max_cancellations_per_day: Optional[int] = None
    no_show_wait_minutes: Optional[int] = None
    no_show_fee_pct: Optional[float] = None
    driver_acceptance_timeout_sec: Optional[int] = None
    max_dispatch_retries: Optional[int] = None
    auto_assign_enabled: Optional[bool] = None
    dispatch_initial_radius_m: Optional[int] = None
    dispatch_radius_step_m: Optional[int] = None
    dispatch_max_radius_m: Optional[int] = None
    rank_weight_distance: Optional[int] = None
    rank_weight_rating: Optional[int] = None
    rank_weight_acceptance: Optional[int] = None
    free_waiting_minutes: Optional[int] = None
    waiting_charge_per_min: Optional[float] = None
    max_active_bookings_per_rider: Optional[int] = None
    default_commission_pct: Optional[float] = None
    refund_destination_default: Optional[str] = None
    air_min_advance_hours: Optional[int] = None
    # Quiet hours
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_action: Optional[str] = None
    # Safety & SOS
    sos_enabled: Optional[bool] = None
    sos_contact_number: Optional[str] = None
    sos_share_location: Optional[bool] = None
    sos_alert_admin: Optional[bool] = None
    driver_grace_period_enabled: Optional[bool] = None
    driver_grace_period_days: Optional[int] = None
    operator_site_visit_required: Optional[bool] = None
    driver_min_rating: Optional[float] = None
    driver_max_cancellation_rate_pct: Optional[float] = None
    driver_min_acceptance_rate_pct: Optional[float] = None
    driver_threshold_window_days: Optional[int] = None
    sla_dispatch_alert_min: Optional[int] = None
    sla_pickup_alert_min: Optional[int] = None
    sla_trip_overrun_alert_min: Optional[int] = None
    # Data & Privacy
    data_retention_trip_days: Optional[int] = None
    data_retention_pii_days: Optional[int] = None
    data_retention_financial_years: Optional[int] = None
    data_retention_audit_years: Optional[int] = None
    privacy_export_sla_hours: Optional[int] = None
    privacy_deletion_sla_days: Optional[int] = None
    privacy_auto_anonymize: Optional[bool] = None
    consent_marketing_opt_in: Optional[bool] = None
    consent_analytics_tracking: Optional[bool] = None
    consent_cookie_banner: Optional[bool] = None
    data_share_authorities: Optional[bool] = None
    # Localization
    default_language: Optional[str] = None
    supported_languages: Optional[Any] = None
    rtl_enabled: Optional[bool] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    week_starts_on: Optional[str] = None
    currency_symbol_position: Optional[str] = None
    decimal_separator: Optional[str] = None
    thousands_separator: Optional[str] = None

    model_config = {"from_attributes": True}


class PlatformSettingsUpdate(BaseModel):
    legal_entity: Optional[str] = None
    gstin: Optional[str] = None
    primary_region: Optional[str] = None
    base_currency: Optional[str] = None
    timezone: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    settlement_cycle: Optional[str] = None
    driver_payout_day: Optional[str] = None
    surge_ceiling: Optional[float] = None
    last_edited_by: Optional[str] = None
    # Booking rules
    max_advance_days: Optional[int] = None
    min_advance_minutes: Optional[int] = None
    cancellation_free_window_min: Optional[int] = None
    cancellation_fee_pct: Optional[float] = None
    max_cancellations_per_day: Optional[int] = None
    no_show_wait_minutes: Optional[int] = None
    no_show_fee_pct: Optional[float] = None
    driver_acceptance_timeout_sec: Optional[int] = None
    max_dispatch_retries: Optional[int] = None
    auto_assign_enabled: Optional[bool] = None
    dispatch_initial_radius_m: Optional[int] = None
    dispatch_radius_step_m: Optional[int] = None
    dispatch_max_radius_m: Optional[int] = None
    rank_weight_distance: Optional[int] = None
    rank_weight_rating: Optional[int] = None
    rank_weight_acceptance: Optional[int] = None
    free_waiting_minutes: Optional[int] = None
    waiting_charge_per_min: Optional[float] = None
    max_active_bookings_per_rider: Optional[int] = None
    default_commission_pct: Optional[float] = None
    refund_destination_default: Optional[str] = None
    air_min_advance_hours: Optional[int] = None
    # Quiet hours
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_action: Optional[str] = None
    # Safety & SOS
    sos_enabled: Optional[bool] = None
    sos_contact_number: Optional[str] = None
    sos_share_location: Optional[bool] = None
    sos_alert_admin: Optional[bool] = None
    driver_grace_period_enabled: Optional[bool] = None
    driver_grace_period_days: Optional[int] = None
    operator_site_visit_required: Optional[bool] = None
    driver_min_rating: Optional[float] = None
    driver_max_cancellation_rate_pct: Optional[float] = None
    driver_min_acceptance_rate_pct: Optional[float] = None
    driver_threshold_window_days: Optional[int] = None
    sla_dispatch_alert_min: Optional[int] = None
    sla_pickup_alert_min: Optional[int] = None
    sla_trip_overrun_alert_min: Optional[int] = None
    # Data & Privacy
    data_retention_trip_days: Optional[int] = None
    data_retention_pii_days: Optional[int] = None
    data_retention_financial_years: Optional[int] = None
    data_retention_audit_years: Optional[int] = None
    privacy_export_sla_hours: Optional[int] = None
    privacy_deletion_sla_days: Optional[int] = None
    privacy_auto_anonymize: Optional[bool] = None
    consent_marketing_opt_in: Optional[bool] = None
    consent_analytics_tracking: Optional[bool] = None
    consent_cookie_banner: Optional[bool] = None
    data_share_authorities: Optional[bool] = None
    # Localization
    default_language: Optional[str] = None
    supported_languages: Optional[Any] = None
    rtl_enabled: Optional[bool] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    week_starts_on: Optional[str] = None
    currency_symbol_position: Optional[str] = None
    decimal_separator: Optional[str] = None
    thousands_separator: Optional[str] = None


# ── Platform Toggles ──────────────────────────────────────────────────────────

class PlatformToggleResponse(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    enabled: bool

    model_config = {"from_attributes": True}


class PlatformToggleUpdate(BaseModel):
    enabled: bool


# ── Feature Flags ─────────────────────────────────────────────────────────────

class FlagMetrics(BaseModel):
    assign_latency_ms: Optional[float] = None
    match_rate_pct: Optional[float] = None
    cancellation_rate_pct: Optional[float] = None
    rollback_armed: Optional[bool] = None
    latency_label: Optional[str] = None
    match_rate_label: Optional[str] = None
    cancellation_label: Optional[str] = None

    model_config = {"from_attributes": True}


class FeatureFlagResponse(BaseModel):
    id: str
    key: str
    name: str
    description: Optional[str] = None
    environment: Optional[str] = None
    rollout_pct: int = 0
    targeting: Optional[str] = None
    owner: Optional[str] = None
    enabled: bool
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class FeatureFlagCreate(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    environment: Optional[str] = None
    rollout_pct: int = 0
    targeting: Optional[str] = None
    owner: Optional[str] = None


class FeatureFlagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    environment: Optional[str] = None
    rollout_pct: Optional[int] = None
    targeting: Optional[str] = None
    owner: Optional[str] = None
    enabled: Optional[bool] = None


class FeatureFlagsListResponse(BaseModel):
    items: List[FeatureFlagResponse]
    total: int


# ── Kill Switches ─────────────────────────────────────────────────────────────

class KillSwitchResponse(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    enabled: bool
    tone: str

    model_config = {"from_attributes": True}


class KillSwitchUpdate(BaseModel):
    enabled: bool


# ── Maintenance Windows ───────────────────────────────────────────────────────

class MaintenanceWindowResponse(BaseModel):
    id: str
    region_name: str
    description: Optional[str] = None
    starts_at: Any
    ends_at: Any
    created_at: Any

    model_config = {"from_attributes": True}


class MaintenanceWindowCreate(BaseModel):
    region_name: str
    description: Optional[str] = None
    starts_at: datetime
    ends_at: datetime


class MaintenanceWindowsListResponse(BaseModel):
    items: List[MaintenanceWindowResponse]
