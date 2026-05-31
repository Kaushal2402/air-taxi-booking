# Module 21 — Settings & Flags — Backend Report

**Status: COMPLETE**
**Date: 2026-05-30**

---

## Tasks completed

### BE-01: SQLAlchemy Models (`backend/app/models/settings.py`)
Six models created:
- `PlatformSettings` — single-row (id=1) config table with 11 fields; `UTCDateTime` used for `last_edited_at`
- `PlatformToggle` — key (PK), name, description, enabled
- `FeatureFlag` — UUID PK via `UUIDPrimaryKeyMixin`, key (unique indexed), all contract fields, `created_at`/`updated_at`
- `KillSwitch` — key (PK), name, description, enabled (default True = running), tone
- `RegionStatus` — UUID PK, name, service_type, status, note
- `MaintenanceWindow` — UUID PK, region_name, description, starts_at/ends_at (plain DateTime), created_at

### BE-02: Pydantic Schemas (`backend/app/schemas/settings.py`)
All 14 schema classes created:
`PlatformSettingsResponse`, `PlatformSettingsUpdate`, `PlatformToggleResponse`, `PlatformToggleUpdate`, `FeatureFlagResponse`, `FeatureFlagCreate`, `FeatureFlagUpdate`, `FeatureFlagsListResponse`, `KillSwitchResponse`, `KillSwitchUpdate`, `RegionStatusResponse`, `RegionStatusUpdate`, `MaintenanceWindowResponse`, `MaintenanceWindowCreate`, `MaintenanceWindowsListResponse`

### BE-03: Service (`backend/app/services/settings_service.py`)
All 13 async functions implemented:
- `get_settings` — fetch id=1, auto-create with defaults if absent
- `update_settings` — patch id=1, auto-sets `last_edited_at=now()`
- `list_toggles` / `update_toggle` — seeds 5 defaults on empty
- `list_flags` / `create_flag` / `update_flag` — seeds 7 defaults on empty (ungated by env filter)
- `list_kill_switches` / `update_kill_switch` — seeds 5 defaults on empty
- `list_regions` / `update_region` — seeds 6 defaults on empty
- `list_maintenance_windows` / `create_maintenance_window` / `delete_maintenance_window`

Seeding uses the `_seed_if_empty` helper — count=0 check → bulk insert → return all.

### BE-04: Endpoint file (`backend/app/api/v1/endpoints/settings.py`)
14 endpoints on `settings_router = APIRouter()`:

| Method | Path | Handler |
|---|---|---|
| GET | / | get_platform_settings |
| PATCH | / | update_platform_settings |
| GET | /toggles | list_platform_toggles |
| PATCH | /toggles/{key} | update_platform_toggle |
| GET | /flags | list_feature_flags |
| POST | /flags | create_feature_flag (201) |
| PATCH | /flags/{id} | update_feature_flag |
| GET | /kill-switches | list_kill_switches |
| PATCH | /kill-switches/{key} | update_kill_switch |
| GET | /regions | list_regions |
| PATCH | /regions/{id} | update_region |
| GET | /maintenance-windows | list_maintenance_windows |
| POST | /maintenance-windows | create_maintenance_window (201) |
| DELETE | /maintenance-windows/{id} | delete_maintenance_window |

### BE-05: Router registration (`backend/app/api/v1/router.py`)
Added:
```python
from app.api.v1.endpoints.settings import settings_router
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
```

### BE-06: Alembic migration
- File: `backend/alembic/versions/dd3bbfd12a26_add_module_21_settings_tables.py`
- Replaced all `app.models.base.UTCDateTime()` occurrences with `sa.DateTime()` (3 occurrences)
- `alembic upgrade head` ran successfully: `5d8d45a34601 -> dd3bbfd12a26`
- 6 tables created: `feature_flags`, `kill_switches`, `maintenance_windows`, `platform_settings`, `platform_toggles`, `region_status`

### models/__init__.py
Updated to import and export all 6 new models.

---

## Smoke test
```
python -c "from app.api.v1.endpoints.settings import settings_router; ..."
# Output: All imports OK
```

---

## Files created / modified
| Action | Path |
|---|---|
| Created | `backend/app/models/settings.py` |
| Created | `backend/app/schemas/settings.py` |
| Created | `backend/app/services/settings_service.py` |
| Created | `backend/app/api/v1/endpoints/settings.py` |
| Modified | `backend/app/api/v1/router.py` |
| Modified | `backend/app/models/__init__.py` |
| Created | `backend/alembic/versions/dd3bbfd12a26_add_module_21_settings_tables.py` |
