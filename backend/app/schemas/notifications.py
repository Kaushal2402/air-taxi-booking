from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


# ── Template schemas ──────────────────────────────────────────────────────────

class NotificationTemplateBase(BaseModel):
    name: str
    template_code: str
    event_trigger: str = ""
    channels: list[str] = []
    status: str = "draft"
    category: str = "Transactional"
    push_title: str | None = None
    push_body: str | None = None
    sms_body: str | None = None
    email_subject: str | None = None
    email_body: str | None = None
    wa_body: str | None = None
    priority: str = "normal"
    quiet_hours_override: bool = False
    sms_fallback_seconds: int = 30
    dedup_window_seconds: int = 120


class NotificationTemplateCreate(NotificationTemplateBase):
    pass


class NotificationTemplateUpdate(BaseModel):
    name: str | None = None
    event_trigger: str | None = None
    channels: list[str] | None = None
    status: str | None = None
    category: str | None = None
    push_title: str | None = None
    push_body: str | None = None
    sms_body: str | None = None
    email_subject: str | None = None
    email_body: str | None = None
    wa_body: str | None = None
    priority: str | None = None
    quiet_hours_override: bool | None = None
    sms_fallback_seconds: int | None = None
    dedup_window_seconds: int | None = None


class NotificationTemplateResponse(BaseModel):
    id: str
    name: str
    template_code: str
    event_trigger: str
    channels: list[str]
    status: str
    category: str
    push_title: str | None
    push_body: str | None
    sms_body: str | None
    email_subject: str | None
    email_body: str | None
    wa_body: str | None
    priority: str
    quiet_hours_override: bool
    sms_fallback_seconds: int
    dedup_window_seconds: int
    sent_30d: int
    open_rate: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationTemplateListResponse(BaseModel):
    items: list[NotificationTemplateResponse]
    total: int


# ── Delivery log ──────────────────────────────────────────────────────────────

class NotificationLogResponse(BaseModel):
    id: str
    template_id: str | None
    template_name: str
    channel: str
    recipient: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationLogListResponse(BaseModel):
    items: list[NotificationLogResponse]
    total: int


# ── Stats ─────────────────────────────────────────────────────────────────────

class NotificationStatsResponse(BaseModel):
    sent_30d: int
    delivery_rate: float
    push_opt_in: float
    avg_open_marketing: float
    total_templates: int
    live_templates: int


# ── Broadcast ─────────────────────────────────────────────────────────────────

class BroadcastCreate(BaseModel):
    audience_description: str
    channel: str
    message: str
    scheduled_at: str | None = None


class BroadcastResponse(BaseModel):
    id: str
    audience_description: str
    channel: str
    message: str
    status: str
    estimated_reach: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
