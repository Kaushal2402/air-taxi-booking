---
description: "Agentic full-stack module development — reads scope docs, creates tasks, spawns backend + frontend agents in parallel, then verifies everything against spec."
argument-hint: "<module-number>  e.g. 13"
---

# Module Orchestrator

You are the **Orchestrator** for Module **$ARGUMENTS** of the Air Taxi Booking admin panel.

Work through every phase in order. **Do not skip phases. Do not start implementation before completing research.**

---

## PHASE 1 — Read the scope

Read ALL of these before doing anything else:

1. `Docs/ui/project/Acme Mobility Admin/Module $ARGUMENTS - screens.jsx`
   (this is your primary UI spec — every screen, every field, every state)
2. `Docs/ui/project/Acme Mobility Admin/Module $ARGUMENTS - *.html`
   (visual wireframe context)
3. `Docs/admin_panel_product_document.md` — search for "Module $ARGUMENTS" section
4. `CLAUDE.md` — patterns and rules
5. `memory/project_stack.md` — architecture

After reading, write a one-paragraph summary of what this module does. Log it to:
`.claude/module-logs/module-$ARGUMENTS/orchestrator.md`

---

## PHASE 2 — Audit what already exists

Check:
- `backend/app/api/v1/endpoints/` — any file related to this module?
- `backend/app/models/` — any models?
- `backend/app/schemas/` — any schemas?
- `backend/app/services/` — any service methods?
- `admin-panel/src/pages/` — any page directory or files?
- `admin-panel/src/services/` — any service file?

List what already exists vs what needs to be built. Log to `orchestrator.md`.

---

## PHASE 3 — Task breakdown

Create a numbered task list. Use TaskCreate for each task:
- Format: `BE-01` for backend, `FE-01` for frontend, `VF-01` for verify
- Include: what to build, which file, which layer

Also identify if any existing implementation has gaps or bugs that need fixing.

Log the full task list to `orchestrator.md`.

---

## PHASE 4 — Define the API contract

Write `.claude/module-logs/module-$ARGUMENTS/api-contract.md` with EVERY endpoint this module needs:

```markdown
## POST /api/v1/<resource>
Request: { field: type, ... }
Response: { id, field, ..., created_at, updated_at }

## GET /api/v1/<resource>
Query params: include_inactive (bool)
Response: Array<above>

## PATCH /api/v1/<resource>/{id}
Request: Partial<above>
Response: updated object

## DELETE /api/v1/<resource>/{id}
Response: { message: "..." }
```

Include every enum value, nullable field, and pagination detail.
This file is the single handshake between backend and frontend agents.

---

## PHASE 5 — Clarification check ⛔

Before spawning ANY agents, check:

- Is there any ambiguity in the screens.jsx or HTML wireframe?
- Are there fields or behaviours the spec doesn't define clearly?
- Are there design decisions that require user input?

**If YES to any: STOP HERE. Use AskUserQuestion to list every open question. Wait for answers before continuing.**

Only proceed to Phase 6 after all questions are resolved.
Log decisions to `orchestrator.md` under "Clarifications".

---

## PHASE 6 — Spawn agents in parallel

Spawn both agents **in the same message** (parallel execution):

### Backend Agent prompt template:
```
You are the Backend Agent for Module $ARGUMENTS of the Air Taxi Booking platform.

Read these files first:
- CLAUDE.md (patterns and rules)
- .claude/module-logs/module-$ARGUMENTS/api-contract.md (what to build)
- backend/app/api/v1/endpoints/catalog.py (pattern to follow)
- backend/app/services/catalog_service.py (service pattern)
- backend/app/schemas/catalog.py (schema pattern)

Tasks to complete:
[paste BE-XX tasks from Phase 3]

For each task:
1. Create/update SQLAlchemy model in backend/app/models/
2. Create/update Pydantic schemas in backend/app/schemas/
3. Add service methods to backend/app/services/<module>_service.py
4. Create endpoint file backend/app/api/v1/endpoints/<module>.py (follow catalog.py exactly)
5. Register router in backend/app/api/v1/router.py
6. Create Alembic migration: alembic revision --autogenerate -m "add_module_$ARGUMENTS"
   (do NOT run it — just create the migration file)

IMPORTANT:
- Python 3.9: from __future__ import annotations on every file with X | Y unions
- Auth guard on every endpoint: _: AdminUser = Depends(get_current_admin_user)
- Never use Optional[X] — use X | None with __future__ annotations

After finishing, write a summary of what you built to:
.claude/module-logs/module-$ARGUMENTS/backend-report.md
```

