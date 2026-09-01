import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../client.js';

const digest = (v: string) => createHash('sha256').update(v).digest('hex');

export class SessionRepository {
  constructor(private db: Db) {}

  create(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiry = new Date(now.getTime() + 86400000 * 7);

    this.db
      .prepare('INSERT INTO sessions VALUES(?,?,?,?)')
      .run(digest(token), userId, expiry.toISOString(), now.toISOString());

    return token;
  }

  find(token: string) {
    return this.db
      .prepare('SELECT user_id AS userId,expires_at AS expiresAt FROM sessions WHERE token_hash=?')
      .get(digest(token)) as any;
  }

  revoke(token: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
  }
}
