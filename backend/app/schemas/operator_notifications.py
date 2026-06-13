from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    type: str  # request / assignment / expiry / payout / cancel / ops
    title: str
    message: str
    channel: str  # in_app / email / push
    status: str   # unread / read
    created_at: datetime
    link_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Channel-level toggle group
# ---------------------------------------------------------------------------

class ChannelToggles(BaseModel):
    email: bool = True
    sms: bool = False
    in_app: bool = True


# ---------------------------------------------------------------------------
# Notification preferences
# ---------------------------------------------------------------------------

class NotificationPrefs(BaseModel):
    new_requests: ChannelToggles = ChannelToggles()
    ttl_warnings: ChannelToggles = ChannelToggles()
    assignment_updates: ChannelToggles = ChannelToggles()
    document_expiry: ChannelToggles = ChannelToggles()
    payout_updates: ChannelToggles = ChannelToggles()
    cancellations: ChannelToggles = ChannelToggles()
    quiet_hours_start: Optional[str] = None  # "HH:MM" e.g. "22:00"
    quiet_hours_end: Optional[str] = None    # "HH:MM" e.g. "07:00"


class ChannelTogglesUpdate(BaseModel):
    email: Optional[bool] = None
    sms: Optional[bool] = None
    in_app: Optional[bool] = None


class NotificationPrefsUpdate(BaseModel):
    new_requests: Optional[ChannelTogglesUpdate] = None
    ttl_warnings: Optional[ChannelTogglesUpdate] = None
    assignment_updates: Optional[ChannelTogglesUpdate] = None
    document_expiry: Optional[ChannelTogglesUpdate] = None
    payout_updates: Optional[ChannelTogglesUpdate] = None
    cancellations: Optional[ChannelTogglesUpdate] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
