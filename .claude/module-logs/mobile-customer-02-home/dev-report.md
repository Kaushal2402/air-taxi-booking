# Developer Report — Module 02: Home & Service Selector

## Screens Implemented (6/6)

1. `home_screen.dart` — Forest hero with greeting/bell/avatar, quick-book card (Transform.translate -40px overlap), service type chips (horizontal scroll, AsyncValue on serviceTypesProvider), upcoming trip section (shimmer/empty/data), popular routes horizontal scroll (shimmer/empty/data with tap → routePreview)
2. `all_services_screen.dart` — Service list: first 2 cards dark (forest gradient), last 2 light (surface), loyalty miles card at bottom (mint bg)
3. `explore_routes_screen.dart` — Serif headline, pill search bar, static city filter chips with local filter on popularRoutesProvider, route list with _RouteRow cards
4. `route_preview_screen.dart` — 264px forest hero with _RouteArcPainter (dashed quadratic arc + endpoint dots), overlapping detail card (static mock pending backend), fare tier radio selection, sticky Book CTA
5. `promotions_screen.dart` — Forest hero banner with Clipboard copy of promo code, coupon list (AsyncValue on promotionsProvider), referral card
6. `notifications_screen.dart` — Date-grouped (Today/Yesterday/Earlier), unread dot, 60% opacity for read items, "Mark all read" button (optimistic update)

## Shared Widgets Created (4)

- `widgets/bottom_nav_bar.dart` — UtbpBottomNav: 4 tabs (Home, Explore, My Trips, Profile), 3px top active-indicator bar, animated color transitions
- `widgets/avail_badge.dart` — AvailBadge pill: ok/warn/info states with permitted semantic colors only
- `widgets/section_header.dart` — SectionHeader with optional "See all" action
- `widgets/shimmer_card.dart` — ShimmerCard: AnimationController pulse placeholder

## Sub-Widgets Extracted (all inline in screen files, keeping individual widgets <200 lines)

`home_screen.dart`: _HomeHeader, _DecorativeRing, _QuickBookCard, _QuickBookRow, _ServiceChipsRow, _ServiceChip, _UpcomingTripSection, _EmptyTripCard, _TripCard, _StatusPill, _PopularRoutesHeader, _PopularRoutesSection, _RouteCard  
`all_services_screen.dart`: _EmptyServicesState, _ServiceCard, _ServiceCardContent, _LoyaltyCard  
`explore_routes_screen.dart`: _SearchBar, _FilterChip, _EmptyRoutesState, _RouteRow  
`route_preview_screen.dart`: _RouteHero, _RouteArcPainter, _RouteDetailCard, _MetaItem, _AircraftInfo, _FareTier, _FareSelection, _FareTierRow, _BookCta  
`promotions_screen.dart`: _HeroBanner, _CouponCard, _ReferralCard, _EmptyPromosState  
`notifications_screen.dart`: _NotifGroup, _groupByDate(), _NotifItem, _EmptyNotificationsState

## Infrastructure Changes

- `lib/core/di/providers.dart` (new) — Re-exports `utbpApiClientProvider` from auth_provider.dart to provide single import point for home feature
- `lib/features/home/domain/home_providers.dart` (updated) — Added `homeServiceProvider`; all notifiers call real HomeService methods catching UnimplementedError for empty defaults; `PopularRoutesNotifier.filterByServiceType()` invalidates self with new filter; `NotificationsNotifier.markAllRead()` optimistic local update

## API Endpoints Referenced (all PENDING — throw UnimplementedError)

- GET /api/v1/app/home/service-types
- GET /api/v1/app/home/popular-routes?service_type=
- GET /api/v1/app/trips/active
- GET /api/v1/app/promotions
- GET /api/v1/app/notifications?page=
- PATCH /api/v1/app/notifications/read-all
- GET /api/v1/app/home/routes/:routeId (RoutePreviewScreen — static mock until available)

## Deviations from Spec

- RoutePreviewScreen detail card shows static mock (Mumbai→Pune, AS350 B3) since `GET /api/v1/app/home/routes/:routeId` is pending
- City filter chips (Explore screen) applied locally on cached popularRoutesProvider result rather than a separate backend call (spec shows static city labels)
- `flutter analyze` not run — Flutter CLI not installed in environment; manual code review performed

## Static Analysis (Manual)

- Hardcoded Color() literals: Only permitted semantic colors (0xFFC97B0C warn, 0xFF1762BA info, 0xFFFDF1DC/0xFFE7EFFE soft backgrounds)
- Hardcoded fontFamily strings: None found
- Non-directional EdgeInsets (left/right): None found
- print() statements: None found
