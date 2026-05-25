# Universal Transportation Booking Platform
## Operator Web Panel — Complete Enterprise Product Document

| Field | Value |
|---|---|
| Document Type | Operator Web Panel Architecture & Implementation Specification |
| Parent Product | Universal Transportation Booking Platform (UTBP) — White-Label |
| Surface | Operator Web Panel (air operators: helicopter, charter, shuttle, VIP) + lightweight Pilot/Crew access |
| Version | 1.0 |
| Status | Implementation-Ready |
| Audience | Product Architects, Backend Engineers, Frontend Engineers, UI/UX Designers, DBAs, QA, DevOps |
| Locked Stack | React + TypeScript (frontend), Python + FastAPI (backend), PostgreSQL + PostGIS, Redis, Socket.IO, Google Maps Platform, Razorpay (payment adapter), per-buyer isolated deployment |

---

## Positioning: Operator Panel vs Admin Panel

The Operator Web Panel is the **air partner's** workspace. Where the Admin Panel belongs to the buyer (the white-label owner) and governs the whole platform, the Operator Panel belongs to an **operator organization** — a company that owns/manages aircraft and crew and fulfills air bookings. The relationship is strictly scoped: an operator sees **only their own** aircraft, crew, schedules, bookings, manifests, payouts, and reports. They never see other operators, road-side data, platform configuration, or other operators' financials.

Per the locked decisions, **operator approval and operational policy are the buyer's responsibility** (handled in Admin Module 9), not the operator's. The Operator Panel therefore exposes self-service onboarding *submission*, day-to-day fleet/crew/schedule/booking operations, and payout visibility — but final approval, commission configuration, and pausing are admin-controlled. The panel must clearly reflect states the admin controls (e.g., "Pending Approval," "Publishing Paused by Admin") without letting the operator override them.

A **lightweight Pilot/Crew access** is included as a sub-surface (mobile-web responsive views) rather than a separate app in v1: assigned flights, status updates, and notifications only.

---

## How To Read This Document

Each module follows the requested structure exactly: **Module Name → Module Purpose → Submodules → Screen-Wise Breakdown → UI Components Required → Field-Level Specification → Business Logic → RBAC → API Requirements → Database & Entity Relation → Workflow Diagram Logic (text)**.

Field specs use: **Field, Type, Required, Validation, Notes**. Operator API endpoints are namespaced under `/api/v1/operator/...` and are **implicitly scoped to the authenticated operator** by a server-side guard that injects `operator_id` from the JWT — an operator can never pass another operator's id. Money is integer minor units with explicit currency. Timestamps are ISO 8601 UTC. The shared conventions in Section 0 apply to every module.

---

## Table of Contents

