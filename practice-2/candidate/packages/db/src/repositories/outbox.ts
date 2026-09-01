import type { Db } from '../client.js';

export class OutboxRepository {
  constructor(private db: Db) {}

  enqueue(v: any) {
    this.db
      .prepare(
        `INSERT INTO outbox(id, workspace_id, ticket_id, kind, payload, created_at)
         VALUES(@id, @workspaceId, @ticketId, @kind, @payload, @createdAt)`,
      )
      .run(v);
  }

  pending(limit = 50) {
    return this.db
      .prepare(`SELECT * FROM outbox WHERE state='pending' ORDER BY created_at LIMIT ?`)
      .all(limit) as any[];
  }

  markDone(id: string) {
    this.db
      .prepare(`UPDATE outbox SET state='processed',processed_at=? WHERE id=?`)
      .run(new Date().toISOString(), id);
  }

  markFailed(id: string) {
    this.db.prepare('UPDATE outbox SET attempts=attempts+1 WHERE id=?').run(id);
  }
}
