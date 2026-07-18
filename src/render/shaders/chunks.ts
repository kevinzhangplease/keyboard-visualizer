// Shared GLSL noise/shape primitives, exported as a template string and spliced into
// each shader source (spec §6.2: hash, valueNoise, fbm, ridge, voronoiF1).

export const CHUNKS = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// 4 octaves, lacunarity 2.0, gain 0.5
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return sum;
}

float ridge(float x) {
  return 1.0 - abs(2.0 * x - 1.0);
}

// Returns (F1, F2) nearest-cell distances.
vec2 voronoiF1F2(vec2 p, float cellScale) {
  vec2 pp = p * cellScale;
  vec2 ip = floor(pp);
  vec2 fp = fract(pp);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash22(ip + neighbor);
      vec2 diff = neighbor + point - fp;
      float dist = length(diff);
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }
  return vec2(f1, f2);
}
`;
