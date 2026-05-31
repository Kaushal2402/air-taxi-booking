# Module 8 — Vehicle & Fleet Management — Backend Report

## Models Created

| Model | Table | File |
|---|---|---|
| `Vendor` | `vendors` | `backend/app/models/vendor.py` |
| `Vehicle` | `vehicles` | `backend/app/models/vehicle.py` |
| `VehicleDocument` | `vehicle_documents` | `backend/app/models/vehicle.py` |
| `VehicleMaintenance` | `vehicle_maintenances` | `backend/app/models/vehicle_maintenance.py` |

All models imported in `backend/app/models/__init__.py`.

## Schemas Created

File: `backend/app/schemas/vehicle.py`

- `VehicleCreate`, `VehicleUpdate`, `VehicleResponse`, `VehicleDetailResponse`, `VehicleListResponse`
- `VehicleDocumentCreate`, `VehicleDocumentReview`, `VehicleDocumentResponse`
- `VehicleMaintenanceCreate`, `VehicleMaintenanceUpdate`, `VehicleMaintenanceResponse`
- `VendorCreate`, `VendorUpdate`, `VendorResponse`, `VendorListResponse`
- `LinkDriverRequest`, `GroundVehicleRequest`, `ReassignClassRequest`, `SuspendVendorRequest`

## Service Created

File: `backend/app/services/vehicle_service.py`

Functions:
- `list_vehicles` — paginated + filtered, status_counts (all/active/docs_expiring/docs_expired/grounded/unlinked)
- `get_vehicle` — by UUID or plate_no
- `get_vehicle_detail` — with documents + maintenances
- `create_vehicle`, `update_vehicle`
- `approve_vehicle`, `ground_vehicle`, `reactivate_vehicle`
- `link_driver` — validates vehicle active, driver status, no double-link, back-compat driver.vehicle_plate/vehicle_class update
- `unlink_driver` — back-compat clear driver vehicle fields
- `reassign_class`
- `get_documents`, `create_document`, `review_document`, `upload_document_image`
- `_recompute_doc_status` — recomputes vehicle.doc_status from document states (expired/expiring/ok/pending)
- `get_maintenances`, `create_maintenance`, `update_maintenance`, `delete_maintenance`
- `list_vendors`, `get_vendor`, `get_vendor_detail`, `create_vendor`, `update_vendor`, `activate_vendor`, `suspend_vendor`

## Endpoints Created

File: `backend/app/api/v1/endpoints/vehicles.py`

Two routers: `vehicles_router` (prefix `/vehicles`) and `vendors_router` (prefix `/vendors`).

### Vehicles (`/api/v1/vehicles`)
| Method | Path | Description |
|---|---|---|
| GET | `/vehicles` | List vehicles (paginated, filtered) |
| POST | `/vehicles` | Create vehicle |
| GET | `/vehicles/{id}` | Get vehicle detail with docs + maintenances |
| PATCH | `/vehicles/{id}` | Update vehicle |
| POST | `/vehicles/{id}/approve` | Activate pending vehicle |
| POST | `/vehicles/{id}/ground` | Ground (suspend) vehicle |
| POST | `/vehicles/{id}/reactivate` | Reactivate grounded vehicle |
| POST | `/vehicles/{id}/link-driver` | Link driver to vehicle |
| POST | `/vehicles/{id}/unlink-driver` | Unlink driver from vehicle |
| POST | `/vehicles/{id}/reassign-class` | Reassign vehicle class |
| GET | `/vehicles/{id}/documents` | List vehicle documents |
| POST | `/vehicles/{id}/documents` | Create document record |
| PATCH | `/vehicles/{id}/documents/{doc_id}` | Review document (approve/reject/request_reupload) |
| POST | `/vehicles/{id}/documents/{doc_id}/upload` | Upload document image |
| GET | `/vehicles/{id}/maintenances` | List maintenance records |
| POST | `/vehicles/{id}/maintenances` | Create maintenance record |
| PATCH | `/vehicles/{id}/maintenances/{m_id}` | Update maintenance record |
| DELETE | `/vehicles/{id}/maintenances/{m_id}` | Delete maintenance record |

### Vendors (`/api/v1/vendors`)
| Method | Path | Description |
|---|---|---|
| GET | `/vendors` | List vendors |
| POST | `/vendors` | Create vendor |
| GET | `/vendors/{id}` | Get vendor detail with counts |
| PATCH | `/vendors/{id}` | Update vendor |
| POST | `/vendors/{id}/activate` | Activate vendor |
| POST | `/vendors/{id}/suspend` | Suspend vendor |

## Router Registration

File updated: `backend/app/api/v1/router.py`

Added:
```python
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["Vehicles"])
api_router.include_router(vendors_router, prefix="/vendors", tags=["Vendors"])
```

## Migration File

`backend/alembic/versions/1547377ac5c9_add_vehicle_fleet_module.py`

Tables detected by autogenerate:
- `vendors`
- `vehicles` (with indices on `plate_no`, `vehicle_class_id`, `owner_vendor_id`, `linked_driver_id`)
- `vehicle_documents` (with index on `vehicle_id`)
- `vehicle_maintenances` (with index on `vehicle_id`)

## Decisions Made

1. **`Vehicle.flag_reason`** — Added to store ground reason (not in original spec but needed for ground/reactivate workflow). Same pattern as `Driver.flag_reason`.
2. **`Vendor.flag_reason`** — Added to store suspension reason.
3. **`VehicleResponse` computed fields** — Not stored in ORM; resolved by joining VehicleClass/Vendor/Driver tables in service layer (`_build_vehicle_response` helper).
4. **`driver_count` for vendors** — Stubbed as 0 because drivers don't have a `vendor_id` column yet. Will need a future migration when driver-vendor relationship is formalized.
5. **`_recompute_doc_status`** — Uses "expiring" threshold of 30 days, consistent with driver KYC logic. A document counts as "expired" if its `expiry_date < today`, "expiring" if within 30 days but not yet past.
6. **alembic env.py** — No change needed; `import app.models` already pulls in all models via the `__init__.py` wildcard import.
7. **`static/documents` directory** — Already present in `main.py`; no change needed.
