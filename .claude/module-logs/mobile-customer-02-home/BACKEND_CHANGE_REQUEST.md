# Backend Change Request — Module 02: Home & Discovery Endpoints
**Raised by:** flutter-senior-dev (customer-app daily build)
**Date:** 2026-06-11
**Priority:** P1 — screens render with empty states; not a hard blocker but data-empty

## Required New Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/v1/app/home/popular-routes | Public | Query: serviceType?, limit=10. Returns featured/popular routes. |
| GET | /api/v1/app/home/service-types | Public | Returns enabled service types for this deployment (helicopter, charter, shuttle, vip). |
| GET | /api/v1/app/trips/active | Bearer JWT | Returns the customer's single active or next upcoming trip, or null. |
| GET | /api/v1/app/promotions | Bearer JWT | Returns active promotions for the customer. |
| GET | /api/v1/app/notifications | Bearer JWT | Paginated. Query: page=1&limit=20. |
| PATCH | /api/v1/app/notifications/read-all | Bearer JWT | Mark all as read. Response: {updated_count}. |

## PopularRoute Response Shape
```json
{
  "id": "uuid",
  "from_city": "Mumbai",
  "to_city": "Pune",
  "from_code": "BOM",
  "to_code": "PNQ",
  "duration_min": 42,
  "price_minor_units": 850000,
  "currency": "INR",
  "service_type": "helicopter",
  "avail_seats": 6,
  "badge_type": "ok"
}
```

## ActiveTrip Response Shape
```json
{
  "id": "uuid",
  "status": "confirmed",
  "from_code": "BOM",
  "to_code": "PNQ",
  "from_label": "Juhu Heliport",
  "to_label": "Pune Lohegaon",
  "aircraft_model": "Bell 407",
  "tail_number": "VT-HAX",
  "departure_time": "ISO8601",
  "duration_min": 42,
  "badge_label": "Confirmed"
}
```

## Blocking
NO — Home screens render with shimmer/empty states while providers return null/[].
However, the popular routes, upcoming trip, and service type chips will be empty
until these endpoints are implemented.
