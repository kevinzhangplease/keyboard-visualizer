// FPS governor tiers (spec §7.2). Phase 3 stub always returns tier 0; real EMA-driven
// tiering lands in Phase 4.

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

export function createQualityGovernor(): QualityGovernor {
  return {
    tier: 0,
    multiplier: 1.0,
    update: () => {
      /* real EMA tiering added in Phase 4 */
    },
  };
}
