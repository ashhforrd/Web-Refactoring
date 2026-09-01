import type { FastifyInstance } from 'fastify';
import { addCommentSchema, createTicketSchema, updateTicketSchema } from '@relaydesk/shared';
import { authHook } from '../auth-hook.js';
import type { ReturnTypeDependencies } from '../util-types.js';

export async function ticketRoutes(app: FastifyInstance, d: ReturnTypeDependencies) {
  app.addHook('preHandler', authHook(d));

  app.get('/', async (req) => {
    const q = req.query as any;

    return {
      items: d.tickets.list(req.scope!.workspaceId, {
        status: q.status,
        query: q.q,
        limit: Math.min(Number(q.limit) || 50, 100),
        offset: Number(q.offset) || 0,
      }),
    };
  });

  app.get('/:id', async (req) => {
    return d.tickets.get(req.scope!.workspaceId, (req.params as any).id);
  });

  app.post('/', async (req, reply) => {
    return reply
      .code(201)
      .send(d.tickets.create(req.scope!.workspaceId, createTicketSchema.parse(req.body)));
  });

  app.patch('/:id', async (req) => {
    return d.tickets.update(
      req.scope!.workspaceId,
      (req.params as any).id,
      updateTicketSchema.parse(req.body),
    );
  });

  app.post('/:id/comments', async (req, reply) => {
    return reply
      .code(201)
      .send(
        d.tickets.addComment(
          req.scope!.workspaceId,
          (req.params as any).id,
          req.scope!.user.id,
          addCommentSchema.parse(req.body),
        ),
      );
  });
}
