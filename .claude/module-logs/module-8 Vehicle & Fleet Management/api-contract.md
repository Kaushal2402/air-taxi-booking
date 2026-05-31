# Module 8 — Vehicle & Fleet Management — API Contract

All routes under prefix `/api/v1`.
All endpoints require: `Authorization: Bearer <token>` (admin JWT).

---

## Enums

```
VehicleStatus:  pending | active | suspended | retired
VehicleDocStatus: pending | ok | expiring | rejected | expired
VehicleDocType: rc | insurance | permit | fitness | puc
VehicleOwnerType: owner_driver | vendor
VehicleDocReviewAction: approve | reject | request_reupload
VendorStatus: active | review | suspended
MaintenanceStatus: pending | done | skipped
CommissionType: percentage | flat
```

---

## Vehicles

### GET /api/v1/vehicles
List all vehicles with pagination and filters.

Query params:
- `search` string — plate, make, model, owner name
- `status` VehicleStatus
- `doc_status` VehicleDocStatus — filter by computed doc health
- `vehicle_class_id` string (UUID)
- `owner_type` VehicleOwnerType
- `owner_vendor_id` string (UUID)
- `page` int (default 1)
- `per_page` int (default 25)

Response:
```json
{
  "items": [ Vehicle ],
  "total": 1260,
  "page": 1,
  "per_page": 25,
  "status_counts": {
    "all": 1260,
    "active": 1210,
    "docs_expiring": 38,
    "docs_expired": 8,
    "grounded": 12,
    "unlinked": 4
  }
}
```

### POST /api/v1/vehicles
Create a new vehicle.

Request:
```json
{
  "plate_no": "KA 05 MK 4271",
  "make": "Toyota",
  "model": "Etios",
  "year": 2022,
  "color": "White",
  "fuel_type": "petrol",
  "vehicle_class_id": "uuid",
  "owner_type": "owner_driver",
  "owner_vendor_id": null
}
```

Response: Vehicle (see schema below)

### GET /api/v1/vehicles/{id}
Get vehicle detail with documents, maintenances, linked driver info.

Response: VehicleDetail (see schema)

### PATCH /api/v1/vehicles/{id}
Update editable vehicle fields.

Request: Partial of { make, model, year, color, fuel_type, vehicle_class_id, owner_type, owner_vendor_id, odometer_km }

Response: Vehicle

### POST /api/v1/vehicles/{id}/approve
Approve/activate a pending vehicle.

Response: Vehicle

### POST /api/v1/vehicles/{id}/ground
Ground (suspend) a vehicle.

Request: `{ "reason": "Insurance expired" }`

Response: Vehicle

### POST /api/v1/vehicles/{id}/reactivate
Reactivate a grounded vehicle.

Response: Vehicle

### POST /api/v1/vehicles/{id}/link-driver
Link a driver to this vehicle.

Request: `{ "driver_id": "uuid" }`

Response: Vehicle (with linked_driver_id updated)

Business rules:
- Driver must exist and have status active/approved
- Vehicle must be active
- Driver cannot already be linked to another vehicle
- Updates driver.vehicle_plate + driver.vehicle_class (back-compat)

### POST /api/v1/vehicles/{id}/unlink-driver
Unlink the current driver from this vehicle.

Response: Vehicle (linked_driver_id = null)

### POST /api/v1/vehicles/{id}/reassign-class
Reassign vehicle class.

Request: `{ "vehicle_class_id": "uuid" }`

Response: Vehicle

---

## Vehicle Schema

