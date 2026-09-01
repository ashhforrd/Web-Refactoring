import type { FastifyInstance } from 'fastify';
import { verifyPassword } from '@relaydesk/auth';
import type { ReturnTypeDependencies } from '../util-types.js';

export async function authRoutes(app: FastifyInstance, d: ReturnTypeDependencies) {
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as any;

    const user = d.users.findByEmail(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = d.sessions.create(user.id);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
      workspaces: d.users.memberships(user.id),
    };
  });
}
