# CLAUDE.md

## Core Operating Principles

This file defines **how** Claude operates in this repository. Domain-specific knowledge lives in:
- @AGENTS.md (general repo rules)
- @backend/AGENTS.md (backend architecture rules)  
- @frontend/AGENTS.md (frontend React rules)

**Always follow the nearest AGENTS.md file. If instructions conflict, the closest file to the edited code wins.**

---

## Routing & Scope

### Task Classification

Before starting, classify the task:

- **Trivial** (single file, obvious fix) → execute directly
- **Moderate** (2-5 files, clear scope) → brief planning then execute
- **Complex** (architectural impact, ambiguous) → research first, propose plan

### Default Scope

- Work on **recently modified code only**
- Expand scope **only when explicitly instructed**
- Never refactor unrelated code

---

## Quick Reference Commands

### Backend (Bun + Elysia)
```bash
cd backend && bun install           # Install deps
cd backend && bun run dev           # Dev server (hot reload)
cd backend && bun run build         # Production build
```

### Frontend (React + Vite)
```bash
cd frontend && npm install          # Install deps
cd frontend && npm run dev          # Dev server
cd frontend && npm run build        # TypeScript check + build
cd frontend && npm run lint         # ESLint (zero warnings)
```

### Database (Drizzle ORM)
```bash
cd backend && bun run db:generate   # Generate migrations
cd backend && bun run db:migrate    # Run migrations
cd backend && bun run db:push       # Push schema (dev only)
cd backend && bun run db:studio     # Drizzle Studio GUI
```

### Docker
```bash
docker-compose up -d                # Start stack
docker-compose logs -f              # View logs
docker-compose down                 # Stop stack
```

---

## Architecture Summary

### Backend Layers (Strict DDD)

| Layer | Responsibility | Can Call |
|-------|---------------|----------|
| Controller | Request/response mapping only | Services only |
| Service | All business logic, orchestration | Repositories, Clients |
| Repository | Database access only | Models |
| Client | External service access | External APIs |
| Model | Database entities | Nothing |

**Rule**: No layer may bypass another. See @backend/AGENTS.md for details.

### Frontend Structure

```
src/
├── pages/          # Route components (AnalysesList, AnalysisDetail)
├── components/ui/  # shadcn/ui components
├── lib/api.ts      # Typed API client
└── hooks/          # Custom React hooks
```

Data fetching via **TanStack Query**. See @frontend/AGENTS.md for React rules.

### Key Database Tables

- `analyses` - Analysis apps (status: draft/active/deprecated)
- `prompt_versions` - Versioned prompts linked to analyses
- `execution_logs` - AI execution audit trail
- `api_keys` - Per-app API keys
- `vendor_api_keys` - Encrypted AI provider keys

Schema at `backend/src/db/schema.ts`.

---

## Quality Standards

### Priority Order (when trade-offs arise)
**Correctness > Maintainability > Performance > Brevity**

### Before Modifying Code

1. Identify all downstream consumers using codebase search
2. Validate changes against existing patterns
3. Preserve exact behavior unless change is explicitly requested

### Code Quality Checklist

- [ ] All inputs validated
- [ ] Error handling follows existing patterns
- [ ] No `any` types (frontend)
- [ ] No business logic in wrong layer (backend)
- [ ] No commented-out code or debug logs

---

## Working Agreements

### DO
- Preserve exact behavior unless explicitly asked to change
- Prefer explicit, readable code over clever abstractions
- Keep changes minimal and reviewable
- Follow existing project patterns and naming conventions

### DON'T
- Add new production dependencies without explicit instruction
- Touch secrets, credentials, or production config values
- Paste secrets into output
- Make broad refactors without approval
- Add comments explaining obvious code

---

## Environment Configuration

### Required
- `DATABASE_URL` - PostgreSQL connection string

### Optional (can be stored in DB via UI)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`  
- `GEMINI_API_KEY`

### API Authentication
Public endpoint `POST /api/v1/analyze/:appId` requires `X-API-Key` header.

---

## Git Hygiene

- Keep changes minimal and reviewable
- Use Conventional Commits format
- Never push directly to main
- Document behavior changes in appropriate docs
