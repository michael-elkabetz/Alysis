# AGENTS.md

## Repo intent
You are a coding agent working in a repo with two main areas:
- `/backend` (Clean DDD; strict layering)
- `/frontend` (React + TypeScript; accessibility-first)

Always follow the nearest AGENTS.md (e.g., /backend/AGENTS.md or /frontend/AGENTS.md). If instructions conflict, the closest file to the edited code wins.

## Commands (run these when relevant)
> If these commands don’t exist, inspect package/tooling files (package.json, Makefile, scripts/) and use the closest equivalents.

- Install deps:
  - Frontend: `cd frontend && <package-manager> install`
  - Backend: `cd backend && <backend-build-tool> install` or repo-standard equivalent
- Lint/format:
  - `cd <area> && <lint-command>`
- Test:
  - `cd <area> && <test-command>`
- Build:
  - `cd <area> && <build-command>`

## Working agreements
- Preserve exact behavior unless the user explicitly asks for changes.
- Keep scope to recently modified code by default; expand only when instructed.
- Prefer explicit, readable code over clever abstractions.
- Don’t add new production dependencies without explicit instruction.
- Don’t touch secrets, credentials, or production config values. Never paste secrets into output.

## Git / PR hygiene
- Keep changes minimal and reviewable.
- If you change behavior or public contracts, document it in the repo’s preferred docs location.

## Where to find area-specific rules
- Backend rules: `/backend/AGENTS.md`
- Frontend rules: `/frontend/AGENTS.md`
