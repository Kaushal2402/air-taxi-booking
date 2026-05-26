# Universal Transportation Booking Platform
## Driver App — Complete Enterprise Product Document

| Field | Value |
|---|---|
| Document Type | Driver Mobile App Architecture & Implementation Specification |
| Parent Product | Universal Transportation Booking Platform (UTBP) — White-Label |
| Surface | Driver Mobile App (Android + iOS) — road services only |
| Version | 1.0 |
| Status | Implementation-Ready |
| Audience | Product Architects, Mobile Engineers (Flutter), Backend Engineers (FastAPI), UI/UX Designers, DBAs, QA, DevOps |
| Locked Stack | Flutter (mobile), Python + FastAPI (backend), PostgreSQL + PostGIS, Redis, Socket.IO, Google Maps Platform, FCM push, SMTP email, S3/Firebase storage adapter |
| Cross-Cutting | i18n + RTL from launch; GDPR-aligned; background location + battery efficiency are first-class concerns |

---

## Positioning: The Driver App in the Platform

The Driver App is the **supply-side surface for road transportation**. Air services are fulfilled by operators and their pilots/crew (Operator Panel), so the Driver App is deliberately **road-only**: cab, bike, rental, and outstation. Its users are drivers (and driver accounts that may belong to a vendor/fleet owner). It is the most operationally demanding client in the platform because it runs for long continuous sessions, streams location in the background, must survive poor connectivity, and must be battery- and data-frugal while remaining instantly responsive to ride requests.

Three engineering truths shape every module. First, **reliability over richness** — a dropped ride request or a stale location can cost the business real money and trust, so the app prioritizes correctness of state and resilient delivery over visual flourish. Second, **the server owns money and dispatch** — the app displays earnings and accepts/rejects requests but never computes fares or decides eligibility; it reports telemetry and state transitions, and the backend is authoritative. Third, **compliance gates capability** — a driver with an expired mandatory document cannot go online; the app must surface and enforce this clearly.

Like the Customer App, the Driver App is one compiled Flutter codebase that becomes each buyer's branded driver app via runtime configuration (theme, languages incl. RTL, currency, enabled features, provider public keys). "RBAC" for this surface means **driver-vs-unauthenticated**, **ownership scoping** (a driver acts only on their own jobs/earnings/documents), and a light **vendor/fleet relationship** where a fleet owner may have read visibility over their drivers (handled primarily in the Admin/Vendor area, with only minimal driver-app implications noted).

---

## How To Read This Document

Each module follows the requested structure: **Module Name → Module Purpose → Submodules → Screen-Wise Breakdown → UI Components Required → Field-Level Specification → Business Logic → RBAC → API Requirements → Database & Entity Relation → Workflow Diagram Logic (text)**.

Field specs use: **Field, Type, Required, Validation, Notes**. Driver API endpoints are namespaced under `/api/v1/driver/...`, require a Bearer JWT (except OTP/auth bootstrap), and are **ownership-scoped** — the server injects `driver_id` from the JWT and rejects cross-driver access with `403`. Money is integer minor units with explicit currency; timestamps ISO 8601 UTC, displayed in the driver's locale/timezone. Section 0 conventions apply to every module.

---

## Table of Contents

