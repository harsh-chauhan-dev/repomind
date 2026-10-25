# RepoMind --- API Contract

**Version:** 1.0\
**Base path:** `/api/v1`\
**Status:** Initial contract baseline

## 1. Conventions

-   Public API uses HTTPS in deployed environments and JSON
    request/response bodies.
-   Authentication uses a server-managed session or another explicitly
    selected secure mechanism.
-   All IDs are opaque UUIDs unless specified otherwise.
-   Repository-specific operations require server-side authorization.
-   Long-running operations return `202 Accepted` with a job or resource
    identifier.
-   Use pagination for potentially large lists.
-   Include a request ID in responses and logs.
-   Never return credentials, internal stack traces, raw provider
    errors, or secrets.

## 2. Standard error envelope

``` json
{
  "error": {
    "code": "REPOSITORY_ACCESS_DENIED",
    "message": "You do not have access to this repository.",
    "requestId": "request-uuid"
  }
}
```

Common status codes: - `400 Bad Request`: malformed request. -
`401 Unauthorized`: no valid authentication. - `403 Forbidden`:
authenticated but not authorized. - `404 Not Found`: missing resource or
deliberately concealed resource. - `409 Conflict`: state conflict, such
as indexing already in progress. - `422 Unprocessable Entity`:
semantically invalid input. - `429 Too Many Requests`: quota or rate
limit. - `500 Internal Server Error`: unexpected failure. - `502` or
`503`: upstream provider/service unavailable, when appropriate.

## 3. Authentication endpoints

### `POST /auth/register`

Creates an account if application-managed registration is enabled.

Request:

``` json
{
  "email": "developer@example.com",
  "password": "example-only-placeholder"
}
```

Response: `201 Created` with safe user profile fields only. If a trusted
identity provider is selected, use its supported registration flow
instead.

### `POST /auth/login`

Authenticates and establishes the selected session mechanism. Use secure
cookie settings if using cookie-based sessions.

### `POST /auth/logout`

Invalidates the current session and clears the browser cookie where
applicable.

### `GET /auth/me`

Returns the authenticated user's public profile.

## 4. GitHub endpoints

### `GET /github/connect`

Starts GitHub authorization. Validate OAuth `state`, use exact callback
URLs, and avoid arbitrary redirect targets.

### `GET /github/callback`

Completes the authorization flow, validates state and provider response,
and stores credentials securely.

### `GET /github/repositories`

Lists repositories the current user can access through the authorized
connection. Support pagination and provider rate limits.

### `DELETE /github/connections/{connectionId}`

Revokes or disconnects the application-side connection. Remove stored
credentials and mark dependent private repository access as unavailable.
Explain any provider-side revocation action that is or is not performed.

## 5. Repository endpoints

### `POST /repositories`

Registers a repository selected from the user's authorized repository
list.

Request:

``` json
{
  "githubRepositoryId": 123456789
}
```

The server resolves this ID against the authorized GitHub account. Do
not accept arbitrary clone URLs.

Response: `201 Created` with repository ID, name, visibility, and
current status.

### `GET /repositories`

Returns repositories owned or connected by the current user. Supports
cursor or page pagination.

### `GET /repositories/{repositoryId}`

Returns repository metadata, active revision, status, and indexing
state.

### `GET /repositories/{repositoryId}/tree`

Returns a paginated file tree for the active or explicitly selected
revision.

Query parameters may include `revisionId`, `path`, and `cursor`.

### `GET /repositories/{repositoryId}/files/{fileId}`

Returns file metadata and source content only if permitted and retained.
Ensure the file belongs to the requested repository and revision.

### `GET /repositories/{repositoryId}/overview`

Returns the repository overview and the revision it describes.

## 6. Indexing endpoints

### `POST /repositories/{repositoryId}/index`

Resolves the current authorized commit and queues indexing.

Response: `202 Accepted`

``` json
{
  "jobId": "job-uuid",
  "revisionId": "revision-uuid",
  "commitSha": "full-commit-sha",
  "status": "queued"
}
```

