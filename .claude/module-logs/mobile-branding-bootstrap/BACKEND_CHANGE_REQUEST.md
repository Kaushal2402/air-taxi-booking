# Backend Change Request — Public Brand Config Endpoint
**Raised by:** customer-app-daily-build routine
**Date:** 2026-06-11
**Priority:** P0 — needed before first screen renders

## Summary
The Customer App must fetch the active brand theme at launch (before login) so the
app reflects the buyer's branding from first open. The existing branding endpoints
require `branding.view` admin permission and cannot be called by unauthenticated
mobile users.

## Required Change
Add a new PUBLIC endpoint (no auth required) to `backend/app/api/v1/endpoints/branding.py`:

### GET /api/v1/branding/public/active
No authentication required.
Returns the brand profile with `status = BrandStatus.live`.
If no live profile exists, returns the most recently updated draft as fallback.

Response shape:
```json
{
  "id": "uuid",
  "name": "Brand name",
  "primary_color": "#18B574",
  "ink_color": "#131311",
  "surface_color": "#FFFFFF",
  "bg_color": "#F8F8F6",
  "success_color": "#18B574",
  "display_font": "Newsreader",
  "text_font": "IBM Plex Sans",
  "logo_url": "string | null",
  "logo_dark_url": "string | null",
  "published_at": "ISO8601 | null"
}
```

Logo URLs from brand assets with `asset_type = logo` and `status = live`.

## Why not use existing endpoints?
`GET /api/v1/branding/profiles` requires `branding.view` permission — admin only.
Mobile app users are unauthenticated at the time the theme must load.

## Impact
- Mobile app bootstrap fails to apply buyer branding until this endpoint exists
- Flutter app uses hardcoded fallback colors (`#18B574`, `#131311`) as defaults
  until the endpoint is live

## Workaround (in place)
BrandingService falls back to tokens.css defaults if API call fails or returns 404.
App is fully functional with fallback colors; this is a branding/white-label gap only.

---

## Also Required — Customer App Auth Endpoints

All existing `/api/v1/auth/` and `/api/v1/customers/` endpoints are ADMIN-ONLY
and cannot be used by the customer mobile app.

### POST /api/v1/app/auth/register
Body: `{ name, phone, email?, password? }` — No auth required

### POST /api/v1/app/auth/otp/send
Body: `{ phone }` — No auth required

### POST /api/v1/app/auth/otp/verify
Body: `{ phone, otp }` → Response: `{ access_token, refresh_token, customer_id }`

### POST /api/v1/app/auth/login
Body: `{ email, password }` → Response: `{ access_token, refresh_token, customer_id }`

### POST /api/v1/app/auth/refresh
Body: `{ refresh_token }` → Response: `{ access_token, refresh_token }`

### GET /api/v1/app/auth/me
Bearer JWT required → CustomerProfile

### PATCH /api/v1/app/auth/me
Bearer JWT required → Updated CustomerProfile

### POST /api/v1/app/auth/logout
Bearer JWT required

### POST /api/v1/app/auth/forgot-password
Body: `{ email }` — No auth required

### POST /api/v1/app/auth/reset-password
Body: `{ token, new_password }` — No auth required

---

## Also Required — Customer App Home Endpoints

### GET /api/v1/app/home/popular-routes
Query: `?service_type=&limit=10` — Bearer JWT or public

### GET /api/v1/app/home/service-types
Returns enabled service types with icon, name, base_price

### GET /api/v1/app/trips/active
Bearer JWT — returns the current active/upcoming trip or null

### GET /api/v1/app/promotions
Bearer JWT — returns available promotions for this customer

### GET /api/v1/app/notifications
Bearer JWT — paginated notifications

### PATCH /api/v1/app/notifications/read-all
Bearer JWT — mark all notifications as read
