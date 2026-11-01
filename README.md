# RepoMind

RepoMind is an AI-powered codebase intelligence platform. This repository currently contains the monorepo foundation only; application features are intentionally not implemented yet.

## Current implementation

- `client/`: React + Vite + TypeScript client scaffold.
- `server/api/`: Express + TypeScript API with a `/health` endpoint.
- `server/ai/`: FastAPI service with a `/health` endpoint and a pytest smoke test.
- `server/workers/`: TypeScript worker process scaffold.
- `database/`: Reserved for migrations, schemas, seeds and database tests.
- `packages/`: Shared contracts, API client and configuration package scaffolds.
- `infrastructure/docker-compose.yml`: PostgreSQL 16 with pgvector and Redis 7.
- `docs/`: Implementation documentation; product and design documentation is in [`repomind_documentation/docs`](repomind_documentation/docs).

No authentication, GitHub integration, indexing, RAG, database schema, queue jobs or patch generation features exist yet.

## Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer
- Python 3.11 or newer
- Docker Desktop with Compose support

## Setup

```bash
pnpm install
Copy-Item .env.example .env # PowerShell; use cp on Unix-like systems
```

The Python service can be installed separately:

```bash
python -m venv server/ai/.venv
server/ai/.venv/Scripts/python -m pip install -r server/ai/requirements.txt # Windows
# server/ai/.venv/bin/python -m pip install -r server/ai/requirements.txt     # Unix-like systems
```

Start local infrastructure with:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

## Development commands

```bash
pnpm dev                 # client, API and worker in parallel
pnpm build               # all JavaScript/TypeScript packages and services
pnpm typecheck           # all TypeScript workspaces
pnpm lint                # repository ESLint configuration
pnpm format:check        # Prettier validation
```

Run the Python service with:

```bash
uvicorn app.main:app --app-dir server/ai --reload --port 8000
```

The API health endpoint is `http://localhost:5000/health`; the AI health endpoint is `http://localhost:8000/health`.

## Repository guidance

The engineering rules and target architecture are defined in [`repomind_documentation/docs/AGENTS.md`](repomind_documentation/docs/AGENTS.md). The remaining design documents are available in [`repomind_documentation/docs`](repomind_documentation/docs).

The next milestone is database schema and migration work. Product features should be added incrementally after that milestone, with tests and security controls included in each change.
