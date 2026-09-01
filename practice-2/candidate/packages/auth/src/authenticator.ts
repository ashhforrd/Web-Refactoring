import { SessionRepository, UserRepository } from '@relaydesk/db';
import type { SessionUser } from '@relaydesk/shared';

export class Authenticator {
  constructor(
    private sessions: SessionRepository,
    private users: UserRepository,
  ) {}

  authenticate(header?: string): SessionUser | null {
    if (!header?.startsWith('Bearer ')) {
      return null;
    }

    const session = this.sessions.find(header.slice(7));

    if (!session || new Date(session.expiresAt) <= new Date()) {
      return null;
    }

    return this.users.findById(session.userId) ?? null;
  }
}
