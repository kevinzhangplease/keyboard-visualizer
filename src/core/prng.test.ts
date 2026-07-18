import { describe, expect, it } from 'vitest';
import { rngFromSeed } from './prng';

describe('rngFromSeed', () => {
  it('produces identical streams from two constructions of the same seed', () => {
    const a = rngFromSeed(123);
    const b = rngFromSeed(123);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces floats in [0, 1)', () => {
    const r = rngFromSeed(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
