import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { buildApp } from './app.js';

let app: Awaited<ReturnType<typeof buildApp>>;

beforeEach(async () => {
  app = await buildApp(':memory:');

  const db = (await import('./dependencies.js')).dependencies(':memory:').db;
  db.close();
});

afterEach(async () => app.close());

describe('api', () => {
  it('reports health', async () => {
    expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
  });

  it('rejects unauthenticated ticket reads', async () => {
    expect(
      (await app.inject({ url: '/tickets', headers: { 'x-workspace-id': 'w' } })).statusCode,
    ).toBe(401);
  });
});
