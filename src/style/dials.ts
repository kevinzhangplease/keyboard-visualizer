// The continuous dial table (spec §2): name, range, jitter fraction, and the five
// anchor values (Mountains, Ice, Ocean, Space, Desert), in canonical table order.
// Table order matters: paramsFromSeed() draws jitter randoms in this exact order.

export const DIAL_NAMES = [
  'bgTerrain',
  'bgRidged',
  'bgMist',
  'bgAurora',
  'bgStars',
  'bgNebula',
  'bgCaustics',
  'bgShimmer',
  'bgFlowSpeed',
  'pCountBase',
  'pSize',
  'pSpeed',
  'pLifespan',
  'pGravity',
  'pDrag',
  'pTurbulence',
  'pTrail',
  'pShape',
  'pSpread',
  'keyDepth',
  'keyBevel',
  'wireframe',
  'roughness',
  'metalness',
  'transmission',
  'emissiveIdle',
  'keyChromaMul',
  'wFlash',
  'wPress',
  'wExplode',
  'wPulse',
  'wDissolve',
  'animSpeed',
  'camDriftAmp',
  'camDriftSpeed',
  'bloomStrength',
  'bloomThreshold',
  'oscShape',
  'fmAmount',
  'noiseAmount',
  'attack',
  'release',
  'filterCutoff',
  'filterQ',
  'reverbMix',
  'delayMix',
  'delayTime',
  'pitchRoot',
  'detune',
] as const;

export type DialName = (typeof DIAL_NAMES)[number];

// Anchor tuple order: [Mountains, Ice, Ocean, Space, Desert]
export interface DialSpec {
  name: DialName;
  min: number;
  max: number;
  jitter: number;
  anchors: readonly [number, number, number, number, number];
  logLerp?: true;
  roundInt?: true;
}

