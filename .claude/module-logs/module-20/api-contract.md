# Module 20 — Admin Users · API Contract

All routes are prefixed `/api/v1/admin-users`.
Auth guard: every endpoint requires `Authorization: Bearer <token>` (AdminUser dependency).

---

## GET /api/v1/admin-users
List all admin users with pagination + filtering.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 20)
- `search` (str, optional) — matches name or email
- `role` (str, optional) — filter by role string
- `status` (str, optional) — `active` | `invited` | `suspended`

Response: `PaginatedResponse<AdminUserResponse>`
```json
{
  "items": [AdminUserResponse],
  "total": 8,
  "page": 1,
  "pages": 1
}
```

---

## POST /api/v1/admin-users/invite
Invite a new admin (creates user with status=invited, sends email).

Request:
```json
{
  "name": "string",
  "email": "string",
  "role": "string"
}
```

Response: `AdminUserResponse` (201)

---

## POST /api/v1/admin-users/{user_id}/resend-invite
Resend the invitation email.

Response: `{ "message": "Invitation resent." }`

---

## GET /api/v1/admin-users/{user_id}
Get single admin user detail.

Response: `AdminUserResponse`

---

## PATCH /api/v1/admin-users/{user_id}
Update admin profile fields.

Request (all optional):
```json
{
  "name": "string | null",
  "phone": "string | null",
  "role": "string | null",
  "locale": "string | null",
  "avatar_url": "string | null"
}
```

Response: `AdminUserResponse`

---

## POST /api/v1/admin-users/{user_id}/suspend
Suspend admin account.

Response: `AdminUserResponse`

---

## POST /api/v1/admin-users/{user_id}/reactivate
Reactivate suspended admin account.

Response: `AdminUserResponse`

---

## POST /api/v1/admin-users/{user_id}/force-logout
Revoke all sessions and force re-login.

Response: `{ "message": "All sessions revoked." }`

---

## POST /api/v1/admin-users/{user_id}/reset-2fa
Clear two-factor secret, forcing re-enrollment.

Response: `{ "message": "2FA reset." }`

---

## DELETE /api/v1/admin-users/{user_id}
Delete admin account permanently.

Response: `{ "message": "Admin user deleted." }`

---

## GET /api/v1/admin-users/{user_id}/sessions
List active sessions for a specific admin.

Response: `Array<AdminSessionResponse>`
```json
[
  {
    "id": "uuid",
    "device_name": "MacBook Pro",
    "device_os": "macOS",
    "ip_address": "103.21.x.x",
    "location": "Bengaluru, IN",
    "two_fa_method": "totp",
    "last_activity_at": "2026-05-31T11:20:00Z",
    "is_current": true
  }
]
```

---

## DELETE /api/v1/admin-users/{user_id}/sessions
Revoke all sessions for a specific admin.

Response: `{ "message": "All sessions revoked." }`

---

## POST /api/v1/admin-users/{user_id}/unlock
Unlock an account that was locked due to failed attempts.

Response: `AdminUserResponse`

---

## AdminUserResponse schema
```ts
interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status: string              // "active" | "invited" | "suspended"
  two_factor_enabled: boolean
  last_sign_in_at: string | null   // ISO datetime
  created_at: string               // ISO datetime
  phone: string | null
  avatar_url: string | null
  locale: string               // default "en"
  failed_attempts: number
  locked_until: string | null  // ISO datetime
}
```

## AdminSessionResponse schema
```ts
interface AdminSession {
  id: string
  device_name: string | null
  device_os: string | null
  ip_address: string | null
  location: string | null
  two_fa_method: string | null
  last_activity_at: string     // ISO datetime
  is_current: boolean
}
```

---

## Not yet implemented (out of scope)
- Access requests CRUD — no backend endpoint exists; Screen 20.3 shows empty state
- Per-admin audit log / recent activity — no endpoint; Screen 20.2 shows placeholder
