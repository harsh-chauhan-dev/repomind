# RepoMind --- Database Design

**Version:** 1.0\
**Database:** PostgreSQL with pgvector\
**Status:** Logical schema baseline for implementation

## 1. Design principles

-   Use UUID primary keys for internal records.
-   Use stable GitHub numeric repository and user IDs for external
    identity.
-   Pin indexed content, conversations, citations, and proposals to
    commit revisions.
-   Keep revision content immutable after indexing.
-   Enforce relationships and uniqueness with database constraints.
-   Check tenant authorization in application services and consider
    PostgreSQL Row-Level Security as defense in depth.
-   Store encrypted credentials only when necessary; keep encryption
    keys outside the database.
-   Use migrations as the source of truth.

## 2. Extensions and common conventions

Enable `pgcrypto` if UUID generation or cryptographic helpers are
needed, and enable `vector` for pgvector. Use `timestamptz` for
timestamps and UTC at application boundaries. Use `text` plus `CHECK`
constraints or database enums for statuses; text plus checks can be
easier to evolve through migrations.

Vector dimensions are model-specific. Replace `VECTOR(N)` with the
actual embedding dimension selected during implementation.

## 3. Tables

### users

-   `id uuid primary key`
-   `email text not null unique`
-   `display_name text null`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

If an external identity provider manages authentication, store its
stable subject identifier in a dedicated unique column or identity
table. Avoid storing passwords unless the application deliberately owns
password authentication.

### github_connections

-   `id uuid primary key`
-   `user_id uuid not null references users(id)`
-   `github_user_id bigint not null`
-   `encrypted_token bytea null`
-   `token_key_version text null`
-   `granted_scopes text[] not null default '{}'`
-   `connected_at timestamptz not null default now()`
-   `revoked_at timestamptz null`
-   `unique(user_id, github_user_id)`

Use authenticated encryption and keep key material outside PostgreSQL.
Consider a managed secret store. Never return token material from public
endpoints or log it.

### repositories

