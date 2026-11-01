/* eslint-disable @typescript-eslint/no-namespace */
import type { RequestHandler } from 'express';

import type { AppConfig } from '../config/env.js';
import { AuthService } from '../modules/auth/service.js';
import { AppError } from '../shared/errors.js';
import { asyncHandler } from '../shared/http.js';

declare global {
  namespace Express {
    interface Locals {
      authContext?: Awaited<ReturnType<AuthService['authenticate']>>;
    }
  }
}

export function requireAuthentication(authService: AuthService, config: AppConfig): RequestHandler {
  return asyncHandler(async (request, response, next) => {
    response.locals.authContext = await authService.authenticate(
      request.cookies[config.SESSION_COOKIE_NAME],
    );
    next();
  });
}

export function requireCsrf(authService: AuthService, config: AppConfig): RequestHandler {
  return asyncHandler(async (request, response, next) => {
    const context = response.locals.authContext;
    if (!context) throw new Error('Authentication middleware must run before CSRF middleware.');
    const headerToken = request.header('x-csrf-token');
    const cookieToken = request.cookies[config.CSRF_COOKIE_NAME];
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      throw new AppError(403, 'CSRF_TOKEN_INVALID', 'The CSRF token is missing or invalid.');
    }
    await authService.assertCsrf(context, headerToken);
    next();
  });
}
