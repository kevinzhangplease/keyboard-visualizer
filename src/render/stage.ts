// Renderer, scene, camera, base lights, and the bloom post-processing chain (spec §6.1).

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Style } from '../style/types';

// Top-down "interface" framing: far overhead + a narrow (telephoto-like) FOV nearly
// eliminates near/far perspective falloff, so every row of keys reads at a uniform size.
const CAMERA_BASE_POSITION = new THREE.Vector3(0, 28, 2);
const CAMERA_LOOK_AT = new THREE.Vector3(0, 0, 0);
const CAMERA_FOV = 24;

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
  pointLight: THREE.PointLight;
  resize: () => void;
  render: () => void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0b0d13, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  // Looking almost straight down puts the view direction close to parallel with the default
  // (0,1,0) up vector — lookAt() then has to guess a "right" axis, which reads on screen as an
  // arbitrary roll/skew. Pinning up to world -Z fixes the orientation: the number row (further
  // in -Z) reads at screen-top and the space bar (furthest in +Z) at screen-bottom, like a
  // keyboard reference diagram.
  camera.up.set(0, 0, -1);
  camera.position.copy(CAMERA_BASE_POSITION);
  camera.lookAt(CAMERA_LOOK_AT);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
  directionalLight.position.set(5, 8, 6);
  const pointLight = new THREE.PointLight(0xffffff, 0.6, 20);
  pointLight.position.set(0, -1.5, 2);
  scene.add(ambientLight, directionalLight, pointLight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
    0.55,
    0.6,
    0.75,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w * 0.5, h * 0.5);
  }
  window.addEventListener('resize', resize);

  function render(): void {
    composer.render();
  }

  return {
    renderer,
    scene,
    camera,
    composer,
    bloomPass,
    ambientLight,
    directionalLight,
    pointLight,
    resize,
    render,
  };
}

// Idle orbit (spec §5 camera, §2 camDriftAmp/camDriftSpeed, §8.2 driftScale). `driftScale`
// lerps 1 (idle) <-> 0.4 (typing) in the caller. Yaw is derived from camDriftAmp — Space's
// large amplitude naturally produces the sheet's "~3° yaw", smaller-amplitude themes get less.
export function updateCameraDrift(stage: Stage, style: Style, clock: number, driftScale: number): void {
  const amp = style.camDriftAmp * driftScale;
  const freq = style.camDriftSpeed * Math.PI * 2;
  const x = CAMERA_BASE_POSITION.x + Math.sin(clock * freq) * amp;
  const y = CAMERA_BASE_POSITION.y + Math.cos(clock * freq * 0.7) * amp * 0.5;
  stage.camera.position.set(x, y, CAMERA_BASE_POSITION.z);

  const yawDeg = style.camDriftAmp * 8.57 * driftScale;
  const yaw = THREE.MathUtils.degToRad(yawDeg) * Math.sin(clock * freq * 0.5);
  stage.camera.lookAt(CAMERA_LOOK_AT);
  stage.camera.rotateY(yaw);
}

// Bloom strength gets a live velocity lift (spec §7.3: "bloom strength·(1+0.25v)").
// `lowRes` (quality tier >= 2, spec §7.2) halves the bloom render target resolution again.
export function updateBloom(stage: Stage, style: Style, velocity: number, lowRes: boolean): void {
  stage.bloomPass.strength = style.bloomStrength * (1 + 0.25 * velocity);
  stage.bloomPass.threshold = style.bloomThreshold;
  const scale = lowRes ? 0.25 : 0.5;
  stage.bloomPass.resolution.set(window.innerWidth * scale, window.innerHeight * scale);
}