```json
{
  "id": "uuid",
  "plate_no": "KA 05 MK 4271",
  "make": "Toyota",
  "model": "Etios",
  "year": 2022,
  "color": "White",
  "fuel_type": "petrol",
  "vehicle_class_id": "uuid",
  "vehicle_class_name": "Sedan XL",
  "vehicle_class_code": "sedan_xl",
  "owner_type": "owner_driver",
  "owner_vendor_id": null,
  "owner_vendor_name": null,
  "linked_driver_id": "uuid | null",
  "linked_driver_name": "Ravi Mahesh | null",
  "linked_driver_code": "D-12047 | null",
  "linked_since": "2021-03-04T00:00:00 | null",
  "odometer_km": 84210,
  "status": "active",
  "doc_status": "ok",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

VehicleDetail adds:
```json
{
  ...Vehicle,
  "documents": [ VehicleDocument ],
  "maintenances": [ VehicleMaintenance ]
}
```

---

## Vehicle Documents

### GET /api/v1/vehicles/{id}/documents
Response: `{ "items": [ VehicleDocument ] }`

### POST /api/v1/vehicles/{id}/documents
Create document record.

Request:
```json
{
  "doc_type": "rc",
  "doc_number": "KA0520210084231",
  "issued_date": "2022-08-12",
  "expiry_date": "2037-08-12"
}
```

Response: VehicleDocument

### PATCH /api/v1/vehicles/{id}/documents/{doc_id}
Review a document.

Request:
```json
{
  "action": "approve",
  "expiry_date": "2037-08-12",
  "review_note": null
}
```

Response: VehicleDocument

### POST /api/v1/vehicles/{id}/documents/{doc_id}/upload
Upload document image. Multipart/form-data with field `file`.

Accepted MIME types: image/jpeg, image/png, image/webp, image/gif, application/pdf

Response: VehicleDocument (with image_url populated)

---

## VehicleDocument Schema

```json
{
  "id": "uuid",
  "vehicle_id": "uuid",
  "doc_type": "rc",
  "doc_number": "KA0520210084231",
  "issued_date": "2022-08-12 | null",
  "expiry_date": "2037-08-12 | null",
  "image_url": "/static/documents/uuid.jpg | null",
  "status": "ok",
  "review_note": null,
  "reviewed_by": "admin@example.com | null",
  "reviewed_at": "ISO8601 | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Vehicle Maintenances

### GET /api/v1/vehicles/{id}/maintenances
Response: `{ "items": [ VehicleMaintenance ] }`

### POST /api/v1/vehicles/{id}/maintenances
Create maintenance record.

Request:
```json
{
  "milestone_label": "90,000 km service",
  "milestone_km": 90000,
  "scheduled_date": "2026-11-01",
  "service_center": "Toyota MASS · Indiranagar",
  "notes": "Full drivetrain check",
  "status": "pending"
}
```

Response: VehicleMaintenance

### PATCH /api/v1/vehicles/{id}/maintenances/{m_id}
Update maintenance record.

Request: Partial of above fields + `completed_at?`

Response: VehicleMaintenance

### DELETE /api/v1/vehicles/{id}/maintenances/{m_id}
Response: `{ "message": "Maintenance record deleted" }`

---

## VehicleMaintenance Schema

```json
{
  "id": "uuid",
  "vehicle_id": "uuid",
  "milestone_label": "90,000 km service",
  "milestone_km": 90000,
  "scheduled_date": "2026-11-01 | null",
  "service_center": "Toyota MASS · Indiranagar | null",
  "notes": null,
  "status": "pending",
  "completed_at": null,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Vendors

### GET /api/v1/vendors
List vendors.

Query params:
- `search` string
- `status` VendorStatus
- `page` int (default 1)
- `per_page` int (default 25)

Response:
```json
{
  "items": [ VendorWithCounts ],
  "total": 5,
  "page": 1,
  "per_page": 25
}
```

### POST /api/v1/vendors
Create (onboard) a new vendor.

Request:
```json
{
  "name": "Yellow Wheels",
  "city": "Bengaluru",
  "phone": "+91 98201 00000",
  "email": "ops@yellowwheels.in",
  "commission_rate": 22.0,
  "commission_type": "percentage",
  "status": "review"
}
```

Response: Vendor

### GET /api/v1/vendors/{id}
Get vendor detail.

Response: VendorDetail (Vendor + vehicle_count, driver_count)

### PATCH /api/v1/vendors/{id}
Update vendor.

Request: Partial of Vendor fields

Response: Vendor

### POST /api/v1/vendors/{id}/activate
Activate a vendor in review.

Response: Vendor

### POST /api/v1/vendors/{id}/suspend
Suspend a vendor.

Request: `{ "reason": "string" }`

Response: Vendor

---

## Vendor Schema

```json
{
  "id": "uuid",
  "name": "Yellow Wheels",
  "city": "Bengaluru",
  "phone": "+91 98201 00000",
  "email": "ops@yellowwheels.in",
  "status": "active",
  "commission_rate": 22.0,
  "commission_type": "percentage",
  "vehicle_count": 84,
  "driver_count": 102,
  "joined_at": "ISO8601",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Frontend Routes

| Route | Component | Shell activeId |
|---|---|---|
| `/vehicles` | VehicleDirectoryPage | vehicles |
| `/vehicles/vendors` | VendorDirectoryPage | vehicles |
| `/vehicles/vendors/new` | VendorNewPage | vehicles |
| `/vehicles/:id` | VehicleDetailPage | vehicles |

> Note: `/vehicles/vendors` must be registered BEFORE `/vehicles/:id` in App.tsx to avoid "vendors" being treated as a vehicle ID.
