import { randomUUID } from 'node:crypto';
import type {
  CommentRepository,
  OutboxRepository,
  TicketRepository,
  UserRepository,
} from '@relaydesk/db';
import { ForbiddenError, NotFoundError } from './errors.js';
import { toListItem } from './ticket-mapper.js';

export class TicketService {
  constructor(
    private tickets: TicketRepository,
    private comments: CommentRepository,
    private outbox: OutboxRepository,
    private users: UserRepository,
  ) {}

  list(workspaceId: string, filters: any) {
    return this.tickets
      .list(workspaceId, filters)
      .map((row) => toListItem(row, this.tickets.commentCount(row.id)));
  }

  get(workspaceId: string, id: string) {
    const ticket = this.tickets.byId(id);

    if (!ticket || ticket.workspace_id !== workspaceId) {
      throw new NotFoundError('Ticket not found');
    }

    return { ...ticket, comments: this.comments.list(id) };
  }

  create(workspaceId: string, input: any) {
    return this.tickets.create({
      ...input,
      id: randomUUID(),
      workspaceId,
      now: new Date().toISOString(),
    });
  }

  update(workspaceId: string, id: string, input: any) {
    const current = this.get(workspaceId, id);

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== null &&
      !this.users.isMember(input.assigneeId, workspaceId)
    ) {
      throw new ForbiddenError('Assignee is not a workspace member');
    }

    if (input.status === 'closed' && current.status !== 'closed') {
      const updated = this.tickets.update(id, input);

      this.outbox.enqueue({
        id: randomUUID(),
        workspaceId,
        ticketId: id,
        kind: 'ticket.closed',
        payload: JSON.stringify({ to: current.requester_email, subject: current.subject }),
        createdAt: new Date().toISOString(),
      });

      return updated;
    }

    return this.tickets.update(id, input);
  }

  addComment(workspaceId: string, ticketId: string, authorId: string, input: any) {
    this.get(workspaceId, ticketId);

    return this.comments.add({
      id: randomUUID(),
      ticketId,
      authorId,
      body: input.body,
      isPublic: input.public ? 1 : 0,
      createdAt: new Date().toISOString(),
    });
  }
}
