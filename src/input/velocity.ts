// Typing-speed tracker -> v in [0,1], smoothed with fast attack / slow decay (spec §7.3).

import { clamp } from '../core/math';

export interface VelocityTracker {
  v: number;
  recordPress: (t: number) => void;
  update: (t: number) => void;
}

export function createVelocityTracker(): VelocityTracker {
  const timestamps: number[] = [];
  const tracker: VelocityTracker = {
    v: 0,
    recordPress(t: number): void {
      timestamps.push(t);
      if (timestamps.length > 24) timestamps.shift();
    },
    update(t: number): void {
      while (timestamps.length > 0 && t - timestamps[0]! > 1.5) timestamps.shift();
      const kps = timestamps.length / 1.5;
      const vRaw = clamp((kps - 1.5) / 6.5, 0, 1);
      const rate = vRaw > tracker.v ? 0.25 : 0.04;
      tracker.v += (vRaw - tracker.v) * rate;
    },
  };
  return tracker;
}
