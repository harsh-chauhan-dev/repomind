# RepoMind --- Security Design and Threat Model

**Version:** 1.0\
**Status:** Required security baseline for MVP\
**Scope:** Application, GitHub integration, repository ingestion, AI
retrieval, and proposed code changes

## 1. Security objectives

RepoMind processes potentially confidential source code. Its core
security objectives are: - Prevent unauthorized access to repositories
and source-derived data. - Minimize permissions granted to GitHub
integration. - Prevent credentials and private code from leaking through
logs, prompts, or responses. - Treat repository content and model
outputs as untrusted. - Prevent untrusted repository code from executing
in application infrastructure. - Preserve provenance for answers and
proposals. - Provide a clear disconnection and deletion lifecycle.

This document is an engineering baseline, not a claim of security
certification or a substitute for a formal review.

## 2. Assets and trust boundaries

### Assets

-   User identities and sessions.
-   GitHub access tokens and authorization metadata.
-   Private source code, chunks, embeddings, summaries, and cached
    contexts.
-   Conversations, source citations, and change proposals.
-   LLM API keys and internal service credentials.
-   Database records, queue messages, logs, and backups.

### Trust boundaries

-   Browser to public API.
-   Public API to GitHub.
-   Public API to internal FastAPI service.
-   Worker to GitHub, queue, database, and model provider.
-   Application to external LLM provider.
-   Retrieved repository content to model instructions.
-   Database and queue data to background workers.

## 3. Threats and required mitigations

### GitHub credential compromise

**Threat:** stolen tokens allow unauthorized repository access.

Mitigations: - Request only the permissions required for read-only
repository analysis. - Consider a GitHub App for fine-grained
permissions where appropriate. - Validate OAuth `state`, exact callback
URLs, and authorization responses. - Encrypt stored credentials using
authenticated encryption; keep keys outside the database. - Prefer
managed secret storage when practical. - Redact tokens from logs,
traces, error reports, and model prompts. - Support disconnection and
credential deletion; re-check authorization before private source
fetches. - Rotate application secrets and credentials after suspected
compromise.

### Broken object-level authorization

**Threat:** a user changes a repository, job, file, conversation, chunk,
or proposal ID to access another user's data.

Mitigations: - Enforce authorization on every repository-scoped
operation. - Scope queries by authenticated user and repository access,
not merely by UUID. - Validate that all related IDs belong to the same
repository and revision. - Add adversarial tests for cross-user
access. - Consider PostgreSQL Row-Level Security as defense in depth. -
Avoid returning different error details where that would reveal the
existence of private resources.

### Prompt injection in source content

**Threat:** a README, comment, or source file instructs the model to
reveal secrets or misuse tools.

Mitigations: - Treat all repository content, commit messages, issues,
and retrieved chunks as untrusted data. - Separate system instructions
from retrieved context and label context explicitly. - Never allow
retrieved content to grant permissions or change system policy. - Keep
model tools minimal and read-only in the MVP. - Do not include secrets
in model context. - Validate structured model outputs and all source
references. - Test with repositories containing malicious instructions.

### Server-side request forgery and unsafe repository fetches

**Threat:** user-supplied URLs cause the server to access internal
endpoints or unintended hosts.

Mitigations: - Accept a GitHub repository ID selected from the
authorized GitHub API response, not arbitrary clone URLs. - Use official
GitHub API endpoints or a strict host allowlist. - Validate redirects,
DNS/network destinations where relevant, and response size limits. -
Block access to private network ranges for any fetch functionality that
could follow arbitrary URLs. - Do not execute repository hooks or
scripts.

### Unsafe code execution

**Threat:** repository scripts or tests execute malware or exfiltrate
credentials.

MVP rule: **do not execute repository code**.

If sandboxed execution is added later: - Use disposable, isolated
environments. - Apply CPU, memory, disk, and time limits. - Do not mount
production secrets or the host Docker socket. - Restrict network egress
by default. - Use non-root users and least privilege. - Destroy the
environment after the task. - Record execution metadata and enforce
explicit user approval.

### Cross-revision and stale-data errors

**Threat:** an answer cites source from a different commit or an
outdated index.

Mitigations: - Pin every revision by full commit SHA. - Keep revision
data immutable. - Store revision identifiers on conversations and
proposals. - Validate that citations belong to the requested revision. -
Activate a new index only after successful completion. - Invalidate
cached answers and summaries when their revision or model configuration
changes.

### LLM provider data exposure

**Threat:** private source code is sent to an external model provider
with unsuitable retention or training policies.

