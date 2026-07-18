// Bootstrap: seed from URL -> Style -> init modules -> render loop.

import { createStage } from './render/stage';
import { createBackground } from './render/background';
import { createKeyboard, getKeyTopWorld, setupEnvironment, updateLights } from './render/keyboard';
import { triggerBackspace, triggerPress, updateKeyAnims, type KeyAnimHooks } from './render/keyAnim';
import { createParticleSystem } from './render/particles';
import { createQualityGovernor } from './state/quality';
import { createVelocityTracker } from './input/velocity';
import { initKeyInput, onKeyEvent } from './input/keys';
import { initAudioEngine, noteOn, noteOnBackspace, setAudioStyle } from './audio/engine';
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

const particles = createParticleSystem(stage, seed);
initAudioEngine();
setAudioStyle(currentStyle);

const quality = createQualityGovernor();
const velocity = createVelocityTracker();
const startTime = performance.now() / 1000;
let lastBackspaceTime = -Infinity;

const hooks: KeyAnimHooks = {
  spawnExplode: (def, style, v, large) => {
    const origin = getKeyTopWorld(keyboard, def, style);
    particles.spawnBurst(origin, style, v, large, quality.multiplier);
  },
  spawnBackspace: (def, style) => {
    const origin = getKeyTopWorld(keyboard, def, style);
    particles.spawnBackspaceRing(origin, style);
  },
  playSound: (def, style, v) => noteOn(style, def, v),
  playBackspaceSound: (def, style) => noteOnBackspace(style, def),
};

initKeyInput(canvas);
onKeyEvent(({ key, isDown }) => {
  if (!isDown) return; // keyup has no extra visual — return is time-based
  const clock = performance.now() / 1000 - startTime;
  velocity.recordPress(clock);
  if (key.backspace) {
    lastBackspaceTime = clock;
    triggerBackspace(key, currentStyle, clock, hooks);
  } else {
    triggerPress(key, currentStyle, velocity.v, clock, hooks);
  }
});

window.addEventListener('resize', () => {
  background.resize(window.innerWidth, window.innerHeight);
});

let booted = false;
let lastFrameMs = performance.now();

function fadeSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.style.transition = 'opacity 400ms ease';
  splash.style.opacity = '0';
  window.setTimeout(() => splash.remove(), 450);
}

function loop(): void {
  requestAnimationFrame(loop);

  const nowMs = performance.now();
  const dtMs = nowMs - lastFrameMs;
  lastFrameMs = nowMs;
  const clock = nowMs / 1000 - startTime;

  // 2. velocity smoothing
  velocity.update(clock);

  // 3. quality governor
  quality.update(dtMs);

  // 5. key animations
  updateKeyAnims(keyboard, currentStyle, clock);

  // 6. particle uniforms
  particles.update(clock, currentStyle, velocity.v, stage);

  // 7. background uniforms
  const pressWaveAge = clock - lastBackspaceTime;
  background.update(clock, velocity.v, pressWaveAge);

  // 8. render
  stage.render();

  if (!booted) {
    booted = true;
    requestAnimationFrame(fadeSplash);
  }
}

stage.renderer.compile(stage.scene, stage.camera);
loop();
