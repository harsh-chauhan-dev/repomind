BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL CHECK (length(btrim(email)) > 3),
    display_name text,
    auth_provider text,
    auth_subject text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_auth_identity_unique UNIQUE (auth_provider, auth_subject),
    CONSTRAINT users_auth_identity_pair_check CHECK (
        (auth_provider IS NULL AND auth_subject IS NULL)
        OR (auth_provider IS NOT NULL AND auth_subject IS NOT NULL)
    )
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE github_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_user_id bigint NOT NULL CHECK (github_user_id > 0),
    login text,
    encrypted_access_token bytea,
    token_key_version text,
    granted_scopes text[] NOT NULL DEFAULT '{}'::text[],
    connected_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT github_accounts_user_github_unique UNIQUE (user_id, github_user_id),
    CONSTRAINT github_accounts_github_user_unique UNIQUE (github_user_id),
    CONSTRAINT github_accounts_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= connected_at),
    CONSTRAINT github_accounts_id_user_unique UNIQUE (id, user_id)
);

CREATE INDEX github_accounts_user_id_idx ON github_accounts (user_id);

CREATE TABLE repositories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_account_id uuid,
    github_repo_id bigint NOT NULL CHECK (github_repo_id > 0),
    full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
    visibility text NOT NULL CHECK (visibility IN ('public', 'private')),
    default_branch text,
    active_revision_id uuid,
    status text NOT NULL DEFAULT 'connected'
        CHECK (status IN ('connected', 'indexing', 'ready', 'error', 'disconnected', 'deleting')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT repositories_owner_github_unique UNIQUE (owner_user_id, github_repo_id),
    CONSTRAINT repositories_id_owner_unique UNIQUE (id, owner_user_id),
    CONSTRAINT repositories_github_account_owner_fk
        FOREIGN KEY (github_account_id, owner_user_id)
        REFERENCES github_accounts (id, user_id),
    CONSTRAINT repositories_deletion_status_check CHECK (
        (deleted_at IS NULL AND status <> 'deleting')
        OR (deleted_at IS NOT NULL AND status = 'deleting')
    )
);

CREATE INDEX repositories_owner_status_idx ON repositories (owner_user_id, status);
CREATE INDEX repositories_github_repo_id_idx ON repositories (github_repo_id);

CREATE TABLE repository_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha text NOT NULL CHECK (commit_sha ~ '^[0-9a-fA-F]{40}$'),
    status text NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'indexing', 'ready', 'failed', 'retired')),
    manifest_hash text,
    indexed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_revisions_repository_sha_unique UNIQUE (repository_id, commit_sha),
    CONSTRAINT repository_revisions_id_repository_unique UNIQUE (id, repository_id),
    CONSTRAINT repository_revisions_indexed_status_check CHECK (
        (status = 'ready' AND indexed_at IS NOT NULL)
        OR (status <> 'ready')
    )
);

ALTER TABLE repositories
    ADD CONSTRAINT repositories_active_revision_fk
    FOREIGN KEY (active_revision_id, id)
    REFERENCES repository_revisions (id, repository_id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX repository_revisions_repository_status_idx
    ON repository_revisions (repository_id, status, created_at DESC);

CREATE TABLE indexing_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id uuid NOT NULL REFERENCES repository_revisions(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'succeeded', 'retrying', 'failed', 'cancelled')),
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    lease_expires_at timestamptz,
    error_code text,
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT indexing_jobs_completion_check CHECK (
        (status IN ('succeeded', 'failed', 'cancelled') AND completed_at IS NOT NULL)
        OR (status IN ('queued', 'running', 'retrying') AND completed_at IS NULL)
    )
);

CREATE UNIQUE INDEX indexing_jobs_one_active_per_revision
    ON indexing_jobs (revision_id)
    WHERE status IN ('queued', 'running', 'retrying');
CREATE INDEX indexing_jobs_status_created_idx ON indexing_jobs (status, created_at);
CREATE INDEX indexing_jobs_revision_id_idx ON indexing_jobs (revision_id);

