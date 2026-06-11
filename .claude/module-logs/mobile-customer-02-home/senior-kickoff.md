# Senior Kickoff — Module 02: Home & Service Selector

## Screens (6 total)
1. HomeScreen (2.1) — forest hero, quick book card (-40 overlap), service chips, upcoming trip, popular routes horizontal scroll
2. AllServicesScreen (2.2) — 4 service type cards (2 dark/2 light), loyalty card
3. ExploreRoutesScreen (2.3) — search bar, filter chips, route list
4. RoutePreviewScreen (2.4) — forest hero with route arc SVG, detail card overlap, pricing tiers, book CTA
5. PromotionsScreen (2.5) — hero promo banner with copy CTA, coupon list, referral card
6. NotificationsScreen (2.6) — grouped by date, read/unread state, mark all read

## API Endpoints (6 needed, all PENDING)
- GET /api/v1/app/home/popular-routes
- GET /api/v1/app/home/service-types
- GET /api/v1/app/trips/active
- GET /api/v1/app/promotions
- GET /api/v1/app/notifications
- PATCH /api/v1/app/notifications/read-all

## Special Concerns
- HomeScreen: "quick book card" overlaps forest hero via Transform.translate (marginTop: -40) — use Stack or Container with negative margin, not padding
- Popular routes: horizontal ListView with shimmer cards (156px wide × 180px tall) while loading
- Upcoming trip: EmptyState card in same dark forest style when activeTripProvider returns null
- Promotions copy CTA: Clipboard.setData + ScaffoldMessenger SnackBar
- Notifications: optimistic read update — update state immediately, revert on API error
- Bottom nav bar: shared widget `UtbpBottomNav` with 4 tabs (home/explore/trips/profile)
- All 6 screens import UtbpBottomNav at bottom

## Files Scaffolded
- lib/features/home/domain/home_models.dart (5 entities)
- lib/features/home/domain/home_providers.dart (5 providers)
- lib/features/home/data/services/home_service.dart (6 stubs)
- lib/features/home/presentation/screens/{home,all_services,explore_routes,route_preview,promotions,notifications}_screen.dart
