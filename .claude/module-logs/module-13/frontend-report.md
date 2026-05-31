# Module 13 — Frontend Report

## Files Created

### Service
- `admin-panel/src/services/pricingService.ts`
  - Full TypeScript interfaces: `RoadRule`, `RoadRuleModifier`, `AirRule`, `TaxRule`, `SimulateBreakdownItem`, `SimulateRuleResult`, `SimulateRequest`, `PaginatedResponse<T>`
  - `pricingService` object with methods for road rules (list/get/create/update/publish/delete), air rules (list/get/create/update/publish/delete), taxes (list/create/update/delete), and simulator (simulate)

### Pages
- `admin-panel/src/pages/pricing/RoadFareRulesPage.tsx` — Screen 13.1
  - 440px left panel (rule list with search) + right editor panel (grid layout on desktop)
  - 4 editor sections: header with status + actions, Scope & Effective dating (4-col grid), Base components (8-field 4-col grid), Surge chart + Time-of-day modifiers
  - Draft/Publish/Clone/Delete workflow with ConfirmDialog
  - Mobile: single-panel with "← Back to Rules"

- `admin-panel/src/pages/pricing/FareSimulatorPage.tsx` — Screen 13.2
  - 440px left (trip inputs + rule set selection) + right (results)
  - Rule set loads automatically when zone + vehicle class are selected; auto-selects live rule
  - Multi-select for version comparison; comparison columns in breakdown table
  - Empty state before simulation; big fare total + breakdown table after

- `admin-panel/src/pages/pricing/AirFareRulesPage.tsx` — Screen 13.3
  - `1.2fr 1fr` grid: left table + right editor
  - CategoryBadge (Shuttle=ok, VIP=info, others=plain)
  - LiveExample calculator computing pax × seat + baggage + fuel% + GST%
  - Draft/Publish/Delete workflow

- `admin-panel/src/pages/pricing/TaxesPage.tsx` — Screen 13.4
  - Hero strip (4 KPI cells): Active rules, Tax collected MTD (placeholder), Rentals 12% GST count, Pass-through count
  - Full table: Tax name, HSN chip (mono), Rate (warn color >= 10%), Jurisdiction, Inclusive/Exclusive badge, In use, Status badge, actions
  - Side editor panel (desktop), mobile-stacked
  - Compliance section with static stats (invoices, driver statements, HSN queue)

## Routes Registered (App.tsx)

```
GET /pricing           → RoadFareRulesPage   (activeId="pricing")
GET /pricing/simulator → FareSimulatorPage   (activeId="pricing")
GET /pricing/air       → AirFareRulesPage    (activeId="pricing")
GET /pricing/taxes     → TaxesPage           (activeId="pricing")
```

All routes wrapped in `<PrivateRoute>`.

## Build Result

**PASS** — `tsc -b && vite build` completed with 0 TypeScript errors.
Only warning: chunk size > 500 kB (pre-existing, not introduced by this module).

## Decisions Made

1. **`useIsTablet` import**: imported from same path `'../../hooks/useIsMobile'` (matching existing pattern in reference pages).

2. **FareSimulatorPage rule loading**: Rules load via `pricingService.listRoadRules({ zone_id, vehicle_class_id })` when both dropdowns are selected. Live rule is auto-selected; user can multi-select for comparison.

3. **RoadFareRulesPage — live rule editing**: When a live rule is selected, the editor shows a "Clone" button (creates a draft copy) instead of direct save. The "Save draft" button only appears for draft rules or new rules.

4. **TaxesPage hero strip**: "Tax collected · MTD" shows static placeholder text per spec ("— · Connect billing for live data").

5. **Surge cap input**: Added a numeric input in the surge section to allow editing `surge_cap` from the editor, which feeds into the surge chart label.

6. **No `any` types used**: All `catch` blocks use `unknown` with type narrowing via `e as { response?: ... }`.

7. **`verbatimModuleSyntax`**: All type-only imports use `import type { ... }` separately from value imports throughout all files.
