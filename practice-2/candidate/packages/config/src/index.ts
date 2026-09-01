import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const localDatabase = fileURLToPath(new URL('../../../relaydesk.db', import.meta.url));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4100),
  DATABASE_PATH: z.string().default(localDatabase),
  SESSION_SECRET: z.string().default('local-development-secret'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return schema.parse(env);
}
