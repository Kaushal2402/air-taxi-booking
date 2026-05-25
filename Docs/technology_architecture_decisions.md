# Universal Transportation Booking Platform
## Finalized Technology Stack & Architecture Decision Document

| Field | Value |
|---|---|
| Document Type | Technology & Architecture Decision Record (ADR) — Consolidated |
| Parent Documents | SOW/BRD/FRS/SRS v1.0, Admin Panel Product Document v1.0 |
| Version | 1.0 (Decisions Locked) |
| Status | Baselined — ready for sprint-zero architecture |
| Product Model | White-label software, **sold once as a full solution per buyer** (not operated as SaaS by the vendor) |
| Decision Source | Founder responses to Tier 1–4 decision checklist |

---

## 1. How These Decisions Reshape the Product

Three of your answers, taken together, fix the product's fundamental shape and override several earlier "operated-service" assumptions:

You are selling a **one-time, full-solution white-label package** (items 16, 23, 24), the **buyer is responsible for operators and operational support** (items 20, 23), and the buyer supplies their own third-party service accounts (items 8, 9, 12, 13). The combined consequence is that the platform must be built as a **self-contained, self-hostable, fully-configurable software product** that the buyer deploys into their own environment and connects to their own credentials. The vendor (you) builds and hands over the software; the vendor does not run dispatch desks, support lines, or payment merchant accounts on the buyer's behalf.

This is internally consistent and is the cleanest model for a one-time sale. It means our engineering effort concentrates on configurability, provider-adapter abstraction, and a clean handover/deployment story, rather than on multi-tenant operations tooling. Every place the earlier documents assumed "we operate X," this document corrects it to "buyer operates X; we ship the configurable capability."

---

## 2. Locked Technology Stack

| Layer | Decision | Rationale / Notes |
|---|---|---|
| Customer App | **Flutter** | Single codebase, strong UI consistency, good performance for map-heavy screens |
| Driver App | **Flutter** | Same codebase discipline; background location handled via platform channels |
| Operator Web | React + TypeScript | Web admin-style surface (operator panel) |
| Admin Web | React + TypeScript | Matches Admin Panel Product Document |
| Backend | **Python + FastAPI** | Async-friendly, fast to build, strong ecosystem; pairs well with future data/ML |
| Real-time | **Socket.IO** (python-socketio) + Redis Pub/Sub | Tracking, dispatch, live admin; Redis as fan-out backplane |
| Primary DB | **PostgreSQL + PostGIS** | Transactional integrity + geospatial (zones, routing, nearest-driver) |
| Cache / Pub-Sub | Redis | Sessions, OTP, dispatch queues, Socket.IO backplane, rate limits |
| Maps & Routing | **Google Maps Platform** | Geocoding, Directions, Distance Matrix, Places (buyer supplies API key) |
| Payments | **Razorpay** (first adapter) | Behind a Payment Provider Adapter so others can be added later |
| Push | **Firebase Cloud Messaging** | Buyer supplies their own Firebase project per deployment |
| SMS / WhatsApp | **Code built, no vendor service purchased by us** | Provider Adapter Layer; buyer plugs in their own provider/credentials |
| Email | **SMTP** | Buyer supplies SMTP credentials; adapter supports any SMTP server |
| File Storage | **Adapter: S3 + Firebase Storage** | "Dynamic coding" — provider chosen by config per deployment |
| Cloud Provider | **Deferred** | Architecture kept cloud-agnostic; container-first so any cloud works |
| KYC / Verification | **Not now** | Hooks/interfaces stubbed for later, no integration built |
| Masked Calling | **Not now** | Direct/in-app contact only for v1; interface left open |
| Search/Warehouse | **Deferred** | Reporting served from Postgres read replica initially |
| Observability | **Not now** | Standard structured logging only; full stack added later |
| Deployment Isolation | **Fully isolated per buyer** (separate VPC, DB, compute) | One dedicated stack per buyer; no shared infrastructure |
| Containerization | Docker (assumed, cloud-agnostic) | Enables "deploy anywhere" handover |
| i18n / RTL | **Required from launch** | Externalized strings, locale formatting, RTL layouts |
| Data Privacy | **GDPR-aligned** | Export + delete + consent + retention |

---

## 3. Provider Adapter Layer (Core Architectural Pattern)

Because the buyer supplies their own services and may use different providers, the single most important architectural pattern in this build is the **Provider Adapter Layer**. Each external capability is defined as an abstract interface in the backend; concrete adapters implement it; the active adapter is chosen at runtime by configuration. This is what makes one codebase serve many buyers without code forks.

