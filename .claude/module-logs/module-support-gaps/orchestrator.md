# Support & Tickets — Gap Fix Orchestrator Log

## Phase 1 — Summary
Module 24 (Support & Ticketing Console) is largely built. The ticket queue, detail view, SLA page, and all backend endpoints are complete. The gaps are: 4 dead action buttons in TicketDetailPage, a broken booking deep-link (always routes road even for air), a static transaction ID display, missing tickets tab in DriverDetailPage, and placeholder KPI stats ("—").

## Phase 2 — Existing vs Missing

### Existing (built)
- backend: models/support.py, schemas/support.py, services/support_service.py, endpoints/support.py
- frontend: TicketQueuePage, TicketDetailPage, SlaEscalationPage, supportService.ts
- CustomerDetailPage already has tickets tab

### Missing / Gaps
- Ticket.booking_type field (road|air) — model + schema + migration
- GET /support/stats endpoint (median_first_reply_seconds, open_count, etc.)
- Wire "Reassign" button → adminUserService.listAdmins + supportService.assignTicket
- Fix linked booking deep-link → use booking_type to route road vs air
- Wire "Request refund" → bookingsService.refundBooking / airBookingsService.processRefund
- Wire "Goodwill credit" → customerService.adjustWallet
- Wire transaction ID → navigate to /payments/:txnId
- Driver Detail page tickets tab (mirror CustomerDetailPage)
- TicketQueuePage KPI: populate Median 1st reply from /support/stats

## Phase 3 — Tasks
- BE-01: Add booking_type to Ticket model + Alembic migration
- BE-02: Add GET /support/stats endpoint (open_count, breaching, median_first_reply_seconds, due_in_1h)
- FE-01: Wire "Reassign" button in TicketDetailPage
- FE-02: Fix booking deep-link using booking_type field
- FE-03: Wire "Request refund" button
- FE-04: Wire "Goodwill credit" button
- FE-05: Wire transaction ID deep-link → /payments/:txnId
- FE-06: Add tickets tab to DriverDetailPage
- FE-07: Update TicketQueuePage KPI strip from /support/stats

## Phase 5 — Clarifications
- booking_type: add field to model (cleaner than double-API-call lookup)
- Refund: if requester_type=customer → bookingsService; if operator or no booking linked → skip
- Goodwill credit: only available for customer tickets (requester_type=customer)
- Stats: CSAT stays "—" (needs customer-facing rating flow, out of scope)
- Auto-escalation background job: out of scope (no scheduler infra), UI-only ladder stays