- [Section 0 — Global Conventions & Foundation](#section-0--global-conventions--foundation)
- [Module 1 — Operator Authentication & Identity](#module-1--operator-authentication--identity)
- [Module 2 — Operator Onboarding & Company Profile](#module-2--operator-onboarding--company-profile)
- [Module 3 — Operator Dashboard](#module-3--operator-dashboard)
- [Module 4 — Operator Team & Role Management (Sub-Users)](#module-4--operator-team--role-management-sub-users)
- [Module 5 — Aircraft / Fleet Management](#module-5--aircraft--fleet-management)
- [Module 6 — Crew Management (Pilots & Cabin Crew)](#module-6--crew-management-pilots--cabin-crew)
- [Module 7 — Routes & Schedule / Inventory Management](#module-7--routes--schedule--inventory-management)
- [Module 8 — Operator Pricing & Quotes](#module-8--operator-pricing--quotes)
- [Module 9 — Booking Requests & Queue](#module-9--booking-requests--queue)
- [Module 10 — Flight Assignment & Dispatch](#module-10--flight-assignment--dispatch)
- [Module 11 — Passenger Manifest Management](#module-11--passenger-manifest-management)
- [Module 12 — Flight Operations & Day-of-Flight Control](#module-12--flight-operations--day-of-flight-control)
- [Module 13 — Cancellation & Rescheduling](#module-13--cancellation--rescheduling)
- [Module 14 — Payouts & Settlements (Operator View)](#module-14--payouts--settlements-operator-view)
- [Module 15 — Reports & Analytics (Operator)](#module-15--reports--analytics-operator)
- [Module 16 — Documents & Compliance](#module-16--documents--compliance)
- [Module 17 — Notifications & Communication](#module-17--notifications--communication)
- [Module 18 — Operator Settings & Profile Configuration](#module-18--operator-settings--profile-configuration)
- [Module 19 — Pilot / Crew Companion (Lightweight Sub-Surface)](#module-19--pilot--crew-companion-lightweight-sub-surface)
- [Appendix A — Operator Permission Registry](#appendix-a--operator-permission-registry)
- [Appendix B — Operator Entity-Relationship Overview](#appendix-b--operator-entity-relationship-overview)
- [Appendix C — Operator-Side Status & State Reference](#appendix-c--operator-side-status--state-reference)

---

## Section 0 — Global Conventions & Foundation

### 0.1 Layout Shell
A three-region shell: left navigation grouped by domain (Operations, Fleet & Crew, Schedule & Pricing, Finance, Compliance, Settings); a top bar with operator/brand badge, global search, notification bell, quick-create, and profile menu showing the operator org name and the signed-in user's role; a main content region with a right contextual drawer for detail views. A persistent banner displays admin-controlled state when relevant ("Pending Approval," "Publishing Paused by Admin," "Documents Expiring").

### 0.2 Shared UI Components
DataTable (server pagination, sort, column controls, saved views, export, bulk actions), FilterBar (typed filters with URL sync and presets), DetailDrawer, FormBuilder (inline validation, conditional fields), StatCard, TrendChart, Calendar/Scheduler (for fleet/crew/flight scheduling with conflict highlighting), Timeline, StatusBadge (driven by Appendix C), Map (route preview, helipad markers), FileUploader (type/size guard, scan status, preview), ConfirmDialog (typed confirmation for destructive/financial actions), CommentThread, AuditTrailPanel, MoneyInput (minor-unit, currency-locked), WeightGauge (manifest vs MTOW), PermissionGate.

### 0.3 Shared API Behavior
All endpoints under `/api/v1/operator`, require Bearer JWT, and are auto-scoped to the operator via server guard. List endpoints accept `?page,?pageSize(<=200),?sort,?q`, typed filters; return `{data,page,pageSize,total,aggregations?}`. Mutating endpoints accept `Idempotency-Key`, write an audit record, and reject any attempt to reference an entity outside the operator's scope with `403`. Error envelope `{code,message,details,traceId}`.

### 0.4 Shared Scoping & RBAC Primitives
Two layers of access control apply. **Org-scope** (enforced by the platform): every query is filtered to `operator_id` from the JWT. **Intra-org RBAC** (managed by the operator in Module 4): the operator defines sub-user roles (Operator Admin, Ops Manager, Dispatcher, Finance, Crew-Coordinator, Viewer) with permission strings `operator.<module>.<action>`. The admin-controlled platform states (approval, pause, commission) are read-only to all operator roles.

### 0.5 Shared Validation
Emails RFC-5322; phones E.164; money ≥ 0; dates future-only where applicable; aircraft registration marks unique per platform; manifest passenger+baggage weight ≤ aircraft MTOW (hard block); schedule entries cannot overlap for the same aircraft or assigned pilot (exclusion constraint); file uploads MIME/size guarded and virus-scanned; certifications must have a future expiry to be valid.

### 0.6 Shared Workflow Conventions
Each entity flows through a single state machine; the UI offers only legal, permitted transitions. Admin-gated transitions (approve operator, configure commission, pause publishing) are surfaced as read-only status, never as operator actions. Every transition can require a reason, writes an audit record, and may emit a notification.

---

## Module 1 — Operator Authentication & Identity

### MODULE PURPOSE
Authenticate operator organization users, establish secure sessions, enforce 2FA for privileged operator roles, and let users manage their own profile and security. Entry gate to the entire operator panel.

### SUBMODULES
Login & Session, Two-Factor Authentication, Password & Recovery, User Profile, Active Sessions.

### SCREEN-WISE BREAKDOWN
**1.1 Login.** Email + password, "remember device," forgot-password link, brand theme from white-label config. Routes to 2FA challenge if the role requires it.
**1.2 2FA Challenge.** TOTP (6 digit) with email fallback, trust-device option, resend with cooldown.
**1.3 Forgot/Reset Password.** Email → tokenized link → new password with strength meter.
**1.4 User Profile.** Name, email (verified badge), phone, avatar, language, timezone, notification preferences; read-only role + operator org name.
**1.5 Security & Sessions.** Change password, manage 2FA, view/revoke active sessions, login history (time, IP, device, result).

### UI COMPONENTS REQUIRED
FormBuilder, password strength meter, OTP input, ConfirmDialog, DataTable (sessions/login history), StatusBadge, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| id | UUID | system | — | PK |
| operator_id | UUID | system | exists | scope anchor |
| name | string | yes | 2–80 | — |
| email | string | yes | RFC-5322, unique | login id |
| phone | string | no | E.164 | 2FA fallback |
| password_hash | string | system | Argon2id | never returned |
| operator_role_id | UUID | yes | exists | intra-org role |
| status | enum | system | invited/active/suspended | — |
| twofa_enabled | bool | system | — | enforced for Operator Admin/Finance |
| last_login_at | datetime | system | — | — |

### BUSINESS LOGIC
Argon2id hashing; access token 15 min, rotating refresh (default 7 days), revoked on logout/password change. Lockout after N failed attempts. Operator Admin and Finance roles must use 2FA. The first user of an operator org is created during onboarding (Module 2) and becomes Operator Admin; additional users are invited (Module 4). If the platform admin suspends the operator org, all operator users are blocked at login with a clear message; existing sessions revoked.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Finance | Dispatcher | Crew-Coord | Viewer |
|---|---|---|---|---|---|---|
| operator.auth.profile (self) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| operator.auth.security (self) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### API REQUIREMENTS
`POST /operator/auth/login`, `POST /operator/auth/2fa/verify`, `POST /operator/auth/refresh`, `POST /operator/auth/logout`, `POST /operator/auth/password/forgot`, `POST /operator/auth/password/reset`, `POST /operator/auth/2fa/enroll`, `GET /operator/me`, `PATCH /operator/me`, `GET /operator/me/sessions`, `DELETE /operator/me/sessions/{id}`.

### DATABASE & ENTITY RELATION
`operator_users (operator_id → operators.id, operator_role_id → operator_roles.id)`, `operator_sessions`, `operator_login_attempts`. One operator has many users; each user has one role.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Login] -> validate creds
   FAIL -> increment attempts -> (>=N? lock)
   PASS -> operator org suspended? YES -> block(message)
           NO -> role needs 2FA? YES -> [2FA] -> verify -> tokens -> Dashboard
                                  NO  -> tokens -> Dashboard
```

---

## Module 2 — Operator Onboarding & Company Profile

### MODULE PURPOSE
Let a new operator submit their company profile, certifications, insurance, and contact details for the buyer-admin's approval, and maintain that profile thereafter. Approval itself is admin-controlled (Admin Module 9); this module is submission + maintenance.

### SUBMODULES
Company Registration, Certifications & Insurance, Operating Bases, Bank/Payout Details, Approval Status, Profile Maintenance.

### SCREEN-WISE BREAKDOWN
**2.1 Onboarding Wizard.** Multi-step: (1) Company details, (2) Certifications & insurance upload, (3) Operating bases/helipads, (4) Payout/bank details, (5) Review & submit. Progress indicator; save-as-draft.
**2.2 Approval Status.** Read-only banner + page showing current state (Draft → Submitted → In Review → Approved/Rejected) with admin reason on rejection and a re-submit action.
**2.3 Company Profile (post-approval).** Editable company info (some fields lock after approval and require admin re-review when changed — e.g., legal registration).

### UI COMPONENTS REQUIRED
Multi-step wizard, FormBuilder, FileUploader/preview, StatusBadge, ConfirmDialog (submit), Map (operating bases), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| legal_name | string | yes | 2–120, unique | locks post-approval |
| trade_name | string | no | — | display |
| company_registration_no | string | yes | region format | locked post-approval |
| certifications[] | doc | yes | future expiry | gates publishing |
| insurance_doc | doc | yes | future expiry | gates publishing |
| operating_bases[] | geo+name | yes | valid point | helipads/airports |
| contact_email/phone | string | yes | RFC-5322 / E.164 | — |
| payout_account_ref | string | yes | masked, validated | finance |
| status | enum | system | draft/submitted/in_review/approved/rejected | admin-controlled |

### BUSINESS LOGIC
Operator cannot publish inventory or accept bookings until status = approved (admin action). Editing locked fields after approval flips the org to a "re-review" sub-state and notifies admin. Certifications/insurance with past expiry block submission and, post-approval, auto-pause publishing (admin sees this in Module 9). Payout details are write-by-operator, masked on read, and used by platform payout runs.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Finance | Others |
|---|---|---|---|---|
| operator.profile.view | ✓ | ✓ | ✓ | view |
| operator.profile.edit | ✓ | ✗ | ✗ | ✗ |
| operator.onboarding.submit | ✓ | ✗ | ✗ | ✗ |
| operator.payout_details.edit | ✓ | ✗ | ✓ | ✗ |

### API REQUIREMENTS
`GET /operator/profile`, `PATCH /operator/profile`, `POST /operator/onboarding/submit`, `GET /operator/onboarding/status`, `POST /operator/profile/certifications`, `POST /operator/profile/insurance`, `PATCH /operator/payout-details`.

### DATABASE & ENTITY RELATION
`operators (1) — (N) documents` (certifications, insurance), `operators (1) — (N) operating_bases`, `operators (1) — (1) operator_payout_details`. Status mirrored on `operators.status`; admin owns transitions.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Wizard] draft -> fill steps -> validate certs/insurance (future expiry) -> submit -> status=submitted
[Admin reviews] -> approved -> can publish ; rejected(reason) -> operator re-submits
[Edit locked field post-approval] -> status=re_review -> notify admin
[Cert/insurance expiry] -> auto-pause publishing -> notify operator+admin
```

---

## Module 3 — Operator Dashboard

### MODULE PURPOSE
Give the operator a real-time, operator-scoped picture: upcoming flights, pending booking requests needing action, today's operations, fleet/crew availability, compliance alerts, and revenue trends.

### SUBMODULES
KPI Summary, Upcoming Flights, Action Queue, Fleet & Crew Availability, Compliance Alerts, Revenue Trends.

### SCREEN-WISE BREAKDOWN
**3.1 Dashboard Home.** StatCards (Pending Requests, Today's Flights, In-Air Now, Available Aircraft, On-Duty Crew, Load Factor, Period Revenue, On-Time %). Upcoming-flights list (next 24–72h). Action queue (requests awaiting accept/reject within TTL, manifests pending lock, documents expiring). Availability strip (aircraft and crew status). Revenue/operations trends (7/30/90d). Compliance alert banner.

### UI COMPONENTS REQUIRED
StatCard grid, list widgets (upcoming flights, action queue), TrendChart, availability badges, alert banner, DetailDrawer.

### FIELD-LEVEL SPECIFICATION (KPI definitions)
| KPI | Definition | Refresh |
|---|---|---|
| Pending Requests | count(bookings to this operator in requested/quote_shared) | real-time |
| Today's Flights | count(flights where etd in today, op tz) | 30s |
| In-Air Now | count(flights where status=departed) | real-time |
| Available Aircraft | count(aircraft where status=available, not in maintenance window now) | 60s |
| Load Factor | seats sold / seats available (period) | 60s |
| On-Time % | departed within tolerance / total departed | 60s |

### BUSINESS LOGIC
All KPIs scoped to the operator. Computed from read projections/cache, not live transactional scans. Action queue items carry TTL countdowns (booking requests) that, if missed, fall through per platform dispatch rules (the booking may route to another operator or to admin). Alerts derive from document expiry, paused-publishing state, and SLA timers.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Finance | Dispatcher | Crew-Coord | Viewer |
|---|---|---|---|---|---|---|
| operator.dashboard.view | ✓ | ✓ | KPIs+finance | ops view | crew view | read |
| operator.dashboard.revenue | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/dashboard/kpis?window=`, `GET /operator/dashboard/upcoming-flights`, `GET /operator/dashboard/action-queue`, `GET /operator/dashboard/trends?metric=&window=`, WebSocket `operator.live` (pending requests, in-air).

### DATABASE & ENTITY RELATION
Reads projections `mv_operator_kpis`, plus `bookings`, `flights`, `aircraft`, `pilots`, `documents` (all operator-scoped). Alerts in `operator_alerts`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open dashboard] -> load scoped KPIs -> subscribe operator.live
   -> render upcoming flights + action queue (with TTL) + availability + alerts
[Action queue item click] -> jump to relevant module (request -> Module 9)
```

---

## Module 4 — Operator Team & Role Management (Sub-Users)

### MODULE PURPOSE
Let the Operator Admin create and manage users within their organization and assign intra-org roles, so a real operator company can split duties (ops, dispatch, finance, crew coordination) safely. This is RBAC *inside* one operator org, distinct from platform RBAC.

### SUBMODULES
Sub-User Directory, Invite User, Operator Roles, Role Assignment.

### SCREEN-WISE BREAKDOWN
**4.1 User Directory.** DataTable (name, email, role, status, last login, 2FA). Actions: invite, edit, suspend/reactivate, force-logout, reset 2FA.
**4.2 Invite User.** Email, name, role, optional scope (e.g., base/location). Sends tokenized invite.
**4.3 Operator Roles.** Predefined roles (Operator Admin, Ops Manager, Dispatcher, Finance, Crew-Coordinator, Viewer) plus optional custom roles; permission matrix limited to operator-scope permissions only.
**4.4 Assign Role.** Change a user's role; cannot remove the last Operator Admin.

### UI COMPONENTS REQUIRED
DataTable, FormBuilder (invite), permission matrix (operator-scope only), ConfirmDialog, StatusBadge, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| operator_role.name | string | yes | unique within org | — |
| operator_role.permissions[] | string[] | yes | from operator registry | Appendix A |
| user.operator_role_id | UUID | yes | exists in org | — |
| user.status | enum | system | invited/active/suspended | — |

### BUSINESS LOGIC
Operator roles can only contain operator-scope permissions (the matrix never shows platform/admin permissions). At least one active Operator Admin must always exist (system blocks removing the last). Inviting/suspending mirrors Module 1 session rules. Custom roles are additive permission sets. Role changes take effect on next request (server re-resolves).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Others |
|---|---|---|
| operator.team.view | ✓ | Ops Manager read-only (optional) |
| operator.team.invite | ✓ | ✗ |
| operator.team.suspend | ✓ | ✗ |
| operator.roles.manage | ✓ | ✗ |
| operator.roles.assign | ✓ | ✗ |

### API REQUIREMENTS
`GET /operator/users`, `POST /operator/users` (invite), `PATCH /operator/users/{id}`, `POST /operator/users/{id}/suspend`, `POST /operator/users/{id}/force-logout`, `GET /operator/roles`, `POST /operator/roles`, `PATCH /operator/roles/{id}`, `POST /operator/users/{id}/assign-role`.

### DATABASE & ENTITY RELATION
`operator_users (N) — (1) operator_roles`, `operator_roles (1) — (N) operator_role_permissions`. All rows carry `operator_id`. `operator_permissions` is a seed registry (Appendix A).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Invite user] -> email+role -> create(status=invited) -> token email -> set pw + 2FA -> active
[Create role] -> select operator-scope perms -> save -> audit
[Assign role] -> last Operator Admin? block-if-removing -> else apply -> re-resolve
```

---

## Module 5 — Aircraft / Fleet Management

### MODULE PURPOSE
Manage the operator's aircraft inventory: registration, type, capacity, weight/range specs, airworthiness documents, maintenance windows, photos, and operational status. Aircraft compliance and availability here feed scheduling and booking eligibility.

### SUBMODULES
Aircraft Directory, Aircraft Detail, Airworthiness & Documents, Maintenance Scheduling, Photos & Specs.

### SCREEN-WISE BREAKDOWN
**5.1 Aircraft Directory.** DataTable (registration mark, type, seats, MTOW, range, status, airworthiness validity, next maintenance). Filter by type, status, base, expiring-docs. Add aircraft.
**5.2 Aircraft Detail.** Tabs: Specs, Documents (airworthiness + others, status/expiry), Maintenance (windows calendar), Photos, Assigned Routes/Schedules, History. Actions: submit-for-review, set base, schedule maintenance, mark unavailable.
**5.3 Maintenance Scheduling.** Calendar to add maintenance windows; conflict detection against booked flights (warn/block).

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer with tabs, FileUploader/preview, Calendar/Scheduler with conflict highlighting, image gallery uploader, StatusBadge, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| registration_mark | string | yes | unique (platform), region format | — |
| aircraft_type_id | UUID | yes | exists | FK to catalog |
| seat_capacity | int | yes | ≥1 | manifest cap |
| mtow_kg | int | yes | >0 | weight check |
| range_nm | int | yes | >0 | route feasibility |
| home_base_id | UUID | yes | operating base | — |
| airworthiness_doc | doc | yes | future expiry | grounds if expired |
| maintenance_windows[] | range | no | non-overlapping with flights | blocks scheduling |
| status | enum | system+ops | submitted/approved/available/grounded/maintenance | admin approves first review |
| photos[] | image | no | format/size | — |

### BUSINESS LOGIC
A newly added aircraft starts `submitted`; the buyer-admin reviews airworthiness before it becomes usable (admin can approve, or operator-self-approval can be enabled by buyer policy — default admin review). Aircraft with expired airworthiness or inside an active maintenance window are excluded from scheduling and booking assignment. Maintenance scheduling detects conflicts with confirmed flights and warns; overlapping a confirmed flight is blocked unless the flight is first rescheduled. Range and MTOW feed route feasibility and manifest weight checks.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Crew-Coord | Finance | Viewer |
|---|---|---|---|---|---|
| operator.aircraft.view | ✓ | ✓ | ✓ | read | read |
| operator.aircraft.manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| operator.aircraft.maintenance | ✓ | ✓ | ✗ | ✗ | ✗ |
| operator.aircraft.documents | ✓ | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/aircraft`, `POST /operator/aircraft`, `GET /operator/aircraft/{id}`, `PATCH /operator/aircraft/{id}`, `POST /operator/aircraft/{id}/submit`, `POST /operator/aircraft/{id}/documents`, `POST /operator/aircraft/{id}/maintenance`, `POST /operator/aircraft/{id}/photos`.

### DATABASE & ENTITY RELATION
`aircraft (N) — (1) operators`, `(N) — (1) aircraft_types`, `(N) — (1) operating_bases`, `(1) — (N) documents`, `(1) — (N) maintenance_windows`, `(1) — (N) aircraft_photos`. Scheduling/booking read aircraft availability.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Add aircraft] -> specs + airworthiness -> submit -> admin review -> approved -> available
[Airworthiness expiry] -> ground -> exclude from scheduling -> notify
[Schedule maintenance] -> window vs confirmed flights? conflict -> warn/block -> set maintenance status
```

---

## Module 6 — Crew Management (Pilots & Cabin Crew)

### MODULE PURPOSE
Manage pilots and cabin crew: licenses, type ratings, medical validity, contact, duty status, and assignment eligibility. Crew compliance gates flight assignment.

### SUBMODULES
Crew Directory, Crew Detail, Licenses & Type Ratings, Medical & Documents, Duty/Availability.

### SCREEN-WISE BREAKDOWN
**6.1 Crew Directory.** DataTable (name, role pilot/crew, license no, type ratings, medical expiry, status, current assignment). Filter by role, type rating, status, expiring.
**6.2 Crew Detail.** Tabs: Profile, Licenses & Ratings (which aircraft types they may operate), Medical & Documents (with expiry), Assignments (upcoming flights), Duty/Availability (roster), History. Actions: submit-for-review, set availability, ground/un-ground (admin may also ground).
**6.3 Duty & Availability.** Roster calendar; duty-time tracking (basic) to avoid double-booking.

### UI COMPONENTS REQUIRED
DataTable, FilterBar, DetailDrawer with tabs, FileUploader/preview, Calendar (duty roster), tag selector (type ratings), StatusBadge, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| name | string | yes | 2–80 | — |
| crew_role | enum | yes | pilot/copilot/cabin | — |
| license_no | string | pilot:yes | format | — |
| type_ratings[] | UUID[] | pilot:yes | valid aircraft types | gates assignment |
| medical_expiry | date | pilot:yes | future | grounds if expired |
| documents[] | doc | yes | future expiry | — |
| status | enum | system+ops | submitted/approved/active/grounded | — |
| availability[] | range | no | non-overlap | duty roster |

### BUSINESS LOGIC
A pilot can be assigned to a flight only if rated for that aircraft type and medical/license valid and not already on a conflicting assignment within the duty window. Expired medical/license auto-grounds. New crew start `submitted` pending review (admin review default, operator-self-approval if buyer enables). Duty/availability conflicts block assignment in Module 10.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Crew-Coord | Finance | Viewer |
|---|---|---|---|---|---|
| operator.crew.view | ✓ | ✓ | ✓ | read | read |
| operator.crew.manage | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.crew.documents | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.crew.roster | ✓ | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/crew`, `POST /operator/crew`, `GET /operator/crew/{id}`, `PATCH /operator/crew/{id}`, `POST /operator/crew/{id}/submit`, `POST /operator/crew/{id}/documents`, `PATCH /operator/crew/{id}/ratings`, `POST /operator/crew/{id}/availability`.

### DATABASE & ENTITY RELATION
`pilots (N) — (1) operators`, `(1) — (N) documents`, `(N) — (N) aircraft_types` (ratings via `pilot_type_ratings`), `(1) — (N) crew_availability`. Assignment reads these.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Add crew] -> profile + license/ratings/medical -> submit -> review -> approved -> active
[Medical/license expiry] -> auto-ground -> exclude from assignment -> notify
[Assign in Module 10] -> rated? medical valid? available? -> allow ; else block
```

---

## Module 7 — Routes & Schedule / Inventory Management

### MODULE PURPOSE
Let operators define the air routes they serve and publish schedules/inventory (for shuttles and defined helicopter routes), which then surface to customers in the catalog. Charter/VIP are quote-based and do not require fixed inventory.

### SUBMODULES
Routes, Schedules (recurring/ad-hoc), Inventory & Seat Capacity, Publishing Control, Availability Calendar.

### SCREEN-WISE BREAKDOWN
**7.1 Routes.** List + editor: origin/destination (from operating bases/helipads), distance, est duration, eligible aircraft types, airspace notes. Map preview.
**7.2 Schedules.** Create recurring (e.g., daily 9am City A→B) or ad-hoc flights; assign aircraft (and optionally crew); set seats/inventory; price reference (links Module 8). Conflict detection (aircraft/crew).
**7.3 Inventory & Availability Calendar.** Calendar of published flights with seats sold/available; open/close inventory; publish/unpublish.
**7.4 Publishing Control.** Publish to customer catalog; shows admin-pause state if active.

### UI COMPONENTS REQUIRED
DataTable, FormBuilder, Map (route preview), Calendar/Scheduler with conflict highlighting, MoneyInput (price ref), StatusBadge, ConfirmDialog (publish).

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| route.origin_base_id / dest | UUID | yes | exists | from bases |
| route.distance_km | decimal | yes | >0 | feasibility |
| route.eligible_aircraft_types[] | UUID[] | yes | exist | — |
| schedule.aircraft_id | UUID | sched:yes | available, no conflict | — |
| schedule.recurrence | rrule/json | no | valid | recurring |
| schedule.etd/eta | datetime | yes | etd<eta, future | — |
| schedule.seats_total | int | shuttle:yes | ≤ aircraft capacity | inventory |
| schedule.seats_sold | int | system | ≤ seats_total | — |
| schedule.published | bool | ops | admin not paused | gating |

### BUSINESS LOGIC
A schedule cannot be published while the operator is unapproved or admin-paused, or if its aircraft is unavailable/in maintenance, or if airworthiness/crew compliance fails. Recurring schedules generate concrete flight instances within a horizon. Seat inventory decrements atomically on booking; overbooking blocked unless buyer-enabled. Scheduling uses an exclusion constraint so the same aircraft/pilot cannot be double-booked. Route changes never alter already-booked flights.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Dispatcher | Finance | Viewer |
|---|---|---|---|---|---|
| operator.routes.view | ✓ | ✓ | ✓ | read | read |
| operator.routes.manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| operator.schedule.manage | ✓ | ✓ | limited | ✗ | ✗ |
| operator.schedule.publish | ✓ | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/routes`, `POST /operator/routes`, `PATCH /operator/routes/{id}`, `GET /operator/schedules`, `POST /operator/schedules`, `PATCH /operator/schedules/{id}`, `POST /operator/schedules/{id}/publish`, `POST /operator/schedules/{id}/unpublish`, `GET /operator/inventory/calendar`.

### DATABASE & ENTITY RELATION
`routes (N) — (1) operators`, `routes (N) — (N) aircraft_types` via `route_aircraft_types`, `schedules (N) — (1) routes`, `(N) — (1) aircraft`, `schedules (1) — (N) flights` (instances). Exclusion constraint on aircraft/pilot time ranges.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Create route] -> origin/dest + eligible types -> save
[Create schedule] -> route + aircraft (+crew) + times + seats -> conflict check -> save (instances)
[Publish] -> approved & not paused & aircraft available & compliant? -> publish to catalog ; else block(reason)
[Booking] -> decrement seats atomically
```

---

## Module 8 — Operator Pricing & Quotes

### MODULE PURPOSE
Let operators set their pricing for routes/aircraft (per-seat, hourly, positioning, baggage, fuel surcharge, night-halt) within platform rules, and respond to charter/VIP requests with quotes. Final fare composition respects platform pricing snapshot rules; admin commission is applied on top by the platform.

### SUBMODULES
Route/Seat Pricing, Charter/VIP Quotes, Surcharges & Add-ons, Quote History.

### SCREEN-WISE BREAKDOWN
**8.1 Route/Seat Pricing.** Per route × aircraft type: per-seat base (shuttle/heli), positioning charge, baggage charge, night-halt, fuel surcharge; effective dating. Versioned.
**8.2 Charter/VIP Quote Builder.** For an incoming charter/VIP request: estimated flight hours × hourly rate + positioning + night-halt + catering + add-ons → quote; send (or push via admin if admin-mediated model). Multiple quote versions allowed before acceptance.
**8.3 Quote History.** All quotes with status (draft/sent/accepted/expired/rejected).

### UI COMPONENTS REQUIRED
FormBuilder (pricing editors), MoneyInput, quote builder with live total, DataTable (quote history), diff view (quote versions), ConfirmDialog (send quote), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| per_seat_minor | int | shuttle/heli | ≥0 | — |
| hourly_rate_minor | int | charter/vip | ≥0 | — |
| positioning_minor | int | no | ≥0 | — |
| baggage_minor | int | no | ≥0 | per kg or flat |
| night_halt_minor | int | no | ≥0 | — |
| fuel_surcharge | decimal/int | no | ≥0 | — |
| quote.estimated_hours | decimal | charter | >0 | — |
| quote.total_minor | int | system | computed | — |
| quote.status | enum | system | draft/sent/accepted/expired/rejected | — |
| effective_from/to | datetime | yes | from<to | versioning |

### BUSINESS LOGIC
Operator pricing must stay within any platform-imposed bounds (the buyer-admin may cap or floor in Admin Module 13/22); the platform applies commission on top to derive operator payout. Quotes have an expiry; an expired quote cannot be accepted. Accepting a quote (by customer, possibly via admin) confirms the booking and snapshots the priced quote. Pricing is effective-dated so historical flights remain reproducible.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Finance | Dispatcher | Viewer |
|---|---|---|---|---|---|
| operator.pricing.view | ✓ | ✓ | ✓ | read | read |
| operator.pricing.manage | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.quotes.create | ✓ | ✓ | ✓ | limited | ✗ |
| operator.quotes.send | ✓ | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/pricing`, `POST /operator/pricing`, `PATCH /operator/pricing/{id}`, `POST /operator/quotes`, `PATCH /operator/quotes/{id}`, `POST /operator/quotes/{id}/send`, `GET /operator/quotes`.

### DATABASE & ENTITY RELATION
`operator_pricing_rules (operator_id, route_id, aircraft_type_id, rule jsonb, effective_from/to, version)`, `charter_quotes (operator_id, booking_id, version, total_minor, status, expires_at)`. Booking snapshots accepted quote.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Set pricing] -> within platform bounds? -> save (versioned) ; else reject
[Charter request] -> build quote (components -> total) -> send -> await accept (expiry)
[Quote accepted] -> snapshot on booking -> confirm -> platform applies commission for payout
```

---

## Module 9 — Booking Requests & Queue

### MODULE PURPOSE
Surface incoming air booking requests routed to this operator (shuttle/helicopter on published inventory, and charter/VIP quote requests) and let the operator accept, reject, or quote within the TTL. This is the operator's primary inbound funnel.

### SUBMODULES
Request Queue, Request Detail, Accept/Reject, Quote Response (charter/VIP), Auto-Expiry Handling.

### SCREEN-WISE BREAKDOWN
**9.1 Request Queue.** DataTable (booking_ref, sub-type, route/itinerary, requested date/time, pax, baggage, TTL countdown, status). Filter by sub-type, date, route, TTL-risk.
**9.2 Request Detail.** Customer-provided details (route/itinerary, pax count, baggage, special requests), feasibility check (aircraft availability, range, weight), and actions: Accept (assign later), Reject (reason), or Build Quote (charter/VIP → Module 8).

### UI COMPONENTS REQUIRED
DataTable with live TTL countdowns, FilterBar, DetailDrawer, feasibility panel (range/weight/availability), ConfirmDialog, quote builder launcher.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| booking_ref | string | no | — | — |
| service_subtype | enum | no | heli/charter/shuttle/vip | — |
| requested_at / itinerary | datetime/json | no | — | customer input |
| pax_count | int | no | ≥1 | weight/cap basis |
| baggage_kg | int | no | ≥0 | — |
| ttl_expires_at | datetime | system | — | accept window |
| status | enum | via actions | requested→accepted/quote_shared/rejected | — |
| reject_reason | text | on reject | required | — |

### BUSINESS LOGIC
Requests carry a TTL (configurable by buyer-admin). If not actioned in time, the request expires from this operator and the platform re-routes (to another operator or to admin). Accept is allowed only if a feasible aircraft exists (range, capacity vs pax, availability). For charter/VIP, the operator responds with a quote (Module 8) rather than a direct accept. Concurrency-safe: if the platform routed the same request to multiple operators, first acceptance wins; others see "no longer available."

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Dispatcher | Finance | Viewer |
|---|---|---|---|---|---|
| operator.requests.view | ✓ | ✓ | ✓ | read | read |
| operator.requests.accept | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.requests.reject | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.requests.quote | ✓ | ✓ | limited | ✓ | ✗ |

### API REQUIREMENTS
`GET /operator/requests`, `GET /operator/requests/{id}`, `POST /operator/requests/{id}/accept`, `POST /operator/requests/{id}/reject`, `POST /operator/requests/{id}/quote`, WebSocket `operator.requests` (new request push + TTL).

### DATABASE & ENTITY RELATION
Reads `bookings` (air, routed to operator) with `operator_id` set on routing; `dispatch_events` records accept/reject/timeout; charter quotes link via Module 8.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[New request pushed] -> queue with TTL
   -> feasible? (range/cap/availability)
   -> Accept (first wins) -> move to Assignment (Module 10)
   -> Reject(reason) -> re-route by platform
   -> Quote (charter/VIP) -> send -> await accept
   -> TTL expires -> expire -> platform re-routes
```

---

## Module 10 — Flight Assignment & Dispatch

### MODULE PURPOSE
After acceptance, let the operator assign concrete resources to a flight — aircraft, pilot, co-pilot, cabin crew — validate compliance and conflicts, and move the booking toward confirmed/manifest-locked.

### SUBMODULES
Assignment Board, Resource Picker, Conflict & Compliance Checks, Crew Notification.

### SCREEN-WISE BREAKDOWN
**10.1 Assignment Board.** Accepted/confirmed flights needing resources; each row shows required vs assigned (aircraft, pilot, crew). Drag-or-select assignment.
**10.2 Resource Picker.** For a flight: eligible aircraft (available, range/capacity ok), eligible pilots (rated, medical valid, available), crew. Real-time conflict check.

### UI COMPONENTS REQUIRED
Assignment board (kanban/calendar hybrid), resource picker with eligibility filtering, conflict warnings, WeightGauge (capacity vs pax), ConfirmDialog, StatusBadge.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| flight.aircraft_id | UUID | yes | available, capacity≥pax, range ok | — |
| flight.pilot_id | UUID | yes | rated+valid+available | — |
| flight.copilot_id | UUID | type-dependent | rated+valid+available | — |
| flight.crew[] | UUID[] | no | valid+available | — |
| flight.status | enum | transitions | confirmed→manifest_locked | — |

### BUSINESS LOGIC
Assignment validates: aircraft available and not in maintenance, capacity ≥ pax, range ≥ route; pilot rated for the aircraft type with valid medical/license and no duty conflict. On full valid assignment, the flight can move to `confirmed`; the manifest (Module 11) can then be locked. Reassignment before departure is allowed with re-validation and crew notification. Assignment writes to the duty roster to prevent double-booking.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Dispatcher | Crew-Coord | Viewer |
|---|---|---|---|---|---|
| operator.assignment.view | ✓ | ✓ | ✓ | ✓ | read |
| operator.assignment.assign | ✓ | ✓ | ✓ | crew-only | ✗ |
| operator.assignment.reassign | ✓ | ✓ | ✓ | crew-only | ✗ |

### API REQUIREMENTS
`GET /operator/flights/assignment-board`, `GET /operator/flights/{id}/eligible-resources`, `POST /operator/flights/{id}/assign`, `POST /operator/flights/{id}/reassign`, `POST /operator/flights/{id}/confirm`.

### DATABASE & ENTITY RELATION
`flights (N) — (1) aircraft`, `(N) — (1) pilots` (pilot/copilot), `flights (1) — (N) flight_crew`. Duty roster `crew_availability` updated on assignment. Exclusion constraints prevent conflicts.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Accepted flight] -> pick aircraft (avail/cap/range) -> pick pilot (rated/valid/free) -> crew
   -> all valid? -> confirm -> notify crew -> manifest can lock
[Reassign] -> re-validate -> update roster -> notify old/new crew -> audit
```

---

## Module 11 — Passenger Manifest Management

### MODULE PURPOSE
Build, validate, and lock the passenger manifest for each flight: passenger identity per regulatory needs, baggage, total weight vs MTOW, and special requirements. The manifest is the operational and (where required) regulatory record of who/what is on board.

### SUBMODULES
Manifest Builder, Passenger Details, Baggage & Weight, Manifest Lock & Edits, Special Assistance.

### SCREEN-WISE BREAKDOWN
**11.1 Manifest View.** Per flight: passenger list (from booking) with name, gender, age, ID type/number (per buyer-configured regulatory fields), baggage weight, special needs. Running weight total vs MTOW (WeightGauge).
**11.2 Edit/Lock.** Edit within authorized windows; lock at cutoff (status → manifest_locked); post-lock edits only via authorized exception with reason.

### UI COMPONENTS REQUIRED
Manifest table (editable rows), WeightGauge (sum vs MTOW, hard limit), FormBuilder (passenger detail), ConfirmDialog (lock), StatusBadge, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| passenger.name | string | yes | 2–80 | — |
| passenger.gender | enum | reg-dependent | — | configurable |
| passenger.age | int | reg-dependent | ≥0 | minor rules |
| passenger.id_type | enum | reg-dependent | from set | per buyer config |
| passenger.id_number | string | reg-dependent | format per type | — |
| passenger.baggage_kg | int | yes | ≥0, within cap | — |
| passenger.special_assistance | text | no | — | flagged |
| manifest.total_weight_kg | int | system | ≤ aircraft MTOW | hard block |
| manifest.locked | bool | system | at cutoff | — |

### BUSINESS LOGIC
Required passenger fields are buyer-configurable per route/region (since geography is not fixed — Admin Settings). Total passenger + baggage weight must not exceed aircraft MTOW; the panel hard-blocks lock if exceeded. Manifest locks automatically at a configured cutoff before ETD, or manually by an authorized user. Post-lock edits require an exception permission and a reason (audited). Minor-without-guardian rules (if configured) block lock.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Dispatcher | Crew-Coord | Viewer |
|---|---|---|---|---|---|
| operator.manifest.view | ✓ | ✓ | ✓ | ✓ | read |
| operator.manifest.edit | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.manifest.lock | ✓ | ✓ | ✓ | ✗ | ✗ |
| operator.manifest.post_lock_edit | ✓ | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/flights/{id}/manifest`, `PATCH /operator/flights/{id}/manifest`, `POST /operator/flights/{id}/manifest/lock`, `POST /operator/flights/{id}/manifest/unlock` (exception), `GET /operator/flights/{id}/manifest/export`.

### DATABASE & ENTITY RELATION
`flights (1) — (N) manifest_passengers`. Weight check derives from passengers + aircraft.mtow_kg. Lock state on flight.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Build manifest] -> passengers + baggage -> sum weight
   -> weight <= MTOW? NO -> block ; YES -> allow lock
[Lock] (cutoff or manual) -> status=manifest_locked
[Post-lock edit] -> exception perm + reason -> edit -> re-check weight -> audit
```

---

## Module 12 — Flight Operations & Day-of-Flight Control

### MODULE PURPOSE
Run the flight on the day: pre-flight checklist, boarding control, departure and arrival status updates, delays, and flight closure. Drives customer-facing status and triggers settlement eligibility.

### SUBMODULES
Pre-Flight Checklist, Boarding Control, Departure/Arrival Updates, Delay/Diversion Handling, Flight Closure.

### SCREEN-WISE BREAKDOWN
**12.1 Day-of-Flight Board.** Today's flights with status pipeline (confirmed → manifest_locked → boarded → departed → arrived → completed). Per-flight actions: run checklist, mark boarding, mark departed (ATD), mark arrived (ATA), record delay/diversion, close flight.
**12.2 Flight Detail (ops).** Checklist items, boarding status per passenger, timestamps, delay reasons, notes.

### UI COMPONENTS REQUIRED
Status pipeline board, checklist component, per-passenger boarding toggles, time capture, ConfirmDialog, StatusBadge, Timeline, notes/CommentThread.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| checklist[] | items | pre-departure | all required done | gate to depart |
| boarding_status (per pax) | enum | yes | not_boarded/boarded/no_show | — |
| atd / ata | datetime | on depart/arrive | atd<ata | actual times |
| delay_reason | text | if delayed | — | drives OTP metric |
| diversion | json | optional | valid alt point | — |
| status | enum | transitions | per Appendix C | — |

### BUSINESS LOGIC
Departure requires a locked manifest and a completed required checklist. Boarding records per-passenger state (no-shows flagged). ATD/ATA feed on-time performance and customer status notifications (push/SMS/email via adapters). Diversion records an alternate point and notifies admin/customer. Flight closure (status=completed) makes the booking eligible for settlement (Module 14) and prompts post-flight ratings on the customer side.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Dispatcher | Crew-Coord | Pilot/Crew | Viewer |
|---|---|---|---|---|---|---|
| operator.flightops.view | ✓ | ✓ | ✓ | ✓ | assigned-only | read |
| operator.flightops.update | ✓ | ✓ | ✓ | limited | assigned-only | ✗ |
| operator.flightops.close | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/flights/day-board`, `POST /operator/flights/{id}/checklist`, `POST /operator/flights/{id}/boarding`, `POST /operator/flights/{id}/depart`, `POST /operator/flights/{id}/arrive`, `POST /operator/flights/{id}/delay`, `POST /operator/flights/{id}/close`, WebSocket `operator.flightops`.

### DATABASE & ENTITY RELATION
`flights (1) — (N) flight_checklist_items`, `(1) — (N) manifest_passengers (boarding_status)`, flight timestamps on `flights`. Status transitions emit notifications + customer tracking events.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Day board] -> select flight
   -> checklist complete? + manifest locked? -> allow boarding
   -> boarding -> mark depart(ATD) -> in-air -> mark arrive(ATA)
   -> close(completed) -> settlement eligible + customer rating prompt
[Delay/Diversion] -> record reason/alt -> notify customer+admin -> affects OTP
```

---

## Module 13 — Cancellation & Rescheduling

### MODULE PURPOSE
Allow the operator to cancel or reschedule a flight under the buyer-admin-configured tiered policy (cancellation tiers are admin-managed dynamically per the locked decision), with correct fee/refund consequences flowing to the platform.

### SUBMODULES
Cancellation, Rescheduling, Policy Preview, Force-Majeure Handling.

### SCREEN-WISE BREAKDOWN
**13.1 Cancel Flight.** Select reason; system shows the applicable tier (by time-to-departure, from admin config) and the resulting fee/refund consequence; confirm. Operator-initiated cancellation may trigger customer compensation per policy.
**13.2 Reschedule.** Pick a new available slot/aircraft; re-validate resources; manifest re-locks; customer notified; fee per policy.
**13.3 Force-Majeure.** Weather/regulatory cancellation path that waives fees with reason and evidence note.

### UI COMPONENTS REQUIRED
ConfirmDialog with policy preview, reason selector, slot picker (reschedule), MoneyInput (consequence display, read-only), StatusBadge, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| cancel_reason | enum+text | yes | from set | — |
| cancel_tier | enum | system | by time-to-departure | admin-configured |
| force_majeure | bool | optional | reason required | waives fee |
| reschedule_target | slot | reschedule | available, feasible | — |
| consequence_minor | int | system | computed | fee/refund/compensation |

### BUSINESS LOGIC
Cancellation tiers are read from the buyer-admin configuration (not hard-coded) and matched by time-to-departure. Operator-initiated cancellation may incur operator-side consequences (e.g., reduced payout or customer compensation) per policy. Force-majeure bypasses fees with a recorded reason. Reschedule requires a feasible target and re-locks the manifest. All financial consequences post through the platform ledger; the operator sees the effect but the platform owns the postings.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Dispatcher | Finance | Viewer |
|---|---|---|---|---|---|
| operator.cancel.view | ✓ | ✓ | ✓ | ✓ | read |
| operator.cancel.execute | ✓ | ✓ | limited | ✗ | ✗ |
| operator.reschedule.execute | ✓ | ✓ | limited | ✗ | ✗ |
| operator.forcemajeure.apply | ✓ | ✓ | ✗ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/flights/{id}/cancel-preview`, `POST /operator/flights/{id}/cancel`, `POST /operator/flights/{id}/reschedule`, `POST /operator/flights/{id}/force-majeure`.

### DATABASE & ENTITY RELATION
Reads admin `cancellation_tiers` config; writes booking status + `dispatch_events`; financial consequence recorded in platform `ledger_entries` (read-only to operator).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Cancel] -> derive tier by time-to-departure (admin config) -> show consequence
   -> force majeure? -> waive ; else apply fee/compensation -> ledger -> notify customer+admin -> audit
[Reschedule] -> feasible target -> re-validate resources -> re-lock manifest -> notify -> audit
```

---

## Module 14 — Payouts & Settlements (Operator View)

### MODULE PURPOSE
Give operators visibility into what the platform owes them: per-period settlement statements, line items (gross fare, platform commission, deductions, clawbacks, taxes, net), payout status, and downloadable statements. Computation and disbursement are platform/admin-owned (Admin Module 16); this is the operator's read + reconcile view.

### SUBMODULES
Settlement Periods, Statement Detail, Payout Status, Disputes/Queries.

### SCREEN-WISE BREAKDOWN
**14.1 Settlements List.** DataTable (period, gross, commission, deductions, net, status). Filter by period, status.
**14.2 Statement Detail.** Per-period line items (per flight), totals, downloadable PDF/CSV. Raise a query/dispute on a line item.
**14.3 Payout Status.** Disbursement status (pending/approved/paid/failed), bank reference (masked).

### UI COMPONENTS REQUIRED
DataTable, statement detail table, export (PDF/CSV), MoneyInput (read-only display), StatusBadge, CommentThread (queries), AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| period_start/end | date | no | — | — |
| gross_minor | int | no | ≥0 | sum confirmed flights |
| commission_minor | int | no | per admin config | platform fee |
| deductions_minor | int | no | ≥0 | clawbacks/penalties |
| net_minor | int | no | gross−commission−deductions | — |
| status | enum | no | pending/approved/paid/failed | admin-owned |
| query | text | operator | — | raise dispute |

### BUSINESS LOGIC
Settlements are computed by the platform from completed flights, applying the operator's commission configuration (admin-set in Admin Module 9/16). Operators can view and download statements and raise queries on line items; they cannot edit amounts. Clawbacks (e.g., post-flight customer refunds) reduce a future settlement and are itemized. Statements are immutable once issued. Payout disbursement status reflects the admin payout run.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Finance | Ops Manager | Others |
|---|---|---|---|---|
| operator.settlements.view | ✓ | ✓ | summary | ✗ |
| operator.settlements.export | ✓ | ✓ | ✗ | ✗ |
| operator.settlements.query | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/settlements`, `GET /operator/settlements/{id}`, `GET /operator/settlements/{id}/export`, `POST /operator/settlements/{id}/query`.

### DATABASE & ENTITY RELATION
Reads platform `payouts`, `payout_line_items`, `ledger_entries` filtered by operator. Queries stored in `settlement_queries`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Platform payout run] -> aggregates operator flights -> commission/deductions -> net
[Operator views] -> statement detail -> download
   -> disagree? -> raise query -> admin/finance responds
[Disbursement] -> status pending->approved->paid (admin-owned) -> operator sees status
```

---

## Module 15 — Reports & Analytics (Operator)

### MODULE PURPOSE
Operator-scoped operational and financial reporting: flights, load factor, on-time performance, cancellations, revenue, fleet utilization, and crew utilization — for the operator's own business decisions.

### SUBMODULES
Operational Reports, Financial Reports, Fleet Utilization, Crew Utilization, Scheduled Reports & Exports.

### SCREEN-WISE BREAKDOWN
**15.1 Report Library.** Operator report catalog with filter panel (period, route, aircraft, crew).
**15.2 Report Viewer.** Table + chart, drill-down, export (CSV/XLSX), schedule (email cadence).
**15.3 Dashboards.** Composed operator views (Operations, Finance, Utilization).

### UI COMPONENTS REQUIRED
DataTable (virtualized), TrendChart/bar/pie, FilterBar, export, scheduler.

### FIELD-LEVEL SPECIFICATION (representative)
| Report | Metrics | Source |
|---|---|---|
| Flights Summary | count, completed, cancelled, OTP | read replica |
| Load Factor | seats sold/available by route | read replica |
| Revenue | gross, commission, net by period | read replica + ledger |
| Fleet Utilization | hours/cycles per aircraft | read replica |
| Crew Utilization | duty hours per pilot/crew | read replica |

### BUSINESS LOGIC
All reports operator-scoped. v1 reads from the PostgreSQL read replica (warehouse deferred per locked decision); interfaces unchanged so a warehouse can slot in later. Financial figures reconcile to settlement statements. Scheduled reports email exports to operator users. Exports rate-limited and audited.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Finance | Ops Manager | Viewer |
|---|---|---|---|---|
| operator.reports.operational | ✓ | ✓ | ✓ | read |
| operator.reports.financial | ✓ | ✓ | ✗ | ✗ |
| operator.reports.export | ✓ | ✓ | ✓ | ✗ |
| operator.reports.schedule | ✓ | ✓ | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/reports/catalog`, `POST /operator/reports/query`, `POST /operator/reports/export`, `POST /operator/reports/schedule`.

### DATABASE & ENTITY RELATION
Reads operator-scoped projections / replica views. Metadata in `operator_report_schedules`, `operator_saved_views`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open report] -> scoped filters -> query replica -> table+chart -> drill -> export(audited)
[Schedule] -> cadence+recipients -> job emails export
```

---

## Module 16 — Documents & Compliance

### MODULE PURPOSE
Central place for the operator to manage all compliance documents (company certifications, insurance, aircraft airworthiness, crew licenses/medicals) with expiry tracking and reminders. Mirrors the admin KYC/compliance module from the operator's side.

### SUBMODULES
Document Repository, Expiry Watchlist, Upload & Re-upload, Compliance Status Overview.

### SCREEN-WISE BREAKDOWN
**16.1 Document Repository.** All operator documents grouped by entity (company/aircraft/crew) with type, status, expiry, preview.
**16.2 Expiry Watchlist.** Documents expiring within N days, grouped, with upload-renewal action.
**16.3 Compliance Overview.** A readiness panel showing what's blocking publishing/operations (expired certs, grounded aircraft, grounded crew).

### UI COMPONENTS REQUIRED
DataTable, FileUploader/preview, StatusBadge, expiry watchlist with reminders, compliance readiness panel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| entity_type/id | enum/UUID | system | operator-scoped | company/aircraft/pilot |
| doc_type | enum | yes | from set | — |
| file_url | string | yes | scanned clean | storage adapter |
| status | enum | system | uploaded/in_review/approved/rejected/expired | admin reviews |
| expiry_date | date | on approve | future | drives watchlist |

### BUSINESS LOGIC
Documents uploaded by the operator enter review (admin reviews per Admin Module 20, unless buyer enables operator-self-approval). Expiry auto-flips status and cascades: expired airworthiness grounds the aircraft, expired medical/license grounds crew, expired company cert/insurance auto-pauses publishing. The compliance overview computes the operator's current operational readiness. Reminders fire ahead of expiry via notification adapters.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Ops Manager | Crew-Coord | Finance | Viewer |
|---|---|---|---|---|---|
| operator.documents.view | ✓ | ✓ | crew docs | read | read |
| operator.documents.upload | ✓ | ✓ | crew docs | ✗ | ✗ |

### API REQUIREMENTS
`GET /operator/documents`, `POST /operator/documents`, `GET /operator/documents/expiry-watchlist`, `GET /operator/compliance/overview`.

### DATABASE & ENTITY RELATION
`documents` (polymorphic, operator-scoped) linked to operators/aircraft/pilots. Compliance overview derives from documents + entity statuses.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Upload doc] -> scan -> in_review -> admin approve(set expiry)/reject
[Expiry job] -> expired -> cascade (ground aircraft/crew, pause publishing) -> notify
[Compliance overview] -> aggregate blockers -> show readiness
```

---

## Module 17 — Notifications & Communication

### MODULE PURPOSE
Deliver and surface operator-relevant notifications (new booking requests, TTL warnings, assignment reminders, document expiry, payout updates, cancellations) and provide a notification center plus communication context with the platform/customer (within privacy rules).

### SUBMODULES
Notification Center, Preferences, Event Subscriptions, Customer/Platform Communication Context.

### SCREEN-WISE BREAKDOWN
**17.1 Notification Center.** In-app feed of operator notifications with read/unread, filters by type.
**17.2 Preferences.** Per-user channel preferences (in-app/email/push where the operator user has the companion) and quiet hours.
**17.3 Communication Context.** For a booking/flight, view messages/notifications exchanged (masked customer contact per privacy; v1 has no number masking but limits PII exposure per GDPR).

### UI COMPONENTS REQUIRED
Notification feed, preference toggles, filters, context panel on booking/flight.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| notification.type | enum | request/assignment/expiry/payout/cancel |
| notification.channel | enum | in_app/email/push |
| notification.status | enum | queued/sent/delivered/read |
| preference.quiet_hours | range | per user |

### BUSINESS LOGIC
Notifications are generated by platform events and delivered via the adapter layer (FCM/SMTP/SMS — buyer-supplied). Critical notifications (new request TTL, departure-critical) bypass quiet hours. Operator communication with customers respects GDPR data-minimization; in v1 no number masking exists, so direct contact details are limited to what's operationally necessary and surfaced only to authorized roles.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | All Operator Roles |
|---|---|
| operator.notifications.view (own) | ✓ |
| operator.notifications.preferences (self) | ✓ |
| operator.communication.view | role-dependent (Ops/Dispatcher yes; Viewer read) |

### API REQUIREMENTS
`GET /operator/notifications`, `POST /operator/notifications/{id}/read`, `GET/PATCH /operator/notifications/preferences`, `GET /operator/bookings/{id}/communication`.

### DATABASE & ENTITY RELATION
`notifications` (operator-scoped recipients), `operator_notification_preferences`. Reads booking/flight context.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Platform event] -> resolve operator recipients -> deliver via adapters -> feed entry
[Critical?] -> bypass quiet hours
[User] -> read/clear -> preferences govern channels
```

---

## Module 18 — Operator Settings & Profile Configuration

### MODULE PURPOSE
Operator-level settings within the bounds the buyer-admin allows: operating preferences, default cutoffs, contact display, notification defaults, and locale — without touching platform-global configuration.

### SUBMODULES
Operating Preferences, Default Cutoffs & TTL Display, Locale, Branding-within-bounds, Contact Display.

### SCREEN-WISE BREAKDOWN
**18.1 Operating Preferences.** Default manifest-lock cutoff (within admin-allowed range), default checklist template, base defaults.
**18.2 Locale.** Operator user default language/timezone (within platform-supported set, including RTL).
**18.3 Contact Display.** What operator contact info is shown to customers (within privacy rules).

### UI COMPONENTS REQUIRED
FormBuilder, toggles, ConfirmDialog, AuditTrailPanel.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| default_manifest_cutoff_min | int | no | within admin range | — |
| default_checklist_template | json | no | valid | reusable |
| locale | string | no | supported set | RTL ok |
| public_contact | json | no | privacy-compliant | shown to customer |

### BUSINESS LOGIC
Operator settings are bounded by admin policy (e.g., cutoff cannot be shorter than admin minimum). Locale must be from the platform-supported languages (i18n/RTL supported per locked decision). Branding here is limited — the white-label brand belongs to the buyer; operators get only minimal display preferences, never theme override.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Operator Admin | Others |
|---|---|---|
| operator.settings.view | ✓ | Ops Manager read |
| operator.settings.edit | ✓ | ✗ |

### API REQUIREMENTS
`GET /operator/settings`, `PATCH /operator/settings`.

### DATABASE & ENTITY RELATION
`operator_settings (operator_id, key, value)`. Bounded by admin `system_settings`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Edit setting] -> within admin bounds? -> save -> audit ; else reject(reason)
```

---

## Module 19 — Pilot / Crew Companion (Lightweight Sub-Surface)

### MODULE PURPOSE
A minimal, mobile-responsive view (not a separate app in v1) for assigned pilots/crew to see their flight assignments, view the manifest summary, update day-of-flight status for their assigned flights, and receive notifications.

### SUBMODULES
My Assignments, Flight Brief, Status Updates, Notifications.

### SCREEN-WISE BREAKDOWN
**19.1 My Assignments.** List of upcoming assigned flights (date, route, aircraft, role).
**19.2 Flight Brief.** Manifest summary (counts, weight), route, times, special-assistance flags; PII limited per role.
**19.3 Status Updates.** For assigned flights only: mark boarding progress, departed, arrived (subset of Module 12 actions).

### UI COMPONENTS REQUIRED
Responsive list, flight brief card, status action buttons, notification feed.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Editable | Validation | Notes |
|---|---|---|---|---|
| assignment.flight_id | UUID | no | assigned-only | scope |
| status_update | enum | yes | assigned-only, legal transition | subset of ops |
| manifest_summary | view | no | PII-limited | counts/weight |

### BUSINESS LOGIC
Crew see only flights they are assigned to. They can perform a restricted subset of day-of-flight updates (boarding/departed/arrived) but cannot edit manifests, pricing, or assignments. PII in the brief is minimized (names/counts as needed operationally), aligning with GDPR data-minimization.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Permission | Pilot/Crew | Others |
|---|---|---|
| operator.companion.assignments (own) | ✓ | n/a |
| operator.companion.status_update (assigned) | ✓ | n/a |

### API REQUIREMENTS
`GET /operator/companion/assignments`, `GET /operator/companion/flights/{id}/brief`, `POST /operator/companion/flights/{id}/status`.

### DATABASE & ENTITY RELATION
Reads `flights` + `flight_crew` where the user is assigned; status writes mirror Module 12 with stricter scope.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Crew login] -> my assignments (assigned-only)
   -> open brief (PII-limited) -> update status (boarding/depart/arrive) -> notify ops
```

---

# Appendix A — Operator Permission Registry

All keys are operator-scoped (`operator.<module>.<action>`) and never grant platform/admin access.

| Domain | Permission Keys |
|---|---|
| Auth | operator.auth.profile, operator.auth.security |
| Profile/Onboarding | operator.profile.view, operator.profile.edit, operator.onboarding.submit, operator.payout_details.edit |
| Dashboard | operator.dashboard.view, operator.dashboard.revenue |
| Team/RBAC | operator.team.view, operator.team.invite, operator.team.suspend, operator.roles.manage, operator.roles.assign |
| Aircraft | operator.aircraft.view, operator.aircraft.manage, operator.aircraft.maintenance, operator.aircraft.documents |
| Crew | operator.crew.view, operator.crew.manage, operator.crew.documents, operator.crew.roster |
| Routes/Schedule | operator.routes.view, operator.routes.manage, operator.schedule.manage, operator.schedule.publish |
| Pricing/Quotes | operator.pricing.view, operator.pricing.manage, operator.quotes.create, operator.quotes.send |
| Requests | operator.requests.view, operator.requests.accept, operator.requests.reject, operator.requests.quote |
| Assignment | operator.assignment.view, operator.assignment.assign, operator.assignment.reassign |
| Manifest | operator.manifest.view, operator.manifest.edit, operator.manifest.lock, operator.manifest.post_lock_edit |
| Flight Ops | operator.flightops.view, operator.flightops.update, operator.flightops.close |
| Cancel/Reschedule | operator.cancel.view, operator.cancel.execute, operator.reschedule.execute, operator.forcemajeure.apply |
| Settlements | operator.settlements.view, operator.settlements.export, operator.settlements.query |
| Reports | operator.reports.operational, operator.reports.financial, operator.reports.export, operator.reports.schedule |
| Documents | operator.documents.view, operator.documents.upload |
| Notifications | operator.notifications.view, operator.notifications.preferences, operator.communication.view |
| Settings | operator.settings.view, operator.settings.edit |
| Companion | operator.companion.assignments, operator.companion.status_update |

**Default role → permission mapping (seed):** Operator Admin = all; Ops Manager = operations + fleet/crew/schedule + assignment + manifest + flightops + reports(operational); Dispatcher = requests + assignment + manifest + flightops; Finance = pricing + settlements + reports(financial) + payout details; Crew-Coordinator = crew + roster + crew docs + assignment(crew); Viewer = read-only across granted domains.

---

# Appendix B — Operator Entity-Relationship Overview

`operators (1) → (N) operator_users`, `operator_users (N) → (1) operator_roles`, `operator_roles (1) → (N) operator_role_permissions`. `operators (1) → (N) operating_bases`, `(1) → (1) operator_payout_details`, `(1) → (N) documents` (company-level). `operators (1) → (N) aircraft`; `aircraft (N) → (1) aircraft_types`, `(N) → (1) operating_bases`, `(1) → (N) documents`, `(1) → (N) maintenance_windows`, `(1) → (N) aircraft_photos`. `operators (1) → (N) pilots`; `pilots (1) → (N) documents`, `(N) → (N) aircraft_types` via `pilot_type_ratings`, `(1) → (N) crew_availability`. `operators (1) → (N) routes`; `routes (N) → (N) aircraft_types`, `routes (1) → (N) schedules`; `schedules (N) → (1) aircraft`, `schedules (1) → (N) flights`. `bookings (air) (N) → (1) operators`, `(1) → (1) flights`; `flights (N) → (1) aircraft`, `(N) → (1) pilots` (pilot/copilot), `(1) → (N) flight_crew`, `(1) → (N) manifest_passengers`, `(1) → (N) flight_checklist_items`, `(1) → (N) charter_quotes`. `operators (1) → (N) operator_pricing_rules`. Settlement reads platform `payouts`/`payout_line_items`/`ledger_entries` filtered by operator. `operator_settings`, `operator_notification_preferences`, `operator_report_schedules`, `operator_saved_views`, `settlement_queries`, `operator_alerts` round out operator-scoped tables. Every operator-owned row carries `operator_id` for hard scoping.

---

# Appendix C — Operator-Side Status & State Reference

**Operator Org:** draft → submitted → in_review → approved → (paused by admin) → active; rejected → re-submit. (Approval/pause = admin-owned.)
**Operator User:** invited → active → suspended.
**Aircraft:** submitted → approved → available → grounded / maintenance.
**Crew (Pilot/Cabin):** submitted → approved → active → grounded.
**Schedule:** draft → published → unpublished/closed.
**Booking Request (operator view):** requested → (accepted | quote_shared | rejected | expired).
**Flight:** confirmed → manifest_locked → boarded → departed → arrived → completed; cancellation branches cancelled_by_operator / cancelled_by_admin / cancelled_by_customer; rescheduled (links new flight).
**Charter Quote:** draft → sent → (accepted | rejected | expired).
**Settlement:** computed → statement_issued → (payout) pending → approved → paid / failed.
**Document:** uploaded → in_review → approved → expired / rejected.

---

**End of Operator Web Panel Product Document.**
