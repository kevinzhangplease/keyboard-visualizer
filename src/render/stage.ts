// Renderer, scene, camera, base lights, and the bloom post-processing chain (spec §6.1).

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

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
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5.2, 12.5);
  camera.lookAt(0, 0.4, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
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
