---
description: "Build a complete mobile app module end-to-end: Senior scaffolds → Developer implements → QA audits → fix loop until PASS. Handles backend change requests and cross-surface impact detection automatically."
argument-hint: "<customer|driver> <module-number> <module-slug>  e.g. customer 2 onboarding-auth"
---

# Mobile Module Pipeline Orchestrator

You are the **Orchestrator** for mobile module: **$ARGUMENTS**

Parse the arguments:
- `$APP` = first word (customer | driver)
- `$MODULE_NUM` = second word (e.g. 2, 14)
- `$MODULE_SLUG` = third word (e.g. onboarding-auth, payments-checkout)
- `$LOG_DIR` = `.claude/module-logs/mobile-$APP-$MODULE_NUM-$MODULE_SLUG`

Create the log directory immediately. Work through every phase in order. **Do not skip phases. Do not start implementation before research is complete.**

---

## PHASE 0 — Environment check

Before anything else:
1. Verify `mobile/$APP-app/` exists
2. Verify `mobile/shared/packages/` exists
3. Verify the product doc exists: `Docs/${APP}_app_product_document.md`
4. Read `mobile/CLAUDE.md` and `CLAUDE.md`
5. Check if this module has been built before: look for existing files in `mobile/$APP-app/lib/features/$MODULE_SLUG/`

Log findings to `$LOG_DIR/orchestrator.md`

If the app folder doesn't exist yet, the Flutter project hasn't been initialized. Write:
```
⛔ SETUP REQUIRED
mobile/$APP-app/ does not exist. Initialize Flutter project first:
  cd mobile && flutter create --org com.utbp --platforms android,ios $APP_app
```
Stop here until resolved.

---

## PHASE 1 — Read the spec

Read the full module section from `Docs/${APP}_app_product_document.md`.

Extract and log to `$LOG_DIR/orchestrator.md`:
- Module purpose (one paragraph)
- Complete list of submodules
- Complete list of screens with their purpose
- All API endpoints specified (method, path, purpose)
- All business rules and RBAC constraints
- All real-time requirements (Socket.IO events)
- All background service requirements (location, FCM)
- Any dependencies on other modules (e.g., "requires Module 2 auth to be complete")

---

## PHASE 2 — Backend readiness audit

For each API endpoint the spec requires:
1. Check `backend/app/api/v1/endpoints/` — does the route exist?
2. Check `backend/app/schemas/` — does the schema have all required fields?
3. Check `backend/app/models/` — do the models have all required columns?
4. Verify auth guard is present on protected endpoints

**Classify each endpoint:**
- ✅ Ready — exists and matches spec
- ⚠️ Partial — exists but schema is incomplete
- ❌ Missing — not built yet

If ANY endpoint is ❌ Missing or ⚠️ Partial:
- Log the gap in `$LOG_DIR/BACKEND_GAPS.md`
- Decide: is this module blocked, or can it be partially built?
- If blocked: stop and inform the user exactly what backend work must happen first

---

## PHASE 3 — Cross-surface check

Review: does building this module create data that should appear in admin or operator panel?

Check the admin panel: `admin-panel/src/pages/` — is there already a screen for this data?
Check the operator panel: `operator-panel/` — same check.

Log findings in `$LOG_DIR/CROSS_SURFACE_PREREQS.md`.

If cross-surface screens are missing and they are needed for the mobile module to be meaningful (e.g., driver documents submitted via app but admin has no review screen), raise this to the user before proceeding.

---

## PHASE 4 — Clarification gate ⛔

Before spawning any agents, check:
- Is any spec field marked "TBD" or ambiguous?
- Are there two valid interpretations of any flow?
- Does any feature require a third-party key not yet in the repo?
- Does the spec contradict the backend contract anywhere?

**If yes to any: STOP. Use AskUserQuestion to resolve every open question before continuing.**

Log all decisions in `$LOG_DIR/orchestrator.md` under "Clarifications".

---

## PHASE 5 — Spawn Senior Flutter Developer

Spawn `flutter-senior-dev` agent with this prompt (fill in the actual module details):

```
You are the Senior Flutter Developer running Phase 5 of the mobile module pipeline.

App: $APP
Module: $MODULE_NUM — $MODULE_SLUG
Log directory: $LOG_DIR

Your job:
1. Read $LOG_DIR/orchestrator.md (the spec analysis and backend audit done in phases 1-3)
2. Read the full module section in Docs/${APP}_app_product_document.md
3. Read all backend files: backend/app/api/v1/endpoints/, backend/app/schemas/, backend/app/models/
4. Follow your EXECUTION PROTOCOL steps 1-6 exactly:
   - Audit backend contract (Step 2) — confirm or extend Phase 2 findings
   - Check cross-surface impact (Step 3) — write CROSS_SURFACE_IMPACT.md if needed
   - Scaffold the module (Step 4) — create all files in mobile/$APP-app/lib/features/$MODULE_SLUG/
   - Implement the architecture layer (Step 5) — Freezed models, providers, services, router entries
   - Write IMPLEMENTATION_BRIEF.md (Step 6) — detailed handoff to flutter-developer

Do not implement any screens — that is flutter-developer's job.
Write BACKEND_CHANGE_REQUEST.md if backend gaps are found.
Write CROSS_SURFACE_IMPACT.md if admin/operator panel changes are needed.
Write SENIOR_SIGNOFF.md only AFTER reviewing flutter-developer's output (not now).

When done with scaffolding, write to $LOG_DIR/senior-scaffold-complete.md:
"Scaffold complete. Ready for flutter-developer."
```

Wait for Senior to complete before proceeding.

---

## PHASE 6 — Check for blockers before implementation

