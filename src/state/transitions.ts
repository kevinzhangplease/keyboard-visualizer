// morphTo(newSeed): animates the live Style toward a new seed's Style over 1.4s (spec §8.1).

import { clamp, easeInOutCubic } from '../core/math';
import { lerpStyle, styleFromSeed } from '../style/blend';
import { replaceSeedInURL } from '../core/seed';
import type { Style } from '../style/types';

const MORPH_DURATION = 1.4;

export interface MorphController {
  style: Style;
  seed: number;
  morphTo: (newSeed: number, clock: number) => void;
  /** Advances the morph; returns true on the exact frame it completes (geometry rebuild point). */
  update: (clock: number) => boolean;
}

export function createMorphController(initialSeed: number): MorphController {
  let source: Style = styleFromSeed(initialSeed);
  let target: Style = source;
  let morphStart = -Infinity;
  let settled = true;

  const controller: MorphController = {
    style: source,
    seed: initialSeed,
    morphTo(newSeed, clock) {
      // Retarget from the live value, even mid-morph — a morph is never hard-cut.
      source = controller.style;
      target = styleFromSeed(newSeed);
      morphStart = clock;
      settled = false;
      controller.seed = newSeed;
      replaceSeedInURL(newSeed);
    },
    update(clock) {
      if (settled) return false;
      const m = clamp((clock - morphStart) / MORPH_DURATION, 0, 1);
      controller.style = lerpStyle(source, target, easeInOutCubic(m));
      if (m >= 1) {
        settled = true;
        return true;
      }
      return false;
    },
  };

  return controller;
}
