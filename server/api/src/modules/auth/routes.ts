import { Router } from 'express';

import type { AppConfig } from '../../config/env.js';
import { requireAuthentication, requireCsrf } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../shared/http.js';
import { AuthController } from './controller.js';
import { AuthService } from './service.js';

export function createAuthRouter(authService: AuthService, config: AppConfig): Router {
  const controller = new AuthController(authService, config);
  const router = Router();
  const authenticated = requireAuthentication(authService, config);
  const csrf = requireCsrf(authService, config);

  router.post('/register', asyncHandler(controller.register));
  router.post('/login', asyncHandler(controller.login));
  router.post('/logout', authenticated, csrf, asyncHandler(controller.logout));
  router.get('/me', authenticated, asyncHandler(controller.me));
  router.get('/csrf', authenticated, asyncHandler(controller.csrf));
  return router;
}
