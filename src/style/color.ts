// OKLCH <-> linear sRGB, hand-written (no `culori` dependency).
// OKLab<->LMS'<->linear-sRGB matrices are Björn Ottosson's published constants:
// https://bottosson.github.io/posts/oklab/ (public domain / CC0-equivalent, "do whatever you want").

import * as THREE from 'three';
import { clamp, lerp } from '../core/math';
import type { Oklch } from './types';

export interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

interface Lab {
  L: number;
  a: number;
  b: number;
}

function oklchToOklab({ l, c, h }: Oklch): Lab {
  const hr = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
}

// OKLab -> linear sRGB, unclamped (may fall outside [0,1] for out-of-gamut colors).
function oklabToLinearSrgbRaw(lab: Lab): LinearRgb {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

function inGamut(rgb: LinearRgb): boolean {
  return (
    rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1
  );
}

function clampRgb(rgb: LinearRgb): LinearRgb {
  return { r: clamp(rgb.r, 0, 1), g: clamp(rgb.g, 0, 1), b: clamp(rgb.b, 0, 1) };
}

// Convert OKLCH to linear sRGB. Out-of-gamut colors are pulled in by chroma reduction
// (binary search, 8 iterations) keeping L and H fixed, per spec §4.4.
export function oklchToLinearSrgb(oklch: Oklch): LinearRgb {
  const raw = oklabToLinearSrgbRaw(oklchToOklab(oklch));
  if (inGamut(raw)) return raw;

  let lo = 0;
  let hi = oklch.c;
  let best: LinearRgb = clampRgb(raw);
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const candidate = oklabToLinearSrgbRaw(oklchToOklab({ l: oklch.l, c: mid, h: oklch.h }));
    if (inGamut(candidate)) {
      lo = mid;
      best = candidate;
    } else {
      hi = mid;
    }
  }
  return clampRgb(best);
}

export function toThreeColor(oklch: Oklch): THREE.Color {
  const { r, g, b } = oklchToLinearSrgb(oklch);
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

// Lerp two OKLCH colors along the shortest hue arc.
export function lerpOklch(a: Oklch, b: Oklch, t: number): Oklch {
  const l = lerp(a.l, b.l, t);
  const c = lerp(a.c, b.c, t);
  let dh = b.h - a.h;
  dh = ((dh + 180) % 360 + 360) % 360 - 180;
  let h = a.h + dh * t;
  h = ((h % 360) + 360) % 360;
  return { l, c, h };
}
