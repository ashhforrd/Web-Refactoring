import { describe, expect, it } from 'vitest';
import { loadConfig } from './index.js';

describe('configuration', () => {
  it('provides local defaults', () => expect(loadConfig({ NODE_ENV: 'test' }).PORT).toBe(4100));
});
