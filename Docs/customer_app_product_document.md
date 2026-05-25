# Universal Transportation Booking Platform
## Customer App — Complete Enterprise Product Document

| Field | Value |
|---|---|
| Document Type | Customer Mobile App Architecture & Implementation Specification |
| Parent Product | Universal Transportation Booking Platform (UTBP) — White-Label |
| Surface | Customer Mobile App (Android + iOS) |
| Version | 1.0 |
| Status | Implementation-Ready |
| Audience | Product Architects, Mobile Engineers (Flutter), Backend Engineers (FastAPI), UI/UX Designers, DBAs, QA, DevOps |
| Locked Stack | Flutter (mobile), Python + FastAPI (backend), PostgreSQL + PostGIS, Redis, Socket.IO, Google Maps Platform, Razorpay, FCM push, SMTP email, S3/Firebase storage adapter |
| Cross-Cutting | i18n + RTL from launch; GDPR-aligned privacy; one unified app for road + air |

---

## Positioning: The Customer App in the Platform

The Customer App is the **demand-side surface** and the only one most end users will ever see. It must present road services (cab, bike, rental, outstation) and air services (helicopter, charter, shuttle, VIP) inside **one unified, re-brandable app** whose look is driven entirely by the buyer's white-label theme. It is a thin, fast client over the FastAPI backend: it never holds business rules that belong on the server (fare computation, eligibility, dispatch), but it owns a responsive, offline-tolerant, localized experience.

Two architectural truths shape every module. First, **the customer is a single role** — there is no intra-app RBAC the way the admin/operator panels have; "RBAC" for this surface means *what an authenticated customer may do versus a guest*, plus *ownership scoping* (a customer may only read/modify their own bookings, wallet, profile, and payment methods). Second, **road and air share one booking spine** (estimate → select → confirm → pay → fulfill → rate) but diverge in the fulfillment middle, so the app is built around a shared booking framework with service-specific flows plugged in.

Because the product is sold one-time and the buyer brings their own services, the app reads brand theme, supported languages (including RTL), currency, enabled services (feature flags), and provider keys (Maps, Razorpay, FCM) from a **runtime configuration** fetched at launch — so the same compiled Flutter codebase becomes each buyer's branded app.

---

## How To Read This Document

Each module follows the requested structure: **Module Name → Module Purpose → Submodules → Screen-Wise Breakdown → UI Components Required → Field-Level Specification → Business Logic → RBAC → API Requirements → Database & Entity Relation → Workflow Diagram Logic (text)**.

Field specs use: **Field, Type, Required, Validation, Notes**. Customer API endpoints are namespaced under `/api/v1/app/...`, require a Bearer JWT for authenticated actions (guest endpoints are explicitly marked), and are **ownership-scoped** — the server injects `customer_id` from the JWT and rejects any attempt to access another customer's data with `403`. Money is integer minor units with explicit currency; timestamps ISO 8601 UTC, rendered in the customer's locale/timezone. Section 0 conventions apply to every module.

---

## Table of Contents

