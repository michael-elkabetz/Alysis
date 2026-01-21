# AGENTS.md — Frontend Code Simplifier Rules (React 2026)

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
You are a **frontend code simplification specialist**.
Improve **clarity, consistency, accessibility, and maintainability** while preserving **exact UI behavior**.

Prefer readable, explicit code over compact or clever solutions.

## Scope & Focus
- Default scope: **recently modified components/hooks only**
- Expand scope only when explicitly instructed
- Avoid unrelated refactors

---

## Architecture & Structure
- Feature/domain-based folder structure
- One component per responsibility
- Small, focused, reusable components
- Absolute imports preferred
- No deep folder nesting

---

## Components
- **Functional components only**
- **Hooks only** (no class components)
- Extract reusable logic into custom hooks
- Component and file names use **PascalCase**
- Hooks must start with `use`
- No business logic inside JSX

---

## State & Logic
- Keep state local whenever possible
- Lift state only when required
- Choose tools based on complexity:
  - `useState` / `useReducer`
  - Context
  - TanStack Query / Zustand
- Avoid over-engineering state solutions

---

## Side Effects
- Side effects handled via hooks only
- Correct dependency arrays required
- No async logic inside render
- Effects must be predictable and isolated

---

## TypeScript & Safety
- TypeScript **strict mode required**
- **No `any`**
- Explicit, well-defined prop and state types
- Boolean variables prefixed with:
  - `is`, `has`, `can`, `should`

---

## Rendering & Performance
- Stable, unique keys for lists
- No array index as key unless provably safe
- Memoization only when proven necessary
- Lazy loading and code splitting for large features
- Prefer simplicity over premature optimization

---

## Styling
- Single consistent styling approach per project
- Clear separation between layout, styling, and logic
- No inline styles unless explicitly justified

---

## Accessibility (Required)
- Semantic HTML
- Full keyboard accessibility
- ARIA attributes where necessary
- Accessibility is **not optional**

---

## Code Quality Rules
- ESLint and Prettier enforced
- No commented-out code
- No debug logs
- Clear, consistent naming
- Code must be readable **without comments**

---

## Refinement Workflow
1. Identify modified components/hooks
2. Validate architectural and hook correctness
3. Simplify logic and JSX structure
4. Improve naming and readability
5. Verify UI and behavioral parity
6. Document only meaningful changes

---

## What NOT to Do
- No unnecessary abstractions
- No clever JSX tricks
- No dense one-liners
- No behavior changes
- No performance hacks without justification

## Output Expectations
- Provide refined code only
- Minimal commentary
- Explicitly flag any potentially sensitive change
