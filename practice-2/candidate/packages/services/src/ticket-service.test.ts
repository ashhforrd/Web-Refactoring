import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDb,
  CommentRepository,
  OutboxRepository,
  TicketRepository,
  UserRepository,
} from '@relaydesk/db';
import { TicketService } from './ticket-service.js';

let db: ReturnType<typeof createDb>;
let service: TicketService;

beforeEach(() => {
  db = createDb(':memory:');

  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('u', 'a@b.test', 'Alex', 'x');
  db.prepare('INSERT INTO workspaces VALUES(?,?,?)').run('w', 'Work', 'work');
  db.prepare('INSERT INTO memberships VALUES(?,?,?)').run('u', 'w', 'admin');

  service = new TicketService(
    new TicketRepository(db),
    new CommentRepository(db),
    new OutboxRepository(db),
    new UserRepository(db),
  );
});

afterEach(() => db.close());

describe('ticket service', () => {
  it('creates and retrieves a ticket', () => {
    const ticket = service.create('w', {
      subject: 'Delivery question',
      body: 'When will it arrive?',
      requesterEmail: 'r@e.test',
      priority: 'normal',
    });

    expect(service.get('w', ticket.id).subject).toBe('Delivery question');
  });

  it('queues a customer update when closed', () => {
    const ticket = service.create('w', {
      subject: 'Delivery question',
      body: 'Details',
      requesterEmail: 'r@e.test',
      priority: 'normal',
    });

    service.update('w', ticket.id, { status: 'closed' });

    expect((db.prepare('SELECT count(*) n FROM outbox').get() as any).n).toBe(1);
  });
});
