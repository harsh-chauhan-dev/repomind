import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { AuthService } from '../src/modules/auth/service.js';
import type { AuthRepository, StoredSession, StoredUser } from '../src/modules/auth/types.js';
import { logger } from '../src/shared/logger.js';

class InMemoryAuthRepository implements AuthRepository {
  users: StoredUser[] = [];
  sessions: StoredSession[] = [];

  async findUserByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(userId: string) {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  async createUser(input: { email: string; passwordHash: string }) {
    const user: StoredUser = {
      id: randomUUID(),
      email: input.email,
      displayName: null,
      passwordHash: input.passwordHash,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }) {
    const session = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      csrfTokenHash: input.csrfTokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      user: this.users.find((user) => user.id === input.userId)!,
    } satisfies StoredSession;
    this.sessions.push(session);
    return { id: session.id, expiresAt: session.expiresAt };
  }

  async findActiveSession(tokenHash: string) {
    return (
      this.sessions.find(
        (session) =>
          session.tokenHash === tokenHash && !session.revokedAt && session.expiresAt > new Date(),
      ) ?? null
    );
  }

  async updateSessionCsrf(sessionId: string, csrfTokenHash: string) {
    this.sessions.find((session) => session.id === sessionId)!.csrfTokenHash = csrfTokenHash;
  }

  async touchSession(sessionId: string) {
    assert.ok(this.sessions.some((session) => session.id === sessionId));
  }

  async revokeSession(sessionId: string) {
    this.sessions.find((session) => session.id === sessionId)!.revokedAt = new Date();
  }
}

function setup() {
  const repository = new InMemoryAuthRepository();
  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://test/test' });
  const authService = new AuthService(repository, config, logger);
  return { app: createApp({ config, authService, logger }), repository };
}

test('registers a user and establishes an opaque session with CSRF token', async () => {
  const { app } = setup();
  const response = await request(app).post('/api/v1/auth/register').send({
    email: 'developer@example.com',
    password: 'correct horse battery staple',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'developer@example.com');
  assert.equal(response.body.user.passwordHash, undefined);
  const responseCookies = response.headers['set-cookie'] as unknown as string[];
  assert.ok(responseCookies.some((cookie) => cookie.startsWith('repomind_session=')));
  assert.ok(response.headers['x-csrf-token']);
});

test('protects current user and logout with authentication and CSRF', async () => {
  const { app, repository } = setup();
  const registration = await request(app).post('/api/v1/auth/register').send({
    email: 'developer@example.com',
    password: 'correct horse battery staple',
  });
  const cookies = registration.headers['set-cookie'];
  const csrfToken = registration.headers['x-csrf-token'];

  const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookies);
  assert.equal(me.status, 200);

  const rejectedLogout = await request(app).post('/api/v1/auth/logout').set('Cookie', cookies);
  assert.equal(rejectedLogout.status, 403);

  const logout = await request(app)
    .post('/api/v1/auth/logout')
    .set('Cookie', cookies)
    .set('x-csrf-token', csrfToken);
  assert.equal(logout.status, 204);
  assert.equal(repository.sessions[0].revokedAt !== null, true);
});

test('rejects invalid input and invalid credentials without leaking account state', async () => {
  const { app } = setup();
  const invalidInput = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'bad', password: 'short' });
  assert.equal(invalidInput.status, 400);
  assert.equal(invalidInput.body.error.code, 'VALIDATION_ERROR');

  const invalidLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'missing@example.com',
    password: 'correct horse battery staple',
  });
  assert.equal(invalidLogin.status, 401);
  assert.equal(invalidLogin.body.error.code, 'INVALID_CREDENTIALS');
});

test('logs in an existing user with the correct password', async () => {
  const { app } = setup();
  await request(app).post('/api/v1/auth/register').send({
    email: 'login@example.com',
    password: 'correct horse battery staple',
  });

  const response = await request(app).post('/api/v1/auth/login').send({
    email: 'login@example.com',
    password: 'correct horse battery staple',
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, 'login@example.com');
});
