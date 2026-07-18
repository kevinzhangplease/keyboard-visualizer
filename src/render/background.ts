// Fullscreen-triangle background mesh wrapping the composite shader (spec §6.2).

import * as THREE from 'three';
import { backgroundVert } from './shaders/background.vert';
import { backgroundFrag } from './shaders/background.frag';
import { oklchToLinearSrgb } from '../style/color';
import { lerp } from '../core/math';
import type { Style } from '../style/types';

export interface Background {
  mesh: THREE.Mesh;
  setStyle: (style: Style) => void;
  update: (time: number, velocity: number, pressWaveAge: number) => void;
  resize: (width: number, height: number) => void;
}

function fullscreenTriangleGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  // Oversized triangle covering NDC [-1,1] after clipping; uv maps 0..1 to the visible area.
  const positions = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
  const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

export function createBackground(): Background {
  const geometry = fullscreenTriangleGeometry();

  const palette: THREE.Vector3[] = Array.from({ length: 6 }, () => new THREE.Vector3());

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uPalette: { value: palette },
    uTerrain: { value: 0 },
    uRidged: { value: 0 },
    uMist: { value: 0 },
    uAurora: { value: 0 },
    uStars: { value: 0 },
    uNebula: { value: 0 },
    uCaustics: { value: 0 },
    uShimmer: { value: 0 },
    uFlowSpeed: { value: 0.02 },
    uVelocity: { value: 0 },
    uPressWave: { value: new THREE.Vector3(0, 0, 1) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: backgroundVert,
    fragmentShader: backgroundFrag,
    uniforms,
    depthWrite: false,
    depthTest: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  function setStyle(style: Style): void {
    for (let i = 0; i < 6; i++) {
      const stop = style.palette[i]!;
      const { r, g, b } = oklchToLinearSrgb(stop);
      palette[i]!.set(r, g, b);
    }
    uniforms.uTerrain.value = style.bgTerrain;
    uniforms.uRidged.value = style.bgRidged;
    uniforms.uMist.value = style.bgMist;
    uniforms.uAurora.value = style.bgAurora;
    uniforms.uStars.value = style.bgStars;
    uniforms.uNebula.value = style.bgNebula;
    uniforms.uCaustics.value = style.bgCaustics;
    uniforms.uShimmer.value = style.bgShimmer;
    uniforms.uFlowSpeed.value = lerp(0.02, 0.25, style.bgFlowSpeed);
  }

  function update(time: number, velocity: number, pressWaveAge: number): void {
    uniforms.uTime.value = time;
    uniforms.uVelocity.value = velocity;
    uniforms.uPressWave.value.z = pressWaveAge;
  }

  function resize(width: number, height: number): void {
    uniforms.uRes.value.set(width, height);
  }

  return { mesh, setStyle, update, resize };
}
