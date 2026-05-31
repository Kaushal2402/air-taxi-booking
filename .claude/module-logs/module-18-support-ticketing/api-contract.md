# API Contract — Module 18: Support & Ticketing Console

All endpoints are under `/api/v1/support`.
All require `Authorization: Bearer <token>` (JWT).

---

## Ticket Enums

- **category**: `refunds_billing` | `booking_road` | `booking_air` | `payouts` | `documents_kyc` | `app_issue` | `lost_found` | `onboarding` | `other`
- **priority**: `urgent` | `high` | `med` | `low`
- **status**: `open` | `in_progress` | `resolved` | `closed`
- **requester_type**: `customer` | `driver` | `operator`
- **resolution_code**: `data_correction` | `refund_issued` | `goodwill_credit` | `no_action_needed` | `escalated` | `duplicate` | `resolved_by_system` | `other`
- **message_kind**: `reply` | `internal_note`

---

## GET /api/v1/support/tickets

List all tickets (paginated).

**Query params:**
- `page` (int, default 1)
- `page_size` (int, default 20, max 100)
- `category` (str, optional — filter by category enum)
- `priority` (str, optional)
- `status` (str, optional)
- `assignee_id` (str UUID, optional)
- `sla_breach` (bool, optional — filter to only breached tickets)
- `search` (str, optional — matches ticket_id, requester name)

**Response:**
```json
{
  "items": [<TicketResponse>],
  "total": 37,
  "page": 1,
  "page_size": 20
}
```

---

## GET /api/v1/support/tickets/{ticket_id}

Get a single ticket with full detail including messages.

**Response:** `TicketDetailResponse` (see schema section below)

---

## POST /api/v1/support/tickets

Create a new ticket (admin-initiated on behalf of a requester).

**Request:**
```json
{
  "requester_type": "customer",
  "requester_id": "uuid",
  "requester_name": "string",
  "category": "refunds_billing",
  "priority": "high",
  "subject": "string",
  "body": "string",
  "linked_booking_id": "uuid | null",
  "linked_transaction_id": "string | null"
}
```

**Response:** `TicketDetailResponse` (status=201)

---

## POST /api/v1/support/tickets/{ticket_id}/assign

Assign or reassign a ticket to an admin user.

**Request:**
```json
{ "assignee_id": "uuid" }
```

**Response:**
```json
{ "id": "uuid", "assignee_id": "uuid", "status": "in_progress", "updated_at": "datetime" }
```

---

## POST /api/v1/support/tickets/{ticket_id}/messages

Add a reply or internal note to a ticket thread.

**Request:**
```json
{
  "kind": "reply",
  "body": "string"
}
```
- `kind`: `reply` | `internal_note`
- `body`: non-empty string

**Response:**
```json
{
  "id": "uuid",
  "ticket_id": "uuid",
  "kind": "reply",
  "author_id": "uuid",
  "author_name": "string",
  "author_role": "string",
  "body": "string",
  "created_at": "datetime"
}
```

---

## POST /api/v1/support/tickets/{ticket_id}/resolve

Resolve a ticket. Requires `resolution_code`.

**Request:**
```json
{
  "resolution_code": "data_correction",
  "resolution_note": "string | null"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "resolved",
  "resolution_code": "data_correction",
  "resolved_at": "datetime",
  "updated_at": "datetime"
}
```

---

## POST /api/v1/support/tickets/{ticket_id}/escalate

Escalate a ticket to a supervisor.

**Request:**
```json
{ "reason": "string" }
```

**Response:**
```json
{ "id": "uuid", "priority": "urgent", "escalated_at": "datetime", "updated_at": "datetime" }
```

---

## GET /api/v1/support/sla-policies

List all SLA policies.

**Response:**
```json
[
  {
    "id": "uuid",
    "category": "booking_air",
    "urgent_first_response_minutes": 10,
    "urgent_resolution_minutes": 60,
    "high_first_response_minutes": 20,
    "high_resolution_minutes": 120,
    "med_first_response_minutes": 60,
    "med_resolution_minutes": 360,
    "low_first_response_minutes": 240,
    "low_resolution_minutes": 1440,
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

---

## PATCH /api/v1/support/sla-policies/{id}

Update an SLA policy.

**Request:** Partial fields from SlaPolicy (any combination of `*_minutes` fields).

**Response:** Updated `SlaPolicyResponse`

---

## Schema Reference

### TicketResponse (list item)
```json
{
  "id": "uuid",
  "ticket_ref": "TKT-44815",
  "requester_type": "operator",
  "requester_id": "uuid",
  "requester_name": "Skyline Charter",
  "category": "booking_air",
  "priority": "high",
  "status": "open",
  "assignee_id": "uuid | null",
  "assignee_name": "string | null",
  "sla_due_at": "datetime | null",
  "sla_breached": false,
  "linked_booking_id": "uuid | null",
  "linked_transaction_id": "string | null",
  "subject": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### TicketDetailResponse
All fields from `TicketResponse` plus:
```json
{
  "messages": [<TicketMessageResponse>],
  "resolution_code": "string | null",
  "resolution_note": "string | null",
  "resolved_at": "datetime | null",
  "escalated_at": "datetime | null"
}
```

### TicketMessageResponse
```json
{
  "id": "uuid",
  "ticket_id": "uuid",
  "kind": "reply",
  "author_id": "uuid",
  "author_name": "string",
  "author_role": "string",
  "body": "string",
  "created_at": "datetime"
}
```

---

## Notes
- Ticket refs are auto-generated as `TKT-XXXXX` (sequential).
- SLA timer starts on ticket creation; breach is computed as `now > sla_due_at`.
- On breach the ticket priority bumps to `urgent` (if not already) and it appears in the escalation feed.
- Internal notes (`kind=internal_note`) must never be visible to external requesters.
- `linked_booking_id` references either road or air booking tables.
