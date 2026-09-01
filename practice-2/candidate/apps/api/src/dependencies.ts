import {
  createDb,
  CommentRepository,
  OutboxRepository,
  SessionRepository,
  TicketRepository,
  UserRepository,
  type Db,
} from '@relaydesk/db';
import { Authenticator } from '@relaydesk/auth';
import { TicketService } from '@relaydesk/services';

export type Dependencies = {
  db: Db;
  users: UserRepository;
  sessions: SessionRepository;
  auth: Authenticator;
  tickets: TicketService;
};

export function dependencies(path?: string): Dependencies {
  const db = createDb(path);

  const users = new UserRepository(db);
  const sessions = new SessionRepository(db);

  return {
    db,
    users,
    sessions,
    auth: new Authenticator(sessions, users),
    tickets: new TicketService(
      new TicketRepository(db),
      new CommentRepository(db),
      new OutboxRepository(db),
      users,
    ),
  };
}
