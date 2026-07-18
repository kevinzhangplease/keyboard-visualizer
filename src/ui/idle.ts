// Idle/hero behaviors: camera drift scale, breathing keys, ghost ripples, particle trickle,
// and the "press any key" hint lifecycle (spec §8.2).

import { rngFromSeed } from '../core/prng';
import { KEY_LAYOUT } from '../input/layout';
import { keyColumn } from '../audio/music';
import { triggerGhostRipple } from '../render/keyAnim';
import { getKeyTopWorld, type Keyboard } from '../render/keyboard';
import { toCssOklch } from '../style/color';
import type { ParticleSystem } from '../render/particles';
import type { Style } from '../style/types';

const IDLE_THRESHOLD = 12; // seconds of no keypress
const TRICKLE_RATE = 3; // particles/sec while idle
const GHOST_MIN = 7;
const GHOST_RANGE = 4;

export interface IdleController {
  driftScale: number;
  isIdle: boolean;
  notifyActivity: (clock: number) => void;
  update: (clock: number, style: Style, keyboard: Keyboard, particles: ParticleSystem) => void;
}

export function createIdleController(seed: number): IdleController {
  const rng = rngFromSeed((seed ^ 0x51ed7e) >>> 0);
  let lastActivity = -Infinity; // idle at boot
  let lastFrameClock = 0;
  let driftScale = 1;
  let hintRemoved = false;
  let nextGhostAt = GHOST_MIN + rng() * GHOST_RANGE;
  let lastGhostAt: number | null = null;

  const hint = document.getElementById('hint');

  function removeHintPermanently(): void {
    if (hintRemoved || !hint) return;
    hintRemoved = true;
    hint.classList.add('hidden');
    window.setTimeout(() => hint.remove(), 700);
  }

  const controller: IdleController = {
    driftScale: 1,
    isIdle: true,
    notifyActivity(clock) {
      lastActivity = clock;
      removeHintPermanently();
    },
    update(clock, style, keyboard, particles) {
      const dt = Math.max(0, clock - lastFrameClock);
      lastFrameClock = clock;

      if (hint) hint.style.color = toCssOklch(style.palette[5], 0.45);

      const idle = clock - lastActivity > IDLE_THRESHOLD;
      controller.isIdle = idle;

      const targetDrift = idle ? 1 : 0.4;
      const rate = targetDrift > driftScale ? 0.25 : 0.04;
      driftScale += (targetDrift - driftScale) * rate;
      controller.driftScale = driftScale;

      if (!idle) return;

      // Breathing keys: slow left->right emissive wave.
      for (const km of keyboard.keys) {
        const col = keyColumn(km.def);
        km.material.emissiveIntensity =
          style.emissiveIdle * (1 + 0.35 * Math.sin(clock * 1.1 + col * 0.45));
      }

      // Idle particle trickle: ~3/s from random key tops.
      if (rng() < TRICKLE_RATE * dt) {
        const def = KEY_LAYOUT[Math.floor(rng() * KEY_LAYOUT.length)]!;
        particles.spawnTrickle(getKeyTopWorld(keyboard, def, style), style);
      }

      // Ghost ripple every 7-11s.
      if (lastGhostAt === null) lastGhostAt = clock;
      if (clock - lastGhostAt > nextGhostAt) {
        const def = KEY_LAYOUT[Math.floor(rng() * KEY_LAYOUT.length)]!;
        triggerGhostRipple(def, style, clock);
        lastGhostAt = clock;
        nextGhostAt = GHOST_MIN + rng() * GHOST_RANGE;
      }
    },
  };

  return controller;
}
