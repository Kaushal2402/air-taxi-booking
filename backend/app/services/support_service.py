from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_user import AdminUser
from app.models.support import SlaPolicy, Ticket, TicketMessage
from app.schemas.support import (
    SlaPolicyCreate,
    SlaPolicyResponse,
    SlaPolicyUpdate,
    TicketDetailResponse,
    TicketListResponse,
    TicketMessageResponse,
    TicketResponse,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ticket_to_response(ticket: Ticket, assignee_name: str | None = None) -> TicketResponse:
    return TicketResponse(
        id=ticket.id,
        ticket_ref=ticket.ticket_ref,
        requester_type=ticket.requester_type,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester_name,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        assignee_id=ticket.assignee_id,
        assignee_name=assignee_name,
        subject=ticket.subject,
        sla_due_at=ticket.sla_due_at,
        sla_breached=ticket.sla_breached,
        linked_booking_id=ticket.linked_booking_id,
        linked_transaction_id=ticket.linked_transaction_id,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def _ticket_to_detail(
    ticket: Ticket,
    assignee_name: str | None = None,
    messages: list[TicketMessage] | None = None,
) -> TicketDetailResponse:
    return TicketDetailResponse(
        id=ticket.id,
        ticket_ref=ticket.ticket_ref,
        requester_type=ticket.requester_type,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester_name,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        assignee_id=ticket.assignee_id,
        assignee_name=assignee_name,
        subject=ticket.subject,
        sla_due_at=ticket.sla_due_at,
        sla_breached=ticket.sla_breached,
        linked_booking_id=ticket.linked_booking_id,
        linked_transaction_id=ticket.linked_transaction_id,
        resolution_code=ticket.resolution_code,
        resolution_note=ticket.resolution_note,
        resolved_at=ticket.resolved_at,
        escalated_at=ticket.escalated_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[TicketMessageResponse.model_validate(m) for m in (messages or [])],
    )


async def _check_sla_breach(db: AsyncSession, ticket: Ticket) -> bool:
    """Compute whether ticket SLA is breached and persist the flag if newly breached."""
    if ticket.sla_due_at is None:
        return False
    # Ensure both datetimes are timezone-aware for comparison
    sla_due = ticket.sla_due_at
    if sla_due.tzinfo is None:
        sla_due = sla_due.replace(tzinfo=timezone.utc)
    breached = _utcnow() > sla_due
    if breached and not ticket.sla_breached:
        ticket.sla_breached = True
        await db.flush()
    return breached


async def _compute_sla_due(db: AsyncSession, category: str, priority: str) -> datetime | None:
    """Look up SLA policy for category and return the resolution deadline."""
    result = await db.execute(
        select(SlaPolicy).where(SlaPolicy.category == category)
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        return None
    field_map = {
        "urgent": policy.urgent_resolution_minutes,
        "high": policy.high_resolution_minutes,
        "med": policy.med_resolution_minutes,
        "low": policy.low_resolution_minutes,
    }
    minutes = field_map.get(priority, policy.med_resolution_minutes)
    return _utcnow() + timedelta(minutes=minutes)


# ── List tickets ──────────────────────────────────────────────────────────────

async def list_tickets(
    db: AsyncSession,
    page: int,
    page_size: int,
    category: str | None,
    priority: str | None,
    status: str | None,
    assignee_id: str | None,
    sla_breach: bool | None,
    search: str | None,
) -> TicketListResponse:
    q = select(Ticket)

    if category:
        q = q.where(Ticket.category == category)
    if priority:
        q = q.where(Ticket.priority == priority)
    if status:
        q = q.where(Ticket.status == status)
    if assignee_id:
        q = q.where(Ticket.assignee_id == assignee_id)
    if sla_breach is True:
        q = q.where(Ticket.sla_breached == True)  # noqa: E712
    if search:
        like = f"%{search}%"
        q = q.where(
            or_(
                Ticket.ticket_ref.ilike(like),
                Ticket.requester_name.ilike(like),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    q = q.order_by(Ticket.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(q)
    tickets = result.scalars().all()

    # Collect assignee names in bulk
    assignee_ids = list({t.assignee_id for t in tickets if t.assignee_id})
    assignee_map: dict[str, str] = {}
    if assignee_ids:
        ar = await db.execute(
            select(AdminUser).where(AdminUser.id.in_(assignee_ids))
        )
        for au in ar.scalars().all():
            assignee_map[au.id] = au.name

    # Update SLA breach flags
    items: list[TicketResponse] = []
    for t in tickets:
        await _check_sla_breach(db, t)
        items.append(_ticket_to_response(t, assignee_map.get(t.assignee_id) if t.assignee_id else None))

    await db.commit()

    return TicketListResponse(items=items, total=total, page=page, page_size=page_size)


# ── Get single ticket ─────────────────────────────────────────────────────────

async def get_ticket(db: AsyncSession, ticket_id: str) -> TicketDetailResponse:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await _check_sla_breach(db, ticket)

    # Load messages
    mr = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at)
    )
    messages = mr.scalars().all()

    assignee_name: str | None = None
    if ticket.assignee_id:
        ar = await db.execute(select(AdminUser).where(AdminUser.id == ticket.assignee_id))
        admin = ar.scalar_one_or_none()
        if admin:
            assignee_name = admin.name

    await db.commit()
    return _ticket_to_detail(ticket, assignee_name, list(messages))


# ── Create ticket ─────────────────────────────────────────────────────────────

async def create_ticket(
    db: AsyncSession,
    body,
    author_id: str,
    author_name: str,
    author_role: str,
) -> TicketDetailResponse:
    # Auto-generate ticket_ref
    count_result = await db.execute(select(func.count()).select_from(select(Ticket).subquery()))
    count = count_result.scalar_one()
    ticket_ref = f"TKT-{count + 1:05d}"

    # Compute SLA due
    sla_due_at = await _compute_sla_due(db, body.category, body.priority)

    ticket = Ticket(
        ticket_ref=ticket_ref,
        requester_type=body.requester_type,
        requester_id=body.requester_id,
        requester_name=body.requester_name,
        category=body.category,
        priority=body.priority,
        subject=body.subject,
        linked_booking_id=body.linked_booking_id,
        linked_transaction_id=body.linked_transaction_id,
        sla_due_at=sla_due_at,
    )
    db.add(ticket)
    await db.flush()

    # Create initial message
    msg = TicketMessage(
        ticket_id=ticket.id,
        kind="reply",
        author_id=author_id,
        author_name=author_name,
        author_role=author_role,
        body=body.body,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(ticket)
    await db.refresh(msg)
    await db.commit()

    return _ticket_to_detail(ticket, None, [msg])


# ── Assign ticket ─────────────────────────────────────────────────────────────

async def assign_ticket(db: AsyncSession, ticket_id: str, assignee_id: str) -> dict:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ar = await db.execute(select(AdminUser).where(AdminUser.id == assignee_id))
    admin = ar.scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=404, detail="Admin user not found")

    ticket.assignee_id = assignee_id
    if ticket.status == "open":
        ticket.status = "in_progress"

    await db.flush()
    await db.refresh(ticket)
    await db.commit()

    return {
        "id": ticket.id,
        "assignee_id": ticket.assignee_id,
        "status": ticket.status,
        "updated_at": ticket.updated_at,
    }


# ── Add message ───────────────────────────────────────────────────────────────

async def add_message(
    db: AsyncSession,
    ticket_id: str,
    kind: str,
    body: str,
    author_id: str,
    author_name: str,
    author_role: str,
) -> TicketMessageResponse:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    msg = TicketMessage(
        ticket_id=ticket_id,
        kind=kind,
        author_id=author_id,
        author_name=author_name,
        author_role=author_role,
        body=body,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)
    await db.commit()

    return TicketMessageResponse.model_validate(msg)


# ── Resolve ticket ────────────────────────────────────────────────────────────

async def resolve_ticket(
    db: AsyncSession,
    ticket_id: str,
    resolution_code: str,
    resolution_note: str | None,
) -> dict:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = "resolved"
    ticket.resolution_code = resolution_code
    ticket.resolution_note = resolution_note
    ticket.resolved_at = _utcnow()

    await db.flush()
    await db.refresh(ticket)
    await db.commit()

    return {
        "id": ticket.id,
        "status": ticket.status,
        "resolution_code": ticket.resolution_code,
        "resolved_at": ticket.resolved_at,
        "updated_at": ticket.updated_at,
    }


# ── Escalate ticket ───────────────────────────────────────────────────────────

async def escalate_ticket(
    db: AsyncSession,
    ticket_id: str,
    reason: str,
    author_id: str,
    author_name: str,
    author_role: str,
) -> dict:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.priority = "urgent"
    ticket.escalated_at = _utcnow()

    # Add internal note
    msg = TicketMessage(
        ticket_id=ticket_id,
        kind="internal_note",
        author_id=author_id,
        author_name=author_name,
        author_role=author_role,
        body=f"Escalation reason: {reason}",
    )
    db.add(msg)

    await db.flush()
    await db.refresh(ticket)
    await db.commit()

    return {
        "id": ticket.id,
        "priority": ticket.priority,
        "escalated_at": ticket.escalated_at,
        "updated_at": ticket.updated_at,
    }


# ── SLA Policies ──────────────────────────────────────────────────────────────

async def create_sla_policy(db: AsyncSession, data: SlaPolicyCreate) -> SlaPolicyResponse:
    # Prevent duplicate category
    existing = await db.execute(select(SlaPolicy).where(SlaPolicy.category == data.category))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="SLA policy for this category already exists")

    policy = SlaPolicy(**data.model_dump())
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    await db.commit()
    return SlaPolicyResponse.model_validate(policy)


async def list_sla_policies(db: AsyncSession) -> List[SlaPolicyResponse]:
    result = await db.execute(select(SlaPolicy).order_by(SlaPolicy.category))
    policies = result.scalars().all()
    return [SlaPolicyResponse.model_validate(p) for p in policies]


async def update_sla_policy(
    db: AsyncSession,
    policy_id: str,
    data: SlaPolicyUpdate,
) -> SlaPolicyResponse:
    result = await db.execute(select(SlaPolicy).where(SlaPolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if policy is None:
        raise HTTPException(status_code=404, detail="SLA policy not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(policy, field, value)

    await db.flush()
    await db.refresh(policy)
    await db.commit()

    return SlaPolicyResponse.model_validate(policy)
