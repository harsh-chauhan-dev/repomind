import { createHash, randomBytes } from 'node:crypto';

import type { AppConfig } from '../../config/env.js';
import { AppError, invalidCredentials, unauthorized } from '../../shared/errors.js';
import type { Logger } from '../../shared/logger.js';
import { hashPassword, verifyPassword } from './password.js';
import type { AuthRepository, PublicUser, SessionContext } from './types.js';
import { type LoginInput, type RegisterInput } from './validation.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function publicUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export type CreatedSession = {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  user: PublicUser;
};

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async register(
    input: RegisterInput,
    metadata: { userAgent: string | null; ipAddress: string | null },
  ): Promise<CreatedSession> {
    const existing = await this.repository.findUserByEmail(input.email);
    if (existing)
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists.',
      );

    let user;
    try {
      user = await this.repository.createUser({
        email: input.email,
        passwordHash: await hashPassword(input.password),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          409,
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists.',
        );
      }
      throw error;
    }
    this.logger.info('user_registered', { userId: user.id });
    return this.createSession(user, metadata);
  }

  async login(
    input: LoginInput,
    metadata: { userAgent: string | null; ipAddress: string | null },
  ): Promise<CreatedSession> {
    const user = await this.repository.findUserByEmail(input.email);
    const valid = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : false;
    if (!user || !valid) {
      this.logger.warn('authentication_failed', { reason: 'invalid_credentials' });
      throw invalidCredentials();
    }

    this.logger.info('user_logged_in', { userId: user.id });
    return this.createSession(user, metadata);
  }

  async authenticate(sessionToken: string | undefined): Promise<SessionContext> {
    if (!sessionToken) throw unauthorized();
    const session = await this.repository.findActiveSession(hashToken(sessionToken));
    if (!session) throw unauthorized();

    await this.repository.touchSession(session.id);
    return {
      sessionId: session.id,
      user: publicUser(session.user),
      csrfTokenHash: session.csrfTokenHash,
      expiresAt: session.expiresAt,
    };
  }

  async rotateCsrf(context: SessionContext): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.repository.updateSessionCsrf(context.sessionId, hashToken(token));
    context.csrfTokenHash = hashToken(token);
    return token;
  }

  async assertCsrf(context: SessionContext, token: string | undefined): Promise<void> {
    if (!token || hashToken(token) !== context.csrfTokenHash) {
      throw new AppError(403, 'CSRF_TOKEN_INVALID', 'The CSRF token is missing or invalid.');
    }
  }

  async logout(context: SessionContext): Promise<void> {
    await this.repository.revokeSession(context.sessionId);
    this.logger.info('user_logged_out', { userId: context.user.id });
  }

  private async createSession(
    user: { id: string; email: string; displayName: string | null; createdAt: Date },
    metadata: { userAgent: string | null; ipAddress: string | null },
  ): Promise<CreatedSession> {
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.SESSION_TTL_SECONDS * 1000);
    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashToken(sessionToken),
      csrfTokenHash: hashToken(csrfToken),
      expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });
    return { sessionToken, csrfToken, expiresAt, user: publicUser(user) };
  }
}
