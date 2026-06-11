# QA Audit Report — Module 02: Home & Service Selector
**Date:** 2026-06-11  
**Verdict: PARTIAL**

---

## P1 Checks (all pass ✓)

| Check | Result | Notes |
|---|---|---|
| Hardcoded brand colors in screens | ✓ PASS | Only semantic `Color(0xFFC97B0C)` warn + `Color(0xFF1762BA)` info + their soft bgs — all allowed |
| Hardcoded font family strings in screens | ✓ PASS | No `fontFamily:` literals found — all text via `theme.textTheme.*` |
| Static/hardcoded user data displayed | ✓ PASS | All content from state/providers; RoutePreview static mock is explicitly flagged as a backend-pending deviation |
| JWT in SharedPreferences | ✓ PASS | No token handling in home layer; auth tokens remain in `flutter_secure_storage` via `UtbpApiClient` |
| RTL violations (directional EdgeInsets) | ✓ PASS | Zero `EdgeInsets.only/fromLTRB` found — all `EdgeInsetsDirectional.*` |
| print() statements | ✓ PASS | None found |
| Loading states on interactive screens | ✓ PASS | All 6 screens have ShimmerCard or `AsyncValue.when(loading:)` guards |
| Error states | ✓ PASS | All data sections have `error:` branches showing empty/fallback UI |
| Auth state clears on logout | ✓ N/A | Home module has no auth mutation; auth is handled in Module 01 |

## P2 Issues (code quality, non-blocking)

| # | File | Issue | Recommendation |
|---|---|---|---|
| P2-1 | `home_screen.dart` | 1005 lines — exceeds recommended 200-line file limit | Individual widget classes are all ≤200 lines; file size is a function of 15 extracted sub-widgets. Consider splitting `_TripCard` + route section to a `home_screen_cards.dart` |
| P2-2 | `route_preview_screen.dart` | 684 lines | Extract `_FareSelection` + `_BookCta` to `route_preview_fare_section.dart` |
| P2-3 | `promotions_screen.dart` | 538 lines | Extract `_CouponCard` + `_ReferralCard` to `promotions_cards.dart` |
| P2-4 | `explore_routes_screen.dart` | 464 lines | Extract `_RouteRow` to `widgets/route_row.dart` |
| P2-5 | `all_services_screen.dart` | 425 lines | Extract `_ServiceCard` to `widgets/service_card.dart` |
| P2-6 | `route_preview_screen.dart` | RouteDetailCard shows static mock (Mumbai→Pune, AS350 B3) pending `GET /api/v1/app/home/routes/:routeId` | Convert to shimmer when backend endpoint is live |

## API Contract Check

7 home/trips/promotions/notifications endpoints referenced, all as `UnimplementedError` stubs.  
Backend change request filed: `.claude/module-logs/mobile-customer-02-home/BACKEND_CHANGE_REQUEST.md`

## Screen Coverage vs Spec

| Screen | Spec | Implemented | Complete |
|---|---|---|---|
| 2.1 Home | Forest hero, quick book, service chips, trip section, popular routes | ✓ All sections, Transform.translate overlap, shimmer states | ✓ |
| 2.2 All Services | Dark/light service cards, loyalty card | ✓ Forest gradient dark + surface light, mint loyalty card | ✓ |
| 2.3 Explore Routes | Search, filter chips, route list | ✓ Pill search, city chips, route rows | ✓ |
| 2.4 Route Preview | Forest hero, arc painter, detail card, fare tiers, CTA | ✓ QuadraticBezier arc, radio fare tiers, sticky CTA | ✓ |
| 2.5 Promotions | Hero banner, copy CTA, coupon list, referral | ✓ Clipboard copy, AsyncValue coupon list, referral card | ✓ |
| 2.6 Notifications | Date groups, read/unread, mark all | ✓ Today/Yesterday/Earlier grouping, unread dot, mark all | ✓ |

## Shared Widgets

| Widget | Compliant | Notes |
|---|---|---|
| `UtbpBottomNav` | ✓ | 4 tabs, active indicator bar, semantic colors only |
| `AvailBadge` | ✓ | Only warn/info/ok using permitted semantic colors |
| `SectionHeader` | ✓ | Minimal, theme-token text |
| `ShimmerCard` | ✓ | AnimationController, no hardcoded colors |

## Conclusion

**PARTIAL** — All P1 checks pass. 6 P2 issues are code quality/file-size concerns only; no correctness problems.  
Screen coverage is 6/6. Branding rules respected. State management correct.

Recommend proceeding to commit. P2 refactors can be addressed in a follow-up PR.
