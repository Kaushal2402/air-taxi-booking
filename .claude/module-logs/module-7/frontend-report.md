## Files created/modified

- `/admin-panel/src/services/driverService.ts` — created
- `/admin-panel/src/pages/drivers/DriverOnboardingPage.tsx` — created
- `/admin-panel/src/pages/drivers/DriverDirectoryPage.tsx` — created
- `/admin-panel/src/pages/drivers/DriverDetailPage.tsx` — created
- `/admin-panel/src/pages/drivers/DocumentReviewPage.tsx` — created
- `/admin-panel/src/App.tsx` — modified (added driver imports + 4 routes)

## Pages implemented

- Screen 7.1 — DriverOnboardingPage: Onboarding queue with 5-stat summary bar, search + stage filter, queue cards showing avatar/name/phone, doc checklist badges (pan/license/rc/insurance/permit/photo colored by status), stage stepper (signup→docs→review→background→approved), SLA badge, Review/Re-upload/Reject action buttons. Reject uses ReasonModal, Re-upload uses ConfirmDialog.
- Screen 7.2 — DriverDirectoryPage: Driver directory with 6-tab segmented bar (All/Online/Review queue/Suspended/Docs expiring/Top performers), filter bar with search + status + KYC dropdowns, full table with avatar/name/flag/vehicle/zone/online badge/trips/rating (color-coded)/acceptance/cancellation (warn if ≥5%)/KYC badge/status badge/row action menu. Mobile: card view. Pagination.
- Screen 7.3 — DriverDetailPage: Full driver detail with hero card (large avatar, status badges, serif name, stats row), 9-tab bar (Overview/Documents/Vehicle/Performance/Earnings/Trips/Wallet/Disciplinary/Audit). Overview tab: PerformanceChart SVG + trips stub + right column with vehicle card, documents quick view, wallet card. Documents tab: list with approve/reject/reupload actions + ConfirmDialog. Wallet tab: balance display + transaction table + WalletAdjustModal. Other tabs: stub message.
- Screen 7.4 — DocumentReviewPage: Three-panel review layout (240px doc list rail | flex-1 document preview | 380px review pane). Doc list highlights active doc with accent border, status dots. Center: stylized document mock with gradient background + metadata fields + OCR confidence bar. Right panel: extracted fields list, cross-checks, set expiry date input, review note input, Approve/Request re-upload/Reject buttons with ConfirmDialogs. After action navigates to next pending doc or back to driver detail. Mobile: step-based view (list → preview → review tabs).

## Service methods

- `listDrivers(params?)` — GET /drivers with pagination, search, filters
- `getOnboardingQueue(params?)` — GET /drivers/onboarding
- `getDriver(id)` — GET /drivers/:id
- `updateDriver(id, body)` — PATCH /drivers/:id
- `approveDriver(id)` — POST /drivers/:id/approve
- `rejectDriver(id, reason)` — POST /drivers/:id/reject
- `suspendDriver(id, reason)` — POST /drivers/:id/suspend
- `reactivateDriver(id)` — POST /drivers/:id/reactivate
- `deactivateDriver(id, reason)` — POST /drivers/:id/deactivate
- `forceOffline(id)` — POST /drivers/:id/force-offline
- `getDocuments(id)` — GET /drivers/:id/documents
- `reviewDocument(id, docId, body)` — PATCH /drivers/:id/documents/:docId
- `getWalletTransactions(id, params?)` — GET /drivers/:id/wallet/transactions
- `adjustWallet(id, body)` — POST /drivers/:id/wallet/adjust

## Routes registered

- `/drivers` → DriverDirectoryPage (PrivateRoute)
- `/drivers/onboarding` → DriverOnboardingPage (PrivateRoute)
- `/drivers/:id` → DriverDetailPage (PrivateRoute)
- `/drivers/:id/documents/:docId` → DocumentReviewPage (PrivateRoute)

## Build result

- PASSED — 290 modules transformed, 0 TypeScript errors. Two minor TS errors fixed during build (unused `formatDate` function removed, `.l` property reference corrected to `.label` on TABS array).

## Notes

- The `/drivers/onboarding` route is placed before `/drivers/:id` in App.tsx to prevent "onboarding" from being treated as a driver ID parameter.
- PerformanceChart uses static mock data (same pattern as screens.jsx spec) since live trip data requires the bookings module.
- All document mock previews show a stylized card with gradient background and metadata fields since actual document image uploads are not yet implemented.
- Mobile uses `showMobileEditor`-style step pattern for DocumentReviewPage (3 steps: list/preview/review).
- All ConfirmDialog usage follows the correct prop API: `open`, `title`, `description`, `confirmLabel`, `variant`, `onConfirm`, `onCancel`.
- `import type` used for all TypeScript type-only imports to satisfy `verbatimModuleSyntax`.
- `useIsMobile()` and `useIsTablet()` called on every page as required.
