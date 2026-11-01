BEGIN;

INSERT INTO users (id, email, display_name, auth_provider, auth_subject)
VALUES ('00000000-0000-0000-0000-000000000001', 'developer@repomind.local', 'RepoMind Developer', 'development', 'developer-1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO github_accounts (id, user_id, github_user_id, login, granted_scopes)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 100000001, 'repomind-dev', ARRAY['read:user', 'repo'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO repositories (id, owner_user_id, github_account_id, github_repo_id, full_name, visibility, default_branch, status)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 200000001, 'repomind-dev/example-repository', 'private', 'main', 'ready')
ON CONFLICT (id) DO NOTHING;

INSERT INTO repository_revisions (id, repository_id, commit_sha, status, manifest_hash, indexed_at)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', '0123456789abcdef0123456789abcdef01234567', 'ready', 'development-manifest', now())
ON CONFLICT (id) DO NOTHING;

UPDATE repositories
SET active_revision_id = '00000000-0000-0000-0000-000000000004'
WHERE id = '00000000-0000-0000-0000-000000000003';

INSERT INTO repository_files (id, revision_id, path, language, content_hash, size_bytes, index_status)
VALUES ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'src/main.ts', 'typescript', 'development-file-hash', 120, 'indexed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_chunks (id, file_id, revision_id, chunk_index, symbol_name, start_line, end_line, content, content_hash, embedding, embedding_model)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000004',
  0,
  'main',
  1,
  8,
  'export function main(): string { return ''RepoMind''; }',
  'development-chunk-hash',
  array_fill(0::real, ARRAY[1536])::vector,
  'development-zero-vector'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversations (id, user_id, repository_id, revision_id, title)
VALUES ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Development conversation')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, role, content, status)
VALUES ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007', 'user', 'Where is the application entry point?', 'complete')
ON CONFLICT (id) DO NOTHING;

INSERT INTO message_sources (id, message_id, chunk_id, start_line, end_line, relevance_score)
VALUES ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000006', 1, 8, 1.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO patch_proposals (id, user_id, repository_id, base_revision_id, request_text, plan, patch_text, status)
VALUES (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  'Add a development greeting',
  '{"steps":["Update src/main.ts"]}'::jsonb,
  NULL,
  'draft'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
