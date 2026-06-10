---
name: mobile-setup
description: Flutter mobile app structure, agents, and build workflow for Customer App and Driver App
metadata:
  type: project
---

Mobile apps live in `mobile/` with `customer-app/`, `driver-app/`, and `shared/packages/`.

Stack locked to Flutter + Riverpod + go_router + Dio + Socket.IO + drift. See `Docs/technology_architecture_decisions.md`.

**Agents (`.claude/agents/`):**
- `flutter-senior-dev` — architecture, scaffolding, complex modules, reviewing junior work
- `flutter-developer` — screen/widget implementation within established scaffold
- `mobile-qa-auditor` — end-to-end audit vs spec + backend contract after each module

**Build pipeline per module:** flutter-senior-dev scaffolds → flutter-developer implements → mobile-qa-auditor audits → fix loop until PASS.

**Command:** `/mobile-module <customer|driver> <module-number> <module-name>` — runs the full 3-agent pipeline.

**Why:** Three-agent pipeline mirrors the admin panel module pattern, with an added mobile-specific QA layer that verifies backend contract (endpoint paths, Pydantic schema alignment) since Flutter ↔ FastAPI mismatches are a common integration failure point.
