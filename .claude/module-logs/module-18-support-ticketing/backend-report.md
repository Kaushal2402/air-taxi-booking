# Module 18 — Support & Ticketing Console: Backend Report

## Files Created / Modified

### New Files
- `backend/app/models/support.py` — 3 SQLAlchemy models: `Ticket`, `TicketMessage`, `SlaPolicy`
- `backend/app/schemas/support.py` — Pydantic v2 schemas for all request/response types
- `backend/app/services/support_service.py` — full async service layer
- `backend/app/api/v1/endpoints/support.py` — FastAPI router with 9 endpoints
- `backend/alembic/versions/48896e15d71d_add_module_18_support_ticketing.py` — migration (not yet applied)

### Modified Files
- `backend/app/models/__init__.py` — registered `Ticket`, `TicketMessage`, `SlaPolicy`
- `backend/app/api/v1/router.py` — registered `support_router` at `/api/v1/support`

## Models (BE-01)
- **Ticket** (`tickets` table) — full lifecycle: ticket_ref, requester info, category/priority/status, assignee FK → admin_users, SLA fields, resolution fields, escalation timestamp
- **TicketMessage** (`ticket_messages` table) — reply or internal_note, author metadata, body
- **SlaPolicy** (`sla_policies` table) — per-category, 4 priority tiers × (first_response + resolution) minutes

## Schemas (BE-02)
All response schemas use `model_config = ConfigDict(from_attributes=True)`.
Key schemas: `TicketCreate`, `TicketResponse`, `TicketDetailResponse` (extends TicketResponse + messages), `TicketListResponse`, `TicketMessageResponse`, `TicketMessageCreate`, `TicketAssignRequest`, `TicketResolveRequest`, `TicketEscalateRequest`, `SlaPolicyResponse`, `SlaPolicyUpdate`.

## Service Layer (BE-03)
- `list_tickets` — paginated, filtered by category/priority/status/assignee/sla_breach/search; bulk loads assignee names; auto-updates `sla_breached` flag on newly breached tickets
- `get_ticket` — loads ticket + messages + assignee name; updates SLA breach flag
- `create_ticket` — auto-generates `TKT-XXXXX` ref, computes `sla_due_at` from SlaPolicy, creates initial TicketMessage
- `assign_ticket` — sets assignee, bumps status to `in_progress` if was `open`
- `add_message` — adds reply or internal_note
- `resolve_ticket` — sets status=resolved, resolution_code/note, resolved_at
- `escalate_ticket` — sets priority=urgent, escalated_at, adds internal_note with reason
- `list_sla_policies` / `update_sla_policy` — CRUD for SLA config

## Endpoints (BE-04 + BE-05)
All at `/api/v1/support`:
- `GET /tickets` — list with query filters
- `GET /tickets/{ticket_id}` — full detail with messages
- `POST /tickets` → 201 — create ticket
- `POST /tickets/{ticket_id}/assign`
- `POST /tickets/{ticket_id}/messages` → 201
- `POST /tickets/{ticket_id}/resolve`
- `POST /tickets/{ticket_id}/escalate`
- `GET /sla-policies`
- `PATCH /sla-policies/{policy_id}`

## Migration (BE-06)
File: `backend/alembic/versions/48896e15d71d_add_module_18_support_ticketing.py`
Detects: `sla_policies`, `tickets`, `ticket_messages` tables + all indexes.
**Not applied** — run `alembic upgrade head` when ready.
