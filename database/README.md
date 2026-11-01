# RepoMind database

PostgreSQL with pgvector is the source of truth for RepoMind's relational
schema. Versioned migrations live in `migrations/`; development data lives in
`seeds/`; integration assertions live in `tests/`.

## Local workflow

1. Start PostgreSQL with pgvector:

   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d postgres
   ```

2. Install JavaScript dependencies and configure `DATABASE_URL` from
   `.env.example`.

3. Apply pending migrations:

   ```bash
   pnpm db:migrate
   ```

4. Load development data when needed:

   ```bash
   node database/seed.mjs
   ```

5. Run the integration test against the configured database:

   ```bash
   pnpm db:test
   ```

The migration runner records applied filenames in `schema_migrations` and is
safe to run repeatedly. Migrations are intentionally append-only; schema
changes must be introduced as new numbered SQL files.
