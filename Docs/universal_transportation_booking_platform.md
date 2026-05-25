# Universal Transportation Booking Platform
## Combined SOW / BRD / FRS / SRS — White-Label Edition

| Field | Value |
|---|---|
| Document Type | SOW + BRD + FRS + SRS (Consolidated) |
| Product Name | Universal Transportation Booking Platform (UTBP) |
| Product Type | White-Label, Multi-Tenant-Capable, Re-Brandable Product |
| Version | 1.0 |
| Status | Baselined for Build |
| Prepared By | Senior BA / PM / TPM Team |
| Audience | Founders, Product Owners, Developers, UI/UX Designers, QA, DevOps, Freelancers, Agencies |
| Output Format | Markdown (.md) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Business Goals](#3-business-goals)
4. [User Types & Roles](#4-user-types--roles)
5. [Assumptions](#5-assumptions)
6. [Out of Scope](#6-out-of-scope)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Module-wise Features](#9-module-wise-features)
10. [Booking Workflow](#10-booking-workflow)
11. [Business Logic](#11-business-logic)
12. [User Flow](#12-user-flow)
13. [Admin Features](#13-admin-features)
14. [Customer App Features](#14-customer-app-features)
15. [Driver App Features](#15-driver-app-features)
16. [Air Taxi Operator Features](#16-air-taxi-operator-features)
17. [Payment & Billing Features](#17-payment--billing-features)
18. [Notification Features](#18-notification-features)
19. [Reports & Analytics](#19-reports--analytics)
20. [Security Requirements](#20-security-requirements)
21. [API Requirements](#21-api-requirements)
22. [Third-Party Integrations](#22-third-party-integrations)
23. [Database Considerations](#23-database-considerations)
24. [Recommended Technology Stack](#24-recommended-technology-stack)
25. [Deployment Considerations](#25-deployment-considerations)
26. [Testing Requirements](#26-testing-requirements)
27. [Acceptance Criteria](#27-acceptance-criteria)
28. [Future Scope](#28-future-scope)
29. [Appendix A — Detailed Feature Specifications](#appendix-a--detailed-feature-specifications)
30. [Appendix B — Data Dictionary (Core Entities)](#appendix-b--data-dictionary-core-entities)
31. [Appendix C — Status Codes & State Machines](#appendix-c--status-codes--state-machines)
32. [Appendix D — RACI Matrix](#appendix-d--raci-matrix)
33. [Appendix E — Glossary](#appendix-e--glossary)

---

## 1. Executive Summary

The Universal Transportation Booking Platform (UTBP) is a re-brandable, end-to-end transportation product that unifies on-road taxi services (cabs, bike taxis, rentals, outstation) and air taxi services (helicopters, charter aircraft, air shuttles, VIP/private air travel) into a single, cohesive product. The platform is engineered as a **white-label deliverable**: one shared, hardened codebase that can be re-skinned and re-branded per buyer (logo, brand name, color theme, company details, legal documents, domain, app bundle identifiers) while the core functional, operational, and architectural behavior remains uniform across all deployments.

Unlike a multi-tenant SaaS, the white-label model means each buyer receives an independent deployment instance — their own dedicated environment, app bundles, database, and domain — derived from the same parent product. This document captures the Scope of Work, Business Requirements, Functional Requirements, and Software Requirements in one consolidated specification so that founders can plan, product owners can prioritize, designers can wireframe, developers can build, QA can validate, and DevOps can deploy without any further requirements gathering.

The platform consists of five primary surfaces: a web-based Super Admin Panel, a Customer Mobile App (Android + iOS), a Driver Mobile App (Android + iOS), an Operator Web Panel (used by helicopter and charter operators), and a shared back-end API platform. All surfaces are backed by a real-time engine for dispatch, tracking, notifications, and payment processing.

The document is structured to be implementation-ready. Every major module includes its description, user roles, workflow, business logic, validation rules, edge cases, API expectations, UI expectations, and acceptance criteria so that the build can be parallelized across teams or vendors with minimal ambiguity.

---

## 2. Product Overview

UTBP is a transportation booking product that lets end customers book and manage:

On the road, customers can book an instant cab ride, a bike taxi for short urban hops, an hourly or daily rental vehicle, or a long-distance outstation trip. They can schedule a ride for a future date and time, track the assigned driver in real time, view fare estimates, pay through multiple channels, rate the trip, and view their ride history.

In the air, customers can request a helicopter booking on a defined route or on-demand, charter an aircraft for a private flight, book a seat on a scheduled air shuttle, or arrange VIP/private air travel for executive or premium use cases. Operator partners use a dedicated panel to publish flight availability, manage aircraft fleets, accept and dispatch bookings, manage pilots and crew, and reconcile payouts.

The platform is governed by a central Admin Panel where the white-label owner configures the catalog (vehicle classes, aircraft types, service zones), pricing rules (base fare, per-km, surge, peak, night charge, weight/baggage rules for air), commissions, payouts, drivers, operators, customers, promotions, and system settings.

The product is delivered as a **single codebase with build-time and run-time configuration layers** that produce a unique, branded deployment for each buyer. A white-label provisioning workflow handles the creation of a new buyer instance, including brand assets, theme tokens, legal pages, payment credentials, map keys, push certificates, and store listings.

---

## 3. Business Goals

The business goals of the UTBP product are framed at two levels: the goals of the product company selling the white-label, and the goals of the buyer reselling the branded platform to their end customers.

For the product company, the goal is to build one well-engineered transportation platform that can be sold repeatedly to taxi aggregators, mobility startups, air charter operators, hospitality groups, and tourism boards, with low per-buyer customization cost. The platform should reduce time-to-market for a new buyer from months to weeks, support both road and air transportation under one product narrative, and command a premium price point because of the rare combination of road plus air capabilities in a single deliverable.

For the buyer, the goal is to launch a fully functional transportation business under their own brand without building from scratch. The platform should give the buyer operational control through the admin panel, the ability to onboard drivers and operators, the ability to run promotions and pricing experiments, visibility into operations through reports, and the confidence that the underlying platform is secure, reliable, scalable, and compliant.

| Goal Category | Measurable Outcome |
|---|---|
| Time-to-launch | New white-label deployment live within 2–4 weeks of brand-kit handover |
| Cost efficiency | Per-buyer customization effort under 80 person-hours |
| Revenue per buyer | Recurring license + transaction commission revenue |
| Operational uptime | 99.9% monthly uptime per buyer instance |
| Booking success rate | ≥ 95% of confirmed bookings completed without dispatcher intervention |
| Driver/operator retention | ≥ 80% active month-over-month |
| Customer rating | App store average ≥ 4.3 |

---

## 4. User Types & Roles

The platform supports a layered role model. Roles exist at the product level (shared across deployments) and at the deployment level (per buyer). The following roles are first-class:

**Super Admin** is the buyer's top-level administrator with full control over their deployment. They configure the platform, manage staff, oversee operations, view financials, and approve high-value actions. **Sub-Admin / Operations Manager** is a delegated admin with scoped permissions (for example, only fleet management, only finance, only support). **Support Agent** handles customer queries, ride disputes, and assists with bookings on behalf of customers. **Finance Manager** handles payouts, refunds, settlements, and reconciliation. **Dispatcher** monitors live bookings, intervenes when auto-dispatch fails, and manages exceptions.

**Customer** is the end user who books a ride or a flight, makes payment, and rates the service. **Driver** is the on-road service provider who accepts ride requests, drives the customer, and earns from completed trips. **Air Taxi Operator** is the partner organization that owns or manages aircraft. **Pilot / Crew** is the aviation equivalent of a driver, attached to an operator. **Vendor / Fleet Owner** owns vehicles or aircraft and may manage multiple drivers or pilots under their account.

A **Guest** is an unauthenticated user who can browse fares, view service availability, and start a booking flow, but must register or sign in to confirm. The **System** itself is treated as an actor for automated jobs (auto-dispatch, fare finalization, settlement runs).

| Role | Surface | Authentication | Key Capabilities |
|---|---|---|---|
| Super Admin | Admin Web | Email + Password + 2FA | Full system control, configuration, financials |
| Sub-Admin | Admin Web | Email + Password + 2FA | Scoped admin functions |
| Support Agent | Admin Web | Email + Password | Customer support, booking assistance |
| Finance Manager | Admin Web | Email + Password + 2FA | Payouts, refunds, reconciliation |
| Dispatcher | Admin Web | Email + Password | Live dispatch, exception handling |
| Customer | Mobile App | Phone + OTP / Social | Book, pay, track, rate |
| Driver | Mobile App | Phone + OTP + Doc Verification | Accept rides, navigate, earn |
| Operator | Operator Web | Email + Password + 2FA | Fleet, pilots, flights, payouts |
| Pilot / Crew | Mobile or Web | Phone + OTP / Email | Flight assignments, status updates |
| Vendor / Fleet Owner | Web Panel | Email + Password | Vehicle/aircraft management, driver/pilot management |
| Guest | Mobile / Web | None | Browse fares, start booking |
| System | N/A | Service-level | Automated dispatch, settlement, notifications |

---

## 5. Assumptions

The build of UTBP assumes a defined set of conditions. The platform assumes that buyers will provide their own legal registrations, fleet, drivers, operators, payment merchant accounts, map API keys, SMS/email service credentials, and push notification certificates. The product company is responsible for the software; the buyer is responsible for the regulated transportation business itself.

The platform assumes that internet connectivity is available for both customers and drivers during the booking and trip lifecycle. Offline tolerance is limited to short reconnection windows on the Driver App (queued status updates and location pings) and is not designed for fully disconnected operation. GPS accuracy is assumed to be within acceptable mobile-network norms, with map provider error handled gracefully.

The platform assumes that all aviation operations comply with local civil aviation authority regulations and that operators carry valid licenses, insurance, and airworthiness certifications. The platform records and enforces document expiry but is not a substitute for regulator compliance. Similarly, the platform assumes drivers carry valid licenses, registration, permits, and insurance, with expiry tracking enforced.

The platform assumes a baseline of one currency, one primary language, and one timezone per buyer deployment, with multi-currency, multi-language, and multi-timezone treated as configurable extensions. The platform assumes payment is processed through certified gateways and that the product itself does not store raw card data (PCI scope is offloaded to the gateway).

The platform assumes the buyer provides 24×7 operational support (dispatchers, support agents) and that the platform's role is to enable, not replace, human operations.

---

## 6. Out of Scope

The following items are explicitly out of scope for the initial baseline release:

The platform will not implement an in-house, end-to-end Maps engine; it will integrate with third-party map providers. The platform will not perform background verification of drivers, pilots, or operators; it will provide the workflow to upload documents and approve, but the actual verification (criminal record check, license validation with authorities, etc.) is the buyer's responsibility, optionally integrated with a third-party verification provider.

The platform will not provide an Airline Reservation System with seat maps, baggage class hierarchies, code-shares, or interline ticketing. Air taxi support is for direct-to-operator bookings of helicopters, charters, and shuttles, not for connecting flights or commercial airline ticketing. The platform will not integrate with global distribution systems (GDS) like Amadeus, Sabre, or Travelport in the baseline release.

The platform will not provide accounting or ERP functionality (general ledger, tax filing, payroll); it will provide structured exports for the buyer's accounting team. The platform will not provide insurance underwriting, only the ability to surface insurance information for trips/flights to customers. The platform will not host any of the buyer's regulated documents except those required for the booking workflow.

The platform will not offer real-time bidding or auction-style fare negotiation between customers and drivers. Fare is rule-driven and computed by the platform. The platform will not, at launch, support food/grocery/parcel delivery, intercity bus/train booking, hotel booking, or package holidays. These are listed in Future Scope.

---

## 7. Functional Requirements

This section enumerates the functional requirements at the platform level. Per-feature details are in [Appendix A](#appendix-a--detailed-feature-specifications).

| FR ID | Functional Requirement |
|---|---|
| FR-01 | The system shall allow customers to register, log in, and manage profile via phone OTP and optionally email/password or social login. |
| FR-02 | The system shall allow customers to book a cab, bike taxi, rental, outstation, helicopter, charter, or shuttle from a unified app. |
| FR-03 | The system shall provide pre-trip fare estimates for road and air services based on configured pricing rules. |
| FR-04 | The system shall auto-dispatch road taxi requests to the nearest eligible driver based on configurable rules. |
| FR-05 | The system shall allow scheduling of road and air bookings for a future date and time. |
| FR-06 | The system shall provide real-time tracking of the assigned driver/vehicle to the customer until trip completion. |
| FR-07 | The system shall support trip cancellation by customer or driver, with configurable cancellation rules and fees. |
| FR-08 | The system shall calculate the final fare on trip completion using configured base fare, distance, time, surge, waiting time, tolls, and taxes. |
| FR-09 | The system shall allow payment by cash, card, wallet, UPI, net banking, and corporate billing as configured. |
| FR-10 | The system shall handle driver earnings, commissions, deductions, and weekly/biweekly/monthly payouts. |
| FR-11 | The system shall allow operators to onboard, manage fleet, publish flight availability, accept bookings, and manage payouts. |
| FR-12 | The system shall send notifications via push, SMS, email, and WhatsApp (where configured) at all key events. |
| FR-13 | The system shall provide an Admin Panel for configuration, operations, finance, support, and reporting. |
| FR-14 | The system shall enforce role-based access control across all surfaces. |
| FR-15 | The system shall maintain auditable logs of all financial, configuration, and account-related actions. |
| FR-16 | The system shall provide structured analytics dashboards and exportable reports. |
| FR-17 | The system shall support promotions, referrals, and loyalty as configurable modules. |
| FR-18 | The system shall expose a documented REST API for third-party integrations. |
| FR-19 | The system shall support a white-label provisioning workflow producing a branded deployment from a brand kit. |
| FR-20 | The system shall be configurable per deployment for currency, language, timezone, tax rules, and regulatory rules. |

---

## 8. Non-Functional Requirements

Non-functional requirements define the quality attributes of the platform. They apply to every deployment regardless of branding.

**Performance** requires that the customer-facing booking screen renders within 2 seconds on a mid-range Android device on a 4G connection, that fare estimate APIs respond within 800 ms at the 95th percentile, that driver location pings are accepted and re-broadcast to the customer within 3 seconds end-to-end, and that admin dashboards load within 4 seconds for the default 7-day window.

**Scalability** requires that a single deployment can support at least 50,000 concurrent users, 5,000 concurrent active trips, and 100,000 daily completed bookings without architectural change. The platform shall scale horizontally by adding stateless service instances behind a load balancer, with stateful components (database, cache, message broker) sized per buyer and capable of vertical and read-replica scaling.

**Security** requires encryption in transit (TLS 1.2+), encryption at rest for the database, hashed and salted passwords (Argon2id or bcrypt), JWT-based authentication with short access tokens and rotating refresh tokens, OWASP Top 10 mitigations, 2FA for admin and operator roles, and PCI-DSS-aligned handling of payment data through certified gateways without storing PAN or CVV.

**Reliability** requires monthly uptime ≥ 99.9% per buyer instance. Each component shall be deployable as redundant instances; database shall run with at least one read replica; trip and payment state shall be persisted before any irreversible side effect (notification, driver dispatch, payout) is triggered.

**Availability** requires planned maintenance windows announced 7 days in advance, with hot deployment for application updates and rolling restarts for stateful upgrades. The platform must serve booking flows even when ancillary services (analytics, reports) are degraded.

**Logging** requires structured JSON logs for all services, correlation IDs propagated across services per request, retention of operational logs for 30 days, audit logs for 7 years, and PII redaction in logs.

**Backup & Recovery** requires daily full database backups, point-in-time recovery for the last 7 days, off-site backup retention for 30 days, an RPO of 15 minutes, and an RTO of 4 hours. Backup restore drills shall be executed at least quarterly.

**Maintainability** requires modular service boundaries, documented APIs, automated tests covering at least 70% of business logic, and a CI/CD pipeline with linting, type-checking, unit, integration, and contract tests.

**Compliance** requires alignment with applicable data protection laws (GDPR, India DPDP, equivalents), surfacing privacy disclosures and consent flows in the apps, and providing data export and deletion workflows for end users.

**Localization** requires that all UI text be externalized into translation files, dates and currencies be formatted per locale, and RTL languages be supported where the buyer's market requires.

---

## 9. Module-wise Features

The platform is organized into modules. Each module is a cohesive group of features that maps to a service boundary in the back-end and a feature area in the front-end.

| Module | Purpose | Primary Roles |
|---|---|---|
| Identity & Access | Registration, login, OTP, KYC, role assignment, RBAC | All |
| White-Label Config | Brand assets, theme, legal docs, store metadata | Product Company, Super Admin |
| Catalog | Vehicle classes, aircraft types, service zones, routes | Super Admin |
| Pricing | Fare rules, surge, peak, night, taxes, promotions | Super Admin, Finance |
| Booking — Road | Cab, bike, rental, outstation, scheduling | Customer, Driver, Dispatcher |
| Booking — Air | Helicopter, charter, shuttle, VIP | Customer, Operator, Pilot |
| Dispatch | Auto-assignment, queuing, exception handling | Dispatcher, System |
| Tracking | Live location, ETA, route trace, geofence events | Customer, Driver, Dispatcher |
| Payments | Methods, charges, refunds, wallets, payouts | Customer, Finance, Driver, Operator |
| Driver Management | Onboarding, documents, attendance, earnings | Driver, Super Admin |
| Operator Management | Onboarding, fleet, pilots, schedules | Operator, Super Admin |
| Customer Management | Profile, addresses, history, support tickets | Customer, Support |
| Notifications | Push, SMS, email, WhatsApp, in-app | System, All |
| Promotions & Loyalty | Promo codes, referrals, points | Customer, Super Admin |
| Reports & Analytics | Operational, financial, growth dashboards | Super Admin, Finance |
| Support & Ticketing | Issue capture, SLA, resolution | Customer, Support |
| Audit & Compliance | Audit log, data export/delete, document expiry | Super Admin, System |

---

## 10. Booking Workflow

The booking workflow is the central transaction of the platform. It applies, with variation, to all booking types.

### 10.1 Road Taxi — On-Demand Cab/Bike

The customer opens the app, selects "Cab" or "Bike", and enters pickup and drop locations. The app computes available vehicle classes, distance, ETA, and fare estimate via the Pricing service. The customer selects a vehicle class, chooses payment method, optionally applies a promo, and confirms. The booking enters the **Requested** state. The Dispatch service identifies the nearest eligible drivers (within radius, online, not on a trip, vehicle class match, KYC valid) and sends the request to driver #1; if not accepted within the configured window (typically 15–30 seconds), it falls through to #2, and so on, until accepted or exhausted. On acceptance, the booking moves to **Accepted**; the customer sees driver details, vehicle plate, photo, and live location. The driver navigates to pickup; on arrival, the driver marks **Arrived** and the customer is notified; an OTP is generated and shared with the customer; the customer reads the OTP to the driver, who enters it to start the trip → **InProgress**. On reaching the destination, the driver ends the trip → **Completed**; the Pricing service computes the final fare from telemetry (distance, time, waiting, tolls, surge). Payment is settled per the chosen method, and the customer is asked to rate the trip.

### 10.2 Road Taxi — Scheduled / Outstation / Rental

For scheduled rides, the customer selects a future date and time. The booking is parked in **Scheduled** state. The Dispatch service triggers auto-assignment a configurable lead time before pickup (default 30 minutes prior). For outstation, the customer selects round-trip or one-way, dates, and city pair; the fare is computed from the per-km outstation slab plus driver allowance and night halt charge as configured. For rental, the customer selects a package (e.g., 4 hours / 40 km) and confirms; fare includes the package plus per-hour/per-km excess.

### 10.3 Air Taxi — Helicopter / Charter / Shuttle / VIP

For a defined route (e.g., City A → City B), the customer selects "Helicopter" or "Shuttle", selects route and date/time, enters passenger count and baggage details, and confirms. The Booking service places the booking with the matched Operator(s) based on route licensing, availability, and pricing rules. The Operator accepts or rejects within the configured window. On acceptance, the booking moves to **Confirmed**; tickets/boarding passes are generated; the customer receives boarding instructions, terminal/helipad details, and pilot/crew contact (where permitted). On the day of flight, the Operator marks passengers as Boarded, Departed, and Arrived as the flight progresses. Charter and VIP follow the same flow but allow customer-specified itinerary, custom catering, and dedicated aircraft selection.

### 10.4 State Machine

The complete state machine for road and air bookings is in [Appendix C](#appendix-c--status-codes--state-machines).

---

## 11. Business Logic

Business logic is the rule-set that turns raw bookings into priced, dispatched, completed, and settled transactions. The following business rules are platform-defined and configurable per deployment.

**Fare Calculation (Road).** The base formula is `Fare = BaseFare + (DistanceKm × PerKmRate) + (DurationMin × PerMinRate) + WaitingCharge + Tolls + Surge − Discounts + Taxes`. `BaseFare` and rates are set per vehicle class per service zone. `Surge` is a multiplier triggered when the live demand-to-supply ratio in a zone exceeds a threshold; the multiplier is capped per regulator/buyer settings. `WaitingCharge` applies when free waiting at pickup or during trip exceeds the configured allowance. Night charge is an additive percentage applied between configured hours.

**Fare Calculation (Air).** The base formula is `Fare = SeatBaseFare × PaxCount + BaggageCharge + RouteSurcharge − Discounts + Taxes` for shuttles/helicopters on defined routes, and `Fare = HourlyRate × FlightHours + PositioningCharge + NightHalt + Catering + Discounts + Taxes` for charter/VIP. Fuel surcharge may be added per operator settings.

**Driver Earning.** `DriverEarning = FinalFare − PlatformCommission − Taxes (where applicable to platform) + Tips + Incentives`. Commission is configurable as percentage or flat, optionally per vehicle class or per service zone. Earnings accrue to a wallet and are paid out per schedule.

**Operator Settlement.** `OperatorPayout = Σ(FinalFare of confirmed flights in period) − PlatformCommission − Adjustments − Disputes`. Payouts run per the configured cadence with finance approval.

**Cancellation.** If the customer cancels before driver acceptance, no fee. If after acceptance but within the grace period (e.g., 2 minutes), no fee. If after grace, a configurable cancellation fee applies. If the driver cancels after acceptance, a penalty may apply to the driver. For air, cancellation rules depend on time-to-departure tiers (e.g., free up to 48 hours, 25% up to 24 hours, 50% up to 4 hours, 100% thereafter), configured per operator.

**Auto-Dispatch.** Eligible driver set is computed as `Online AND NotOnTrip AND DocumentsValid AND VehicleClassMatch AND ZoneMatch AND WithinRadius(R) ORDER BY Distance ASC, Rating DESC, AcceptanceRate DESC`. Each ping has a TTL; on expiry, the next driver is pinged. Radius expands in configurable steps if no acceptance.

**Wallet.** Customer wallet balance is non-negative; debits are blocked beyond available balance. Driver wallet balance can be negative up to a configurable threshold (negative caused by deductions, e.g., commission on cash trips). Wallet transactions are double-entry journaled.

**Geofencing.** Service zones are polygons; bookings are blocked if pickup or drop is outside the union of active zones for that service. Airports and restricted areas can have surcharge rules.

**KYC & Documents.** Driver and operator onboarding requires document upload, expiry tracking, and approval by an admin. The system blocks online status if any required document is expired or rejected.

**Ratings.** Both parties rate each other on a 1–5 scale. Rolling rating is recomputed on each new rating. Drivers below a configurable threshold are flagged for review.

---

## 12. User Flow

The end-to-end user flow is described per primary role.

### 12.1 Customer Flow

A first-time customer launches the app and is presented with onboarding screens, then a phone-OTP login flow. On successful login, the home screen displays available services (cab, bike, rental, outstation, helicopter, charter, shuttle) and recent locations. The customer picks a service, enters pickup and drop, sees the fare estimate, picks the vehicle/aircraft class, applies a promo if available, picks a payment method, and confirms. The customer is taken to a tracking screen while the request finds a driver/operator. Once accepted, the customer sees real-time tracking, can call/chat with driver, can share the ride, and can cancel within the grace period. After trip completion, the customer rates the trip and sees the receipt. The customer can revisit booking history, manage profile, addresses, payment methods, and access support.

### 12.2 Driver Flow

The driver opens the app and signs in with phone + OTP. The home screen shows the online/offline toggle, earnings summary, and active job status. When the driver is online and a request matches, a ride card appears with pickup/drop, distance, estimated fare, and a countdown. The driver accepts or rejects. On acceptance, the navigation view opens; the driver navigates to pickup, marks arrival, takes the start-trip OTP from the customer, navigates to drop, ends the trip, and sees the earning. The driver can view earnings history, request payouts (where applicable), manage documents, view ratings, and contact support.

### 12.3 Operator Flow

The operator signs into the web panel. They onboard their company (company details, certifications, insurance), add aircraft (registration, type, capacity, range, airworthiness), and add pilots/crew (license, type rating, expiry). They publish routes, schedules, and inventory. They receive booking requests in a queue, accept/reject, assign aircraft and crew, and update flight status. They reconcile payouts and view operational reports.

### 12.4 Admin Flow

The admin signs into the admin web. The dashboard shows live KPIs. The admin navigates through configuration, fleet, drivers, operators, customers, bookings, pricing, promotions, payments, reports, and settings. The admin approves driver/operator onboarding, intervenes in dispatch when needed, processes refunds with finance, and configures the platform.

---

## 13. Admin Features

The Admin Panel is the operational nerve center of every deployment. It is a web application with role-based access. The Admin Panel includes the following feature areas:

**Dashboard** provides live KPIs (active drivers, online customers, live trips, today's bookings, today's revenue, ratings) and trend charts for the last 7/30/90 days. **Booking Management** lists all bookings with filters (status, type, date, city, driver, operator, customer), drill-down detail (timeline, telemetry, payments, communications), and admin actions (force assign, cancel, refund, escalate). **Driver Management** covers onboarding queue, approval, profile, document expiry, vehicles, performance, earnings, and disciplinary actions. **Operator Management** covers operator onboarding, fleet, pilots, routes, schedules, and payouts.

**Customer Management** lists customers, profile, history, wallet, fraud flags, and support tickets. **Pricing Configuration** lets the admin manage vehicle classes, aircraft types, service zones, fare rules, surge thresholds, peak hours, night charge, taxes, and promotions. **Payments & Finance** provides transactions, refunds, payouts, settlements, reconciliation reports, and tax statements. **Support & Tickets** lets agents capture and resolve issues with SLA tracking.

**Configuration & Settings** includes branding (logo, colors), legal documents (T&C, privacy, refund), notifications (templates), integrations (gateway, map, SMS, email), business rules (commission, cancellation, payout cadence), and feature flags. **Reports & Analytics** provides exportable, scheduled, and ad-hoc reports across operations, finance, growth, and quality. **Audit Log** records all admin actions with actor, timestamp, IP, and before/after values for sensitive changes.

---

## 14. Customer App Features

The Customer App is the customer-facing surface available on Android and iOS. It is the primary channel for booking, paying, tracking, and rating.

The app provides phone-OTP login, optional email/social sign-in, and a self-service profile (name, email, gender, DOB, photo, emergency contacts, saved addresses, saved payment methods, notification preferences, language). The home screen lets the customer pick a service (cab, bike, rental, outstation, helicopter, charter, shuttle, VIP), enter pickup and drop with map and place autocomplete, see fare estimate with class options, and confirm.

After confirmation, the app shows a live tracking screen with driver/vehicle details, photo, plate, rating, ETA, route on map, and emergency actions (call, share ride, SOS). After completion, the customer rates the trip and sees the receipt. The app provides a ride history with filters, an in-app receipt viewer, a wallet with top-up and transactions, a promo & rewards page, referral, support chat, FAQs, and notification center. The app supports scheduled rides, multi-stop on selected services, favorite places, gift rides, and corporate billing where the buyer enables it.

For air services, the app provides additional flows: route picker, date/time picker, passenger details (name, gender, age, ID type/number per regulatory rules), baggage details, and post-booking boarding pass/e-ticket. Airport pickup/drop is supported on the road side with airport surcharge as configured.

---

## 15. Driver App Features

The Driver App is the on-the-ground tool for road taxi drivers. It is delivered on Android and iOS with a focus on reliability, low data usage, and battery efficiency.

The app provides phone-OTP login and a multi-step onboarding flow (personal info, license, vehicle details, insurance, permit, photo), document upload, and submission for approval. The home screen has an online/offline toggle, today's earnings, completed trips, and the rating. When online, the app receives ride requests with pickup, drop, distance, estimated earning, and a countdown to accept.

On acceptance, the navigation screen opens with turn-by-turn directions to pickup via the integrated map provider. On arrival, the driver marks **Arrived**, optionally calls or chats with the customer, takes the start-OTP, and starts the trip. The app navigates to drop, supports adding waiting time or additional stops where allowed, and provides an "End Trip" action at drop. The driver sees the breakdown of the earning and any tips, can collect cash if applicable, and confirms.

The Driver App provides earnings history (daily, weekly, monthly), payout request and history, document expiry alerts, incentive/booster programs, performance dashboard (acceptance rate, cancellation rate, rating), ratings received, and support chat. Heatmaps showing high-demand zones may be provided as configured. The app supports background location with appropriate user disclosures and OS-level permissions, with battery-optimized ping intervals.

---

## 16. Air Taxi Operator Features

The Air Taxi Operator Panel is a web application used by helicopter, charter, and shuttle operators. It is the operator's day-to-day system for fleet, crew, schedules, and bookings.

The panel provides company onboarding (registration, certifications, insurance), aircraft onboarding (registration mark, type, manufacturer, seat capacity, range, baseline rate, photos, airworthiness), and pilot/crew onboarding (license, type ratings, medical, expiries). It provides route and schedule management for shuttles and defined helicopter routes, inventory and availability calendars, and dynamic pricing rules per route or aircraft.

The panel provides a booking queue (incoming requests with accept/reject within configured TTL), flight assignment (aircraft + pilot + co-pilot + crew), pre-flight checklist, day-of-flight passenger manifest, boarding control, departure/arrival status updates, and post-flight closure. It provides a payouts module (period summaries, deductions, disputes, settlement files), reports (load factor, on-time performance, revenue, cancellations), and a compliance module (document expiry alerts, audit log).

A lightweight Pilot/Crew companion app (or mobile web) provides flight assignments, status updates, and notifications.

---

## 17. Payment & Billing Features

The platform supports multiple payment methods configurable per deployment: cash (where permitted), credit/debit card via gateway tokenization, in-app wallet (top-up + spend), UPI (in India/regions where applicable), net banking, BNPL where the buyer enables, and corporate billing (PO-based invoicing).

The Payments module handles authorization, capture, refund (partial/full), dispute, and chargeback handling through certified payment gateway integrations. The platform never stores raw card data; it stores only the tokenized reference. Wallets are tracked as ledger accounts with double-entry journaling for every credit/debit. Refunds are configurable as wallet credit, original-instrument credit, or admin choice per case.

Driver earnings and operator settlements run on a configurable cadence (daily, weekly, biweekly, monthly). Each payout produces a settlement statement with line items (gross fare, commission, tax, deductions, tips, incentives, net) downloadable as PDF and as CSV. Tax handling (GST/VAT/sales tax) is configurable with HSN/SAC codes per service category, and the platform produces tax-compliant invoices to customers and tax-compliant statements to drivers/operators where required.

The Promotions sub-module supports flat-off, percentage-off, capped discount, first-ride, route-specific, time-window, and corporate codes. The Referral sub-module supports referrer-and-referee rewards as wallet credit or fare discount. Loyalty (optional) supports point accrual and redemption rules.

---

## 18. Notification Features

Notifications are the platform's heartbeat for keeping customers, drivers, operators, and admins informed in real time. The platform supports push notifications (FCM for Android, APNs for iOS), SMS (via configured gateway), email (via configured SMTP/SES/SendGrid), WhatsApp (via approved BSP where available), and in-app notifications.

The Notification module is template-driven. Each event (e.g., `BOOKING_CONFIRMED`, `DRIVER_ARRIVED`, `TRIP_STARTED`, `TRIP_COMPLETED`, `PAYMENT_FAILED`, `DOCUMENT_EXPIRING`) has a template per channel per language. Templates support variables, fall-back rules (if push fails, send SMS), retry policy, and quiet hours per role. Customers and drivers can manage their preferences in the app.

Operational alerts to admins (e.g., dispatch failure spike, payment gateway down, document expiry queue) are configurable with thresholds and recipients. All notifications are logged with delivery status (queued, sent, delivered, failed, read), and a Notification Center in each app surfaces history.

---

## 19. Reports & Analytics

The platform provides operational, financial, growth, and quality reports across both road and air services.

**Operational reports** include trips by service, by city, by hour, completion rate, cancellation rate (by customer/driver), average pickup ETA, average trip duration, idle time, driver activity, operator on-time performance, and flight load factor. **Financial reports** include gross booking value (GBV), net revenue, commissions, refunds, payouts, settlements, taxes, and a P&L view at the buyer level. **Growth reports** include new customer signups, retention cohorts, referral performance, promo redemption, and channel attribution. **Quality reports** include rating distribution, complaint volume, SLA adherence, document expiry watchlist, and fraud signals.

Each report supports filters (date range, city/zone, service, vehicle/aircraft class, driver/operator), drill-down, CSV/XLSX export, scheduled email delivery, and saved views. Dashboards combine reports into role-specific views (Operations, Finance, Growth, Quality).

---

## 20. Security Requirements

Security is treated as a first-class concern across the platform.

All network traffic shall be encrypted using TLS 1.2 or higher with strong cipher suites. Database storage shall use encryption at rest. Passwords shall be hashed using Argon2id (preferred) or bcrypt with appropriate cost factors; passwords shall never be logged. Authentication uses OAuth 2.0 / OpenID Connect patterns where applicable, with JWT access tokens (short TTL, e.g., 15 minutes) and rotating refresh tokens (HttpOnly, secure storage). 2FA (TOTP and/or email/SMS code) shall be enforced for Super Admin, Finance Manager, and Operator roles, and configurable for others.

Authorization is enforced through role-based access control with fine-grained permissions per module and action. All sensitive endpoints validate authentication and authorization server-side; client-side checks are for UX only. All inputs are validated and sanitized; outputs are escaped to prevent XSS. The platform follows OWASP Top 10 mitigations, including protection against SQL injection, broken authentication, sensitive data exposure, XXE, broken access control, security misconfiguration, XSS, insecure deserialization, vulnerable components, and insufficient logging.

Payment data handling is PCI-DSS-aligned. PAN and CVV are never stored or logged by the platform; tokenization is delegated to the gateway. Webhooks from gateways are verified by signature. Personally identifiable information (PII) is encrypted at the field level for selected fields (e.g., government ID numbers). Data access by admins is logged in the Audit Log.

Rate limiting and bot protection are applied at the API gateway. Penetration testing shall be conducted before each major release and at least annually. Vulnerability scans run on the CI pipeline. Secret management uses a dedicated vault; secrets are not in source code or container images.

---

## 21. API Requirements

The platform is API-first. All client surfaces (apps, web) consume the same documented API. The API specification follows REST conventions with JSON payloads and is published via OpenAPI 3.x. Selected high-throughput surfaces (live location, ride request) may use WebSockets or push (FCM/APNs) in addition to REST.

**API conventions** require versioning via URL prefix (e.g., `/api/v1/...`), idempotency keys on create/charge operations, pagination on list endpoints, consistent error envelope (`{ code, message, details, traceId }`), and HATEOAS where useful. Authentication uses Bearer JWT for end users and service tokens for admin/server-to-server. All endpoints return ISO 8601 timestamps in UTC; clients convert to local timezone for display.

**Core API groups** include:

| Group | Purpose | Sample Endpoints |
|---|---|---|
| Auth | Sign-up, OTP, login, refresh, logout | `POST /auth/otp/send`, `POST /auth/otp/verify` |
| Profile | Profile CRUD, addresses, preferences | `GET /me`, `PATCH /me`, `POST /me/addresses` |
| Catalog | Vehicle classes, aircraft types, zones, routes | `GET /catalog/vehicle-classes`, `GET /catalog/routes` |
| Pricing | Fare estimate | `POST /pricing/estimate` |
| Bookings | Create, get, cancel, list, schedule | `POST /bookings`, `GET /bookings/{id}`, `POST /bookings/{id}/cancel` |
| Dispatch | Driver-side accept/reject/arrive/start/end | `POST /dispatch/requests/{id}/accept`, `POST /dispatch/trips/{id}/start` |
| Tracking | Driver location ingest, customer track | `POST /tracking/ping`, `GET /tracking/bookings/{id}` |
| Payments | Init, capture, refund, methods, webhooks | `POST /payments/init`, `POST /payments/webhook` |
| Drivers | Onboarding, docs, earnings, payouts | `POST /drivers/onboard`, `GET /drivers/{id}/earnings` |
| Operators | Onboarding, fleet, schedules, payouts | `POST /operators`, `POST /operators/{id}/aircraft` |
| Flights | Create, accept, manifest, status | `POST /flights`, `POST /flights/{id}/manifest` |
| Notifications | Templates, delivery, preferences | `POST /notifications/send`, `GET /me/notifications` |
| Reports | Queries, exports, schedules | `POST /reports/query`, `POST /reports/export` |
| Admin | All admin operations | `/admin/...` namespaced |

All endpoints are documented with request/response schemas, error codes, examples, and authorization scopes in an OpenAPI document maintained as the source of truth.

---

## 22. Third-Party Integrations

Third-party integrations are the platform's connection to the outside world. The platform is built with pluggable adapters so that the buyer can swap providers without code changes beyond credentials.

| Category | Providers (Reference) | Purpose |
|---|---|---|
| Map & Routing | Google Maps Platform, Mapbox, HERE | Geocoding, routing, ETA, distance matrix |
| Payments | Stripe, Razorpay, PayU, Cybersource, PayPal | Card, UPI, wallet, refunds |
| SMS | Twilio, MSG91, Vonage | OTP and transactional SMS |
| Email | SendGrid, Amazon SES, Mailgun | Transactional and marketing email |
| Push | Firebase Cloud Messaging, Apple Push Notification service | Mobile push |
| WhatsApp | Meta Cloud API via approved BSP | Conversational notifications |
| Identity & Verification | Veriff, Onfido, IDfy, regional KYC vendors | Driver / operator KYC |
| Telephony / Masked Calling | Exotel, Twilio Voice, Knowlarity | Customer-driver privacy |
| Maps for Aviation | AeroAPI (FlightAware), local CAA data feeds | Flight tracking aids (optional) |
| Storage | Amazon S3, GCP Cloud Storage, Azure Blob | Documents, photos, exports |
| Crash & Performance | Firebase Crashlytics, Sentry | App health |
| Analytics | Amplitude, Mixpanel, GA4 | Product analytics |
| Customer Support | Zendesk, Freshdesk, Intercom | Ticketing escalation |

Each integration is wrapped in an internal interface; switching providers (e.g., Razorpay → Stripe) requires only writing a new adapter and changing configuration.

---

## 23. Database Considerations

The platform persists data in a relational primary store (for transactional integrity of bookings, payments, ledger, identity), a document store or cache for high-write low-cost data (driver pings, session state, ephemeral dispatch queues), and an analytics store (warehouse) for reporting.

The relational schema covers core entities: `users`, `roles`, `permissions`, `customers`, `drivers`, `vehicles`, `operators`, `aircraft`, `pilots`, `service_zones`, `routes`, `vehicle_classes`, `aircraft_types`, `bookings`, `flights`, `dispatch_events`, `trips`, `legs`, `pricing_rules`, `fare_breakups`, `payments`, `payment_methods`, `wallets`, `wallet_transactions`, `payouts`, `settlements`, `commissions`, `taxes`, `promotions`, `coupons`, `referrals`, `documents`, `kyc_status`, `notifications`, `tickets`, `audit_logs`, `system_settings`, `branding_config`. See [Appendix B](#appendix-b--data-dictionary-core-entities) for a fuller dictionary.

The platform follows these data principles: every monetary value is stored as integer minor units (e.g., paise/cents) to avoid floating-point errors; every record carries `created_at`, `updated_at`, and `deleted_at` (soft delete) where applicable; every financial entity is append-only or shadow-versioned for auditability; every booking carries a unique externally-shareable identifier (`booking_ref`) separate from the internal primary key; geospatial fields use the PostGIS-equivalent type with appropriate indexes.

The cache stores hot data: driver online status, last known location, dispatch radius search results, OTPs, rate-limit counters, and short-lived session data. The cache is treated as ephemeral; loss is tolerable and recoverable from primary state. The analytics warehouse is hydrated by a daily ETL plus near-real-time CDC for selected streams; it is the source for dashboards and exports beyond the most-recent operational window.

---

## 24. Recommended Technology Stack

The technology stack is recommended (not mandatory) and is chosen for productivity, hiring availability, ecosystem maturity, and operational soundness. Buyers may substitute equivalents.

| Layer | Recommended Choice | Alternates |
|---|---|---|
| Customer App | React Native (or Flutter) | Native Swift + Kotlin |
| Driver App | React Native (or Flutter) | Native Swift + Kotlin |
| Operator Web | React (TypeScript) + Vite | Next.js, Vue 3 |
| Admin Web | React (TypeScript) + a component library | Next.js, Vue 3 |
| API Services | Node.js (NestJS) or Python (FastAPI) or Java (Spring Boot) | Go (Echo/Fiber), .NET |
| Real-time | WebSockets (Socket.IO) + Redis Pub/Sub | MQTT |
| Primary DB | PostgreSQL with PostGIS | MySQL + spatial |
| Cache | Redis | Memcached |
| Search | OpenSearch / Elasticsearch | Typesense |
| Message Broker | Apache Kafka or RabbitMQ | NATS |
| Object Storage | Amazon S3 | GCP Cloud Storage, Azure Blob |
| Analytics Warehouse | BigQuery / Snowflake / Redshift | ClickHouse |
| Containers | Docker | — |
| Orchestration | Kubernetes (EKS/GKE/AKS) | ECS, Nomad |
| CI/CD | GitHub Actions, GitLab CI | CircleCI, Jenkins |
| Observability | OpenTelemetry + Grafana + Loki + Prometheus | Datadog, New Relic |
| Error Tracking | Sentry | Rollbar |
| Maps | Google Maps Platform | Mapbox, HERE |
| Payments | Stripe / Razorpay | PayU, Adyen |
| Notifications | FCM + APNs + Twilio + SES | — |
| Secrets | AWS Secrets Manager / HashiCorp Vault | GCP Secret Manager |

The stack is designed to be cloud-portable across AWS, GCP, and Azure, with minimal coupling to any one vendor's proprietary services.

---

## 25. Deployment Considerations

Each white-label deployment is a logically (and ideally physically) isolated instance derived from the same codebase. The product company maintains one canonical "golden" code repository; each buyer's deployment is configured through environment variables, brand assets, and per-buyer configuration files. Mobile apps are built per buyer with the buyer's brand identifiers, store accounts, and theme tokens; back-end services are deployed in the buyer's chosen region.

Environments per buyer include Development, Staging, and Production, with optional UAT and DR. Infrastructure is defined as code (Terraform or equivalent). CI runs lint, type-check, unit, integration, and contract tests on every PR; CD deploys to Staging on merge to main, and to Production on tagged release. Blue-green or canary deployment is used to minimize risk. Database migrations run as part of the release pipeline with rollback scripts.

Mobile app build pipelines produce signed builds for the Apple App Store and Google Play Store under the buyer's developer account, with brand-specific assets, bundle IDs, push certificates, and store listings. Over-the-air updates are used for non-native changes via the platform's RN/Flutter update mechanism, with feature flags for safe rollout.

Observability is in place from day one: metrics, logs, and traces are collected and visualized; alerts are configured for SLO breaches; on-call rotation is defined; runbooks are written for the top 20 incidents. Capacity planning is reviewed monthly; load tests run quarterly. Backups are validated quarterly through restore drills. Disaster recovery uses a warm-standby region with documented RTO/RPO.

---

## 26. Testing Requirements

Testing is multi-layered and automated as much as practical.

**Unit tests** cover business logic in services (pricing engine, dispatch logic, ledger postings) with ≥ 70% line coverage. **Integration tests** cover service-to-service and service-to-database flows. **Contract tests** between the back-end and each client (customer app, driver app, operator web, admin web) ensure that API changes do not silently break clients. **End-to-end tests** cover top user journeys: customer signup, cab booking happy path, scheduled ride, cancellation, payment, refund, driver onboarding, operator onboarding, flight booking happy path. **Performance tests** stress the booking, dispatch, tracking, and payment paths to validate scalability assumptions. **Security tests** include SAST, DAST, dependency scanning, secret scanning, and periodic penetration tests.

**Functional QA** covers feature acceptance per the criteria listed in [Appendix A](#appendix-a--detailed-feature-specifications). **Compatibility QA** covers OS versions (iOS, Android), screen sizes, network conditions (2G/3G/4G/5G/Wi-Fi), and locales/RTL. **Accessibility QA** covers WCAG 2.1 AA conformance: text contrast, screen reader labels, keyboard navigation (web), touch target sizes (mobile), and reduced-motion support. **UAT** is run by the buyer with structured scripts before go-live. **Regression** is automated to the extent possible and re-run on every release.

Bug severity is defined as Sev-1 (production outage or data loss; resolved within hours), Sev-2 (major feature broken; resolved within a working day), Sev-3 (minor feature issue; resolved in the next sprint), Sev-4 (cosmetic; backlog). Each release ships with a published QA sign-off and a known-issues list.

---

## 27. Acceptance Criteria

Acceptance is granted when the platform satisfies the criteria below across business, functional, and non-functional dimensions. Detailed per-feature acceptance criteria are listed alongside each feature in [Appendix A](#appendix-a--detailed-feature-specifications).

| ID | Acceptance Criterion |
|---|---|
| AC-01 | A new buyer can be provisioned with brand kit (logo, colors, name, legal docs, store metadata) and go live within 4 weeks. |
| AC-02 | A customer can complete a cab booking end-to-end on Android and iOS, including payment and rating. |
| AC-03 | A customer can complete a bike, rental, outstation, helicopter, charter, and shuttle booking end-to-end. |
| AC-04 | A scheduled booking is automatically dispatched at the configured lead time and completes successfully. |
| AC-05 | Auto-dispatch identifies the correct eligible driver set, pings drivers per the configured strategy, and assigns on acceptance. |
| AC-06 | Live tracking shows driver location with an end-to-end latency under 3 seconds at the 95th percentile. |
| AC-07 | Fare computation matches the configured rules for all service types with audit-grade traceability. |
| AC-08 | Payments succeed via card, wallet, UPI, net banking, and corporate billing as configured; refunds settle to the configured destination. |
| AC-09 | Driver earnings and operator settlements are computed and disbursed per the configured cadence with downloadable statements. |
| AC-10 | Admin can manage configuration, fleet, drivers, operators, customers, pricing, promotions, and payouts. |
| AC-11 | Notifications are delivered via push/SMS/email/WhatsApp with delivery status tracked. |
| AC-12 | RBAC is enforced server-side; an unauthorized role receives 403 on every restricted endpoint. |
| AC-13 | All listed non-functional requirements (performance, scalability, security, reliability, availability, logging, backup) are met under load test. |
| AC-14 | OpenAPI documentation is current, accurate, and exposed in the dev portal. |
| AC-15 | Disaster recovery drill restores the system within the documented RTO/RPO. |

---

## 28. Future Scope

Future scope items are explicitly listed to set expectations and to guide architecture choices that keep these options open.

The platform may expand into intercity bus and rail booking integrations, hotel and homestay bookings (to create a travel suite), package holidays, ferry/ship bookings, EV charging integration, last-mile delivery (parcel, food, grocery), B2B logistics (intra-city goods transport), corporate mobility (employee transport scheduling and billing), event-based shuttle services, and tourism packages combining helicopter joyrides with hotel and ground transport.

Future technical evolutions include an AI-driven dispatcher that predicts demand and pre-positions drivers, dynamic pricing with ML-based surge, anomaly detection in fraud and disputes, generative AI assistants for customer and driver support, voice booking, and offline-first driver apps with sync. Aviation-side evolutions include integration with airspace clearance systems where regulators provide APIs, flight planning aids, and weather-aware scheduling.

The white-label provisioning workflow may evolve into a self-service buyer portal where the buyer uploads their brand kit, signs documents, configures their merchant accounts, and triggers a fully automated deployment, reducing time-to-launch further.

---

# Appendix A — Detailed Feature Specifications

Each feature below follows the structure: **Description, User Roles, Workflow, Business Logic, Validation Rules, Edge Cases, API Expectations, UI Expectations, Acceptance Criteria**.

---

## A.1 Ride Booking (Cab / Bike)

**Description.** Allows a customer to book an on-demand cab or bike taxi from a pickup to a drop location with a chosen vehicle class.

**User Roles.** Customer (initiator), System (pricing, dispatch), Driver (assignee), Dispatcher (fallback).

**Workflow.** The customer enters pickup and drop, selects a vehicle class, optionally applies a promo, selects payment, and confirms. The system creates the booking in `Requested`, computes the eligible driver set, sends ride requests in priority order, and on acceptance moves to `Accepted`. The driver navigates to pickup, marks Arrived, validates start-OTP, begins the trip → `InProgress`. On reaching drop, the driver ends the trip → `Completed`; the fare is computed; payment is captured; the customer is asked to rate.

**Business Logic.** Eligible driver = `online ∧ ¬onTrip ∧ docsValid ∧ classMatch ∧ zoneMatch ∧ withinRadius(R)`. Pricing per Section 11. Surge applies if zone demand/supply exceeds threshold T, capped at C. Cancellation rules per Section 11.

**Validation Rules.** Pickup ≠ Drop; minimum trip distance ≥ X meters; vehicle class must be active in the zone; payment method must be authorized; promo, if applied, must be valid for this booking; pickup time, if scheduled, must be ≥ now + min lead.

**Edge Cases.** No drivers available (radius exhausted): show "no drivers nearby, retry or schedule"; payment auth fails: prompt alternate method; customer cancels after acceptance and before grace expiry: no fee; driver app crash mid-trip: telemetry continues from server-recorded ping; OTP mismatch: 3 attempts then escalate to support; GPS jitter at pickup: use accuracy-weighted geofence; multiple promos requested: only one applies per booking.

**API Expectations.** `POST /pricing/estimate` returns class options and estimated fares. `POST /bookings` creates and returns booking with `state=Requested`. `GET /bookings/{id}` returns the current state and the latest driver position when assigned. `POST /bookings/{id}/cancel` cancels with reason.

**UI Expectations.** Map-centric home with pickup/drop chips, autocomplete with recent and favorite places, class selector with fare and ETA, promo input, payment selector, prominent CTA. Live screen with driver card, vehicle plate, photo, route trace, ETA, SOS, share-ride, call/chat.

**Acceptance Criteria.** A customer can complete a happy-path cab booking under 90 seconds from app open to driver assignment in a normally serviced zone; fare on receipt matches a deterministic recomputation from telemetry; rating is recorded.

---

## A.2 Ride Scheduling

**Description.** Allows a customer to schedule a ride for a future date and time across cab, bike, rental, outstation, and air services.

**User Roles.** Customer, System, Driver/Operator, Dispatcher.

**Workflow.** The customer picks a future date/time during booking, sees an estimate, and confirms. The booking enters `Scheduled`. The system triggers auto-dispatch at `pickup_time − lead_time`. Customer receives reminder notifications.

**Business Logic.** `lead_time` is configurable per service (e.g., 30 minutes for cab, 4 hours for helicopter). Re-dispatch policy: if first dispatch round fails, expand radius/relax constraints per configuration. Up-to-time cancellation rules apply.

**Validation Rules.** Pickup time ≥ now + min lead; date/time within configured booking horizon (e.g., 30 days); customer's chosen vehicle class must be supported as scheduled in that zone.

**Edge Cases.** Customer changes pickup time after scheduling: allowed up to a cutoff; driver becomes unavailable between assignment and pickup: re-dispatch; system clock skew on driver phone: server timestamps authoritative; daylight savings transitions: store and trigger in UTC.

**API Expectations.** `POST /bookings` accepts `scheduled_at`; `PATCH /bookings/{id}` allows rescheduling within rules; `GET /bookings?status=Scheduled` lists upcoming.

**UI Expectations.** Date and time pickers with sensible defaults, a clear "Scheduled" badge on the booking, a reminder banner closer to the pickup time, and a one-tap reschedule.

**Acceptance Criteria.** A scheduled booking dispatches within ±60 seconds of the configured trigger; reminders fire at the configured offsets; reschedule respects the validation rules.

---

## A.3 Driver Assignment (Auto-Dispatch)

**Description.** Identifies the best driver(s) for a request and routes the request through them until accepted or exhausted.

**User Roles.** System (primary), Dispatcher (fallback override), Driver (recipient).

**Workflow.** On booking create or schedule trigger, compute eligible set; sort by configured weighted score (distance, rating, acceptance rate, last-trip recency); ping driver #1 with TTL; on miss/reject, move to next; expand radius after N misses; if exhausted, surface to Dispatcher panel or notify customer of "no drivers".

**Business Logic.** Eligibility per Section 11. Weighted score formula configurable. Concurrency-safe assignment: a driver who accepts is locked to the booking and cannot be assigned to another in parallel; race conditions resolved by first-to-accept wins, others receive "already taken".

**Validation Rules.** Driver must be in eligible set at the moment of assignment, not at the moment of original pinging. Cooldown after rejection prevents pinging the same driver immediately again.

**Edge Cases.** Driver accepts while going offline: race resolved by transactional state change; multiple bookings flood a zone: ordered dispatch queue with fairness; driver's vehicle class changes mid-pool (e.g., goes offline for documents): re-evaluate eligibility.

**API Expectations.** `POST /dispatch/requests/{id}/accept`, `POST /dispatch/requests/{id}/reject`; server-pushed ride request events to drivers (WebSocket and FCM redundantly).

**UI Expectations (Driver).** A large, unmistakable request card with pickup, drop, distance, estimated earning, and a 15–30s countdown; accept/reject buttons with adequate touch targets; haptic and sound cue.

**Acceptance Criteria.** In load testing at 1,000 concurrent requests per minute in a zone, average time-to-acceptance is under 20 seconds, with no duplicate assignments.

---

## A.4 Ride Tracking

**Description.** Provides real-time visibility of the driver and trip to the customer (and to the admin/dispatcher).

**User Roles.** Customer (viewer), Driver (location source), Admin/Dispatcher (oversight).

**Workflow.** The Driver App sends location pings (e.g., every 3–5 seconds during active trip, every 10–15 seconds when online idle, with battery-aware backoff). The platform persists and broadcasts to the customer over WebSocket and as a fallback periodic REST poll.

**Business Logic.** Pings within an active trip update `last_known_location`, append to trip telemetry, and recompute ETA. Smoothing algorithm filters GPS jitter. ETA uses the integrated map provider.

**Validation Rules.** Pings outside service zones are flagged; pings with implausible speed/distance jumps are dropped or smoothed.

**Edge Cases.** Driver loses connectivity briefly: queue pings client-side, flush on reconnect; permanent loss: last-known shown with timestamp and warning; customer in poor connectivity: switch to lower-fidelity polling.

**API Expectations.** `POST /tracking/ping`, `GET /tracking/bookings/{id}`, WebSocket subscription `tracking.booking.{id}`.

**UI Expectations.** Map with driver marker (rotated to heading), polyline route, customer pickup/drop markers, ETA banner; smooth marker interpolation; reachability indicator.

**Acceptance Criteria.** End-to-end ping-to-customer latency under 3 seconds at p95; route trace visible and accurate within a tolerance defined by the map provider.

---

## A.5 Ride Cancellation

**Description.** Allows customer or driver to cancel a ride with configured rules and fees.

**User Roles.** Customer, Driver, Admin (override).

**Workflow.** Cancellation is requested with a reason from a configurable list plus free-text. The platform applies the cancellation rules, computes fee if any, settles per payment method, and notifies the counter-party. Booking moves to `CancelledByCustomer` or `CancelledByDriver` or `CancelledBySystem`.

**Business Logic.** Per Section 11. Customer fee paid via the booking's payment method or wallet; driver penalty deducted from earnings.

**Validation Rules.** Cancellation allowed only in states that permit it (`Requested`, `Accepted`, `Arrived`); not allowed after `InProgress` except via admin/support flow.

**Edge Cases.** Customer cancels just as driver accepts: respect timestamp; mass cancellations from a driver: flag for review; force-majeure cancellation by admin: no fee, full refund.

**API Expectations.** `POST /bookings/{id}/cancel` with reason; admin endpoints for override.

**UI Expectations.** Clear cancellation reason list, transparent fee disclosure before confirmation, confirmation dialog.

**Acceptance Criteria.** Fees and refunds match the configured rules; counter-party is notified; audit log captures reason and actor.

---

## A.6 Fare Calculation

**Description.** Computes the fare for a booking deterministically from inputs and configured rules.

**User Roles.** System; visible to Customer, Driver, Admin, Finance.

**Workflow.** Pre-trip estimate is computed at booking time and shown to the customer; final fare is computed at trip completion using captured telemetry; if anomalies are detected (e.g., huge distance jump), the fare is flagged for review.

**Business Logic.** Per Section 11; rules versioned and snapshot-stamped onto each booking so historical fares are reproducible even if rules change later.

**Validation Rules.** Distance and duration must be non-negative and within plausible ranges; surge multiplier within cap; tolls only applied where flagged on the route; tax computed by configured rate and jurisdiction.

**Edge Cases.** GPS gaps: interpolate using map provider's route distance instead of straight-line; long waiting time at pickup: clearly itemize; multiple stops on supported services: per-leg accumulation.

**API Expectations.** `POST /pricing/estimate`, internal `POST /pricing/finalize`, both returning a structured fare breakdown.

**UI Expectations.** Itemized breakdown on the receipt (base, distance, time, waiting, tolls, surge, discount, taxes, total) for transparency.

**Acceptance Criteria.** Final fare = deterministic recomputation from telemetry and snapshot rules; receipts pass an independent audit against the inputs.

---

## A.7 Driver Earnings

**Description.** Records and surfaces what the driver earns from each completed trip, and aggregates to periods.

**User Roles.** Driver (viewer), Admin/Finance (oversight), System (computation).

**Workflow.** On trip completion, the system posts ledger entries: credit to driver wallet (earning), debit for commission and applicable platform-borne charges, credit for incentives/tips. Periodic payouts move from driver wallet to driver bank per cadence.

**Business Logic.** Per Section 11. Incentive programs are rule-driven (e.g., complete 10 trips, earn X bonus). Tips can be added by customer in-app or in-cash.

**Validation Rules.** No earnings post unless trip is `Completed`; cash trips post the customer-collected amount with commission deducted; wallet/UPI/card trips post the net after platform retention.

**Edge Cases.** Disputed trip: earning is provisional until resolution; refund to customer post-completion: clawback from driver wallet with notification; rounding: bankers' rounding to the smallest currency unit.

**API Expectations.** `GET /drivers/{id}/earnings`, `POST /drivers/{id}/payouts`.

**UI Expectations.** Daily/weekly/monthly summary, transaction list, downloadable statement, payout history with status.

**Acceptance Criteria.** Driver-visible earnings always reconcile to ledger to the cent; payouts match the documented cadence; statements are tax-compliant.

---

## A.8 Rental & Outstation Booking

**Description.** Two specialized booking types — Rental (hourly/daily package within a city) and Outstation (intercity one-way or round-trip).

**User Roles.** Customer, Driver, Admin.

**Workflow (Rental).** Customer picks a package (e.g., 4 hr / 40 km), pickup time, and confirms. Driver is dispatched at lead time. Trip runs against package allowances; excess kilometers or hours are billed at configured rates. Trip ends and is settled.

**Workflow (Outstation).** Customer picks city pair, one-way or round-trip, dates, vehicle class, and confirms. Fare includes per-km slab, driver allowance, night halt charge (if overnight), and tolls. Trip runs across cities with state-permit considerations.

**Business Logic.** Rental package rules per service zone; Outstation slab per km with minimum km guarantee. Long trips may require fuel surcharge.

**Validation Rules.** Outstation pickup must be in a permitted origin zone; round-trip return date ≥ outbound date; rental package start time ≥ now + lead.

**Edge Cases.** Trip exceeds the booked package: prompt extension; outstation cancellation post-driver-departure: special fee; route detours: customer-driver agreed extensions logged with explicit consent.

**API Expectations.** Same `POST /bookings` with `service=rental` or `outstation` and the relevant sub-fields.

**UI Expectations.** Package picker for rentals; city pair and trip-type picker for outstation; clear T&C of extras.

**Acceptance Criteria.** Rentals and outstation trips settle to the exact rules; receipts itemize package, excess, allowances, halt, tolls, and taxes.

---

## A.9 Helicopter Booking

**Description.** Allows a customer to book a helicopter on a defined route or on-demand.

**User Roles.** Customer, Operator, Pilot, Admin.

**Workflow.** Customer picks the helicopter service, selects route and date/time (or "request a quote" for on-demand), provides passenger and baggage details, applies promo, picks payment, and confirms. The system routes the booking to eligible operators; one of them accepts (or admin assigns). Operator assigns aircraft and pilot; passenger manifest is finalized; e-ticket is issued; flight runs per the boarding/departure/arrival flow.

**Business Logic.** Per Section 11 (Fare — Air). Weight rules apply: total passenger and baggage weight against aircraft maximum take-off weight; baggage caps per passenger.

**Validation Rules.** Passenger count ≤ aircraft capacity; each passenger ID is captured per regulator rules; baggage within limits; route and date are within operator availability.

**Edge Cases.** Weather cancellation: rebook or refund per policy; aircraft swap: pre-departure update with re-confirmation; manifest changes within cutoff: allowed with re-validation.

**API Expectations.** `POST /bookings` with `service=helicopter`, `GET /catalog/routes?service=helicopter`, `POST /flights/{id}/manifest`.

**UI Expectations.** Route picker with map preview, date/time, passenger detail form, baggage entry, boarding details screen with pilot and helipad info.

**Acceptance Criteria.** End-to-end helicopter booking happy path completes; manifest and e-ticket are accurate; flight status updates flow to customer in near real time.

---

## A.10 Charter Booking

**Description.** Allows a customer to charter a private aircraft for a custom itinerary.

**User Roles.** Customer, Operator, Admin.

**Workflow.** Customer enters itinerary (origin, stops, destination, dates), passenger count and details, special requests (catering, ground transport coordination), and submits a request. The system surfaces it to eligible operators who respond with quotes (within the response SLA). Customer selects an operator and confirms by paying a deposit (or full amount per rules). Operator confirms aircraft, crew, and slot. Flight runs as scheduled.

**Business Logic.** Quoted fare based on hourly rate × estimated hours + positioning + night halt + catering. Deposit and balance schedule configurable.

**Validation Rules.** Itinerary timing feasibility; passenger details complete; operator approvals/certifications cover the itinerary.

**Edge Cases.** Itinerary changes after confirmation: re-quote and customer approval; weather diversion: alternate airport handling; payment failure for balance: clear fallback flow.

**API Expectations.** `POST /charter/requests`, `POST /charter/quotes`, `POST /charter/quotes/{id}/accept`.

**UI Expectations.** Multi-stop itinerary builder, quote comparison view, deposit and balance flow, day-of-flight status.

**Acceptance Criteria.** Charter request → quote → confirmation → flight → settlement completes with all financial and operational records correct.

---

## A.11 Air Shuttle Booking

**Description.** Allows a customer to book a seat on a scheduled air shuttle between defined points.

**User Roles.** Customer, Operator, Admin.

**Workflow.** Operator publishes schedule and inventory. Customer picks route, date, flight, passenger count, and confirms. Seat is held during checkout and released on failure. On success, e-tickets are issued. Operator runs the flight per the schedule.

**Business Logic.** Per-seat pricing; capacity tracking; overbooking allowed only if explicitly configured.

**Validation Rules.** Seats available at time of confirmation; passenger details per regulator rules.

**Edge Cases.** Schedule change/cancellation: rebook or refund per policy; standby allocation when allowed; group booking integrity.

**API Expectations.** `GET /catalog/flights?service=shuttle&route=...`, `POST /bookings`.

**UI Expectations.** Schedule grid by date, seat-availability indicator, simple checkout.

**Acceptance Criteria.** Scheduled shuttle inventory is consistent; bookings reduce inventory atomically; e-tickets are issued reliably.

---

## A.12 VIP / Private Air Travel Booking

**Description.** A premium air-taxi flow tailored to executives or premium use cases, with concierge-grade options.

**User Roles.** Customer (VIP), Operator, Concierge (admin role), Pilot.

**Workflow.** Similar to Charter, with concierge involvement: concierge handles bespoke requirements (security, catering, ground transport, lounge), liaises with operator, and presents a curated quote. Customer confirms; flight runs with concierge oversight.

**Business Logic.** Premium pricing with concierge fee; flexible cancellation/change windows; privacy controls on logs and PII access.

**Validation Rules.** Identity verification per VIP norms; payment by approved instruments; concierge approval gate.

**Edge Cases.** Privacy/security incidents: tightened access; last-minute itinerary changes: concierge-driven exception handling.

**API Expectations.** Same as Charter with `tier=vip` flag and concierge-only admin endpoints.

**UI Expectations.** Discreet, minimal app interface with direct concierge contact; encrypted chat where supported.

**Acceptance Criteria.** VIP flow protects privacy, supports bespoke requirements, and completes end-to-end with operator and concierge.

---

## A.13 Flight Scheduling (Operator)

**Description.** Allows an operator to publish and manage scheduled inventory for shuttles and defined helicopter routes.

**User Roles.** Operator, Admin.

**Workflow.** Operator creates routes, aircraft, and recurring/ad-hoc schedules. The platform exposes the resulting inventory to customers via the catalog.

**Business Logic.** Conflict detection between schedules using the same aircraft or crew; maintenance windows block scheduling.

**Validation Rules.** Aircraft and crew availability; airworthiness and pilot certifications valid for the route/aircraft type.

**Edge Cases.** Schedule overlaps; maintenance reassignment; route closures by regulator.

**API Expectations.** `POST /operators/{id}/schedules`, `PATCH /operators/{id}/schedules/{sid}`.

**UI Expectations.** Calendar view, conflict warnings, bulk-publish.

**Acceptance Criteria.** Published schedules are reflected in customer catalog within seconds; conflicts are blocked.

---

## A.14 Passenger Management (Air)

**Description.** Captures and manages passenger details and manifests for air bookings.

**User Roles.** Customer, Operator, Admin.

**Workflow.** During booking, the lead passenger enters details for self and co-passengers (name, gender, age, ID type/number where regulator requires). Manifest is locked at cutoff; operator can edit within authorized windows.

**Business Logic.** Regulator rules for ID type per route; minor accompaniment rules; baggage allowance per passenger.

**Validation Rules.** Required fields; ID format per type; minor without guardian blocked.

**Edge Cases.** Passenger swap before cutoff (allowed/disallowed per policy); medical or special-assistance needs flagged.

**API Expectations.** `POST /flights/{id}/manifest`, `PATCH /flights/{id}/manifest/{paxId}`.

**UI Expectations.** Multi-passenger form with progressive disclosure; clear cutoff messaging; PDF-style manifest viewer for operators.

**Acceptance Criteria.** Manifests match regulator requirements and operational needs; cutoff and edit windows are enforced.

---

## A.15 Operator Management

**Description.** Manages the lifecycle of operators on the platform — onboarding, KYC, fleet, crew, schedules, performance, and payouts.

**User Roles.** Operator (self-service), Admin (approver/overseer).

**Workflow.** Operator registers, completes company profile, uploads required documents, adds aircraft and crew, and submits for approval. Admin reviews and approves. Operator goes live with publishing rights. Ongoing operations are managed via the operator panel.

**Business Logic.** Document expiry monitoring; auto-pause publishing if any required document expires; performance thresholds for visibility tiers (if configured).

**Validation Rules.** Document formats and sizes; valid certificate IDs; aircraft registration formats per region.

**Edge Cases.** Re-onboarding after de-activation; sub-operators or partner aircraft; multi-base operations.

**API Expectations.** `POST /operators`, `GET /operators/{id}`, `POST /operators/{id}/aircraft`, `POST /operators/{id}/pilots`.

**UI Expectations.** Wizard-style onboarding; clean lists and detail pages; alerts for expiring documents.

**Acceptance Criteria.** Operator can self-onboard, be approved, publish inventory, and operate flights end-to-end; payouts work.

---

## A.16 Flight Cancellation / Rescheduling

**Description.** Allows customer, operator, or admin to cancel or reschedule a flight with policy-driven fees and refunds.

**User Roles.** Customer, Operator, Admin.

**Workflow.** Customer or operator initiates cancellation/reschedule with reason. Policy tier is determined by time-to-departure. Fees are computed; refunds/credits are issued; counter-party is notified; manifest is updated.

**Business Logic.** Tiered cancellation per Section 11; reschedule may be free within a window and fee-bearing thereafter; force-majeure (weather, regulator) bypasses fee.

**Validation Rules.** State allows cancellation; reschedule target slot must exist; refund destination is valid.

**Edge Cases.** Partial cancellation (one of multiple passengers); operator-initiated cancellation triggering customer-side compensation per policy.

**API Expectations.** `POST /bookings/{id}/cancel`, `POST /bookings/{id}/reschedule`.

**UI Expectations.** Clear policy display before confirmation; cost preview; reason capture.

**Acceptance Criteria.** Policy tiers apply correctly; refunds match configured rules; audit log captures the action.

---

## A.17 White-Label Branding & Theming

**Description.** Allows the product company (and partially the buyer admin) to configure brand identity for a deployment.

**User Roles.** Product Company (provisioner), Super Admin (limited).

**Workflow.** Brand kit (logo, colors, name, fonts, legal docs, store assets) is supplied; provisioning generates a configured deployment. Selected fields (e.g., support email, social links, banner imagery) are editable by the buyer admin.

**Business Logic.** Theme tokens drive both web and mobile; mobile builds are produced under the buyer's store accounts; fonts are licensed by the buyer.

**Validation Rules.** Asset formats and sizes; color contrast minimums; legal document presence before go-live.

**Edge Cases.** Brand refresh post-launch (versioned theme rollout); region-specific variants for the same buyer.

**API Expectations.** Internal provisioning APIs and `GET /branding/config`.

**UI Expectations.** Live preview during configuration; readiness checklist before publish.

**Acceptance Criteria.** A new buyer is deployed and visually correct across all surfaces; legal docs and store listings reflect the buyer.

---

## A.18 Promotions & Coupons

**Description.** Allows the admin to run promotional campaigns through coupons and automated rules.

**User Roles.** Admin (creator), Customer (redeemer), System (validator).

**Workflow.** Admin defines a promo with type (flat/percent), value, cap, validity window, segment, service/route eligibility, and budget. Customer applies code at checkout; system validates and computes the discount; on completion, redemption is recorded against the budget.

**Business Logic.** First-time-only flags; one-per-customer caps; stack rules (typically not stackable); referral promos with referrer credit on completed first ride.

**Validation Rules.** Code uniqueness; budget not exhausted; segment match; service/route match; not expired.

**Edge Cases.** Race on last redemption: atomic decrement; cancellation post-redemption: promo refund/repayment per policy.

**API Expectations.** `POST /promotions`, `POST /coupons/validate`, `POST /coupons/apply`.

**UI Expectations.** Catalog page in app; auto-apply best coupon option; clear ineligibility messaging.

**Acceptance Criteria.** Budgets are respected; ineligible attempts are clearly rejected; analytics report redemption accurately.

---

## A.19 Wallet

**Description.** A platform wallet for customers and a separate wallet for drivers (and optionally operators) to hold balance, credits, and earnings.

**User Roles.** Customer, Driver, Operator, Finance.

**Workflow.** Customer tops up via gateway; balance is debited at booking. Driver earnings accumulate; payouts move balance to bank.

**Business Logic.** Double-entry journaling; immutable transactions; reversal via compensating entries; minimum top-up and withdrawal limits.

**Validation Rules.** Currency consistency; non-negative customer balance; KYC for higher limits if required.

**Edge Cases.** Failed top-up after gateway success (webhook reconciliation); fraudulent top-up reversed; lost-and-found refunds to wallet.

**API Expectations.** `POST /wallet/topup`, `GET /wallet`, `GET /wallet/transactions`.

**UI Expectations.** Clear balance and transactions list; top-up flow with saved methods.

**Acceptance Criteria.** Ledger always balances; reconciliations pass; customer-visible balance matches ledger.

---

## A.20 Support & Ticketing

**Description.** Allows customers, drivers, and operators to raise issues; allows agents to resolve with SLA tracking.

**User Roles.** Customer, Driver, Operator, Support Agent, Admin.

**Workflow.** User raises a ticket from a relevant context (a trip, a payment, a profile). Ticket enters a queue; agent picks up; chats and resolves; closes with resolution code. SLA timers run per category.

**Business Logic.** Auto-routing by category; priority by impact (e.g., live trip issues = high); escalation rules on SLA breach.

**Validation Rules.** Category required; trip/payment references must exist if linked.

**Edge Cases.** Duplicate tickets; abusive content moderation; chained refunds requiring finance approval.

**API Expectations.** `POST /tickets`, `GET /tickets`, `POST /tickets/{id}/messages`.

**UI Expectations.** Searchable FAQs first; structured issue selector; chat interface; status timeline.

**Acceptance Criteria.** All issue categories route to the correct queue; SLAs are tracked; resolution drives a customer satisfaction record.

---

## A.21 Reviews & Ratings

**Description.** Both parties rate each other on a 1–5 scale after a completed trip.

**User Roles.** Customer, Driver, Admin.

**Workflow.** Post-completion prompt; rating and optional comment; tags ("clean car", "safe driving", etc.) configurable per service.

**Business Logic.** Rolling average; low-rating workflows (review, training, deactivation thresholds).

**Validation Rules.** Only one rating per party per trip; trip must be `Completed`.

**Edge Cases.** Rating after long delay (closed for ratings after cutoff); retaliatory ratings flagged.

**API Expectations.** `POST /ratings`, `GET /users/{id}/ratings`.

**UI Expectations.** Light, optional flow; tag suggestions; optional comment.

**Acceptance Criteria.** Aggregates compute correctly; admin can see distribution and trends.

---

## A.22 Document & KYC Management

**Description.** Captures, stores, and tracks identity, license, insurance, and certification documents for drivers and operators.

**User Roles.** Driver, Operator, Admin.

**Workflow.** User uploads documents at onboarding and on renewals; admin reviews and approves/rejects; reminders fire ahead of expiry; automatic suspension on expiry.

**Business Logic.** Configurable required-document set per role and region; expiry tracking with notification cadence; status flags on the entity.

**Validation Rules.** File type and size; readable; matches the entity (name, number).

**Edge Cases.** Document re-uploaded after rejection; KYC vendor mismatch; tampered documents flagged.

**API Expectations.** `POST /documents`, `GET /documents/{id}`, `POST /documents/{id}/approve`.

**UI Expectations.** Upload progress, server-side validation messages, status badges, expiry dashboard for admin.

**Acceptance Criteria.** No active driver/operator with an expired required document; all approvals/rejections are audit-logged.

---

## A.23 Audit Log

**Description.** A tamper-evident record of consequential actions across the platform.

**User Roles.** Admin (viewer), System (writer).

**Workflow.** Every consequential action emits an audit record with actor, role, IP, action, entity, before/after, timestamp.

**Business Logic.** Append-only; protected from edits/deletes; retained per compliance requirement (default 7 years).

**Validation Rules.** Required fields present; PII redacted where required.

**Edge Cases.** Bulk operations summarized with reference to batch ID; system-initiated actions logged with the responsible service.

**API Expectations.** `GET /admin/audit-logs` with filters.

**UI Expectations.** Searchable, exportable table; diff view for before/after.

**Acceptance Criteria.** Sampling audits confirm all sensitive actions are logged; logs survive an attempted delete.

---

# Appendix B — Data Dictionary (Core Entities)

The following is a non-exhaustive view of the core relational entities and their key fields. Types are indicative; concrete types belong in the DB migration files.

**users** — `id (UUID, PK)`, `phone`, `email`, `password_hash`, `role`, `status (active/suspended/pending)`, `created_at`, `updated_at`.

**customers** — `id (FK→users)`, `name`, `gender`, `dob`, `photo_url`, `emergency_contacts (JSON)`, `default_payment_method_id (FK)`.

**drivers** — `id (FK→users)`, `name`, `dob`, `photo_url`, `license_no`, `license_expiry`, `current_vehicle_id (FK→vehicles)`, `rating_avg`, `acceptance_rate`, `kyc_status`, `online_status`, `last_location (geom)`, `vendor_id (FK→vendors)`.

**vehicles** — `id (UUID, PK)`, `plate_no`, `make`, `model`, `year`, `color`, `vehicle_class_id (FK)`, `registration_doc_id (FK→documents)`, `insurance_doc_id (FK→documents)`, `permit_doc_id (FK→documents)`, `status`.

**operators** — `id (UUID, PK)`, `name`, `company_registration_no`, `kyc_status`, `payout_account_ref`, `status`.

**aircraft** — `id (UUID, PK)`, `operator_id (FK)`, `registration_mark`, `aircraft_type_id (FK)`, `seat_capacity`, `mtow_kg`, `range_nm`, `airworthiness_doc_id (FK)`, `status`.

**pilots** — `id (UUID, PK)`, `operator_id (FK)`, `name`, `license_no`, `type_ratings (JSON)`, `medical_expiry`, `status`.

**service_zones** — `id`, `name`, `polygon (geom)`, `tax_jurisdiction`, `active`.

**routes** — `id`, `service_type`, `origin_zone_id`, `destination_zone_id`, `distance_km`, `est_duration_min`, `airspace_meta (JSON for air)`.

**vehicle_classes** — `id`, `code`, `display_name`, `seats`, `description`, `image_url`.

**aircraft_types** — `id`, `code`, `display_name`, `seats`, `description`, `image_url`.

**bookings** — `id (UUID, PK)`, `booking_ref`, `customer_id (FK)`, `service_type`, `status`, `requested_at`, `scheduled_at`, `pickup (geom)`, `drop (geom)`, `vehicle_class_id (FK, nullable)`, `aircraft_type_id (FK, nullable)`, `operator_id (FK, nullable)`, `driver_id (FK, nullable)`, `vehicle_id (FK, nullable)`, `payment_method_id (FK)`, `promo_code`, `fare_estimate_minor`, `fare_final_minor`, `currency`, `pricing_snapshot (JSON)`.

**trips** — `id`, `booking_id`, `started_at`, `ended_at`, `distance_km`, `duration_min`, `waiting_min`, `tolls_minor`, `telemetry_ref (object storage key)`.

**flights** — `id`, `booking_id (FK)`, `operator_id`, `aircraft_id (FK)`, `pilot_id (FK)`, `crew (JSON)`, `manifest (JSON or relation)`, `departure_helipad`, `arrival_helipad`, `etd`, `eta`, `status`.

**dispatch_events** — `id`, `booking_id`, `driver_id`, `event_type (PING/ACCEPT/REJECT/TIMEOUT)`, `at`, `payload (JSON)`.

**pricing_rules** — `id`, `service_type`, `zone_id`, `vehicle_class_id`, `effective_from`, `effective_to`, `rule (JSON)`.

**fare_breakups** — `id`, `booking_id`, `component`, `amount_minor`, `currency`, `meta (JSON)`.

**payments** — `id`, `booking_id`, `method`, `gateway_ref`, `status`, `amount_minor`, `currency`, `captured_at`, `refunded_amount_minor`.

**wallets** — `id`, `owner_type (customer/driver/operator)`, `owner_id`, `currency`, `balance_minor`.

**wallet_transactions** — `id`, `wallet_id`, `type (CREDIT/DEBIT)`, `amount_minor`, `reference (booking/payout/refund/topup)`, `description`, `created_at`.

**payouts** — `id`, `owner_type`, `owner_id`, `period_start`, `period_end`, `gross_minor`, `deductions_minor`, `net_minor`, `status`, `bank_ref`, `created_at`.

**commissions** — `id`, `service_type`, `vehicle_or_aircraft_class_id`, `zone_id`, `rate_type (pct/flat)`, `rate_value`, `effective_from`, `effective_to`.

**promotions** — `id`, `code`, `type`, `value`, `cap_minor`, `validity`, `segment`, `service_types`, `routes`, `budget_minor`, `redeemed_count`, `status`.

**notifications** — `id`, `recipient_id`, `channel`, `template_id`, `payload (JSON)`, `status`, `sent_at`, `delivered_at`, `read_at`.

**tickets** — `id`, `requester_id`, `subject`, `category`, `priority`, `status`, `assignee_id`, `sla_due_at`, `created_at`, `resolved_at`.

**audit_logs** — `id`, `actor_id`, `actor_role`, `action`, `entity`, `entity_id`, `before (JSON)`, `after (JSON)`, `ip`, `created_at`.

**system_settings** — `key`, `value`, `scope (global/zone/role)`, `updated_at`, `updated_by`.

**branding_config** — `key (logo/primary_color/etc)`, `value`, `updated_at`, `updated_by`.

---

# Appendix C — Status Codes & State Machines

The following state machines describe permitted transitions. Disallowed transitions are rejected by the server.

**Road Booking States.** `Requested → Accepted → Arrived → InProgress → Completed`; cancellation branches `CancelledByCustomer`, `CancelledByDriver`, `CancelledBySystem` may originate from `Requested`, `Accepted`, or `Arrived` per the rules; `Disputed` may follow `Completed`; `Refunded` is a terminal sub-state after a `Disputed` resolution favoring the customer.

**Air Booking States.** `Requested → QuoteShared (charter only) → Confirmed → ManifestLocked → Boarded → Departed → Arrived → Completed`; cancellation branches `CancelledByCustomer`, `CancelledByOperator`, `CancelledByAdmin` may originate from `Requested`, `QuoteShared`, `Confirmed`, or `ManifestLocked`; `Rescheduled` is a meta-transition that creates a related booking.

**Payment States.** `Initiated → Authorized → Captured → Refunded (partial/full) → Settled`; failure states `Failed`, `Cancelled`, `Disputed`, `ChargedBack`.

**Driver States.** `Pending → Approved → Active → Suspended → Deactivated`; orthogonal `online/offline` and `on_trip/idle`.

**Operator States.** `Pending → Approved → Active → Paused → Deactivated`.

**Document States.** `Uploaded → InReview → Approved → Expired/Rejected`.

---

# Appendix D — RACI Matrix

| Activity | Founder / PO | BA | PM/TPM | Dev | UI/UX | QA | DevOps | Agency / Freelancer |
|---|---|---|---|---|---|---|---|---|
| Approve scope | A | R | R | C | C | C | C | I |
| Detail requirements | C | R | A | C | C | C | C | I |
| Wireframes & design | C | C | C | C | R/A | C | I | C |
| API design | C | C | A | R | C | C | C | C |
| Implementation | I | C | A | R | C | C | C | R |
| Test plans | I | C | C | C | I | R/A | C | C |
| QA cycles | I | C | A | C | I | R | C | C |
| Deployment | I | I | A | C | I | C | R | C |
| White-label provisioning | A | C | R | C | C | C | R | C |
| Go-live sign-off | A | C | R | C | C | R | R | I |

R = Responsible, A = Accountable, C = Consulted, I = Informed.

---

# Appendix E — Glossary

| Term | Definition |
|---|---|
| Booking | A customer's request for a service (road or air), regardless of its eventual state. |
| Trip / Flight | The executed leg of a booking (road = trip, air = flight). |
| Dispatch | The process of finding and assigning a driver or operator to a booking. |
| Surge | A demand-driven multiplier applied to fares within configured caps. |
| KYC | Know-Your-Customer / Counterparty document and identity verification process. |
| MTOW | Maximum Take-Off Weight of an aircraft. |
| Manifest | The list of passengers and baggage for a specific flight. |
| RTO / RPO | Recovery Time / Point Objective for disaster recovery. |
| RBAC | Role-Based Access Control. |
| Ledger | The double-entry record of monetary movements within the platform. |
| Service Zone | A geographic polygon within which a service is offered with specific rules. |
| White-Label | A product re-branded and re-sold by a buyer under their own identity. |
| Provisioning | The set of steps to spin up a new, branded deployment of the platform. |

---

**End of Document.**
