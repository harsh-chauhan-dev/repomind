# RepoMind --- Product Requirements Document

**Version:** 1.0\
**Status:** Approved baseline for MVP planning\
**Product:** RepoMind\
**Last updated:** 2026-10-25

## 1. Product summary

RepoMind is an AI-powered codebase understanding and engineering
assistant. It helps developers understand unfamiliar GitHub
repositories, investigate how code works, and plan feature
implementations using evidence from the actual repository.

**Product principle:** AI explains, investigates, and proposes. Humans
review, choose, and approve.

RepoMind is not initially an autonomous coding agent. The MVP produces
grounded explanations and proposed patches; it does not execute
repository code or write changes to GitHub.

## 2. Problem statement

Developers joining an unfamiliar codebase often spend significant time
locating entry points, tracing dependencies, understanding module
boundaries, and learning how requests flow through a system. When they
need to change code, they may not understand the impact on related
modules or tests. Generic AI answers can be inaccurate, ungrounded, or
inconsistent with repository conventions.

RepoMind aims to reduce this discovery and planning overhead by
combining repository indexing, source-grounded question answering, and
human-reviewed change proposals.

These are product hypotheses to validate with developers; they are not
assumed to be proven market demand.

## 3. Target users

### Primary users

-   Junior and mid-level developers onboarding to an existing codebase.
-   Interns and engineers moving between projects or teams.
-   Developers who need to investigate unfamiliar modules before making
    changes.

### Secondary users

-   Senior engineers reviewing implementation approaches.
-   Technical interview candidates learning architecture and code
    navigation.
-   Engineering teams considering future shared codebase exploration.

## 4. Jobs to be done

1.  When I open an unfamiliar repository, help me understand its
    structure and important entry points.
2.  When I ask how a behavior works, show me an explanation backed by
    relevant files and line ranges.
3.  When I plan a feature, identify likely affected files, dependencies,
    risks, and tests.
4.  When I explore an optimization, distinguish measured bottlenecks
    from hypotheses.
5.  When the repository changes, ensure answers are tied to a known
    commit rather than stale or mixed source.

## 5. MVP scope

### Included

-   Application account registration, login, logout, and current-user
    retrieval.
-   GitHub authorization for public and private repositories, limited to
    permissions explicitly granted by the user.
-   Authorized repository selection and connection management.
-   Asynchronous indexing pinned to a commit SHA.
-   Repository file tree and source viewer.
-   Repository overview with languages, key files, and basic structural
    summaries.
-   Repository question answering with verifiable file and line
    references.
-   Persistent conversations scoped to a user, repository, and revision.
-   Structured feature implementation plans and proposed patches.
-   Human review states for proposals.
-   Re-indexing, job status, retries, and clear error states.
-   Data disconnection and deletion workflow.
-   Automated tests, security controls, and baseline operational
    logging.

### Excluded from the MVP

-   Automatic commits, pushes, pull requests, or direct repository
    writes.
-   Execution of repository scripts or tests in the application
    infrastructure.
-   Multi-user collaboration, shared workspaces, comments, and team
    approvals.
-   Organization SSO and enterprise administration.
-   Multi-repository reasoning.
-   Continuous autonomous code optimization.
-   Dedicated collaborative interview simulations.
-   Guaranteed detection of all vulnerabilities or performance problems.

## 6. Core user journey

1.  User creates an account and signs in.
2.  User authorizes GitHub access.
3.  User selects a repository they are authorized to access.
4.  RepoMind resolves the repository's current commit and queues an
    indexing job.
5.  The UI shows indexing progress and then the file tree and repository
    overview.
6.  User asks a question about the codebase.
7.  RepoMind retrieves relevant source context and returns an answer
    with verifiable citations.
8.  User requests a feature plan.
9.  RepoMind generates a structured plan and patch against a pinned
    revision.
10. User reviews, accepts, rejects, or cancels the proposal. Acceptance
    records the user's decision in RepoMind only; it does not apply
    code.

## 7. Functional requirements and acceptance criteria

### Authentication

-   Unauthenticated users cannot access private application data.
-   Session creation, expiration, logout, and CSRF protections are
    implemented according to the chosen authentication design.
-   The application never returns secrets to the browser.

### GitHub integration

