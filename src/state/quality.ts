// FPS governor: frame-time EMA drives a 4-tier quality multiplier (spec §7.2).

export type QualityTier = 0 | 1 | 2 | 3;

export const QUALITY_MULTIPLIERS: Record<QualityTier, number> = {
  0: 1.0,
  1: 0.75,
  2: 0.5,
  3: 0.35,
};

export interface QualityGovernor {
  tier: QualityTier;
  multiplier: number;
  update: (dtMs: number) => void;
}

const CHECK_INTERVAL_MS = 2000;
const HIGH_FPS_SUSTAIN_MS = 4000;
const EMA_ALPHA = 0.05;

export function createQualityGovernor(): QualityGovernor {
  let emaFrameMs = 16.7;
  let sinceCheck = 0;
  let highFpsStreak = 0;

  const governor: QualityGovernor = {
    tier: 0,
    multiplier: QUALITY_MULTIPLIERS[0],
    update(dtMs: number): void {
      emaFrameMs += EMA_ALPHA * (dtMs - emaFrameMs);
      sinceCheck += dtMs;
      if (sinceCheck < CHECK_INTERVAL_MS) return;
      sinceCheck = 0;

      const fps = 1000 / emaFrameMs;
      if (fps < 48 && governor.tier < 3) {
        governor.tier = (governor.tier + 1) as QualityTier;
        governor.multiplier = QUALITY_MULTIPLIERS[governor.tier];
        highFpsStreak = 0;
        console.info('[quality] tier', governor.tier);
      } else if (fps > 57) {
        highFpsStreak += CHECK_INTERVAL_MS;
        if (highFpsStreak >= HIGH_FPS_SUSTAIN_MS && governor.tier > 0) {
          governor.tier = (governor.tier - 1) as QualityTier;
          governor.multiplier = QUALITY_MULTIPLIERS[governor.tier];
          highFpsStreak = 0;
          console.info('[quality] tier', governor.tier);
        }
      } else {
        highFpsStreak = 0;
      }
    },
  };

  return governor;
}
