export const meta = {
  name: 'module-audit',
  description: 'Audit a module: map user journeys, find gaps, verify linkage end-to-end',
  whenToUse: 'Run BEFORE building a module (get build order) or AFTER (verify nothing is missing or unlinked). Pass the module name or number as args.',
  phases: [
    { title: 'Read Spec', detail: 'Parse module spec doc and screens.jsx for required journeys' },
    { title: 'Scan Code', detail: 'Scan backend + frontend for what is actually built' },
    { title: 'Gap Analysis', detail: 'Cross-reference spec vs code; find missing pieces and broken links' },
    { title: 'Report', detail: 'Produce prioritised gap report + build order' },
  ],
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const JOURNEY_SCHEMA = {
  type: 'object',
  properties: {
    journeys: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:        { type: 'string', description: 'Short journey name, e.g. "Operator invites a user"' },
          actor:       { type: 'string', description: 'Who performs it: admin | operator | customer | driver | system' },
          steps:       { type: 'array', items: { type: 'string' }, description: 'Ordered steps in plain English' },
          priority:    { type: 'string', enum: ['P0', 'P1', 'P2'], description: 'P0=must-have blocker, P1=core, P2=nice-to-have' },
        },
        required: ['name', 'actor', 'steps', 'priority'],
      },
    },
    module_name: { type: 'string' },
    module_number: { type: 'string' },
  },
  required: ['journeys', 'module_name'],
}

const BACKEND_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    endpoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          method:       { type: 'string' },
          path:         { type: 'string' },
          file:         { type: 'string' },
          registered:   { type: 'boolean', description: 'Is it included in router.py?' },
          has_service:  { type: 'boolean', description: 'Does it delegate to a service function?' },
          auth_guarded: { type: 'boolean', description: 'Does it have auth dependency?' },
        },
        required: ['method', 'path', 'file', 'registered', 'has_service', 'auth_guarded'],
      },
    },
    models:   { type: 'array', items: { type: 'string' }, description: 'ORM model names found' },
    schemas:  { type: 'array', items: { type: 'string' }, description: 'Pydantic schema names found' },
    services: { type: 'array', items: { type: 'string' }, description: 'Service function names found' },
    migrations_exist: { type: 'boolean', description: 'Is there an alembic migration for this module?' },
  },
  required: ['endpoints', 'models', 'schemas', 'services', 'migrations_exist'],
}

const FRONTEND_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:            { type: 'string' },
          file:            { type: 'string' },
          route_registered: { type: 'boolean', description: 'Does App.tsx have a route for this page?' },
          sidebar_linked:  { type: 'boolean', description: 'Is it linked from the sidebar?' },
          uses_service:    { type: 'boolean', description: 'Does it call a service layer function?' },
        },
        required: ['name', 'file', 'route_registered', 'sidebar_linked', 'uses_service'],
      },
    },
    service_methods: { type: 'array', items: { type: 'string' }, description: 'Service methods in the module service file' },
    panel: { type: 'string', enum: ['admin-panel', 'operator-panel', 'both', 'none'] },
  },
  required: ['pages', 'service_methods', 'panel'],
}

