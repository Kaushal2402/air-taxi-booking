## Files created

- `admin-panel/src/services/adminUserService.ts` — Service layer with all 13 API methods, typed interfaces for AdminUser, AdminSession, InviteAdminBody, UpdateAdminBody, MessageResponse, PaginatedAdmins, ListAdminsParams
- `admin-panel/src/pages/admin-users/AdminDetailPage.tsx` — Screen 20.2: two-column detail page with profile card, effective permissions grid (role-mapped), active sessions list, recent activity placeholder, and header action buttons (Suspend/Reactivate/Force logout/Reset 2FA) all wired with ConfirmDialog
- `admin-panel/src/pages/admin-users/InvitesPage.tsx` — Screen 20.3: two-panel page with empty-state access requests panel and live pending invites panel (per-row Resend, New invite modal), plus approval policy info box

## Files modified

- `admin-panel/src/App.tsx` — Added imports for AdminDetailPage and InvitesPage; registered `/admin-users/access` (before `/admin-users/:id`) and `/admin-users/:id` routes
- `admin-panel/src/pages/admin-users/AdminDirectoryPage.tsx` — Added `useNavigate` import; added "Access requests" button in header actions navigating to `/admin-users/access`; added `cursor: pointer` + `onClick` on table rows navigating to `/admin-users/${a.id}`; added `stopPropagation` on RowMenu wrapper div so row-level menu clicks don't trigger row navigation

## Build result

- Zero TypeScript errors — `tsc -b && vite build` completed successfully
