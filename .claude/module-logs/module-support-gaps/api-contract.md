# Support & Tickets — API Contract (Gap Fixes)

## EXISTING endpoints (already built, no changes except noted)

### PATCH /api/v1/support/tickets/{id} — update booking_type
After BE-01, the Ticket model gains a new nullable field:
  booking_type: "road" | "air" | null

TicketResponse and TicketDetailResponse will include:
  booking_type: string | null

TicketCreate will include:
  linked_booking_id: string | null
  linked_booking_type: "road" | "air" | null   ← NEW
  linked_transaction_id: string | null

## NEW endpoint

### GET /api/v1/support/stats
No query params.
Permission: support.tickets.view
Response:
{
  open_count: int,
  in_progress_count: int,
  breaching_count: int,
  due_in_1h_count: int,
  median_first_reply_seconds: float | null,   // null if no resolved tickets with messages
  total_tickets_30d: int
}

Computation:
- open_count: COUNT WHERE status='open'
- in_progress_count: COUNT WHERE status='in_progress'
- breaching_count: COUNT WHERE sla_breached=true AND status NOT IN (resolved, closed)
- due_in_1h_count: COUNT WHERE sla_due_at BETWEEN now AND now+60min AND sla_breached=false
- median_first_reply_seconds: median of (first TicketMessage.created_at - Ticket.created_at)
  for tickets that have at least 2 messages (i.e. a reply after the initial)
  Only look at last 30 days of resolved/closed tickets for a meaningful sample
- total_tickets_30d: COUNT WHERE created_at > now-30d

## EXISTING endpoints referenced by frontend fixes

### POST /api/v1/support/tickets/{id}/assign
Body: { assignee_id: string }
(already exists)

### GET /api/v1/admin-users
Query: page, per_page, search, role, status
Returns: { items: AdminUser[], total, page, per_page }
AdminUser has: id, name, email, role, status
(already exists — use adminUserService.listAdmins)

### POST /api/v1/bookings/road/{booking_id}/refund
(already exists in bookings module)

### POST /api/v1/bookings/air/{booking_id}/refund
(already exists in air_bookings module)

### POST /api/v1/customers/{id}/wallet/adjust
Body: { amount_minor: int, direction: "credit"|"debit", reason: string }
(already exists)
