// Instanced GPU particle pool + CPU-side spawn logic (spec §7.1). Motion lives entirely
// in the vertex shader; the CPU only writes spawn-time attributes into a ring buffer.

import * as THREE from 'three';
import { rngFromSeed } from '../core/prng';
import { lerp } from '../core/math';
import { oklchToLinearSrgb } from '../style/color';
import type { Style } from '../style/types';
import type { Stage } from './stage';
import { particlesVert } from './shaders/particles.vert';
import { particlesFrag } from './shaders/particles.frag';

export const MAX_PARTICLES = 6000;
const MAX_SPAWN_PER_PRESS = 500;

export interface ParticleSystem {
  mesh: THREE.Mesh;
  spawnBurst: (
    origin: THREE.Vector3,
    style: Style,
    velocity: number,
    large: boolean,
    qualityMul: number,
    opts?: BurstOpts,
  ) => void;
  spawnBackspaceRing: (origin: THREE.Vector3, style: Style) => void;
  spawnTrickle: (origin: THREE.Vector3, style: Style) => void;
  update: (
    clock: number,
    style: Style,
    velocity: number,
    stage: Stage,
    disableTrail: boolean,
  ) => void;
  setSeed: (seed: number) => void;
}

interface BurstOpts {
  sizeMul?: number;
}

function buildGeometry(): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  const positions = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0]);
  const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
  const index = new Uint16Array([0, 1, 2, 2, 1, 3]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.instanceCount = MAX_PARTICLES;

  const spawn = new Float32Array(MAX_PARTICLES).fill(-1e6);
  const life = new Float32Array(MAX_PARTICLES).fill(1);
  const pos0 = new Float32Array(MAX_PARTICLES * 3);
  const vel = new Float32Array(MAX_PARTICLES * 3);
  const seed = new Float32Array(MAX_PARTICLES);
  const kind = new Float32Array(MAX_PARTICLES);
  const size = new Float32Array(MAX_PARTICLES);
  const colorA = new Float32Array(MAX_PARTICLES * 3);
  const colorB = new Float32Array(MAX_PARTICLES * 3);

  geometry.setAttribute('aSpawn', new THREE.InstancedBufferAttribute(spawn, 1));
  geometry.setAttribute('aLife', new THREE.InstancedBufferAttribute(life, 1));
  geometry.setAttribute('aPos0', new THREE.InstancedBufferAttribute(pos0, 3));
  geometry.setAttribute('aVel', new THREE.InstancedBufferAttribute(vel, 3));
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  geometry.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1));
  geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
  geometry.setAttribute('aColorA', new THREE.InstancedBufferAttribute(colorA, 3));
  geometry.setAttribute('aColorB', new THREE.InstancedBufferAttribute(colorB, 3));

  return geometry;
}

