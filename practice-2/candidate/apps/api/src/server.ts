import { buildApp } from './app.js';
import { loadConfig } from '@relaydesk/config';
import { logger } from '@relaydesk/observability';

const config = loadConfig();

const app = await buildApp(config.DATABASE_PATH);

await app.listen({ port: config.PORT, host: '0.0.0.0' });

logger.info({ port: config.PORT }, 'RelayDesk API listening');
