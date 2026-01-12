# Alysis — Self-Hosted AI Analysis Platform

Build, manage, and run AI-powered analysis apps with ease.

![Built with Bun](https://img.shields.io/badge/Built_with-Bun-F9F1E1?style=flat&logo=bun&logoColor=black)
![Elysia](https://img.shields.io/badge/Framework-Elysia-6C5CE7?style=flat)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react&logoColor=black)
![Postgres](https://img.shields.io/badge/Postgres-16-336791?style=flat&logo=postgresql&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-Ready-412991?style=flat&logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-Ready-D4A373?style=flat)
![Google Gemini](https://img.shields.io/badge/Gemini-Ready-4285F4?style=flat&logo=google&logoColor=white)

---

## Overview

**Alysis** is a self-hosted platform for creating and executing AI analysis applications. Define your prompts, connect to OpenAI, Anthropic, or Google Gemini, and expose them as secure API endpoints — all with built-in versioning, logging, and statistics.

![Alysis Platform Details](info.png)

---

## Key Features

### One-Stop Self-Hosted Solution
- **Complete Platform** — Everything you need to build, test, and deploy AI analysis apps in one place
- **Self-Hosted** — Full control over your data, prompts, and AI provider keys
- **Docker Ready** — Deploy the entire stack with a single command

### Product Playground
- **Interactive Testing** — Test your prompts in real-time before going live
- **Multi-Provider Support** — Switch between OpenAI, Anthropic, and Google Gemini instantly
- **Sample Data Management** — Store and reuse test inputs for rapid iteration
- **Prompt Versioning** — Full version control with draft → active → deprecated workflow

### Performance & Cost Measurement
- **Real-Time Analytics** — Track latency and token usage for every request
- **Per-Version Cost Stats** — Compare pricing and performance across prompt versions
- **Execution Logs** — Complete audit trail of all requests and responses
- **Cost Optimization** — Make data-driven decisions about model selection

### Developer Experience (Dev Space)
- **Type-Safe Integration** — Auto-generated TypeScript interfaces from your AI responses
- **Ready-to-Use Code** — Copy production-ready cURL commands with your API key
- **Simple Integration** — Send data from your app → get structured analysis back
- **Expected Response Schema** — Know exactly what your app will receive
- **API Documentation** — Interactive Swagger docs at `/docs`

### Security & Management
- **API Key Authentication** — Secure endpoints with auto-generated keys per app
- **Vendor Key Management** — Store AI provider keys in database or use environment variables
- **JSON & Text Formats** — Flexible response formats for any use case

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker-compose up -d
```

The `-d` flag runs containers in detached mode (in the background), freeing up your terminal. Use `docker-compose logs -f` to view logs, and `docker-compose down` to stop the stack.

Your stack is now running:

| Service      | URL                        |
| ------------ | -------------------------- |
| **Frontend** | http://localhost:80        |
| **Backend**  | http://localhost:3001      |
| **API Docs** | http://localhost:3001/docs |
| **Postgres** | localhost:5432             |

### Option 2: Local Development

**Prerequisites:** [Bun](https://bun.sh) (v1.3.5+), Node.js (v22+), PostgreSQL

```bash
# Terminal 1 — Backend
cd backend && bun install && bun run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

---

## Tech Stack

| Component    | Technology                                                      |
| ------------ |-----------------------------------------------------------------|
| **Runtime**  | Bun                                                             |
| **Backend**  | Elysia + Swagger                                                |
| **Frontend** | React 19 + Vite + TailwindCSS + shadcn/ui + Framer Motion       |
| **Database** | PostgreSQL 16                                                   |
| **ORM**      | Drizzle ORM                                                     |
| **AI**       | OpenAI SDK, Anthropic SDK, Google GenAI SDK                     |
| **Data**     | TanStack Query                                                  |
| **UI/UX**    | Radix UI + Recharts + Sonner + Lucide Icons                     |

---

## UI Features

The frontend is built with a modern, feature-based architecture for maximum maintainability:

- **Feature-Based Organization** — Modular components organized by domain (analysis, execution, etc.)
- **Responsive Design** — Mobile-optimized layouts with adaptive UI components
- **Real-Time Updates** — TanStack Query for automatic data synchronization
- **Accessible Components** — Built on Radix UI primitives for WCAG compliance
- **Animated Transitions** — Smooth micro-interactions powered by Framer Motion
- **Data Visualization** — Interactive charts and analytics via Recharts
- **Toast Notifications** — Non-intrusive feedback using Sonner
- **40+ UI Components** — Complete shadcn/ui component library included

---

## API Usage

Once you've created and activated an app through the UI, use this endpoint to execute it:

```
POST /api/v1/analyze/:appId
```

**Headers:**
| Header | Required | Description |
|--------------------|----------|------------------------------------------|
| `X-API-Key` | Yes | API key generated when app was created |
| `X-Caller-Service` | No | Identifier for your calling service |

**Request:**

```json
{
  "input": {
    "data": "your data"
  }
}
```

**Response:**

```json
{
  "id": "log_xyz",
  "output": { "result": "..." },
  "status": "success",
  "latencyMs": 342,
  "tokenUsage": { "prompt": 25, "completion": 10, "total": 35 }
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/v1/analyze/e-comm-G9fDp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxx..." \
  -d '{"input": {"data": "I love this product!"}}'
```

Full API documentation available at `/docs` (Swagger UI).

### Dev Space

The UI includes a built-in Dev Space that automatically generates ready-to-use integration code:

- **cURL Commands** — Copy production-ready cURL snippets with your API key
- **TypeScript Interfaces** — Auto-generated type definitions from AI responses
- **Sample Data Integration** — Pre-populated requests using your saved sample data

Access Dev Space by clicking the terminal icon in the analysis detail view.

---

## Configuration

### Environment Variables

| Variable            | Description                  | Default     |
| ------------------- | ---------------------------- | ----------- |
| `DATABASE_URL`      | PostgreSQL connection string | Required    |
| `OPENAI_API_KEY`    | OpenAI API key               | Optional    |
| `ANTHROPIC_API_KEY` | Anthropic API key            | Optional    |
| `GEMINI_API_KEY`    | Google Gemini API key        | Optional    |
| `PORT`              | Backend server port          | 3001        |
| `NODE_ENV`          | Environment mode             | development |

### Supported Models

**OpenAI:** `gpt-5.2`, `gpt-4o`

**Anthropic:** `claude-opus-4-5-20251101`, `claude-sonnet-4-20250514`

**Google Gemini:** `gemini-3-pro-preview`, `gemini-2.5-flash`

---

## Project Structure

```
/
├── docker-compose.yml        # Stack orchestration
├── backend/                  # Bun + Elysia API
│   ├── src/
│   │   ├── clients/          # AI provider clients (OpenAI, Anthropic, Gemini)
│   │   ├── modules/          # Feature modules (analysis, prompt, execution, etc.)
│   │   │   ├── analysis/     # Analysis domain (controller, service, repository)
│   │   │   ├── prompt/       # Prompt versioning domain
│   │   │   ├── execution/    # Execution logs domain
│   │   │   ├── api-key/      # API key management
│   │   │   ├── vendor-key/   # Vendor API key management
│   │   │   └── dev-tools/    # Developer tools
│   │   ├── db/               # Drizzle schema & migrations
│   │   ├── config/           # Configuration (model pricing, etc.)
│   │   ├── shared/           # Shared types & interfaces
│   │   ├── utils/            # Utilities
│   │   └── index.ts          # App entry point
│   └── Dockerfile
├── frontend/                 # React 19 App
│   ├── src/
│   │   ├── features/         # Feature-based organization
│   │   │   └── analysis/     # Analysis feature module
│   │   │       ├── components/ # AppCard, PromptEditor, StatsGrid, DevSpaceSheet, etc.
│   │   │       └── hooks/    # useTestRunner, usePromptEditor, useInlineEdit, etc.
│   │   ├── components/ui/    # shadcn/ui components (40+ components)
│   │   ├── layouts/          # Layout components (BackgroundEffects)
│   │   ├── pages/            # Route pages (AnalysesList, AnalysisDetail)
│   │   ├── hooks/            # Shared hooks (useRelativeTime, useMobile)
│   │   └── lib/              # Utilities (api.ts, type-generators.ts)
│   └── Dockerfile
└── README.md
```

---

## Database Schema

| Table             | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `analyses`        | Analysis apps with name, description, status, and sample data |
| `prompt_versions` | Versioned prompts with model config and interfaces     |
| `execution_logs`  | Request/response audit trail with token usage          |
| `api_keys`        | Per-app API keys for authentication                    |
| `vendor_api_keys` | Stored AI provider keys (encrypted)                    |

---

## Contributing

Contributions are welcome! Fork the repo, create a feature branch, and submit a PR.

---

## License

MIT License
