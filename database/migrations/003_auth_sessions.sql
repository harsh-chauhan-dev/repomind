BEGIN;

ALTER TABLE users
    ADD COLUMN password_hash text;

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
    csrf_token_hash text NOT NULL CHECK (length(csrf_token_hash) = 64),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    user_agent text,
    ip_address inet,
    CONSTRAINT sessions_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT sessions_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_active_lookup_idx ON sessions (token_hash, expires_at)
    WHERE revoked_at IS NULL;
CREATE INDEX sessions_expiry_idx ON sessions (expires_at)
    WHERE revoked_at IS NULL;

COMMIT;
