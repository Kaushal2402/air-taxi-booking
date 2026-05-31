# Module 14 — Backend Report

**Status: COMPLETE**
**Date: 2026-05-31**

---

## Files Created

| File | Purpose |
|---|---|
| `backend/app/models/promotion.py` | `Promotion` + `CouponRedemption` ORM models |
| `backend/app/models/referral.py` | `ReferralProgram` (singleton) + `Referral` ORM models |
| `backend/app/schemas/promotions.py` | All Pydantic v2 request/response schemas |
| `backend/app/services/promotions_service.py` | Full async service layer |
| `backend/app/api/v1/endpoints/promotions.py` | FastAPI routers (`promotions_router`, `referrals_router`) |

## Files Modified

| File | Change |
|---|---|
| `backend/app/models/__init__.py` | Imported + exported 4 new models |
| `backend/app/api/v1/router.py` | Registered `promotions_router` and `referrals_router` |

## Alembic Migration

`backend/alembic/versions/daab56248ef4_add_module_14_promotions_referrals.py`

Tables created:
- `promotions` — all promotion/coupon fields with indexes on `code`
- `coupon_redemptions` — redemption tracking with FK to `promotions`, indexes on `promotion_id` + `customer_id`
- `referral_programs` — singleton config table
- `referrals` — individual referral records with indexes on `referrer_id`, `referee_id`, `referral_code`

Migration NOT applied (per task spec — `alembic upgrade head` not run).

---

## Endpoints Registered

### `/api/v1/promotions`

| Method | Path | Description |
|---|---|---|
| GET | `/promotions` | Paginated list with search + status filter |
| POST | `/promotions` | Create promotion (201, starts as `draft`) |
| GET | `/promotions/analytics` | Rolling-window analytics (registered BEFORE `/{id}`) |
| GET | `/promotions/{id}` | Get single promotion |
| PATCH | `/promotions/{id}` | Update (draft/paused only) |
| POST | `/promotions/{id}/activate` | Activate (draft → active, paused → active) |
| POST | `/promotions/{id}/pause` | Pause (active → paused) |
| DELETE | `/promotions/{id}` | Delete (draft only) |

### `/api/v1/referrals`

| Method | Path | Description |
|---|---|---|
| GET | `/referrals/program` | Get singleton config (auto-creates with defaults) |
| PATCH | `/referrals/program` | Update config |
| GET | `/referrals/stats` | Aggregated referral stats |

---

## Key Design Decisions

1. **`GET /promotions/analytics` ordering** — Registered before `/{id}` in the router to prevent the static path being matched as a promotion ID.
2. **Singleton `ReferralProgram`** — `get_referral_program()` uses `select().limit(1)` and creates with defaults if the table is empty.
3. **`from __future__ import annotations`** — Present in every new file; all `X | None` union syntax is Python 3.9-safe.
4. **Auth guard** — Every endpoint has `_: AdminUser = Depends(get_current_admin_user)`.
5. **Read-only fields** — `budget_spent_minor`, `redemption_count`, `id`, `code`, `created_at` are stripped in `update_promotion()`.
6. **Analytics** — Real DB aggregation via `func.count`/`func.sum` + `func.date` grouping. Returns empty lists when no data (expected on first deploy).
7. **`CouponRedemption.created_at`** — No `server_default` on purpose; set explicitly by the redemption writer to avoid ambiguity.

---

## Syntax & Import Verification

All 7 files passed:
- `python compile()` syntax check — OK
- Full Python import chain — OK (`All imports OK`)
