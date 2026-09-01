import type { Db } from '../client.js';

export class CommentRepository {
  constructor(private db: Db) {}

  list(ticketId: string) {
    return this.db
      .prepare(
        `SELECT
           c.id,
           c.body,
           c.is_public AS isPublic,
           c.created_at AS createdAt,
           u.id AS authorId,
           u.name AS authorName
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.ticket_id = ?
         ORDER BY c.created_at`,
      )
      .all(ticketId) as any[];
  }

  add(v: any) {
    this.db
      .prepare(
        `INSERT INTO comments(id, ticket_id, author_id, body, is_public, created_at)
         VALUES(@id, @ticketId, @authorId, @body, @isPublic, @createdAt)`,
      )
      .run(v);

    return this.db.prepare('SELECT * FROM comments WHERE id=?').get(v.id) as any;
  }
}
