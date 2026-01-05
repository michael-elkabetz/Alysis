# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

### Backend (Bun + Elysia)
```bash
cd backend
bun install              # Install dependencies
bun run dev              # Run with hot reload (development)
bun run start            # Run production
bun run build            # Build to ./dist
```

### Frontend (React + Vite)
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Run dev server
npm run build            # TypeScript check + Vite build
npm run lint             # ESLint with zero warnings threshold
npm run preview          # Preview production build
```

### Database (Drizzle ORM)
```bash
cd backend
bun run db:generate      # Generate migrations from schema changes
bun run db:migrate       # Run migrations
bun run db:push          # Push schema directly (dev only)
bun run db:studio        # Open Drizzle Studio GUI
```

### Docker
```bash
docker-compose up -d     # Start full stack (postgres, backend, frontend)
docker-compose logs -f   # View logs
docker-compose down      # Stop stack
```

## Architecture

### Backend Structure
The backend uses a layered architecture:
- **Controllers** (`src/controllers/`) - Elysia route handlers, request/response handling
- **Services** (`src/services/`) - Business logic layer
- **Repositories** (`src/repositories/`) - Data access layer using Drizzle ORM
- **Clients** (`src/clients/`) - AI provider abstractions (OpenAI, Anthropic, Gemini)

All AI clients implement the `AIClient` interface from `src/clients/base.ts` with a common `complete()` method.

### Frontend Structure
- **Pages** (`src/pages/`) - Route components: `AnalysesList` (home), `AnalysisDetail` (app detail)
- **Components** (`src/components/ui/`) - shadcn/ui components
- **Lib** (`src/lib/api.ts`) - API client with typed functions for all backend endpoints
- **Hooks** (`src/hooks/`) - Custom React hooks

Data fetching uses TanStack Query. API base URL configured via `VITE_API_URL` env var.

### Database Schema
Located in `backend/src/db/schema.ts`. Key tables:
- `analyses` - Analysis apps with status (draft/active/deprecated)
- `prompt_versions` - Versioned prompts linked to analyses
- `execution_logs` - Audit trail of all AI executions
- `api_keys` - Per-app API keys for authentication
- `vendor_api_keys` - Stored AI provider keys (encrypted)

### API Authentication
Public execution endpoint (`POST /api/v1/analyze/:appId`) requires `X-API-Key` header.

## Environment Variables

Backend requires `DATABASE_URL`. AI provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) can be set via environment or stored in database through the UI.
