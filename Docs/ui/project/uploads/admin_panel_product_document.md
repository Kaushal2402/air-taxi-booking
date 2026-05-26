# Universal Transportation Booking Platform
## Admin Panel — Complete Enterprise Product Document

| Field | Value |
|---|---|
| Document Type | Admin Panel Architecture & Implementation Specification |
| Parent Product | Universal Transportation Booking Platform (UTBP) — White-Label |
| Surface | Admin Web Panel (Super Admin + delegated roles) |
| Version | 1.0 |
| Status | Implementation-Ready |
| Audience | Product Architects, Backend Engineers, Frontend Engineers, UI/UX Designers, DBAs, QA, DevOps |
| Baseline Stack (assumed) | React + TypeScript (frontend), NestJS (backend), PostgreSQL + PostGIS, Redis, S3-compatible storage |
| Auth Model | JWT access + rotating refresh, 2FA for privileged roles, server-enforced RBAC |

---

## How To Read This Document

Each module below follows the exact structure you requested: **Module Name → Module Purpose → Submodules → Screen-Wise Breakdown → UI Components Required → Field-Level Specification → Business Logic → RBAC → API Requirements → Database & Entity Relation → Workflow Diagram Logic (text)**.

Field-level specifications use a consistent column grammar: **Field, Type, Required, Validation, Notes**. API endpoints are namespaced under `/api/v1/admin/...`. Database tables reference the data dictionary established in the parent SOW/BRD/FRS/SRS and extend it where the admin panel requires admin-only entities. RBAC uses a permission-string convention of `module.submodule.action` (for example `bookings.road.cancel`).

The global conventions in Section 0 (layout shell, shared components, shared API behavior, shared RBAC primitives, shared validation, and the master permission registry) apply to every module and are not repeated per module.

---

## Table of Contents

