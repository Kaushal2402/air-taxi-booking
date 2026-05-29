# Air Taxi Booking — Agent Context

White-label transportation booking platform (Air Taxi). Admin panel built module-by-module.
Read `memory/project_stack.md` for deeper architecture decisions.

---

## Monorepo layout

```
air-taxi-booking/
├── backend/          FastAPI 0.115 · Python 3.9 · MySQL · SQLAlchemy 2.0 async
├── admin-panel/      React 18 · TypeScript · Vite · react-router-dom v6
├── Docs/             Product specs + UI wireframes (source of truth)
│   └── ui/project/Acme Mobility Admin/   ← Module HTML wireframes + screens.jsx
└── memory/           MEMORY.md · project_stack.md
```

---

## Backend patterns

### Must-know rules
- **Python 3.9** — `from __future__ import annotations` on EVERY file that uses `X | Y` union syntax
- API prefix `/api/v1` — add new routers to `app/api/v1/router.py`
- Auth guard on every endpoint: `_: AdminUser = Depends(get_current_admin_user)`
- Async throughout — `async def`, `await db.execute(...)`, aiomysql driver
- DB session: `db=Depends(get_db)` injected into every endpoint

### Layer structure
```
app/api/v1/endpoints/<module>.py   ← FastAPI router (thin, delegates to service)
app/services/<module>_service.py   ← Business logic
app/repositories/                  ← (if complex queries need abstracting)
app/models/<entity>.py             ← SQLAlchemy ORM model
app/schemas/<module>.py            ← Pydantic v2 request/response schemas
```

### Reference file
`backend/app/api/v1/endpoints/catalog.py` — copy this pattern exactly for new modules.

### Migrations
```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "add_<module>_tables"
alembic upgrade head
```

---

## Frontend (Admin Panel) patterns

### Must-know rules
- `verbatimModuleSyntax: true` in tsconfig — **always** `import type { SomeInterface }` for types, never mixed with value imports
- All pages wrapped in `<Shell activeId="..." breadcrumb="..." title="..." subtitle="..." actions={...}>`
- Shell `activeId` must match a sidebar nav ID (check `src/components/layout/Sidebar.tsx`)

### Design system
- Accent green: `--accent: #0F8A5F` (CSS var, or `ACCENT = '#0F8A5F'` in TS)
- Classes: `.btn`, `.btn.sm`, `.btn.accent`, `.btn.ghost`, `.badge`, `.badge.ok`, `.badge.info`, `.input`, `.field`, `.field-label`, `.tbl`, `.t-label`, `.t-meta`
- Tokens: `src/styles/tokens.css`

### Responsive — mandatory on every new page
```ts
import { useIsMobile, useIsTablet } from '../hooks/useIsMobile'
// useIsMobile() → < 768px    useIsTablet() → < 1024px
```
- Mobile: single-panel with back button (`showMobileEditor` + `← Back to X`)
- Table always wrapped: `<div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>`

### ConfirmDialog props (exact)
```tsx
<ConfirmDialog
  open            // boolean
  title="..."
  description="..."
  confirmLabel="..."
  variant="danger"   // "danger" | "default"
  onConfirm={fn}
  onCancel={fn}
/>
```

### Service layer pattern (`src/services/<module>Service.ts`)
```ts
import api from '../lib/axios'
export interface Entity { id: string; ... }   // types at top
export const moduleService = {
  listEntities: () => api.get<Entity[]>('/module/entities').then(r => r.data),
  createEntity: (body: Partial<Entity>) => api.post<Entity>('/module/entities', body).then(r => r.data),
  updateEntity: (id: string, body: Partial<Entity>) => api.patch<Entity>(`/module/entities/${id}`, body).then(r => r.data),
  deleteEntity: (id: string) => api.delete(`/module/entities/${id}`).then(r => r.data),
}
```

### Reference pages
- Table + side-editor pattern: `admin-panel/src/pages/catalog/AircraftTypesPage.tsx`
- Three-panel + map: `admin-panel/src/pages/catalog/ServiceZonesPage.tsx`
- Simple list + editor: `admin-panel/src/pages/catalog/VehicleClassesPage.tsx`

### Routes live in `admin-panel/src/App.tsx`
```tsx
<Route path="/module/sub" element={<PrivateRoute><NewPage /></PrivateRoute>} />
```

---

## Module spec locations

| File | Purpose |
|---|---|
| `Docs/ui/project/Acme Mobility Admin/Module XX - Name.html` | Visual wireframe (open in browser) |
| `Docs/ui/project/Acme Mobility Admin/Module XX - screens.jsx` | React screen specs — primary implementation reference |
| `Docs/admin_panel_product_document.md` | Full feature requirements per module |

---

## Common pitfalls (learned the hard way)

1. `ConfirmDialog` — never use `message=` or `danger={true}`, always `description=` + `variant="danger"`
2. react-leaflet v5 stale closure — use `useRef` + no-deps `useEffect` sync for `useMapEvents` handlers
3. Python 3.9 union — `str | None` in a model file without `from __future__ import annotations` = `TypeError` at runtime
4. `import type` — mixing `import { Service, SomeInterface }` triggers `TS1484` with verbatimModuleSyntax
5. After `save()` always reload data (`await loadData(...)`) then clear selection
