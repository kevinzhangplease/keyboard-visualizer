// seed -> StyleParams -> composeStyle(). composeStyle is the ONLY constructor of Style.

import { rngFromSeed } from '../core/prng';
import { clamp, lerp } from '../core/math';
import { DIALS } from './dials';
import { ANCHOR_PALETTES, ANCHOR_SCALES } from './anchors';
import { lerpOklch } from './color';
import type { AnchorIndex, Palette, Style } from './types';

export interface StyleParams {
  primary: AnchorIndex;
  secondary: AnchorIndex;
  t: number;
  jitter: number[];
  hueJit: number;
  chromaJit: number;
  lightJit: number;
}

export function paramsFromSeed(seed: number): StyleParams {
  if (seed >= 1 && seed <= 5) {
    const idx = (seed - 1) as AnchorIndex;
    return {
      primary: idx,
      secondary: idx,
      t: 0,
      jitter: new Array(DIALS.length).fill(0) as number[],
      hueJit: 0,
      chromaJit: 0,
      lightJit: 0,
    };
  }

  const r = rngFromSeed(seed);
  const primary = Math.floor(r() * 5) as AnchorIndex;
  const secondary = ((primary + 1 + Math.floor(r() * 4)) % 5) as AnchorIndex;
  const t = r() * 0.65;
  const jitter = DIALS.map((d) => (r() * 2 - 1) * d.jitter);
  const hueJit = (r() * 2 - 1) * 16;
  const chromaJit = (r() * 2 - 1) * 0.02;
  const lightJit = (r() * 2 - 1) * 0.03;

  return { primary, secondary, t, jitter, hueJit, chromaJit, lightJit };
}

export function composeStyle(p: StyleParams): Style {
  const style = {} as Style;

  DIALS.forEach((d, i) => {
    const a = d.anchors[p.primary];
    const b = d.anchors[p.secondary];
    // t === 0 short-circuits to `a` exactly, so pinned-anchor seeds reproduce anchor
    // values bit-for-bit (avoids log2/pow round-trip error on logLerp dials).
    let v =
      p.t === 0 ? a : d.logLerp ? Math.pow(2, lerp(Math.log2(a), Math.log2(b), p.t)) : lerp(a, b, p.t);
    v += (p.jitter[i] ?? 0) * (d.max - d.min);
    v = clamp(v, d.min, d.max);
    if (d.roundInt) v = Math.round(v);
    style[d.name] = v;
  });

  const paletteA = ANCHOR_PALETTES[p.primary]!;
  const paletteB = ANCHOR_PALETTES[p.secondary]!;
  style.palette = paletteA.map((stopA, k) => {
    const stopB = paletteB[k]!;
    const blended = lerpOklch(stopA, stopB, p.t);
    return {
      l: clamp(blended.l + p.lightJit, 0.05, 0.98),
      c: Math.max(0, blended.c + p.chromaJit),
      h: ((blended.h + p.hueJit) % 360 + 360) % 360,
    };
  }) as Palette;

  style.scale = ANCHOR_SCALES[p.primary]!;

  return style;
}

export function styleFromSeed(seed: number): Style {
  return composeStyle(paramsFromSeed(seed));
}

// Live-morph interpolation between two already-composed styles (spec §8.1). Distinct from
// composeStyle: this animates CurrentStyle toward a target over the 1.4s transition, it does
// not construct a Style from seed params. `pitchRoot`/`scale` are audio-only discretes that
// switch at m=0.5 rather than gliding — everything else lerps continuously.
export function lerpStyle(source: Style, target: Style, m: number): Style {
  const out = {} as Style;

  for (const d of DIALS) {
    if (d.name === 'pitchRoot') {
      out.pitchRoot = m < 0.5 ? source.pitchRoot : target.pitchRoot;
      continue;
    }
    const a = source[d.name];
    const b = target[d.name];
    out[d.name] = d.logLerp ? Math.pow(2, lerp(Math.log2(a), Math.log2(b), m)) : lerp(a, b, m);
  }

  out.palette = source.palette.map((stopA, k) => lerpOklch(stopA, target.palette[k]!, m)) as Palette;
  out.scale = m < 0.5 ? source.scale : target.scale;

  return out;
}
