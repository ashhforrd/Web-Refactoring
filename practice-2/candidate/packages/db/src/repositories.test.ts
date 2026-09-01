import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDb, TicketRepository } from './index.js';

let db: ReturnType<typeof createDb>;

beforeEach(() => {
  db = createDb(':memory:');

  db.prepare('INSERT INTO workspaces VALUES(?,?,?)').run('w', 'Test', 'test');
});

afterEach(() => db.close());

describe('ticket repository', () => {
  it('stores and lists tickets', () => {
    const repo = new TicketRepository(db);

    repo.create({
      id: 't',
      workspaceId: 'w',
      subject: 'Printer offline',
      body: 'Third floor',
      requesterEmail: 'a@b.test',
      priority: 'normal',
      now: new Date().toISOString(),
    });

    expect(repo.list('w', { limit: 20, offset: 0 })[0].subject).toBe('Printer offline');
  });
});