const GAP_SCHEMA = {
  type: 'object',
  properties: {
    broken_journeys: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          journey:     { type: 'string' },
          broken_at:   { type: 'string', description: 'Which step is broken or missing' },
          reason:      { type: 'string' },
          severity:    { type: 'string', enum: ['blocker', 'major', 'minor'] },
        },
        required: ['journey', 'broken_at', 'reason', 'severity'],
      },
    },
    missing_backend: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          what:     { type: 'string', description: 'e.g. "POST /operators/{id}/users/register"' },
          why:      { type: 'string', description: 'Which journey needs it' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
        },
        required: ['what', 'why', 'priority'],
      },
    },
    missing_frontend: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          what:     { type: 'string', description: 'e.g. "AcceptInvitePage route in App.tsx"' },
          why:      { type: 'string' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
        },
        required: ['what', 'why', 'priority'],
      },
    },
    broken_links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          what:   { type: 'string', description: 'e.g. "Router not registered in router.py"' },
          file:   { type: 'string' },
          fix:    { type: 'string', description: 'Exact fix in one sentence' },
        },
        required: ['what', 'file', 'fix'],
      },
    },
    build_order: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step:        { type: 'number' },
          what:        { type: 'string' },
          type:        { type: 'string', enum: ['model', 'migration', 'schema', 'service', 'endpoint', 'frontend-service', 'frontend-page', 'route', 'sidebar', 'config'] },
          depends_on:  { type: 'array', items: { type: 'number' } },
          done:        { type: 'boolean', description: 'Is this already built?' },
        },
        required: ['step', 'what', 'type', 'depends_on', 'done'],
      },
    },
    overall_status: { type: 'string', enum: ['complete', 'partial', 'skeleton', 'not-started'] },
    summary:        { type: 'string', description: 'Two-sentence plain English summary of the situation' },
  },
  required: ['broken_journeys', 'missing_backend', 'missing_frontend', 'broken_links', 'build_order', 'overall_status', 'summary'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveModuleInput(input) {
  if (!input) return { hint: '', label: 'Unknown module' }
  const s = String(input).trim()
  // e.g. "09", "9", "Operators", "operator auth"
  const num = s.match(/^\d+$/) ? s.padStart(2, '0') : null
  return { hint: s, label: s, num }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const { hint, label, num } = resolveModuleInput(args)

const ROOT = '/Users/softpital/itechai/Solutions/Air Taxi Booking/Code/air-taxi-booking'
const DOCS = `${ROOT}/Docs/ui/project/Acme Mobility Admin`
const BACKEND = `${ROOT}/backend/app`
const ADMIN = `${ROOT}/admin-panel/src`
const OPERATOR = `${ROOT}/operator-panel/src`

log(`Auditing module: "${label}"`)

// ── Phase 1: Read spec ────────────────────────────────────────────────────────

phase('Read Spec')

const specResult = await agent(
  `You are auditing the Air Taxi Booking platform.

Module to audit: "${label}" ${num ? `(Module ${num})` : ''}

Your job: read the module spec and extract every user journey (end-to-end flows a user must complete).

Files to read (use whichever exist):
- Spec HTML:    ${DOCS}/Module ${num || '??'} - *.html  (list with bash, then read)
- Screens JSX:  ${DOCS}/Module ${num || '??'} - screens.jsx
- Product doc:  ${ROOT}/Docs/admin_panel_product_document.md  (grep for the module section)

If the module number is unknown, search the Docs directory for files matching "${label}".

Extract ALL user journeys — not just happy paths. Include:
- Pre-requisites (what must exist before this module works, e.g. operator must be created before operator login works)
- Auth flows (register/invite → login → use feature)
- CRUD flows
- Status transitions
- Edge cases mentioned in the spec

Return structured output.`,
  { label: 'spec:journeys', phase: 'Read Spec', schema: JOURNEY_SCHEMA }
)

log(`Found ${specResult?.journeys?.length ?? 0} journeys in spec`)

// ── Phase 2: Scan code (parallel) ─────────────────────────────────────────────

phase('Scan Code')

const [backendScan, frontendScan] = await parallel([
  () => agent(
    `You are auditing the Air Taxi Booking backend (FastAPI, Python 3.9, SQLAlchemy 2.0).

Module: "${label}"

Scan the backend codebase for everything related to this module:

1. Endpoints — look in: ${BACKEND}/api/v1/endpoints/
   For each endpoint found: record method, path, file, whether it is registered in ${BACKEND}/api/v1/router.py, whether it calls a service, whether it has an auth dependency (Depends(get_current_admin_user) or similar).

2. Models — look in: ${BACKEND}/models/
   List all ORM model class names related to this module.

3. Schemas — look in: ${BACKEND}/schemas/
   List all Pydantic schema class names related to this module.

4. Services — look in: ${BACKEND}/services/
   List all service function names related to this module.

5. Migrations — check: ${ROOT}/backend/alembic/versions/
   Do any migration files mention tables for this module?

Be thorough. If a file might be related, read it.`,
    { label: 'scan:backend', phase: 'Scan Code', schema: BACKEND_SCAN_SCHEMA }
  ),
  () => agent(
    `You are auditing the Air Taxi Booking frontend.

Module: "${label}"

There are TWO panels:
- Admin Panel:    ${ADMIN}
- Operator Panel: ${OPERATOR}

Scan both for everything related to this module:

1. Pages — look in: src/pages/  in both panels
   For each page: name, file path, is it registered as a <Route> in App.tsx, is it linked from Sidebar.tsx, does it call a service layer function.

2. Service methods — look in: src/services/ in both panels
   List all service method names related to this module.

3. Which panel(s) have UI for this module?

Be thorough. Check App.tsx routes carefully — a page file existing does NOT mean it is routed.`,
    { label: 'scan:frontend', phase: 'Scan Code', schema: FRONTEND_SCAN_SCHEMA }
  ),
])

log(`Backend: ${backendScan?.endpoints?.length ?? 0} endpoints, ${backendScan?.models?.length ?? 0} models`)
log(`Frontend: ${frontendScan?.pages?.length ?? 0} pages across ${frontendScan?.panel ?? 'unknown'} panel(s)`)

// ── Phase 3: Gap analysis ─────────────────────────────────────────────────────

phase('Gap Analysis')

const gapReport = await agent(
  `You are a senior SDLC auditor for the Air Taxi Booking platform.

Module: "${label}"

You have been given:

1. REQUIRED JOURNEYS (from spec):
${JSON.stringify(specResult, null, 2)}

2. BACKEND CODE SCAN:
${JSON.stringify(backendScan, null, 2)}

3. FRONTEND CODE SCAN:
${JSON.stringify(frontendScan, null, 2)}

Your job: produce a complete gap analysis.

Rules:
- A journey is BROKEN if ANY step in it lacks a backend endpoint, a frontend page, a registered route, or a wired service call.
- A link is BROKEN if e.g.: endpoint exists but not in router.py; page exists but no route in App.tsx; service method exists but not called from the page; frontend calls an endpoint that doesn't exist.
- The build_order must list EVERY piece needed (both already-done and not-done) in dependency order. done=true means already built.
- P0 = without this the entire module is unusable. P1 = core feature. P2 = nice-to-have.
- Be brutally honest. If the module is only 30% done, say so.
- The summary must be actionable: "X journeys are broken. The most critical gap is Y. Build Z next."`,
  { label: 'gap:analysis', phase: 'Gap Analysis', schema: GAP_SCHEMA }
)

// ── Phase 4: Format report ────────────────────────────────────────────────────

phase('Report')

const report = await agent(
  `You are formatting an audit report for a development team.

Module: "${label}"
Status: ${gapReport?.overall_status ?? 'unknown'}

Raw gap analysis:
${JSON.stringify(gapReport, null, 2)}

Format a clear, actionable markdown report with these sections:

## 🔍 Module Audit: ${label}
**Status**: [overall_status with emoji — ✅ complete | 🟡 partial | 🟠 skeleton | 🔴 not-started]
**Summary**: [summary]

## 🚨 Broken Journeys
[table: Journey | Broken At | Reason | Severity]
If none: "All journeys are complete ✅"

## 🔧 Missing Backend
[numbered list with priority badge: [P0] POST /path — needed for X]
If none: "Nothing missing ✅"

## 🎨 Missing Frontend
[numbered list with priority badge]
If none: "Nothing missing ✅"

## 🔗 Broken Links
[numbered list: What is broken → Exact fix]
If none: "All links verified ✅"

## 📋 Build Order
[table with columns: Step | What to Build | Type | Status]
Show ✅ for done, ⬜ for not done.
Group by: Models/Migrations → Schemas → Services → Endpoints → Frontend Service → Pages → Routes

## ⚡ Next Action
Bold, one paragraph: what to build RIGHT NOW and why, in priority order.

Keep it concise and developer-focused. No waffle.`,
  { label: 'format:report', phase: 'Report' }
)

return {
  module: label,
  overall_status: gapReport?.overall_status,
  journeys_count: specResult?.journeys?.length ?? 0,
  broken_journeys: gapReport?.broken_journeys?.length ?? 0,
  missing_backend: gapReport?.missing_backend?.length ?? 0,
  missing_frontend: gapReport?.missing_frontend?.length ?? 0,
  broken_links: gapReport?.broken_links?.length ?? 0,
  report,
}