export const DIALS: readonly DialSpec[] = [
  { name: 'bgTerrain', min: 0, max: 1, jitter: 0.15, anchors: [1.0, 0.25, 0.0, 0.0, 0.9] },
  { name: 'bgRidged', min: 0, max: 1, jitter: 0.15, anchors: [0.9, 0.7, 0.5, 0.5, 0.1] },
  { name: 'bgMist', min: 0, max: 1, jitter: 0.15, anchors: [0.8, 0.35, 0.3, 0.1, 0.45] },
  { name: 'bgAurora', min: 0, max: 1, jitter: 0.15, anchors: [0.15, 1.0, 0.1, 0.35, 0.0] },
  { name: 'bgStars', min: 0, max: 1, jitter: 0.15, anchors: [0.35, 0.25, 0.0, 1.0, 0.2] },
  { name: 'bgNebula', min: 0, max: 1, jitter: 0.15, anchors: [0.0, 0.1, 0.15, 1.0, 0.05] },
  { name: 'bgCaustics', min: 0, max: 1, jitter: 0.15, anchors: [0.0, 0.2, 1.0, 0.0, 0.0] },
  { name: 'bgShimmer', min: 0, max: 1, jitter: 0.12, anchors: [0.05, 0.0, 0.25, 0.0, 0.9] },
  { name: 'bgFlowSpeed', min: 0, max: 1, jitter: 0.15, anchors: [0.15, 0.06, 0.35, 0.12, 0.3] },
  {
    name: 'pCountBase',
    min: 40,
    max: 220,
    jitter: 0.2,
    anchors: [120, 70, 90, 140, 160],
  },
  { name: 'pSize', min: 0.02, max: 0.14, jitter: 0.15, anchors: [0.05, 0.07, 0.06, 0.045, 0.035] },
  { name: 'pSpeed', min: 0.5, max: 6.0, jitter: 0.15, anchors: [2.2, 1.4, 1.2, 3.5, 2.8] },
  { name: 'pLifespan', min: 0.6, max: 3.5, jitter: 0.15, anchors: [1.8, 2.6, 2.2, 1.6, 1.2] },
  { name: 'pGravity', min: -2.5, max: 2.5, jitter: 0.12, anchors: [1.6, 0.3, -0.6, 0.0, 0.9] },
  { name: 'pDrag', min: 0, max: 3, jitter: 0.15, anchors: [1.2, 2.0, 2.2, 0.4, 0.8] },
  { name: 'pTurbulence', min: 0, max: 1, jitter: 0.15, anchors: [0.35, 0.15, 0.5, 0.25, 0.7] },
  { name: 'pTrail', min: 0, max: 1, jitter: 0.15, anchors: [0.15, 0.05, 0.2, 0.85, 0.3] },
  { name: 'pShape', min: 0, max: 1, jitter: 0.15, anchors: [0.1, 0.9, 0.45, 0.25, 0.15] },
  { name: 'pSpread', min: 0, max: 1, jitter: 0.15, anchors: [0.7, 0.5, 0.85, 0.6, 0.75] },
  { name: 'keyDepth', min: 0.05, max: 0.45, jitter: 0.12, anchors: [0.3, 0.22, 0.16, 0.26, 0.34] },
  {
    name: 'keyBevel',
    min: 0.005,
    max: 0.08,
    jitter: 0.12,
    anchors: [0.02, 0.05, 0.06, 0.03, 0.015],
  },
  { name: 'wireframe', min: 0, max: 1, jitter: 0.12, anchors: [0.0, 0.15, 0.0, 0.35, 0.0] },
  { name: 'roughness', min: 0, max: 1, jitter: 0.12, anchors: [0.85, 0.08, 0.15, 0.3, 0.95] },
  { name: 'metalness', min: 0, max: 1, jitter: 0.12, anchors: [0.05, 0.0, 0.1, 0.7, 0.0] },
  { name: 'transmission', min: 0, max: 1, jitter: 0.12, anchors: [0.0, 0.85, 0.35, 0.25, 0.0] },
  {
    name: 'emissiveIdle',
    min: 0,
    max: 0.6,
    jitter: 0.15,
    anchors: [0.08, 0.2, 0.25, 0.45, 0.12],
  },
  {
    name: 'keyChromaMul',
    min: 0.4,
    max: 1.3,
    jitter: 0.12,
    anchors: [0.7, 0.8, 1.0, 1.1, 0.9],
  },
  { name: 'wFlash', min: 0, max: 1, jitter: 0.15, anchors: [0.3, 0.9, 0.4, 0.8, 0.5] },
  { name: 'wPress', min: 0, max: 1, jitter: 0.15, anchors: [0.9, 0.3, 0.6, 0.4, 0.8] },
  { name: 'wExplode', min: 0, max: 1, jitter: 0.15, anchors: [0.6, 0.7, 0.3, 0.9, 0.85] },
  { name: 'wPulse', min: 0, max: 1, jitter: 0.15, anchors: [0.4, 0.2, 0.9, 0.5, 0.3] },
  { name: 'wDissolve', min: 0, max: 1, jitter: 0.15, anchors: [0.1, 0.5, 0.2, 0.3, 0.6] },
  { name: 'animSpeed', min: 0.25, max: 1.75, jitter: 0.12, anchors: [0.7, 0.5, 0.8, 1.1, 0.9] },
  { name: 'camDriftAmp', min: 0, max: 0.5, jitter: 0.12, anchors: [0.18, 0.05, 0.25, 0.35, 0.15] },
  {
    name: 'camDriftSpeed',
    min: 0.02,
    max: 0.3,
    jitter: 0.12,
    anchors: [0.05, 0.02, 0.12, 0.08, 0.04],
  },
  {
    name: 'bloomStrength',
    min: 0.3,
    max: 1.4,
    jitter: 0.12,
    anchors: [0.55, 0.9, 0.8, 1.25, 0.6],
  },
  {
    name: 'bloomThreshold',
    min: 0.4,
    max: 0.85,
    jitter: 0.1,
    anchors: [0.75, 0.6, 0.65, 0.5, 0.7],
  },
  { name: 'oscShape', min: 0, max: 1, jitter: 0.15, anchors: [0.25, 0.05, 0.35, 0.8, 0.55] },
  { name: 'fmAmount', min: 0, max: 1, jitter: 0.15, anchors: [0.1, 0.8, 0.2, 0.3, 0.15] },
  { name: 'noiseAmount', min: 0, max: 1, jitter: 0.15, anchors: [0.1, 0.05, 0.35, 0.1, 0.2] },
  {
    name: 'attack',
    min: 0.001,
    max: 0.08,
    jitter: 0.15,
    anchors: [0.02, 0.001, 0.012, 0.03, 0.002],
  },
  { name: 'release', min: 0.15, max: 2.5, jitter: 0.15, anchors: [1.2, 2.2, 1.0, 1.8, 0.5] },
  {
    name: 'filterCutoff',
    min: 300,
    max: 6000,
    jitter: 0.15,
    anchors: [900, 3800, 1400, 1100, 2200],
    logLerp: true,
  },
  { name: 'filterQ', min: 0.5, max: 8, jitter: 0.15, anchors: [0.8, 1.2, 2.5, 4.5, 1.5] },
  { name: 'reverbMix', min: 0, max: 0.6, jitter: 0.12, anchors: [0.45, 0.55, 0.35, 0.6, 0.15] },
  { name: 'delayMix', min: 0, max: 0.45, jitter: 0.12, anchors: [0.1, 0.3, 0.28, 0.35, 0.18] },
  { name: 'delayTime', min: 0.12, max: 0.42, jitter: 0.12, anchors: [0.3, 0.38, 0.28, 0.42, 0.16] },
  {
    name: 'pitchRoot',
    min: 33,
    max: 57,
    jitter: 0.1,
    anchors: [45, 57, 50, 41, 48],
    roundInt: true,
  },
  { name: 'detune', min: 0, max: 25, jitter: 0.15, anchors: [4, 12, 8, 10, 6] },
];

// Sanity: DIALS must cover exactly DIAL_NAMES in order (checked in tests too).
if (DIALS.length !== DIAL_NAMES.length) {
  throw new Error('DIALS/DIAL_NAMES length mismatch');
}