| Capability | Interface | Adapters Built Now | Future Adapters |
|---|---|---|---|
| Payments | `PaymentProvider` | RazorpayAdapter | StripeAdapter, PayUAdapter, etc. |
| Maps/Routing | `MapsProvider` | GoogleMapsAdapter | MapboxAdapter, HereAdapter |
| Push | `PushProvider` | FCMAdapter | APNs-direct (if ever needed) |
| SMS | `SmsProvider` | GenericHttpSmsAdapter (config-driven) | Twilio/MSG91 concrete adapters |
| WhatsApp | `WhatsAppProvider` | GenericCloudApiAdapter (config-driven) | BSP-specific adapters |
| Email | `EmailProvider` | SmtpAdapter | SES/SendGrid adapters |
| Storage | `StorageProvider` | S3Adapter, FirebaseStorageAdapter | GCS/Azure adapters |
| KYC (stub) | `KycProvider` | NoOpAdapter (interface only) | Onfido/IDfy later |
| Masked Call (stub) | `CallMaskingProvider` | NoOpAdapter (interface only) | Exotel/Twilio later |

**Design rules for adapters.** Each adapter reads its credentials from the deployment's secret configuration (never hard-coded). Switching a provider is a configuration change plus, if a new provider, writing one adapter class — no change to business logic. Stubbed capabilities (KYC, masked calling) ship as no-op adapters that satisfy the interface so the rest of the system compiles and runs, and can be swapped for real adapters later without touching callers. Webhooks from providers (e.g., Razorpay) are verified by signature inside the adapter.

---

## 4. Deployment Architecture (Fully Isolated Per Buyer)

Each buyer receives a **completely isolated stack**: their own network boundary, their own PostgreSQL database, their own Redis, their own application containers, their own object storage bucket, and their own credentials for every third-party provider. Nothing is shared between buyers. This matches your item-5 decision and the one-time-sale model — each sale is effectively a self-standing software instance the buyer owns and operates.

```
Per-Buyer Isolated Deployment (cloud-agnostic, container-first)
┌──────────────────────────────────────────────────────────────┐
│  Buyer Network Boundary (VPC / equivalent)                     │
│                                                                │
│   [Flutter Customer App]   [Flutter Driver App]                │
│   [React Operator Web]     [React Admin Web]                   │
│            │  (HTTPS + WSS)                                     │
│            ▼                                                    │
│   ┌───────────────────────┐                                    │
│   │  API Gateway / Ingress │  TLS termination, rate limiting    │
│   └───────────┬───────────┘                                    │
│               ▼                                                │
│   ┌────────────────────────────────────────────────┐          │
│   │  FastAPI services (stateless, horizontally scaled)│         │
│   │   - Auth/Identity   - Booking (road/air)          │         │
│   │   - Dispatch        - Pricing   - Payments        │         │
│   │   - Notifications   - Reports   - Admin APIs      │         │
│   │   - Socket.IO (tracking/dispatch/live admin)      │         │
│   └───────┬───────────────┬───────────────┬──────────┘         │
│           ▼               ▼               ▼                    │
│   [PostgreSQL+PostGIS]  [Redis]   [Object Storage (S3/Firebase)]│
│       (+ read replica)  (cache,    (per-buyer bucket)          │
│                          pubsub,                               │
│                          socket BB)                            │
│                                                                │
│   Provider Adapter Layer ──► Buyer-supplied external services: │
│     Razorpay │ Google Maps │ FCM │ SMTP │ SMS/WhatsApp         │
└──────────────────────────────────────────────────────────────┘
```

Because the cloud is deferred and the buyer may host anywhere, everything is **container-first and cloud-agnostic**. The handover artifact is a set of Docker images plus infrastructure-as-code templates the buyer (or you, on their behalf at sale time) runs in their chosen environment. No managed service that locks the design to a single cloud is used in v1; storage is abstracted (S3 or Firebase), and Google Maps is cloud-neutral.

---

## 5. Decision-by-Decision Impact on Earlier Documents

This section records exactly what changes in the SOW/BRD/FRS/SRS and Admin Panel documents as a result of your answers, so the team works from a corrected baseline.

### Operating model (items 16, 20, 23, 24)
The earlier documents described vendor-operated concerns (24×7 support coverage, vendor-run dispatch, vendor SLAs as standing commitments). **Corrected:** these become buyer responsibilities. The software still *contains* the support/ticketing console, dispatch console, and SLA configuration — but the buyer staffs and operates them. Vendor SLA, escrow, and roadmap (items 26, 27, 28) are per-contract negotiations, not product features.

### Geography (item 1)
No fixed launch geography. **Corrected:** all geography-sensitive behavior (currency, language, timezone, tax rules, regulatory document sets, cancellation tiers) must be **fully admin-configurable per deployment**, with no hard-coded country assumptions. This raises the priority of the configuration modules (Catalog, Pricing, Settings, Branding, i18n).

