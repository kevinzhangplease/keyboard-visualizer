// One background shader, all five looks — components weighted by uniforms (spec §6.2).
// Composite order below matches the plan's numbered steps 1-11 verbatim.

import { CHUNKS } from './chunks';

export const backgroundFrag = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uRes;
uniform vec3 uPalette[6];

uniform float uTerrain;
uniform float uRidged;
uniform float uMist;
uniform float uAurora;
uniform float uStars;
uniform float uNebula;
uniform float uCaustics;
uniform float uShimmer;
uniform float uFlowSpeed;

uniform float uVelocity;
uniform vec3 uPressWave; // x, z, age (0..1, 1 = just fired)

${CHUNKS}

float starLayer(vec2 uv, float cellsPerUnit, float sizeFactor, float density) {
  vec2 p = uv * cellsPerUnit;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float h = hash21(cell);
  vec2 starPos = hash22(cell + 7.0);
  float d = length(f - starPos);
  float star = smoothstep(sizeFactor, 0.0, d) * step(1.0 - density, h);
  float twinkle = 0.7 + 0.3 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
  return star * twinkle;
}

void main() {
  vec2 uv = vUv;

  // 1. Sky base
  vec3 col = mix(uPalette[0], uPalette[1], pow(clamp(uv.y, 0.0, 1.0), 1.4));

  // 2. Shimmer (screen-UV distortion) — applied before the noise-driven components below.
  vec2 wUv = uv;
  if (uShimmer > 0.001) {
    float s = fbm(uv * 8.0 + uTime * 0.9 * (0.05 + uFlowSpeed)) - 0.5;
    wUv += s * 0.012 * uShimmer * smoothstep(0.6, 0.25, uv.y);
  }

  // 3. Stars
  if (uStars > 0.001) {
    float stars = starLayer(wUv, 40.0, 0.35, 0.10) + starLayer(wUv, 24.0, 0.4, 0.06) * 0.7;
    col += uPalette[5] * stars * uStars * 0.9;
  }

  // 4. Nebula (domain-warped FBM)
  if (uNebula > 0.001) {
    vec2 p = wUv * 3.0;
    float warp = fbm(p + uTime * 0.01);
    float n = fbm(p + 1.8 * warp);
    vec3 nebulaCol = mix(uPalette[1], uPalette[3], n);
    nebulaCol = mix(nebulaCol, uPalette[4], smoothstep(0.55, 0.85, warp));
    col = mix(col, nebulaCol, uNebula * n * 0.85);
  }

  // 5. Aurora (vertical light curtains)
  if (uAurora > 0.001) {
    vec3 auroraCol = vec3(0.0);
    for (int k = 0; k < 3; k++) {
      float kf = float(k);
      float warp = fbm(vec2(wUv.y * 2.0 + kf * 7.3, uTime * 0.05)) - 0.5;
      float xk = 0.2 + kf * 0.3 + warp * 0.35;
      float band = smoothstep(0.10, 0.0, abs(wUv.x - xk));
      auroraCol += mix(uPalette[3], uPalette[4], wUv.y) * band;
    }
    // Quadratic falloff: low dial values (an accidental accent on non-aurora themes)
    // stay nearly invisible, while high values (Ice, Space) read as full curtains.
    col += auroraCol * (uAurora * uAurora);
  }

  // 6. Caustics (voronoi light webs, opposing diagonal scroll)
  if (uCaustics > 0.001) {
    vec2 c1 = wUv * 4.0 + vec2(uTime * uFlowSpeed, -uTime * uFlowSpeed);
    vec2 c2 = wUv * 6.5 + vec2(-uTime * uFlowSpeed * 0.8, uTime * uFlowSpeed * 0.8);
    float f1a = voronoiF1F2(c1, 1.0).x;
    float f1b = voronoiF1F2(c2, 1.0).x;
    float rawCaustic = pow(1.0 - clamp(f1a, 0.0, 1.0), 6.0) + pow(1.0 - clamp(f1b, 0.0, 1.0), 6.0);
    // Sharpen: push the broad pow(1-F1,6) glow through a hard threshold so only the
    // near-point cores read as bright webs instead of a wide, washed-out blob field.
    float caustic = smoothstep(0.25, 0.85, rawCaustic);
    col += uPalette[3] * clamp(caustic * uCaustics, 0.0, 0.35);
  }

  // 7. Terrain (4-layer parallax ridge/dune silhouettes + alpenglow band)
  if (uTerrain > 0.001) {
    float heights[4];
    heights[0] = 0.62;
    heights[1] = 0.50;
    heights[2] = 0.40;
    heights[3] = 0.32;
    float amps[4];
    amps[0] = 0.10;
    amps[1] = 0.14;
    amps[2] = 0.17;
    amps[3] = 0.20;
    float speeds[4];
    speeds[0] = 0.2;
    speeds[1] = 0.45;
    speeds[2] = 0.7;
    speeds[3] = 1.0;

    vec3 terrainCol = vec3(0.0);
    float terrainMask = 0.0;
    for (int i = 0; i < 4; i++) {
      float x = wUv.x * 3.0 + uTime * uFlowSpeed * speeds[i];
      float n = fbm(vec2(x, float(i) * 11.7));
      float ridged = mix(n, ridge(n), uRidged);
      float h = heights[i] + amps[i] * (ridged - 0.5);
      float mask = smoothstep(h + 0.004, h - 0.004, wUv.y);
      vec3 layerCol = mix(uPalette[1], uPalette[0], float(i) / 3.0);
      terrainCol = mix(terrainCol, layerCol, mask);
      terrainMask = max(terrainMask, mask);
    }

    float h0 = heights[0];
    float glowBand = smoothstep(h0 + 0.12, h0, wUv.y) * (1.0 - smoothstep(h0, h0 - 0.004, wUv.y));
    col = mix(col, uPalette[3], glowBand * uTerrain * 0.5);

    // Sun-glow disc (spec §3.5, Desert): no dedicated dial, so its presence is derived —
    // strong for smooth low-ridge terrain (Desert), negligible for jagged ridged terrain.
    float sunWeight = uTerrain * (1.0 - uRidged);
    if (sunWeight > 0.01) {
      float sunDist = distance(wUv, vec2(0.72, 0.68));
      float sun = pow(smoothstep(0.5, 0.0, sunDist), 3.0);
      col += uPalette[4] * sun * 0.5 * sunWeight;
    }

    col = mix(col, terrainCol, terrainMask * uTerrain);
  }

  // 8. Mist (drifting low-frequency fog band)
  if (uMist > 0.001) {
    float mistN = fbm(wUv * 1.6 + vec2(uTime * 0.02, 0.0));
    float mistBand = smoothstep(0.28, 0.55, wUv.y) * (1.0 - smoothstep(0.65, 0.92, wUv.y));
    col = mix(col, uPalette[1] * 1.15, mistN * mistBand * uMist * 0.6);
  }

  // 9. Velocity lift — the whole world subtly brightens when typing fast.
  col *= 1.0 + uVelocity * 0.15;

  // 10. Backspace dip — 250ms age-based darken.
  col *= 1.0 - 0.06 * smoothstep(0.25, 0.0, uPressWave.z);

  // 11. Vignette
  col *= 1.0 - 0.35 * pow(length(uv - 0.5) * 1.3, 2.5);

  gl_FragColor = vec4(col, 1.0);
}
`;
