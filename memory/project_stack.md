---
name: project-stack
description: Finalized tech stack and project structure for the Air Taxi Booking white-label platform
metadata:
  type: project
---

Air Taxi Booking (Universal Transportation Booking Platform) — white-label, one-time sale, fully isolated per buyer.

**Why:** Two doc sources locked these choices: technology_architecture_decisions.md (ADR) and universal_transportation_booking_platform.md (SOW/BRD/SRS).

**How to apply:** When building any module, follow the patterns already established in the base scaffold.

## Monorepo layout
```
air-taxi-booking/
├── backend/         FastAPI + Python 3.9
├── admin-panel/     React 18 + TypeScript + Vite
└── Docs/            Product docs
```

## Backend (backend/)
- **Runtime:** Python 3.9 — use `from __future__ import annotations` on every file that uses `X | Y` union syntax (Python 3.10+ only otherwise)
- **Framework:** FastAPI 0.115, async with python-socketio for Socket.IO at /ws
- **DB:** MySQL (not PostgreSQL per ADR — user override) via aiomysql async driver
  - MYSQL_SERVER=127.0.0.1, PORT=3306, USER=root, PASS=root, DB=air-taxi-booking
- **ORM:** SQLAlchemy 2.0 async with Alembic migrations
- **Auth:** JWT (python-jose) + bcrypt (passlib), short-lived access tokens + rotating refresh
- **Cache/Pub-Sub:** Redis
- **Provider Adapter Layer:** `app/providers/` — each capability has an abstract base in `base/` and concrete adapters in sub-packages; active adapter resolved by config in `app/providers/__init__.py` via @lru_cache factories
  - Maps: GoogleMapsAdapter (active)
  - Payments: RazorpayAdapter (active)
  - Push: FCMAdapter (active)
  - SMS: GenericHttpSmsAdapter (active)
  - WhatsApp: GenericCloudApiWhatsAppAdapter (active)
  - Email: SmtpAdapter (active)
  - Storage: S3Adapter (active)
  - KYC: NoOpKycAdapter (v1 stub)
  - CallMasking: NoOpCallMaskingAdapter (v1 stub)
- **API prefix:** /api/v1 — add new routers to `app/api/v1/router.py`
- **Run dev:** `source venv/bin/activate && uvicorn app.main:app --reload`

## Admin Panel (admin-panel/)
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v3
- **Routing:** React Router v6
- **Server state:** TanStack Query (React Query)
- **Global state:** Zustand (persisted auth in authStore)
- **HTTP:** Axios with auto-attach JWT + 401→/login redirect
- **Forms:** react-hook-form + zod
- **Icons:** lucide-react
- **Utils:** cn() helper in lib/utils.ts (clsx + tailwind-merge)
- **Run dev:** `npm run dev` (port 5173)
- **API base:** VITE_API_BASE_URL env var → http://localhost:8000/api/v1

## Design approach
- Admin panel: modules delivered one by one; design file provided per module before implementation
- DO NOT implement features until instructed module by module
