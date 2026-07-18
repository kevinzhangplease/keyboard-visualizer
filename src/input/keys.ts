// keydown/keyup handling: preventDefault policy (spec §9.2) and auto-repeat filter (§9.3).

import { KEY_BY_CODE, type KeyDef } from './layout';

export interface KeyVisualEvent {
  key: KeyDef;
  isDown: boolean;
  raw: KeyboardEvent;
}

type KeyVisualHandler = (event: KeyVisualEvent) => void;
type FunctionKeyHandler = (code: string, raw: KeyboardEvent) => void;

const visualHandlers: KeyVisualHandler[] = [];
const fKeyHandlers: FunctionKeyHandler[] = [];

export function onKeyEvent(handler: KeyVisualHandler): void {
  visualHandlers.push(handler);
}

export function onFunctionKey(handler: FunctionKeyHandler): void {
  fKeyHandlers.push(handler);
}

const F_KEY_RE = /^F([1-9]|1[0-2])$/;

function handleKeyDown(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey) return; // never fight OS/browser combos

  const def = KEY_BY_CODE.get(e.code);
  const isFKey = F_KEY_RE.test(e.code);

  if (def || isFKey) e.preventDefault();
  if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();

  if (isFKey) {
    for (const h of fKeyHandlers) h(e.code, e);
    return;
  }

  if (e.repeat) return; // held keys fire once
  if (!def) return;

  for (const h of visualHandlers) h({ key: def, isDown: true, raw: e });
}

function handleKeyUp(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey) return;
  const def = KEY_BY_CODE.get(e.code);
  if (!def) return;
  for (const h of visualHandlers) h({ key: def, isDown: false, raw: e });
}

export function initKeyInput(canvas: HTMLCanvasElement): void {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
