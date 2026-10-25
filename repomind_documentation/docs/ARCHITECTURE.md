# RepoMind --- System Architecture

**Version:** 1.0\
**Status:** Approved architecture baseline

## 1. Goals

RepoMind must provide secure repository ingestion, revision-aware code
exploration, source-grounded AI answers, and human-reviewed change
proposals. It must support public and private GitHub repositories
without permitting cross-user data access.

## 2. Architecture decisions

-   Frontend: React, TypeScript, Vite, and Tailwind CSS.
-   Public application API: Node.js, Express, and TypeScript.
-   AI and code-analysis service: Python and FastAPI.
-   Persistence: PostgreSQL with pgvector.
-   Indexing: asynchronous worker and durable queue.
-   AI provider strategy: one initial provider behind
    provider-independent adapters.
-   Change workflow: proposed plans and patches only; no automatic
    GitHub writes.
-   Repository execution: no repository code execution in the MVP.
-   Deployment: separate web, API, AI service, worker, database, and
    queue processes as operationally appropriate.

## 3. High-level components

### Web client

Responsible for sign-in UI, GitHub connection flow, repository
dashboard, file tree, source viewer, chat, citations, indexing status,
and patch review. It must never receive database credentials, GitHub
client secrets, internal service tokens, or private LLM keys.

### Express application API

The system's public control plane. It owns application authentication,
authorization, repository ownership, GitHub integration, public REST
contracts, rate limits, conversation lifecycle, proposal state, and
user-facing error handling.

### GitHub integration module

Resolves repository IDs from the user's authorized repository list,
obtains metadata and content, handles rate limits and revocation, and
pins operations to a commit SHA. Do not accept arbitrary clone URLs from
the client.

### Indexing worker

Processes revision-specific jobs: fetch files, apply content filters,
parse supported languages, extract symbols, chunk content, generate
embeddings, persist records, and activate a completed revision. Jobs
must be idempotent and recoverable.

### PostgreSQL and pgvector

Stores users, GitHub connections, repositories, revisions, jobs, files,
chunks, embeddings, conversations, messages, citations, and change
proposals. PostgreSQL is the source of truth for application state.

### FastAPI AI service

Provides internal endpoints for repository summarization, retrieval,
question answering, and change proposal generation. It uses typed
input/output schemas, validates structured model responses, and exposes
provider-independent interfaces.

### Queue

Provides durable asynchronous job scheduling, retries, and backpressure.
A Node.js worker may use BullMQ with Redis. The exact queue technology
is an implementation decision; do not create a queue dependency without
implementing retry and recovery semantics.

### LLM provider adapter

Encapsulates provider-specific SDKs, model names, structured-output
support, timeouts, and usage accounting. Chat and embedding models are
configured separately. Store model identity and embedding configuration
with each index.

## 4. Request and data flows

### Repository connection and indexing

1.  User signs in and completes GitHub authorization.
2.  Express validates OAuth state and stores the connection securely.
3.  User selects a repository from the authorized list.
4.  API verifies the repository ID and access, resolves a full commit
    SHA, creates or reuses a revision, and enqueues an indexing job.
5.  Worker fetches and filters content, parses and chunks files,
    generates embeddings, and persists revision-scoped records.
6.  Only after successful completion does the API activate the new
    revision.
7.  UI reads job status and displays the repository when ready.

### Question answering

1.  API authenticates the user and authorizes the repository and
    conversation.
2.  API resolves the conversation's pinned revision.
3.  AI service retrieves relevant code using keyword, symbol, and vector
    search.
4.  Retrieved context is treated as untrusted data and supplied with
    clear boundaries.
5.  LLM generates an answer and structured source references.
6.  Service validates source IDs and line ranges against retrieved
    records.
7.  API persists the response and citations and returns them to the
    client.

### Change proposal

1.  User submits a feature request and base revision.
2.  System retrieves relevant code and tests.
3.  LLM produces a structured plan, affected-file list, patch, risks,
    and test recommendations.
4.  Patch paths, base revision, and response structure are validated.
5.  Proposal is persisted in a review state.
6.  User may accept, reject, or cancel the proposal in RepoMind.
    Acceptance does not apply the patch.

## 5. Architecture diagram

``` mermaid
flowchart TD
    UI[React + TypeScript] --> API[Express API]
    API --> DB[(PostgreSQL + pgvector)]
    API --> GH[GitHub API]
    API --> Q[Durable job queue]
    Q --> W[Indexing worker]
    W --> GH
    W --> DB
    API --> AI[FastAPI AI service]
    AI --> DB
    AI --> LLM[LLM provider adapter]
```

## 6. Data ownership and trust boundaries

-   Express is authoritative for application user authorization.
-   Every repository, job, conversation, source, and proposal request
    must be authorized server-side.
-   The AI service is private and authenticates internal callers. It
    must not trust arbitrary client-supplied user or repository
    identifiers.
-   The worker fetches only repository IDs and revisions that have been
    authorized by the application.
-   Repository source, README content, comments, commit messages, and
    retrieved chunks are untrusted input, not instructions.
-   No service should execute repository scripts or tests in the MVP.

## 7. Revision and indexing model

Each indexed revision is identified by `(repository_id, commit_sha)` and
treated as immutable. File records and code chunks belong to a revision
through their parent file. Conversations and proposals pin a revision.
When the default branch changes, index the new commit separately and
activate it only when complete. Never mix chunks from two revisions in
one answer.

Indexing jobs must have explicit states, bounded retries, leases or
equivalent stale-worker recovery, sanitized failure codes, and
idempotent writes. A partial index must not become active.

## 8. Retrieval strategy

Start with hybrid retrieval: - PostgreSQL full-text or keyword search
for identifiers, file paths, and exact terms. - pgvector semantic
retrieval for conceptual questions. - Symbol and path metadata for
filtering and ranking. - Deduplication and context budgeting before
model calls.

Use a parser such as Tree-sitter where practical. Chunk along functions,
classes, or other meaningful boundaries when supported, and preserve
file paths and line ranges. Start with a small set of languages and
expand based on measured demand.

## 9. Reliability and observability

-   Structured logs with request and job IDs.
-   Metrics for indexing duration, queue depth, job failures, retrieval
    quality, model latency, token usage, and API errors.
-   Timeouts and bounded retries for GitHub and model calls.
-   Idempotency for job submission and persistence.
-   Database migrations tested on clean databases.
-   Health and readiness endpoints that do not disclose secrets.
-   Alerts for sustained job failures, provider errors, and unusual
    usage.

## 10. Deployment topology

For the MVP, deploy the frontend, Express API, FastAPI service, worker,
PostgreSQL, and queue as separate processes or managed services. Keep
the AI service and database off public ingress where possible. Use TLS,
secret management, restricted network access, database backups, and
environment separation.

## 11. Deliberately deferred complexity

Do not start with Kubernetes, a service mesh, a separate vector
database, multi-agent orchestration, autonomous code execution, or
automatic GitHub writes. Add these only when a demonstrated requirement
justifies the operational cost.
