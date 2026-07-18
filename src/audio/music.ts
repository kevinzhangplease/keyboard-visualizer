// Key -> pitch mapping (spec §7.5). Deterministic and spatially musical: left->right ascends.

import { clamp } from '../core/math';
import type { KeyDef } from '../input/layout';
import type { Style } from '../style/types';

export function keyToMidi(def: KeyDef, style: Style): number {
  // Large keys override the spatial mapping entirely (spec §7.4).
  if (def.large) {
    return def.space ? style.pitchRoot - 12 : style.pitchRoot - 12 + 7;
  }

  const col = clamp(Math.round(def.x + 7.5 - def.width / 2), 0, 13);
  const row = def.z + 2; // 0 (back) .. 4 (front)
  const octave = row === 4 || row === 3 ? 0 : row === 2 || row === 1 ? 1 : 2;
  const degree = (col + row * 3) % style.scale.length;
  return style.pitchRoot + octave * 12 + style.scale[degree]!;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
