# Module 25 — KYC & Document Verification · Frontend Report

**Date:** 2026-05-31  
**Build status:** PASSED (zero TypeScript errors)

---

## Files created

### Service
- `admin-panel/src/services/kycService.ts`
  - Exports `KycQueueItem`, `KycExpiryItem`, `KycReviewBody`, `KycQueueResponse` interfaces
  - `kycService.getQueue(params?)` — paginated queue with entity_type/status filters
  - `kycService.getExpiryWatchlist(days?)` — expiry items within N days
  - `kycService.reviewDriverDoc(docId, body)` — PATCH driver document review
  - `kycService.reviewOperatorDoc(docId, body)` — PATCH operator document review

### Pages
- `admin-panel/src/pages/kyc/KycQueuePage.tsx` (Screen 25.1)
  - Route: `/kyc`
  - KPI strip (5 tiles): In queue, Oldest, Pending review, Approved today, Entity filter
  - Filter row: search (client-side), entity type select, status select
  - Desktop table with checkbox, doc ID, submitter avatar+name, doc type badge, age, status badge, action buttons
  - Mobile card layout
  - Inline ReviewModal for approve (requires expiry date) and reject (requires reason)
  - Reupload action (no modal, direct API call)
  - Row click navigates to detail page
  - Pagination controls

- `admin-panel/src/pages/kyc/KycDocumentDetailPage.tsx` (Screen 25.2)
  - Routes: `/kyc/driver-documents/:docId` and `/kyc/operator-documents/:docId`
  - Accepts `entityType: 'driver' | 'operator'` prop
  - Loads item from location.state if available, falls back to queue fetch by id
  - Two-column layout (1.1fr : 1fr) stacked on mobile
  - Left panel: document preview (img if file_url, striped placeholder if not), 3 thumbnails row
  - Right panel: extracted fields table, review decision card with expiry date + reject reason inputs
  - Warning box shown when review_notes present
  - All 3 actions: approve, reject, request_reupload; navigates back to /kyc on success

- `admin-panel/src/pages/kyc/KycExpiryPage.tsx` (Screen 25.3)
  - Route: `/kyc/expiry`
  - KPI strip (4 tiles): Expiring 14d, Already expired, ≤3 days, Reminders sent
  - Groups items by entity_type with group header (icon, label, count, Remind group button)
  - Each group has a table: Holder, Document, Expiry (daysBadge), On expiry, Actions
  - Remind action shows toast; Re-verify navigates to detail page
  - Mobile: stacked card layout within each group
  - Toast component auto-dismisses after 3s
  - "Send all reminders" action in Shell header

### Route additions (App.tsx)
```
/kyc/expiry                     → KycExpiryPage
/kyc/driver-documents/:docId    → KycDocumentDetailPage entityType="driver"
/kyc/operator-documents/:docId  → KycDocumentDetailPage entityType="operator"
/kyc                            → KycQueuePage
```
Static paths registered before the `/kyc` catch as specified.

---

## Design compliance

- All pages wrapped in `<Shell activeId="kyc" ...>` — matches NavRail id
- `verbatimModuleSyntax` satisfied: all interface imports use `import type { ... }`
- `useIsMobile()` used on every page
- All tables wrapped in `<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>`
- ConfirmDialog not used (inline modal approach chosen as permitted by spec)
- Status badges match spec: pending/in_review → warn, approved → ok, rejected/expired → danger
- `entityIcon()` uses `'layers'` as fallback for aircraft (helipad exists but layers used as specified)
- `daysBadge()` in KycExpiryPage matches spec exactly
- DocPlaceholder uses striped-gradient as per spec

---

## Notes

- The `danger` class on `<button className="btn sm danger">` renders with a color override inline to ensure red appearance since the design system uses `style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}` on ghost-style reject buttons
- Expiry date input uses `type="date"` (ISO format) — backend should accept YYYY-MM-DD
- Queue page: entity filter and status filter trigger a fresh API call; search filters locally on the already-loaded page
- Detail page gracefully handles missing documents with a "not found" state
