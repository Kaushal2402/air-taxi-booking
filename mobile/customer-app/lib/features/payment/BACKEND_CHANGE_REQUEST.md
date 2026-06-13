# Backend Change Request — Module 04 Payment & Confirmation
**App:** Customer
**Date:** 2026-06-13
**Raised by:** flutter-senior-dev

## Summary

The payment & checkout module (screens 4.1 through 4.5) requires five new customer-facing
endpoints under /api/v1/app/. The existing payments.py is admin-only
(Depends(require_permission("payments.view"))). No /api/v1/app/ customer payment endpoints
exist anywhere in the codebase. The Flutter module is scaffolded with PaymentService stubs
that throw UnimplementedError; providers catch these and return empty/null states.

An additional UPI verification endpoint is required for the instant VPA validation feature
in screen 4.3 (UPIWalletScreen).

The existing admin Razorpay webhook (razorpay_webhook.py) is server-side and should NOT be
called by the Flutter app — it is the source of truth for payment capture. The client instead
calls POST /app/payments/confirm, which triggers the server to re-verify the signature and
create the confirmed booking.

## Required Changes

### New Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/v1/app/payment-methods | Customer JWT | List customer's saved payment instruments (tokens only) |
| POST | /api/v1/app/payment-methods/card | Customer JWT | Save a tokenized card from Razorpay gateway |
| DELETE | /api/v1/app/payment-methods/{id} | Customer JWT | Remove a saved payment method |
| POST | /api/v1/app/payments/initiate | Customer JWT | Create Razorpay order; creates pending_payment pre-booking |
| POST | /api/v1/app/payments/confirm | Customer JWT | Verify Razorpay signature; creates confirmed AirBooking |
| GET | /api/v1/app/payments/verify-upi | Customer JWT | Verify a UPI VPA (Virtual Payment Address) |

### Schema Changes

New schema file: backend/app/schemas/app_payment.py

```python
class AppPaymentMethodResponse(BaseModel):
    id: str
    type: str  # "card" | "upi" | "wallet" | "netbanking"
    display: str  # "Visa •••• 4242"
    sub_label: str | None = None  # "Expires 09/28"
    is_default: bool = False

class AppAddCardRequest(BaseModel):
    razorpay_token: str  # Razorpay token — never raw PAN
    save_card: bool = True

class AppPaymentInitiateRequest(BaseModel):
    estimate_ref: str  # pricing lock token from fare estimate
    payment_method_id: str | None = None  # null = new card/UPI via SDK
    booking_summary: dict  # route_id, flight_id, seat_codes, pax_count, fare_class

class AppRazorpayOrderResponse(BaseModel):
    order_id: str  # Razorpay order ID, format "order_xxx"
    amount_minor: int  # paise — authoritative
    currency: str = "INR"
    booking_ref: str  # platform booking reference pre-assigned

class AppPaymentConfirmRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str  # HMAC-SHA256 to verify
    booking_ref: str

class AppBookingConfirmationResponse(BaseModel):
    id: str
    booking_ref: str
    status: str  # "confirmed"
    route_from: str
    route_to: str
    etd: str  # ISO UTC
    eta: str | None = None
    pax_count: int
    seat_codes: list[str]
    passenger_names: list[str]
    total_amount_minor: int
    payment_method: str | None = None
    aircraft_model: str | None = None
    tail_number: str | None = None
    created_at: str  # ISO UTC

class AppUpiVerifyResponse(BaseModel):
    is_valid: bool
    account_name: str | None = None
    bank_name: str | None = None
```

### Model Changes

| File | Table | Key Columns | Reason |
|---|---|---|---|
| backend/app/models/customer_payment_method.py | customer_payment_methods | id, customer_id (FK), type, razorpay_token, display, sub_label, is_default, created_at | Store tokenized payment instruments per customer |

Note: The Payment model at backend/app/models/payment.py already exists (used by admin).
The new customer_payment_methods table is separate — it stores the tokenized vault refs,
not the payment transaction records.

### Migration Required

Yes — new table: customer_payment_methods (customer_id FK, razorpay_token, display, type, is_default).

### New Dependency Required

A `get_current_customer` FastAPI dependency must be created (parallel to `get_current_admin_user`)
that extracts and validates the customer JWT Bearer token. All six endpoints above require this.

Suggested location: backend/app/dependencies.py — add:
```python
async def get_current_customer(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Customer:
    ...
```

### Business Logic Notes

1. POST /app/payments/initiate:
   - Creates a Razorpay order via the Razorpay API (server-side using secret key)
   - Creates a pre-booking record with status="pending_payment" in the AirBooking table
   - Assigns a booking_ref immediately (format: ACM-YYYY-NNNNN)
   - Must be idempotent: read the Idempotency-Key header; if the same key already has
     an order, return the existing order rather than creating a new one
   - The client MUST send Idempotency-Key (UUID v4, generated per payment attempt)

2. POST /app/payments/confirm:
   - NEVER trust the client — always re-verify the Razorpay signature:
     HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, razorpay_secret)
   - On valid signature: update AirBooking status to "confirmed", record Payment record,
     trigger email/push notification to customer
   - On invalid signature: return 400 with error code "signature_invalid"

3. GET /app/payments/verify-upi:
   - Calls Razorpay VPA verification API: POST /v1/payments/validate/vpa
   - Caches result for 60s to avoid re-verifying on every keystroke
   - Returns is_valid=false with no account_name if VPA does not exist

## Impact on Existing Code

- The existing admin payments router (payments.py) is NOT modified.
- The Razorpay webhook handler (razorpay_webhook.py) continues to operate independently
  as a server-side payment capture confirmation. It is NOT called from the Flutter app.
- Module 03's booking_service.dart already has a getPaymentMethods() stub that calls
  GET /api/v1/app/payment-methods — this will automatically start working once the
  endpoint is created. The Module 03 BookingSummaryScreen payment method selector will
  also benefit from this endpoint.

## Blocking?

YES — all five payment screens (4.1 through 4.5) require at least the initiate + confirm
endpoints to complete a real booking. The screens render (stubs show empty state gracefully)
but no payment can be processed until these endpoints exist.

The UPI verify endpoint (GET /app/payments/verify-upi) is non-blocking — screen 4.3
degrades gracefully if it returns UnimplementedError (no verification feedback shown).