export function createParticleSystem(stage: Stage, seed: number): ParticleSystem {
  const geometry = buildGeometry();

  const uniforms = {
    uTime: { value: 0 },
    uDrag: { value: 1 },
    uGravity: { value: 0 },
    uTurbulence: { value: 0 },
    uTrail: { value: 0 },
    uVelocity: { value: 0 },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uConvergeTarget: { value: new THREE.Vector3(0, 0, 0) },
    uShape: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: particlesVert,
    fragmentShader: particlesFrag,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  stage.scene.add(mesh);

  const aSpawn = geometry.getAttribute('aSpawn') as THREE.InstancedBufferAttribute;
  const aLife = geometry.getAttribute('aLife') as THREE.InstancedBufferAttribute;
  const aPos0 = geometry.getAttribute('aPos0') as THREE.InstancedBufferAttribute;
  const aVel = geometry.getAttribute('aVel') as THREE.InstancedBufferAttribute;
  const aSeed = geometry.getAttribute('aSeed') as THREE.InstancedBufferAttribute;
  const aKind = geometry.getAttribute('aKind') as THREE.InstancedBufferAttribute;
  const aSize = geometry.getAttribute('aSize') as THREE.InstancedBufferAttribute;
  const aColorA = geometry.getAttribute('aColorA') as THREE.InstancedBufferAttribute;
  const aColorB = geometry.getAttribute('aColorB') as THREE.InstancedBufferAttribute;

  let cursor = 0;
  let rng = rngFromSeed(seed);
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const camForward = new THREE.Vector3();

  function setSeed(newSeed: number): void {
    rng = rngFromSeed(newSeed);
  }

  // Colors are captured once per spawn from the CURRENT style and baked into the instance —
  // live particles must keep their spawn-time colors and die naturally (spec §8.1).
  function spawnColors(style: Style): { a: THREE.Vector3; b: THREE.Vector3 } {
    const useShimmerOverride = style.bgShimmer > 0.6;
    const colA = useShimmerOverride ? style.palette[2] : style.palette[4];
    const colB = useShimmerOverride ? style.palette[3] : style.palette[5];
    const a = oklchToLinearSrgb(colA);
    const b = oklchToLinearSrgb(colB);
    return { a: new THREE.Vector3(a.r, a.g, a.b), b: new THREE.Vector3(b.r, b.g, b.b) };
  }

  function writeParticle(
    now: number,
    life_: number,
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    size_: number,
    kind_: number,
    colA: THREE.Vector3,
    colB: THREE.Vector3,
  ): void {
    const i = cursor;
    cursor = (cursor + 1) % MAX_PARTICLES;

    aSpawn.setX(i, now);
    aLife.setX(i, life_);
    aPos0.setXYZ(i, origin.x, origin.y, origin.z);
    aVel.setXYZ(i, velocity.x, velocity.y, velocity.z);
    aSeed.setX(i, rng());
    aKind.setX(i, kind_);
    aSize.setX(i, size_);
    aColorA.setXYZ(i, colA.x, colA.y, colA.z);
    aColorB.setXYZ(i, colB.x, colB.y, colB.z);
  }

  function flagUpdate(): void {
    aSpawn.needsUpdate = true;
    aLife.needsUpdate = true;
    aPos0.needsUpdate = true;
    aVel.needsUpdate = true;
    aSeed.needsUpdate = true;
    aKind.needsUpdate = true;
    aSize.needsUpdate = true;
    aColorA.needsUpdate = true;
    aColorB.needsUpdate = true;
  }

  function spawnBurst(
    origin: THREE.Vector3,
    style: Style,
    velocity: number,
    large: boolean,
    qualityMul: number,
    opts: BurstOpts = {},
  ): void {
    const rawCount =
      style.pCountBase *
      (0.7 + 0.3 * rng()) *
      (1 + 1.5 * velocity) *
      (1 + 0.8 * (large ? 1 : 0)) *
      qualityMul;
    const n = Math.min(Math.round(rawCount), MAX_SPAWN_PER_PRESS);
    const now = uniforms.uTime.value;
    const coneHalfAngle = THREE.MathUtils.degToRad(lerp(20, 90, style.pSpread));
    const { a: colA, b: colB } = spawnColors(style);
    for (let k = 0; k < n; k++) {
      // Hemisphere-around-+Y direction within the spread cone.
      const theta = rng() * Math.PI * 2;
      const phi = rng() * coneHalfAngle;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
      const speed = style.pSpeed * (0.6 + 0.8 * rng());
      const life = style.pLifespan * (0.7 + 0.6 * rng());
      const size =
        style.pSize * (0.7 + 0.6 * rng()) * (large ? 1.4 : 1) * (opts.sizeMul ?? 1);
      writeParticle(now, life, origin, dir.multiplyScalar(speed), size, 0, colA, colB);
    }
    flagUpdate();
  }

  function spawnBackspaceRing(origin: THREE.Vector3, style: Style): void {
    const count = Math.min(Math.round(0.8 * style.pCountBase), MAX_SPAWN_PER_PRESS);
    const now = uniforms.uTime.value;
    const radius = 1.2;
    const { a: colA, b: colB } = spawnColors(style);
    uniforms.uConvergeTarget.value.copy(origin);
    for (let k = 0; k < count; k++) {
      const angle = (k / count) * Math.PI * 2;
      const ringPos = new THREE.Vector3(
        origin.x + Math.cos(angle) * radius,
        origin.y,
        origin.z + Math.sin(angle) * radius,
      );
      const inward = new THREE.Vector3(origin.x - ringPos.x, 0, origin.z - ringPos.z)
        .normalize()
        .multiplyScalar(style.pSpeed * 0.8);
      writeParticle(now, 0.42, ringPos, inward, style.pSize * 0.8, 1, colA, colB);
    }
    flagUpdate();
  }

  function spawnTrickle(origin: THREE.Vector3, style: Style): void {
    const now = uniforms.uTime.value;
    const dir = new THREE.Vector3((rng() - 0.5) * 0.3, 1, (rng() - 0.5) * 0.3).normalize();
    const speed = style.pSpeed * 0.4;
    const life = style.pLifespan * 1.5;
    const size = style.pSize * (0.7 + 0.6 * rng());
    const { a: colA, b: colB } = spawnColors(style);
    writeParticle(now, life, origin, dir.multiplyScalar(speed), size, 0, colA, colB);
    flagUpdate();
  }

  function update(
    clock: number,
    style: Style,
    velocity: number,
    stage: Stage,
    disableTrail: boolean,
  ): void {
    uniforms.uTime.value = clock;
    uniforms.uDrag.value = style.pDrag;
    uniforms.uGravity.value = style.pGravity;
    uniforms.uTurbulence.value = style.pTurbulence;
    uniforms.uTrail.value = disableTrail ? 0 : style.pTrail;
    uniforms.uVelocity.value = velocity;
    uniforms.uShape.value = style.pShape;

    stage.camera.matrixWorld.extractBasis(camRight, camUp, camForward);
    uniforms.uCamRight.value.copy(camRight);
    uniforms.uCamUp.value.copy(camUp);
  }

  return { mesh, spawnBurst, spawnBackspaceRing, spawnTrickle, update, setSeed };
}
