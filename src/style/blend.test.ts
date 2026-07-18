import { describe, expect, it } from 'vitest';
import { styleFromSeed } from './blend';
import { DIALS } from './dials';
import { ANCHOR_PALETTES, ANCHOR_SCALES, anchorDials } from './anchors';

describe('styleFromSeed — named anchors', () => {
  it('returns each anchor exactly for seeds 1..5', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const idx = seed - 1;
      const style = styleFromSeed(seed);
      const expectedDials = anchorDials(idx as 0 | 1 | 2 | 3 | 4);
      for (const d of DIALS) {
        expect(style[d.name]).toBe(expectedDials[d.name]);
      }
      expect(style.palette).toEqual(ANCHOR_PALETTES[idx]);
      expect(style.scale).toEqual(ANCHOR_SCALES[idx]);
    }
  });
});

describe('styleFromSeed — determinism', () => {
  it('is deep-equal across two calls with the same non-anchor seed', () => {
    const a = styleFromSeed(987654321);
    const b = styleFromSeed(987654321);
    expect(a).toEqual(b);
  });
});

describe('styleFromSeed — guardrail ranges', () => {
  it('keeps every dial within its §2 range across 1000 random seeds', () => {
    for (let seed = 6; seed < 1006; seed++) {
      const style = styleFromSeed(seed);
      for (const d of DIALS) {
        const v = style[d.name];
        expect(v).toBeGreaterThanOrEqual(d.min);
        expect(v).toBeLessThanOrEqual(d.max);
      }
    }
  });
});
