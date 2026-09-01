import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyPassword } from './password.js';

describe('password verification', () => {
  it('accepts matching credentials', () =>
    expect(verifyPassword('hello', createHash('sha256').update('hello').digest('hex'))).toBe(true));
});
