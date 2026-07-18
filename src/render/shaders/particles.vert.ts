// Instanced GPU particle motion (spec §7.1). CPU never updates positions after spawn —
// all motion is computed here from (aPos0, aVel, tau) and the current global dial uniforms.

export const particlesVert = /* glsl */ `
precision highp float;

attribute float aSpawn;
attribute float aLife;
attribute vec3 aPos0;
attribute vec3 aVel;
attribute float aSeed;
attribute float aKind; // 0 normal, 1 backspace-converge
attribute float aSize;

uniform float uTime;
uniform float uDrag;
uniform float uGravity;
uniform float uTurbulence;
uniform float uTrail;
uniform float uVelocity;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uConvergeTarget;

varying float vTauFrac;
varying float vTau;
varying vec2 vUv;
varying float vSeed;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

// Cheap curl: 2 finite-difference taps per axis on independently-offset noise samples.
vec3 curl(vec3 p) {
  float e = 0.1;
  float x = (noise3(p + vec3(0.0, e, 0.0)) - noise3(p - vec3(0.0, e, 0.0))) / (2.0 * e);
  float y = (noise3(p + vec3(0.0, 0.0, e)) - noise3(p - vec3(0.0, 0.0, e))) / (2.0 * e);
  float z = (noise3(p + vec3(e, 0.0, 0.0)) - noise3(p - vec3(e, 0.0, 0.0))) / (2.0 * e);
  return vec3(x, y, z);
}

void main() {
  float tau = uTime - aSpawn;
  float lifeFrac = clamp(tau / max(aLife, 0.0001), 0.0, 1.0);
  vTauFrac = lifeFrac;
  vTau = tau;
  vUv = uv;
  vSeed = aSeed;

  bool alive = tau >= 0.0 && tau <= aLife;

  vec3 worldPos;
  if (aKind > 0.5) {
    float t = smoothstep(0.0, 1.0, lifeFrac);
    worldPos = mix(aPos0, uConvergeTarget, t);
  } else {
    float dragT = uDrag * tau;
    float dragFactor = dragT > 0.0001 ? (1.0 - exp(-dragT)) / dragT : 1.0;
    vec3 gravityOffset = vec3(0.0, -0.5 * uGravity * tau * tau, 0.0);
    vec3 turb = curl(aPos0 * 1.5 + tau * 0.6) * uTurbulence * 0.8 * tau;
    worldPos = aPos0 + aVel * tau * dragFactor + gravityOffset + turb;
  }

  float size = alive ? aSize : 0.0;

  // Billboard quad, stretched along the screen-projected velocity (comet trail).
  vec3 right = uCamRight * size;
  vec3 up = uCamUp * size;
  vec3 offset = position.x * right + position.y * up;

  vec3 planeNormal = normalize(cross(uCamRight, uCamUp));
  vec3 velOnPlane = aVel - dot(aVel, planeNormal) * planeNormal;
  float speed = length(aVel);
  if (length(velOnPlane) > 0.0001) {
    float trailStretch = 1.0 + uTrail * (3.0 + 6.0 * uVelocity) * min(speed, 1.0);
    vec3 stretchAxis = normalize(velOnPlane);
    float alongAxis = dot(offset, stretchAxis);
    offset += stretchAxis * alongAxis * (trailStretch - 1.0);
  }

  vec4 mvPosition = modelViewMatrix * vec4(worldPos + offset, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;