Read `$LOG_DIR/`:
- If `BACKEND_CHANGE_REQUEST.md` exists → show it to the user. Ask: proceed with what's available, or wait for backend fix?
- If `CROSS_SURFACE_IMPACT.md` exists → show it to the user. Note which items are blocking vs informational.

Only proceed to Phase 7 if no blocking backend gaps.

---

## PHASE 7 — Spawn Flutter Developer

Spawn `flutter-developer` agent with this prompt:

```
You are the Flutter Developer running Phase 7 of the mobile module pipeline.

App: $APP
Module: $MODULE_NUM — $MODULE_SLUG
Log directory: $LOG_DIR

Your job:
1. Read $LOG_DIR/IMPLEMENTATION_BRIEF.md — your primary instruction from Senior
2. Read the full module section in Docs/${APP}_app_product_document.md — the spec
3. Read the scaffold Senior created in mobile/$APP-app/lib/features/$MODULE_SLUG/
4. Follow your EXECUTION PROTOCOL steps 1-7 exactly:
   - List every screen (Step 2)
   - Implement every screen (Step 3) with the per-screen checklist (Step 4)
   - Extract sub-widgets (Step 5)
   - Run flutter analyze (Step 6) — must be clean before reporting
   - Write dev-report.md (Step 7)

Do not modify anything in domain/ or data/services/ — those were built by Senior.
Do not modify shared/packages/ — escalate to Senior.
If you hit a blocker, write it in dev-report.md under BLOCKERS and stop.

When done, write to $LOG_DIR/dev-report.md.
```

Wait for Developer to complete.

---

## PHASE 8 — Senior reviews Developer's output

Spawn `flutter-senior-dev` agent with this prompt:

```
You are the Senior Flutter Developer running Phase 8 (code review) of the mobile module pipeline.

App: $APP
Module: $MODULE_NUM — $MODULE_SLUG
Log directory: $LOG_DIR

Read:
- $LOG_DIR/dev-report.md
- All files in mobile/$APP-app/lib/features/$MODULE_SLUG/presentation/

Follow your EXECUTION PROTOCOL Step 7 (review):
- Check every screen for architecture violations
- Run: cd mobile/$APP-app && flutter analyze lib/features/$MODULE_SLUG/
- If issues found: write specific fix instructions to $LOG_DIR/senior-review-feedback.md
- If clean: write SENIOR_SIGNOFF.md

Do not fix things yourself — write instructions for flutter-developer to fix.
```

If Senior's review found issues: re-spawn `flutter-developer` with the feedback and loop back to Phase 8.
Maximum 3 fix loops before escalating to user.

---

## PHASE 9 — Spawn QA Auditor

Spawn `mobile-qa-auditor` agent:

```
You are the QA Auditor running Phase 9 of the mobile module pipeline.

App: $APP
Module: $MODULE_NUM — $MODULE_SLUG
Log directory: $LOG_DIR

Follow your EXECUTION PROTOCOL steps 1-10 exactly.

Read everything:
- All files in $LOG_DIR/
- All files in mobile/$APP-app/lib/features/$MODULE_SLUG/
- All backend files relevant to this module

Run flutter analyze. Audit spec coverage, backend contract, state hygiene, security, offline, RTL.
Check cross-surface gaps.

Write qa-audit-report.md to $LOG_DIR/.
Your verdict is PASS, PARTIAL, or FAIL — no other options.
```

---

## PHASE 10 — Fix loop

Read the QA verdict:

**If PASS:**
- Proceed to Phase 11

**If PARTIAL (P2s only):**
- Show P2 list to user
- Ask: fix now or ship for internal testing?
- If fix: spawn `flutter-developer` with QA's P2 fix instructions, then re-spawn `mobile-qa-auditor`

**If FAIL (P1s exist):**
- Show P1 blockers to user
- Determine: P1s for Developer (screen issues) or Senior (architecture/backend)?
- Spawn appropriate agent with specific fix instructions
- Loop back to Phase 9
- Maximum 3 audit loops before escalating to user with full summary

---

## PHASE 11 — Final report

Show the user:

```markdown
## Module $MODULE_NUM ($MODULE_SLUG) — $APP App ✅ COMPLETE

### What was built
[paste from senior-kickoff.md and dev-report.md]

### Backend Changes Requested
[paste from BACKEND_CHANGE_REQUEST.md if exists, else "None"]

### Cross-Surface Impacts
[paste from CROSS_SURFACE_IMPACT.md if exists, else "None"]

### QA Result
[paste verdict and P3 notes from qa-audit-report.md]

### Next Steps
1. [Backend changes to implement, if any]
2. [Admin/operator panel changes to implement, if any]
3. [Manual device testing checklist]
4. Any deferred items from QA
```

---

## LOGGING RULES

All phases write to `$LOG_DIR/orchestrator.md`:
- Phase number and name
- Key decisions made
- Blockers encountered and how resolved
- Agent results summary

This log is the audit trail. Never delete it.

Files written by agents in `$LOG_DIR/`:
- `orchestrator.md` — this orchestrator's running log
- `senior-kickoff.md` — Senior's spec analysis
- `IMPLEMENTATION_BRIEF.md` — Senior's handoff to Developer
- `BACKEND_CHANGE_REQUEST.md` — if backend gaps found
- `CROSS_SURFACE_IMPACT.md` — if admin/operator changes needed
- `dev-start.md` — Developer's pre-implementation summary
- `dev-report.md` — Developer's completion report
- `senior-review-feedback.md` — Senior's code review notes
- `SENIOR_SIGNOFF.md` — Senior's approval
- `qa-audit-report.md` — QA's final verdict
- `qa-audit-report-v2.md` — QA re-audit after fixes (if needed)
