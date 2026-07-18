// Shared style-domain types: OKLCH color, the 6-stop palette, and the Style record itself.

import type { DialName } from './dials';

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

// 6 fixed-role palette stops: S0 bgDeep, S1 bgMid, S2 keyBase, S3 accent, S4 glow, S5 highlight.
export type Palette = [Oklch, Oklch, Oklch, Oklch, Oklch, Oklch];

// The single source of truth for a rendered moment: every dial plus palette and scale.
export type Style = Record<DialName, number> & {
  palette: Palette;
  scale: readonly number[];
};

export type AnchorIndex = 0 | 1 | 2 | 3 | 4;
