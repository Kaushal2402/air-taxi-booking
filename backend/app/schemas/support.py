from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


# ── Ticket Message ────────────────────────────────────────────────────────────

class TicketMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ticket_id: str
    kind: str
    author_id: str
    author_name: str
    author_role: str
    body: str
    created_at: datetime


class TicketMessageCreate(BaseModel):
    kind: str
    body: str


# ── Ticket ────────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    requester_type: str
    requester_id: str
    requester_name: str
    category: str
    priority: str
    subject: str
    body: str
    linked_booking_id: str | None = None
    linked_booking_type: str | None = None
    linked_transaction_id: str | None = None


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ticket_ref: str
    requester_type: str
    requester_id: str
    requester_name: str
    category: str
    priority: str
    status: str
    assignee_id: str | None
    assignee_name: str | None = None
    subject: str
    sla_due_at: datetime | None
    sla_breached: bool
    linked_booking_id: str | None
    linked_booking_type: str | None = None
    linked_transaction_id: str | None
    created_at: datetime
    updated_at: datetime


class TicketDetailResponse(TicketResponse):
    model_config = ConfigDict(from_attributes=True)

    messages: List[TicketMessageResponse] = []
    resolution_code: str | None = None
    resolution_note: str | None = None
    resolved_at: datetime | None = None
    escalated_at: datetime | None = None


class TicketListResponse(BaseModel):
    items: List[TicketResponse]
    total: int
    page: int
    page_size: int


# ── Ticket Actions ────────────────────────────────────────────────────────────

class TicketAssignRequest(BaseModel):
    assignee_id: str


class TicketResolveRequest(BaseModel):
    resolution_code: str
    resolution_note: str | None = None


class TicketEscalateRequest(BaseModel):
    reason: str


class TicketStatusUpdateRequest(BaseModel):
    status: str  # open | in_progress | resolved | closed
    resolution_code: str | None = None   # required when moving to resolved
    resolution_note: str | None = None


# ── SLA Policy ────────────────────────────────────────────────────────────────

class SlaPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    urgent_first_response_minutes: int
    urgent_resolution_minutes: int
    high_first_response_minutes: int
    high_resolution_minutes: int
    med_first_response_minutes: int
    med_resolution_minutes: int
    low_first_response_minutes: int
    low_resolution_minutes: int
    created_at: datetime
    updated_at: datetime


class SlaPolicyUpdate(BaseModel):
    urgent_first_response_minutes: int | None = None
    urgent_resolution_minutes: int | None = None
    high_first_response_minutes: int | None = None
    high_resolution_minutes: int | None = None
    med_first_response_minutes: int | None = None
    med_resolution_minutes: int | None = None
    low_first_response_minutes: int | None = None
    low_resolution_minutes: int | None = None


class SlaPolicyCreate(BaseModel):
    category: str
    urgent_first_response_minutes: int = 10
    urgent_resolution_minutes: int = 60
    high_first_response_minutes: int = 30
    high_resolution_minutes: int = 180
    med_first_response_minutes: int = 120
    med_resolution_minutes: int = 480
    low_first_response_minutes: int = 480
    low_resolution_minutes: int = 2880
