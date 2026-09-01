import type { Db } from '../client.js';

export class UserRepository {
  constructor(private db: Db) {}

  findByEmail(email: string) {
    return this.db.prepare('SELECT * FROM users WHERE email=?').get(email) as any;
  }

  findById(id: string) {
    return this.db.prepare('SELECT id,email,name FROM users WHERE id=?').get(id) as any;
  }

  memberships(userId: string) {
    return this.db
      .prepare(
        'SELECT w.id,w.name,w.slug,m.role FROM memberships m JOIN workspaces w ON w.id=m.workspace_id WHERE m.user_id=?',
      )
      .all(userId) as any[];
  }

  isMember(userId: string, workspaceId: string) {
    return !!this.db
      .prepare('SELECT 1 FROM memberships WHERE user_id=? AND workspace_id=?')
      .get(userId, workspaceId);
  }
}
