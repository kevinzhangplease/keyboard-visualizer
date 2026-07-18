// Theme dots, dice, seed chip — minimal DOM chrome (spec §8.3, exact layout/behavior).

import { ANCHOR_NAMES, ANCHOR_PALETTES } from '../style/anchors';
import { encodeSeed } from '../core/seed';
import { toCssOklch } from '../style/color';
import type { Style } from '../style/types';

const IDLE_HIDE_MS = 4000;
const DICE_SPIN_MS = 200;
const COPY_FLASH_MS = 1200;

export interface Hud {
  update: (style: Style, seed: number) => void;
  flashChip: () => void;
}

export interface HudHandlers {
  onSelectAnchor: (seedIndex: number) => void;
  onRandomize: () => void;
}

function buildDiceSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 18 18');
  svg.setAttribute('class', 'hud-dice');
  svg.innerHTML = `
    <rect x="1" y="1" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" />
    <circle cx="5" cy="5" r="1.1" fill="currentColor" />
    <circle cx="13" cy="5" r="1.1" fill="currentColor" />
    <circle cx="9" cy="9" r="1.1" fill="currentColor" />
    <circle cx="5" cy="13" r="1.1" fill="currentColor" />
    <circle cx="13" cy="13" r="1.1" fill="currentColor" />
  `;
  return svg;
}

export function createHud(container: HTMLElement, handlers: HudHandlers): Hud {
  container.innerHTML = '';

  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'hud-dots';
  const dots: HTMLSpanElement[] = ANCHOR_NAMES.map((name, i) => {
    const dot = document.createElement('span');
    dot.className = 'hud-dot';
    dot.title = name;
    dot.style.background = toCssOklch(ANCHOR_PALETTES[i]![3]);
    dot.addEventListener('click', () => handlers.onSelectAnchor(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const sep1 = document.createElement('span');
  sep1.className = 'hud-sep';
  sep1.textContent = '·';

  const dice = buildDiceSvg();
  dice.addEventListener('click', () => {
    dice.classList.add('spin');
    window.setTimeout(() => dice.classList.remove('spin'), DICE_SPIN_MS);
    handlers.onRandomize();
  });

  const sep2 = document.createElement('span');
  sep2.className = 'hud-sep';
  sep2.textContent = '·';

  const chip = document.createElement('span');
  chip.className = 'hud-chip';

  let lastSeed = 1;
  let chipRevertTimer: number | null = null;

  function chipLabel(seed: number): string {
    return 's=' + encodeSeed(seed);
  }

  // Show/hide on mouse idle.
  let idleTimer: number | null = null;
  function scheduleIdleFade(): void {
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => container.classList.add('idle-faded'), IDLE_HIDE_MS);
  }
  function wakeFromIdle(): void {
    container.classList.remove('idle-faded');
    scheduleIdleFade();
  }

  function flashChip(): void {
    wakeFromIdle(); // "flashes the chip even if hidden" (§8.3 F7)
    chip.textContent = 'copied ✓';
    if (chipRevertTimer !== null) window.clearTimeout(chipRevertTimer);
    chipRevertTimer = window.setTimeout(() => {
      chip.textContent = chipLabel(lastSeed);
      chipRevertTimer = null;
    }, COPY_FLASH_MS);
  }

  chip.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).catch(() => {
      /* clipboard unavailable — flash still gives visual feedback */
    });
    flashChip();
  });

  container.appendChild(dotsWrap);
  container.appendChild(sep1);
  container.appendChild(dice);
  container.appendChild(sep2);
  container.appendChild(chip);

  window.addEventListener('mousemove', wakeFromIdle);
  container.addEventListener('mouseenter', () => container.classList.add('hovered'));
  container.addEventListener('mouseleave', () => container.classList.remove('hovered'));
  scheduleIdleFade();

  function update(style: Style, seed: number): void {
    lastSeed = seed;
    if (chipRevertTimer === null) chip.textContent = chipLabel(seed);

    dots.forEach((dot, i) => dot.classList.toggle('active', seed === i + 1));
    container.style.setProperty('--hud-ring', toCssOklch(style.palette[5]));
    chip.style.color = toCssOklch(style.palette[5], 0.8);
    dice.style.color = toCssOklch(style.palette[5], 0.7);
  }

  return { update, flashChip };
}
