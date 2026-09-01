import { createHash, timingSafeEqual } from 'node:crypto';

export function verifyPassword(password: string, stored: string) {
  const candidate = createHash('sha256').update(password).digest();
  const expected = Buffer.from(stored, 'hex');

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
