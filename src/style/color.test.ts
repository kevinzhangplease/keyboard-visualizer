import { describe, expect, it } from 'vitest';
import { lerpOklch, oklchToLinearSrgb } from './color';

describe('oklchToLinearSrgb', () => {
  it('round-trips white, black and mid grey sanely', () => {
    const white = oklchToLinearSrgb({ l: 1, c: 0, h: 0 });
    expect(white.r).toBeCloseTo(1, 3);
    expect(white.g).toBeCloseTo(1, 3);
    expect(white.b).toBeCloseTo(1, 3);

    const black = oklchToLinearSrgb({ l: 0, c: 0, h: 0 });
    expect(black.r).toBeCloseTo(0, 3);
    expect(black.g).toBeCloseTo(0, 3);
    expect(black.b).toBeCloseTo(0, 3);

    const grey = oklchToLinearSrgb({ l: 0.5, c: 0, h: 0 });
    expect(grey.r).toBeCloseTo(grey.g, 6);
    expect(grey.g).toBeCloseTo(grey.b, 6);
    expect(grey.r).toBeGreaterThan(0);
    expect(grey.r).toBeLessThan(1);
  });

  it('never returns NaN and stays in [0,1] under gamut clamping', () => {
    for (let h = 0; h < 360; h += 15) {
      for (const c of [0.1, 0.2, 0.3, 0.4, 0.5]) {
        for (const l of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          const rgb = oklchToLinearSrgb({ l, c, h });
          expect(Number.isNaN(rgb.r)).toBe(false);
          expect(Number.isNaN(rgb.g)).toBe(false);
          expect(Number.isNaN(rgb.b)).toBe(false);
          expect(rgb.r).toBeGreaterThanOrEqual(0);
          expect(rgb.r).toBeLessThanOrEqual(1);
          expect(rgb.g).toBeGreaterThanOrEqual(0);
          expect(rgb.g).toBeLessThanOrEqual(1);
          expect(rgb.b).toBeGreaterThanOrEqual(0);
          expect(rgb.b).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('lerpOklch', () => {
  it('takes the shortest hue arc (350 -> 10 passes through 0, not 180)', () => {
    const mid = lerpOklch({ l: 0.5, c: 0.1, h: 350 }, { l: 0.5, c: 0.1, h: 10 }, 0.5);
    // Should land near 0/360, not near 180.
    const distFromZero = Math.min(mid.h, 360 - mid.h);
    expect(distFromZero).toBeLessThan(5);
  });
});