### Mobile (item 2) and Backend (item 3)
Flutter + FastAPI locked. **Corrected:** the "Recommended Technology Stack" section of the SOW now reads as final for these layers. Socket.IO references use `python-socketio`.

### Cloud (item 4) and Storage (item 13)
Cloud deferred; storage via adapter (S3 + Firebase). **Corrected:** no cloud-locked managed services in v1. Object storage is abstracted; the deployment chooses S3 or Firebase Storage by config. Backup/DR specifics (RPO/RTO targets in the SRS) remain as design targets but their implementation is finalized once the cloud is chosen.

### Isolation (item 5)
Fully isolated per buyer. **Confirmed and locked** — matches the earlier recommendation. No shared-tenant code paths will be built.

### Real-time (item 6) and Maps (item 7)
Socket.IO + Google Maps locked. **Corrected:** the Maps adapter targets Google Maps Platform APIs (Geocoding, Directions, Distance Matrix, Places); the buyer supplies the API key per deployment.

### Payments (item 8)
Razorpay first. **Corrected:** Payment module is built against the `PaymentProvider` interface with a Razorpay adapter as the only concrete implementation in v1; webhook signature verification per Razorpay. UPI/cards/netbanking/wallet flows route through Razorpay.

### SMS / WhatsApp / Email (item 9)
Build code, buy nothing; email via SMTP. **Corrected:** Notifications module ships SMS and WhatsApp **adapters with no bundled paid service** — the buyer configures their own provider endpoint/credentials. Email uses a generic SMTP adapter. The notification engine, templates, fallback, and delivery logging are all built; only the paid pipe is the buyer's to provide.

### Push (item 12)
FCM locked. **Corrected:** Push adapter targets FCM; **buyer supplies their own Firebase project** per deployment (which also means per-buyer FCM server keys and, for iOS, APNs auth keys uploaded into their Firebase project). This connects to the white-label provisioning checklist.

### KYC (item 10) and Masked Calling (item 11)
Not now. **Corrected:** both ship as no-op adapters behind their interfaces. The driver/operator onboarding flow still uploads and stores documents and tracks expiry (that is core, not KYC-vendor), but no automated third-party verification is wired. Customer–driver contact in v1 is via in-app/direct contact without number masking.

### Search/Warehouse (item 14) and Observability (item 15)
Deferred / not now. **Corrected:** reporting (Admin Module 19) reads from a **PostgreSQL read replica** in v1 instead of a separate warehouse; the report interfaces are unchanged so a warehouse can be slotted in later. Observability is **structured logging only** in v1 (JSON logs, correlation IDs); the full metrics/tracing stack is a later addition. The SRS non-functional targets for logging/observability are reduced to "structured logging + basic health checks" for v1.

### Commission/Pricing model (item 16)
One-time full-solution sale. **Corrected:** there is **no vendor-side commission engine on the sale itself**. The *platform's* commission features (driver/operator commission, payouts) remain — those are the buyer's revenue tools, fully admin-configurable. The vendor's revenue is the one-time license fee, handled outside the software.

### Cancellation tiers (item 17) and Refund destination (item 18)
Admin-managed dynamically. **Confirmed** — already specified as configurable in Admin Modules 13/15/22. **Locked:** both are runtime-editable from the admin panel with no hard-coded defaults beyond a sensible seed.

### Driver onboarding strictness (item 19)
Standard documents required, others optional. **Corrected:** the onboarding policy seeds a **mandatory core document set** (e.g., driving license, vehicle registration, insurance) with all other documents marked optional, and the mandatory/optional flag is configurable in Admin Module 22. The grace-period toggle remains available but defaults to "core documents required before going active."

### Operator approval (item 20)
Buyer's concern. **Corrected:** the vendor builds the operator-management capability (Admin Module 9) but **does not impose** an approval workflow; the buyer decides their own approval process using the provided states and gates. Site-visit gating remains an optional, buyer-controlled toggle.

### i18n / RTL (item 21)
Required at launch. **Confirmed and elevated:** all UI strings externalized into locale files from day one; date/number/currency formatting per locale; full RTL layout support (Arabic/Hebrew/etc.) in both Flutter apps and both React web surfaces. This is now a launch acceptance criterion, not a future item.

### Data retention/deletion (item 22)
GDPR. **Confirmed:** Admin Module 23 privacy features (export, delete/anonymize, consent, retention windows, legal hold) are GDPR-aligned and in scope for v1. Financial records retained per legal minimums even after deletion requests.

### Pricing/escrow/SLA/roadmap (items 24–28)
Mutually decided per contract. **Corrected:** these are commercial/contractual, not product scope. They are removed from the software requirements and noted as deal-level terms in a separate contract template (which I can draft if useful).

---

## 6. Updated Build Priorities (Sprint-Zero Implications)

