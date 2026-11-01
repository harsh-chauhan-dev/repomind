import type { Pool } from 'pg';

import type { AuthRepository, CreateUserInput, StoredSession, StoredUser } from './types.js';

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.user_record_id ?? row.id),
    email: String(row.email),
    displayName: row.display_name ? String(row.display_name) : null,
    passwordHash: row.password_hash ? String(row.password_hash) : null,
    createdAt: new Date(String(row.created_at)),
  };
}

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const result = await this.pool.query(
      'SELECT id, email, display_name, password_hash, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findUserById(userId: string): Promise<StoredUser | null> {
    const result = await this.pool.query(
      'SELECT id, email, display_name, password_hash, created_at FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<StoredUser> {
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, display_name, password_hash, created_at`,
      [input.email, input.passwordHash],
    );
    return mapUser(result.rows[0]);
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<{ id: string; expiresAt: Date }> {
    const result = await this.pool.query(
      `INSERT INTO sessions (user_id, token_hash, csrf_token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::inet)
       RETURNING id, expires_at`,
      [
        input.userId,
        input.tokenHash,
        input.csrfTokenHash,
        input.expiresAt,
        input.userAgent,
        input.ipAddress,
      ],
    );
    return {
      id: String(result.rows[0].id),
      expiresAt: new Date(String(result.rows[0].expires_at)),
    };
  }

  async findActiveSession(tokenHash: string): Promise<StoredSession | null> {
    const result = await this.pool.query(
      `SELECT s.id, s.user_id, s.token_hash, s.csrf_token_hash, s.expires_at, s.revoked_at,
              u.id AS user_record_id, u.email, u.display_name, u.password_hash, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
       LIMIT 1`,
      [tokenHash],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: String(row.id),
      userId: String(row.user_id),
      tokenHash: String(row.token_hash),
      csrfTokenHash: String(row.csrf_token_hash),
      expiresAt: new Date(String(row.expires_at)),
      revokedAt: row.revoked_at ? new Date(String(row.revoked_at)) : null,
      user: mapUser(row),
    };
  }

  async updateSessionCsrf(sessionId: string, csrfTokenHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE sessions SET csrf_token_hash = $2, last_seen_at = now() WHERE id = $1',
      [sessionId, csrfTokenHash],
    );
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.pool.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [sessionId]);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.pool.query(
      'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
      [sessionId],
    );
  }
}