- [Section 0 — Global Conventions & Foundation](#section-0--global-conventions--foundation)
- [Module 1 — Authentication & Admin Identity](#module-1--authentication--admin-identity)
- [Module 2 — Dashboard & Live Operations](#module-2--dashboard--live-operations)
- [Module 3 — Role & Permission Management (RBAC Admin)](#module-3--role--permission-management-rbac-admin)
- [Module 4 — Booking Management (Road)](#module-4--booking-management-road)
- [Module 5 — Booking Management (Air)](#module-5--booking-management-air)
- [Module 6 — Live Dispatch & Exception Console](#module-6--live-dispatch--exception-console)
- [Module 7 — Driver Management](#module-7--driver-management)
- [Module 8 — Vehicle & Fleet Management](#module-8--vehicle--fleet-management)
- [Module 9 — Operator Management (Air)](#module-9--operator-management-air)
- [Module 10 — Aircraft & Crew Management](#module-10--aircraft--crew-management)
- [Module 11 — Customer Management](#module-11--customer-management)
- [Module 12 — Catalog Management (Classes, Zones, Routes)](#module-12--catalog-management-classes-zones-routes)
- [Module 13 — Pricing & Fare Rules](#module-13--pricing--fare-rules)
- [Module 14 — Promotions, Coupons & Referrals](#module-14--promotions-coupons--referrals)
- [Module 15 — Payments, Wallet & Ledger](#module-15--payments-wallet--ledger)
- [Module 16 — Payouts & Settlements](#module-16--payouts--settlements)
- [Module 17 — Notifications & Template Management](#module-17--notifications--template-management)
- [Module 18 — Support & Ticketing Console](#module-18--support--ticketing-console)
- [Module 19 — Reports & Analytics](#module-19--reports--analytics)
- [Module 20 — KYC & Document Verification](#module-20--kyc--document-verification)
- [Module 21 — White-Label Branding & Configuration](#module-21--white-label-branding--configuration)
- [Module 22 — System Settings & Feature Flags](#module-22--system-settings--feature-flags)
- [Module 23 — Audit Log & Compliance](#module-23--audit-log--compliance)
- [Module 24 — Integrations & API Keys](#module-24--integrations--api-keys)
- [Appendix A — Master Permission Registry](#appendix-a--master-permission-registry)
- [Appendix B — Admin Entity-Relationship Overview](#appendix-b--admin-entity-relationship-overview)
- [Appendix C — Shared Status & State Reference](#appendix-c--shared-status--state-reference)

---

## Section 0 — Global Conventions & Foundation

### 0.1 Layout Shell

The admin panel uses a persistent three-region shell: a collapsible left navigation rail grouped by domain (Operations, People, Catalog & Pricing, Finance, Growth, System), a top bar (global search, environment badge showing the buyer/brand and environment, notification bell, quick-create menu, profile menu with role indicator and active-permissions hint), and a main content region. A right-hand contextual drawer is used across modules for detail views, so the operator never loses list context.

### 0.2 Shared UI Components (Design System)

Every module is composed from a shared component library so that build effort is amortized and UX is consistent. The shared components are: DataTable (server-side pagination, multi-column sort, column show/hide, saved views, density toggle, CSV/XLSX export, row selection, bulk-action bar), FilterBar (typed filters — text, select, multiselect, date range, numeric range, boolean, geo-zone picker — with URL-synced filter state and saved filter presets), DetailDrawer, FormBuilder (label, control, inline validation, help text, conditional visibility), StatCard, TrendChart, Timeline, StatusBadge (driven by the shared status registry in Appendix C), Map (zone polygons, live markers, route trace), FileUploader (drag-drop, type/size guard, virus-scan status, preview), ConfirmDialog (with typed-confirmation for destructive actions), AuditTrailPanel, CommentThread, MoneyInput (minor-unit aware, currency-locked), and PermissionGate (renders children only if the current admin holds the required permission).

### 0.3 Shared API Behavior

All admin endpoints are versioned (`/api/v1/admin`), require a valid Bearer JWT, and enforce permission server-side via a guard that reads the required permission from route metadata. List endpoints accept `?page`, `?pageSize` (max 200), `?sort` (comma list of `field:asc|desc`), `?q` (full-text), typed filter params, and return `{ data: [], page, pageSize, total, aggregations? }`. Create/update endpoints accept an `Idempotency-Key` header. Every mutating endpoint writes an audit record (Module 23). Errors use the envelope `{ code, message, details, traceId }`. All money values are integer minor units with an explicit `currency`. All timestamps are ISO 8601 UTC.

### 0.4 Shared RBAC Primitives

Access is governed by **permissions** (atomic `module.submodule.action` strings), grouped into **roles** (named permission sets), assigned to **admin users**. Permissions also carry an optional **scope** dimension (global, by service-zone, by city, by service-type) so that, for example, a Dispatcher can be limited to bookings in Zone A only. The server evaluates `hasPermission(user, permission, scopeContext)` on every protected action. The master registry is in Appendix A.

### 0.5 Shared Validation Rules

All forms validate client-side for UX and server-side for authority. Common rules: emails RFC-5322; phones E.164; money ≥ 0 and within configured caps; dates not in the past where future-only; geo-polygons must be closed and non-self-intersecting; percentage fields 0–100; file uploads restricted by MIME and size and passed through a virus scanner before acceptance; all free-text sanitized against XSS; uniqueness enforced on natural keys (email, phone, plate, registration mark, promo code).

### 0.6 Shared Workflow Conventions

State changes flow through a single state-machine service per entity; the UI only offers transitions that are legal from the current state and permitted for the current role. Every transition can require a reason and produces an audit record and (optionally) a notification.

---

## Module 1 — Authentication & Admin Identity

### MODULE PURPOSE
Authenticate admin-side users (Super Admin, Sub-Admin, Support, Finance, Dispatcher, and any custom roles), establish secure sessions, enforce 2FA for privileged roles, and let admins manage their own profile and security settings. This module is the gate; no other module is reachable without it.

### SUBMODULES
Login & Session, Two-Factor Authentication, Password & Recovery, Admin Profile, Active Sessions & Devices, Admin User Directory (creation/invitation of other admins).

### SCREEN-WISE BREAKDOWN

**Screen 1.1 — Login.** Email + password, "remember this device" checkbox, link to forgot-password, brand logo and theme from the white-label config. On submit, if the role requires 2FA, route to the 2FA challenge.

**Screen 1.2 — 2FA Challenge.** TOTP code entry (6 digits) with fallback to email/SMS OTP; "trust this device for 30 days" option; resend with cooldown.

**Screen 1.3 — Forgot / Reset Password.** Email entry → tokenized reset link → new-password screen with strength meter and policy hints.

**Screen 1.4 — Admin Profile.** Name, email (verified badge), phone, avatar, language, timezone, notification preferences. Read-only role and permission summary.

**Screen 1.5 — Security.** Change password, manage 2FA (enroll/disable with confirmation), view and revoke active sessions/devices, view recent login history (time, IP, device, location, result).

**Screen 1.6 — Admin User Directory.** DataTable of all admin users with status, role, last login, 2FA status; create/invite admin; resend invite; suspend/reactivate; force-logout; reset 2FA.

### UI COMPONENTS REQUIRED
FormBuilder, password strength meter, OTP input, ConfirmDialog (for disabling 2FA, force-logout), DataTable (user directory and login history), StatusBadge, AuditTrailPanel (login history feed).

### FIELD-LEVEL SPECIFICATION

**Admin User**
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| id | UUID | system | — | PK |
| name | string | yes | 2–80 chars | — |
| email | string | yes | RFC-5322, unique | login identity |
| phone | string | no | E.164 | for SMS OTP fallback |
| password_hash | string | system | Argon2id | never returned by API |
| role_id | UUID | yes | exists | FK→roles |
| status | enum | system | invited/active/suspended | — |
| twofa_enabled | bool | system | — | enforced true for privileged roles |
| twofa_secret | string | system | encrypted | never returned |
| last_login_at | datetime | system | — | — |
| failed_attempts | int | system | — | lockout after N |
| locale | string | no | BCP-47 | UI language |
| timezone | string | no | IANA tz | display tz |

**Login Attempt / Session**
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| id | UUID | system | — | PK |
| admin_user_id | UUID | system | exists | FK |
| ip | string | system | IP format | — |
| device_fingerprint | string | system | — | trusted-device key |
| result | enum | system | success/failed/locked | — |
| created_at | datetime | system | — | — |

### BUSINESS LOGIC
Passwords hashed with Argon2id. Access token TTL 15 minutes; refresh token TTL configurable (default 7 days), rotating on each use, revoked on logout or password change. After N (default 5) consecutive failed attempts within a window, the account locks for a cooldown (default 15 minutes) and an alert fires to Super Admin. Privileged roles (Super Admin, Finance Manager) cannot disable their own 2FA without a second factor confirmation. Inviting a new admin sends a tokenized invitation email valid for a configurable window (default 72 hours); the invitee sets their own password and enrolls 2FA on first login. Suspended admins are immediately force-logged-out (refresh tokens revoked).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Support | Dispatcher |
|---|---|---|---|---|---|
| auth.profile.view/edit (self) | ✓ | ✓ | ✓ | ✓ | ✓ |
| auth.security.manage (self) | ✓ | ✓ | ✓ | ✓ | ✓ |
| auth.admins.view | ✓ | scoped | ✗ | ✗ | ✗ |
| auth.admins.create | ✓ | ✗ | ✗ | ✗ | ✗ |
| auth.admins.suspend | ✓ | ✗ | ✗ | ✗ | ✗ |
| auth.admins.reset_2fa | ✓ | ✗ | ✗ | ✗ | ✗ |
| auth.admins.force_logout | ✓ | ✗ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`POST /auth/login`, `POST /auth/2fa/verify`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `POST /auth/2fa/enroll`, `POST /auth/2fa/disable`, `GET /admin/me`, `PATCH /admin/me`, `GET /admin/me/sessions`, `DELETE /admin/me/sessions/{id}`, `GET /admin/users`, `POST /admin/users` (invite), `PATCH /admin/users/{id}`, `POST /admin/users/{id}/suspend`, `POST /admin/users/{id}/force-logout`, `POST /admin/users/{id}/reset-2fa`.

### DATABASE & ENTITY RELATION
`admin_users (role_id → roles.id)`, `admin_sessions (admin_user_id → admin_users.id)`, `login_attempts (admin_user_id → admin_users.id)`, `password_resets (admin_user_id → admin_users.id)`. One admin_user has many sessions, many login attempts. Role is many-to-one.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Login submit]
   -> validate credentials
        FAIL -> increment failed_attempts -> (>=N ? lock + alert : show error)
        PASS -> role requires 2FA ?
                    YES -> [2FA challenge] -> verify code
                              FAIL -> error (resend allowed after cooldown)
                              PASS -> issue tokens -> redirect to Dashboard
                    NO  -> issue tokens -> redirect to Dashboard
[Invite admin] -> create user(status=invited) -> email token
   -> invitee opens link (valid?) -> set password -> enroll 2FA -> status=active
[Suspend admin] -> set status=suspended -> revoke refresh tokens -> audit
```

---

## Module 2 — Dashboard & Live Operations

### MODULE PURPOSE
Give every admin role a real-time, role-scoped operational picture — what is happening right now (live trips, online drivers, pending dispatches, payment health) and how the business is trending (bookings, revenue, ratings) — so operations can act on exceptions immediately and leadership can read the pulse at a glance.

### SUBMODULES
Live Operations Map, KPI Summary, Trend Analytics, Alerts & Exceptions Feed, Quick Actions.

### SCREEN-WISE BREAKDOWN

**Screen 2.1 — Dashboard Home.** Top row of StatCards (Live Trips, Online Drivers, Today's Bookings, Today's GBV, Today's Completed, Cancellation Rate, Avg Pickup ETA, Active Operators). A live map showing online drivers and in-progress trips with clustering. A trends section with selectable window (Today / 7d / 30d / 90d) for bookings, revenue, completion rate, and rating. An alerts feed (dispatch failures, payment gateway errors, document-expiry spikes, SLA breaches). A quick-actions bar (create booking on behalf of customer, broadcast notification, open dispatch console).

**Screen 2.2 — Live Operations Map (full screen).** Filterable by service type, zone, vehicle/aircraft class, and status. Click a marker to open a DetailDrawer with the live booking/trip and one-click jump to the dispatch console.

### UI COMPONENTS REQUIRED
StatCard grid, Map with live markers and clustering, TrendChart (multi-series, window selector), Alerts feed list, Quick-create menu, DetailDrawer.

### FIELD-LEVEL SPECIFICATION (KPI definitions)
| KPI | Definition | Refresh |
|---|---|---|
| Live Trips | count(bookings where status in {Accepted,Arrived,InProgress,Departed,Boarded}) | real-time (push) |
| Online Drivers | count(drivers where online_status=true) | real-time |
| Today's Bookings | count(bookings where requested_at in today, tz=buyer) | 30s |
| Today's GBV | sum(fare_final_minor) of completed today | 60s |
| Cancellation Rate | cancelled/total for window | 60s |
| Avg Pickup ETA | avg(accepted→arrived duration) for window | 60s |

### BUSINESS LOGIC
KPIs are computed from a read-optimized projection (materialized view or cache) refreshed on the cadence above, not by querying the transactional tables directly under dashboard load. Live map markers are driven by the same real-time channel used by customer tracking, throttled and clustered server-side. All KPI values respect the admin's scope (a zone-scoped Sub-Admin sees only their zone). Alerts are generated by threshold rules (configurable in Module 22) and deduplicated within a window.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Support | Dispatcher |
|---|---|---|---|---|---|
| dashboard.view | ✓ | scoped | finance KPIs | ops KPIs | ops KPIs |
| dashboard.revenue.view | ✓ | scoped | ✓ | ✗ | ✗ |
| dashboard.livemap.view | ✓ | scoped | ✗ | ✓ | ✓ |
| dashboard.quickactions.use | ✓ | scoped | ✗ | limited | ✓ |

### API REQUIREMENTS
`GET /admin/dashboard/kpis?window=`, `GET /admin/dashboard/trends?metric=&window=`, `GET /admin/dashboard/live` (or WebSocket `admin.live`), `GET /admin/dashboard/alerts?status=`. All respect scope from the JWT.

### DATABASE & ENTITY RELATION
Reads from projections: `mv_kpi_daily`, `mv_trends`, plus the cache for live state. Alerts persisted in `admin_alerts (id, type, severity, payload, status, created_at, acknowledged_by)`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open Dashboard]
  -> load scoped KPIs (from projection cache)
  -> subscribe to admin.live channel (live trips, online drivers)
  -> render trends for default window
  -> stream alerts; on new alert -> toast + feed entry
[Click alert] -> open relevant module (e.g., dispatch failure -> Dispatch Console)
[Acknowledge alert] -> mark acknowledged_by + timestamp -> audit
```

---

## Module 3 — Role & Permission Management (RBAC Admin)

### MODULE PURPOSE
Let the Super Admin define roles, assign atomic permissions (optionally scoped by zone/city/service), and govern who can do what across the entire admin panel. This module is the control plane for every other module's access checks.

### SUBMODULES
Roles, Permissions Catalog (read-only registry), Role Assignment, Scope Definition.

### SCREEN-WISE BREAKDOWN

**Screen 3.1 — Roles List.** DataTable of roles (name, description, #admins assigned, system/custom flag, created/updated). Actions: create, clone, edit, delete (blocked if assigned), view assigned admins.

**Screen 3.2 — Role Editor.** Role name and description; a permission matrix grouped by module → submodule → action with tri-state (granted / not granted / scoped); for scoped permissions, a scope picker (all zones, specific zones, specific cities, specific service types). Live preview of effective access. Save produces a new role version (versioned for audit).

**Screen 3.3 — Permissions Catalog.** Read-only searchable list of every permission string in the system with description and the modules that consume it (Appendix A is the canonical source).

**Screen 3.4 — Assign Role.** From an admin user, pick a role and (if the role has scoped permissions) the concrete scope values.

### UI COMPONENTS REQUIRED
DataTable, permission matrix (tri-state tree with search and bulk toggle), scope picker (zone/city/service multiselect with map preview), ConfirmDialog, AuditTrailPanel (role version history).

### FIELD-LEVEL SPECIFICATION

**Role**
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| id | UUID | system | — | PK |
| name | string | yes | unique, 2–60 | — |
| description | string | no | ≤ 280 | — |
| is_system | bool | system | — | system roles non-deletable |
| version | int | system | — | increments on edit |
| created_at / updated_at | datetime | system | — | — |

**Role-Permission**
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| role_id | UUID | yes | exists | FK |
| permission_key | string | yes | exists in registry | e.g. bookings.road.cancel |
| scope_type | enum | no | global/zone/city/service | — |
| scope_values | JSON | no | valid ids | applies when scoped |

### BUSINESS LOGIC
Permissions are additive (a role's effective set is the union of granted permissions). There is no "deny" override in the baseline — absence of a permission is denial. System roles (Super Admin etc.) are seeded and cannot be deleted; Super Admin implicitly holds all permissions and cannot be locked out (at least one active Super Admin must always exist — the system blocks removing the last one). Editing a role takes effect on the next request for affected admins (token claims are re-resolved server-side, not trusted from the client). Deleting a role is blocked while any admin is assigned to it. Every role change is versioned and audited.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Others |
|---|---|---|
| rbac.roles.view | ✓ | ✗ (Sub-Admin optional, read-only) |
| rbac.roles.create/edit/delete | ✓ | ✗ |
| rbac.assign | ✓ | ✗ |
| rbac.permissions.view | ✓ | optional read-only |

### API REQUIREMENTS
`GET /admin/roles`, `POST /admin/roles`, `GET /admin/roles/{id}`, `PATCH /admin/roles/{id}`, `DELETE /admin/roles/{id}`, `POST /admin/roles/{id}/clone`, `GET /admin/permissions` (registry), `POST /admin/users/{id}/assign-role`, `GET /admin/roles/{id}/versions`.

### DATABASE & ENTITY RELATION
`roles (1) — (N) role_permissions`; `roles (1) — (N) admin_users`; `permissions` is a static seed table (registry). `role_versions` stores immutable snapshots of each role's permission set for audit.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Create role] -> name+desc -> select permissions (+scopes) -> save (version=1) -> audit
[Edit role]   -> modify matrix -> save (version++) -> snapshot prior version -> affected admins re-resolved
[Delete role] -> assigned admins? YES -> block ; NO -> soft-delete -> audit
[Assign role to admin] -> pick role -> if scoped perms -> pick scope values -> save -> audit
[Guard on every request] -> resolve user's role -> hasPermission(key, scopeContext)? -> allow/deny(403)
```

---

## Module 4 — Booking Management (Road)

### MODULE PURPOSE
Provide complete operational control over all road bookings (cab, bike, rental, outstation, scheduled) across their full lifecycle: search, inspect, intervene (force assign, reassign, cancel, refund), and resolve disputes. This is the primary daily console for operations and support.

### SUBMODULES
All Road Bookings, Booking Detail, Manual/Assisted Booking, Reassign & Force-Assign, Cancellation & Refund, Disputes, Scheduled Bookings, Rental & Outstation specifics.

### SCREEN-WISE BREAKDOWN

**Screen 4.1 — Bookings List.** DataTable with FilterBar (status, service sub-type, date range, city/zone, payment method, driver, customer, fare range, rating, flagged). Columns: booking_ref, customer, sub-type, pickup→drop (truncated), status badge, driver, fare, payment status, created_at. Bulk actions (export, bulk cancel with reason — permission-gated). Saved views ("Live now", "Cancelled today", "Disputed", "Scheduled upcoming").

**Screen 4.2 — Booking Detail (Drawer/Page).** Tabs: Overview (state timeline, customer, driver, vehicle, fare estimate vs final), Map (route trace + telemetry), Fare Breakdown (itemized components from `fare_breakups`), Payments (transactions, refunds), Communications (notifications sent, masked-call logs), Activity/Audit. Action bar: Reassign, Force-Assign, Cancel, Refund, Adjust Fare (permission-gated, reason required), Open Dispute, Contact Customer/Driver.

**Screen 4.3 — Assisted Booking (Create on behalf).** Support creates a booking for a customer (search/select customer, enter pickup/drop, class, payment, schedule). Used for phone bookings.

**Screen 4.4 — Cancellation & Refund.** Cancel with reason; system computes applicable fee per rules and shows refund preview; admin confirms; refund destination (wallet/original/none) selected per policy and permission.

**Screen 4.5 — Disputes.** List and detail of disputed bookings; evidence (telemetry, fare, communications); resolution actions (uphold fare, partial refund, full refund, driver penalty) with reason; closes dispute and triggers ledger postings.

### UI COMPONENTS REQUIRED
DataTable, FilterBar with geo-zone and money-range filters, DetailDrawer with tabs, Map with route trace, Timeline, MoneyInput, ConfirmDialog (typed confirmation for refunds above a threshold), CommentThread, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION (admin-visible booking fields; full entity in parent data dictionary)
| Field | Type | Editable by Admin | Validation | Notes |
|---|---|---|---|---|
| booking_ref | string | no | — | shareable id |
| status | enum | via transitions only | legal transition | state machine guarded |
| driver_id | UUID | via reassign | eligible driver | reassign rules apply |
| fare_final_minor | int | via adjust (gated) | ≥ 0, within cap | reason mandatory, audited |
| cancel_reason | enum+text | on cancel | from list | required |
| refund_amount_minor | int | on refund | ≤ paid amount | destination required |
| flagged | bool | yes | — | for review queues |
| admin_notes | text | yes | ≤ 2000 | internal only |

### BUSINESS LOGIC
Admin actions are constrained by the road booking state machine (Appendix C). Reassign is allowed only from `Accepted`/`Arrived` and only to an eligible driver (online, docs valid, class match, zone match); the prior driver is notified and the dispatch event recorded. Force-Assign bypasses auto-dispatch but still validates eligibility. Cancellation computes the fee per the configured cancellation rules; admin override of the fee requires a higher permission and a reason. Fare Adjust posts a corrective `fare_breakup` entry and re-settles payment; it cannot reduce below zero and cannot exceed configured adjustment caps. Refund posts to the ledger and routes to the configured destination; refunds above a threshold require Finance approval (two-person rule). Dispute resolution may trigger driver clawback (Module 16) and customer refund atomically.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Support | Dispatcher |
|---|---|---|---|---|---|
| bookings.road.view | ✓ | scoped | ✓ | ✓ | scoped |
| bookings.road.create_assisted | ✓ | scoped | ✗ | ✓ | ✓ |
| bookings.road.reassign | ✓ | scoped | ✗ | ✗ | ✓ |
| bookings.road.force_assign | ✓ | scoped | ✗ | ✗ | ✓ |
| bookings.road.cancel | ✓ | scoped | ✗ | ✓ | ✓ |
| bookings.road.adjust_fare | ✓ | ✗ | ✓ | ✗ | ✗ |
| bookings.road.refund | ✓ | ✗ | ✓ | request-only | ✗ |
| bookings.road.dispute.resolve | ✓ | scoped | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/bookings/road`, `GET /admin/bookings/road/{id}`, `POST /admin/bookings/road` (assisted), `POST /admin/bookings/road/{id}/reassign`, `POST /admin/bookings/road/{id}/force-assign`, `POST /admin/bookings/road/{id}/cancel`, `POST /admin/bookings/road/{id}/adjust-fare`, `POST /admin/bookings/road/{id}/refund`, `POST /admin/bookings/road/{id}/dispute`, `POST /admin/bookings/road/{id}/dispute/resolve`, `GET /admin/bookings/road/{id}/telemetry`.

### DATABASE & ENTITY RELATION
`bookings (N) — (1) customers`, `bookings (N) — (1) drivers`, `bookings (1) — (N) fare_breakups`, `bookings (1) — (N) payments`, `bookings (1) — (N) dispatch_events`, `bookings (1) — (1) trips`, `bookings (1) — (0..1) disputes`. Admin notes and flags stored on booking or a `booking_admin_meta` extension.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open booking] -> load overview + state timeline + permitted actions (by state + role)
[Reassign] -> pick eligible driver -> validate eligibility -> notify old+new driver -> record dispatch_event -> audit
[Cancel] -> reason -> compute fee -> show refund preview -> (override fee? need perm) -> confirm -> ledger -> notify -> audit
[Refund] -> amount<=paid -> destination -> (>threshold? Finance approval) -> ledger postings -> gateway refund -> audit
[Dispute] -> open -> gather evidence -> resolve(action+reason) -> ledger (refund/clawback) -> close -> notify -> audit
```

---

## Module 5 — Booking Management (Air)

### MODULE PURPOSE
Operational control over all air bookings (helicopter, charter, shuttle, VIP) including quote handling, operator assignment oversight, manifest review, flight status visibility, and cancellation/rescheduling under tiered policies.

### SUBMODULES
All Air Bookings, Booking/Flight Detail, Quote Oversight (charter/VIP), Manifest Review, Cancellation & Reschedule, Operator Assignment Oversight, Disputes.

### SCREEN-WISE BREAKDOWN

**Screen 5.1 — Air Bookings List.** FilterBar (service sub-type, status, route, operator, date range, pax count, fare range, tier=vip). Columns: booking_ref, customer, sub-type, route/itinerary, operator, status, etd, fare, payment status.

**Screen 5.2 — Air Booking Detail.** Tabs: Overview (state timeline, customer, operator, aircraft, crew), Itinerary/Route, Manifest (passenger list, baggage, weight vs MTOW check), Quote (charter/VIP: quote versions, accepted quote), Payments, Communications, Audit. Action bar: Assign/Reassign Operator (oversight), Approve/Reject Quote (if admin-mediated), Cancel, Reschedule, Refund, Open Dispute.

**Screen 5.3 — Quote Oversight.** For charter/VIP, view operator quotes, compare, and (where the model is admin-mediated) push the selected quote to the customer.

**Screen 5.4 — Cancellation & Reschedule.** Tiered policy preview by time-to-departure; compute fee/refund; reschedule creates a linked booking and updates manifest.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer with tabs, manifest table with weight-sum validation, quote comparison view, Timeline, MoneyInput, ConfirmDialog, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION (admin-visible)
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| booking_ref | string | no | — | — |
| service_subtype | enum | no | helicopter/charter/shuttle/vip | — |
| operator_id | UUID | via assign | eligible operator | route-licensed |
| aircraft_id | UUID | oversight | capacity ≥ pax, MTOW ok | operator-set, admin views |
| manifest | relation | review/limited edit | pax ≤ capacity, ID rules | regulator fields |
| etd / eta | datetime | via reschedule | feasible | — |
| cancel_tier | enum | system-derived | by time-to-departure | drives fee |

### BUSINESS LOGIC
Air bookings follow the air state machine (Appendix C). Manifest weight must not exceed aircraft MTOW (passenger + baggage); the panel surfaces a hard validation. Cancellation fee is determined by the tier matching time-to-departure (configurable per operator/route); force-majeure cancellation (weather/regulator) bypasses fee with reason. Reschedule must target an available slot and re-locks the manifest. Operator payouts (Module 16) are affected by air booking outcomes. Where the commercial model is admin-mediated for charter/VIP, the admin pushes a selected operator quote to the customer; otherwise the operator-customer flow is observed read-only by admin.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Support | Dispatcher |
|---|---|---|---|---|---|
| bookings.air.view | ✓ | scoped | ✓ | ✓ | scoped |
| bookings.air.assign_operator | ✓ | scoped | ✗ | ✗ | ✓ |
| bookings.air.quote.push | ✓ | scoped | ✗ | ✗ | ✗ |
| bookings.air.cancel | ✓ | scoped | ✗ | ✓ | ✓ |
| bookings.air.reschedule | ✓ | scoped | ✗ | ✓ | ✓ |
| bookings.air.refund | ✓ | ✗ | ✓ | request-only | ✗ |
| bookings.air.manifest.edit | ✓ | scoped | ✗ | limited | ✗ |

### API REQUIREMENTS
`GET /admin/bookings/air`, `GET /admin/bookings/air/{id}`, `POST /admin/bookings/air/{id}/assign-operator`, `POST /admin/bookings/air/{id}/quote/push`, `POST /admin/bookings/air/{id}/cancel`, `POST /admin/bookings/air/{id}/reschedule`, `POST /admin/bookings/air/{id}/refund`, `GET /admin/bookings/air/{id}/manifest`, `PATCH /admin/bookings/air/{id}/manifest`.

### DATABASE & ENTITY RELATION
`bookings (air) (N) — (1) operators`, `(N) — (1) aircraft`, `(1) — (1) flights`, `flights (1) — (N) manifest_passengers`, `bookings (1) — (N) charter_quotes`, `(1) — (N) payments`, `(1) — (0..1) disputes`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open air booking] -> overview + manifest weight check + permitted actions
[Assign operator] -> eligible (route-licensed, available)? -> assign -> notify -> audit
[Quote push (charter/VIP)] -> select operator quote -> push to customer -> await accept
[Cancel] -> derive tier by time-to-departure -> compute fee/refund -> (force majeure? waive) -> ledger -> notify -> audit
[Reschedule] -> pick available slot -> relink booking -> re-lock manifest -> notify -> audit
```

---

## Module 6 — Live Dispatch & Exception Console

### MODULE PURPOSE
A real-time operations cockpit where dispatchers monitor auto-dispatch, intervene when it fails (no driver found, repeated rejections, stuck states), manually assign, and manage live exceptions for both road and (where applicable) air on-demand requests.

### SUBMODULES
Live Request Queue, Dispatch Map, Manual Assign, Exception Handling, Surge & Supply Monitor.

### SCREEN-WISE BREAKDOWN

**Screen 6.1 — Dispatch Console.** Split view: left = live request queue (requests in `Requested`, time-in-state, dispatch attempts, current radius); right = map of requests and nearby online drivers. Selecting a request shows eligible drivers ranked, with a manual-assign action.

**Screen 6.2 — Exceptions.** Requests that exhausted dispatch (no driver), stuck-in-state beyond SLA, or repeated rejections; each with recommended action (expand radius, manual assign, notify customer, cancel-and-refund).

**Screen 6.3 — Supply & Surge Monitor.** Heat view of demand vs online supply per zone; current surge multipliers; manual surge override (permission-gated, time-boxed, audited).

### UI COMPONENTS REQUIRED
Split-pane layout, live queue list (auto-sorting by time-in-state), Map with driver + request markers, ranked eligible-driver list, ConfirmDialog, surge override control with expiry, alert toasts.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| request_id | UUID | booking in Requested |
| time_in_state | duration | drives SLA alerting |
| attempts | int | dispatch pings so far |
| current_radius_m | int | expands per policy |
| eligible_count | int | drivers currently eligible |
| surge_multiplier | decimal | per zone, capped |
| surge_override_until | datetime | manual override expiry |

### BUSINESS LOGIC
The console reads the live dispatch state. Manual assign validates eligibility identically to auto-dispatch and is concurrency-safe (first commit wins). Exceptions are generated when time-in-state exceeds the configured SLA or attempts exceed a threshold. Surge override is bounded by the configured cap and auto-expires; every override is audited with the actor and reason. Dispatchers act only within their scope (zone/city).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Dispatcher | Sub-Admin | Others |
|---|---|---|---|---|
| dispatch.console.view | ✓ | ✓ (scoped) | scoped | ✗ |
| dispatch.manual_assign | ✓ | ✓ (scoped) | scoped | ✗ |
| dispatch.surge.override | ✓ | optional | ✗ | ✗ |
| dispatch.exception.resolve | ✓ | ✓ (scoped) | scoped | ✗ |

### API REQUIREMENTS
`GET /admin/dispatch/queue` (or WS `admin.dispatch`), `GET /admin/dispatch/requests/{id}/eligible-drivers`, `POST /admin/dispatch/requests/{id}/assign`, `POST /admin/dispatch/requests/{id}/expand-radius`, `POST /admin/dispatch/surge/override`, `POST /admin/dispatch/exceptions/{id}/resolve`.

### DATABASE & ENTITY RELATION
Reads `bookings` (Requested), `drivers` (online + location from cache), `dispatch_events`. Surge overrides stored in `surge_overrides (zone_id, multiplier, until, created_by, reason)`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Monitor queue] -> request time_in_state increases
   -> SLA breach OR attempts>threshold -> raise exception
[Manual assign] -> view ranked eligible drivers -> pick -> validate eligibility (atomic) -> assign -> notify -> audit
[No drivers] -> expand radius (policy) OR notify customer OR cancel+refund
[Surge override] -> set multiplier<=cap + expiry + reason -> apply -> auto-expire -> audit
```

---

## Module 7 — Driver Management

### MODULE PURPOSE
Manage the full lifecycle of road drivers: onboarding and approval, profile and documents, vehicle linkage, performance, earnings visibility, status (online/suspended/deactivated), and disciplinary actions. This is where driver supply is governed.

### SUBMODULES
Onboarding Queue, Driver Directory, Driver Detail, Documents & KYC, Performance, Earnings, Disciplinary Actions, Bulk Operations.

### SCREEN-WISE BREAKDOWN

**Screen 7.1 — Onboarding Queue.** DataTable of drivers in `Pending`/`InReview` with submitted documents, completeness indicator, and quick approve/reject. FilterBar by city/zone, submission date, missing-document type.

**Screen 7.2 — Driver Directory.** All drivers with status, rating, acceptance/cancellation rate, current vehicle, city/zone, last active. Bulk actions (export, message, suspend — gated).

**Screen 7.3 — Driver Detail.** Tabs: Profile (personal, photo, contact), Documents (each with status, expiry, preview, approve/reject), Vehicle (linked vehicle(s)), Performance (rating trend, acceptance, cancellation, completed trips), Earnings (period summaries, link to payouts), Trips (history), Wallet (balance, transactions), Disciplinary (warnings, suspensions, notes), Audit. Action bar: Approve, Reject, Suspend, Reactivate, Deactivate, Force-Offline, Adjust Wallet (gated), Reset Login.

**Screen 7.4 — Documents & KYC.** Per-document review with side-by-side image and extracted fields (if KYC vendor integrated), approve/reject with reason, set expiry, request re-upload.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer/Page with tabs, FileUploader/preview with KYC field overlay, StatusBadge, TrendChart (performance), MoneyInput (wallet adjust), ConfirmDialog, CommentThread (disciplinary notes), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| name | string | yes | 2–80 | — |
| phone | string | limited | E.164, unique | login identity |
| license_no | string | review | format per region | KYC |
| license_expiry | date | review | future on approval | blocks online if expired |
| kyc_status | enum | via review | pending/approved/rejected | gates online |
| online_status | bool | force-offline only | — | driver-controlled normally |
| status | enum | via transitions | Pending→Approved→Active→Suspended→Deactivated | — |
| rating_avg | decimal | system | 1–5 | rolling |
| acceptance_rate | decimal | system | 0–100 | rolling |
| current_vehicle_id | UUID | via link | active vehicle | FK |
| wallet adjustment | int(minor) | gated | reason required | audited |

### BUSINESS LOGIC
A driver cannot be set/keep `Active` (online-eligible) with any required document expired or rejected; the system auto-suspends online capability on expiry and notifies the driver and admin. Approval requires all mandatory documents approved (unless the grace-period onboarding model is enabled in Module 22, in which case provisional activation is allowed with a deadline). Suspension immediately force-offlines and blocks new dispatch. Wallet adjustments post double-entry ledger transactions with mandatory reason and (above threshold) Finance approval. Disciplinary thresholds (rating below X, cancellation above Y) auto-flag drivers into a review queue.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Support | Dispatcher |
|---|---|---|---|---|---|
| drivers.view | ✓ | scoped | ✓ | ✓ | scoped |
| drivers.onboard.approve/reject | ✓ | scoped | ✗ | ✗ | ✗ |
| drivers.suspend/reactivate | ✓ | scoped | ✗ | request-only | ✗ |
| drivers.force_offline | ✓ | scoped | ✗ | ✗ | ✓ |
| drivers.wallet.adjust | ✓ | ✗ | ✓ | ✗ | ✗ |
| drivers.documents.review | ✓ | scoped | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/drivers`, `GET /admin/drivers/{id}`, `POST /admin/drivers/{id}/approve`, `POST /admin/drivers/{id}/reject`, `POST /admin/drivers/{id}/suspend`, `POST /admin/drivers/{id}/reactivate`, `POST /admin/drivers/{id}/deactivate`, `POST /admin/drivers/{id}/force-offline`, `POST /admin/drivers/{id}/documents/{docId}/review`, `POST /admin/drivers/{id}/wallet/adjust`, `GET /admin/drivers/{id}/earnings`, `GET /admin/drivers/{id}/trips`.

### DATABASE & ENTITY RELATION
`drivers (1) — (N) documents`, `drivers (1) — (N) vehicles` (or 1:1 active), `drivers (1) — (1) wallets`, `drivers (1) — (N) bookings`, `drivers (1) — (N) disciplinary_actions`. KYC status mirrored on driver; documents are the source of truth.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Onboarding] Pending -> review docs -> all approved? YES -> Approved -> Active
                                              NO -> request re-upload / reject(reason)
[Doc expiry job] -> mark expired -> auto force-offline + notify
[Suspend] -> set Suspended -> force-offline -> block dispatch -> audit
[Wallet adjust] -> amount+reason -> (>threshold? Finance approve) -> ledger -> audit
[Auto-flag] -> rating<X or cancel>Y -> add to review queue
```

---

## Module 8 — Vehicle & Fleet Management

### MODULE PURPOSE
Manage vehicles (and fleet-owner relationships) on the road side: registration, class assignment, documents, inspection/airworthiness equivalents, and linkage to drivers. Ensures only compliant vehicles operate.

### SUBMODULES
Vehicle Directory, Vehicle Detail, Vehicle Documents, Vehicle-Class Mapping, Fleet Owners/Vendors.

### SCREEN-WISE BREAKDOWN

**Screen 8.1 — Vehicle Directory.** DataTable (plate, make/model/year, class, owner/vendor, linked driver, status, document validity). Filter by class, city, status, expiring-documents.

**Screen 8.2 — Vehicle Detail.** Profile, documents (registration, insurance, permit, fitness) with expiry/status, class assignment, linked driver(s), history. Actions: approve, suspend, reassign class, link/unlink driver.

**Screen 8.3 — Fleet Owners/Vendors.** Vendors who own multiple vehicles/drivers; their vehicles, drivers, payout account, status.

### UI COMPONENTS REQUIRED
DataTable, FilterBar (expiring-documents quick filter), DetailDrawer, FileUploader/preview, StatusBadge, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| plate_no | string | review | unique, region format | — |
| make/model/year | string/int | yes | year ≤ current | — |
| vehicle_class_id | UUID | yes | exists/active | FK |
| registration_doc / insurance / permit / fitness | doc | review | expiry future on approve | gates operation |
| owner_vendor_id | UUID | yes | exists | nullable for owner-driver |
| status | enum | transitions | active/suspended/retired | — |

### BUSINESS LOGIC
A vehicle with any expired mandatory document cannot be linked as an active dispatch vehicle; the linked driver's eligibility is recomputed. Class assignment must match the catalog (Module 12). A driver can be linked to one active vehicle at a time (configurable). Vendor-owned vehicles route earnings/commission per vendor agreements (Module 16).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Others |
|---|---|---|---|
| vehicles.view | ✓ | scoped | Support read |
| vehicles.create/edit | ✓ | scoped | ✗ |
| vehicles.documents.review | ✓ | scoped | ✗ |
| vehicles.suspend | ✓ | scoped | ✗ |
| vendors.manage | ✓ | scoped | ✗ |

### API REQUIREMENTS
`GET /admin/vehicles`, `POST /admin/vehicles`, `GET /admin/vehicles/{id}`, `PATCH /admin/vehicles/{id}`, `POST /admin/vehicles/{id}/documents/{docId}/review`, `POST /admin/vehicles/{id}/link-driver`, `POST /admin/vehicles/{id}/suspend`, `GET /admin/vendors`, `POST /admin/vendors`, `GET /admin/vendors/{id}`.

### DATABASE & ENTITY RELATION
`vehicles (N) — (1) vehicle_classes`, `vehicles (N) — (0..1) vendors`, `vehicles (1) — (N) documents`, `vehicles (1) — (0..1) drivers` (active link). `vendors (1) — (N) vehicles`, `vendors (1) — (N) drivers`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Add vehicle] -> details + class -> upload docs -> review -> approve -> active
[Doc expiry] -> mark expired -> unlink-from-dispatch -> recompute driver eligibility -> notify
[Link driver] -> driver eligible + vehicle active + class match -> link -> audit
```

---

## Module 9 — Operator Management (Air)

### MODULE PURPOSE
Govern air operators: onboarding and approval, certifications and insurance, fleet and crew oversight, route/schedule rights, performance, and payout configuration. Operators carry higher compliance risk than road drivers, so this module includes stricter approval gates.

### SUBMODULES
Operator Onboarding Queue, Operator Directory, Operator Detail, Certifications & Compliance, Route/Schedule Rights, Performance, Payout Configuration.

### SCREEN-WISE BREAKDOWN

**Screen 9.1 — Onboarding Queue.** Operators in `Pending`/`InReview`; company docs, certifications, insurance; site-visit state (if enabled in Module 22); approve/reject.

**Screen 9.2 — Operator Directory.** All operators with status, fleet size, routes, on-time performance, payout status.

**Screen 9.3 — Operator Detail.** Tabs: Company (registration, contacts, certifications, insurance with expiry), Fleet (aircraft — see Module 10), Crew (pilots/crew), Routes & Schedules, Performance (load factor, OTP, cancellations), Payouts (account, history), Compliance (document expiry, audit). Actions: approve, reject, pause publishing, reactivate, deactivate, configure commission.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer/Page with tabs, FileUploader/preview, StatusBadge, TrendChart (performance), ConfirmDialog, optional site-visit scheduler.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| name | string | yes | unique | — |
| company_registration_no | string | review | format/region | — |
| certifications | doc(s) | review | expiry future | gates publishing |
| insurance_doc | doc | review | expiry future | gates publishing |
| status | enum | transitions | Pending→Approved→Active→Paused→Deactivated | — |
| payout_account_ref | string | finance | valid | masked |
| commission_config | JSON | gated | valid rate | per service/route |
| site_visit_status | enum | optional | scheduled/done/waived | if enabled |

### BUSINESS LOGIC
Operator cannot publish inventory while any required certification or insurance is expired; publishing auto-pauses on expiry. If site-visit gating is enabled (Module 22), approval requires `site_visit_status=done|waived`. Commission configuration overrides the platform default for that operator. Pausing an operator hides their inventory and blocks new air bookings to them while letting existing confirmed flights proceed.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Others |
|---|---|---|---|---|
| operators.view | ✓ | scoped | ✓ | Support read |
| operators.onboard.approve/reject | ✓ | scoped | ✗ | ✗ |
| operators.pause/reactivate | ✓ | scoped | ✗ | ✗ |
| operators.commission.config | ✓ | ✗ | ✓ | ✗ |
| operators.payout.config | ✓ | ✗ | ✓ | ✗ |

### API REQUIREMENTS
`GET /admin/operators`, `POST /admin/operators`, `GET /admin/operators/{id}`, `POST /admin/operators/{id}/approve`, `POST /admin/operators/{id}/reject`, `POST /admin/operators/{id}/pause`, `POST /admin/operators/{id}/reactivate`, `POST /admin/operators/{id}/commission`, `GET /admin/operators/{id}/performance`.

### DATABASE & ENTITY RELATION
`operators (1) — (N) aircraft`, `operators (1) — (N) pilots`, `operators (1) — (N) routes/schedules`, `operators (1) — (N) documents`, `operators (1) — (N) payouts`, `operators (1) — (0..1) commission_config`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Onboard operator] Pending -> review company+certs+insurance -> (site visit enabled? require done/waived)
   -> all valid -> Approved -> Active (can publish)
[Cert/insurance expiry] -> auto-pause publishing + notify
[Pause] -> hide inventory, block new bookings, allow existing flights -> audit
```

---

## Module 10 — Aircraft & Crew Management

### MODULE PURPOSE
Manage the air assets and people: aircraft (registration, type, capacity, MTOW, range, airworthiness) and pilots/crew (license, type ratings, medical), with compliance gating that feeds booking eligibility.

### SUBMODULES
Aircraft Directory, Aircraft Detail, Airworthiness & Maintenance, Pilots/Crew Directory, Crew Detail & Certifications.

### SCREEN-WISE BREAKDOWN

**Screen 10.1 — Aircraft Directory.** Per operator: aircraft list (registration mark, type, seats, MTOW, range, airworthiness status, maintenance state). Filter by operator, type, status.

**Screen 10.2 — Aircraft Detail.** Specs, airworthiness doc + expiry, maintenance windows (block scheduling), photos, assigned routes. Actions: approve, ground, schedule maintenance.

**Screen 10.3 — Pilots/Crew Directory & Detail.** License, type ratings (which aircraft types they may fly), medical expiry, assignments. Actions: approve, ground, edit ratings.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer, FileUploader/preview, calendar (maintenance windows), StatusBadge, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| registration_mark | string | review | unique/region | — |
| aircraft_type_id | UUID | yes | exists | FK |
| seat_capacity | int | yes | ≥1 | dispatch/manifest cap |
| mtow_kg | int | yes | >0 | weight check |
| range_nm | int | yes | >0 | route feasibility |
| airworthiness_doc | doc | review | expiry future | grounds if expired |
| maintenance_windows | JSON | yes | valid ranges | blocks scheduling |
| pilot.type_ratings | JSON | review | valid type ids | gates assignment |
| pilot.medical_expiry | date | review | future | grounds if expired |

### BUSINESS LOGIC
An aircraft with expired airworthiness or within a maintenance window cannot be scheduled or assigned. A pilot can only be assigned to an aircraft type they are rated for and only if their medical and license are valid. These checks feed Module 5/Module 9 booking eligibility. Maintenance scheduling detects conflicts with existing flights and warns/blocks.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Operator-liaison | Others |
|---|---|---|---|---|
| aircraft.view | ✓ | scoped | ✓ | Support read |
| aircraft.review/approve | ✓ | scoped | ✗ | ✗ |
| aircraft.ground/maintenance | ✓ | scoped | ✗ | ✗ |
| crew.view | ✓ | scoped | ✓ | ✗ |
| crew.review/approve | ✓ | scoped | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/operators/{id}/aircraft`, `POST /admin/aircraft/{id}/approve`, `POST /admin/aircraft/{id}/ground`, `POST /admin/aircraft/{id}/maintenance`, `GET /admin/operators/{id}/pilots`, `POST /admin/pilots/{id}/approve`, `PATCH /admin/pilots/{id}/ratings`, `POST /admin/pilots/{id}/ground`.

### DATABASE & ENTITY RELATION
`aircraft (N) — (1) operators`, `aircraft (N) — (1) aircraft_types`, `aircraft (1) — (N) documents`, `aircraft (1) — (N) maintenance_windows`. `pilots (N) — (1) operators`, `pilots (1) — (N) documents`, `pilots (N) — (N) aircraft_types` via ratings.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Add aircraft] -> specs + airworthiness -> review -> approve -> available
[Airworthiness expiry / maintenance] -> ground -> exclude from scheduling -> notify operator
[Assign pilot] -> rated for type? medical valid? -> allow ; else block
```

---

## Module 11 — Customer Management

### MODULE PURPOSE
View and manage customers: profile, history, wallet, support context, fraud flags, and data-privacy actions (export/delete). Support agents live here; finance and admins use it for refunds and risk.

### SUBMODULES
Customer Directory, Customer Detail, Wallet, Bookings History, Fraud & Risk Flags, Privacy (Export/Delete), Communications.

### SCREEN-WISE BREAKDOWN

**Screen 11.1 — Customer Directory.** DataTable (name, phone, email, signup date, total bookings, lifetime value, status, risk flag). Filter by status, city, signup window, LTV range, flagged.

**Screen 11.2 — Customer Detail.** Tabs: Profile (contact, addresses, payment methods — masked), Bookings (road+air history), Wallet (balance, transactions, adjust — gated), Support (tickets), Risk (flags, reasons), Privacy (export data, delete request), Communications (notifications sent). Actions: suspend, reactivate, adjust wallet (gated), issue goodwill credit (gated), flag/unflag, initiate data export/delete.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer/Page with tabs, MoneyInput (wallet/credit), StatusBadge, ConfirmDialog (typed for delete), CommentThread (risk notes), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| name | string | limited | 2–80 | — |
| phone | string | limited | E.164, unique | identity |
| email | string | limited | RFC-5322 | — |
| status | enum | transitions | active/suspended | — |
| risk_flag | bool | yes | reason required | — |
| wallet_balance | int(minor) | adjust gated | ≥0 | — |
| goodwill_credit | int(minor) | gated | within cap | reason required |
| payment_methods | masked | no | — | tokens only |

### BUSINESS LOGIC
Customer wallet cannot go negative. Goodwill credits and wallet adjustments require reason and (above threshold) Finance approval; both post to the ledger. Suspending a customer blocks new bookings. Privacy: data export compiles a machine-readable archive; data deletion anonymizes PII while retaining financial records required by law (configurable retention) — deletion is a typed-confirmation destructive action requiring Super Admin or a dedicated privacy permission. Fraud flags can auto-trigger from rules (e.g., repeated chargebacks) and surface in dispatch/booking as risk context.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Support |
|---|---|---|---|---|
| customers.view | ✓ | scoped | ✓ | ✓ |
| customers.suspend | ✓ | scoped | ✗ | request-only |
| customers.wallet.adjust | ✓ | ✗ | ✓ | ✗ |
| customers.goodwill.credit | ✓ | ✗ | ✓ | limited |
| customers.flag | ✓ | scoped | ✓ | ✓ |
| customers.privacy.export | ✓ | ✗ | ✗ | ✗ |
| customers.privacy.delete | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/customers`, `GET /admin/customers/{id}`, `POST /admin/customers/{id}/suspend`, `POST /admin/customers/{id}/wallet/adjust`, `POST /admin/customers/{id}/goodwill`, `POST /admin/customers/{id}/flag`, `POST /admin/customers/{id}/privacy/export`, `POST /admin/customers/{id}/privacy/delete`, `GET /admin/customers/{id}/bookings`.

### DATABASE & ENTITY RELATION
`customers (1) — (N) bookings`, `(1) — (1) wallets`, `(1) — (N) payment_methods`, `(1) — (N) tickets`, `(1) — (N) risk_flags`, `(1) — (N) privacy_requests`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open customer] -> profile + history + wallet + risk
[Wallet adjust / goodwill] -> amount+reason -> (>threshold? Finance) -> ledger -> notify -> audit
[Suspend] -> block new bookings -> audit
[Privacy delete] -> typed confirm -> anonymize PII -> retain financial records -> audit
```

---

## Module 12 — Catalog Management (Classes, Zones, Routes)

### MODULE PURPOSE
Define the operational catalog that every booking and pricing decision depends on: vehicle classes, aircraft types, geographic service zones (polygons), and air routes. Misconfiguration here blocks or misprices bookings, so it is tightly validated and audited.

### SUBMODULES
Vehicle Classes, Aircraft Types, Service Zones, Air Routes, Zone-Service Mapping.

### SCREEN-WISE BREAKDOWN

**Screen 12.1 — Vehicle Classes.** List + editor (code, display name, seats, description, image, active). Used in pricing and dispatch eligibility.

**Screen 12.2 — Aircraft Types.** List + editor (code, name, seats, description, image, default specs).

**Screen 12.3 — Service Zones.** Map-based polygon editor (draw/edit zones), zone name, tax jurisdiction, active services in zone, surge config link. Validates closed, non-self-intersecting polygons.

**Screen 12.4 — Air Routes.** Origin→destination (helipads/points), distance, estimated duration, airspace metadata, eligible operators.

### UI COMPONENTS REQUIRED
DataTable, FormBuilder, Map polygon editor (draw, vertex edit, validation), image uploader, StatusBadge, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| vehicle_class.code | string | yes | unique | stable key |
| vehicle_class.seats | int | yes | ≥1 | — |
| aircraft_type.code | string | yes | unique | — |
| zone.polygon | geometry | yes | closed, simple | PostGIS |
| zone.tax_jurisdiction | string | yes | valid | drives tax |
| route.origin/destination | point/ref | yes | exist | — |
| route.distance_km | decimal | yes | >0 | — |

### BUSINESS LOGIC
Classes/types referenced by active pricing or bookings cannot be deleted (only deactivated). Zone polygons must be valid geometry; overlapping zones are allowed but resolved by a priority order for pricing. A booking is blocked if pickup/drop falls outside active zones for that service. Route changes do not retroactively alter completed bookings (pricing snapshots protect history).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Others |
|---|---|---|---|
| catalog.view | ✓ | scoped | read |
| catalog.classes.manage | ✓ | ✗ | ✗ |
| catalog.zones.manage | ✓ | scoped | ✗ |
| catalog.routes.manage | ✓ | scoped | ✗ |

### API REQUIREMENTS
`GET/POST/PATCH /admin/catalog/vehicle-classes`, `.../aircraft-types`, `GET/POST/PATCH /admin/catalog/zones`, `GET/POST/PATCH /admin/catalog/routes`, `POST /admin/catalog/zones/{id}/validate-geometry`.

### DATABASE & ENTITY RELATION
`vehicle_classes`, `aircraft_types`, `service_zones (polygon geom)`, `routes (origin/destination, operators via route_operators)`. Pricing rules and bookings reference these by id; deletion guarded by FK usage checks.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Create zone] -> draw polygon -> validate (closed/simple) -> set jurisdiction+services -> save -> audit
[Edit class] -> referenced by active pricing/bookings? -> allow edit (non-key) ; delete -> deactivate only
[Booking geo-check] -> pickup/drop in active zone(s)? -> allow ; else block
```

---

## Module 13 — Pricing & Fare Rules

### MODULE PURPOSE
Configure all pricing for road and air: base fares, per-km/per-min rates, surge thresholds and caps, peak/night charges, waiting charges, rental packages, outstation slabs, air per-seat and hourly rates, taxes, and effective-dated rule versions. This module is the revenue engine's control surface.

### SUBMODULES
Road Fare Rules, Rental Packages, Outstation Slabs, Air Fare Rules, Surge Configuration, Taxes, Rule Versioning & Simulation.

### SCREEN-WISE BREAKDOWN

**Screen 13.1 — Road Fare Rules.** Per zone × vehicle class: base fare, per-km, per-min, minimum fare, waiting allowance + charge, night window + charge, effective_from/to. Versioned.

**Screen 13.2 — Rental Packages.** Package definitions (hours + km included, base price, excess per-hour, excess per-km) per zone/class.

**Screen 13.3 — Outstation Slabs.** Per-km slab, minimum km guarantee, driver allowance, night-halt charge, one-way/round-trip rules.

**Screen 13.4 — Air Fare Rules.** Per route × aircraft type: per-seat base (shuttle/heli), hourly rate (charter/VIP), positioning charge, night-halt, baggage charge, fuel surcharge.

**Screen 13.5 — Surge Configuration.** Demand/supply threshold, multiplier steps, cap, eligible windows, per zone.

**Screen 13.6 — Taxes.** Tax type, rate, HSN/SAC, jurisdiction, inclusive/exclusive.

**Screen 13.7 — Fare Simulator.** Input a hypothetical trip; preview the computed fare against current/draft rules before publishing.

### UI COMPONENTS REQUIRED
FormBuilder (rule editors), DataTable (rule versions), MoneyInput, date-range pickers (effective dating), fare simulator panel, diff view (compare rule versions), ConfirmDialog (publish), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| zone_id / vehicle_class_id | UUID | yes | exists | scope |
| base_fare_minor | int | yes | ≥0 | — |
| per_km_minor / per_min_minor | int | yes | ≥0 | — |
| min_fare_minor | int | yes | ≥ base | — |
| surge_cap | decimal | yes | ≥1, ≤ configured max | — |
| night_window | time range | no | valid | — |
| effective_from / to | datetime | yes | from<to | versioning |
| tax_rate | decimal | yes | 0–100 | — |

### BUSINESS LOGIC
Pricing rules are effective-dated and versioned; a booking snapshots the active rule set at creation so historical fares are reproducible. Publishing a new version does not mutate past versions. Surge multiplier is bounded by `surge_cap` and by any regulatory maximum. The fare simulator runs the exact production pricing engine against selected rules. Overlapping zone pricing resolves by zone priority. Draft rules can be validated and simulated before publish; publish requires confirmation and is audited.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Finance | Sub-Admin | Others |
|---|---|---|---|---|
| pricing.view | ✓ | ✓ | scoped | read |
| pricing.road.manage | ✓ | ✓ | ✗ | ✗ |
| pricing.air.manage | ✓ | ✓ | ✗ | ✗ |
| pricing.surge.manage | ✓ | ✓ | ✗ | ✗ |
| pricing.taxes.manage | ✓ | ✓ | ✗ | ✗ |
| pricing.publish | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET/POST/PATCH /admin/pricing/road`, `.../rental`, `.../outstation`, `.../air`, `.../surge`, `.../taxes`, `POST /admin/pricing/simulate`, `POST /admin/pricing/{id}/publish`, `GET /admin/pricing/{id}/versions`.

### DATABASE & ENTITY RELATION
`pricing_rules (service_type, zone_id, class/type_id, rule JSON, effective_from/to, version)`, `tax_rules`, `surge_configs`, `rental_packages`, `outstation_slabs`. Bookings store `pricing_snapshot`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Draft rule] -> edit -> simulate (engine) -> looks right? -> publish (new version, effective dated) -> audit
[Booking created] -> snapshot active rules -> store on booking
[Surge] -> demand/supply ratio > threshold -> multiplier step (<=cap) -> applied to estimate/final
```

---

## Module 14 — Promotions, Coupons & Referrals

### MODULE PURPOSE
Create and govern growth levers: promo codes, automatic promotions, referral programs, and (optional) loyalty. Includes budget control, eligibility rules, and redemption analytics.

### SUBMODULES
Promotions/Coupons, Referral Program, Loyalty (optional), Budget & Redemption Analytics.

### SCREEN-WISE BREAKDOWN

**Screen 14.1 — Promotions List & Editor.** Code, type (flat/percent), value, cap, validity window, eligible services/routes, customer segment, usage limits (per-customer, total), budget, status. Live eligibility preview.

**Screen 14.2 — Referral Program.** Referrer reward, referee reward, qualifying event (first completed ride), caps, fraud guards.

**Screen 14.3 — Redemption Analytics.** Redemptions over time, budget consumed, conversion, cost per acquisition.

### UI COMPONENTS REQUIRED
DataTable, FormBuilder (with conditional fields), MoneyInput, date-range pickers, segment selector, budget gauge, TrendChart, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| code | string | yes (coupon) | unique, alnum | — |
| type | enum | yes | flat/percent | — |
| value | int/decimal | yes | >0; percent ≤100 | — |
| cap_minor | int | conditional | ≥0 | for percent |
| validity_from/to | datetime | yes | from<to | — |
| per_customer_limit | int | yes | ≥1 | — |
| total_budget_minor | int | yes | ≥0 | hard stop |
| segment | JSON | no | valid | targeting |
| service_types/routes | array | no | exist | eligibility |

### BUSINESS LOGIC
Redemption validates: code active, not expired, segment match, service/route eligible, per-customer and total limits not exceeded, budget not exhausted (atomic decrement to prevent overspend under concurrency). Promotions are generally non-stackable (one per booking). Referral rewards post only after the qualifying event completes; fraud guards detect self-referral and device/payment-instrument collusion. Cancelled bookings post-redemption reverse the promo per policy.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Finance | Marketing(custom) |
|---|---|---|---|---|
| promotions.view | ✓ | scoped | ✓ | ✓ |
| promotions.manage | ✓ | scoped | ✗ | ✓ |
| promotions.budget.set | ✓ | ✗ | ✓ | limited |
| referrals.manage | ✓ | ✗ | ✗ | ✓ |

### API REQUIREMENTS
`GET/POST/PATCH /admin/promotions`, `POST /admin/promotions/{id}/activate|deactivate`, `GET/POST/PATCH /admin/referrals`, `GET /admin/promotions/analytics`.

### DATABASE & ENTITY RELATION
`promotions`, `coupon_redemptions (promotion_id, customer_id, booking_id, amount_minor)`, `referrals (referrer_id, referee_id, status, reward_minor)`. Redemptions decrement promotion budget atomically.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Create promo] -> rules + budget -> activate -> audit
[Apply at checkout] -> validate(active,segment,service,limits,budget) -> compute discount -> reserve budget
[Booking complete] -> finalize redemption ; [Booking cancel] -> reverse per policy
[Referral] -> referee first ride complete -> fraud check -> credit referrer+referee
```

---

## Module 15 — Payments, Wallet & Ledger

### MODULE PURPOSE
Give finance and admins full visibility and control over money movement: payment transactions, refunds, wallet ledgers (customer/driver/operator), reconciliation against gateways, and the double-entry ledger that underpins all balances.

### SUBMODULES
Transactions, Refunds, Wallet Ledgers, Reconciliation, Chargebacks/Disputes, Manual Adjustments.

### SCREEN-WISE BREAKDOWN

**Screen 15.1 — Transactions.** DataTable (txn id, booking_ref, method, amount, status, gateway ref, created_at). Filter by method, status, date, amount range. Detail shows gateway payload (sanitized), state timeline.

**Screen 15.2 — Refunds.** List of refunds with status and destination; initiate refund (gated, links to booking); approval queue for refunds above threshold (two-person rule).

**Screen 15.3 — Wallet Ledgers.** Per owner (customer/driver/operator): balance and immutable transaction list; manual adjustment (gated, reason).

**Screen 15.4 — Reconciliation.** Compare platform records vs gateway settlement files; flag mismatches; mark resolved.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer (sanitized gateway payload), MoneyInput, approval queue UI, reconciliation diff table, ConfirmDialog (typed for large refunds), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| amount_minor | int | no (txn) | ≥0 | — |
| method | enum | no | cash/card/wallet/upi/netbanking/corporate | — |
| status | enum | transitions | initiated/authorized/captured/refunded/failed/disputed | — |
| gateway_ref | string | no | — | masked sensitive |
| refund_amount_minor | int | on refund | ≤ captured | destination required |
| ledger_entry | composite | system | balanced | double-entry |

### BUSINESS LOGIC
The ledger is double-entry and append-only; corrections are compensating entries, never edits. Card data is never stored (tokenized at gateway); the panel shows only masked references. Refunds above a configurable threshold require a second approver (Finance). Reconciliation ingests gateway settlement files and flags any record whose status/amount diverges; unresolved mismatches raise alerts. Customer wallets cannot go negative; driver wallets may go negative up to a configured threshold (from cash-trip commission). All adjustments are audited with actor and reason.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Finance | Support | Others |
|---|---|---|---|---|
| payments.view | ✓ | ✓ | read | ✗ |
| payments.refund.initiate | ✓ | ✓ | request-only | ✗ |
| payments.refund.approve | ✓ | ✓ | ✗ | ✗ |
| wallet.adjust | ✓ | ✓ | ✗ | ✗ |
| payments.reconcile | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/payments`, `GET /admin/payments/{id}`, `POST /admin/payments/{id}/refund`, `POST /admin/refunds/{id}/approve`, `GET /admin/wallets/{ownerType}/{ownerId}`, `POST /admin/wallets/{ownerType}/{ownerId}/adjust`, `POST /admin/reconciliation/import`, `GET /admin/reconciliation/mismatches`.

### DATABASE & ENTITY RELATION
`payments (N) — (1) bookings`, `refunds (N) — (1) payments`, `wallets (1) — (N) wallet_transactions`, `ledger_entries` (double-entry), `reconciliation_records`. All balances derive from ledger.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Refund] -> amount<=captured -> destination -> (>threshold? second approver) -> gateway refund -> ledger postings -> notify -> audit
[Wallet adjust] -> reason -> ledger entry (balanced) -> audit
[Reconcile] -> import settlement -> match records -> mismatch? flag + alert -> resolve -> audit
```

---

## Module 16 — Payouts & Settlements

### MODULE PURPOSE
Compute and disburse what the platform owes drivers, vendors, and operators per configured cadence; produce settlement statements; handle deductions, clawbacks, and disputes; and provide finance approval gates.

### SUBMODULES
Payout Runs, Driver Payouts, Vendor Payouts, Operator Settlements, Statements, Deductions & Clawbacks.

### SCREEN-WISE BREAKDOWN

**Screen 16.1 — Payout Runs.** Create/preview a payout run for a period and payee type; preview shows gross, commission, deductions, clawbacks, taxes, net per payee. Approve to disburse.

**Screen 16.2 — Payee Payout Detail.** Per driver/vendor/operator: line items, statement (PDF/CSV), bank reference, status (pending/approved/paid/failed).

**Screen 16.3 — Deductions & Clawbacks.** Manual or auto deductions (refund clawbacks, penalties); reason and audit.

### UI COMPONENTS REQUIRED
DataTable, payout-run preview table, MoneyInput, statement export (PDF/CSV), approval gate UI, ConfirmDialog, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| period_start/end | date | run config | valid range | — |
| payee_type | enum | run config | driver/vendor/operator | — |
| gross_minor | int | system | ≥0 | sum of earnings |
| commission_minor | int | system | per config | deduction |
| deductions_minor | int | gated | ≥0 | reason |
| net_minor | int | system | gross−deductions | — |
| status | enum | transitions | pending/approved/paid/failed | — |

### BUSINESS LOGIC
Payout runs aggregate ledger earnings for the period, apply commission, deductions, clawbacks, and taxes, and produce per-payee net amounts. Runs require Finance approval before disbursement (two-person rule for large totals). Failed disbursements are retried and surfaced. Clawbacks (e.g., post-completion customer refunds) reduce the driver/operator's next payout and are recorded against the ledger. Statements are immutable once issued.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Finance | Others |
|---|---|---|---|
| payouts.view | ✓ | ✓ | read (own scope for operator-liaison) |
| payouts.run.create | ✓ | ✓ | ✗ |
| payouts.approve | ✓ | ✓ | ✗ |
| payouts.deduction.add | ✓ | ✓ | ✗ |

### API REQUIREMENTS
`POST /admin/payouts/runs` (preview), `POST /admin/payouts/runs/{id}/approve`, `GET /admin/payouts/runs/{id}`, `GET /admin/payouts/{payeeType}/{payeeId}/statements`, `POST /admin/payouts/deductions`.

### DATABASE & ENTITY RELATION
`payout_runs (1) — (N) payouts`, `payouts (N) — (1) payee (driver/vendor/operator)`, `payouts (1) — (N) payout_line_items`, `deductions`. Sourced from `ledger_entries`/`wallet_transactions`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Create run] -> period+payee type -> aggregate ledger -> apply commission/deductions/clawbacks/taxes -> preview net
   -> Finance approve (large? two-person) -> disburse -> mark paid/failed -> statements -> audit
[Clawback] -> refund post-completion -> reduce next payout -> ledger -> notify
```

---

## Module 17 — Notifications & Template Management

### MODULE PURPOSE
Configure and operate all outbound communications: event-driven templates per channel (push/SMS/email/WhatsApp/in-app) and language, broadcast campaigns, delivery tracking, and fallback rules.

### SUBMODULES
Templates, Broadcast/Campaigns, Delivery Logs, Channel Settings & Fallback, Quiet Hours.

### SCREEN-WISE BREAKDOWN

**Screen 17.1 — Templates.** List by event (BOOKING_CONFIRMED, DRIVER_ARRIVED, etc.) × channel × language; editor with variables, preview, test send. Versioned.

**Screen 17.2 — Broadcast.** Compose a one-off campaign to a segment (customers/drivers), choose channel(s), schedule, preview audience size, send. Budget/rate-limit aware.

**Screen 17.3 — Delivery Logs.** Per-message status (queued/sent/delivered/failed/read) with filters; retry failed.

**Screen 17.4 — Channel Settings.** Provider config (links to Module 24), fallback order, retry policy, quiet hours per role.

### UI COMPONENTS REQUIRED
DataTable, template editor with variable insertion + live preview, segment selector, scheduler, delivery-status filters, ConfirmDialog (broadcast send), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| event_key | string | yes | from registry | — |
| channel | enum | yes | push/sms/email/whatsapp/in_app | — |
| locale | string | yes | BCP-47 | per language |
| body | text | yes | valid variables | placeholder check |
| fallback_order | array | no | valid channels | if primary fails |
| quiet_hours | time range | no | valid | per role |

### BUSINESS LOGIC
Templates are validated for known variables (unknown placeholders block save). WhatsApp templates require provider pre-approval (lead time noted in integrations). Fallback: if the primary channel fails or is unavailable, the next channel is attempted per the configured order. Quiet hours suppress non-critical notifications for a role within a window. Broadcasts respect rate limits and segment opt-outs. Every send is logged with delivery status.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Marketing | Support |
|---|---|---|---|---|
| notifications.templates.view | ✓ | scoped | ✓ | read |
| notifications.templates.manage | ✓ | ✗ | ✓ | ✗ |
| notifications.broadcast.send | ✓ | ✗ | ✓ | ✗ |
| notifications.logs.view | ✓ | scoped | ✓ | ✓ |

### API REQUIREMENTS
`GET/POST/PATCH /admin/notifications/templates`, `POST /admin/notifications/templates/{id}/test`, `POST /admin/notifications/broadcast`, `GET /admin/notifications/logs`, `POST /admin/notifications/logs/{id}/retry`, `GET/PATCH /admin/notifications/channel-settings`.

### DATABASE & ENTITY RELATION
`notification_templates (event_key, channel, locale, body, version)`, `notifications` (delivery log), `broadcast_campaigns (1) — (N) notifications`, `channel_settings`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Edit template] -> validate variables -> preview -> save (version++) -> audit
[Event fires] -> resolve template(event,channel,locale) -> send -> log status
   -> failed? -> fallback channel -> log
[Broadcast] -> segment -> preview size -> schedule/send (rate-limited) -> per-recipient log
```

---

## Module 18 — Support & Ticketing Console

### MODULE PURPOSE
Capture, route, and resolve issues from customers, drivers, and operators with SLA tracking; give agents context (linked booking/payment) and resolution tools (refund request, goodwill credit, escalation).

### SUBMODULES
Ticket Queue, Ticket Detail, SLA & Escalation, Canned Responses, Linked Actions.

### SCREEN-WISE BREAKDOWN

**Screen 18.1 — Ticket Queue.** DataTable (id, requester, category, priority, status, assignee, SLA timer, created). Filter by category, priority, status, assignee, SLA-breach. Bulk assign.

**Screen 18.2 — Ticket Detail.** Conversation thread, linked booking/payment context, internal notes, status transitions (open→in_progress→resolved→closed), resolution code, linked actions (request refund → Module 15, goodwill credit → Module 11, escalate).

**Screen 18.3 — SLA & Escalation.** SLA policies per category/priority; auto-escalation on breach.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, CommentThread (public + internal), context panel (linked booking/payment), SLA timer, canned-response picker, ConfirmDialog, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| category | enum | yes | from set | routes queue |
| priority | enum | yes/system | low/med/high/urgent | impact-based |
| status | enum | transitions | open/in_progress/resolved/closed | — |
| assignee_id | UUID | yes | admin user | — |
| sla_due_at | datetime | system | — | by policy |
| resolution_code | enum | on resolve | from set | — |
| linked_booking_id | UUID | optional | exists | context |

### BUSINESS LOGIC
Tickets auto-route to queues by category; priority sets the SLA timer; breach triggers escalation to a supervisor and an alert. Agents can request a refund (goes to Finance approval if above threshold) or issue goodwill credit within their permission cap. Internal notes are never visible to the requester. Resolution requires a resolution code; closing a ticket may trigger a CSAT survey.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Support | Sub-Admin | Finance |
|---|---|---|---|---|
| support.tickets.view | ✓ | ✓ | scoped | linked-only |
| support.tickets.assign | ✓ | lead-only | scoped | ✗ |
| support.tickets.resolve | ✓ | ✓ | scoped | ✗ |
| support.refund.request | ✓ | ✓ | ✗ | ✗ |
| support.escalate | ✓ | ✓ | scoped | ✗ |

### API REQUIREMENTS
`GET /admin/tickets`, `GET /admin/tickets/{id}`, `POST /admin/tickets/{id}/assign`, `POST /admin/tickets/{id}/messages`, `POST /admin/tickets/{id}/resolve`, `POST /admin/tickets/{id}/escalate`, `GET/PATCH /admin/support/sla-policies`.

### DATABASE & ENTITY RELATION
`tickets (1) — (N) ticket_messages`, `tickets (N) — (0..1) bookings`, `tickets (N) — (1) admin_users (assignee)`, `sla_policies`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[New ticket] -> category route -> set SLA -> queue
[Agent picks] -> in_progress -> resolve(code) or escalate(breach/complexity)
[SLA breach] -> auto-escalate -> alert supervisor
[Linked action] -> refund request (Finance if >threshold) / goodwill (within cap) -> audit
```

---

## Module 19 — Reports & Analytics

### MODULE PURPOSE
Provide operational, financial, growth, and quality reporting with filters, drill-down, scheduled delivery, and exports — sourced from the analytics warehouse for windows beyond live operations.

### SUBMODULES
Operational Reports, Financial Reports, Growth Reports, Quality Reports, Scheduled Reports & Exports, Saved Views.

### SCREEN-WISE BREAKDOWN

**Screen 19.1 — Report Library.** Catalog of report types with descriptions; open any with a filter panel (date range, city/zone, service, class, driver/operator).

**Screen 19.2 — Report Viewer.** Table + chart, drill-down rows, export (CSV/XLSX), "schedule this report" (email cadence + recipients), save as view.

**Screen 19.3 — Dashboards.** Role-specific composed dashboards (Operations, Finance, Growth, Quality).

### UI COMPONENTS REQUIRED
DataTable (virtualized for large sets), TrendChart/bar/pie, FilterBar, export, scheduler, saved-view manager.

### FIELD-LEVEL SPECIFICATION (representative report definitions)
| Report | Key Metrics | Source |
|---|---|---|
| Trips Summary | count, completion %, cancel %, avg ETA | warehouse |
| Revenue & GBV | GBV, net revenue, commission, refunds | warehouse + ledger |
| Driver Performance | trips, acceptance, cancellation, rating | warehouse |
| Operator OTP | on-time %, load factor, cancellations | warehouse |
| Promo Performance | redemptions, budget, CPA | warehouse |
| Quality | rating distribution, complaints, SLA | warehouse |

### BUSINESS LOGIC
Reports beyond the operational window read the warehouse (hydrated via ETL/CDC), not transactional tables, to protect production performance. All reports respect the admin's scope. Scheduled reports run server-side and email the export to recipients. Financial reports reconcile to the ledger. Exports are rate-limited and audited (data-egress visibility).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Finance | Sub-Admin | Support |
|---|---|---|---|---|
| reports.operational.view | ✓ | ✓ | scoped | limited |
| reports.financial.view | ✓ | ✓ | ✗ | ✗ |
| reports.growth.view | ✓ | ✓ | scoped | ✗ |
| reports.export | ✓ | ✓ | scoped | limited |
| reports.schedule | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/reports/catalog`, `POST /admin/reports/query`, `POST /admin/reports/export`, `POST /admin/reports/schedule`, `GET /admin/reports/saved-views`.

### DATABASE & ENTITY RELATION
Reads `warehouse.*` projections; metadata in `report_schedules`, `saved_views`. Exports logged in audit.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open report] -> apply scoped filters -> query warehouse -> render table+chart
[Drill down] -> expand dimension -> sub-query
[Export] -> generate file -> audit egress -> download
[Schedule] -> cadence+recipients -> server job emails export
```

---

## Module 20 — KYC & Document Verification

### MODULE PURPOSE
Centralize document intake, verification (manual and vendor-assisted), expiry tracking, and the approval queues that gate driver/operator/aircraft/crew eligibility. A single source of truth for compliance state.

### SUBMODULES
Verification Queue, Document Detail/Review, Expiry Watchlist, Vendor KYC Integration, Re-verification.

### SCREEN-WISE BREAKDOWN

**Screen 20.1 — Verification Queue.** All pending documents across entity types (driver/operator/aircraft/pilot/vehicle) with type, submitter, age-in-queue, vendor result (if integrated). Approve/reject/request-reupload.

**Screen 20.2 — Document Detail.** Image/file preview + extracted fields (vendor) side by side; set expiry; approve/reject with reason.

**Screen 20.3 — Expiry Watchlist.** Documents expiring within N days, grouped by entity, with bulk-reminder action.

### UI COMPONENTS REQUIRED
DataTable, FileUploader/preview with field overlay, StatusBadge, ConfirmDialog, bulk reminder action, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| entity_type/id | enum/UUID | no | exists | polymorphic owner |
| doc_type | enum | no | from set per entity | — |
| file_url | string | no | scanned clean | storage key |
| status | enum | transitions | uploaded/in_review/approved/rejected/expired | — |
| expiry_date | date | on approve | future | drives watchlist |
| vendor_result | JSON | system | — | if KYC vendor used |
| reject_reason | text | on reject | required | — |

### BUSINESS LOGIC
Documents are polymorphic (attach to driver/operator/aircraft/pilot/vehicle). Approval sets/validates expiry; expiry job flips status to `expired` and triggers downstream eligibility recompute (driver force-offline, operator publish-pause, aircraft ground, pilot ground). Vendor-assisted verification pre-fills extracted fields and a confidence/result that the human reviewer confirms. All reviews are audited.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Sub-Admin | Compliance(custom) | Others |
|---|---|---|---|---|
| kyc.queue.view | ✓ | scoped | ✓ | ✗ |
| kyc.review | ✓ | scoped | ✓ | ✗ |
| kyc.expiry.manage | ✓ | scoped | ✓ | ✗ |

### API REQUIREMENTS
`GET /admin/kyc/queue`, `GET /admin/documents/{id}`, `POST /admin/documents/{id}/review`, `POST /admin/documents/{id}/request-reupload`, `GET /admin/kyc/expiry-watchlist`, `POST /admin/kyc/expiry/remind`.

### DATABASE & ENTITY RELATION
`documents (entity_type, entity_id, doc_type, status, expiry, vendor_result)` polymorphic. Linked from drivers/operators/aircraft/pilots/vehicles. Expiry job updates status and emits eligibility events.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Upload] -> virus scan -> in_review (+ vendor extract if integrated)
[Review] -> approve(set expiry) | reject(reason) | request-reupload -> audit
[Expiry job] -> past expiry -> status=expired -> recompute eligibility (force-offline/pause/ground) -> notify
```

---

## Module 21 — White-Label Branding & Configuration

### MODULE PURPOSE
Configure the brand identity and buyer-editable presentation of the deployment: logo, colors, brand name, fonts, legal documents, support/contact info, social links, and store metadata references. This is what makes one codebase look like a unique product per buyer.

### SUBMODULES
Brand Identity, Theme Tokens, Legal Documents, Contact & Social, App/Store Metadata, Readiness Checklist.

### SCREEN-WISE BREAKDOWN

**Screen 21.1 — Brand Identity.** Brand name, logo (light/dark), favicon, app icons; live preview across web and mobile mock frames.

**Screen 21.2 — Theme Tokens.** Primary/secondary/accent colors, typography scale, light/dark; contrast validation; live preview.

**Screen 21.3 — Legal Documents.** Terms, Privacy, Refund, and other policy docs (rich text or hosted URL); versioned; required before go-live.

**Screen 21.4 — Contact & Social.** Support email/phone, address, social links, help-center URL.

**Screen 21.5 — Readiness Checklist.** A gate that confirms all required brand/legal/integration items are set before publish/go-live.

### UI COMPONENTS REQUIRED
FormBuilder, image/asset uploader with size/format guard, color pickers with contrast checker, live preview frames (web + mobile), rich-text editor (legal), readiness checklist UI, ConfirmDialog (publish).

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| brand_name | string | yes | 2–60 | — |
| logo_light/dark | image | yes | format/size, transparent bg | — |
| primary/secondary/accent | color | yes | hex, contrast ≥ AA | — |
| font_family | string | yes | licensed | buyer-licensed |
| terms/privacy/refund | rich/url | yes | present before go-live | versioned |
| support_email/phone | string | yes | valid | — |
| store_metadata | JSON | partial | references | per buyer store accounts |

### BUSINESS LOGIC
Theme tokens drive both web and mobile rendering. Some fields are product-company-only (set during provisioning — bundle IDs, push certs references), others are buyer-admin-editable (support contact, social, banner imagery). Color choices are validated for accessibility contrast. Legal documents are versioned; publishing a new version prompts re-acceptance flows in the apps where required. The readiness checklist blocks go-live until all required items are complete.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Product Company (provisioner) | Others |
|---|---|---|---|
| branding.view | ✓ | ✓ | read |
| branding.identity.edit | partial | ✓ | ✗ |
| branding.theme.edit | ✓ | ✓ | ✗ |
| branding.legal.edit | ✓ | ✓ | ✗ |
| branding.publish | ✓ | ✓ | ✗ |

### API REQUIREMENTS
`GET /admin/branding`, `PATCH /admin/branding/identity`, `PATCH /admin/branding/theme`, `GET/POST /admin/branding/legal`, `GET /admin/branding/readiness`, `POST /admin/branding/publish`.

### DATABASE & ENTITY RELATION
`branding_config (key, value, scope, updated_by)`, `legal_documents (type, version, content/url, published_at)`. Theme tokens consumed by web/mobile at runtime.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Edit branding] -> upload assets / set tokens -> contrast validate -> preview -> save -> audit
[Legal] -> edit -> publish version -> trigger re-acceptance in apps
[Go-live] -> readiness checklist complete? -> publish ; else block with missing items
```

---

## Module 22 — System Settings & Feature Flags

### MODULE PURPOSE
Centralize tunable business and operational settings (commission defaults, cancellation rules, dispatch parameters, payout cadence, onboarding strictness, surge caps, quiet hours) and feature flags that turn modules/capabilities on or off per deployment.

### SUBMODULES
Business Rules, Dispatch Parameters, Onboarding Policy, Feature Flags, Localization Settings, Threshold & Alert Configuration.

### SCREEN-WISE BREAKDOWN

**Screen 22.1 — Business Rules.** Default commission, cancellation tiers (road/air), refund destination default, payout cadence, surge cap.

**Screen 22.2 — Dispatch Parameters.** Ping TTL, radius steps, max radius, ranking weights (distance/rating/acceptance), scheduled-ride lead time.

**Screen 22.3 — Onboarding Policy.** Driver grace-period on/off + deadline; operator site-visit gating on/off.

**Screen 22.4 — Feature Flags.** Toggle modules/capabilities (e.g., masked calling, loyalty, WhatsApp, air services, specific service sub-types) per deployment.

**Screen 22.5 — Localization.** Currency, language(s), timezone, RTL.

**Screen 22.6 — Thresholds & Alerts.** Refund approval threshold, two-person-rule amount, SLA timers, alert recipients.

### UI COMPONENTS REQUIRED
FormBuilder, toggle switches (flags), numeric/threshold inputs, ConfirmDialog (changes that affect money or eligibility), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Setting | Type | Validation | Notes |
|---|---|---|---|
| default_commission | decimal | 0–100 | per service overridable |
| cancellation_tiers | JSON | valid tiers | road/air |
| refund_destination_default | enum | wallet/original | — |
| payout_cadence | enum | daily/weekly/biweekly/monthly | — |
| surge_cap | decimal | ≥1, ≤ regulatory max | — |
| ping_ttl_seconds | int | 5–60 | dispatch |
| radius_steps_m | array | ascending | dispatch |
| grace_period_enabled | bool | — | onboarding |
| feature_flags | JSON | known keys | per deployment |
| currency/locale/timezone | string | valid | localization |

### BUSINESS LOGIC
Settings are read by the relevant engines at runtime (cached with short TTL or pushed on change). Changing money-affecting settings (commission, thresholds) requires confirmation and is audited; some changes are effective-dated. Feature flags gate both backend capability and frontend visibility. Localization changes affect formatting and available languages. Threshold settings drive approval gates in payments/payouts and alert generation on the dashboard.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Finance | Others |
|---|---|---|---|
| settings.view | ✓ | finance-related | read |
| settings.business.edit | ✓ | finance-related | ✗ |
| settings.dispatch.edit | ✓ | ✗ | ✗ |
| settings.flags.edit | ✓ | ✗ | ✗ |
| settings.localization.edit | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/settings`, `PATCH /admin/settings/business`, `PATCH /admin/settings/dispatch`, `PATCH /admin/settings/onboarding`, `GET/PATCH /admin/settings/feature-flags`, `PATCH /admin/settings/localization`, `PATCH /admin/settings/thresholds`.

### DATABASE & ENTITY RELATION
`system_settings (key, value, scope, effective_from, updated_by)`, `feature_flags (key, enabled, scope)`. Consumed across all modules.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Edit setting] -> validate -> (money-affecting? confirm + maybe effective-dated) -> save -> push/cache invalidate -> audit
[Toggle flag] -> update -> backend capability + frontend visibility change -> audit
```

---

## Module 23 — Audit Log & Compliance

### MODULE PURPOSE
Maintain a tamper-evident, queryable record of every consequential action across the admin panel and platform, plus compliance tooling (data export/delete oversight, retention). This is the system's accountability backbone.

### SUBMODULES
Audit Log Explorer, Sensitive-Action Log, Data Privacy Requests, Retention Policy.

### SCREEN-WISE BREAKDOWN

**Screen 23.1 — Audit Explorer.** DataTable (actor, role, action, entity, entity_id, timestamp, IP) with powerful filters (actor, module, action, date, entity). Row detail shows before/after diff for sensitive changes.

**Screen 23.2 — Privacy Requests.** Customer data export/delete requests with status and SLA; oversight and completion.

**Screen 23.3 — Retention Policy.** Configured retention windows per data category; legal holds.

### UI COMPONENTS REQUIRED
DataTable (virtualized), FilterBar, diff viewer (before/after JSON), StatusBadge, export (gated + itself audited).

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| actor_id/role | UUID/enum | who |
| action | string | module.submodule.action |
| entity/entity_id | string/UUID | what |
| before/after | JSON | sensitive changes |
| ip | string | source |
| created_at | datetime | when |

### BUSINESS LOGIC
Audit records are append-only and protected from edit/delete (write-once storage or DB-level constraints); attempted tampering is itself logged. Retention default 7 years for audit/financial; operational logs shorter. PII in audit payloads is redacted per policy. Privacy requests (export/delete) are tracked to completion with SLA; deletion anonymizes while honoring legal-hold and financial-retention rules. Even exporting the audit log is an audited action.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | Compliance(custom) | Others |
|---|---|---|---|
| audit.view | ✓ | ✓ | ✗ |
| audit.export | ✓ | ✓ | ✗ |
| privacy.requests.manage | ✓ | ✓ | ✗ |
| retention.manage | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /admin/audit-logs`, `GET /admin/audit-logs/{id}`, `POST /admin/audit-logs/export`, `GET /admin/privacy/requests`, `POST /admin/privacy/requests/{id}/complete`, `GET/PATCH /admin/retention-policy`.

### DATABASE & ENTITY RELATION
`audit_logs` (append-only), `privacy_requests`, `retention_policies`. Audit references actors (`admin_users`) and arbitrary entities by type+id.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Any mutating action] -> write audit (actor, action, entity, before/after, ip, ts)
[Explore] -> filter -> view diff
[Privacy delete request] -> validate legal hold/retention -> anonymize PII -> retain financial -> complete -> audit
[Tamper attempt] -> blocked -> logged as security event
```

---

## Module 24 — Integrations & API Keys

### MODULE PURPOSE
Manage all third-party provider credentials and platform API keys/webhooks in one secure place: payment gateways, maps, SMS/email/WhatsApp, KYC, telephony, storage, analytics — plus outbound webhooks and developer API keys for the buyer's own integrations.

### SUBMODULES
Provider Connections, API Keys, Webhooks, Health & Status, Secrets Rotation.

### SCREEN-WISE BREAKDOWN

**Screen 24.1 — Provider Connections.** Cards per category (payments, maps, SMS, email, WhatsApp, KYC, telephony, storage, analytics) with connection status, masked credentials, test-connection action, and provider selection (per the swappable-adapter model).

**Screen 24.2 — API Keys.** Buyer/developer keys with scopes, created/last-used, rotate/revoke.

**Screen 24.3 — Webhooks.** Outbound webhook endpoints with event subscriptions, signing secret, delivery logs, retry.

**Screen 24.4 — Health & Status.** Live status of each integration (last success, error rate); alerts on degradation.

### UI COMPONENTS REQUIRED
Provider cards with status, masked-credential inputs, test-connection button, key/secret reveal-once + copy, webhook event selector, delivery-log table, ConfirmDialog (rotate/revoke), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| provider_category | enum | no | from set | payments/maps/etc |
| provider_name | enum | yes | from supported | swappable adapter |
| credentials | secret | yes | provider-validated | stored in vault, masked |
| status | enum | system | connected/error/disconnected | health |
| api_key | secret | system | scoped | reveal-once |
| webhook_url | string | yes | https | signed |
| events | array | yes | known events | subscription |

### BUSINESS LOGIC
Credentials are stored in a secrets vault, never in plain config or returned in full by the API (masked, reveal-once on creation). Switching a provider within a category activates the corresponding adapter (no code change beyond adapter availability). Test-connection validates credentials before save. Webhooks are signed; deliveries are retried with backoff and logged. Health monitoring raises dashboard alerts on error-rate thresholds. Rotating a key/secret invalidates the old one after an optional grace window. All changes are audited; secret values are never written to the audit payload.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Super Admin | DevOps(custom) | Others |
|---|---|---|---|
| integrations.view | ✓ | ✓ | ✗ |
| integrations.credentials.manage | ✓ | ✓ | ✗ |
| integrations.apikeys.manage | ✓ | ✓ | ✗ |
| integrations.webhooks.manage | ✓ | ✓ | ✗ |

### API REQUIREMENTS
`GET /admin/integrations`, `PATCH /admin/integrations/{category}` (set provider + creds), `POST /admin/integrations/{category}/test`, `GET/POST /admin/api-keys`, `POST /admin/api-keys/{id}/rotate`, `DELETE /admin/api-keys/{id}`, `GET/POST /admin/webhooks`, `GET /admin/webhooks/{id}/deliveries`, `GET /admin/integrations/health`.

### DATABASE & ENTITY RELATION
`integration_connections (category, provider, status, secret_ref)`, `api_keys (key_hash, scopes, last_used)`, `webhooks (1) — (N) webhook_deliveries`. Secrets live in the vault, referenced by `secret_ref`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Connect provider] -> enter creds -> test-connection -> ok? store in vault (masked) -> activate adapter -> audit
[Rotate key] -> generate new -> grace window -> revoke old -> audit (no secret in log)
[Webhook] -> subscribe events -> sign deliveries -> retry on fail -> log
[Health] -> error rate > threshold -> dashboard alert
```

---

# Appendix A — Master Permission Registry

Permissions follow `module.submodule.action`. Scope (global/zone/city/service) may further constrain any permission. This registry is the canonical source consumed by Module 3.

| Domain | Permission Keys (representative) |
|---|---|
| Auth | auth.profile.view, auth.profile.edit, auth.security.manage, auth.admins.view, auth.admins.create, auth.admins.suspend, auth.admins.reset_2fa, auth.admins.force_logout |
| Dashboard | dashboard.view, dashboard.revenue.view, dashboard.livemap.view, dashboard.quickactions.use |
| RBAC | rbac.roles.view, rbac.roles.create, rbac.roles.edit, rbac.roles.delete, rbac.assign, rbac.permissions.view |
| Bookings (Road) | bookings.road.view, bookings.road.create_assisted, bookings.road.reassign, bookings.road.force_assign, bookings.road.cancel, bookings.road.adjust_fare, bookings.road.refund, bookings.road.dispute.resolve |
| Bookings (Air) | bookings.air.view, bookings.air.assign_operator, bookings.air.quote.push, bookings.air.cancel, bookings.air.reschedule, bookings.air.refund, bookings.air.manifest.edit |
| Dispatch | dispatch.console.view, dispatch.manual_assign, dispatch.surge.override, dispatch.exception.resolve |
| Drivers | drivers.view, drivers.onboard.approve, drivers.onboard.reject, drivers.suspend, drivers.reactivate, drivers.force_offline, drivers.wallet.adjust, drivers.documents.review |
| Vehicles | vehicles.view, vehicles.create, vehicles.edit, vehicles.documents.review, vehicles.suspend, vendors.manage |
| Operators | operators.view, operators.onboard.approve, operators.onboard.reject, operators.pause, operators.reactivate, operators.commission.config, operators.payout.config |
| Aircraft/Crew | aircraft.view, aircraft.review, aircraft.ground, aircraft.maintenance, crew.view, crew.review, crew.ground |
| Customers | customers.view, customers.suspend, customers.wallet.adjust, customers.goodwill.credit, customers.flag, customers.privacy.export, customers.privacy.delete |
| Catalog | catalog.view, catalog.classes.manage, catalog.zones.manage, catalog.routes.manage |
| Pricing | pricing.view, pricing.road.manage, pricing.air.manage, pricing.surge.manage, pricing.taxes.manage, pricing.publish |
| Promotions | promotions.view, promotions.manage, promotions.budget.set, referrals.manage |
| Payments | payments.view, payments.refund.initiate, payments.refund.approve, wallet.adjust, payments.reconcile |
| Payouts | payouts.view, payouts.run.create, payouts.approve, payouts.deduction.add |
| Notifications | notifications.templates.view, notifications.templates.manage, notifications.broadcast.send, notifications.logs.view |
| Support | support.tickets.view, support.tickets.assign, support.tickets.resolve, support.refund.request, support.escalate |
| Reports | reports.operational.view, reports.financial.view, reports.growth.view, reports.export, reports.schedule |
| KYC | kyc.queue.view, kyc.review, kyc.expiry.manage |
| Branding | branding.view, branding.identity.edit, branding.theme.edit, branding.legal.edit, branding.publish |
| Settings | settings.view, settings.business.edit, settings.dispatch.edit, settings.flags.edit, settings.localization.edit |
| Audit | audit.view, audit.export, privacy.requests.manage, retention.manage |
| Integrations | integrations.view, integrations.credentials.manage, integrations.apikeys.manage, integrations.webhooks.manage |

---

# Appendix B — Admin Entity-Relationship Overview

The admin panel reads and writes the platform's core entities (defined in the parent data dictionary) and adds admin-only entities. The principal relationships:

`admin_users (N) → (1) roles`, `roles (1) → (N) role_permissions`, `roles (1) → (N) role_versions`. `bookings (N) → (1) customers`, `(N) → (0..1) drivers`, `(N) → (0..1) operators`, `(1) → (N) fare_breakups`, `(1) → (N) payments`, `(1) → (N) dispatch_events`, `(1) → (0..1) disputes`. `drivers (1) → (N) documents`, `(1) → (0..1) vehicles (active)`, `(1) → (1) wallets`, `(N) → (0..1) vendors`. `operators (1) → (N) aircraft`, `(1) → (N) pilots`, `(1) → (N) routes`, `(1) → (N) documents`, `(1) → (0..1) commission_config`. `aircraft (N) → (1) aircraft_types`, `(1) → (N) maintenance_windows`. `customers (1) → (1) wallets`, `(1) → (N) payment_methods`, `(1) → (N) tickets`, `(1) → (N) risk_flags`, `(1) → (N) privacy_requests`. `pricing_rules`, `tax_rules`, `surge_configs` referenced by bookings via snapshot. `promotions (1) → (N) coupon_redemptions`. `wallets (1) → (N) wallet_transactions`; `ledger_entries` underpin all balances. `payout_runs (1) → (N) payouts (1) → (N) payout_line_items`. `documents` is polymorphic across driver/operator/aircraft/pilot/vehicle. `audit_logs` reference actor + arbitrary entity. `integration_connections`, `api_keys`, `webhooks (1) → (N) webhook_deliveries`, `system_settings`, `feature_flags`, `branding_config`, `legal_documents`, `notification_templates`, `notifications`, `admin_alerts`, `sla_policies`, `report_schedules`, `saved_views`.

---

# Appendix C — Shared Status & State Reference

These statuses drive the StatusBadge component and the state-machine guards used across modules.

**Admin User:** invited → active → suspended → (reactivate → active).
**Booking (Road):** Requested → Accepted → Arrived → InProgress → Completed; cancel branches CancelledByCustomer/Driver/System; Disputed → Refunded.
**Booking (Air):** Requested → QuoteShared(charter/VIP) → Confirmed → ManifestLocked → Boarded → Departed → Arrived → Completed; cancel branches CancelledByCustomer/Operator/Admin; Rescheduled (links new booking).
**Payment:** Initiated → Authorized → Captured → Refunded(partial/full) → Settled; Failed/Cancelled/Disputed/ChargedBack.
**Payout:** pending → approved → paid; failed (retry).
**Driver:** Pending → Approved → Active → Suspended → Deactivated; orthogonal online/offline + on_trip/idle.
**Operator:** Pending → Approved → Active → Paused → Deactivated.
**Aircraft:** submitted → approved → available → grounded/maintenance.
**Pilot/Crew:** submitted → approved → active → grounded.
**Document:** uploaded → in_review → approved → expired/rejected.
**Ticket:** open → in_progress → resolved → closed.
**Promotion:** draft → active → paused → expired.
**Privacy Request:** received → in_progress → completed.

---

**End of Admin Panel Product Document.**