Support an idempotency key or deduplicate by repository and commit. Do
not keep the HTTP request open while indexing the repository.

### `GET /jobs/{jobId}`

Returns status, safe progress fields, and a sanitized error code if
failed.

Possible states include `queued`, `running`, `retrying`, `succeeded`,
`failed`, and `cancelled`.

## 7. Question-answering endpoints

### `POST /repositories/{repositoryId}/questions`

Asks a question about a specific repository revision.

Request:

``` json
{
  "question": "Where is authentication handled?",
  "conversationId": null,
  "revisionId": "revision-uuid"
}
```

Response for synchronous completion: `200 OK`. If processed
asynchronously, return `202 Accepted` and a request/job ID.

Example response:

``` json
{
  "messageId": "message-uuid",
  "answer": "Authentication is handled by the auth middleware...",
  "revision": {
    "revisionId": "revision-uuid",
    "commitSha": "full-commit-sha"
  },
  "sources": [
    {
      "path": "src/middleware/auth.ts",
      "startLine": 12,
      "endLine": 46,
      "reason": "Validates the incoming access token"
    }
  ],
  "limitations": []
}
```

The example is illustrative. The server must validate that each citation
points to a retrieved chunk in the requested revision. The model must
not be allowed to invent arbitrary citation IDs or paths.

### `POST /repositories/{repositoryId}/conversations`

Creates a conversation pinned to a repository revision.

### `GET /conversations/{conversationId}/messages`

Returns authorized conversation messages in chronological order, with
pagination if necessary.

## 8. Change-proposal endpoints

### `POST /repositories/{repositoryId}/change-proposals`

Generates a structured plan and proposed patch against a specific base
revision.

Request:

``` json
{
  "request": "Add rate limiting to the login endpoint",
  "baseRevisionId": "revision-uuid",
  "constraints": [
    "Preserve existing response formats",
    "Include tests",
    "Do not apply changes automatically"
  ]
}
```

Response: `202 Accepted` if generation is asynchronous, or `201 Created`
when a completed proposal is created synchronously.

A completed proposal includes: - Summary and implementation plan. -
Affected files and evidence. - Patch text or diff. - Test
recommendations. - Actual test results only if a trusted test runner ran
them. - Risks, assumptions, and unresolved questions. - Status and base
revision.

### `GET /change-proposals/{proposalId}`

Returns the proposal if the caller is authorized.

### `PATCH /change-proposals/{proposalId}`

Allows the owner to accept, reject, or cancel a proposal.

Request:

``` json
{
  "status": "rejected"
}
```

Only allowed state transitions are accepted. In the MVP, acceptance
records review state only. It must never trigger a GitHub write.

## 9. Authorization requirements

For every repository-scoped request: 1. Authenticate the caller. 2.
Resolve the application user. 3. Verify ownership or explicit access. 4.
Verify the GitHub connection is still valid when source access is
required. 5. Verify that revision, file, chunk, conversation, job, and
proposal identifiers belong to the authorized repository and user
context. 6. Apply request and model usage limits.

Use consistent authorization helpers and avoid trusting IDs supplied by
the browser.

## 10. Internal AI service contract

The FastAPI service is internal and not exposed as a public browser API.
Protect it with service authentication and network controls.

Conceptual endpoints may include: - `POST /internal/v1/index/analyze` -
`POST /internal/v1/answers` - `POST /internal/v1/change-proposals`

Only send the minimum required, authorized context. Validate request
schemas, cap payload sizes, and treat repository content as untrusted.
The service must return typed outputs and structured citations that the
API can validate.

## 11. API versioning and compatibility

-   Keep public routes under `/api/v1`.
-   Validate requests at runtime.
-   Publish an OpenAPI specification from the implementation.
-   Make additive response changes where possible.
-   Use explicit deprecation for breaking changes.
-   Test authorization failures and invalid state transitions as part of
    the contract test suite.
