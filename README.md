# RepoMind

### Understand any codebase. Investigate with evidence. Plan changes with confidence.

RepoMind is an AI-powered codebase understanding and engineering assistant that helps developers explore unfamiliar GitHub repositories, understand code architecture, ask questions grounded in source code, and generate implementation plans and patch proposals for human review.

> **Product principle:** AI explains, investigates, and proposes. Humans review, choose, and approve.

---

## Table of Contents

- [Why RepoMind?](#why-repomind)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Application Architecture](#application-architecture)
- [Database Design](#database-design)
- [Development Workflow](#development-workflow)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why RepoMind?

Understanding an unfamiliar codebase is time-consuming.

Developers often need to:

- Understand unfamiliar project structures.
- Identify application entry points.
- Trace dependencies between modules.
- Understand API endpoints and database interactions.
- Investigate bugs and potential causes.
- Identify files affected by a new feature.
- Understand architectural decisions.

Generic AI assistants often provide explanations without sufficient evidence from the actual repository.

RepoMind addresses this problem through repository indexing, retrieval-augmented generation (RAG), source-grounded AI conversations, and human-reviewed code change proposals.

### Target Users

- Developers onboarding to unfamiliar codebases.
- Junior and mid-level software engineers.
- Open-source contributors.
- Developers investigating bugs and planning features.
- Engineers exploring complex software architectures.

---

## Core Features

### 1. GitHub Integration
- Connect public and private GitHub repositories.
- Retrieve repository metadata.
- Access authorized source code.
- Track repository revisions.

### 2. Repository Intelligence
- Analyze repository structures.
- Identify important files and entry points.
- Understand module relationships.
- Index repository source code.

### 3. AI Codebase Q&A
- Ask natural-language questions about a repository.
- Generate context-aware explanations.
- Retrieve relevant source code.
- Provide file paths and line references as evidence.

### 4. Repository Explorer
- Browse repository file structures.
- View source code.
- Explore repository metadata.
- Understand project organization.

### 5. Feature Planning
- Identify potentially affected files.
- Generate implementation plans.
- Explain architectural trade-offs.
- Suggest relevant tests and potential risks.

### 6. Patch Proposals
- Generate proposed code modifications.
- Preview changes.
- Review proposed patches.
- Require explicit human approval.

---

## System Architecture

RepoMind follows a modular monorepo architecture with separate client, server, database, and infrastructure responsibilities.

```mermaid
flowchart TD
    USER[Developer] --> CLIENT[React Client]

    CLIENT --> API[Express API Server]

    API --> AUTH[Authentication]
    API --> DB[(PostgreSQL + pgvector)]
    API --> GH[GitHub API]
    API --> REDIS[(Redis Queue)]

    REDIS --> WORKER[Background Indexing Worker]

    WORKER --> GH
    WORKER --> AI[FastAPI AI Service]

    AI --> RAG[RAG Pipeline]
    AI --> EMB[Embedding Service]
    AI --> LLM[LLM Provider]

    RAG --> DB
    EMB --> DB

    API --> AI
    AI --> API
    API --> CLIENT
```

### Architectural Components

| Component | Responsibility |
|---|---|
| Client | User interface and application interactions |
| API Server | Authentication, authorization, business logic and REST APIs |
| AI Service | RAG, embeddings, retrieval and LLM orchestration |
| Background Worker | Repository synchronization and indexing |
| Database | Application data, repository metadata and vector storage |
| Redis | Background job queue |
| GitHub API | Repository access and source retrieval |

**Architecture principle:** The Express API acts as the application's public control plane. The browser never directly accesses PostgreSQL, Redis, internal AI services, or private provider credentials.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| AI Backend | Python, FastAPI |
| AI Architecture | RAG, LLMs, Embeddings |
| Database | PostgreSQL |
| Vector Database | pgvector |
| Background Jobs | BullMQ |
| Queue | Redis |
| Source Control | Git, GitHub API |
| Validation | Zod, Pydantic |
| Frontend Testing | Vitest, Playwright |
| Backend Testing | Vitest |
| AI Testing | Pytest |
| Infrastructure | Docker, Docker Compose |
| Monorepo | pnpm Workspaces, Turborepo |

---

## Repository Structure

RepoMind uses a monorepo structure to maintain clear boundaries between application components.

```text
repomind/
│
├── client/                         # React frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   └── shared/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── repositories/
│   │   │   ├── code-explorer/
│   │   │   ├── ai-chat/
│   │   │   └── patch-review/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   ├── tests/
│   ├── package.json
│   └── vite.config.ts
│
├── server/                          # Backend services
│   │
│   ├── api/                         # Express REST API
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── github/
│   │   │   │   ├── repositories/
│   │   │   │   ├── indexing/
│   │   │   │   ├── conversations/
│   │   │   │   ├── ai/
│   │   │   │   └── proposals/
│   │   │   ├── middleware/
│   │   │   ├── integrations/
│   │   │   ├── database/
│   │   │   ├── queues/
│   │   │   ├── routes/
│   │   │   ├── utils/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── ai/                          # Python FastAPI service
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── agents/
│   │   │   ├── rag/
│   │   │   ├── embeddings/
│   │   │   ├── retrieval/
│   │   │   ├── llm/
│   │   │   ├── prompts/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── main.py
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   │
│   └── workers/                     # Background workers
│       ├── src/
│       │   ├── jobs/
│       │   ├── processors/
│       │   ├── queues/
│       │   ├── services/
│       │   └── worker.ts
│       ├── tests/
│       └── package.json
│
├── database/                        # Database management
│   ├── migrations/
│   ├── schemas/
│   ├── seeds/
│   ├── extensions/
│   ├── functions/
│   ├── tests/
│   └── README.md
│
├── packages/                        # Shared packages
│   ├── contracts/
│   ├── api-client/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   ├── docker-compose.yml
│   └── scripts/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   └── SECURITY.md
│
├── .github/
│   └── workflows/
│
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### Directory Responsibilities

| Directory | Responsibility |
|---|---|
| `client/` | Frontend application |
| `server/api/` | REST API and business logic |
| `server/ai/` | AI processing and RAG |
| `server/workers/` | Asynchronous processing |
| `database/` | SQL migrations and database tests |
| `packages/` | Shared contracts and utilities |
| `infrastructure/` | Docker and deployment configuration |
| `docs/` | Technical and product documentation |

---

## Getting Started

### Prerequisites

Install the following tools:

- Git
- Node.js LTS
- pnpm
- Python 3.11+
- PostgreSQL with pgvector
- Redis
- Docker and Docker Compose
- GitHub OAuth/App credentials
- LLM provider API credentials

### 1. Clone Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>

cd repomind
```

### 2. Install Dependencies

Install JavaScript workspace dependencies:

```bash
pnpm install
```

Install Python AI service dependencies:

```bash
cd server/ai

python -m venv .venv
```

Activate the environment:

Windows:

```powershell
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create local environment configuration from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the required credentials.

### 4. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Ensure PostgreSQL has the pgvector extension enabled.

### 5. Run Database Migrations

Run the migration commands defined by the project's database migration tooling.

Verify that all required tables and indexes have been created.

### 6. Start Development Services

Start the individual services using the scripts configured in their respective package manifests.

Development services:

- React frontend
- Express API
- Python FastAPI service
- Background indexing worker
- PostgreSQL
- Redis

**Note:** This repository structure describes the intended architecture. Commands and features become available as their implementation is completed. Check each service's package scripts before running it.

---

## Environment Configuration

The root `.env.example` should document the environment variables required by the backend and infrastructure.

Example:

```env
# Application
NODE_ENV=development
APP_URL=http://localhost:5173
API_PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/repomind
DATABASE_POOL_MAX=10

# Authentication
SESSION_SECRET=replace_with_secure_secret

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1/github/callback

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TOKEN=

# LLM
LLM_PROVIDER=
LLM_MODEL=
LLM_API_KEY=

# Embeddings
EMBEDDING_PROVIDER=
EMBEDDING_MODEL=
EMBEDDING_DIMENSIONS=

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
```

Use separate environment files or secret-management configuration for individual services when appropriate.

**Security:** Never commit real credentials, API keys, database passwords, or session secrets.

Only public configuration should be exposed to the frontend.

---

## Application Architecture

### Client Architecture

The frontend uses a feature-based architecture.

Each feature should manage its own components, hooks, API interactions, and types where appropriate.

Example:

```text
client/src/features/repositories/

├── components/
├── hooks/
├── services/
├── types/
└── index.ts
```

### API Server Architecture

The Express application follows a modular layered architecture.

Example:

```text
server/api/src/modules/repositories/

├── repositories.routes.ts
├── repositories.controller.ts
├── repositories.service.ts
├── repositories.repository.ts
├── repositories.validation.ts
├── repositories.types.ts
└── repositories.test.ts
```

Responsibilities:

- Routes: HTTP endpoint definitions.
- Controllers: Request and response handling.
- Services: Business logic.
- Repositories: Database access.
- Validation: Input validation.
- Tests: Automated verification.

### AI Service Architecture

The Python service handles:

- Repository context processing.
- Code chunking.
- Embedding generation.
- Semantic retrieval.
- RAG orchestration.
- LLM provider integration.
- Structured AI responses.
- Citation validation.

### Background Worker Architecture

Workers handle long-running tasks outside the request-response lifecycle.

Examples:

- Repository synchronization.
- Commit-based indexing.
- File processing.
- Embedding generation.
- Failed job retries.
- Cleanup operations.

---

## Database Design

RepoMind uses PostgreSQL as its primary database and pgvector for semantic code retrieval.

### Core Tables

| Table | Description |
|---|---|
| users | Application users |
| github_accounts | GitHub account connections |
| repositories | Connected repositories |
| repository_revisions | Repository commit metadata |
| repository_files | Indexed source files |
| document_chunks | Code chunks and embeddings |
| indexing_jobs | Repository indexing jobs |
| conversations | AI conversations |
| messages | Conversation messages |
| patch_proposals | Proposed code modifications |

### Database Engineering Principles

- Use UUID primary keys where appropriate.
- Define foreign key relationships.
- Add indexes for frequently queried columns.
- Use pgvector indexes for embedding retrieval.
- Maintain schema changes through versioned migrations.
- Track repository revisions using immutable commit SHAs.
- Enforce user-level data isolation.
- Keep database credentials on the server.

See [DATABASE.md](docs/DATABASE.md) for the detailed schema and relationships.

---

## Development Workflow

RepoMind will be developed in incremental phases.

| Phase | Work |
|---|---|
| 1 | Monorepo foundation and infrastructure |
| 2 | Database schema and migrations |
| 3 | Authentication and GitHub integration |
| 4 | Repository management and explorer |
| 5 | Repository indexing pipeline |
| 6 | AI-powered codebase Q&A |
| 7 | Feature planning and patch proposals |
| 8 | Testing, security and deployment |

### Engineering Principles

1. Keep modules independent and maintainable.
2. Use TypeScript for frontend and Node.js services.
3. Use Python for AI-specific processing.
4. Keep database queries outside controllers.
5. Use asynchronous jobs for expensive indexing tasks.
6. Pin all repository analysis to a specific commit SHA.
7. Validate all external inputs and model outputs.
8. Treat repository source code as untrusted input.
9. Write automated tests for important workflows.
10. Require human approval for generated code modifications.

---

## Security

Security is a core requirement because RepoMind may process private source code.

### Security Measures

- GitHub OAuth with minimum required permissions.
- Secure session and token management.
- Authorization checks for every repository operation.
- Encrypted storage for sensitive credentials.
- Internal authentication between API and AI service.
- Prompt injection protection.
- Input validation and request rate limiting.
- No automatic execution of repository scripts.
- No automatic commits or pushes.
- Commit-pinned code citations.
- Defined source-code retention and deletion policies.

See [SECURITY.md](docs/SECURITY.md) for the security architecture.

---

## Roadmap

### Foundation
- [ ] Establish monorepo structure.
- [ ] Configure pnpm workspaces.
- [ ] Configure Docker infrastructure.
- [ ] Set up PostgreSQL and pgvector.
- [ ] Create database migrations.
- [ ] Establish API and AI service skeletons.

### Core Application
- [ ] Implement user authentication.
- [ ] Implement GitHub integration.
- [ ] Connect repositories.
- [ ] Build repository explorer.
- [ ] Implement background indexing.

### AI Intelligence
- [ ] Implement code chunking.
- [ ] Integrate embedding models.
- [ ] Build semantic retrieval.
- [ ] Implement RAG pipeline.
- [ ] Build source-grounded AI chat.
- [ ] Add file and line citations.

### Engineering Assistant
- [ ] Generate feature implementation plans.
- [ ] Identify affected files.
- [ ] Generate patch proposals.
- [ ] Build patch review interface.
- [ ] Add automated evaluation.

### Production Readiness
- [ ] Implement comprehensive tests.
- [ ] Add observability and logging.
- [ ] Improve failure recovery.
- [ ] Implement security hardening.
- [ ] Deploy application.

---

## Project Documentation

| Document | Description |
|---|---|
| [PRD.md](docs/PRD.md) | Product requirements and scope |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and data flows |
| [DATABASE.md](docs/DATABASE.md) | Database schema and relationships |
| [API.md](docs/API.md) | REST API specifications |
| [SECURITY.md](docs/SECURITY.md) | Security architecture and threat model |

---

## Contributing

Contributions, suggestions, and technical feedback are welcome.

Before submitting a pull request:

1. Understand the existing architecture.
2. Keep changes focused.
3. Follow established coding conventions.
4. Add tests for new functionality.
5. Update documentation when necessary.
6. Never commit credentials or private repository data.

---

## License

No license has been selected yet.

Until a LICENSE file is added, all rights remain reserved by the copyright holder. Do not assume the project is open-source or available for redistribution.

---

**Built with curiosity, engineering, and AI.**

**RepoMind — Understand before you change.**