-   `id uuid primary key`
-   `owner_user_id uuid not null references users(id)`
-   `connection_id uuid null references github_connections(id)`
-   `github_repo_id bigint not null`
-   `full_name text not null`
-   `visibility text not null check (visibility in ('public','private'))`
-   `default_branch text null`
-   `active_revision_id uuid null`
-   `status text not null check (status in ('connected','indexing','ready','error','disconnected','deleting'))`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`
-   `deleted_at timestamptz null`
-   `unique(owner_user_id, github_repo_id)`

The `active_revision_id` foreign key can be added after
`repository_revisions` is created. For MVP, each user owns their own
repository connection record, even if another user connects the same
public repository.

### repository_revisions

-   `id uuid primary key`
-   `repository_id uuid not null references repositories(id) on delete cascade`
-   `commit_sha text not null`
-   `status text not null check (status in ('queued','indexing','ready','failed','retired'))`
-   `manifest_hash text null`
-   `indexed_at timestamptz null`
-   `created_at timestamptz not null default now()`
-   `unique(repository_id, commit_sha)`

After creating this table, add
`repositories.active_revision_id references repository_revisions(id)`
and ensure application logic verifies the referenced revision belongs to
the same repository.

### indexing_jobs

-   `id uuid primary key`
-   `revision_id uuid not null references repository_revisions(id) on delete cascade`
-   `status text not null check (status in ('queued','running','succeeded','retrying','failed','cancelled'))`
-   `attempt_count integer not null default 0 check (attempt_count >= 0)`
-   `lease_expires_at timestamptz null`
-   `error_code text null`
-   `started_at timestamptz null`
-   `completed_at timestamptz null`
-   `created_at timestamptz not null default now()`

Add a partial unique index to prevent more than one active job per
revision, for example where status is in `queued`, `running`, or
`retrying`. The exact index predicate must match the chosen job state
machine.

### repository_files

-   `id uuid primary key`
-   `revision_id uuid not null references repository_revisions(id) on delete cascade`
-   `path text not null`
-   `language text null`
-   `content_hash text not null`
-   `size_bytes bigint not null check (size_bytes >= 0)`
-   `index_status text not null check (index_status in ('indexed','skipped','failed'))`
-   `created_at timestamptz not null default now()`
-   `unique(revision_id, path)`

Store source text only if required by the product and retention policy.
Otherwise fetch content through an authorized revision-aware cache.
Normalize paths and reject path traversal.

### code_chunks

-   `id uuid primary key`
-   `file_id uuid not null references repository_files(id) on delete cascade`
-   `chunk_index integer not null check (chunk_index >= 0)`
-   `symbol_name text null`
-   `start_line integer not null check (start_line > 0)`
-   `end_line integer not null check (end_line >= start_line)`
-   `content text not null`
-   `content_hash text not null`
-   `embedding vector(N) null`
-   `embedding_model text null`
-   `created_at timestamptz not null default now()`
-   `unique(file_id, chunk_index)`

Use an index compatible with the selected vector dimension and distance
metric. Add a full-text index over searchable content and metadata as
appropriate. Embeddings from incompatible models or dimensions must not
share the same vector index.

### conversations

-   `id uuid primary key`
-   `user_id uuid not null references users(id) on delete cascade`
-   `repository_id uuid not null references repositories(id) on delete cascade`
-   `revision_id uuid not null references repository_revisions(id)`
-   `title text null`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

Validate that the repository and revision match and that the user is
authorized. A composite foreign key or application validation plus
appropriate constraints can enforce revision consistency.

### messages

-   `id uuid primary key`
-   `conversation_id uuid not null references conversations(id) on delete cascade`
-   `role text not null check (role in ('user','assistant','system'))`
-   `content text not null`
-   `model text null`
-   `status text not null check (status in ('complete','failed','in_progress'))`
-   `created_at timestamptz not null default now()`

Do not expose internal system prompts to users. Persist only the
conversation data needed by the product, with a defined retention
policy.

### message_sources

-   `id uuid primary key`
-   `message_id uuid not null references messages(id) on delete cascade`
-   `chunk_id uuid not null references code_chunks(id) on delete cascade`
-   `start_line integer not null check (start_line > 0)`
-   `end_line integer not null check (end_line >= start_line)`
-   `relevance_score real null`
-   `unique(message_id, chunk_id, start_line, end_line)`

Validate that each cited chunk belongs to the revision pinned to the
conversation and that cited lines are within the source file's valid
range.

### change_proposals

-   `id uuid primary key`
-   `user_id uuid not null references users(id) on delete cascade`
-   `repository_id uuid not null references repositories(id) on delete cascade`
-   `base_revision_id uuid not null references repository_revisions(id)`
-   `request_text text not null`
-   `plan_json jsonb not null`
-   `patch_text text null`
-   `status text not null check (status in ('draft','pending_review','accepted','rejected','cancelled'))`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

Validate that the base revision belongs to the repository. `accepted`
means accepted as a proposal in RepoMind, not applied to GitHub.

## 4. Recommended indexes

Create indexes for: - `repositories(owner_user_id, status)` -
`repositories(github_repo_id)` -
`repository_revisions(repository_id, commit_sha)` (also unique) -
`indexing_jobs(status, created_at)` -
`repository_files(revision_id, path)` (also unique) -
`code_chunks(file_id, chunk_index)` (also unique) -
`conversations(user_id, updated_at desc)` -
`messages(conversation_id, created_at)` -
`change_proposals(user_id, updated_at desc)` - vector and full-text
retrieval on `code_chunks`, based on measured query patterns.

Index foreign-key columns used in joins and deletion operations where
PostgreSQL does not already have a supporting index.

## 5. Revision activation strategy

1.  Resolve the full commit SHA.
2.  Create or reuse the revision record.
3.  Enqueue an idempotent job.
4.  Write files and chunks under that revision.
5.  Validate index completeness and embedding configuration.
6.  Mark the revision ready.
7.  Update `repositories.active_revision_id` in a transaction.
8.  Retain or delete older revisions according to retention policy.

Never overwrite the active revision's content in place.

## 6. Deletion and retention

Repository deletion should mark the repository as deleting, prevent new
work, cancel or invalidate queued jobs, remove source-derived data,
clear cached contexts, and delete related conversations/proposals
according to policy. Ensure a running worker cannot recreate deleted
records after deletion begins. Document the lifecycle of backups and
data sent to external model providers.

## 7. Migration strategy

-   Use versioned, reviewed migrations.
-   Test migrations against an empty database and a representative
    existing database.
-   Use transactional migrations when supported.
-   For large indexes, consider non-blocking index creation where the
    migration tooling permits it.
-   Add constraints in stages if existing data requires backfilling.
-   Keep rollback or forward-fix instructions for each production
    migration.

## 8. Schema review checklist

-   [ ] Every repository-scoped read verifies ownership and access.
-   [ ] Revision-to-repository consistency is enforced.
-   [ ] Source citations cannot cross revisions.
-   [ ] Active jobs cannot duplicate unnecessarily.
-   [ ] Embedding model and dimension are explicit.
-   [ ] Credentials are encrypted and excluded from logs.
-   [ ] Deletion handles in-flight jobs and cached context.
-   [ ] Query plans are measured with representative data before adding
    specialized indexes.
