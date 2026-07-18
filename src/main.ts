// Bootstrap: seed from URL -> Style -> init modules -> render loop.
import * as THREE from 'three';

const canvas = document.getElementById('scene') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0b0d13, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5.2, 12.5);
camera.lookAt(0, 0.4, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function fadeSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.style.transition = 'opacity 400ms ease';
  splash.style.opacity = '0';
  window.setTimeout(() => splash.remove(), 450);
}

let booted = false;

function loop(): void {
  requestAnimationFrame(loop);
  renderer.render(scene, camera);
  if (!booted) {
    booted = true;
    requestAnimationFrame(fadeSplash);
  }
}

renderer.compile(scene, camera);
loop();
