// The 5 named anchors: dial vectors (sourced from dials.ts), palettes (§3), and scales (§2 footnote).
// Anchor index order: 0 Mountains, 1 Ice, 2 Ocean, 3 Space, 4 Desert — matches NAMED_SEEDS - 1.

import { DIALS, type DialName } from './dials';
import type { AnchorIndex, Oklch, Palette } from './types';

export const ANCHOR_NAMES = ['Mountains', 'Ice', 'Ocean', 'Space', 'Desert'] as const;

function oklch(l: number, c: number, h: number): Oklch {
  return { l, c, h };
}

// S0 bgDeep, S1 bgMid, S2 keyBase, S3 accent, S4 glow, S5 highlight
export const ANCHOR_PALETTES: readonly Palette[] = [
  // Mountains — alpenglow at dusk
  [
    oklch(0.17, 0.03, 255),
    oklch(0.34, 0.05, 250),
    oklch(0.58, 0.035, 250),
    oklch(0.72, 0.13, 55),
    oklch(0.8, 0.1, 70),
    oklch(0.94, 0.015, 250),
  ],
  // Ice — aurora over frost
  [
    oklch(0.2, 0.05, 230),
    oklch(0.42, 0.07, 220),
    oklch(0.85, 0.04, 210),
    oklch(0.78, 0.13, 195),
    oklch(0.88, 0.11, 185),
    oklch(0.98, 0.01, 200),
  ],
  // Ocean — bioluminescent shallows
  [
    oklch(0.15, 0.06, 255),
    oklch(0.32, 0.09, 235),
    oklch(0.52, 0.1, 210),
    oklch(0.75, 0.13, 185),
    oklch(0.86, 0.19, 165),
    oklch(0.93, 0.05, 190),
  ],
  // Space — nebula drift
  [
    oklch(0.09, 0.03, 290),
    oklch(0.22, 0.07, 300),
    oklch(0.45, 0.06, 280),
    oklch(0.62, 0.2, 340),
    oklch(0.72, 0.15, 210),
    oklch(0.96, 0.02, 280),
  ],
  // Desert — heat over gold dunes
  [
    oklch(0.22, 0.05, 50),
    oklch(0.42, 0.08, 60),
    oklch(0.68, 0.09, 75),
    oklch(0.7, 0.15, 60),
    oklch(0.84, 0.13, 88),
    oklch(0.95, 0.04, 85),
  ],
];

export const ANCHOR_SCALES: readonly (readonly number[])[] = [
  [0, 2, 4, 7, 9], // Mountains — major pentatonic
  [0, 2, 4, 7, 9], // Ice — major pentatonic
  [0, 3, 5, 7, 10], // Ocean — minor pentatonic
  [0, 2, 3, 5, 7, 8, 10], // Space — aeolian
  [0, 1, 4, 5, 7, 8, 10], // Desert — phrygian dominant
];

export function anchorDials(index: AnchorIndex): Record<DialName, number> {
  const out = {} as Record<DialName, number>;
  for (const d of DIALS) {
    out[d.name] = d.anchors[index];
  }
  return out;
}
