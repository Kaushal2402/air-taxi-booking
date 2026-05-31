# Module 25 — KYC & Document Verification — Backend Report

## Files Created / Modified

### Created
- `backend/app/api/v1/endpoints/kyc.py` — New KYC router with 4 endpoints

### Modified
- `backend/app/api/v1/router.py` — Added `kyc_router` import and registration at `/kyc`

---

## Endpoint List

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/kyc/queue` | Unified paginated queue of pending/in-review docs across entity types |
| GET | `/api/v1/kyc/expiry-watchlist` | Documents expiring within N days (default 14), oldest/soonest-expiry first |
| PATCH | `/api/v1/kyc/driver-documents/{doc_id}/review` | Approve / reject / request-reupload a driver document |
| PATCH | `/api/v1/kyc/operator-documents/{doc_id}/review` | Approve / reject / request-reupload an operator document |

---

## Field Name Discoveries

### Driver model (`app/models/driver.py`)
- The driver name field is `Driver.name` (a single `String(80)` column).
  There is **no** `full_name`, `first_name`, or `last_name` — just `name`.
  Used directly as `entity_name` in `KycQueueItem`.

### DriverDocument model
- File URL field: `image_url` (not `file_url`)
- Review note field: `review_note` (singular, no trailing 's')
- Approved status value: `"ok"` (not `"approved"`)
- Expiry field: `expiry_date` (Python `date`)

### OperatorDocument model
- File URL field: `file_url`
- Review note field: `review_notes` (plural)
- Approved status value: `"approved"`
- Expiry field: `expires_at` (Python `date`)
- No `reviewed_by` / `reviewed_at` columns exist on OperatorDocument — review attribution is stored only in `review_notes` text

---

## Implementation Notes

- Queries use explicit `select(Model, JoinedModel).join(...)` with no lazy loading.
- Combined list is sorted Python-side (ISO string sort on `created_at`) before pagination.
- `age_seconds` helper normalises naive datetimes to UTC before computing delta.
- `expiry-watchlist` threshold: `today + timedelta(days=days)` — already-expired docs are always included.
- Impact strings: driver doc expired → "Force-offline driver"; operator doc expired → "Pause operator".
- Auth guard `_: AdminUser = Depends(get_current_admin_user)` on every endpoint.
- `from __future__ import annotations` at top of file.
