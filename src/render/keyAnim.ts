// Per-key press/release/backspace choreography (spec §6.3-6.4). Hand-rolled timeline
// entries {start, dur, ease, apply} updated once per frame from the rAF loop.

import { clamp, easeHalfSine, easeOutBack, easeOutQuad, expDecay, triangle } from '../core/math';
import { KEY_LAYOUT, type KeyDef } from '../input/layout';
import type { Style } from '../style/types';
import type { Keyboard } from './keyboard';

interface Anim {
  start: number;
  dur: number;
  ease: (t: number) => number;
  apply: (eased: number) => void;
  onComplete?: () => void;
}

const anims: Anim[] = [];

function schedule(a: Anim): void {
  anims.push(a);
}

interface KeyState {
  travelY: number;
  pulseY: number;
  scalePop: number;
  flashStart: number | null;
  flashPeak: number;
  dissolveAmount: number;
}

const states = new Map<string, KeyState>();

function stateFor(code: string): KeyState {
  let s = states.get(code);
  if (!s) {
    s = { travelY: 0, pulseY: 0, scalePop: 1, flashStart: null, flashPeak: 0, dissolveAmount: 0 };
    states.set(code, s);
  }
  return s;
}

export interface KeyAnimHooks {
  spawnExplode?: (def: KeyDef, style: Style, velocity: number, large: boolean) => void;
  spawnBackspace?: (def: KeyDef, style: Style) => void;
  playSound?: (def: KeyDef, style: Style, velocity: number, large: boolean) => void;
  playBackspaceSound?: (def: KeyDef, style: Style) => void;
}

// Standard press: travel, flash, explode pop, neighbor pulse, dissolve, sound (spec §6.3).
export function triggerPress(
  def: KeyDef,
  style: Style,
  velocity: number,
  clock: number,
  hooks: KeyAnimHooks,
): void {
  const dur = (ms: number) => ms / 1000 / style.animSpeed;
  const large = def.large;
  const largeMul = large ? 1 : 0;
  const state = stateFor(def.code);

  // Travel: down over 45ms easeOutQuad, back up over 240ms easeOutBack (~6% overshoot).
  const travelAmount = style.keyDepth * 0.55 * style.wPress * (1 + 0.25 * largeMul);
  const downDur = dur(45);
  schedule({
    start: clock,
    dur: downDur,
    ease: easeOutQuad,
    apply: (eased) => {
      state.travelY = -travelAmount * eased;
    },
    onComplete: () => {
      schedule({
        start: clock + downDur,
        dur: dur(240),
        ease: easeOutBack,
        apply: (eased) => {
          state.travelY = -travelAmount * (1 - eased);
        },
      });
    },
  });

  // Flash: emissive spike, exponential decay (tau 180ms), evaluated continuously per-frame.
  state.flashStart = clock;
  state.flashPeak = 1.6 * style.wFlash * (1 + 0.3 * velocity);

  // Explode: cap scale pop + particle spawn hook.
  const popPeak = 0.08 * style.wExplode;
  const popRiseDur = dur(45);
  schedule({
    start: clock,
    dur: popRiseDur,
    ease: easeOutQuad,
    apply: (eased) => {
      state.scalePop = 1 + popPeak * eased;
    },
    onComplete: () => {
      schedule({
        start: clock + popRiseDur,
        dur: dur(200),
        ease: easeOutBack,
        apply: (eased) => {
          state.scalePop = 1 + popPeak * (1 - eased);
        },
      });
    },
  });
  hooks.spawnExplode?.(def, style, velocity, large);

  // Pulse: ripple through neighbor keys within radius, staggered by distance.
  const radius = 2.2 + 1.0 * largeMul;
  for (const other of KEY_LAYOUT) {
    if (other.code === def.code) continue;
    const d = Math.hypot(other.x - def.x, other.z - def.z);
    if (d > radius) continue;
    const otherState = stateFor(other.code);
    const amp = 0.04 * style.wPulse * (1 - d / radius);
    const delay = (0.018 * d) / style.animSpeed;
    schedule({
      start: clock + delay,
      dur: dur(260),
      ease: easeHalfSine,
      apply: (eased) => {
        otherState.pulseY = amp * eased;
      },
    });
  }

  // Dissolve: noise-mask flicker, 0 -> peak -> 0 over 220ms.
  const dissolvePeak = 0.35 * style.wDissolve;
  schedule({
    start: clock,
    dur: dur(220),
    ease: triangle,
    apply: (eased) => {
      state.dissolveAmount = dissolvePeak * eased;
    },
  });

  hooks.playSound?.(def, style, velocity, large);
}

// Backspace: no downward travel — reverse dissolve + inward-converging particles (spec §6.4).
export function triggerBackspace(def: KeyDef, style: Style, clock: number, hooks: KeyAnimHooks): void {
  const dur = (ms: number) => ms / 1000 / Math.max(style.animSpeed, 0.8);
  const state = stateFor(def.code);

  schedule({
    start: clock,
    dur: dur(160),
    ease: (t) => t,
    apply: (eased) => {
      state.scalePop = 1 + 0.06 * eased;
      state.dissolveAmount = eased;
    },
    onComplete: () => {
      schedule({
        start: clock + dur(160),
        dur: dur(140),
        ease: (t) => t,
        apply: (eased) => {
          state.scalePop = 1.06 - 0.06 * eased;
        },
      });
      schedule({
        start: clock + dur(300),
        dur: dur(300),
        ease: (t) => t,
        apply: (eased) => {
          state.dissolveAmount = 1 - eased;
        },
      });
    },
  });

  hooks.spawnBackspace?.(def, style);
  hooks.playBackspaceSound?.(def, style);
}

export function updateKeyAnims(keyboard: Keyboard, style: Style, clock: number): void {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]!;
    const elapsed = clock - a.start;
    if (elapsed < 0) continue;
    const raw = clamp(elapsed / a.dur, 0, 1);
    a.apply(a.ease(raw));
    if (raw >= 1) {
      anims.splice(i, 1);
      a.onComplete?.();
    }
  }

  for (const km of keyboard.keys) {
    const state = stateFor(km.def.code);

    let emissive = style.emissiveIdle;
    if (state.flashStart !== null) {
      const elapsed = clock - state.flashStart;
      const decay = expDecay(elapsed, 0.18);
      emissive = style.emissiveIdle + state.flashPeak * decay;
      if (decay < 0.01) state.flashStart = null;
    }

    km.material.emissiveIntensity = emissive;
    km.group.position.y = state.travelY + state.pulseY;
    km.group.scale.setScalar(state.scalePop);
    km.dissolveUniform.value = state.dissolveAmount;
  }
}
