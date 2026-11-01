export type PublicUser = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
};

export type StoredUser = PublicUser & { passwordHash: string | null };

export type StoredSession = {
  id: string;
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: StoredUser;
};

export type SessionContext = {
  sessionId: string;
  user: PublicUser;
  csrfTokenHash: string;
  expiresAt: Date;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(userId: string): Promise<StoredUser | null>;
  createUser(input: CreateUserInput): Promise<StoredUser>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<{ id: string; expiresAt: Date }>;
  findActiveSession(tokenHash: string): Promise<StoredSession | null>;
  updateSessionCsrf(sessionId: string, csrfTokenHash: string): Promise<void>;
  touchSession(sessionId: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
}
