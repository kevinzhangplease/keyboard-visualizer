// Bootstrap: seed from URL -> Style -> init modules -> render loop.

import { createStage } from './render/stage';
import { createBackground } from './render/background';
import { createKeyboard, setupEnvironment, updateLights } from './render/keyboard';
import { triggerBackspace, triggerPress, updateKeyAnims } from './render/keyAnim';
import { createQualityGovernor } from './state/quality';
import { initKeyInput, onKeyEvent } from './input/keys';
import { styleFromSeed } from './style/blend';
import { getSeedFromURL } from './core/seed';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);
const background = createBackground();
stage.scene.add(background.mesh);

const seed = getSeedFromURL();
const currentStyle = styleFromSeed(seed);
background.setStyle(currentStyle);

const keyboard = createKeyboard(stage, currentStyle);
updateLights(stage, currentStyle);
setupEnvironment(stage);

const quality = createQualityGovernor();
const startTime = performance.now() / 1000;

initKeyInput(canvas);
onKeyEvent(({ key, isDown }) => {
  if (!isDown) return; // keyup has no extra visual — return is time-based
  const clock = performance.now() / 1000 - startTime;
  if (key.backspace) {
    triggerBackspace(key, currentStyle, clock, {});
  } else {
    triggerPress(key, currentStyle, 0, clock, {});
  }
});

window.addEventListener('resize', () => {
  background.resize(window.innerWidth, window.innerHeight);
});

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

  // 3. quality governor
  quality.update(16.7);

  // 5. key animations
  updateKeyAnims(keyboard, currentStyle, clock);

  // 7. background uniforms (velocity + backspace dip land in Phase 4)
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
