# Module 14 — Promotions, Coupons & Referrals · Orchestrator Log

## Summary
Module 14 provides the full growth-lever toolkit: admins can create and manage promo codes (flat or percent discount, with cap, validity window, eligibility rules, budget hard-stop, per-customer and total usage limits), configure and monitor a referral program (referrer/referee rewards, fraud guards, top-referrer leaderboard), and view redemption analytics (daily bar chart, spend-share by promo, CPA, new-customer acquisition). Three screens: 14.1 Promotions list + editor (split panel), 14.2 Referral program config + metrics, 14.3 Redemption analytics dashboard.

---

## Phase 1 — Scope (COMPLETE)
Files read:
- `Docs/ui/project/Acme Mobility Admin/Module 14 - screens.jsx` ✅
- `Docs/admin_panel_product_document.md` → Module 14 section ✅
- NavRail: `promotions` nav entry → `/promotions` already exists

---

## Phase 2 — Audit (COMPLETE)

### Backend — NOTHING EXISTS
- No endpoints file for promotions/referrals
- No models for promotions/referrals
- No schemas for promotions/referrals
- No services for promotions/referrals

### Frontend — NOTHING EXISTS
- No page directory for promotions
- No service file for promotions
- No routes in App.tsx for /promotions

---

## Phase 3 — Task Breakdown (COMPLETE)

### Backend Tasks
- **BE-01** Create `backend/app/models/promotion.py` — Promotion + CouponRedemption models
- **BE-02** Create `backend/app/models/referral.py` — ReferralProgram (singleton config) + Referral models
- **BE-03** Create `backend/app/schemas/promotions.py` — all Pydantic request/response schemas
- **BE-04** Create `backend/app/services/promotions_service.py` — CRUD, activate/pause, analytics aggregation
- **BE-05** Create `backend/app/api/v1/endpoints/promotions.py` — all API endpoints
- **BE-06** Register router in router.py + create Alembic migration

### Frontend Tasks
- **FE-01** Create `admin-panel/src/services/promotionsService.ts` — interfaces + service methods
- **FE-02** Build `admin-panel/src/pages/promotions/PromotionsPage.tsx` — Screen 14.1 (split panel list + editor)
- **FE-03** Build `admin-panel/src/pages/promotions/ReferralPage.tsx` — Screen 14.2 (config + metrics)
- **FE-04** Build `admin-panel/src/pages/promotions/RedemptionAnalyticsPage.tsx` — Screen 14.3 (analytics)
- **FE-05** Register routes in App.tsx

---

## Phase 4 — API Contract (COMPLETE)
See `api-contract.md`

---

## Phase 5 — Clarifications
No blocking ambiguities. Implementation decisions:
- Analytics endpoint returns empty arrays when no redemption data — no mock data needed
- ReferralProgram is a singleton (one row per deployment) — GET/PATCH only, no POST
- Budget CPA calculation: total_budget_spent / max(redemption_count,1)
- Fraud guard settings persisted to DB on ReferralProgram model
- `value` field for promotions: stored as integer minor units (paise) for flat; stored as integer percentage (0–100) for percent type
- Promotion `status` enum: draft | active | paused | expired | depleted

---

## Phase 6 — Agents Spawned
Both BE and FE agents spawned in parallel (background, worktree isolation).
