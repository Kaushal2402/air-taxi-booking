# Module 21 — Frontend Report

## Status: COMPLETE ✓

Build: `npm run build` — zero TypeScript errors, 309 modules transformed.

---

## Files created

| File | Task | Description |
|---|---|---|
| `admin-panel/src/services/settingsService.ts` | FE-01 | Full service layer — 14 API methods + 10 exported TypeScript interfaces |
| `admin-panel/src/pages/settings/PlatformSettingsPage.tsx` | FE-02 | Screen 21.1 — sub-nav + General form + live platform toggles |
| `admin-panel/src/pages/settings/FeatureFlagsPage.tsx` | FE-03 | Screen 21.2 — flags table + detail panel + rollout controls + new flag modal |
| `admin-panel/src/pages/settings/MaintenancePage.tsx` | FE-04 | Screen 21.3 — kill switches w/ confirm dialog + regional status + maintenance windows |

## Files modified

| File | Change |
|---|---|
| `admin-panel/src/App.tsx` | Added 3 imports + 3 routes under `/settings`, `/settings/flags`, `/settings/maintenance` |

---

## Implementation notes

### FE-01 — settingsService.ts
- All 14 endpoints from api-contract implemented
- Used `import api from '../lib/axios'` (no type import issues)
- All response/request interfaces exported for use in pages

### FE-02 — PlatformSettingsPage
- Left sub-nav (232px) + right form on desktop; horizontal chip row + form on mobile
- `activeId="settings"` matches NavRail item confirmed in NavRail.tsx
- "General" tab fully built; all other config tabs show "Coming soon" placeholder
- Advanced nav items: Feature flags → navigate('/settings/flags'), Maintenance → navigate('/settings/maintenance'), API & webhooks → notice banner
- Platform toggles: optimistic update on click, revert on API failure
- "Change history" button → notice banner (links to Audit module)
- "Save changes" saves org + operating defaults fields only

### FE-03 — FeatureFlagsPage
- Env filter dropdown with outside-click dismiss (ref pattern from AuditStreamPage)
- Row click → sets selectedFlag; selected row highlighted with `var(--surface-2)` background
- Detail panel: rollout progress bar (height 8) + quick-select [10%, 35%, 50%, 100%] buttons + "Save rollout" accent button
- Live metrics panel: static display (no API call needed)
- Toggle in table: optimistic update with revert on failure
- New flag modal: controlled form, calls createFlag() on submit

### FE-04 — MaintenancePage
- Kill switch toggle requires ConfirmDialog confirmation before any API call
- Dialog is danger variant when killing (enabled → false), default when re-enabling
- `loading` prop passed to ConfirmDialog during API call
- Regional status derived from API (service_type drives car/plane icon)
- Maintenance windows: list with time-remaining badge + delete button
- Add window: modal form with datetime-local inputs
- `dot` CSS class uses tone from API for kill switches (`ok` when running, API tone when killed)

### General patterns followed
- `import type { ... }` for all type imports (verbatimModuleSyntax compliance)
- `useIsMobile()` used on all three pages for responsive layout
- No `alert()` calls — all notices use dismissable inline banner pattern
- ConfirmDialog uses exact props: `open`, `title`, `description`, `confirmLabel`, `variant`, `loading`, `onConfirm`, `onCancel`
- After any mutating API call, `loadData()` is called to refresh state
- Shell wrapper on every page with correct `activeId="settings"`

---

## Known limitations / deferred
- Live metrics in the flag detail panel are static hardcoded values (no metrics API endpoint in api-contract)
- Settings sub-nav tabs other than "General" show placeholder — to be built in future iterations
- Chunk size warning (1127 kB bundle) is pre-existing across the full app; code splitting not in scope for this module
