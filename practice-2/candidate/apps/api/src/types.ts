import type { AccessScope } from '@relaydesk/auth';

declare module 'fastify' {
  interface FastifyRequest {
    scope?: AccessScope;
  }
}
