# Module 03 — RBAC — API Contract

All endpoints under `/api/v1/rbac`.
Every endpoint requires `_: AdminUser = Depends(get_current_admin_user)`.

---

## Stats
GET /api/v1/rbac/stats → RbacStatsResponse

## Roles
GET    /api/v1/rbac/roles              → RoleListResponse
POST   /api/v1/rbac/roles              → RoleResponse (201)
GET    /api/v1/rbac/roles/{id}         → RoleResponse
PATCH  /api/v1/rbac/roles/{id}         → RoleResponse
DELETE /api/v1/rbac/roles/{id}         → 204 (system roles blocked)

## Role Permissions (static before dynamic)
GET /api/v1/rbac/roles/{id}/permissions  → { role_id, permissions: [RolePermissionResponse] }
PUT /api/v1/rbac/roles/{id}/permissions  → same (replaces all states)

## Permission Catalog
GET /api/v1/rbac/permissions → PermissionCatalogResponse { domains, total }

---

## DB Tables
- roles (id, name, description, is_system, scope, version, is_active, created_at, updated_at)
- permission_catalog (key PK, description, domain, is_scopeable)
- role_permissions (id, role_id FK, permission_key FK, state enum(none/scoped/granted), scope_data TEXT)

## Permission seed
88 permission keys seeded across 17 domains on first request (idempotent).
