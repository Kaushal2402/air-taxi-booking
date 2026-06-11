# Backend Change Request — Module 01: Customer Auth Endpoints
**Raised by:** flutter-senior-dev (customer-app daily build)
**Date:** 2026-06-11
**Priority:** P0 — all 8 auth screens blocked until these exist

## Summary
The existing admin endpoints under `/api/v1/auth/` and `/api/v1/customers/` are
admin-only (require `AdminUser` JWT). They CANNOT be used by the customer mobile app.
All customer auth endpoints must be in a new `/api/v1/app/auth/` namespace.

## Required New Database Table
`app_customers` (or `customers`) with columns:
- id (UUID PK)
- name (VARCHAR)
- email (VARCHAR nullable, unique)
- phone (VARCHAR nullable, unique)
- password_hash (VARCHAR nullable — OTP-only users have no password)
- avatar_url (VARCHAR nullable)
- home_city (VARCHAR nullable)
- notifications_enabled (BOOL default true)
- otp_code (VARCHAR nullable)
- otp_expires_at (DATETIME nullable)
- refresh_token_hash (VARCHAR nullable)
- status (ENUM: active/suspended/banned, default active)
- created_at, updated_at

## Required New Endpoints

| Method | Path | Body | Auth | Response |
|---|---|---|---|---|
| POST | /api/v1/app/auth/register | {name, phone, email?, password?} | Public | {customer_id, message} |
| POST | /api/v1/app/auth/otp/send | {phone} | Public | {expires_at} |
| POST | /api/v1/app/auth/otp/verify | {phone, otp} | Public | {access_token, refresh_token, customer_id, profile} |
| POST | /api/v1/app/auth/login | {email, password} | Public | {access_token, refresh_token, customer_id, profile} |
| POST | /api/v1/app/auth/logout | {refresh_token} | Bearer JWT | {message} |
| POST | /api/v1/app/auth/refresh | {refresh_token} | Public | {access_token, refresh_token} |
| GET | /api/v1/app/auth/me | — | Bearer JWT | CustomerProfile |
| PATCH | /api/v1/app/auth/me | {name?, home_city?, notifications_enabled?, avatar_url?} | Bearer JWT | CustomerProfile |
| POST | /api/v1/app/auth/forgot-password | {email} | Public | {message} |
| POST | /api/v1/app/auth/reset-password | {token, new_password} | Public | {message} |

## CustomerProfile Response Shape
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string | null",
  "phone": "string | null",
  "avatar_url": "string | null",
  "home_city": "string | null",
  "notifications_enabled": true
}
```

## Blocking
YES — all 8 auth screens are implemented with "backend unavailable" UX fallback.
Actual auth flows (register, login, OTP) cannot function until this is implemented.

## Migration Required
Yes — new table. Use Alembic: `alembic revision --autogenerate -m "add_app_customers_table"`
