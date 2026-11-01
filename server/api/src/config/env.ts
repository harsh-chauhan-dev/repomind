import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().default('postgresql://repomind:repomind@localhost:5432/repomind'),
  API_PORT: z.coerce.number().int().positive().default(5000),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),
  SESSION_COOKIE_NAME: z.string().min(1).default('repomind_session'),
  CSRF_COOKIE_NAME: z.string().min(1).default('repomind_csrf'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(source);
}
