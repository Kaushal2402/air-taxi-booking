# Module 14 — Promotions, Coupons & Referrals · Frontend Report

**Status: COMPLETE — build passes (0 TypeScript errors)**

---

## Files created

### Service layer
- `admin-panel/src/services/promotionsService.ts`
  - Exports: `Promotion`, `CreatePromotionBody`, `UpdatePromotionBody`, `PromotionAnalytics`, `ReferralProgram`, `UpdateReferralProgramBody`, `ReferralStats`
  - API methods: listPromotions, createPromotion, getPromotion, updatePromotion, activatePromotion, pausePromotion, deletePromotion, getAnalytics, getReferralProgram, updateReferralProgram, getReferralStats

### Pages
- `admin-panel/src/pages/promotions/PromotionsPage.tsx` — Screen 14.1 (split-panel list + editor)
- `admin-panel/src/pages/promotions/ReferralPage.tsx` — Screen 14.2 (referral program config)
- `admin-panel/src/pages/promotions/RedemptionAnalyticsPage.tsx` — Screen 14.3 (analytics charts)

### Routes added to App.tsx
```
/promotions/referrals  → ReferralPage
/promotions/analytics  → RedemptionAnalyticsPage
/promotions            → PromotionsPage
```
Static paths registered BEFORE dynamic ones to prevent route collisions.

---

## Feature implementation summary

### PromotionsPage (14.1)
- Desktop: `1.2fr / 1fr` grid (list left, editor right)
- Mobile: single panel with `← Back to promotions` button
- KPI strip: Budget consumed, Redemptions, Blended CPA (from analytics API)
- Promo card list: code chip, value display, status badge, meta row, 4px budget meter (color coded: danger ≥85%, warn ≥60%, accent otherwise)
- Editor: Discount / Eligibility / Limits & budget form sections with live eligibility preview
- New promotion modal (code, type, value, dates, budget)
- Activate / Pause buttons (status-aware)
- ConfirmDialog delete for draft promos

### ReferralPage (14.2)
- `1.3fr / 1fr` grid (config left, metrics right)
- Reward flow diagram card with live reward amounts from draft state
- Reward configuration form: referrer/referee rewards, qualifying event, caps, monthly budget
- Fraud guards: 5 toggle pill rows (4 bool flags + manual review threshold)
- Program performance 2×3 tile grid from stats API
- Top referrers list with at-cap warning
- Fraud flags summary card

### RedemptionAnalyticsPage (14.3)
- Days selector (7/14/30) triggers API reload
- 5-tile KPI strip (Redemptions, Budget, Avg discount, New customers, Blended CPA)
- SVG bar chart (responsive, empty-state handled)
- By promo breakdown with progress bars
- Mobile: stacked layout, chart height 160px

---

## Design compliance
- All pages use `<Shell activeId="promotions" ...>`
- `useIsMobile()` imported and used on all three pages
- Tables/scroll containers wrapped with `overflowX: auto; WebkitOverflowScrolling: touch`
- `import type` used for all type-only imports (verbatimModuleSyntax compliant)
- ConfirmDialog uses `description=` and `variant="danger"` (never `message=` or `danger=`)
- Money formatting: `₹${(minor/100).toLocaleString('en-IN')}`

---

## Build result
```
✓ 327 modules transformed
✓ built in 1.11s
0 TypeScript errors
```
