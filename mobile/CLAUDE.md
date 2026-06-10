# Air Taxi — Mobile Apps Context

Flutter monorepo for Customer App and Driver App.
Read `../Docs/technology_architecture_decisions.md` for locked stack decisions.

---

## Folder Layout

```
mobile/
├── customer-app/                  Flutter — customer-facing (Android + iOS)
│   └── lib/
│       ├── features/<module>/     Feature-first structure
│       │   ├── data/              DTOs + API service calls
│       │   ├── domain/            Riverpod providers / BLoC
│       │   └── presentation/      Screens + widgets
│       ├── core/                  App bootstrap, router, DI setup
│       └── main.dart
├── driver-app/                    Flutter — driver-facing (Android + iOS)
│   └── lib/                       (same feature-first structure)
└── shared/
    └── packages/
        ├── utbp_api_client/       Dio client + auth interceptor + retry
        ├── utbp_theme/            White-label runtime theme engine
        ├── utbp_widgets/          Shared UI components
        └── utbp_socket/           Socket.IO wrapper
```

---

## API Namespaces

| App | Endpoint prefix | Auth |
|---|---|---|
| Customer | `/api/v1/app/` | Bearer JWT (customer token) |
| Driver | `/api/v1/driver/` | Bearer JWT (driver token) |

Backend source of truth: `../backend/app/api/v1/endpoints/`

---

## Agents

| Agent | When to use |
|---|---|
| `flutter-senior-dev` | Architecture, complex modules, cross-cutting concerns, shared packages, reviewing junior work |
| `flutter-developer` | Implementing screens and features within an established module scaffold |
| `mobile-qa-auditor` | After a module is complete — end-to-end gap report vs spec + backend |

---

## Locked Stack

| Concern | Package |
|---|---|
| State | riverpod (preferred) |
| Navigation | go_router |
| HTTP | dio + dio_cache_interceptor |
| Real-time | socket_io_client |
| Maps | google_maps_flutter + geolocator |
| Push | firebase_messaging |
| Payments | razorpay_flutter |
| Local DB | drift |
| i18n | flutter_localizations + intl |
| Secure storage | flutter_secure_storage |
| Code gen | freezed + json_serializable + build_runner |

---

## Module Build Workflow

```
1. flutter-senior-dev   → scaffold module (folder, interfaces, providers, router entry)
2. flutter-developer    → implement screens + service calls
3. mobile-qa-auditor    → audit against spec + backend contract
4. flutter-senior-dev   → review audit report, approve or request fixes
```

---

## Spec Sources

| File | Purpose |
|---|---|
| `../Docs/customer_app_product_document.md` | Customer App — all 23 modules |
| `../Docs/driver_app_product_document.md` | Driver App — all 20 modules |
| `../Docs/technology_architecture_decisions.md` | Stack + provider adapter decisions |
| `../backend/app/api/v1/endpoints/` | Exact endpoint signatures |
| `../backend/app/schemas/` | Pydantic request/response shapes |

---

## Critical Rules

1. **Never hardcode API base URL** — read from `AppConfig` (white-label runtime config)
2. **All API calls via `UtbpApiClient`** — never raw Dio outside the shared package
3. **flutter_secure_storage only** for tokens — never SharedPreferences for secrets
4. **RTL-safe layouts** — `EdgeInsetsDirectional`, not `EdgeInsets.only(left:...)`
5. **No business logic in widgets** — widgets call providers/services only
6. **State clears on logout** — every provider that holds user data must reset on sign-out
7. **Offline queue** — mutations that must survive connectivity use drift queue + retry
8. **`flutter analyze` clean** before any PR
