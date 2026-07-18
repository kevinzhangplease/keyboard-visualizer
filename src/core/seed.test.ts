import { describe, expect, it } from 'vitest';
import { decodeSeed, encodeSeed } from './seed';

describe('seed encoding', () => {
  it('round-trips through decode(encode(...))', () => {
    expect(encodeSeed(decodeSeed('zz'))).toBe('zz');
  });

  it('round-trips a variety of values', () => {
    for (const s of ['1', 'a1b2c3', '1z8kq3', 'zzzzzz']) {
      expect(encodeSeed(decodeSeed(s))).toBe(s);
    }
  });

  it('falls back to seed 1 on parse failure', () => {
    expect(decodeSeed('!!!not-base36')).toBe(1);
  });
});
