import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

type RequestData = { requestId: string; userId?: string };

const storage = new AsyncLocalStorage<RequestData>();

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  mixin() {
    return storage.getStore() ?? {};
  },
});

export function withRequest<T>(data: RequestData, fn: () => T): T {
  return storage.run(data, fn);
}

export function identify(userId: string) {
  const current = storage.getStore();

  if (current) {
    current.userId = userId;
  }
}
