# Cross-Surface Impact — Module 04 Payment & Confirmation
**Date:** 2026-06-13
**Raised by:** flutter-senior-dev

## Assessment

The payment & checkout module creates customer payment methods and booking confirmations.
These entities need to be visible to platform administrators for support and reconciliation.

## Admin Panel Changes Needed

| Screen | What to Add | Why | Priority |
|---|---|---|---|
| Admin > Customers > [Customer Detail] | "Payment Methods" tab showing tokenized methods (last 4, type, is_default) | Support agents need visibility when a customer reports card/UPI issues | P2 |
| Admin > Payments | Already exists (PaymentsPage.tsx) — no changes needed | PaymentsPage already lists all transactions | N/A |
| Admin > Bookings | Ensure confirmed bookings from POST /app/payments/confirm appear in the booking list | Once the booking confirm endpoint creates AirBooking records, they should appear in the existing admin bookings view | P1 |

**Note:** The existing admin panel has PaymentsPage, TransactionDetailPage, and ReconciliationPage.
These will automatically surface the payment data once the backend endpoints are implemented
(they query the Payment model which gets populated by POST /app/payments/confirm).

No new admin panel pages are required specifically for this module. The Customer Detail page
would benefit from a payment methods tab (P2), but this is not blocking.

## Operator Panel Changes Needed

| Screen | What to Add | Why | Priority |
|---|---|---|---|
| None | — | Operators manage flight inventory and crew; they do not handle payments directly | — |

## Backend Impact Already Raised?

Yes — see BACKEND_CHANGE_REQUEST.md for the five new endpoints required.

## Blocking Mobile Work?

No — the Flutter module is fully scaffolded with UnimplementedError stubs. All screens
render correctly in stub mode. The admin panel impact is informational only and does not
block the mobile implementation.
