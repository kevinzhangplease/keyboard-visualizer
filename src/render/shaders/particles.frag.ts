// Particle fragment shader: pShape mixes disc/ring/shard SDFs, additive, life-based alpha (§7.1).

export const particlesFrag = /* glsl */ `
precision highp float;

varying float vTauFrac;
varying float vTau;
varying vec2 vUv;
varying float vSeed;

uniform vec3 uColA;
uniform vec3 uColB;
uniform float uShape;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);

  float disc = smoothstep(0.5, 0.0, r);
  float ring = clamp(1.0 - abs(r - 0.34) / 0.08, 0.0, 1.0);

  float spinAngle = vSeed * 6.28318 + vTau * 2.0;
  float ca = cos(spinAngle);
  float sa = sin(spinAngle);
  vec2 rp = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
  float shardDist = abs(rp.x) + abs(rp.y);
  float shard = smoothstep(0.55, 0.25, shardDist);

  float wDisc = 1.0 - smoothstep(0.0, 0.5, uShape);
  float wRing = clamp(1.0 - abs(uShape - 0.5) * 2.0, 0.0, 1.0);
  float wShard = smoothstep(0.5, 1.0, uShape);
  float mask = disc * wDisc + ring * wRing + shard * wShard;

  vec3 col = mix(uColA, uColB, vTauFrac);
  float alpha = pow(1.0 - vTauFrac, 2.0) * 0.9 * mask;

  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(col, alpha);
}
`;
