import type { FastifyRequest } from 'fastify';
import { workspaceScope } from '@relaydesk/auth';
import { identify } from '@relaydesk/observability';
import type { ReturnTypeDependencies } from './util-types.js';

export function authHook(d: ReturnTypeDependencies) {
  return async (request: FastifyRequest) => {
    const user = d.auth.authenticate(request.headers.authorization);

    if (!user) {
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
    }

    identify(user.id);

    request.scope = workspaceScope(user, request.headers['x-workspace-id'] as string | undefined);
  };
}
