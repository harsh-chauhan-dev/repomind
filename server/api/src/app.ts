import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';

import type { AppConfig } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './modules/auth/routes.js';
import type { AuthService } from './modules/auth/service.js';
import { AppError } from './shared/errors.js';
import type { Logger } from './shared/logger.js';
import { requestContext } from './middleware/request-context.js';

export type ApiDependencies = {
  config: AppConfig;
  authService: AuthService;
  logger: Logger;
};

export function createApp(dependencies: ApiDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext(dependencies.logger));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_request, response) => response.json({ service: 'api', status: 'ok' }));
  app.use('/api/v1/auth', createAuthRouter(dependencies.authService, dependencies.config));

  app.use((_request, _response, next) =>
    next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.')),
  );
  app.use(errorHandler(dependencies.logger));
  return app;
}