- [Section 0 — Global Conventions & Foundation](#section-0--global-conventions--foundation)
- [Module 1 — App Bootstrap, Config & White-Label Theming](#module-1--app-bootstrap-config--white-label-theming)
- [Module 2 — Onboarding & Authentication](#module-2--onboarding--authentication)
- [Module 3 — Home & Service Selector](#module-3--home--service-selector)
- [Module 4 — Location, Map & Place Search](#module-4--location-map--place-search)
- [Module 5 — Fare Estimate & Service Configuration](#module-5--fare-estimate--service-configuration)
- [Module 6 — Road Booking (Cab / Bike)](#module-6--road-booking-cab--bike)
- [Module 7 — Rental & Outstation Booking](#module-7--rental--outstation-booking)
- [Module 8 — Ride Scheduling](#module-8--ride-scheduling)
- [Module 9 — Air Booking (Helicopter / Shuttle)](#module-9--air-booking-helicopter--shuttle)
- [Module 10 — Charter & VIP Booking (Quote-Based)](#module-10--charter--vip-booking-quote-based)
- [Module 11 — Live Tracking & Trip Experience](#module-11--live-tracking--trip-experience)
- [Module 12 — Flight Status & Boarding Experience](#module-12--flight-status--boarding-experience)
- [Module 13 — Cancellation & Rescheduling](#module-13--cancellation--rescheduling)
- [Module 14 — Payments & Checkout](#module-14--payments--checkout)
- [Module 15 — Wallet](#module-15--wallet)
- [Module 16 — Promotions, Coupons & Referrals](#module-16--promotions-coupons--referrals)
- [Module 17 — Ratings & Reviews](#module-17--ratings--reviews)
- [Module 18 — Booking History & Receipts](#module-18--booking-history--receipts)
- [Module 19 — Profile, Saved Places & Payment Methods](#module-19--profile-saved-places--payment-methods)
- [Module 20 — Notifications & Notification Center](#module-20--notifications--notification-center)
- [Module 21 — Safety & SOS](#module-21--safety--sos)
- [Module 22 — Support & Help](#module-22--support--help)
- [Module 23 — Settings, Language (i18n/RTL) & Privacy (GDPR)](#module-23--settings-language-i18nrtl--privacy-gdpr)
- [Appendix A — Customer Access & Ownership Matrix](#appendix-a--customer-access--ownership-matrix)
- [Appendix B — Customer-Facing Entity Overview](#appendix-b--customer-facing-entity-overview)
- [Appendix C — Customer-Side Status & State Reference](#appendix-c--customer-side-status--state-reference)
- [Appendix D — Offline, Error & Edge-Case Conventions](#appendix-d--offline-error--edge-case-conventions)

---

## Section 0 — Global Conventions & Foundation

### 0.1 Navigation Shell
A bottom navigation bar with Home, Activity (bookings), Wallet, and Account, plus a contextual full-screen booking flow that takes over when a booking is in progress or active. A global "active trip/flight" persistent banner appears above the bottom bar whenever a booking is live, so the user can return to tracking from anywhere. RTL flips the entire layout mirror-image when an RTL locale is active.

### 0.2 Shared UI Components (Flutter)
MapView (Google Maps; markers, polylines, zone awareness), PlaceSearchSheet (autocomplete + recents + saved), ServiceCard, VehicleClassSelector, FareBreakdownSheet, PaymentMethodSelector, PromoInput, BookingStatusCard, LiveTripPanel (driver/vehicle, ETA, actions), FlightStatusPanel, OtpDisplay (start-trip OTP), RatingSheet, ReceiptView, WalletCard, BottomSheet, PrimaryCTA (sticky), Skeleton/Shimmer loaders, EmptyState, ErrorState (with retry), Toast/Snackbar, ConfirmDialog, DatePicker/TimePicker (locale-aware), PassengerForm, BaggageInput, CountdownTimer (search/TTL), SosButton. All components are theme-token-driven and locale/RTL-aware.

### 0.3 Shared API & Realtime Behavior
REST under `/api/v1/app`; realtime over Socket.IO (`app.tracking.{bookingId}`, `app.flight.{bookingId}`, `app.notifications.{customerId}`). Guest endpoints (config, fare estimate, service availability) need no auth; all booking/payment/profile endpoints require JWT and are ownership-scoped. Mutations carry `Idempotency-Key` (critical for booking create and payment to prevent double-charge on retry). Error envelope `{code,message,details,traceId}`. List endpoints paginate. Clients always render server-computed money/fares; the app never computes final fare locally.

### 0.4 "RBAC" for the Customer Surface
There is one human role (Customer) plus Guest (unauthenticated). Access differences: a Guest may browse config, see service availability, search places, and get a fare estimate, but must authenticate to confirm a booking, pay, use wallet, view history, or manage profile. Beyond guest-vs-customer, the only control is **ownership scoping**: a customer can act only on their own resources. The full matrix is Appendix A.

### 0.5 Shared Validation
Phone E.164; OTP numeric fixed-length with attempt limits; pickup ≠ drop and both within active service zones; scheduled time ≥ now + service lead-time and within booking horizon; passenger count ≤ class/aircraft capacity; baggage within limits; promo validated server-side; payment amount equals server quote (client cannot alter). All free-text sanitized. Locale/currency formatting per active locale.

### 0.6 Shared Offline & Resilience
The app tolerates brief connectivity loss (Appendix D): cached config and last screen state, queued non-critical actions, automatic reconnect for tracking sockets with REST polling fallback, and idempotent retries for booking/payment. The app never silently double-books or double-pays.

---

## Module 1 — App Bootstrap, Config & White-Label Theming

### MODULE PURPOSE
On launch, fetch the deployment's runtime configuration that turns the shared Flutter codebase into this buyer's branded app: theme tokens, brand assets, supported languages (incl. RTL), currency, timezone, enabled services (feature flags), legal documents, and provider keys (Maps, Razorpay public key, FCM). Without this module nothing else can render correctly.

### SUBMODULES
Config Fetch & Cache, Theme & Branding, Feature-Flag Gating, Localization Bootstrap, Force-Update & Maintenance Gate, Provider Key Injection.

### SCREEN-WISE BREAKDOWN
**1.1 Splash / Bootstrap.** Brand splash while config loads; on failure, retry/ErrorState; respects cached config for fast warm starts.
**1.2 Force-Update Gate.** If the deployment requires a minimum app version, block with an update CTA to the store.
**1.3 Maintenance Gate.** If the deployment is in maintenance, show a branded maintenance screen.

### UI COMPONENTS REQUIRED
Branded splash, Skeleton, ErrorState with retry, force-update modal, maintenance screen.

### FIELD-LEVEL SPECIFICATION (config payload)
| Field | Type | Notes |
|---|---|---|
| brand.name / logos / theme_tokens | object | drives entire UI |
| supported_locales[] | string[] | BCP-47, includes RTL flags |
| default_locale / currency / timezone | string | formatting defaults |
| enabled_services[] | enum[] | cab/bike/rental/outstation/heli/charter/shuttle/vip |
| feature_flags | object | wallet, referrals, promos, sos, etc. |
| legal_docs | object | terms/privacy/refund versions+urls |
| maps_key (public) / razorpay_key (public) | string | client-safe public keys only |
| min_app_version / maintenance_mode | string/bool | gating |

### BUSINESS LOGIC
Config is fetched at cold start and cached with a short TTL; warm starts use cache then refresh in background. Only **public** keys reach the client (secret keys stay server-side). Disabled services are hidden everywhere (the service selector, deep links, history filters). Locale is resolved as: user preference → device locale (if supported) → deployment default. Legal-doc version changes trigger a re-acceptance prompt (Module 23). Force-update and maintenance gates short-circuit the app.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Guest | Customer |
|---|---|---|
| app.config.fetch | ✓ | ✓ |
(Config is public; contains no PII.)

### API REQUIREMENTS
`GET /app/config` (public), `GET /app/legal/{type}` (public).

### DATABASE & ENTITY RELATION
Reads `branding_config`, `system_settings`, `feature_flags`, `legal_documents` (deployment-level). No customer write.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Launch] -> load cached config (if any) -> fetch /app/config
   -> maintenance? -> maintenance gate
   -> below min version? -> force-update gate
   -> apply theme + locale + flags -> proceed to Home/Auth
   -> fetch fails & no cache? -> ErrorState(retry)
```

---

## Module 2 — Onboarding & Authentication

### MODULE PURPOSE
Register and authenticate customers via phone OTP (primary), with optional email and social sign-in, manage sessions/tokens securely, and capture minimal profile + consents (GDPR) at signup. Supports a "browse as guest, auth at confirm" pattern.

### SUBMODULES
Intro/Onboarding Slides, Phone+OTP Auth, Optional Email/Social, Profile Bootstrap, Consent Capture, Session Management, Account Recovery.

### SCREEN-WISE BREAKDOWN
**2.1 Onboarding Slides.** 2–3 branded value slides (skippable); shown first run only.
**2.2 Phone Entry.** Country code + phone; consent checkboxes (terms, privacy) with links; "continue."
**2.3 OTP Verification.** Fixed-length OTP, auto-read where allowed, resend with cooldown, attempt limit.
**2.4 Optional Email/Social.** Link email or social provider (if enabled by flag).
**2.5 Profile Bootstrap.** First/last name, optional email, optional referral code; gender/DOB optional per deployment.
**2.6 Consent.** Explicit GDPR consent records (marketing opt-in separate from required terms).

### UI COMPONENTS REQUIRED
Onboarding carousel, phone input with country picker, OtpInput, consent checkboxes with legal links, FormBuilder (profile), social buttons (conditional), Toast/ErrorState.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| phone | string | yes | E.164, unique | identity |
| otp | string | yes | numeric, fixed len, TTL, attempt-limit | server-issued |
| first_name | string | yes | 2–40 | — |
| last_name | string | no | ≤40 | — |
| email | string | no | RFC-5322, unique if set | optional login |
| referral_code | string | no | exists/active | Module 16 |
| consent_terms / consent_privacy | bool | yes | must be true | versioned |
| consent_marketing | bool | no | — | separate opt-in |

### BUSINESS LOGIC
OTP is generated and verified server-side via the SMS adapter (buyer-supplied); rate-limited and attempt-capped. On verify, the server issues a short-lived access JWT and a rotating refresh token (secure storage / Keychain / Keystore). A new phone creates a customer in `active`; an existing phone logs in. Consents are stored with version and timestamp; required consents block signup if unchecked; marketing consent is independent and editable later. Social/email are optional and gated by flags. Guests can reach booking confirm and are prompted to authenticate at that point, preserving their in-progress booking draft.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Guest | Customer |
|---|---|---|
| auth.otp.request/verify | ✓ | ✓ |
| profile.create | ✓ (becomes customer) | n/a |
| session.refresh/logout | n/a | ✓ |

### API REQUIREMENTS
`POST /app/auth/otp/send` (public), `POST /app/auth/otp/verify` (public → tokens), `POST /app/auth/social` (public, if enabled), `POST /app/auth/refresh`, `POST /app/auth/logout`, `PATCH /app/me` (profile bootstrap), `POST /app/me/consents`.

### DATABASE & ENTITY RELATION
`customers (1) — (1) wallets` (created on signup), `customers (1) — (N) consents`, `customers (1) — (N) auth_sessions`. Referral creates a `referrals` row (Module 16).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Phone entry] -> consents checked? -> send OTP (SMS adapter, rate-limited)
   -> verify OTP (TTL/attempts) -> existing customer? login : create(active)+wallet
   -> bootstrap profile (+referral) -> store consents(versioned) -> tokens -> Home
[Guest at confirm] -> trigger auth -> preserve booking draft -> resume after login
```

---

## Module 3 — Home & Service Selector

### MODULE PURPOSE
The launchpad: present enabled services (road + air) in a clear, branded layout, surface recent/saved destinations and active bookings, and route the user into the correct booking flow. Honors feature flags so each buyer sees only their enabled services.

### SUBMODULES
Service Grid, Active Booking Resume, Recents & Saved Shortcuts, Promotions Banner, Quick-Rebook.

### SCREEN-WISE BREAKDOWN
**3.1 Home.** Top: location chip (current city/area). Service grid (Cab, Bike, Rental, Outstation, Helicopter, Charter, Shuttle, VIP — only enabled ones). Active-booking card if a trip/flight is live (tap → tracking). Recents and saved-place shortcuts for one-tap start. Promo banner (if any). Pull-to-refresh.

### UI COMPONENTS REQUIRED
Location chip, ServiceCard grid, active BookingStatusCard, recents/saved chips, promo banner carousel, Skeleton, EmptyState.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| enabled_services[] | enum[] | from config/flags |
| active_booking | object | live trip/flight summary |
| recent_places[] | object[] | last N destinations |
| saved_places[] | object[] | home/work/custom |
| promo_banners[] | object[] | targeted, optional |

### BUSINESS LOGIC
Service grid is rendered strictly from enabled services; a disabled service never appears. If an active booking exists, its card is pinned and deep-links to tracking/flight status. Recents derive from the customer's history; saved places from profile. Promo banners are server-curated and respect eligibility. Selecting a road service opens the location/estimate flow; selecting an air service opens the route/date flow (or quote request for charter/VIP).

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Guest | Customer |
|---|---|---|
| home.services.view | ✓ | ✓ |
| home.active_booking.view | n/a | ✓ (own) |
| home.recents/saved.view | n/a | ✓ (own) |

### API REQUIREMENTS
`GET /app/home` (auth: returns active booking, recents, saved, banners; guest: services + banners only), `GET /app/services/availability?lat&lng`.

### DATABASE & ENTITY RELATION
Reads `feature_flags`, `bookings` (active, own), `saved_places` (own), `promotions` (eligible). No write.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Home load] -> render enabled services
   -> active booking? -> pin card (-> tracking)
   -> show recents/saved + eligible promo banners
[Select service] -> road? -> Location/Estimate flow : air? -> Route/Date flow (or Quote for charter/VIP)
```

---

## Module 4 — Location, Map & Place Search

### MODULE PURPOSE
Capture pickup and drop (or route endpoints) accurately using Google Maps: current-location detection, place autocomplete, map pin adjustment, saved places, and zone-awareness so the user can't book outside serviced areas.

### SUBMODULES
Current Location, Place Autocomplete, Map Pin Selection, Saved Places Quick-Pick, Zone Validation, Multi-Stop (supported services).

### SCREEN-WISE BREAKDOWN
**4.1 Location Picker.** Map with draggable center pin; pickup and drop fields; autocomplete sheet; "use current location"; saved-place chips; for supported services, add-stop.
**4.2 Map Confirm.** Fine-tune pin; shows whether point is inside an active service zone; confirm.

### UI COMPONENTS REQUIRED
MapView, PlaceSearchSheet (autocomplete + recents + saved), draggable pin, "use current location" button, saved-place chips, add-stop control, zone-validity indicator, PrimaryCTA.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| pickup.lat/lng | decimal | yes | valid coords, in active zone | geofence |
| pickup.address | string | yes | resolved | from geocode |
| drop.lat/lng | decimal | road:yes | in active zone | — |
| stops[] | array | optional | each in zone | multi-stop services |
| place_id | string | from autocomplete | Google place id | — |

### BUSINESS LOGIC
Location uses the Maps adapter (Google) for geocoding, reverse-geocoding, autocomplete (Places), and later distance/route (Module 5). Current location requires runtime permission with a clear rationale; denial falls back to manual search. Every selected point is validated server-side against active `service_zones` for the chosen service; out-of-zone points block progression with a clear message. Saved places give one-tap selection. Multi-stop is enabled only for services/buyers that allow it.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Guest | Customer |
|---|---|---|
| location.search/geocode | ✓ | ✓ |
| location.zone.validate | ✓ | ✓ |
| saved_places.use | n/a | ✓ (own) |

### API REQUIREMENTS
`GET /app/places/autocomplete?q&lat&lng` (proxied to Maps adapter, public), `GET /app/places/details?place_id`, `POST /app/zones/validate` (point + service → in/out + zone).

### DATABASE & ENTITY RELATION
Reads `service_zones` (PostGIS), `saved_places` (own). Autocomplete proxied through backend to keep the Maps secret key server-side.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Open picker] -> request location permission
   -> autocomplete/search OR drag pin -> reverse geocode -> validate zone (server)
   -> in zone? -> allow continue : block(message)
   -> (multi-stop) add stops (each validated) -> confirm -> Estimate (Module 5)
```

---

## Module 5 — Fare Estimate & Service Configuration

### MODULE PURPOSE
Turn selected locations + service into server-computed options the user can choose: vehicle classes (road) or seat/route options (air), each with an upfront fare estimate, ETA, and any surge/peak indicators. This is the decision screen before confirmation.

### SUBMODULES
Estimate Request, Class/Option Selector, Surge & Peak Disclosure, Promo Pre-Apply, Schedule Toggle.

### SCREEN-WISE BREAKDOWN
**5.1 Estimate / Options.** List of available classes/options with name, capacity, estimated fare, ETA; surge/peak badge if applicable; promo preview; "schedule for later" toggle; sticky CTA "Book {class}".

### UI COMPONENTS REQUIRED
VehicleClassSelector (road) / option list (air), FareBreakdownSheet (tap to expand), surge/peak badge, PromoInput preview, schedule toggle, PrimaryCTA.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| options[] | object[] | class/option id, name, capacity, image |
| options[].estimate_minor | int | server-computed estimate |
| options[].eta_min | int | from Maps (road) / schedule (air) |
| options[].surge_multiplier | decimal | disclosed if >1 |
| promo_preview | object | tentative discount if code applied |
| schedule_enabled | bool | toggle scheduled flow |

### BUSINESS LOGIC
The estimate is **always server-computed** via the Pricing engine using current rules + distance/time from Maps; the client only displays it. Surge/peak is disclosed transparently before booking. The estimate is a range/quote with a short validity; if it expires before confirm, the app re-fetches. Applying a promo here shows a *preview* discount but the authoritative discount is recomputed at confirm. Choosing "schedule" routes to Module 8. Unavailable classes (no supply, out of hours) are shown disabled with reason.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Guest | Customer |
|---|---|---|
| pricing.estimate | ✓ | ✓ |
| promo.preview | ✓ | ✓ |

### API REQUIREMENTS
`POST /app/pricing/estimate` (public; body: service, pickup, drop/route, stops, datetime, promo?) → options with estimates, ETAs, surge, validity.

### DATABASE & ENTITY RELATION
Reads `pricing_rules`, `surge_configs`, `vehicle_classes`/`aircraft_types`, `service_zones`. No write (estimate is stateless until booking).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Locations set] -> POST estimate -> server: distance/time(Maps) + rules + surge -> options
   -> user selects class/option -> (promo preview) -> (schedule? -> Module 8)
   -> estimate expired? -> re-fetch -> continue to Confirm/Checkout
```

---

## Module 6 — Road Booking (Cab / Bike)

### MODULE PURPOSE
The core on-demand road flow: confirm the chosen class, attach payment and promo, create the booking, watch dispatch find a driver, and hand off to live tracking. Cab and bike share this flow with class-specific nuances.

### SUBMODULES
Booking Confirm, Dispatch/Searching, Driver Assigned, Pre-Pickup, Handoff to Tracking, No-Driver Handling.

### SCREEN-WISE BREAKDOWN
**6.1 Confirm.** Summary (pickup/drop, class, estimate, payment, promo); sticky "Confirm booking."
**6.2 Searching.** Animated searching state with cancel; shows dispatch progress / radius expansion subtly.
**6.3 Driver Assigned.** Driver card (name, photo, rating, vehicle, plate), live ETA to pickup, call/chat, share-ride, cancel (within grace).
**6.4 Hand-off.** On "arrived," show start-trip OTP; transitions to Module 11.

### UI COMPONENTS REQUIRED
Booking summary, PaymentMethodSelector, PromoInput, PrimaryCTA, searching animation + CountdownTimer, driver BookingStatusCard, call/chat buttons, share-ride, OtpDisplay, cancel CTA, MapView.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| service_subtype | enum | yes | cab/bike | — |
| vehicle_class_id | UUID | yes | available in zone | — |
| pickup/drop | geo+addr | yes | in zone | — |
| payment_method | enum | yes | authorized | cash/card/wallet/upi/etc |
| promo_code | string | no | valid at confirm | recomputed |
| estimate_ref | string | yes | not expired | server quote token |
| start_otp | string | system | server-issued | shown to customer |

### BUSINESS LOGIC
On confirm, the client sends an **idempotent** create with the estimate token; the server re-validates pricing, promo, zone, and payment authorization, creates the booking in `requested`, and runs auto-dispatch (server-side; Socket.IO pushes status). If no driver is found after radius expansion, the app offers retry, schedule, or cancel (no fee). On acceptance, the driver card and live ETA appear over Socket.IO. Cancellation within the grace window is free; after, the configured fee applies (disclosed). The start-trip OTP is generated server-side and displayed to the customer to read to the driver. The client never computes fare.

### ROLE-BASED ACCESS CONTROL (RBAC)
| Action | Guest | Customer |
|---|---|---|
| booking.create | auth required | ✓ (own) |
| booking.cancel | n/a | ✓ (own) |
| booking.view | n/a | ✓ (own) |

### API REQUIREMENTS
`POST /app/bookings` (Idempotency-Key; service=cab/bike), `GET /app/bookings/{id}`, `POST /app/bookings/{id}/cancel`, Socket.IO `app.tracking.{id}` (status + driver location).

### DATABASE & ENTITY RELATION
`bookings (N) — (1) customers`, `(N) — (0..1) drivers`, `(1) — (N) fare_breakups`, `(1) — (N) payments`, `(1) — (1) trips`, `(1) — (N) dispatch_events`. Ownership-scoped.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Confirm] -> POST booking (idempotent, estimate token)
   -> server: re-validate price/promo/zone + auth payment -> create(requested) -> auto-dispatch
   -> searching (socket) -> assigned? -> driver card + ETA
        no driver (radius exhausted) -> retry/schedule/cancel(no fee)
   -> driver arrives -> show start OTP -> Tracking (Module 11)
[Cancel] -> within grace? free : fee(disclosed) -> confirm
```

---

## Module 7 — Rental & Outstation Booking

### MODULE PURPOSE
Specialized road flows: Rental (hourly/daily package within a city) and Outstation (intercity one-way/round-trip), each with its own inputs, pricing presentation, and confirmation, reusing the dispatch/tracking spine.

### SUBMODULES
Rental Package Selection, Outstation Trip Config, Estimate & Confirm, Driver Assignment (scheduled or immediate), Extras Disclosure.

### SCREEN-WISE BREAKDOWN
**7.1 Rental.** Package picker (e.g., 4h/40km), pickup, start time (now or scheduled); shows package price + excess rates; confirm.
**7.2 Outstation.** City pair (pickup + destination city), one-way/round-trip, dates, class; shows per-km slab, driver allowance, night-halt; confirm.

### UI COMPONENTS REQUIRED
Package selector cards, trip-type toggle, DatePicker/TimePicker (locale-aware), city/place pickers, FareBreakdownSheet (extras), PaymentMethodSelector, PrimaryCTA.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| rental.package_id | UUID | rental:yes | active in zone | — |
| rental.start_time | datetime | yes | ≥ now+lead | — |
| outstation.trip_type | enum | outstation:yes | one_way/round_trip | — |
| outstation.dates | datetime(s) | yes | return≥outbound | — |
| outstation.dest_city | ref | yes | permitted | — |
| excess_terms | object | system | display | per-hour/per-km |

### BUSINESS LOGIC
Rental price = package base + excess (per-hour/per-km) computed at trip end (server). Outstation price = per-km slab × distance + driver allowance + night-halt (if overnight) + tolls, all server-computed; round-trip applies return rules. Both can be immediate or scheduled (Module 8). Extras and how excess is billed are clearly disclosed before confirm. Dispatch/tracking reuse Modules 6/11.

### ROLE-BASED ACCESS CONTROL (RBAC)
Same as Module 6 (booking.create/cancel/view, ownership-scoped).

### API REQUIREMENTS
`POST /app/pricing/estimate` (service=rental/outstation), `POST /app/bookings` (service=rental/outstation), reuse `GET /app/bookings/{id}`, cancel, tracking socket.

### DATABASE & ENTITY RELATION
Same booking spine; `rental_packages` and `outstation_slabs` referenced via pricing snapshot.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Rental] pick package + start time -> estimate (package+excess terms) -> confirm -> dispatch(now/scheduled)
[Outstation] city pair + type + dates + class -> estimate (slab+allowance+halt) -> confirm -> dispatch
-> trip runs -> server computes final (excess/extras) -> settle
```

---

## Module 8 — Ride Scheduling

### MODULE PURPOSE
Let customers schedule any eligible road or air service for a future time, manage upcoming scheduled bookings, receive reminders, and have the platform auto-dispatch at the right lead time.

### SUBMODULES
Schedule Picker, Upcoming Scheduled List, Reschedule/Cancel Scheduled, Reminders.

### SCREEN-WISE BREAKDOWN
**8.1 Schedule Picker.** Date + time selection (within horizon, ≥ lead time), confirm scheduled booking.
**8.2 Upcoming.** List of scheduled bookings with edit (time), cancel, and reminder status.

### UI COMPONENTS REQUIRED
DatePicker/TimePicker (locale/RTL-aware), scheduled BookingStatusCard, reschedule/cancel actions, reminder badge.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| scheduled_at | datetime | yes | ≥ now+lead; ≤ horizon | per service |
| lead_time_min | int | system | from config | service-specific |
| reminder_offsets | int[] | system | — | notification offsets |

### BUSINESS LOGIC
Scheduled bookings sit in `scheduled`; the server triggers auto-dispatch (road) or operator routing (air) at `scheduled_at − lead_time`. Reminders fire at configured offsets via notifications. Reschedule allowed up to a cutoff; cancellation rules mirror the service. Clock handling is UTC server-side; display is localized.

### ROLE-BASED ACCESS CONTROL (RBAC)
booking.create/view/cancel + booking.reschedule (own).

### API REQUIREMENTS
`POST /app/bookings` (with `scheduled_at`), `GET /app/bookings?status=scheduled`, `PATCH /app/bookings/{id}` (reschedule), `POST /app/bookings/{id}/cancel`.

### DATABASE & ENTITY RELATION
Booking spine with `scheduled_at`; reminder jobs reference booking.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Pick future time] -> validate lead/horizon -> create(scheduled)
[Reminders] fire at offsets
[Trigger time - lead] -> auto-dispatch (road) / route to operator (air)
[Reschedule] within cutoff -> update time ; [Cancel] -> per service rules
```

---

## Module 9 — Air Booking (Helicopter / Shuttle)

### MODULE PURPOSE
Book defined-route air services (helicopter routes, scheduled shuttles): pick route + date/flight, enter passengers and baggage, see fare, pay, and receive an e-ticket/boarding info. Reuses the booking spine with an air fulfillment flow.

### SUBMODULES
Route & Flight Selection, Passenger Details, Baggage & Weight, Air Confirm & Pay, E-Ticket Issuance.

### SCREEN-WISE BREAKDOWN
**9.1 Route/Flight Picker.** Choose route, date, and (shuttle) specific flight/time with seat availability; (helicopter) slot.
**9.2 Passengers.** Add passengers with required fields (per deployment regulatory config); lead passenger = account holder by default.
**9.3 Baggage.** Per-passenger baggage; running weight indicator.
**9.4 Confirm & Pay.** Fare breakdown, payment, promo; confirm → booking routed to operator.
**9.5 E-Ticket.** Boarding info (helipad/terminal, time, pilot/operator contact where permitted), QR/reference.

### UI COMPONENTS REQUIRED
Route picker, date/flight selector with availability, PassengerForm (repeatable), BaggageInput + weight indicator, FareBreakdownSheet, PaymentMethodSelector, e-ticket/boarding card with QR.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| route_id / flight_id | UUID | yes | available | shuttle=flight, heli=slot |
| passengers[] | object[] | yes | reg fields per config; ≤ capacity | name/age/id per deployment |
| passengers[].id_type/number | enum/string | reg-dependent | format | configurable per region |
| baggage_kg (per pax) | int | yes | within cap; total ≤ MTOW | server validates |
| seats_requested | int | shuttle:yes | ≤ availability | atomic hold |
| estimate_ref | string | yes | not expired | server quote |

### BUSINESS LOGIC
Seat availability is held during checkout and released on failure/timeout; confirmation decrements inventory atomically (no overbooking unless buyer-enabled). Required passenger fields are deployment-configurable (geography not fixed). Total weight (pax + baggage) is validated server-side against aircraft MTOW. On confirm, the booking is routed to the operator (operator accepts/assigns per Operator Panel). E-ticket/boarding details are issued once confirmed. Fare is server-computed (per-seat + baggage + surcharges + tax).

### ROLE-BASED ACCESS CONTROL (RBAC)
booking.create/view/cancel (own), manifest provided at booking is owned by customer until lock.

### API REQUIREMENTS
`GET /app/air/routes?service=heli|shuttle`, `GET /app/air/flights?route_id&date`, `POST /app/pricing/estimate` (air), `POST /app/bookings` (service=helicopter/shuttle, passengers, baggage), `GET /app/bookings/{id}/eticket`.

### DATABASE & ENTITY RELATION
`bookings (air) (N) — (1) customers`, `(N) — (1) operators` (on routing), `(1) — (1) flights`, `(1) — (N) manifest_passengers`, `(1) — (N) payments`. Inventory on `schedules`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Pick route/flight] -> check availability -> hold seats
   -> enter passengers (reg fields) + baggage -> weight <= MTOW? (server)
   -> estimate -> pay -> confirm -> decrement inventory (atomic) -> route to operator
   -> operator confirms -> issue e-ticket/boarding -> Flight Status (Module 12)
   [checkout fails/timeout] -> release seats
```

---

## Module 10 — Charter & VIP Booking (Quote-Based)

### MODULE PURPOSE
Handle bespoke air bookings where price is quoted, not listed: customer submits an itinerary and requirements, operators respond with quotes (directly or admin-mediated), customer accepts and pays a deposit/full amount, and the flight is confirmed.

### SUBMODULES
Itinerary Builder, Requirements & Add-ons, Quote Inbox, Quote Acceptance & Deposit, Confirmation.

### SCREEN-WISE BREAKDOWN
**10.1 Request Builder.** Origin/stops/destination, dates/times, passenger count, aircraft preference (optional), special requests (catering, ground transport), VIP/privacy flags.
**10.2 Quote Inbox.** Received quote(s) with breakdown, validity countdown; compare if multiple.
**10.3 Accept & Pay.** Accept a quote; pay deposit or full per policy; confirm.
**10.4 Confirmation.** Itinerary confirmation + boarding details.

### UI COMPONENTS REQUIRED
Multi-stop itinerary builder, requirements form, quote cards with breakdown + CountdownTimer, compare view, PaymentMethodSelector (deposit/full), confirmation card.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| itinerary[] | object[] | yes | feasible legs | origin/stops/dest+times |
| pax_count | int | yes | ≥1 | — |
| requirements | object | no | — | catering/ground/etc |
| tier | enum | yes | charter/vip | privacy for vip |
| quote.total_minor | int | system | from operator | breakdown shown |
| quote.expires_at | datetime | system | not past on accept | — |
| deposit_minor | int | system | per policy | partial pay |

### BUSINESS LOGIC
A request is submitted and routed to eligible operators (admin may mediate). Operators respond with quotes (Operator Module 8); the customer sees them in a quote inbox with validity. Accepting an expired quote is blocked. Acceptance triggers deposit or full payment per policy; on success the booking confirms and is assigned by the operator. VIP adds privacy handling (limited PII exposure, optional concierge). Itinerary changes after acceptance trigger re-quote.

### ROLE-BASED ACCESS CONTROL (RBAC)
charter.request.create/view, quote.view/accept, booking.view/cancel (own).

### API REQUIREMENTS
`POST /app/charter/requests`, `GET /app/charter/requests/{id}/quotes`, `POST /app/charter/quotes/{id}/accept`, `POST /app/payments/init` (deposit/full), `GET /app/bookings/{id}`.

### DATABASE & ENTITY RELATION
`charter_requests (N) — (1) customers`, `(1) — (N) charter_quotes (N) — (1) operators)`, accepted quote → `bookings` + `flights`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Build itinerary + requirements] -> submit -> route to operators
[Quotes arrive] -> inbox (validity) -> compare -> accept (not expired)
   -> pay deposit/full -> confirm booking -> operator assigns -> boarding details
[Itinerary change post-accept] -> re-quote
```

---

## Module 11 — Live Tracking & Trip Experience

### MODULE PURPOSE
Deliver the real-time road trip experience: driver location on map, ETA, trip progress, safety actions, in-trip changes (add stop where allowed), and trip completion handing into fare + rating.

### SUBMODULES
Pre-Pickup Tracking, In-Trip Tracking, Trip Actions (call/chat/share/SOS), In-Trip Changes, Completion.

### SCREEN-WISE BREAKDOWN
**11.1 Tracking.** Map with driver marker (heading), route polyline, ETA; driver card; actions (call/chat, share-ride, SOS); start-OTP before start; live status (en route → arrived → in progress).
**11.2 In-Trip.** Live route + ETA to destination; add-stop (if allowed); fare meter context (not authoritative).
**11.3 Completion.** Trip summary, final fare breakdown, auto-advance to payment settlement (if needed) and rating.

### UI COMPONENTS REQUIRED
MapView with animated marker, LiveTripPanel, OtpDisplay, call/chat, share-ride, SosButton, ETA banner, FareBreakdownSheet, completion sheet → RatingSheet.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| driver_location | geo | over socket, smoothed |
| eta_min | int | recomputed live |
| trip_status | enum | accepted/arrived/in_progress/completed |
| start_otp | string | shown pre-start |
| final_fare_minor | int | server on completion |

### BUSINESS LOGIC
Driver location streams over Socket.IO with client-side smoothing/interpolation; on socket loss, fall back to periodic REST polling and show last-known with timestamp. ETA uses the Maps adapter. Start requires the customer's OTP given to the driver. Add-stop (if allowed) recomputes fare server-side. On completion the server computes the final fare from telemetry; the app displays the breakdown and proceeds to settlement (for non-cash) and rating. Safety actions are always one tap away.

### ROLE-BASED ACCESS CONTROL (RBAC)
tracking.view (own booking), trip.actions (own).

### API REQUIREMENTS
Socket.IO `app.tracking.{id}`; `GET /app/bookings/{id}` (fallback poll); `POST /app/bookings/{id}/add-stop` (if allowed); `GET /app/bookings/{id}/receipt`.

### DATABASE & ENTITY RELATION
`trips (1) — (1) bookings`, telemetry referenced; `fare_breakups` on completion.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Assigned] -> stream driver location (socket) -> ETA -> arrived -> give OTP -> start(in_progress)
   -> in-trip live route/ETA -> (add stop? recompute)
   -> end -> server final fare -> show breakdown -> settle (non-cash) -> Rating
[socket lost] -> poll REST -> last-known + timestamp -> reconnect
```

---

## Module 12 — Flight Status & Boarding Experience

### MODULE PURPOSE
The air equivalent of tracking: show confirmed flight details, boarding instructions, real-time status (confirmed → boarding → departed → arrived), delays/diversions, and post-flight rating.

### SUBMODULES
Flight Detail, Boarding Info, Live Flight Status, Delay/Diversion Alerts, Completion & Rating.

### SCREEN-WISE BREAKDOWN
**12.1 Flight Detail.** Route, date/time, operator, aircraft, passengers, baggage, e-ticket/QR.
**12.2 Boarding.** Helipad/terminal, report-by time, instructions, operator contact (if permitted).
**12.3 Status.** Live status pipeline; delay/diversion banners; post-arrival → rating.

### UI COMPONENTS REQUIRED
FlightStatusPanel, boarding card with QR, status pipeline, delay/diversion banner, RatingSheet.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| flight.status | enum | confirmed/boarding/departed/arrived/completed |
| boarding_info | object | helipad/terminal/report-by |
| delay_reason / diversion | text/json | if any |
| eticket_ref / qr | string | boarding |

### BUSINESS LOGIC
Flight status updates come from the operator's day-of-flight actions over Socket.IO/push. Delays/diversions push alerts. Boarding info is shown once confirmed and within the relevant window. On arrival/completion, the customer is prompted to rate (Module 17). PII shown follows GDPR minimization.

### ROLE-BASED ACCESS CONTROL (RBAC)
flight.view (own booking).

### API REQUIREMENTS
Socket.IO `app.flight.{id}`; `GET /app/bookings/{id}` (flight detail + status); `GET /app/bookings/{id}/eticket`.

### DATABASE & ENTITY RELATION
`flights (1) — (1) bookings`, status + boarding fields; `manifest_passengers` (own view).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Confirmed] -> show flight detail + e-ticket
   -> boarding window -> boarding info
   -> operator updates -> status pipeline (socket/push) -> delay/diversion alerts
   -> arrived/completed -> Rating
```

---

## Module 13 — Cancellation & Rescheduling

### MODULE PURPOSE
Let customers cancel or reschedule road and air bookings under the deployment's configured rules, with transparent fee/refund disclosure before they commit.

### SUBMODULES
Cancel (road/air), Reschedule (scheduled/air), Fee & Refund Preview, Reason Capture.

### SCREEN-WISE BREAKDOWN
**13.1 Cancel.** Reason picker; fee/refund preview (computed server-side per rules/tiers); confirm.
**13.2 Reschedule.** New time/slot picker (scheduled road, air); fee preview; confirm.

### UI COMPONENTS REQUIRED
Reason selector, fee/refund preview sheet, slot picker, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| reason | enum+text | yes | from set | — |
| fee_minor | int | system | per rules/tier | disclosed |
| refund_minor | int | system | computed | destination per config |
| reschedule_target | slot | reschedule | available | — |

### BUSINESS LOGIC
Road cancellation: free before driver acceptance and within grace after; fee thereafter. Air cancellation: tiered by time-to-departure (admin-configured dynamically). The fee/refund is **always computed and disclosed server-side before the customer confirms**. Refund destination (wallet vs original) follows the deployment's configured policy. Reschedule respects cutoffs and availability. All actions notify the counterpart and post any ledger effects server-side.

### ROLE-BASED ACCESS CONTROL (RBAC)
booking.cancel / booking.reschedule (own).

### API REQUIREMENTS
`GET /app/bookings/{id}/cancel-preview`, `POST /app/bookings/{id}/cancel`, `POST /app/bookings/{id}/reschedule`.

### DATABASE & ENTITY RELATION
Reads cancellation rules/tiers (config); writes booking status + `payments`/`ledger_entries` (server-owned).

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Cancel] -> reason -> server computes fee/refund (rules/tier) -> preview -> confirm -> refund per policy -> notify
[Reschedule] -> pick slot (available) -> fee preview -> confirm -> update -> notify
```

---

## Module 14 — Payments & Checkout

### MODULE PURPOSE
Handle all money-in flows: select/add a payment method, authorize and capture via Razorpay (and cash where allowed), handle 3DS/UPI/redirect flows, ensure idempotency, and reconcile success/failure robustly so the customer is never double-charged or stuck.

### SUBMODULES
Method Selection, Add Card/UPI (tokenized), Razorpay Checkout, Cash Handling, Payment Result & Retry, Corporate Billing (if enabled).

### SCREEN-WISE BREAKDOWN
**14.1 Checkout.** Amount (server quote), method selector, promo (final), pay CTA.
**14.2 Gateway Flow.** Razorpay sheet / UPI / 3DS redirect; loading + result.
**14.3 Result.** Success → booking continues; failure → reason + retry/alternate method.

### UI COMPONENTS REQUIRED
PaymentMethodSelector, add-method sheet (tokenized), Razorpay checkout integration, loading overlay, result screen, retry CTA.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| amount_minor | int | system | equals server quote | client cannot alter |
| method | enum | yes | authorized | card/upi/wallet/netbanking/cash/corporate |
| payment_token | string | tokenized | gateway token | never raw PAN |
| idempotency_key | string | yes | unique | prevents double-charge |
| gateway_order_id | string | system | from server | Razorpay order |

### BUSINESS LOGIC
The server creates a Razorpay order; the client opens checkout with the **public** key only. Card/UPI are tokenized by the gateway — the app never sees or stores raw card data (PCI scope offloaded). Every payment uses an idempotency key so retries don't double-charge. Final amount and final promo discount are authoritative from the server. Gateway webhooks (server-side, signature-verified) are the source of truth for success; the client polls/awaits confirmation rather than trusting only the client callback. On failure, the customer can retry or pick another method. Cash is recorded as a settlement type; wallet debits go through the ledger. Corporate billing (if enabled) routes to an invoice rather than instant capture.

### ROLE-BASED ACCESS CONTROL (RBAC)
payment.init/confirm (own booking), payment_methods.manage (own).

### API REQUIREMENTS
`POST /app/payments/init` (creates gateway order, Idempotency-Key), `POST /app/payments/confirm` (verify), `GET /app/payments/{id}` (status), `POST /app/payment-methods` (tokenize), `GET /app/payment-methods`, webhook handled server-side (`/payments/webhook`, not a client API).

### DATABASE & ENTITY RELATION
`payments (N) — (1) bookings`, `payment_methods (N) — (1) customers` (tokens only), `wallet_transactions`/`ledger_entries` for wallet/refunds.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Checkout] -> POST init (idempotent) -> gateway order
   -> open Razorpay (public key) -> 3DS/UPI -> client callback
   -> server confirms via webhook (signature) = source of truth
   -> success? continue booking : show failure -> retry/alternate
[never] trust client-only success ; [never] store raw card
```

---

## Module 15 — Wallet

### MODULE PURPOSE
Provide an in-app wallet for fast payments, refunds, promo credits, and referral rewards: view balance, top up via gateway, see transaction history, and use wallet at checkout.

### SUBMODULES
Balance & Top-Up, Transaction History, Wallet at Checkout, Refund Credits.

### SCREEN-WISE BREAKDOWN
**15.1 Wallet Home.** Balance, top-up CTA, recent transactions.
**15.2 Top-Up.** Amount entry, pay via gateway, success updates balance.
**15.3 Transactions.** Filterable ledger (credits/debits, refunds, rewards).

### UI COMPONENTS REQUIRED
WalletCard (balance), top-up sheet, transaction list with filters, MoneyInput, StatusBadge.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| balance_minor | int | system | ≥0 | non-negative |
| topup_amount_minor | int | yes | ≥ min, ≤ max | gateway |
| txn.type | enum | system | credit/debit | double-entry |
| txn.reference | string | system | booking/topup/refund/reward | — |

### BUSINESS LOGIC
Wallet is a ledger account; balance never goes negative for customers. Top-ups go through the same idempotent gateway flow; the wallet is credited only on confirmed payment (webhook source of truth). Refunds (per policy) and promo/referral rewards credit the wallet. At checkout, wallet can fully or partially pay (with another method covering the remainder if allowed). All movements are double-entry journaled server-side.

### ROLE-BASED ACCESS CONTROL (RBAC)
wallet.view / wallet.topup / wallet.use (own).

### API REQUIREMENTS
`GET /app/wallet`, `GET /app/wallet/transactions`, `POST /app/wallet/topup` (Idempotency-Key), wallet usage flows through `/app/payments/*`.

### DATABASE & ENTITY RELATION
`wallets (1) — (1) customers`, `wallets (1) — (N) wallet_transactions`; balances derive from `ledger_entries`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Top-up] -> amount -> gateway (idempotent) -> webhook confirm -> credit wallet -> update balance
[Checkout w/ wallet] -> debit (>= balance? block / partial+other method) -> ledger
[Refund/Reward] -> credit wallet -> txn
```

---

## Module 16 — Promotions, Coupons & Referrals

### MODULE PURPOSE
Let customers discover and apply promo codes, see active offers, and participate in referrals (share a code, earn rewards), with all eligibility and budget enforced server-side.

### SUBMODULES
Offers List, Apply Coupon, Referral Share & Track, Reward Wallet Credits.

### SCREEN-WISE BREAKDOWN
**16.1 Offers.** List of available/eligible promotions with terms.
**16.2 Apply.** Enter/apply a code at estimate or checkout; see discount preview (final at confirm).
**16.3 Referral.** Personal referral code, share sheet, referral status/earnings.

### UI COMPONENTS REQUIRED
Offers list, PromoInput, referral share card + share sheet, reward status, EmptyState.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| code | string | yes | active, eligible, not expired | server-validated |
| discount_preview_minor | int | system | tentative | final at confirm |
| referral_code | string | system | unique to customer | shareable |
| referral_status | enum | system | pending/qualified/rewarded | — |

### BUSINESS LOGIC
All validation (segment, service/route eligibility, per-customer and total limits, budget) is server-side; the client only previews. Promotions are generally non-stackable. Referral reward posts only after the referee's first qualifying completed booking; fraud guards (self-referral, device/instrument collusion) run server-side. Rewards credit the wallet. Cancellation post-redemption reverses the promo per policy.

### ROLE-BASED ACCESS CONTROL (RBAC)
promotions.view, coupon.apply, referral.view/share (own).

### API REQUIREMENTS
`GET /app/promotions` (eligible), `POST /app/coupons/validate`, `GET /app/referral` (code+status), referral application handled at signup (Module 2).

### DATABASE & ENTITY RELATION
`promotions`, `coupon_redemptions (customer_id, booking_id)`, `referrals (referrer_id, referee_id, status)`; rewards → `wallet_transactions`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Apply code] -> server validate(eligibility/limits/budget) -> preview discount
   -> at confirm: recompute authoritative discount -> apply
[Referral] -> share code -> referee signs up + completes first ride -> fraud check -> reward both (wallet)
```

---

## Module 17 — Ratings & Reviews

### MODULE PURPOSE
Capture the customer's post-trip/flight rating and optional feedback to feed driver/operator quality, with a light, skippable flow.

### SUBMODULES
Post-Trip Rating, Tags & Comment, Tip (optional), Low-Rating Follow-Up.

### SCREEN-WISE BREAKDOWN
**17.1 Rating Sheet.** 1–5 stars, suggested tags (clean, safe, on-time…), optional comment; optional tip (if enabled); submit/skip.
**17.2 Low-Rating Follow-Up.** If low, offer to raise a support ticket.

### UI COMPONENTS REQUIRED
RatingSheet (stars + tags), comment field, tip selector (optional), submit/skip, link to support.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| rating | int | yes(if submit) | 1–5 | — |
| tags[] | string[] | no | from set | service-specific |
| comment | text | no | ≤500, sanitized | — |
| tip_minor | int | no | ≥0, if enabled | charged via payment |

### BUSINESS LOGIC
One rating per booking, allowed only after completion and before a cutoff. Tip (if enabled) is charged through the payment flow and credited to driver earnings. Low ratings can branch to support. Ratings update the counterpart's rolling average server-side.

### ROLE-BASED ACCESS CONTROL (RBAC)
rating.submit (own completed booking).

### API REQUIREMENTS
`POST /app/bookings/{id}/rating`, `POST /app/bookings/{id}/tip` (if enabled).

### DATABASE & ENTITY RELATION
`ratings (booking_id, customer_id, target driver/operator)`; tip → `payments`/`wallet_transactions`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Completion] -> rating sheet -> stars(+tags/comment) -> submit (one per booking)
   -> low? -> offer support ticket
   -> tip? -> charge -> driver earning
```

---

## Module 18 — Booking History & Receipts

### MODULE PURPOSE
Give customers a complete, filterable record of past and upcoming bookings (road + air), with detailed receipts, re-book, and access to support per booking.

### SUBMODULES
Activity List, Booking Detail, Receipt/Invoice, Re-Book, Per-Booking Support.

### SCREEN-WISE BREAKDOWN
**18.1 Activity.** Tabs (Upcoming / Completed / Cancelled); list with service icon, route, date, status, amount; filters (service, date range, status).
**18.2 Detail.** Full booking detail, fare breakdown, payment, driver/operator info, map/route, actions (receipt, rebook, support, rate if pending).
**18.3 Receipt.** Itemized, downloadable/shareable invoice (tax-compliant per deployment).

### UI COMPONENTS REQUIRED
Tabbed list, FilterBar, BookingStatusCard, DetailDrawer/page, ReceiptView (share/download), rebook CTA, support link.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| filter.service / status / date_range | enum/date | client filters |
| booking summary fields | object | route, date, status, amount |
| receipt | object | itemized fare + tax + payment |

### BUSINESS LOGIC
History is ownership-scoped and paginated. Receipts reflect the final fare breakdown and tax rules of the deployment. Re-book pre-fills a new booking from a past one. Upcoming includes scheduled and confirmed-future air. Per-booking support opens a ticket pre-linked to that booking (Module 22).

### ROLE-BASED ACCESS CONTROL (RBAC)
booking.history.view, receipt.view, rebook (own).

### API REQUIREMENTS
`GET /app/bookings?status=&service=&from=&to=`, `GET /app/bookings/{id}`, `GET /app/bookings/{id}/receipt`, `POST /app/bookings/{id}/rebook`.

### DATABASE & ENTITY RELATION
`bookings` (own) with `fare_breakups`, `payments`, `trips`/`flights`. Receipts derived; no separate writable entity.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Activity] -> filter -> list (own, paginated)
[Detail] -> fare/payment/route -> actions (receipt/rebook/support/rate)
[Rebook] -> prefill new booking from past
```

---

## Module 19 — Profile, Saved Places & Payment Methods

### MODULE PURPOSE
Let customers manage their identity, saved places (home/work/custom), saved payment methods (tokenized), emergency contacts, and communication preferences.

### SUBMODULES
Profile Info, Saved Places, Payment Methods, Emergency Contacts, Communication Preferences.

### SCREEN-WISE BREAKDOWN
**19.1 Profile.** Name, email (verify), phone (change via OTP), photo, gender/DOB (optional), language.
**19.2 Saved Places.** Add/edit home/work/custom with map + label.
**19.3 Payment Methods.** List tokenized methods; add/remove; set default.
**19.4 Emergency Contacts.** Add contacts for SOS/ride-share.
**19.5 Preferences.** Notification channel and marketing toggles.

### UI COMPONENTS REQUIRED
FormBuilder, avatar uploader, saved-place editor with MapView, PaymentMethodSelector (manage), contacts list, preference toggles, ConfirmDialog.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| name | string | yes | 2–80 | — |
| email | string | no | RFC-5322, verify | optional |
| phone change | string | via OTP | E.164 | re-verify |
| saved_place.label/geo | string/geo | yes | valid | home/work/custom |
| payment_method | token | — | gateway token | no raw PAN |
| emergency_contacts[] | object[] | no | E.164 | for SOS/share |
| consent_marketing | bool | no | — | editable |

### BUSINESS LOGIC
Phone change requires OTP re-verification. Email change requires verification link. Payment methods store only gateway tokens. Saved places power the location picker. Emergency contacts feed SOS and ride-share. Marketing consent is editable independently of required terms. All edits ownership-scoped and audited where sensitive.

### ROLE-BASED ACCESS CONTROL (RBAC)
profile.view/edit, saved_places.manage, payment_methods.manage, contacts.manage, preferences.manage (own).

### API REQUIREMENTS
`GET/PATCH /app/me`, `POST /app/me/phone/change` (OTP), `GET/POST/DELETE /app/me/saved-places`, `GET/POST/DELETE /app/me/payment-methods`, `GET/POST/DELETE /app/me/emergency-contacts`, `PATCH /app/me/preferences`.

### DATABASE & ENTITY RELATION
`customers (1) — (N) saved_places`, `(1) — (N) payment_methods`, `(1) — (N) emergency_contacts`, `(1) — (1) preferences`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Edit profile] -> validate -> (phone change? OTP) (email? verify) -> save
[Saved place] -> map + label -> save -> available in picker
[Payment method] -> tokenize via gateway -> store token -> set default
```

---

## Module 20 — Notifications & Notification Center

### MODULE PURPOSE
Receive and surface all customer-facing notifications (booking lifecycle, driver/flight updates, payments, promos) via push (FCM), in-app center, and (where configured) SMS/email, with per-channel preferences.

### SUBMODULES
Push Handling (FCM), In-App Center, Deep-Linking, Preferences, Quiet Hours.

### SCREEN-WISE BREAKDOWN
**20.1 Notification Center.** Feed of notifications with read/unread, filters by type; tap → deep link to the relevant screen.
**20.2 Permission Priming.** Soft-ask before OS push permission with rationale.

### UI COMPONENTS REQUIRED
Notification feed, unread badges, filters, permission-priming sheet, deep-link router.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| notification.type | enum | booking/driver/flight/payment/promo |
| notification.deeplink | string | target screen |
| notification.status | enum | delivered/read |
| fcm_token | string | device push token |

### BUSINESS LOGIC
Push via FCM (buyer's Firebase project); device token registered on login and refreshed. Soft-ask precedes the OS prompt. Critical notifications (driver arrived, flight boarding/delay, payment failure) bypass quiet hours; promotional ones respect quiet hours and marketing consent. Each notification carries a deep link. Delivery/read status tracked. SMS/email fire via adapters where the buyer enabled them.

### ROLE-BASED ACCESS CONTROL (RBAC)
notifications.view (own), preferences.manage (own).

### API REQUIREMENTS
`POST /app/devices/register` (FCM token), `GET /app/notifications`, `POST /app/notifications/{id}/read`, `PATCH /app/me/preferences` (channels/quiet hours). Socket.IO `app.notifications.{customerId}` for in-app realtime.

### DATABASE & ENTITY RELATION
`notifications` (own), `device_tokens (customer_id, fcm_token, platform)`, `preferences`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Login] -> register FCM token
[Event] -> server resolves recipient -> push (FCM) + in-app feed (socket)
   -> critical? bypass quiet hours : respect quiet hours + marketing consent
[Tap] -> deep link to screen
```

---

## Module 21 — Safety & SOS

### MODULE PURPOSE
Provide always-available safety tools during a trip/flight: SOS, share-trip, emergency contacts, and quick access to help, aligned to ride-hailing safety expectations.

### SUBMODULES
SOS Trigger, Share Trip, Emergency Contacts Quick-Dial, Safety Center.

### SCREEN-WISE BREAKDOWN
**21.1 In-Trip Safety.** SOS button (confirm to avoid accidental), share-trip link, emergency contacts; visible on tracking screens.
**21.2 Safety Center.** Safety info, settings, configured emergency number (deployment-specific).

### UI COMPONENTS REQUIRED
SosButton (with confirm), share-trip sheet, emergency contacts quick-dial, safety info page.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Notes |
|---|---|---|
| sos.booking_id | UUID | active trip context |
| sos.location | geo | current |
| share_link | string | tokenized, time-limited |
| emergency_number | string | deployment-configured |

### BUSINESS LOGIC
SOS captures current location + booking context and notifies the configured channel (admin/dispatcher alert and/or local emergency number, per deployment) — the platform does not falsely guarantee emergency-service integration; behavior is deployment-configured and disclosed. Share-trip generates a tokenized, time-limited public tracking link. Emergency contacts (from profile) are one-tap. All SOS events are logged.

### ROLE-BASED ACCESS CONTROL (RBAC)
safety.sos / safety.share (own active booking).

### API REQUIREMENTS
`POST /app/safety/sos`, `POST /app/bookings/{id}/share` (tokenized link), `GET /app/safety/info`.

### DATABASE & ENTITY RELATION
`sos_events (booking_id, customer_id, location, created_at)`, share tokens (short-lived). Reads emergency contacts.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Trip active] -> SOS (confirm) -> capture location+context -> alert configured channel -> log
[Share trip] -> generate tokenized time-limited link -> share
[Emergency contact] -> one-tap dial
```

---

## Module 22 — Support & Help

### MODULE PURPOSE
Let customers find answers (FAQ), raise support tickets (optionally pre-linked to a booking), track resolution, and chat with support — feeding the Admin Support console.

### SUBMODULES
Help Center / FAQ, Raise Ticket, My Tickets, In-App Chat.

### SCREEN-WISE BREAKDOWN
**22.1 Help Center.** Searchable FAQ by category.
**22.2 Raise Ticket.** Category, description, optional booking link, attachments; submit.
**22.3 My Tickets.** List + detail with status timeline and message thread.

### UI COMPONENTS REQUIRED
FAQ search/list, ticket form (FormBuilder + FileUploader), ticket list, CommentThread, StatusBadge.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| category | enum | yes | from set | routes queue |
| description | text | yes | ≤2000, sanitized | — |
| linked_booking_id | UUID | no | own booking | context |
| attachments[] | file | no | type/size, scanned | — |
| status | enum | system | open/in_progress/resolved/closed | — |

### BUSINESS LOGIC
Tickets created here flow into the Admin Support module with SLA tracking. Booking-linked tickets pre-attach context. Customers see status and can reply until closed; closing may prompt CSAT. FAQ is deployment-configurable content.

### ROLE-BASED ACCESS CONTROL (RBAC)
support.faq.view, ticket.create/view/reply (own).

### API REQUIREMENTS
`GET /app/faq`, `POST /app/tickets`, `GET /app/tickets`, `GET /app/tickets/{id}`, `POST /app/tickets/{id}/messages`.

### DATABASE & ENTITY RELATION
`tickets (N) — (1) customers`, `(N) — (0..1) bookings`, `tickets (1) — (N) ticket_messages`.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[FAQ] -> search -> resolve or raise ticket
[Raise] -> category + desc (+booking) -> submit -> Admin queue (SLA)
[Track] -> status timeline + replies -> resolved/closed (CSAT)
```

---

## Module 23 — Settings, Language (i18n/RTL) & Privacy (GDPR)

### MODULE PURPOSE
Centralize app settings: language (full i18n incl. RTL), theme preference, notification/marketing preferences, legal documents, and GDPR rights (data export, account deletion, consent management).

### SUBMODULES
Language & Region, Notification/Marketing Preferences, Legal Documents, GDPR Data Export, Account Deletion, Consent Management, Logout.

### SCREEN-WISE BREAKDOWN
**23.1 Language & Region.** Pick from supported locales (RTL applied live); region/currency display info.
**23.2 Preferences.** Channels + marketing toggles + quiet hours.
**23.3 Legal.** Terms, Privacy, Refund (versioned); re-acceptance when updated.
**23.4 Privacy & Data.** Request data export; request account deletion; manage consents.
**23.5 Logout.**

### UI COMPONENTS REQUIRED
Language picker, preference toggles, legal doc viewer, data-export request, delete-account flow (typed confirm), consent manager, logout CTA.

### FIELD-LEVEL SPECIFICATION
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| locale | string | yes | supported, RTL flag | live apply |
| consent_marketing | bool | no | — | editable |
| data_export_request | action | — | rate-limited | GDPR |
| account_delete_request | action | typed confirm | GDPR | anonymize + retain financial |

### BUSINESS LOGIC
Language switching applies immediately and flips layout for RTL locales; all strings come from externalized locale files (i18n required from launch). Legal-doc version bumps force re-acceptance. GDPR: data export compiles the customer's data into a downloadable archive; account deletion anonymizes PII while retaining legally required financial records (configurable retention) and is a typed-confirmation destructive action. Consents are versioned and editable; withdrawing marketing consent stops marketing notifications.

### ROLE-BASED ACCESS CONTROL (RBAC)
settings.manage, privacy.export, privacy.delete, consent.manage (own).

### API REQUIREMENTS
`PATCH /app/me/preferences`, `GET /app/legal/{type}`, `POST /app/me/legal/accept`, `POST /app/me/privacy/export`, `POST /app/me/privacy/delete`, `GET/POST /app/me/consents`, `POST /app/auth/logout`.

### DATABASE & ENTITY RELATION
`preferences`, `consents`, `privacy_requests` (own). Locale stored on customer/preferences.

### WORKFLOW DIAGRAM LOGIC (TEXT)
```
[Change language] -> apply locale + RTL live
[Legal updated] -> prompt re-accept -> store version
[Data export] -> request -> server compiles archive -> deliver
[Delete account] -> typed confirm -> anonymize PII (retain financial per law) -> logout
```

---

# Appendix A — Customer Access & Ownership Matrix

The customer surface has one role (Customer) + Guest. Access is governed by authentication state and strict ownership scoping (a customer touches only their own data).

| Capability | Guest | Customer | Ownership-Scoped |
|---|---|---|---|
| Fetch config / legal | ✓ | ✓ | n/a (public) |
| Browse services / availability | ✓ | ✓ | n/a |
| Place search / zone validate | ✓ | ✓ | n/a |
| Fare estimate / promo preview | ✓ | ✓ | n/a |
| Request/verify OTP | ✓ | ✓ | self |
| Create / view / cancel / reschedule booking | ✗ | ✓ | own only |
| Tracking / flight status | ✗ | ✓ | own booking |
| Payments / wallet | ✗ | ✓ | own |
| Ratings / tips | ✗ | ✓ | own completed booking |
| History / receipts | ✗ | ✓ | own |
| Profile / saved places / payment methods | ✗ | ✓ | own |
| Notifications / preferences | ✗ | ✓ | own |
| Safety / SOS / share | ✗ | ✓ | own active booking |
| Support tickets | limited (FAQ) | ✓ | own |
| Privacy export / delete / consents | ✗ | ✓ | self |

Server enforcement: every authenticated endpoint injects `customer_id` from the JWT; any attempt to reference another customer's resource returns `403`. The client never holds business logic for pricing, eligibility, or dispatch.

---

# Appendix B — Customer-Facing Entity Overview

Customer-touched entities (read/write per ownership): `customers (1)→(1) wallets`, `(1)→(N) saved_places`, `(1)→(N) payment_methods` (tokens only), `(1)→(N) emergency_contacts`, `(1)→(1) preferences`, `(1)→(N) consents`, `(1)→(N) device_tokens`, `(1)→(N) auth_sessions`, `(1)→(N) bookings`, `(1)→(N) tickets`, `(1)→(N) privacy_requests`, `(1)→(N) sos_events`. Booking spine (read own): `bookings (1)→(N) fare_breakups`, `(1)→(N) payments`, `(1)→(1) trips` (road) / `(1)→(1) flights` (air), `(1)→(N) manifest_passengers` (air, own), `(1)→(N) dispatch_events` (status only). Growth: `promotions` (eligible, read), `coupon_redemptions` (own), `referrals` (own). Catalog/config read-only: `service_zones`, `vehicle_classes`, `aircraft_types`, `routes`, `schedules` (availability), `pricing_rules`/`surge_configs` (via estimate only — never exposed raw), `branding_config`, `feature_flags`, `legal_documents`. Secrets (Maps/Razorpay/FCM private keys) never reach the client; only public keys are in config.

---

# Appendix C — Customer-Side Status & State Reference

**Auth:** guest → otp_sent → authenticated; session refresh; logout.
**Road Booking (customer view):** estimate → requested → (searching) → accepted → arrived → in_progress → completed; cancel branches cancelled_by_customer / cancelled_by_driver / cancelled_by_system; scheduled (future) → (auto-dispatch). 
**Air Booking (customer view):** estimate/quote → requested → (quote_shared for charter/VIP) → confirmed → boarding → departed → arrived → completed; cancel branches cancelled_by_customer / cancelled_by_operator; rescheduled.
**Payment (customer view):** init → processing → success / failed; refund → wallet/original.
**Wallet txn:** credit / debit (topup, booking, refund, reward).
**Rating:** pending → submitted (one per completed booking).
**Ticket:** open → in_progress → resolved → closed.
**Privacy request:** received → in_progress → completed.

---

# Appendix D — Offline, Error & Edge-Case Conventions

The app degrades gracefully and never corrupts money or booking state. Cached config enables warm starts; if config fetch fails with no cache, an ErrorState with retry blocks entry (the app cannot run unbranded/unconfigured). During a live trip, tracking uses Socket.IO with automatic reconnect and a REST polling fallback that shows last-known driver position with a timestamp and a "reconnecting" indicator. Booking creation and all payments use idempotency keys so a network retry never double-books or double-charges; the gateway webhook (server-side) is the source of truth for payment success, so a lost client callback still resolves correctly once connectivity returns. Seat holds for air bookings expire and release if checkout is abandoned. Promo/fare previews are clearly marked tentative; the authoritative value is always recomputed server-side at confirm, and if it changed (e.g., surge shifted, estimate expired) the app re-discloses before charging. Permission denials (location, push) fall back to manual flows with clear rationale rather than dead-ends. Out-of-zone selections, unavailable classes, expired quotes, and closed schedules all produce explicit, localized messages rather than silent failures. All destructive or financial confirmations require explicit user confirmation, and account deletion uses typed confirmation.

---

**End of Customer App Product Document.**
