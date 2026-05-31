# Module 20 — Admin Users · Orchestrator Log

## Summary
Module 20 manages the internal admin team: it lets Super Admins view all admin accounts (roles, MFA, status), inspect individual admin profiles with their permission sets and active sessions, and handle invites & access requests. Three screens: 20.1 Team list, 20.2 Admin detail, 20.3 Invites & access requests.

---

## Phase 1 — Scope (COMPLETE)

Files read:
- `Docs/ui/project/Acme Mobility Admin/Module 20 - screens.jsx` — 3 screens: AdminTeamScreen, AdminDetailScreen, InvitesScreen
- `Docs/admin_panel_product_document.md` — NOTE: product doc calls Module 20 "KYC" — numbering mismatch. screens.jsx is the primary reference per CLAUDE.md.
- `memory/project_stack.md` — FastAPI / React 18 / TypeScript / MySQL
- `CLAUDE.md` — patterns and rules

---

## Phase 2 — Audit (COMPLETE)

### Backend (FULLY BUILT)
- `backend/app/models/admin_user.py` ✅ — AdminUser model with all fields
- `backend/app/schemas/auth.py` ✅ — AdminUserResponse, AdminSessionResponse
- `backend/app/services/admin_user_service.py` ✅ — full CRUD + session management
- `backend/app/api/v1/endpoints/admin_users.py` ✅ — all endpoints wired
- `backend/app/api/v1/router.py` ✅ — admin_users router registered at `/admin-users`

Endpoints confirmed:
- GET /admin-users (list, paginated, filterable by role/status/search)
- POST /admin-users/invite
- POST /admin-users/{id}/resend-invite
- GET /admin-users/{id}
- PATCH /admin-users/{id}
- POST /admin-users/{id}/suspend
- POST /admin-users/{id}/reactivate
- POST /admin-users/{id}/force-logout
- POST /admin-users/{id}/reset-2fa
- DELETE /admin-users/{id}
- GET /admin-users/{id}/sessions
- DELETE /admin-users/{id}/sessions
- POST /admin-users/{id}/unlock

### Frontend
- `admin-panel/src/pages/admin-users/AdminDirectoryPage.tsx` ✅ — Screen 20.1 complete
- `admin-panel/src/services/adminUserService.ts` ❌ — does not exist
- `admin-panel/src/pages/admin-users/AdminDetailPage.tsx` ❌ — does not exist
- `admin-panel/src/pages/admin-users/InvitesPage.tsx` ❌ — does not exist
- App.tsx routes for detail + invites ❌ — missing

### Gaps / Notes
- No audit log / recent activity endpoint exists — Screen 20.2 activity panel will show empty state / placeholder
- No access-requests backend endpoint — Screen 20.3 will show empty state for access requests section, pending invites via status='invited' from existing list endpoint

---

## Phase 3 — Task Breakdown (COMPLETE)

### Backend (NO NEW TASKS — fully built)

### Frontend Tasks

**FE-01** Create `admin-panel/src/services/adminUserService.ts`
- TypeScript interfaces: AdminUser, AdminSession
- Service methods: listAdmins, getAdmin, updateAdmin, inviteAdmin, resendInvite, suspendAdmin, reactivateAdmin, forceLogout, reset2fa, deleteAdmin, getAdminSessions, revokeAllSessions, unlockAdmin

**FE-02** Build `admin-panel/src/pages/admin-users/AdminDetailPage.tsx` (Screen 20.2)
- Breadcrumb: System · Admin users · {name}
- Left panel: profile card (avatar initials, name, email, role badge, status badge, 4-tile meta grid: MFA / SSO / Last login / Created)
- Left panel: Effective permissions grid (2-col, based on role)
- Right panel: Active sessions (from /sessions endpoint, device + location + IP + revoke-all button)
- Right panel: Recent activity (placeholder — "No recent activity" since no audit log API)
- Action buttons: Suspend / Reactivate / Force logout / Change role / Reset 2FA
- Responsive: stacked on mobile

**FE-03** Build `admin-panel/src/pages/admin-users/InvitesPage.tsx` (Screen 20.3)
- Title: Invites & access requests
- Left panel: Access requests section → show empty state ("No pending access requests") since no backend endpoint
- Right panel: Pending invites list → load admins with status='invited' from existing list endpoint; resend-invite action per row; "New invite" button opens same invite modal as AdminDirectoryPage
- Approval policy info box at bottom right

**FE-04** Register routes in `admin-panel/src/App.tsx`
- `/admin-users/:id` → AdminDetailPage
- `/admin-users/access` → InvitesPage

---

## Phase 4 — API Contract (COMPLETE)
See `api-contract.md`

---

## Phase 5 — Clarifications
No blocking ambiguities. Decisions made:
- Recent activity panel: placeholder empty state (no audit log API)
- Access requests: UI placeholder (no backend endpoint)
- Pending invites: use GET /admin-users?status=invited

---

## Phase 6 — Agent Spawned
Frontend agent spawned in worktree (background). No backend agent needed.

---

## Clarifications

| Decision | Rationale |
|---|---|
| screens.jsx overrides product doc numbering | CLAUDE.md rule |
| No BE agent needed | Backend fully built |
| Recent activity → placeholder | No audit log endpoint |
| Access requests → empty state | No backend endpoint |
| Pending invites → status=invited filter | Existing list endpoint supports this |