-   The user can authorize and disconnect a GitHub identity.
-   Repository listing is based on the user's actual GitHub permissions.
-   Private repository content is not accessible after authorization is
    revoked.
-   The server resolves repository IDs against authorized repositories
    and does not fetch arbitrary user-supplied URLs.

### Indexing

-   Indexing is asynchronous and returns a job identifier.
-   Every indexed revision is identified by a full commit SHA.
-   Jobs are idempotent, retryable, and have explicit terminal failure
    states.
-   A revision becomes active only after its index is complete.
-   Generated files, binaries, oversized files, and secret-like content
    are filtered or handled by explicit policy.

### Codebase exploration

-   Users can browse a paginated file tree and supported source files.
-   The overview identifies its source revision.
-   File paths and citations are normalized and revision-specific.

### AI question answering

-   Repository-specific answers include source references where evidence
    exists.
-   Citations resolve to files and line ranges from the pinned revision.
-   The system can state that evidence is insufficient.
-   Provider failures and timeouts produce safe, actionable errors.
-   Retrieval quality and answer correctness are evaluated against a
    reviewed test set.

### Change proposals

-   A proposal contains a summary, plan, affected files, patch, risks,
    assumptions, and test recommendations.
-   The base revision is immutable and recorded.
-   No proposal is automatically applied or pushed to GitHub.
-   Suggested tests are distinguished from tests actually executed.

### Data lifecycle

-   Users can disconnect a repository and initiate deletion of stored
    source-derived content.
-   Deletion covers chunks, embeddings, cached context, associated jobs,
    and relevant conversation data according to the retention policy.
-   Backup and model-provider retention limitations are documented.

## 8. Non-functional requirements

-   **Security:** tenant isolation, least privilege, safe secret
    handling, prompt-injection defenses, and no untrusted code
    execution.
-   **Reliability:** retryable jobs, bounded retries, explicit states,
    and safe reprocessing.
-   **Traceability:** answers and proposals identify their source
    revision.
-   **Maintainability:** modular Express API, independently testable
    FastAPI service, versioned database migrations.
-   **Performance:** paginated repository browsing; indexing runs
    outside request-response cycles; model calls have timeouts and
    limits.
-   **Cost control:** file, repository, context, request, and token
    budgets are configurable.
-   **Accessibility:** keyboard-operable core flows, clear status text,
    and usable contrast.
-   **Portability:** provider-specific model calls are isolated behind
    adapters.

Initial performance targets should be established through a pilot rather
than assumed in advance.

## 9. Success metrics

-   Percentage of repository questions with citations that accurately
    support the answer.
-   Retrieval recall@k on a manually labeled evaluation set.
-   Answer correctness and abstention quality.
-   Time for a new user to connect a repository and obtain a useful
    answer.
-   Indexing success rate and recovery rate after transient failures.
-   Change-proposal applicability and review acceptance rate.
-   Median and tail latency, provider cost per successful task, and
    rate-limit frequency.
-   Number and severity of authorization or data-isolation defects found
    in testing.

## 10. Product risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Hallucinated explanations           Source-grounded retrieval, citation
                                      validation, abstention, evaluation

  Stale source references             Commit-pinned revisions and
                                      immutable index records

  Private code leakage                Least-privilege authorization,
                                      tenant checks, protected logs,
                                      provider policy review

  Malicious repository instructions   Treat repository text as untrusted
                                      data; constrain model tools

  Unsafe patches                      Human review, patch validation, no
                                      automatic writes

  Excessive cost                      Limits, caching, incremental
                                      indexing, quotas

  Poor adoption                       Validate with developers and
                                      prioritize common onboarding tasks
  -----------------------------------------------------------------------

## 11. Future direction

After the MVP is reliable, possible extensions include: - Shared
workspaces, comments, and collaborative codebase exploration. - Team
review and approval workflows. - Sandboxed test execution. - Authorized
branch or pull-request creation after explicit approval. - Architecture
diagrams and cross-repository dependency analysis. - Structured
interview practice based on real repositories.

## 12. Open implementation choices

The product decisions are fixed for the initial build: public and
private repositories, provider-independent AI design, and proposed
changes only. The implementation team must still select the exact
authentication library, GitHub OAuth/App model, LLM provider, embedding
model, queue implementation, hosting platform, and retention periods
before production launch.
