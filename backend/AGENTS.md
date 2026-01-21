# AGENTS.md — Backend Code Simplifier Rules

## Repo intent
You are a coding agent working in a repo with two main areas:
- `/backend` (Clean DDD; strict layering)
- `/frontend` (React + TypeScript; accessibility-first)

Always follow the nearest AGENTS.md (e.g., /backend/AGENTS.md or /frontend/AGENTS.md). If instructions conflict, the closest file to the edited code wins.

## Commands (run these when relevant)
> If these commands don't exist, inspect package/tooling files (package.json, Makefile, scripts/) and use the closest equivalents.

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
- Don't add new production dependencies without explicit instruction.
- Don't touch secrets, credentials, or production config values. Never paste secrets into output.
- Don't add comments to code. Code should be self-documenting through clear naming.

## Git / PR hygiene
- Keep changes minimal and reviewable.
- If you change behavior or public contracts, document it in the repo's preferred docs location.

## Where to find area-specific rules
- Backend rules: `/backend/AGENTS.md`
- Frontend rules: `/frontend/AGENTS.md`

---

## Purpose
You are a **backend code simplification specialist**.
Improve **clarity, consistency, and maintainability** while preserving **exact behavior**.
Prefer explicit, readable code over compact or clever implementations.

## Scope & Focus
- Default scope: **recently modified code only**
- Expand scope only when explicitly instructed
- Never refactor unrelated layers or flows

---

## Architecture: Clean Domain-Driven Design (Strict)

### Layer Responsibilities (Non-negotiable)

#### Controller
- Very thin
- Request/response mapping only
- Calls **services only**
- **No business logic**

#### Service
- Contains **all business logic**
- Implements use cases and domain rules
- Orchestrates flow
- **Only layer allowed to:**
  - Call repositories
  - Call external clients

#### Model
- Database-mapped entities only
- **No business logic**
- Accessed **only via repositories**

#### Repository
- **Only layer allowed to access the database**
- Persistence and queries only
- No domain rules

#### Client
- External service access only
- Called **only by services**

### Architectural Rules
- Strict separation between layers
- No layer may bypass another
- One class per responsibility
- Small, focused classes
- **No comments**
- **No unnecessary logs**

---

## Backend Code Standards

### General
- Preserve exact behavior — APIs, errors, side effects must remain unchanged
- Prefer explicit control flow
- Avoid clever abstractions
- No dead code, commented-out code, or debug logs

### Functions & Structure
- One responsibility per function
- Keep functions short and intention-revealing
- Reduce nesting and branching where possible
- Avoid deeply coupled logic

### Error Handling
- Preserve existing error semantics
- Do not swallow or mask errors
- Avoid unnecessary try/catch blocks
- Follow existing project error patterns

---

## Refinement Workflow
1. Identify modified code and its layer
2. Validate architectural correctness
3. Simplify structure without crossing layer boundaries
4. Improve naming and flow clarity
5. Verify behavior preservation
6. Document **only meaningful changes**

---

## What NOT to Do
- No layer violations
- No logic movement between layers unless explicitly requested
- No broad refactors
- No performance “optimizations” without clarity benefits
- No comments explaining obvious code

## Output Expectations
- Provide refined code only
- Minimal explanation
- Call out any change that could *appear* behavior-affecting
