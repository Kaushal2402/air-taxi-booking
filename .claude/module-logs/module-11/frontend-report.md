# Module 11 — Customer Management · Frontend Report

## Files created

| File | Task | Notes |
|---|---|---|
| `admin-panel/src/services/customerService.ts` | FE-01 | All interfaces + service methods |
| `admin-panel/src/pages/customers/CustomersPage.tsx` | FE-02 | Customer directory, full-page table |
| `admin-panel/src/pages/customers/CustomerDetailPage.tsx` | FE-03 | Detail page + wallet modal |

## Files modified

| File | Change |
|---|---|
| `admin-panel/src/App.tsx` | Added imports for CustomersPage + CustomerDetailPage; registered `/customers` and `/customers/:id` routes |

## Routes registered

```
/customers         → CustomersPage     (PrivateRoute)
/customers/:id     → CustomerDetailPage (PrivateRoute)
```

## TypeScript errors encountered and fixed

1. **TS6133 `_isTablet` declared but never read** — in both `CustomersPage.tsx` and `CustomerDetailPage.tsx`.  
   Fix: Changed `const _isTablet = useIsTablet()` to `useIsTablet()` (bare call, satisfies the CLAUDE.md requirement to call the hook on every page without an unused binding).

## Build result

`tsc -b && vite build` — **0 errors, 0 warnings** (only a pre-existing chunk-size advisory, not a TS error).

## Implementation notes

### FE-01 — customerService.ts
- All interfaces exported with `export interface` / `export type`.
- `import api from '../lib/axios'` follows catalogService pattern.
- Stub callers (`getCustomerBookings`, `getCustomerPayments`, `getCustomerTickets`) gracefully catch and return `null` on 404/network errors.

### FE-02 — CustomersPage
- Segment bar: 6 tiles, CSS grid (6-col desktop / 3-col mobile), active tile has bottom border accent.
- `SegmentBadge` component matches exact colors from screens.jsx (vip_corp→accent, loyalist→ink, frequent→info, new/regular→ink-3).
- `RowMenu` inline dropdown with Suspend / Flag / Reactivate / Goodwill credit actions.
- `AddCustomerModal` — simple fixed overlay with all required fields.
- `ReasonModal` — reusable prompt for suspend/flag reason.
- Debounced search (350ms).
- Pagination bar shown when `total > 25`.
- `formatMoney()` helper: ≥10Cr → Cr, ≥1L → L, else toLocaleString with ₹ prefix.
- Table wrapped in `overflowX: auto` div.

### FE-03 — CustomerDetailPage
- `useParams()` to get `:id`.
- Hero: left (avatar + badges + name + meta) + right (5-column stat grid). Stacks on mobile.
- Tab bar: 8 tabs, scrolls horizontally on mobile.
- `OverviewTab`: sparkline SVG (12-month zeros until bookings module), stub recent-trips table, stub service-mix bar, stub payment methods, stub saved places.
- `WalletTab`: fully live — calls `listWalletTransactions`, shows credit/debit badges, empty state.
- All other tabs: `TabStub` with descriptive module name.
- `WalletAdjustModal`:
  - Direction toggle (Credit / Debit) with color coding.
  - Amount input with ₹ prefix and preset buttons (₹100 / ₹250 / ₹500 / ₹1000 / Custom).
  - Reason dropdown (6 options).
  - Audit note text input.
  - Preview table (current balance / adjustment / tax adj ₹0 / new balance).
  - Info box "Within your goodwill cap" shown when credit ≤ ₹2,000.
  - Push/SMS/Email notify checkboxes.
  - On mobile: full-screen overlay; on desktop: centered 760px modal.
- Suspend uses `ConfirmDialog` (variant="danger").
- Flag uses inline `FlagReasonModal` (text input).
- Unflag: direct API call, no confirmation.
- Reactivate: direct API call, no confirmation.
- Goodwill credit button: opens wallet modal with direction pre-set to `credit`.
- Message button: shows `alert('Messaging coming soon')` stub.

## Deferred / noted for future

- `seq_id` field on Customer is defined in the interface but not displayed in the table (customer_code is shown instead — matches screens.jsx).
- Service mix bar chart (OverviewTab right col) is stubbed with a flat bar; will auto-populate once the bookings module provides trip data.
- Payment methods card is stubbed; will auto-populate from payments module.
- Saved places card is stubbed; will auto-populate from addresses module.
- Trips sparkline uses 12 zeros; will populate once bookings module aggregates monthly trips per customer.
- No bulk-select action bar implemented (checkboxes render but no batch actions wired up — deferred).
- FilterChip components from screens.jsx spec were simplified to `<select>` elements as instructed in FE-02 spec: "no FilterChip component needed, use `<select>`".
- Export and Cohorts buttons are stubs (no-op clicks).
- Sort button is stub; actual sort order not wired to API params.
