# RepoMind

**Understand any codebase. Investigate with evidence. Plan changes with
confidence.**

RepoMind is an AI-powered codebase understanding and engineering
assistant that helps developers explore unfamiliar GitHub repositories,
ask questions grounded in source code, and prepare implementation plans
and patches for human review.

> **Product principle:** AI explains, investigates, and proposes. Humans
> review, choose, and approve.

RepoMind is currently in the planning / early implementation stage. The
architecture and documentation describe the intended MVP; not all
features are implemented yet.

## Contents

-   [Why RepoMind?](#why-repomind)
-   [MVP Features](#mvp-features)
-   [Planned Architecture](#planned-architecture)
-   [Technology Stack](#technology-stack)
-   [Repository Structure](#repository-structure)
-   [Getting Started](#getting-started)
-   [Environment Configuration](#environment-configuration)
-   [Development Workflow](#development-workflow)
-   [Security](#security)
-   [Roadmap](#roadmap)
-   [Project Documentation](#project-documentation)
-   [Contributing](#contributing)
-   [License](#license)

## Why RepoMind?

Understanding an unfamiliar codebase takes time. Developers need to
locate entry points, trace dependencies, learn how modules interact, and
estimate the impact of changes. Generic AI answers may be inaccurate or
disconnected from the actual repository.

RepoMind aims to make this work easier by combining repository indexing,
source-grounded Q&A, and human-reviewed change proposals.

### Who is it for?

-   Developers onboarding to an existing codebase.
-   Junior and mid-level engineers exploring unfamiliar systems.
-   Developers investigating bugs or planning features.
-   Engineers seeking evidence-backed code explanations and optimization
    ideas.
-   Later: teams collaborating on codebase exploration and interview
    practice.

## MVP Features

The intended MVP includes:

-   **GitHub integration:** connect authorized public and private
    repositories.
-   **Repository indexing:** process source files asynchronously against
    a pinned commit.
-   **Codebase explorer:** browse the file tree, source files, and
    repository overview.
-   **AI codebase Q&A:** ask questions and receive answers with
    verifiable file and line references.
-   **Feature planning:** identify likely affected files, trade-offs,
    risks, and tests.
-   **Patch proposals:** generate changes for review without applying
    them automatically.
-   **Revision awareness:** keep answers and proposals tied to a
    specific commit.
-   **Reliable processing:** indexing status, retries, failure
    reporting, and re-indexing.
-   **Security controls:** authorization checks, secret handling,
    prompt-injection defenses, and deletion workflows.

### Explicitly out of scope for the MVP

-   Automatic commits, pushes, or pull requests.
-   Running repository scripts or tests on application infrastructure.
-   Autonomous code changes without human review.
-   Team collaboration and shared workspaces.
-   Enterprise SSO and multi-repository reasoning.

These features may be considered after the core workflow is reliable.

## Planned Architecture

``` mermaid
flowchart TD
    UI[React + TypeScript frontend] --> API[Node.js + Express API]
    API --> DB[(PostgreSQL + pgvector)]
    API --> GH[GitHub API]
    API --> Q[Background job queue]
    Q --> W[Repository indexing worker]
    W --> GH
    W --> DB
    API --> AI[Python + FastAPI AI service]
    AI --> DB
    AI --> LLM[LLM provider adapter]
```

### Components

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  React + TypeScript                  Repository dashboard, file
                                      explorer, chat, citations, and
                                      patch review

  Node.js + Express                   Public API, authentication,
                                      authorization, GitHub integration,
                                      and application logic

  PostgreSQL + pgvector               Application data, revision
                                      metadata, code chunks, and vector
                                      retrieval

  Python + FastAPI                    Code analysis, retrieval, AI
                                      orchestration, structured output
                                      validation, and evaluation

  Indexing worker                     Fetch, filter, parse, chunk, embed,
                                      and index repository revisions

  Job queue                           Asynchronous processing, retries,
                                      and recovery

  GitHub API                          Authorized repository metadata and
                                      source access

  LLM adapter                         Provider-independent chat and
                                      embedding integration
  -----------------------------------------------------------------------

The application API is the public control plane. The browser must not
connect directly to the database, internal AI service, or private model
provider credentials.

## Technology Stack

  -----------------------------------------------------------------------
  Area                                Planned technology
  ----------------------------------- -----------------------------------
  Frontend                            React, TypeScript, Vite, Tailwind
                                      CSS

  Application API                     Node.js, Express, TypeScript

  AI service                          Python, FastAPI

  Database                            PostgreSQL, pgvector

  Background jobs                     Queue-backed worker; Redis/BullMQ
                                      is a candidate

  Source control                      Git and GitHub

  Validation                          Runtime schemas and typed contracts

  Testing                             Unit tests, API integration tests,
                                      AI evaluation, Playwright E2E

  Deployment                          Frontend and backend hosting
                                      selected during implementation
  -----------------------------------------------------------------------

Specific versions and providers will be pinned in the project
configuration as implementation begins.

## Repository Structure

The intended monorepo layout is:

``` text
repomind/
├── apps/
│   └── web/                    # React + TypeScript frontend
├── services/
│   ├── api/                    # Node.js + Express application API
│   └── ai/                     # Python + FastAPI AI service
├── workers/
│   └── indexer/                # Asynchronous repository indexing
├── packages/
│   ├── contracts/              # Shared request/response schemas
│   ├── config/                 # Shared development configuration
│   └── api-client/             # Typed frontend API client
├── db/
│   ├── migrations/
│   ├── seeds/
│   └── tests/
├── docs/
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── SECURITY.md
└── README.md
```

Directories may be introduced incrementally as their corresponding
implementation phases begin.

## Getting Started

### Current status

The project is currently at the documentation and architecture baseline.
The commands below describe the intended development setup; they will
become runnable once the corresponding package files, services, and
migrations are implemented.

### Prerequisites

Install the following tools:

-   Git
-   Node.js LTS and pnpm
-   Python version selected in the AI service configuration
-   PostgreSQL with pgvector support
-   Redis, if BullMQ is selected for the queue
-   GitHub OAuth/App credentials for integration testing
-   An API key for the selected LLM provider

### 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd repomind
```

Replace the placeholder with the actual repository URL.

### 2. Configure environment variables

Copy `.env.example` to the appropriate local environment files and
populate local development values.

Do not commit `.env` files or real credentials. The root example should
contain placeholders only.

### 3. Start infrastructure

Start PostgreSQL with pgvector enabled. If Redis/BullMQ is selected,
start Redis as well. Docker Compose may be added to simplify local
development.

### 4. Install dependencies

Once the workspace manifests are present, install JavaScript
dependencies using the repository's pinned package manager and install
Python dependencies using the AI service's documented workflow.

### 5. Apply database migrations

Run the versioned migrations after they are implemented. Confirm that a
clean database can be created from scratch.

### 6. Start services

The eventual local development workflow will run:

-   The React development server.
-   The Express API.
-   The FastAPI AI service.
-   The indexing worker.
-   PostgreSQL and the job queue.

Use the commands defined in the root scripts and each service's
documentation once they exist.

> **Note:** This README intentionally does not invent runnable scripts
> or claim the application is already implemented. Update this section
> as each phase is delivered.

## Environment Configuration

The final configuration will be documented in `.env.example`. Expected
configuration categories include:

  -----------------------------------------------------------------------
  Category                            Example variable names
  ----------------------------------- -----------------------------------
  Application                         `NODE_ENV`, `APP_URL`, `API_PORT`

  Database                            `DATABASE_URL`, `DATABASE_POOL_MAX`

  Authentication                      `SESSION_SECRET`, session cookie
                                      settings

  GitHub                              `GITHUB_CLIENT_ID`,
                                      `GITHUB_CLIENT_SECRET`, callback
                                      URL

  Internal AI service                 `AI_SERVICE_URL`,
                                      `AI_SERVICE_TOKEN`

  Queue                               `REDIS_URL`

  Model provider                      `LLM_PROVIDER`, `LLM_MODEL`,
                                      `LLM_API_KEY`

  Embeddings                          `EMBEDDING_PROVIDER`,
                                      `EMBEDDING_MODEL`,
                                      `EMBEDDING_DIMENSIONS`

  Observability                       `LOG_LEVEL`
  -----------------------------------------------------------------------

Only public configuration belongs in frontend variables. Never expose
GitHub client secrets, session secrets, database credentials, internal
service tokens, or private model API keys in browser code.

## Development Workflow

RepoMind is planned to be delivered in eight phases:

1.  **Foundation:** product documentation, monorepo, service skeletons,
    migrations, and CI.
2.  **Identity and GitHub:** authentication, authorization, repository
    selection, and connection lifecycle.
3.  **Indexing:** commit-pinned ingestion, parsing, chunking,
    embeddings, and recoverable jobs.
4.  **Explorer:** file tree, source viewer, and repository overview.
5.  **AI Q&A:** hybrid retrieval, verifiable citations, and answer
    evaluation.
6.  **Change proposals:** implementation plans, patch previews, and
    human review.
7.  **Hardening:** security tests, failure recovery, observability, and
    cost controls.
8.  **Deployment:** production hosting, monitoring, documentation, and
    developer feedback.

### Engineering principles

-   Plan and review before generating large code changes.
-   Keep changes small and testable.
-   Use versioned database migrations.
-   Pin source references to a commit SHA.
-   Treat repository content as untrusted input.
-   Validate model outputs and source citations.
-   Distinguish proposed tests from tests actually executed.
-   Never claim a test passed unless it was run and passed.
-   Require human review for all generated patches in the MVP.

## Security

RepoMind may process private source code, so security is a core
requirement.

-   Request the minimum GitHub permissions needed for repository
    analysis.
-   Enforce authorization on every repository, file, job, conversation,
    citation, and proposal request.
-   Encrypt stored credentials and keep encryption keys outside the
    database.
-   Keep secrets out of logs, browser bundles, and model prompts.
-   Treat repository files and retrieved chunks as untrusted data to
    defend against prompt injection.
-   Do not execute repository code in the MVP.
-   Pin answers and proposals to immutable revisions.
-   Apply request limits, timeouts, quotas, and bounded retries.
-   Define a deletion and retention policy for source-derived data and
    external provider processing.

See [SECURITY.md](SECURITY.md) for the security baseline and release
checklist.

## Roadmap

### Near term

-   Complete the development foundation.
-   Implement secure authentication and GitHub connection.
-   Build reliable commit-pinned indexing.
-   Deliver source-grounded codebase Q&A.
-   Add reviewed implementation plans and patch previews.

### Future possibilities

-   Shared workspaces and team collaboration.
-   Collaborative interview practice and structured technical sessions.
-   Sandboxed test execution.
-   Explicitly approved branch or pull-request creation.
-   Architecture graphs and cross-repository analysis.

Future items are exploratory and are not part of the MVP commitment.

## Project Documentation

-   [PRD.md](PRD.md) --- product goals, target users, scope, acceptance
    criteria, and metrics.
-   [ARCHITECTURE.md](ARCHITECTURE.md) --- system components, data
    flows, and deployment architecture.
-   [DATABASE.md](DATABASE.md) --- logical schema, relationships,
    indexes, and revision lifecycle.
-   [API.md](API.md) --- REST API contracts, errors, and authorization
    requirements.
-   [SECURITY.md](SECURITY.md) --- threat model, mitigations, and
    release checklist.

## Contributing

Contributions and design feedback are welcome as implementation begins.

Before submitting a pull request:

1.  Read the relevant architecture and security documentation.
2.  Keep changes focused and explain the motivation.
3.  Add or update tests for changed behavior.
4.  Run the checks available in the repository.
5.  Document configuration changes and database migrations.
6.  Never include credentials, private source code, or real user data in
    fixtures or logs.

For significant architecture changes, open an issue or design discussion
before implementing the change.

## License

No license has been selected yet. Until a license is added to the
repository, do not assume that the code is available for reuse,
redistribution, or commercial use. Add a `LICENSE` file before
publishing the project under an open-source license.
