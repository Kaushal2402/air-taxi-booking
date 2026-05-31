# Module 04 — Booking Management (Road) · Frontend Report

**Status:** Complete · Zero TypeScript errors · Build passes

---

## Files Created

### Service Layer
- `admin-panel/src/services/bookingsService.ts`
  - All interfaces: `RoadBookingListItem`, `RoadBookingDetail`, `BookingStats`, `BookingListResponse`, `TimelineEvent`, `FareComponent`, `AdminNote`, `DisputeResponse`, `DisputeListItem`, `DisputeListResponse`, `BookingTelemetry`, `GpsPoint`
  - All action request types: `CancelBookingBody`, `ReassignBody`, `AdjustFareBody`, `RefundBody`, `OpenDisputeBody`, `ResolveDisputeBody`, `FlagBookingBody`, `AddNoteBody`, `AdminNoteResponse`, `AssistedBookingCreate`
  - All 14 service methods matching the API contract exactly

### Pages
- `admin-panel/src/pages/bookings/RoadBookingsPage.tsx` (Screen 4.1)
  - Status strip with 6 tabs (All, Live·now, Scheduled, Cancelled, Disputed, Refund pending) with counts from API stats
  - Filter bar: search input + Service / Payment / Flagged dropdowns
  - Bulk action bar (shown when rows selected): Export selection, Message customers, Flag, Clear
  - Table: checkbox, Ref+flag icon, Customer·Service, Route (from→to), Driver, When, Status badge, Fare, Payment, row action
  - Row click navigates to `/bookings/road/{id}`
  - Full pagination with page number strip
  - Export CSV downloads all current filtered items
  - "Assisted booking" button → `/bookings/road/new`
  - Auto-refresh every 30s when "Live·now" tab is active
  - Mobile: reduced columns, horizontal scroll wrapper

- `admin-panel/src/pages/bookings/BookingDetailPage.tsx` (Screens 4.2 + 4.4)
  - 5 tabs: Overview | Fare breakdown | Payments | Communications | Audit (last 3 show "coming soon")
  - Overview tab: 5-tile KPI strip (State badge, Estimate, Distance, Duration, Surge), vertical timeline, right rail (Customer, Driver, Payment, Dispute, Admin notes)
  - Fare breakdown tab: component table with totals + "Adjust fare" button
  - Admin notes: inline "Add note" form
  - Modals: CancelModal (reason grid, note, refund preview, two-person-rule notice), ReassignModal, AdjustFareModal, RefundModal, DisputeModal
  - Cancel modal implements refund preview (8% fee), threshold check for ₹2,000 two-person rule
  - Back button (mobile button + desktop header button)
  - Mobile: stacked layout, no right rail

- `admin-panel/src/pages/bookings/AssistedBookingPage.tsx` (Screen 4.3)
  - 5-step wizard: Customer → Route → Class & fare → Payment → Confirm
  - Step pills showing current/completed states
  - Customer step: search by phone/email/name via `customerService.listCustomers()`, shows selected customer card
  - Route step: pickup + drop address fields, When (Now/Scheduled), pax count, route info bar
  - Class step: 4 vehicle class cards (Bike/Sedan/XL/Rental) with computed fare estimate
  - Payment step: 4 payment method tiles, promo code field, internal reason (required), admin note
  - Confirm step: summary card + audit warning notice
  - Right rail (desktop): always-visible booking summary updates with each step
  - Mobile: single column, summary shown inline before confirm
  - Validation: customer required, pickup/drop required, internal reason required
  - On confirm: calls `createAssistedBooking` → navigates to detail page
  - "Save as draft" asks confirmation then navigates back

- `admin-panel/src/pages/bookings/DisputesPage.tsx` (Screen 4.5)
  - Left panel (420px desktop): dispute list with search + priority filter, priority badges, stage labels, amounts
  - Right panel: selected dispute detail with header, SLA strip (4 KPIs), telemetry placeholder, communication thread placeholder
  - Resolution panel: 4 action radio options (uphold_fare, partial_refund, full_refund, goodwill_credit), driver impact preview, resolution note input, Finance notice, "Resolve →" button
  - On resolve: calls `resolveDispute()` and reloads
  - Export button downloads CSV of all disputes
  - Mobile: showMobileDetail pattern (back button)

### Route Registration
- `admin-panel/src/App.tsx` — 4 routes added (static paths before dynamic `:id`):
  - `/bookings/road/new` → AssistedBookingPage
  - `/bookings/road/disputes` → DisputesPage
  - `/bookings/road/:id` → BookingDetailPage
  - `/bookings/road` → RoadBookingsPage

---

## Design Compliance
- All pages use `activeId="bookings-r"` matching NavRail entry
- `import type { ... }` used for all type-only imports (verbatimModuleSyntax)
- `useIsMobile()` + `useIsTablet()` imported on every page
- Tables wrapped in `<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>`
- Status badges use `.badge ok/warn/danger/pending/info` + `.dot` classes
- Modal pattern consistent with promotions/kyc reference pages
- All component functions defined at module scope (not inside render) to prevent focus loss
- `bStatusBadge()` implemented matching spec map (InProgress → "On trip")

---

## Build Result
```
tsc -b: 0 errors
vite build: 296 modules transformed, built in 1.06s
```

---

## Notes / Known Limitations
- Telemetry map in DisputesPage is a placeholder (static grey div); actual map integration deferred
- "Open map view" button on RoadBookingsPage is no-op (as specified)
- "Message", "Open audit" buttons in BookingDetailPage are no-op (as specified)
- Communications and Audit tabs show "coming soon" placeholder (as specified)
- Stage filter in DisputesPage is passed to API but no dropdown UI (removed to keep code clean)
