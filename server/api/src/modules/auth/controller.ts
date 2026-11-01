import type { Request, Response } from 'express';

import type { AppConfig } from '../../config/env.js';
import { AuthService } from './service.js';
import { loginSchema, registerSchema } from './validation.js';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfig,
  ) {}

  register = async (request: Request, response: Response): Promise<void> => {
    const input = registerSchema.parse(request.body);
    const session = await this.authService.register(input, this.metadata(request));
    this.setSessionCookies(response, session.sessionToken, session.csrfToken, session.expiresAt);
    response.setHeader('x-csrf-token', session.csrfToken);
    response.status(201).json({ user: session.user });
  };

  login = async (request: Request, response: Response): Promise<void> => {
    const input = loginSchema.parse(request.body);
    const session = await this.authService.login(input, this.metadata(request));
    this.setSessionCookies(response, session.sessionToken, session.csrfToken, session.expiresAt);
    response.setHeader('x-csrf-token', session.csrfToken);
    response.status(200).json({ user: session.user });
  };

  me = async (_request: Request, response: Response): Promise<void> => {
    response.json({ user: response.locals.authContext!.user });
  };

  csrf = async (_request: Request, response: Response): Promise<void> => {
    const context = response.locals.authContext!;
    const token = await this.authService.rotateCsrf(context);
    response.cookie(this.config.CSRF_COOKIE_NAME, token, this.csrfCookieOptions());
    response.setHeader('x-csrf-token', token);
    response.json({ csrfToken: token });
  };

  logout = async (_request: Request, response: Response): Promise<void> => {
    await this.authService.logout(response.locals.authContext!);
    response.clearCookie(this.config.SESSION_COOKIE_NAME, this.sessionCookieOptions());
    response.clearCookie(this.config.CSRF_COOKIE_NAME, this.csrfCookieOptions());
    response.status(204).send();
  };

  private metadata(request: Request) {
    return { userAgent: request.get('user-agent') ?? null, ipAddress: request.ip ?? null };
  }

  private setSessionCookies(
    response: Response,
    sessionToken: string,
    csrfToken: string,
    expiresAt: Date,
  ): void {
    response.cookie(this.config.SESSION_COOKIE_NAME, sessionToken, {
      ...this.sessionCookieOptions(),
      expires: expiresAt,
    });
    response.cookie(this.config.CSRF_COOKIE_NAME, csrfToken, this.csrfCookieOptions());
  }

  private sessionCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.NODE_ENV === 'production',
      path: '/api/v1',
    };
  }

  private csrfCookieOptions() {
    return {
      httpOnly: false,
      sameSite: 'lax' as const,
      secure: this.config.NODE_ENV === 'production',
      path: '/api/v1',
    };
  }
}
