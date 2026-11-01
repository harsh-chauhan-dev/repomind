import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://repomind:repomind@localhost:5432/repomind';
const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await client.connect();
try {
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const migrationFiles = (await readdir(join(root, 'migrations'))).sort();
  for (const file of migrationFiles) {
    await client.query(await readFile(join(root, 'migrations', file), 'utf8'));
  }

  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'github_accounts', 'repositories', 'repository_revisions',
        'repository_files', 'document_chunks', 'conversations', 'messages', 'indexing_jobs',
        'patch_proposals')
  `);
  assert(tables.length === 10, `expected 10 core tables, found ${tables.length}`);

  const { rows: extension } = await client.query(
    "SELECT extname FROM pg_extension WHERE extname = 'vector'",
  );
  assert(extension.length === 1, 'pgvector extension is not installed');

  const { rows: vectorColumns } = await client.query(`
    SELECT udt_name FROM information_schema.columns
    WHERE table_name = 'document_chunks' AND column_name = 'embedding'
  `);
  assert(vectorColumns[0]?.udt_name === 'vector', 'document_chunks.embedding is not vector-backed');

  const { rows: indexes } = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE indexname IN ('document_chunks_embedding_hnsw_idx', 'indexing_jobs_one_active_per_revision', 'document_chunks_search_vector_idx')
  `);
  assert(indexes.length === 3, 'required retrieval/job indexes are missing');

  await client.query(`
    INSERT INTO users (id, email) VALUES ('10000000-0000-0000-0000-000000000001', 'integration@example.test');
    INSERT INTO github_accounts (user_id, github_user_id) VALUES ('10000000-0000-0000-0000-000000000001', 999001);
    INSERT INTO repositories (owner_user_id, github_account_id, github_repo_id, full_name, visibility)
      VALUES ('10000000-0000-0000-0000-000000000001', (SELECT id FROM github_accounts WHERE github_user_id = 999001), 999002, 'integration/repo', 'public');
    INSERT INTO repository_revisions (repository_id, commit_sha) VALUES ((SELECT id FROM repositories WHERE github_repo_id = 999002), repeat('a', 40));
  `);

  await client
    .query(
      `
    INSERT INTO repository_revisions (repository_id, commit_sha)
    VALUES ((SELECT id FROM repositories WHERE github_repo_id = 999002), repeat('a', 40))
  `,
    )
    .then(() => {
      throw new Error('duplicate repository revision was accepted');
    })
    .catch((error) => {
      if (!error.message.includes('duplicate')) throw error;
    });

  process.stdout.write('Database integration tests passed.\n');
} finally {
  await client.end();
}