Given the decisions, the build sequence shifts to front-load configurability and the adapter layer, because those are what make a one-time-sale white-label package work.

The first foundational work is the **Provider Adapter Layer and configuration system** (settings, feature flags, branding, i18n), since every downstream module depends on being able to run without vendor-operated services and to be re-skinned per buyer. Next is **Identity, RBAC, and the admin shell**, because nothing else is reachable or governable without them. Then the **core booking engine for road** (the higher-volume, simpler-to-validate path) including pricing, dispatch over Socket.IO, tracking via Google Maps, and Razorpay payments end-to-end. Then the **air booking path** reusing the booking/pricing/payment spine. In parallel, the **Flutter customer and driver apps** are built against the stabilizing API, with i18n/RTL baked in from the first screen rather than retrofitted. The **notifications engine** (templates, FCM push, SMTP email, SMS/WhatsApp adapters) is built alongside booking since booking events drive most notifications. **Reporting** is built last in v1 against the Postgres read replica.

The deferred items (warehouse, observability stack, KYC, masked calling) are explicitly *not* built in v1 but are kept behind interfaces so they can be added without rework.

---

## 7. White-Label Provisioning Checklist (Per Buyer, Given These Decisions)

Because the buyer brings their own services, the handover/provisioning step now has a concrete checklist. A buyer deployment is "ready" when all of the following are supplied and configured:

The buyer provides their **brand kit** (logo light/dark, colors, brand name, fonts, legal documents) configured in Admin Module 21; their **Google Maps Platform API key**; their **Razorpay account keys and webhook secret**; their **Firebase project** (for FCM push, and optionally Firebase Storage) with iOS APNs auth key uploaded; their **SMTP credentials** for email; their **SMS/WhatsApp provider endpoint and credentials** (if they want those channels active — the system runs without them, falling back to push/email); their **object storage choice and credentials** (S3 bucket or Firebase Storage); their **currency, language(s) including any RTL, timezone, and tax rules**; their **mandatory/optional document set** for driver onboarding; and their **cancellation tiers and refund destination policy**. Once these are set and the Module 21 readiness checklist passes, the deployment can go live.

---

## 8. Open Items Still Requiring Your Input (Non-Blocking)

These do not block architecture but should be answered before the relevant module is built:

Whether item 7 means **Google Maps only** (cloud-agnostic, my assumption) or a genuine **commitment to GCP** as the cloud — this affects whether storage defaults to GCS. Whether the **two Flutter apps** ship under your (vendor) store accounts as a demo/template and are re-published under each buyer's accounts at sale, or whether each buyer always publishes fresh — this affects the provisioning runbook. Whether you want me to draft the **contract-level template** covering items 24–28 (pricing, escrow, SLA, roadmap) as a separate non-software document. And confirmation that **v1 customer–driver contact without number masking** is acceptable for your first buyers, since some markets expect masking.

---

## 9. Decision Log (Locked)

| # | Decision | Status |
|---|---|---|
| 1 | Geography: none fixed; fully configurable per deployment | Locked |
| 2 | Mobile: Flutter (both apps) | Locked |
| 3 | Backend: Python + FastAPI | Locked |
| 4 | Cloud: deferred; container-first, cloud-agnostic | Locked (deferred) |
| 5 | Isolation: fully isolated per buyer | Locked |
| 6 | Real-time: Socket.IO + Redis | Locked |
| 7 | Maps: Google Maps Platform (buyer key) | Locked |
| 8 | Payments: Razorpay adapter (interface for more) | Locked |
| 9 | SMS/WhatsApp: built, buyer-supplied service; Email: SMTP | Locked |
| 10 | KYC: not now (no-op adapter) | Locked (deferred) |
| 11 | Masked calling: not now (no-op adapter) | Locked (deferred) |
| 12 | Push: FCM (buyer Firebase project) | Locked |
| 13 | Storage: S3 + Firebase adapters, config-driven | Locked |
| 14 | Warehouse: deferred; Postgres read replica for reports | Locked (deferred) |
| 15 | Observability: structured logging only in v1 | Locked (deferred) |
| 16 | Sale model: one-time full-solution; no vendor commission engine | Locked |
| 17 | Air cancellation tiers: admin-managed dynamically | Locked |
| 18 | Refund destination: admin-managed dynamically | Locked |
| 19 | Driver onboarding: core docs required, others optional, configurable | Locked |
| 20 | Operator approval: buyer's responsibility | Locked |
| 21 | i18n + RTL: required at launch | Locked |
| 22 | Data privacy: GDPR-aligned | Locked |
| 23 | Support coverage: buyer-operated (one-time sale) | Locked |
| 24–28 | Pricing/escrow/SLA/roadmap: per-contract, mutually decided | Out of software scope |

---

**End of Decision Document.**