### Frontend Agent prompt template:
```
You are the Frontend Agent for Module $ARGUMENTS of the Air Taxi Booking admin panel.

Read these files first:
- CLAUDE.md (patterns and rules)
- .claude/module-logs/module-$ARGUMENTS/api-contract.md (what API endpoints exist)
- Docs/ui/project/Acme Mobility Admin/Module $ARGUMENTS - screens.jsx (UI spec)
- admin-panel/src/pages/catalog/AircraftTypesPage.tsx (reference pattern)
- admin-panel/src/services/catalogService.ts (service pattern)
- admin-panel/src/App.tsx (where to register routes)

Tasks to complete:
[paste FE-XX tasks from Phase 3]

For each task:
1. Add TypeScript interfaces + service methods to admin-panel/src/services/<module>Service.ts
2. Build page component in admin-panel/src/pages/<module>/
3. Register routes in admin-panel/src/App.tsx under PrivateRoute

IMPORTANT:
- import type { Interface } for all types (verbatimModuleSyntax)
- Every page must be responsive: useIsMobile() + useIsTablet()
- Mobile: showMobileEditor pattern with back button
- Tables: overflowX auto wrapper
- Use exact ConfirmDialog props: open, title, description, variant="danger"
- Run npm run build at the end to confirm zero TypeScript errors

After finishing, write a summary to:
.claude/module-logs/module-$ARGUMENTS/frontend-report.md
```

Use `isolation: "worktree"` for both agents so they work on independent copies of the repo.
Run them in parallel (`run_in_background: true`) to save time.

---

## PHASE 7 — Verify

After both agents complete, spawn a **Verifier Agent**:

```
You are the Verifier for Module $ARGUMENTS of the Air Taxi Booking platform.

Read:
- .claude/module-logs/module-$ARGUMENTS/api-contract.md
- .claude/module-logs/module-$ARGUMENTS/backend-report.md
- .claude/module-logs/module-$ARGUMENTS/frontend-report.md
- Docs/ui/project/Acme Mobility Admin/Module $ARGUMENTS - screens.jsx

Checks to run:
1. Run: cd admin-panel && npm run build
   - Report any TypeScript errors
2. For every endpoint in api-contract.md:
   - Confirm the route exists in backend/app/api/v1/endpoints/
   - Confirm the service method exists in backend/app/services/
   - Confirm a frontend service call exists in src/services/
3. For every screen in screens.jsx:
   - Confirm a corresponding page component exists
   - Confirm the route is registered in App.tsx
   - Confirm useIsMobile/useIsTablet is used
4. Check every new page uses <Shell> wrapper
5. Check ConfirmDialog uses correct props (open, description, variant)

Write a structured report to:
.claude/module-logs/module-$ARGUMENTS/verify-report.md

Format:
## ✅ Passed
- [list each passing check]
## ⚠️ Issues
- [file:line — specific problem]
## 🔴 Build errors
- [exact error messages]
```

---

## PHASE 8 — Report to user

Show a clean summary:

```
## Module $ARGUMENTS — Complete

### What was built
**Backend:**
- [list from backend-report.md]

**Frontend:**
- [list from frontend-report.md]

### Verification
[paste verify-report.md content]

### Next steps
- Run migration: cd backend && alembic upgrade head
- [any manual steps]
```

If verification found issues → spawn targeted fix agents for each specific issue, then re-verify.

---

## Logging rules

Every phase writes to `.claude/module-logs/module-$ARGUMENTS/orchestrator.md`:
- Phase completed
- Key decisions made
- Any clarifications received
- Agent results summary

This log is the audit trail. Never delete it.