- [Section 0 — Global Conventions & Foundation](#section-0--global-conventions--foundation)
- [Module 1 — App Bootstrap, Config & White-Label Theming](#module-1--app-bootstrap-config--white-label-theming)
- [Module 2 — Authentication & Session](#module-2--authentication--session)
- [Module 3 — Driver Onboarding & Document Submission](#module-3--driver-onboarding--document-submission)
- [Module 4 — Vehicle Management (Driver-Side)](#module-4--vehicle-management-driver-side)
- [Module 5 — Home, Online/Offline & Availability](#module-5--home-onlineoffline--availability)
- [Module 6 — Location Engine & Background Tracking](#module-6--location-engine--background-tracking)
- [Module 7 — Ride Request & Dispatch Handling](#module-7--ride-request--dispatch-handling)
- [Module 8 — Active Trip Execution (Navigation & Lifecycle)](#module-8--active-trip-execution-navigation--lifecycle)
- [Module 9 — Rental & Outstation Trip Handling](#module-9--rental--outstation-trip-handling)
- [Module 10 — Scheduled Rides (Driver-Side)](#module-10--scheduled-rides-driver-side)
- [Module 11 — Cancellations & No-Shows (Driver-Side)](#module-11--cancellations--no-shows-driver-side)
- [Module 12 — Earnings & Trip History](#module-12--earnings--trip-history)
- [Module 13 — Payouts & Driver Wallet](#module-13--payouts--driver-wallet)
- [Module 14 — Incentives, Bonuses & Heatmap](#module-14--incentives-bonuses--heatmap)
- [Module 15 — Performance, Ratings & Standing](#module-15--performance-ratings--standing)
- [Module 16 — Documents & Compliance (Driver-Side)](#module-16--documents--compliance-driver-side)
- [Module 17 — Notifications & Notification Center](#module-17--notifications--notification-center)
- [Module 18 — In-Trip Safety & SOS](#module-18--in-trip-safety--sos)
- [Module 19 — Support & Help](#module-19--support--help)
- [Module 20 — Profile, Settings, Language (i18n/RTL) & Privacy](#module-20--profile-settings-language-i18nrtl--privacy)
- [Appendix A — Driver Access & Ownership Matrix](#appendix-a--driver-access--ownership-matrix)
- [Appendix B — Driver-Facing Entity Overview](#appendix-b--driver-facing-entity-overview)
- [Appendix C — Driver-Side Status & State Reference](#appendix-c--driver-side-status--state-reference)
- [Appendix D — Location, Battery, Offline & Resilience Conventions](#appendix-d--location-battery-offline--resilience-conventions)

---

## Section 0 — Global Conventions & Foundation

### 0.1 Navigation Shell
A focused, low-distraction shell optimized for at-a-glance use while driving (with safety in mind: large targets, minimal text entry, voice/sound cues). Bottom navigation: Home (online toggle + current job), Earnings, Performance, Account. A persistent **online status indicator** and an **active-job banner** are always visible. When a ride request arrives or a trip is active, a full-screen takeover dominates. RTL mirrors the whole layout.

### 0.2 Shared UI Components (Flutter)
OnlineToggle (prominent, stateful), RideRequestCard (full-screen, countdown, accept/reject), NavMap (Google Maps turn-by-turn or deep-link to external nav), TripActionBar (arrived/start/end/stops), OtpEntry (start-trip OTP from customer), EarningsCard, EarningsBreakdownSheet, PayoutCard, DocumentUploader (scan status, expiry), DocumentStatusBadge, PerformanceGauge (acceptance/cancellation/rating), HeatmapOverlay, NotificationFeed, SosButton, ConfirmDialog, Skeleton/Shimmer, EmptyState, ErrorState (retry), Toast/Snackbar, CountdownTimer, MoneyText (minor-unit, currency), ComplianceBanner (blocking when documents expired). All theme-token-driven, locale/RTL-aware, and tuned for sunlight legibility and one-handed use.

### 0.3 Shared API & Realtime Behavior
REST under `/api/v1/driver`; realtime over Socket.IO (`driver.requests.{driverId}`, `driver.trip.{bookingId}`, `driver.notifications.{driverId}`). Location ingestion is a dedicated high-frequency channel (Module 6). Ride requests are pushed redundantly over Socket.IO **and** FCM (high-priority data message) so a request is never missed if the socket is momentarily down. Mutations carry `Idempotency-Key`. Error envelope `{code,message,details,traceId}`. The app reports state transitions and telemetry; the server is authoritative for fares, eligibility, and dispatch.

### 0.4 "RBAC" for the Driver Surface
Roles: Driver (authenticated) and Unauthenticated. There is no intra-app role hierarchy. Access is governed by authentication + **ownership scoping** (own jobs, earnings, documents, profile). A **Vendor/Fleet** relationship may exist: a driver can belong to a vendor, which affects payouts/commission routing (server-side) and gives the vendor read visibility in the Admin/Vendor surface — but the Driver App itself exposes only the driver's own data. Compliance state (documents valid) further gates whether the driver may go online at all. Full matrix in Appendix A.

### 0.5 Shared Validation
Phone E.164; OTP numeric fixed-length with attempt limits; documents MIME/size guarded, virus-scanned, with mandatory expiry on approval; online toggle blocked if any mandatory document is expired/rejected or vehicle is non-compliant; start-trip requires correct customer OTP (attempt-limited); location pings validated server-side for plausibility (speed/jump) and zone; earnings/fare values are server-authoritative and read-only on the client.

### 0.6 Shared Battery, Background & Offline Posture
Background location uses OS-appropriate foreground-service (Android) / background-location (iOS) patterns with clear permission rationale and a persistent notification while online. Ping frequency is adaptive (higher during active trip, lower when idle-online), batched and compressed, with backoff on poor connectivity. The app queues location pings and state transitions offline and flushes them idempotently on reconnect, so a brief tunnel or dead-zone never loses trip state. See Appendix D.

---

## Module 1 — App Bootstrap, Config & White-Label Theming

### MODULE PURPOSE
On launch, fetch the deployment's runtime configuration so the shared Flutter codebase becomes this buyer's branded driver app: theme, languages (incl. RTL), currency, enabled road services, feature flags (incentives, heatmap, wallet), legal documents, and provider public keys (Maps, FCM). Also enforce force-update and maintenance gates.

### SUBMODULES
Config Fetch & Cache, Theme & Branding, Feature-Flag Gating, Localization Bootstrap, Force-Update & Maintenance Gate, Provider Key Injection.

### SCREEN-WISE BREAKDOWN
**1.1 Splash/Bootstrap.** Brand splash while config loads; cached config for warm starts; ErrorState with retry on failure.
**1.2 Force-Update Gate.** Block with store CTA if below minimum version.
**1.3 Maintenance Gate.** Branded maintenance screen if deployment is in maintenance.

### UI COMPONENTS REQUIRED
Branded splash, Skeleton, ErrorState (retry), force-update modal, maintenance screen.

### FIELD-LEVEL SPECIFICATION (config payload)
| Field | Type | Notes |
|---|---|---|
| brand.name/logos/theme_tokens | object | drives UI |
| supported_locales[] | string[] | BCP-47, RTL flags |
| default_locale/currency/timezone | string | formatting |
| enabled_road_services[] | enum[] | cab/bike/rental/outstation |
| feature_flags | object | incentives, heatmap, wallet, sos |
| legal_docs | object | driver terms/privacy versions |
| maps_key (public)/fcm config | string | client-safe only |
| min_app_version/maintenance_mode | string/bool | gating |

### BUSINESS LOGIC
Config fetched at cold start, cached short-TTL, refreshed in background on warm start. Only public keys reach the client. Disabled services never appear in the request flow. Locale resolves: driver preference → device → deployment default. Legal-doc version bumps trigger re-acceptance (Module 20). Force-update/maintenance short-circuit the app.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Unauthenticated | Driver |
|---|---|---|
| driver.config.fetch | ✓ | ✓ |

### API REQUIREMENTS
`GET /driver/config` (public), `GET /driver/legal/{type}` (public).

### DATABASE & ENTITY RELATION
Reads `branding_config`, `system_settings`, `feature_flags`, `legal_documents`. No driver write.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Launch] -> cached config -> fetch /driver/config
   -> maintenance? -> gate ; below min version? -> force-update gate
   -> apply theme+locale+flags -> Auth/Home
   -> fetch fails & no cache -> ErrorState(retry)
```

---

## Module 2 — Authentication & Session

### MODULE PURPOSE
Authenticate drivers via phone OTP, manage secure sessions, register the device for push, and route new vs onboarded vs approved drivers to the correct next step.

### SUBMODULES
Phone+OTP Auth, Session Management, Device Registration (FCM), Routing by Driver State, Account Recovery.

### SCREEN-WISE BREAKDOWN
**2.1 Phone Entry.** Country code + phone; consent (driver terms/privacy) links; continue.
**2.2 OTP Verification.** Fixed-length OTP, auto-read where allowed, resend cooldown, attempt limit.
**2.3 State Router.** After auth, route: not onboarded → Onboarding (Module 3); onboarded pending approval → Pending screen; approved → Home.

### UI COMPONENTS REQUIRED
Phone input + country picker, OtpEntry, consent links, pending-approval screen, ErrorState/Toast.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| phone | string | yes | E.164, unique | identity |
| otp | string | yes | numeric, fixed len, TTL, attempt-limit | server-issued |
| consent_terms/privacy | bool | yes | true | versioned |
| fcm_token | string | system | — | registered on login |
| driver_state | enum | system | pending/approved/active/suspended/deactivated | routing |

### BUSINESS LOGIC
OTP via SMS adapter (buyer-supplied), rate-limited/attempt-capped. On verify, server issues short access JWT + rotating refresh (secure storage). New phone → create driver in `pending` and start onboarding; existing → route by state. Device FCM token registered/refreshed on login. Suspended/deactivated drivers are blocked with a clear message and support link; sessions revoked on suspension.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Unauthenticated | Driver |
|---|---|---|
| driver.auth.otp | ✓ | ✓ |
| driver.session.refresh/logout | n/a | ✓ |
| driver.device.register | n/a | ✓ |

### API REQUIREMENTS
`POST /driver/auth/otp/send` (public), `POST /driver/auth/otp/verify` (public → tokens + state), `POST /driver/auth/refresh`, `POST /driver/auth/logout`, `POST /driver/devices/register`.

### DATABASE & ENTITY RELATION
`drivers (1) — (N) auth_sessions`, `drivers (1) — (N) device_tokens`, `drivers (1) — (1) wallets` (created on approval), `consents`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Phone+consent] -> send OTP -> verify -> existing? route-by-state : create(pending)+onboarding
   -> register FCM token -> (approved -> Home / pending -> Pending screen / suspended -> blocked)
```

---

## Module 3 — Driver Onboarding & Document Submission

### MODULE PURPOSE
Capture everything required to approve a driver: personal details, mandatory documents (license, ID, etc.), vehicle details and documents, and payout/bank details — then submit for the buyer-admin's review. Per the locked decision, **standard documents are mandatory and others optional/configurable**.

### SUBMODULES
Personal Details, Mandatory Documents, Vehicle Details & Documents, Payout/Bank Details, Review & Submit, Resubmission.

### SCREEN-WISE BREAKDOWN
**3.1 Onboarding Wizard.** Steps: (1) Personal info + photo, (2) Mandatory documents (license, ID; others marked optional per config), (3) Vehicle details + vehicle documents (registration, insurance, permit/fitness), (4) Payout/bank details, (5) Review & submit. Progress indicator, save-as-draft, resume.
**3.2 Status/Pending.** Read-only status (Draft → Submitted → In Review → Approved/Rejected) with admin reason on rejection and per-document re-upload.

### UI COMPONENTS REQUIRED
Multi-step wizard, FormBuilder, DocumentUploader (camera + gallery, auto-crop, scan status), photo capture, DocumentStatusBadge, ConfirmDialog (submit), AuditTrailPanel (status history).

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| first_name/last_name | string | yes | 2–40 | — |
| photo | image | yes | format/size, face visible | profile |
| license_no | string | yes (mandatory) | format per region | core doc |
| license_expiry | date | yes | future on approval | gates online |
| id_document | doc | yes (mandatory) | format/size | core doc |
| optional_documents[] | doc | no | per config | buyer-configurable |
| vehicle.* | object | yes | see Module 4 | — |
| payout_account_ref | string | yes | masked, validated | finance |
| status | enum | system | draft/submitted/in_review/approved/rejected | admin-owned |

### BUSINESS LOGIC
The mandatory document set is deployment-configured (core docs required; the rest optional) — the wizard reflects this dynamically. Submission is blocked until all mandatory documents are present with valid (future) expiries. Approval is **admin-owned** (Admin Module 7); the driver cannot self-approve. Rejected documents return with reason for targeted re-upload. On approval, a driver wallet is created and the driver can go online (subject to ongoing compliance). Payout details are write-by-driver, masked on read, used by platform payout runs.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Driver | Notes |
|---|---|---|
| driver.onboarding.fill/submit | ✓ (own) | — |
| driver.onboarding.status.view | ✓ (own) | read-only states |
| (approve/reject) | ✗ | admin-only |

### API REQUIREMENTS
`GET /driver/onboarding`, `PATCH /driver/onboarding` (save draft), `POST /driver/onboarding/documents`, `POST /driver/onboarding/submit`, `GET /driver/onboarding/status`.

### DATABASE & ENTITY RELATION
`drivers (1) — (N) documents`, `drivers (1) — (0..1) vehicles` (active), `drivers (1) — (1) driver_payout_details`. Status on `drivers.status`; admin owns transitions.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Wizard] draft -> personal + mandatory docs + vehicle + payout -> validate mandatory complete -> submit
[Admin reviews] -> approved -> wallet created -> can go online ; rejected(reason) -> targeted re-upload
```

---

## Module 4 — Vehicle Management (Driver-Side)

### MODULE PURPOSE
Let a driver register and maintain the vehicle(s) they operate, upload vehicle documents, and keep them compliant. Vehicle class determines which ride requests the driver is eligible for.

### SUBMODULES
Vehicle Details, Vehicle Documents, Vehicle Class, Active Vehicle Selection (if multiple), Compliance Status.

### SCREEN-WISE BREAKDOWN
**4.1 Vehicle Detail.** Plate, make/model/year, color, class; documents (registration, insurance, permit, fitness) with status/expiry; photos.
**4.2 Active Vehicle.** If the driver has more than one, choose the active vehicle for the session.
**4.3 Compliance.** Banner listing any blocking vehicle issue (expired doc) that prevents going online.

### UI COMPONENTS REQUIRED
FormBuilder, DocumentUploader, DocumentStatusBadge, vehicle photo uploader, active-vehicle selector, ComplianceBanner.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| plate_no | string | yes | unique (platform), region format | — |
| make/model/year | string/int | yes | year ≤ current | — |
| color | string | no | — | — |
| vehicle_class_id | UUID | yes | exists/active | eligibility |
| registration/insurance/permit/fitness | doc | mandatory subset per config | future expiry | gates online |
| photos[] | image | no | format/size | — |
| is_active | bool | system | one active at a time | session |

### BUSINESS LOGIC
Vehicle class (set/approved against the catalog) determines which requests the driver receives. A vehicle with any expired mandatory document blocks the driver from going online (compliance gate recomputed server-side). If the driver operates multiple vehicles, exactly one is active per session and its class governs eligibility. Vehicle additions/changes may require admin re-review depending on buyer policy.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Driver | Notes |
|---|---|---|
| driver.vehicle.view/edit | ✓ (own) | — |
| driver.vehicle.documents.upload | ✓ (own) | — |
| driver.vehicle.set_active | ✓ (own) | — |

### API REQUIREMENTS
`GET /driver/vehicles`, `POST /driver/vehicles`, `PATCH /driver/vehicles/{id}`, `POST /driver/vehicles/{id}/documents`, `POST /driver/vehicles/{id}/set-active`.

### DATABASE & ENTITY RELATION
`vehicles (N) — (1) drivers` (or via vendor), `vehicles (N) — (1) vehicle_classes`, `vehicles (1) — (N) documents`, `vehicles (1) — (N) vehicle_photos`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Add/edit vehicle] -> details + class + docs -> (admin re-review if policy) -> compliant?
   -> set active -> class drives request eligibility
[Doc expiry] -> compliance gate -> block online until renewed
```

---

## Module 5 — Home, Online/Offline & Availability

### MODULE PURPOSE
The driver's command center: go online/offline, see current availability and earnings glance, and be ready to receive ride requests. Going online is gated by compliance and triggers the location engine.

### SUBMODULES
Online Toggle, Availability State, Today's Glance (earnings/trips), Active Job Entry, Go-Online Pre-Checks.

### SCREEN-WISE BREAKDOWN
**5.1 Home.** Big online/offline toggle; current state (offline / online-idle / on-trip); today's earnings + completed trips glance; active-job card if any; compliance banner if blocked; quick link to heatmap (if enabled).
**5.2 Go-Online Pre-Check.** If blocked (expired docs, no active vehicle, suspended), show reason and resolution path instead of toggling online.

### UI COMPONENTS REQUIRED
OnlineToggle (prominent), state indicator, EarningsCard (glance), active-job banner, ComplianceBanner, heatmap shortcut, ConfirmDialog (go offline mid-incentive).

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| online_status | enum | offline/online_idle/on_trip |
| today_earnings_minor | int | server glance |
| today_trips | int | count |
| can_go_online | bool | compliance + vehicle + status |
| block_reason | string | shown when blocked |

### BUSINESS LOGIC
Toggling online runs a server-side pre-check: driver `active`/`approved`, all mandatory driver + active-vehicle documents valid, not suspended. If any fail, the toggle is blocked with the specific reason and a resolution link. Going online starts the location engine (Module 6) and subscribes to the request channel; going offline stops high-frequency location and unsubscribes (after completing any active trip — a driver cannot abandon an in-progress trip by going offline). Online status is reflected to dispatch in real time.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Driver | Notes |
|---|---|---|
| driver.availability.toggle | ✓ (own, if compliant) | — |
| driver.home.view | ✓ (own) | — |

### API REQUIREMENTS
`POST /driver/availability/online` (pre-checked server-side), `POST /driver/availability/offline`, `GET /driver/home` (glance + state + can_go_online + block_reason), Socket.IO presence.

### DATABASE & ENTITY RELATION
`drivers.online_status`, `drivers.last_location`; reads `documents` and active `vehicle` for the gate; today glance from `bookings`/`ledger_entries`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Toggle online] -> server pre-check (status+docs+vehicle)
   -> pass -> online_idle -> start location engine + subscribe requests
   -> fail -> block(reason) + resolution link
[Toggle offline] -> on active trip? -> block until trip ends : online->offline -> stop high-freq location
```

---

## Module 6 — Location Engine & Background Tracking

### MODULE PURPOSE
Stream the driver's location reliably and efficiently to power dispatch eligibility, customer tracking, ETA, and trip telemetry — while respecting battery, OS background rules, and connectivity realities. This is the backbone of the supply side.

### SUBMODULES
Permission & Foreground Service, Adaptive Ping Strategy, Telemetry Capture, Offline Queue & Flush, Plausibility & Smoothing (server), Privacy Controls.

### SCREEN-WISE BREAKDOWN
**6.1 Permission Priming.** Clear rationale before requesting always/background location; explain the persistent notification while online.
**6.2 (Background, no dedicated screen).** Persistent OS notification while online; status reflected on Home.

### UI COMPONENTS REQUIRED
Permission-priming sheet, persistent foreground notification (Android) / background indicator (iOS), connectivity indicator on Home/active trip.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| ping.lat/lng | decimal | location |
| ping.heading/speed/accuracy | decimal | for smoothing/plausibility |
| ping.ts | datetime | client time (server re-stamps) |
| ping.booking_id | UUID | when on-trip (telemetry) |
| ping_interval | int | adaptive (trip vs idle) |
| queued_pings[] | array | offline buffer |

### BUSINESS LOGIC
Location uses a foreground service (Android) and appropriate background mode (iOS) with explicit permission and a persistent notification while online — never covert tracking. Ping frequency is adaptive: higher during an active trip (for accurate tracking/telemetry), lower when idle-online (battery), and paused when offline. Pings are batched/compressed and sent over a dedicated channel; on connectivity loss they queue locally and flush idempotently on reconnect (ordered, de-duplicated). The **server** performs plausibility checks (implausible speed/jumps dropped/smoothed) and zone tagging; the client does not decide eligibility. Telemetry during a trip is the basis for the server's final fare. Location collection stops when offline; privacy disclosures align with GDPR.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Driver | Notes |
|---|---|---|
| driver.location.ping | ✓ (own, while online) | high-frequency |

### API REQUIREMENTS
`POST /driver/location/ping` (batched), or Socket.IO `driver.location` channel; server re-broadcasts to `app.tracking.{bookingId}` for the customer. Pings rejected if driver offline or implausible.

### DATABASE & ENTITY RELATION
`drivers.last_location` (cache/Postgis), trip telemetry stored/referenced for `trips`; ephemeral live location in Redis. Plausibility/zone handled server-side using `service_zones`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Go online] -> permission ok? -> start foreground service -> adaptive pings
   -> on-trip? high freq (telemetry) : idle low freq
   -> connectivity lost -> queue pings -> reconnect -> flush (idempotent, ordered)
   -> server: plausibility + zone tag -> update last_location -> rebroadcast to customer
[Go offline] -> stop high-freq location
```

---

## Module 7 — Ride Request & Dispatch Handling

### MODULE PURPOSE
Deliver inbound ride requests to an online, eligible driver reliably and let them accept or reject within the TTL. This is the moment that converts supply into a trip; missing or mishandling it is costly, so delivery is redundant and state is concurrency-safe.

### SUBMODULES
Request Delivery (Socket.IO + FCM), Request Card & Countdown, Accept/Reject, Auto-Expiry, Concurrency Safety, Post-Accept Handoff.

### SCREEN-WISE BREAKDOWN
**7.1 Ride Request (full-screen takeover).** Pickup, drop (or area), distance to pickup, estimated trip distance, estimated earning, service type, and a prominent countdown; Accept / Reject; sound + haptic alert.
**7.2 Accepted Handoff.** On accept, transition to active trip (Module 8) with navigation to pickup.

### UI COMPONENTS REQUIRED
RideRequestCard (full-screen), CountdownTimer, accept/reject buttons (large targets), sound/haptic alert, map preview of pickup, MoneyText (estimated earning).

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| request.booking_id | UUID | scope |
| request.service_subtype | enum | cab/bike/rental/outstation |
| request.pickup/drop | geo+addr | drop may be hidden until accept per policy |
| request.distance_to_pickup | decimal | for decision |
| request.est_trip_distance | decimal | estimate |
| request.est_earning_minor | int | server-estimated |
| request.ttl_expires_at | datetime | countdown |

### BUSINESS LOGIC
Requests are pushed redundantly over Socket.IO and a high-priority FCM data message so the driver sees them even if the socket dropped. Each request has a server TTL; on expiry it falls through to the next driver (server-driven). Accept is **concurrency-safe**: the server uses an atomic transition so the first accept wins; a late accept returns "no longer available." Eligibility (online, not on trip, docs valid, class match, zone, radius) was computed server-side before the request reached this driver, and is re-validated at accept. Rejections (and timeouts) feed the driver's acceptance-rate metric. Whether the full drop address is shown before accept is a buyer policy toggle.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Driver | Notes |
|---|---|---|
| driver.request.receive | ✓ (own, while online) | — |
| driver.request.accept/reject | ✓ (own) | atomic |

### API REQUIREMENTS
Socket.IO `driver.requests.{driverId}` + FCM fallback; `POST /driver/requests/{id}/accept` (Idempotency-Key, atomic), `POST /driver/requests/{id}/reject`.

### DATABASE & ENTITY RELATION
Reads `bookings` (routed), writes `dispatch_events` (ping/accept/reject/timeout); on accept sets `bookings.driver_id` atomically and locks the driver to the trip.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Request pushed (socket+FCM)] -> full-screen card + countdown + alert
   -> Accept -> atomic claim (first wins) -> assigned -> Active Trip (Module 8)
              -> late/lost -> "no longer available"
   -> Reject / TTL expire -> server routes to next driver -> affects acceptance rate
```

---

## Module 8 — Active Trip Execution (Navigation & Lifecycle)

### MODULE PURPOSE
Guide the driver through the full on-demand trip lifecycle: navigate to pickup, mark arrival, verify the start-OTP, run the trip with navigation and (where allowed) stops/waiting, and end the trip — feeding the server's final-fare computation and the customer's tracking.

### SUBMODULES
Navigate to Pickup, Arrived & Wait, Start (OTP), In-Trip Navigation, Add Stop / Waiting, End Trip, Cash Collection (if applicable), Completion Summary.

### SCREEN-WISE BREAKDOWN
**8.1 To Pickup.** Map nav to pickup (in-app turn-by-turn or deep-link to Google Maps/Waze), customer name/contact (masked per policy; v1 no masking — limited PII), call/chat, "Arrived."
**8.2 Arrived.** Notify customer; waiting timer (free allowance then chargeable); OtpEntry to start.
**8.3 In-Trip.** Nav to drop; live status; add-stop (if allowed); waiting; "End Trip."
**8.4 End.** For cash, show amount to collect; confirm; completion summary with earning breakdown; prompt to rate customer.

### UI COMPONENTS REQUIRED
NavMap / external-nav deep link, TripActionBar (arrived/start/end/stops), OtpEntry, waiting timer, call/chat, add-stop control, cash-collection sheet, EarningsBreakdownSheet, RatingSheet (rate customer), SosButton.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| trip.status | enum | transitions | accepted/arrived/in_progress/completed | state machine |
| start_otp | string | yes to start | matches server (attempt-limited) | from customer |
| waiting_min | int | system | free allowance then charged | telemetry |
| stops[] | geo[] | if allowed | in zone | recompute fare |
| cash_collected_minor | int | cash trips | equals server amount | confirm |
| final_fare_minor | int | system | server-computed | read-only |
| earning_minor | int | system | server-computed | after commission |

### BUSINESS LOGIC
Navigation is via in-app Google Maps or a deep link to an external nav app (driver preference). Arrival notifies the customer and starts the waiting allowance; excess waiting is chargeable per rules. The trip can only start when the driver enters the **correct customer OTP** (attempt-limited; mismatch escalates to support flow) — this prevents wrong-pickup and fraud. Add-stop/waiting recompute the fare server-side. On End, the server computes the final fare from telemetry (distance, time, waiting, stops, surge, tolls); the app shows the breakdown and the driver's earning (after commission). For cash trips, the displayed collection amount equals the server fare; the platform's commission on cash is deducted from the driver wallet (may go negative within threshold). The driver cannot edit fares. Completion prompts the driver to rate the customer.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Driver | Notes |
|---|---|---|
| driver.trip.view/update | ✓ (own active trip) | state transitions |
| driver.trip.add_stop | ✓ (if allowed) | recompute |
| driver.trip.rate_customer | ✓ (own completed) | — |

### API REQUIREMENTS
`POST /driver/trips/{id}/arrived`, `POST /driver/trips/{id}/start` (OTP), `POST /driver/trips/{id}/add-stop`, `POST /driver/trips/{id}/waiting`, `POST /driver/trips/{id}/end`, `POST /driver/trips/{id}/cash-collected`, `POST /driver/trips/{id}/rate-customer`, Socket.IO `driver.trip.{id}`.

### DATABASE & ENTITY RELATION
`trips (1) — (1) bookings`, telemetry referenced; `fare_breakups` on completion; `ledger_entries` post earning/commission; `ratings` (driver→customer).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Accepted] -> nav to pickup -> Arrived (notify + waiting allowance)
   -> enter customer OTP (match? attempt-limited) -> Start (in_progress)
   -> nav to drop (+stops/waiting recompute) -> End
   -> server final fare -> earning(after commission) ; cash? collect=server amount, debit commission
   -> completion summary -> rate customer
```

---

## Module 9 — Rental & Outstation Trip Handling

### MODULE PURPOSE
Handle the driver-side execution differences for Rental (package + excess) and Outstation (intercity, multi-day, allowances, night-halt) trips, which run longer and have distinct billing.

### SUBMODULES
Rental Execution (package tracking), Outstation Execution (legs, allowances), Excess & Extras Capture, Multi-Day Handling.

### SCREEN-WISE BREAKDOWN
**9.1 Rental Trip.** Package details (hours/km included), live usage vs package, prompt when nearing limits, end with excess summary.
**9.2 Outstation Trip.** Trip legs (outbound/return), day-wise progress, night-halt acknowledgment, allowances display, end with full breakdown.

### UI COMPONENTS REQUIRED
Package usage gauge, leg/day progress, night-halt acknowledgment, allowance display, EarningsBreakdownSheet, TripActionBar.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| rental.package | object | rental | active | hours/km included |
| rental.usage | object | system | telemetry | hours/km used |
| outstation.legs[] | object[] | outstation | feasible | outbound/return |
| night_halt | bool | system/ack | overnight | charge applies |
| allowances_minor | int | system | per rules | driver allowance |
| excess_minor | int | system | computed | beyond package |

### BUSINESS LOGIC
Rental usage is tracked against the package; the driver is prompted as limits approach; excess (per-hour/per-km) is computed server-side at end. Outstation runs across legs/days with driver allowance and night-halt charges per rules; the app surfaces day-wise progress and prompts for night-halt acknowledgment. All amounts are server-computed; the driver confirms operational facts (e.g., halt) but never edits money. Multi-day trips keep the trip active across days with persistent telemetry and offline tolerance.

### ROLE-BASED ACCESS CONTROL (RBAC)
Same as Module 8 (own active trip), plus driver.trip.ack_nighthalt.

### API REQUIREMENTS
Reuses trip lifecycle endpoints with rental/outstation context; `POST /driver/trips/{id}/night-halt-ack`, `GET /driver/trips/{id}/usage`.

### DATABASE & ENTITY RELATION
Booking spine; `rental_packages`/`outstation_slabs` via pricing snapshot; telemetry on `trips`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Rental] track usage vs package -> near limit prompt -> end -> server excess -> earning
[Outstation] run legs/days -> night-halt ack -> allowances -> end -> server breakdown -> earning
```

---

## Module 10 — Scheduled Rides (Driver-Side)

### MODULE PURPOSE
Surface scheduled rides assigned to (or offered to) the driver ahead of time, with reminders and the ability to prepare, so scheduled demand is reliably fulfilled.

### SUBMODULES
Upcoming Scheduled List, Reminders, Pre-Trip Readiness, Accept/Decline (if offered).

### SCREEN-WISE BREAKDOWN
**10.1 Upcoming.** List of scheduled rides (time, pickup, service, estimated earning); reminder badges.
**10.2 Pre-Trip.** Near the scheduled time, a prompt to head to pickup; transitions into the normal active-trip flow.

### UI COMPONENTS REQUIRED
Scheduled-ride list, reminder badges, pre-trip prompt, accept/decline (if offered model), CountdownTimer.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| scheduled_at | datetime | localized display |
| lead_prompt_offset | int | when to prompt |
| est_earning_minor | int | server estimate |
| assignment_type | enum | pre-assigned / offered |

### BUSINESS LOGIC
Depending on buyer policy, scheduled rides are either pre-assigned to a driver ahead of time or offered at trigger time via the normal request flow. The app reminds the driver ahead of the scheduled time and, at the lead offset, prompts them to begin heading to pickup, then hands into the standard active-trip lifecycle (Module 8). If a pre-assigned driver becomes unavailable, the server re-dispatches.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.scheduled.view (own), driver.scheduled.accept/decline (if offered).

### API REQUIREMENTS
`GET /driver/scheduled`, `POST /driver/scheduled/{id}/accept`, `POST /driver/scheduled/{id}/decline`.

### DATABASE & ENTITY RELATION
`bookings` with `scheduled_at` and assigned `driver_id` (pre-assign) or routed at trigger; reminders reference booking.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Upcoming list] -> reminders fire
[Trigger - lead] -> prompt to pickup -> active trip flow
[Pre-assigned driver unavailable] -> server re-dispatch
```

---

## Module 11 — Cancellations & No-Shows (Driver-Side)

### MODULE PURPOSE
Let drivers cancel under permitted conditions and report customer no-shows fairly, with rules that protect both the driver and the customer and that feed the driver's standing.

### SUBMODULES
Driver Cancellation, Customer No-Show, Reason Capture, Consequence Disclosure.

### SCREEN-WISE BREAKDOWN
**11.1 Cancel.** Reason picker; disclosure of any consequence to driver standing/penalty; confirm.
**11.2 No-Show.** After arrival + waiting elapsed, report no-show; system applies no-show rules (customer fee / driver compensation per policy).

### UI COMPONENTS REQUIRED
Reason selector, consequence disclosure sheet, no-show CTA (enabled only after waiting threshold), ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| cancel_reason | enum+text | yes | from set | — |
| no_show | bool | conditional | after waiting threshold | — |
| consequence | object | system | penalty/compensation | disclosed |

### BUSINESS LOGIC
Driver cancellation is permitted only in legal states (accepted/arrived) and may carry a penalty (affecting cancellation-rate metric and possibly earnings) per rules — disclosed before confirm. A no-show can only be reported after arrival and the waiting threshold; the server applies the configured no-show outcome (customer fee, driver compensation). Excessive driver cancellations auto-flag for review (Module 15). All actions notify the customer and are server-recorded.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.trip.cancel (own, legal states), driver.trip.no_show (own, after threshold).

### API REQUIREMENTS
`GET /driver/trips/{id}/cancel-preview`, `POST /driver/trips/{id}/cancel`, `POST /driver/trips/{id}/no-show`.

### DATABASE & ENTITY RELATION
Writes booking status + `dispatch_events`; consequences via `ledger_entries`; metrics update driver standing.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Cancel] -> legal state? -> reason -> disclose consequence -> confirm -> notify customer -> metric update
[No-show] -> arrived + waiting elapsed? -> report -> apply rules (fee/comp) -> notify
```

---

## Module 12 — Earnings & Trip History

### MODULE PURPOSE
Give drivers transparent, trustworthy visibility into what they earn per trip and over time, with full breakdowns and a complete trip history — the single biggest driver-trust feature.

### SUBMODULES
Earnings Summary (day/week/month), Per-Trip Breakdown, Trip History, Adjustments & Tips, Statements.

### SCREEN-WISE BREAKDOWN
**12.1 Earnings.** Toggle day/week/month; total earning, trips, online hours, acceptance; chart of earnings over the period.
**12.2 Trip History.** List of completed trips with fare, earning, date, route; filters (date, service).
**12.3 Trip Earning Detail.** Itemized breakdown (fare components, commission, tips, incentives, net), receipt.

### UI COMPONENTS REQUIRED
EarningsCard, period toggle, TrendChart, trip history list with filters, EarningsBreakdownSheet, statement export.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| period earning_minor | int | server aggregate |
| trips_count / online_hours | int/decimal | period |
| trip.fare_minor / commission_minor / tip_minor / incentive_minor / net_minor | int | breakdown |
| filters | enum/date | service/date range |

### BUSINESS LOGIC
All earnings figures are server-authoritative and reconcile to the ledger. Per-trip breakdown shows fare, platform commission, tips, incentives, and net — fully transparent. History is ownership-scoped and paginated. Adjustments (e.g., post-trip refund clawbacks) appear clearly with reasons. Statements are downloadable and tax-aligned per deployment.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.earnings.view, driver.history.view (own).

### API REQUIREMENTS
`GET /driver/earnings?window=`, `GET /driver/trips?from=&to=&service=`, `GET /driver/trips/{id}/earning`, `GET /driver/statements`.

### DATABASE & ENTITY RELATION
Reads `bookings`/`trips`/`fare_breakups` (own) and `ledger_entries`/`wallet_transactions` for earnings.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Earnings] -> pick period -> server aggregate (ledger) -> totals + chart
[History] -> filter -> list -> trip earning detail (itemized) -> statement export
```

---

## Module 13 — Payouts & Driver Wallet

### MODULE PURPOSE
Manage the driver's money out: wallet balance (including negative balance from cash-trip commissions), payout requests/cadence, payout history, and bank details — with the platform owning the actual disbursement.

### SUBMODULES
Wallet Balance, Payout Request (if on-demand) / Cadence View, Payout History, Bank/Payout Details, Negative Balance Handling.

### SCREEN-WISE BREAKDOWN
**13.1 Wallet.** Balance (can be negative within threshold), recent transactions, settle-negative CTA if applicable.
**13.2 Payouts.** Upcoming payout (by cadence) or request payout (if on-demand enabled); history with status.
**13.3 Bank Details.** Manage masked payout account.

### UI COMPONENTS REQUIRED
WalletCard (handles negative), transaction list, PayoutCard, request-payout CTA (conditional), bank details form (masked), StatusBadge.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| balance_minor | int | system | ≥ negative threshold | cash commission can make negative |
| payout_cadence | enum | system | from config | daily/weekly/etc |
| payout.status | enum | system | pending/approved/paid/failed | admin-owned disbursement |
| settle_amount_minor | int | conditional | if negative | settle dues |
| payout_account_ref | string | yes | masked, validated | — |

### BUSINESS LOGIC
The driver wallet is a ledger account that may go negative up to a configured threshold (driven by commission owed on cash trips); beyond threshold the driver may be prompted to settle and could be restricted from going online per policy. Payouts run on the deployment's cadence (or on-demand if enabled); disbursement is **platform/admin-owned** (Admin Module 16) — the driver sees status but cannot self-pay. Bank details are write-by-driver, masked on read. All movements are double-entry journaled server-side.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.wallet.view, driver.payout.view/request (own), driver.bank.manage (own).

### API REQUIREMENTS
`GET /driver/wallet`, `GET /driver/wallet/transactions`, `GET /driver/payouts`, `POST /driver/payouts/request` (if on-demand), `PATCH /driver/payout-details`, `POST /driver/wallet/settle` (negative).

### DATABASE & ENTITY RELATION
`wallets (1) — (1) drivers`, `wallets (1) — (N) wallet_transactions`; reads platform `payouts`/`payout_line_items` filtered to driver; balances derive from `ledger_entries`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Cash trip] -> commission debits wallet (may go negative)
[Negative beyond threshold] -> prompt settle -> (policy) restrict online
[Payout] cadence/on-demand -> admin disburses -> driver sees status (pending->paid)
```

---

## Module 14 — Incentives, Bonuses & Heatmap

### MODULE PURPOSE
Drive supply behavior with incentive programs (e.g., complete N trips for a bonus), surge/peak awareness, and a demand heatmap so drivers position themselves where demand is — all configurable per deployment and gated by feature flags.

### SUBMODULES
Active Incentives, Progress Tracking, Heatmap (demand), Surge Awareness, Bonus History.

### SCREEN-WISE BREAKDOWN
**14.1 Incentives.** Active programs with rules and live progress (e.g., 7/10 trips); reward amount; expiry.
**14.2 Heatmap.** Map overlay of high-demand zones (if enabled), optionally with surge indicators.

### UI COMPONENTS REQUIRED
Incentive progress cards, HeatmapOverlay on map, surge indicators, bonus history list.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| incentive.rule | object | trips/hours/zone conditions |
| incentive.progress | object | live progress |
| incentive.reward_minor | int | payout on completion |
| heatmap.cells[] | geo+intensity | demand intensity |
| surge.zones[] | geo+multiplier | if applicable |

### BUSINESS LOGIC
Incentive rules and progress are computed server-side; the app displays progress and credits the reward (to wallet) when conditions are met. Heatmap intensity is derived server-side from live demand/supply and shown only if the feature flag is on. Surge awareness shows where multipliers apply (disclosed transparently). Bonus history shows earned/missed programs.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.incentives.view, driver.heatmap.view (own/flagged).

### API REQUIREMENTS
`GET /driver/incentives`, `GET /driver/incentives/history`, `GET /driver/heatmap?bounds=` (if enabled), `GET /driver/surge?bounds=`.

### DATABASE & ENTITY RELATION
`incentive_programs`, `incentive_progress (driver_id)`, rewards → `wallet_transactions`. Heatmap/surge derived from live demand and `surge_configs`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Active incentive] -> track progress (server) -> condition met -> credit reward (wallet)
[Heatmap] (if flagged) -> show demand intensity -> driver positions -> more requests
```

---

## Module 15 — Performance, Ratings & Standing

### MODULE PURPOSE
Show drivers their performance metrics (acceptance rate, cancellation rate, rating, completion) and their standing, with guidance to improve and visibility into any flags or required actions.

### SUBMODULES
Performance Dashboard, Ratings Received, Standing & Flags, Improvement Guidance.

### SCREEN-WISE BREAKDOWN
**15.1 Performance.** Gauges for acceptance rate, cancellation rate, average rating, completion rate; trend over time.
**15.2 Ratings.** Recent ratings/feedback tags received from customers.
**15.3 Standing.** Current standing; any flags (low rating, high cancellation) with required actions/timeline.

### UI COMPONENTS REQUIRED
PerformanceGauge set, TrendChart, ratings/feedback list, standing/flags panel, guidance cards.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| acceptance_rate / cancellation_rate / completion_rate | decimal | rolling |
| rating_avg | decimal | 1–5 rolling |
| recent_ratings[] | object[] | stars + tags |
| standing | enum | good/watch/flagged |
| required_actions[] | object[] | if flagged |

### BUSINESS LOGIC
Metrics are computed server-side on rolling windows. Falling below configured thresholds (rating, cancellation) flags the driver for review (admin) and surfaces required actions and timelines in-app. Ratings shown are aggregate/representative (individual customer identity minimized per privacy). Standing affects eligibility/priority per buyer policy.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.performance.view, driver.ratings.view (own).

### API REQUIREMENTS
`GET /driver/performance`, `GET /driver/ratings`, `GET /driver/standing`.

### DATABASE & ENTITY RELATION
Reads `ratings`, `bookings`/`dispatch_events` aggregates; standing/flags in `driver_flags`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Performance] -> server rolling metrics -> gauges + trend
[Below threshold] -> flag -> show required actions/timeline -> admin review
```

---

## Module 16 — Documents & Compliance (Driver-Side)

### MODULE PURPOSE
Keep the driver compliant over time: view all documents (driver + vehicle), see expiry status, renew/re-upload, and understand exactly what is blocking them from going online — mirroring the admin KYC/compliance module from the driver's side.

### SUBMODULES
Document Repository, Expiry Alerts, Renewal Upload, Compliance Status & Blockers.

### SCREEN-WISE BREAKDOWN
**16.1 Documents.** All driver and vehicle documents with type, status, expiry, preview.
**16.2 Expiry Alerts.** Documents expiring soon with renew CTA.
**16.3 Compliance Status.** Clear list of what's blocking online status (expired/rejected docs) with resolution steps.

### UI COMPONENTS REQUIRED
Document list, DocumentUploader (renewal), DocumentStatusBadge, expiry alerts, ComplianceBanner with blockers.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| doc_type | enum | — | from set | driver/vehicle |
| status | enum | system | uploaded/in_review/approved/rejected/expired | admin reviews |
| expiry_date | date | on approve | future | drives alerts/gate |
| blocker | bool | system | — | blocks online |

### BUSINESS LOGIC
Renewals enter review (admin reviews per Admin Module 20, unless self-approval enabled by buyer). Expiry auto-flips status to expired and **auto-blocks going online** until renewed/approved. The compliance status screen aggregates all current blockers and tells the driver exactly what to do. Reminders fire ahead of expiry via notifications.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.documents.view, driver.documents.upload (own).

### API REQUIREMENTS
`GET /driver/documents`, `POST /driver/documents` (renewal), `GET /driver/compliance` (blockers + status).

### DATABASE & ENTITY RELATION
`documents` (driver + vehicle, own); compliance derived from documents + vehicle + driver status.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Upload renewal] -> scan -> in_review -> admin approve(set expiry)/reject
[Expiry job] -> expired -> block online -> compliance banner -> renew -> approved -> unblock
```

---

## Module 17 — Notifications & Notification Center

### MODULE PURPOSE
Deliver and surface driver-relevant notifications (ride requests handled in Module 7; here: earnings, payouts, document expiry, incentives, standing, announcements) via FCM push and in-app center, with preferences.

### SUBMODULES
Push Handling (FCM), In-App Center, Deep-Linking, Preferences, Critical-Alert Handling.

### SCREEN-WISE BREAKDOWN
**17.1 Notification Center.** Feed with read/unread, type filters; tap → deep link.
**17.2 Permission Priming.** Soft-ask before OS push permission.

### UI COMPONENTS REQUIRED
NotificationFeed, unread badges, filters, permission-priming sheet, deep-link router.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| notification.type | enum | earnings/payout/document/incentive/standing/announcement |
| notification.deeplink | string | target |
| notification.status | enum | delivered/read |

### BUSINESS LOGIC
Push via FCM (buyer Firebase project). Critical operational alerts (document expiring/expired → online blocked, payout failed) are high-priority and bypass quiet hours; promotional/announcement notifications respect preferences. Ride requests are a separate high-priority path (Module 7). Each notification deep-links to the relevant screen; delivery/read tracked.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.notifications.view, driver.preferences.manage (own).

### API REQUIREMENTS
`POST /driver/devices/register` (token), `GET /driver/notifications`, `POST /driver/notifications/{id}/read`, `PATCH /driver/preferences`. Socket.IO `driver.notifications.{driverId}`.

### DATABASE & ENTITY RELATION
`notifications` (own), `device_tokens`, `preferences`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Login] -> register FCM token
[Event] -> resolve recipient -> push + in-app feed
   -> critical (compliance/payout)? bypass quiet hours : respect prefs
[Tap] -> deep link
```

---

## Module 18 — In-Trip Safety & SOS

### MODULE PURPOSE
Give drivers always-available safety tools during a trip: SOS, share-trip with a trusted contact, and quick help — symmetric to the customer's safety features.

### SUBMODULES
SOS Trigger, Share Trip, Emergency Contacts, Safety Center.

### SCREEN-WISE BREAKDOWN
**18.1 In-Trip Safety.** SOS button (confirm), share-trip link, emergency contact quick-dial — visible on active-trip screens.
**18.2 Safety Center.** Safety info, configured emergency number (deployment-specific), settings.

### UI COMPONENTS REQUIRED
SosButton (confirm), share-trip sheet, emergency contacts quick-dial, safety info page.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| sos.booking_id | UUID | active trip |
| sos.location | geo | current |
| share_link | string | tokenized, time-limited |
| emergency_number | string | deployment-configured |

### BUSINESS LOGIC
SOS captures location + trip context and alerts the configured channel (admin/dispatcher and/or local emergency number per deployment — no false guarantee of emergency-service integration; behavior disclosed). Share-trip generates a tokenized, time-limited link for a trusted contact. Emergency contacts (from profile) are one-tap. All SOS events logged.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.safety.sos / driver.safety.share (own active trip).

### API REQUIREMENTS
`POST /driver/safety/sos`, `POST /driver/trips/{id}/share`, `GET /driver/safety/info`.

### DATABASE & ENTITY RELATION
`sos_events (booking_id, driver_id, location, ts)`, short-lived share tokens; reads emergency contacts.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Trip active] -> SOS(confirm) -> capture location+context -> alert configured channel -> log
[Share trip] -> tokenized time-limited link -> share
```

---

## Module 19 — Support & Help

### MODULE PURPOSE
Let drivers find answers (FAQ), raise support tickets (optionally pre-linked to a trip or document issue), track resolution, and chat with support — feeding the Admin Support console.

### SUBMODULES
Help Center/FAQ, Raise Ticket, My Tickets, In-App Chat.

### SCREEN-WISE BREAKDOWN
**19.1 Help Center.** Searchable FAQ by category (earnings, documents, trips, payouts).
**19.2 Raise Ticket.** Category, description, optional trip/document link, attachments.
**19.3 My Tickets.** List + detail with status timeline and message thread.

### UI COMPONENTS REQUIRED
FAQ search/list, ticket form (FormBuilder + DocumentUploader), ticket list, CommentThread, StatusBadge.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| category | enum | yes | from set | routes queue |
| description | text | yes | ≤2000, sanitized | — |
| linked_trip_id | UUID | no | own trip | context |
| attachments[] | file | no | type/size, scanned | — |
| status | enum | system | open/in_progress/resolved/closed | — |

### BUSINESS LOGIC
Tickets flow into the Admin Support module with SLA tracking. Trip/document-linked tickets pre-attach context. Drivers see status and reply until closed; closing may prompt CSAT. FAQ content is deployment-configurable. High-impact issues (can't go online, payout failure) can be prioritized.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.faq.view, driver.ticket.create/view/reply (own).

### API REQUIREMENTS
`GET /driver/faq`, `POST /driver/tickets`, `GET /driver/tickets`, `GET /driver/tickets/{id}`, `POST /driver/tickets/{id}/messages`.

### DATABASE & ENTITY RELATION
`tickets (N) — (1) drivers`, `(N) — (0..1) bookings`, `tickets (1) — (N) ticket_messages`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[FAQ] -> search -> resolve or raise ticket
[Raise] -> category + desc (+trip/doc) -> submit -> Admin queue (SLA)
[Track] -> status timeline + replies -> resolved/closed (CSAT)
```

---

## Module 20 — Profile, Settings, Language (i18n/RTL) & Privacy

### MODULE PURPOSE
Let drivers manage profile, emergency contacts, language (full i18n incl. RTL), navigation preference, notification preferences, legal documents, and GDPR rights (data export, account deletion, consents).

### SUBMODULES
Profile Info, Emergency Contacts, Language & Region, Navigation Preference, Notification Preferences, Legal Documents, GDPR Data Export/Deletion, Consents, Logout.

### SCREEN-WISE BREAKDOWN
**20.1 Profile.** Name, photo, phone (change via OTP), email (optional), language.
**20.2 Emergency Contacts.** Add/edit contacts for SOS/share.
**20.3 Preferences.** Language (RTL live), preferred nav app (in-app/Google/Waze), notification channels + quiet hours.
**20.4 Legal & Privacy.** Driver terms/privacy (versioned, re-accept on update); data export; account deletion (typed confirm); consents.
**20.5 Logout.**

### UI COMPONENTS REQUIRED
FormBuilder, avatar uploader, contacts list, language picker, nav-app selector, preference toggles, legal viewer, data-export request, delete-account flow (typed confirm), logout CTA.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| name | string | yes | 2–80 | — |
| phone change | string | via OTP | E.164 | re-verify |
| email | string | no | RFC-5322 | optional |
| locale | string | yes | supported, RTL flag | live apply |
| nav_preference | enum | no | in_app/google/waze | deep-link target |
| consent_marketing | bool | no | — | editable |
| account_delete_request | action | typed confirm | GDPR | anonymize + retain financial |

### BUSINESS LOGIC
Phone change requires OTP re-verification. Language switching applies live and flips layout for RTL; all strings externalized (i18n required from launch). Nav preference governs whether navigation is in-app or deep-links to an external app. Legal-doc version bumps force re-acceptance. GDPR: data export compiles the driver's data; account deletion anonymizes PII while retaining legally required financial/earnings records (configurable retention) and is typed-confirmation. Consents versioned and editable. Note: a driver with outstanding negative wallet balance or active trips may be blocked from deletion until settled, with a clear message.

### ROLE-BASED ACCESS CONTROL (RBAC)
driver.profile.view/edit, driver.contacts.manage, driver.settings.manage, driver.privacy.export/delete, driver.consent.manage (own).

### API REQUIREMENTS
`GET/PATCH /driver/me`, `POST /driver/me/phone/change` (OTP), `GET/POST/DELETE /driver/me/emergency-contacts`, `PATCH /driver/me/preferences`, `GET /driver/legal/{type}`, `POST /driver/me/legal/accept`, `POST /driver/me/privacy/export`, `POST /driver/me/privacy/delete`, `GET/POST /driver/me/consents`, `POST /driver/auth/logout`.

### DATABASE & ENTITY RELATION
`drivers (1) — (N) emergency_contacts`, `(1) — (1) preferences`, `(1) — (N) consents`, `(1) — (N) privacy_requests`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Edit profile] -> (phone change? OTP) -> save
[Language] -> apply locale + RTL live
[Legal updated] -> re-accept -> store version
[Delete account] -> blockers? (negative wallet/active trip) -> resolve first
   -> typed confirm -> anonymize PII (retain financial) -> logout
```

---

# Appendix A — Driver Access & Ownership Matrix

The driver surface has one role (Driver) + Unauthenticated, plus a server-side Vendor/Fleet relationship that affects payout routing and gives vendors read visibility in the Admin/Vendor surface (not in this app).

| Capability | Unauthenticated | Driver | Ownership-Scoped | Compliance-Gated |
|---|---|---|---|---|
| Fetch config / legal | ✓ | ✓ | n/a | no |
| Request/verify OTP | ✓ | ✓ | self | no |
| Onboarding submit | n/a | ✓ | own | no |
| Vehicle manage | n/a | ✓ | own | no |
| Go online/offline | n/a | ✓ | own | **yes** (docs+vehicle+status) |
| Location ping | n/a | ✓ | own | online-only |
| Receive/accept/reject request | n/a | ✓ | own | online + eligible |
| Trip lifecycle (arrive/start/end) | n/a | ✓ | own active trip | — |
| Earnings / history | n/a | ✓ | own | — |
| Wallet / payouts | n/a | ✓ | own | — |
| Incentives / heatmap | n/a | ✓ | own / flagged | — |
| Performance / ratings | n/a | ✓ | own | — |
| Documents / compliance | n/a | ✓ | own | — |
| Notifications / preferences | n/a | ✓ | own | — |
| Safety / SOS / share | n/a | ✓ | own active trip | — |
| Support tickets | FAQ only | ✓ | own | — |
| Privacy export/delete / consents | n/a | ✓ | self | delete blocked if dues/active trip |

Server enforcement: every authenticated endpoint injects `driver_id` from the JWT; cross-driver access returns `403`. The client never computes fares, eligibility, or dispatch; the server is authoritative.

---

# Appendix B — Driver-Facing Entity Overview

Driver-touched entities (read/write per ownership): `drivers (1)→(1) wallets`, `(1)→(N) documents` (driver-level), `(1)→(0..1) vehicles` (active; `vehicles (1)→(N) documents`, `(N)→(1) vehicle_classes`), `(1)→(1) driver_payout_details`, `(1)→(N) emergency_contacts`, `(1)→(1) preferences`, `(1)→(N) consents`, `(1)→(N) device_tokens`, `(1)→(N) auth_sessions`, `(1)→(N) bookings` (as assigned driver), `(1)→(N) tickets`, `(1)→(N) privacy_requests`, `(1)→(N) sos_events`, `(0..1)→(1) vendors` (fleet relationship). Trip/earning spine (own): `bookings (1)→(1) trips`, `(1)→(N) fare_breakups`, `(1)→(N) dispatch_events`, earnings via `ledger_entries`/`wallet_transactions`, `payouts`/`payout_line_items` (filtered to driver). Growth/quality: `incentive_programs`/`incentive_progress`, `ratings` (received), `driver_flags`. Config/catalog read-only: `service_zones`, `vehicle_classes`, `pricing_rules`/`surge_configs` (only via server outputs — never raw), `branding_config`, `feature_flags`, `legal_documents`. Secrets (Maps/FCM private keys) never reach the client; only public keys in config.

---

# Appendix C — Driver-Side Status & State Reference

**Auth:** unauthenticated → otp_sent → authenticated; refresh; logout.
**Driver lifecycle:** pending → approved → active → suspended → deactivated (admin-owned).
**Availability:** offline ↔ online_idle ↔ on_trip (cannot go offline mid-trip).
**Compliance gate:** compliant ↔ blocked (any mandatory driver/vehicle document expired/rejected).
**Ride request (driver view):** received → accepted / rejected / expired (atomic, first-accept-wins).
**Trip:** accepted → arrived → in_progress → completed; branches cancelled_by_driver / cancelled_by_customer / cancelled_by_system / no_show.
**Rental:** package_active → excess_tracked → completed. **Outstation:** leg(s) → night_halt(ack) → completed.
**Wallet:** credit/debit; balance ≥ negative_threshold (cash commission); settle when negative.
**Payout (driver view):** pending → approved → paid / failed (admin-owned disbursement).
**Document:** uploaded → in_review → approved → expired / rejected.
**Standing:** good → watch → flagged (required actions).
**Ticket:** open → in_progress → resolved → closed. **Privacy request:** received → in_progress → completed.

---

# Appendix D — Location, Battery, Offline & Resilience Conventions

The Driver App is built for long, continuous, real-world sessions, so resilience is a first-class design concern rather than an afterthought. Background location uses a foreground service on Android with a persistent, honest notification and the appropriate background-location entitlement on iOS, always behind an explicit permission-priming flow that explains why continuous location is needed — the app never tracks covertly, and location collection stops entirely when the driver is offline, aligning with GDPR data-minimization. Ping frequency is adaptive: high during an active trip to give the customer smooth tracking and to capture accurate telemetry for fare computation, lower while idle-online to conserve battery, and paused offline; pings are batched and compressed to save data. Connectivity loss is expected, not exceptional: location pings and trip-state transitions queue locally and flush idempotently and in order on reconnect, so a tunnel, dead-zone, or app restart never loses an in-progress trip or double-applies a transition. Ride requests are delivered redundantly over Socket.IO and a high-priority FCM data message so a momentary socket drop does not cost the driver a job, and acceptance is an atomic server transition so concurrent accepts resolve cleanly with first-accept-wins. The server, not the client, validates location plausibility (rejecting impossible speeds or jumps), computes all fares and earnings, and decides eligibility and dispatch — the client only reports facts and renders authoritative results. Compliance is enforced server-side: an expired mandatory document flips the driver to blocked and prevents going online until renewed and approved, with the in-app compliance banner explaining exactly what to fix. Battery and thermal pressure are mitigated through adaptive intervals, batching, and avoiding unnecessary screen-on map rendering when a background nav app is in use. Finally, all destructive or financial confirmations require explicit user action, account deletion is blocked while a driver has an active trip or outstanding negative balance, and every queued action is designed to be safely replayable so the system never corrupts money or trip state under poor network conditions.

---

**End of Driver App Product Document.**
