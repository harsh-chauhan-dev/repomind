import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(root, 'migrations');
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://repomind:repomind@localhost:5432/repomind';

const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
      file,
    ]);
    if (rows.length > 0) continue;

    process.stdout.write(`Applying ${file}\n`);
    await client.query(await readFile(join(migrationsDirectory, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
  }
} finally {
  await client.end();
}
