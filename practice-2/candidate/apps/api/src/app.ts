import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { withRequest, logger } from '@relaydesk/observability';
import { dependencies } from './dependencies.js';
import { authRoutes } from './routes/auth.js';
import { ticketRoutes } from './routes/tickets.js';
import { NotFoundError, ForbiddenError } from '@relaydesk/services';

export async function buildApp(path?: string) {
  const app = Fastify({ logger: false });
  const d = dependencies(path);

  await app.register(cors, { origin: true });

  app.addHook('onRequest', (req, _reply, done) => {
    return withRequest(
      { requestId: (req.headers['x-request-id'] as string) || randomUUID() },
      done,
    );
  });

  app.addHook('onResponse', async (req, reply) => {
    logger.info(
      { method: req.method, path: req.url, statusCode: reply.statusCode },
      'request complete',
    );
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(
    async (a) => {
      return authRoutes(a, d);
    },
    { prefix: '/auth' },
  );

  await app.register(
    async (a) => {
      return ticketRoutes(a, d);
    },
    { prefix: '/tickets' },
  );

  app.setErrorHandler((error, _req, reply) => {
    logger.error({ err: error }, 'request failed');

    if (error instanceof NotFoundError) {
      return reply.code(404).send({ message: error.message });
    }

    if (error instanceof ForbiddenError) {
      return reply.code(403).send({ message: error.message });
    }

    const e = error as Error & { statusCode?: number };

    return reply.code(e.statusCode ?? 400).send({ message: e.message });
  });

  app.addHook('onClose', () => d.db.close());

  return app;
}
