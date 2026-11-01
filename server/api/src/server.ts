import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createPool } from './database/pool.js';
import { PostgresAuthRepository } from './modules/auth/repository.js';
import { AuthService } from './modules/auth/service.js';
import { logger } from './shared/logger.js';

const config = loadConfig();
const pool = createPool(config);
const authRepository = new PostgresAuthRepository(pool);
const authService = new AuthService(authRepository, config, logger);
const app = createApp({ config, authService, logger });
const server = app.listen(config.API_PORT, () =>
  logger.info('api_server_started', { port: config.API_PORT }),
);

async function shutdown(signal: string): Promise<void> {
  logger.info('api_server_shutdown_started', { signal });
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