CREATE TABLE repository_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id uuid NOT NULL REFERENCES repository_revisions(id) ON DELETE CASCADE,
    path text NOT NULL,
    language text,
    content_hash text NOT NULL CHECK (length(content_hash) > 0),
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    index_status text NOT NULL DEFAULT 'indexed'
        CHECK (index_status IN ('indexed', 'skipped', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_files_revision_path_unique UNIQUE (revision_id, path),
    CONSTRAINT repository_files_id_revision_unique UNIQUE (id, revision_id),
    CONSTRAINT repository_files_path_check CHECK (
        length(btrim(path)) > 0 AND left(path, 1) <> '/' AND path !~ '(^|/)\.\.(/|$)'
    )
);

CREATE INDEX repository_files_revision_path_idx ON repository_files (revision_id, path);
CREATE INDEX repository_files_language_idx ON repository_files (revision_id, language);

CREATE TABLE document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id uuid NOT NULL REFERENCES repository_files(id) ON DELETE CASCADE,
    revision_id uuid NOT NULL,
    chunk_index integer NOT NULL CHECK (chunk_index >= 0),
    symbol_name text,
    start_line integer NOT NULL CHECK (start_line > 0),
    end_line integer NOT NULL CHECK (end_line >= start_line),
    content text NOT NULL CHECK (length(content) > 0),
    content_hash text NOT NULL CHECK (length(content_hash) > 0),
    embedding vector(1536),
    embedding_model text,
    created_at timestamptz NOT NULL DEFAULT now(),
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
    CONSTRAINT document_chunks_file_revision_fk
        FOREIGN KEY (file_id, revision_id)
        REFERENCES repository_files (id, revision_id)
        ON DELETE CASCADE,
    CONSTRAINT document_chunks_file_index_unique UNIQUE (file_id, chunk_index),
    CONSTRAINT document_chunks_id_revision_unique UNIQUE (id, revision_id),
    CONSTRAINT document_chunks_embedding_model_check CHECK (
        (embedding IS NULL AND embedding_model IS NULL)
        OR (embedding IS NOT NULL AND embedding_model IS NOT NULL)
    )
);

CREATE INDEX document_chunks_file_index_idx ON document_chunks (file_id, chunk_index);
CREATE INDEX document_chunks_revision_idx ON document_chunks (revision_id);
CREATE INDEX document_chunks_search_vector_idx ON document_chunks USING gin (search_vector);
CREATE INDEX document_chunks_embedding_hnsw_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;

CREATE TABLE conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    repository_id uuid NOT NULL,
    revision_id uuid NOT NULL,
    title text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conversations_owner_repository_fk
        FOREIGN KEY (repository_id, user_id)
        REFERENCES repositories (id, owner_user_id)
        ON DELETE CASCADE,
    CONSTRAINT conversations_revision_repository_fk
        FOREIGN KEY (revision_id, repository_id)
        REFERENCES repository_revisions (id, repository_id),
    CONSTRAINT conversations_id_revision_unique UNIQUE (id, revision_id)
);

CREATE INDEX conversations_user_updated_idx ON conversations (user_id, updated_at DESC);
CREATE INDEX conversations_repository_updated_idx ON conversations (repository_id, updated_at DESC);

CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL CHECK (length(content) > 0),
    model text,
    status text NOT NULL DEFAULT 'complete'
        CHECK (status IN ('complete', 'failed', 'in_progress')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_created_idx ON messages (conversation_id, created_at);

CREATE TABLE message_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_id uuid NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    start_line integer NOT NULL CHECK (start_line > 0),
    end_line integer NOT NULL CHECK (end_line >= start_line),
    relevance_score real CHECK (relevance_score IS NULL OR relevance_score >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT message_sources_unique UNIQUE (message_id, chunk_id, start_line, end_line)
);

CREATE INDEX message_sources_message_idx ON message_sources (message_id);
CREATE INDEX message_sources_chunk_idx ON message_sources (chunk_id);

CREATE TABLE patch_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    repository_id uuid NOT NULL,
    base_revision_id uuid NOT NULL,
    request_text text NOT NULL CHECK (length(btrim(request_text)) > 0),
    plan jsonb NOT NULL,
    patch_text text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'accepted', 'rejected', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT patch_proposals_owner_repository_fk
        FOREIGN KEY (repository_id, user_id)
        REFERENCES repositories (id, owner_user_id)
        ON DELETE CASCADE,
    CONSTRAINT patch_proposals_revision_repository_fk
        FOREIGN KEY (base_revision_id, repository_id)
        REFERENCES repository_revisions (id, repository_id)
);

CREATE INDEX patch_proposals_user_updated_idx ON patch_proposals (user_id, updated_at DESC);
CREATE INDEX patch_proposals_repository_status_idx ON patch_proposals (repository_id, status);

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER repositories_set_updated_at
    BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER conversations_set_updated_at
    BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER patch_proposals_set_updated_at
    BEFORE UPDATE ON patch_proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
