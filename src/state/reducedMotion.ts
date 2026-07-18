// prefers-reduced-motion: live-toggle watcher + the Style transform it applies (spec §9.6).

import type { Style } from '../style/types';

export interface ReducedMotionState {
  active: boolean;
}

export function createReducedMotionWatcher(): ReducedMotionState {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state: ReducedMotionState = { active: mq.matches };
  mq.addEventListener('change', (e) => {
    state.active = e.matches;
  });
  return state;
}

export function applyReducedMotion(style: Style, active: boolean): Style {
  if (!active) return style;
  return {
    ...style,
    camDriftAmp: 0,
    animSpeed: Math.min(style.animSpeed, 0.8),
    pSpeed: style.pSpeed * 0.5,
    pCountBase: style.pCountBase * 0.5,
    pTrail: 0,
    bgShimmer: 0,
    bgFlowSpeed: style.bgFlowSpeed * 0.5,
  };
}
