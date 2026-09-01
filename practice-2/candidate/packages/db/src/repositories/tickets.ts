import type { Db } from '../client.js';

export type TicketFilters = { status?: string; query?: string; limit: number; offset: number };

export class TicketRepository {
  constructor(private db: Db) {}

  create(input: any) {
    this.db
      .prepare(
        `INSERT INTO tickets(
           id, workspace_id, subject, body, requester_email,
           status, priority, assignee_id, created_at, updated_at
         )
         VALUES(
           @id, @workspaceId, @subject, @body, @requesterEmail,
           'open', @priority, NULL, @now, @now
         )`,
      )
      .run(input);

    return this.byId(input.id);
  }

  byId(id: string) {
    return this.db.prepare('SELECT * FROM tickets WHERE id=?').get(id) as any;
  }

  list(workspaceId: string, f: TicketFilters) {
    let rows = this.db
      .prepare(
        `SELECT t.*, u.name AS assignee_name
         FROM tickets t
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.workspace_id = ?
           AND (? IS NULL OR t.status = ?)
         ORDER BY t.updated_at DESC`,
      )
      .all(workspaceId, f.status ?? null, f.status ?? null) as any[];

    if (f.query) {
      const q = f.query.toLowerCase();

      rows = rows.filter(
        (r) =>
          r.subject.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q) ||
          r.requester_email.toLowerCase().includes(q),
      );
    }

    return rows.slice(f.offset, f.offset + f.limit);
  }

  update(id: string, fields: any) {
    const current = this.byId(id);

    if (!current) {
      return undefined;
    }

    const next = {
      status: fields.status ?? current.status,
      priority: fields.priority ?? current.priority,
      assigneeId: fields.assigneeId === undefined ? current.assignee_id : fields.assigneeId,
      id,
      now: new Date().toISOString(),
    };

    this.db
      .prepare(
        'UPDATE tickets SET status=@status,priority=@priority,assignee_id=@assigneeId,updated_at=@now WHERE id=@id',
      )
      .run(next);

    return this.byId(id);
  }

  commentCount(id: string) {
    return (this.db.prepare('SELECT count(*) count FROM comments WHERE ticket_id=?').get(id) as any)
      .count as number;
  }
}
