import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = dirname(fileURLToPath(import.meta.url));
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://repomind:repomind@localhost:5432/repomind';
const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });

await client.connect();
try {
  await client.query(await readFile(join(root, 'seeds', '001_development.sql'), 'utf8'));
  process.stdout.write('Development seed applied.\n');
} finally {
  await client.end();
}
