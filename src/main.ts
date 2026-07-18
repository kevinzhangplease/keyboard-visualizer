// Bootstrap: seed from URL -> Style -> init modules -> render loop.

import { createStage } from './render/stage';
import { createBackground } from './render/background';
import { styleFromSeed } from './style/blend';
import { getSeedFromURL } from './core/seed';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);
const background = createBackground();
stage.scene.add(background.mesh);

const seed = getSeedFromURL();
const currentStyle = styleFromSeed(seed);
background.setStyle(currentStyle);

window.addEventListener('resize', () => {
  background.resize(window.innerWidth, window.innerHeight);
});

const startTime = performance.now() / 1000;
let booted = false;

function fadeSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.style.transition = 'opacity 400ms ease';
  splash.style.opacity = '0';
  window.setTimeout(() => splash.remove(), 450);
}

function loop(): void {
  requestAnimationFrame(loop);

  const clock = performance.now() / 1000 - startTime;

  // 7. background uniforms (velocity + backspace dip land in later phases; 0 for now)
  background.update(clock, 0, 1);

  // 8. render
  stage.render();

  if (!booted) {
    booted = true;
    requestAnimationFrame(fadeSplash);
  }
}

stage.renderer.compile(stage.scene, stage.camera);
loop();
