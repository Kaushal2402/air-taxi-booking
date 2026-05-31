# Backend Report — Modules 09 & 10 (Air Operators, Aircraft & Crew)

**Status:** COMPLETE  
**Date:** 2026-05-30

---

## Tasks Completed

### BE-01 — Models (`backend/app/models/operator.py`)
Created with four SQLAlchemy ORM models:
- `Operator` — all contract fields; `UUIDPrimaryKeyMixin` + `TimestampMixin`; status indexed
- `OperatorDocument` — FK `operator_id → operators.id` (CASCADE); `UTCDateTime` created_at
- `Aircraft` — FK `operator_id → operators.id`; `aircraft_type_id` plain String (no FK); `maintenance_windows` as JSON; registration_mark unique + indexed
- `Pilot` — FK `operator_id → operators.id`; `type_ratings` as JSON

All four models added to `backend/app/models/__init__.py`.

**Note:** Used `Optional[str]` inside `Mapped[...]` (not `str | None`) because SQLAlchemy 2.0 evaluates Mapped annotations at runtime via string eval — Python 3.9 `|` syntax fails even with `from __future__ import annotations` at that evaluation stage. The `from __future__ import annotations` header is still present (required for function signatures and service code).

### BE-02 — Schemas (`backend/app/schemas/operators.py`)
Created Pydantic v2 schemas:
- `OperatorResponse`, `OperatorCreate`, `OperatorUpdate`, `OperatorDetail` (extends Response + fleet_count, pilot_count, docs)
- `OperatorDocumentResponse`, `OperatorDocumentCreate`, `OperatorDocumentUpdate`
- `AircraftResponse`, `AircraftCreate`, `AircraftUpdate`
- `PilotResponse`, `PilotCreate`, `PilotUpdate`
- List wrappers: `OperatorListResponse`, `AircraftListResponse`, `PilotListResponse`
- `OperatorPerformanceResponse`
- Action bodies: `RejectBody`, `PauseBody`, `CommissionBody`, `GroundBody`, `MaintenanceBody`

All datetime/date fields typed as `Any` for JSON serialisation compatibility. All use `model_config = {"from_attributes": True}`.

### BE-03 — Service (`backend/app/services/operator_service.py`)
Async service functions covering all contract endpoints:
- Operator CRUD + list (paginated with count query)
- Status transitions: approve, reject (→ pending + rejection_reason), pause, reactivate
- Commission configuration
- Performance stub (returns zeros — no booking data yet)
- Document list / add / update (per operator)
- Aircraft CRUD + list + approve / ground / set_maintenance
- Pilot CRUD + list + approve / ground
- `_airworthiness_status()` helper derives ok/expiring/expired from expiry date
- `NotFoundException` raised for all missing records

### BE-04 — Endpoints (`backend/app/api/v1/endpoints/operators.py`)
Three FastAPI routers:
- `operators_router` — 13 routes matching api-contract.md exactly
- `aircraft_router` — 7 routes
- `pilots_router` — 6 routes

All endpoints: thin delegation to service, auth guard `_: AdminUser = Depends(get_current_admin_user)`.

### BE-05 — Router registration (`backend/app/api/v1/router.py`)
Three routers registered at:
- `/api/v1/operators` (tag: Operators)
- `/api/v1/aircraft` (tag: Aircraft)
- `/api/v1/pilots` (tag: Pilots)

### BE-06 — Alembic migration
File created: `backend/alembic/versions/0fa38c92e3ff_add_operators_aircraft_pilots.py`

Detected tables: `operators`, `aircraft`, `operator_documents`, `pilots`  
Detected indexes: name/status on operators; operator_id/registration_mark/status on aircraft; operator_id on operator_documents; name/operator_id/status on pilots.

Migration NOT applied (`alembic upgrade head` not run, per instructions).

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Created | `backend/app/models/operator.py` |
| Modified | `backend/app/models/__init__.py` |
| Created | `backend/app/schemas/operators.py` |
| Created | `backend/app/services/operator_service.py` |
| Created | `backend/app/api/v1/endpoints/operators.py` |
| Modified | `backend/app/api/v1/router.py` |
| Created | `backend/alembic/versions/0fa38c92e3ff_add_operators_aircraft_pilots.py` |

---

## Sanity Checks Passed
- `python3 -c "from app.models import Operator, OperatorDocument, Aircraft, Pilot"` — OK
- `python3 -c "from app.schemas.operators import ..."` — OK
- `python3 -c "from app.services import operator_service"` — OK
- `python3 -c "from app.api.v1.endpoints.operators import ..."` — OK
- `python3 -c "from app.api.v1.router import api_router"` — OK (13+7+6 = 26 new routes)
- Alembic autogenerate detected all 4 tables with correct schema