Mitigations: - Send only the minimum context required. - Review provider
data handling, retention, training, and regional processing terms before
production. - Do not send tokens, credentials, or unrelated user data. -
Configure provider privacy controls where available. - Document that
external provider processing may occur. - Support a local or alternative
provider in the future if privacy requirements demand it.

### Malformed or malicious model output

**Threat:** model-generated patches or structured responses contain
invalid paths, unsafe changes, or fabricated test results.

Mitigations: - Validate output against strict schemas. - Validate patch
paths and reject traversal, absolute paths, and unexpected file
changes. - Check that the patch applies to the recorded base revision
before presenting it as applicable. - Never report tests as passed
unless a trusted runner produced the result. - Require human review. -
Never automatically write to GitHub in the MVP.

### Denial of service and cost abuse

**Threat:** large repositories or repeated questions exhaust worker
capacity, provider quotas, or budget.

Mitigations: - Limit repository size, file count, file size, chunk
count, request size, and context length. - Apply per-user and
per-repository quotas. - Use bounded concurrency, timeouts, retries, and
backpressure. - Cache safely by immutable revision and configuration. -
Monitor provider usage, queue depth, error rates, and cost. - Return
`429` for enforced rate limits.

## 4. Authentication and session requirements

-   Use a maintained authentication implementation.
-   Prefer secure, `HttpOnly`, `Secure`, appropriately configured
    `SameSite` cookies for browser sessions when cookie auth is
    selected.
-   Protect state-changing cookie-authenticated requests against CSRF.
-   Validate session expiration and logout invalidation.
-   Do not store session secrets in source control.
-   Enforce authorization separately from authentication.
-   Require reauthorization when a GitHub connection is revoked or no
    longer grants the necessary access.

## 5. Data protection

-   Require TLS for deployed service-to-service and database connections
    where supported.
-   Encrypt credentials at the application or secret-store layer.
-   Keep secrets out of client bundles, source control, and logs.
-   Restrict database access by service identity and network policy.
-   Define retention for conversations, source chunks, embeddings, logs,
    and backups.
-   Deletion must prevent in-flight jobs from recreating deleted
    content.
-   Document external provider retention and backup deletion
    limitations.
-   Avoid retaining full source files if metadata and chunks satisfy the
    product requirement.

## 6. Operational security

-   Validate environment configuration at startup.
-   Use separate credentials and projects for development, staging, and
    production.
-   Patch dependencies and scan them in CI.
-   Protect GitHub workflows and production deployment credentials.
-   Use structured logs with request and job IDs and redact sensitive
    fields.
-   Keep internal FastAPI endpoints off public ingress where possible.
-   Authenticate internal service calls.
-   Apply least privilege to worker and API database roles.
-   Maintain database backups and test restore procedures.
-   Document incident response and credential rotation steps.

## 7. Security testing checklist

### Authentication and authorization

-   [ ] Unauthenticated requests cannot read private data.
-   [ ] User A cannot access User B's repositories, jobs, conversations,
    files, chunks, or proposals.
-   [ ] Revoked GitHub access prevents subsequent private source
    fetches.
-   [ ] OAuth state and callback validation reject forged or replayed
    flows.
-   [ ] Cookie-based mutations are protected against CSRF.

### Input and retrieval

-   [ ] Arbitrary repository URLs are rejected.
-   [ ] Path traversal and invalid file paths are rejected.
-   [ ] Oversized files and requests are bounded.
-   [ ] Prompt-injection content cannot authorize tool actions.
-   [ ] Citations are validated against the pinned revision.
-   [ ] Malformed model outputs fail safely.

### Operations

-   [ ] Secrets are absent from browser bundles and logs.
-   [ ] Queue retries cannot activate partial indexes.
-   [ ] Deletion cannot be undone by a stale worker.
-   [ ] Rate limits and timeouts are tested.
-   [ ] Database backup restoration is documented and periodically
    tested.

## 8. Incident response baseline

If a credential or private-code leak is suspected: 1. Restrict or
disable the affected integration. 2. Revoke and rotate exposed
credentials. 3. Preserve relevant protected audit logs. 4. Identify
affected repositories, users, provider requests, and time range. 5.
Contain access and remove exposed cached data where possible. 6. Notify
affected parties according to applicable obligations. 7. Document root
cause, corrective actions, and follow-up tests.

## 9. Release gate

Do not release the MVP with unresolved critical authorization defects,
exposed secrets, arbitrary URL fetching, unsafe repository code
execution, or unvalidated cross-revision citations. Complete the
security checklist and review external model-provider data handling
before processing real private repositories.
