// Bootstrap: seed from URL -> Style -> init modules -> render loop.

import { createStage } from './render/stage';
import { createBackground } from './render/background';
import {
  createKeyboard,
  getKeyTopWorld,
  setupEnvironment,
  updateLights,
  type Keyboard,
} from './render/keyboard';
import { triggerBackspace, triggerPress, updateKeyAnims, type KeyAnimHooks } from './render/keyAnim';
import { createParticleSystem } from './render/particles';
import { createQualityGovernor } from './state/quality';
import { createVelocityTracker } from './input/velocity';
import { createMorphController } from './state/transitions';
import { initKeyInput, onFunctionKey, onKeyEvent } from './input/keys';
import { initAudioEngine, noteOn, noteOnBackspace, setAudioStyle } from './audio/engine';
import { getSeedFromURL, NAMED_SEED_LIST } from './core/seed';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);
const background = createBackground();
stage.scene.add(background.mesh);

const seed = getSeedFromURL();
const morph = createMorphController(seed);
let currentStyle = morph.style;
background.setStyle(currentStyle);

const keyboard: Keyboard = createKeyboard(stage, currentStyle);
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

onFunctionKey((code) => {
  const clock = performance.now() / 1000 - startTime;
  const fMatch = /^F([1-5])$/.exec(code);
  if (!fMatch) return; // F6+ belong to the HUD (randomize/copy), wired in Phase 6
  const index = Number(fMatch[1]) - 1;
  morph.morphTo(NAMED_SEED_LIST[index]!, clock);
});

window.addEventListener('resize', () => {
  background.resize(window.innerWidth, window.innerHeight);
});

let booted = false;
let lastFrameMs = performance.now();
let lastAppliedStyle: typeof currentStyle | null = null;

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

  // 1. morph interpolation -> currentStyle
  const morphCompleted = morph.update(clock);
  currentStyle = morph.style;
  // lerpStyle() only allocates a new object while a morph is actively running, so a
  // reference check is a free "did anything change" test — skips redundant OKLCH work at idle.
  if (currentStyle !== lastAppliedStyle) {
    lastAppliedStyle = currentStyle;
    keyboard.applyMaterials(currentStyle);
    updateLights(stage, currentStyle);
    background.setStyle(currentStyle);
    setAudioStyle(currentStyle);
  }
  if (morphCompleted) {
    keyboard.rebuildGeometry(currentStyle);
    particles.setSeed(morph.seed);
  }

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
