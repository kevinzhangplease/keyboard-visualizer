// ANSI QWERTY layout table (spec §5), hardcoded as data. 5 rows, each summing to 15 world units.

export interface KeyDef {
  code: string; // KeyboardEvent.code
  label: string;
  x: number;
  z: number;
  width: number;
  large: boolean;
  space: boolean;
  backspace: boolean;
}

interface RowKeySpec {
  code: string;
  label: string;
  width: number;
}

function buildRow(z: number, keys: readonly RowKeySpec[]): KeyDef[] {
  let cursor = -7.5;
  const out: KeyDef[] = [];
  for (const k of keys) {
    const x = cursor + k.width / 2;
    out.push({
      code: k.code,
      label: k.label,
      x,
      z,
      width: k.width,
      large: k.width >= 1.75,
      space: k.code === 'Space',
      backspace: k.code === 'Backspace',
    });
    cursor += k.width;
  }
  return out;
}

const ROW0: readonly RowKeySpec[] = [
  { code: 'Backquote', label: '`', width: 1 },
  { code: 'Digit1', label: '1', width: 1 },
  { code: 'Digit2', label: '2', width: 1 },
  { code: 'Digit3', label: '3', width: 1 },
  { code: 'Digit4', label: '4', width: 1 },
  { code: 'Digit5', label: '5', width: 1 },
  { code: 'Digit6', label: '6', width: 1 },
  { code: 'Digit7', label: '7', width: 1 },
  { code: 'Digit8', label: '8', width: 1 },
  { code: 'Digit9', label: '9', width: 1 },
  { code: 'Digit0', label: '0', width: 1 },
  { code: 'Minus', label: '-', width: 1 },
  { code: 'Equal', label: '=', width: 1 },
  { code: 'Backspace', label: 'Backspace', width: 2 },
];

const ROW1: readonly RowKeySpec[] = [
  { code: 'Tab', label: 'Tab', width: 1.5 },
  { code: 'KeyQ', label: 'Q', width: 1 },
  { code: 'KeyW', label: 'W', width: 1 },
  { code: 'KeyE', label: 'E', width: 1 },
  { code: 'KeyR', label: 'R', width: 1 },
  { code: 'KeyT', label: 'T', width: 1 },
  { code: 'KeyY', label: 'Y', width: 1 },
  { code: 'KeyU', label: 'U', width: 1 },
  { code: 'KeyI', label: 'I', width: 1 },
  { code: 'KeyO', label: 'O', width: 1 },
  { code: 'KeyP', label: 'P', width: 1 },
  { code: 'BracketLeft', label: '[', width: 1 },
  { code: 'BracketRight', label: ']', width: 1 },
  { code: 'Backslash', label: '\\', width: 1.5 },
];

const ROW2: readonly RowKeySpec[] = [
  { code: 'CapsLock', label: 'Caps', width: 1.75 },
  { code: 'KeyA', label: 'A', width: 1 },
  { code: 'KeyS', label: 'S', width: 1 },
  { code: 'KeyD', label: 'D', width: 1 },
  { code: 'KeyF', label: 'F', width: 1 },
  { code: 'KeyG', label: 'G', width: 1 },
  { code: 'KeyH', label: 'H', width: 1 },
  { code: 'KeyJ', label: 'J', width: 1 },
  { code: 'KeyK', label: 'K', width: 1 },
  { code: 'KeyL', label: 'L', width: 1 },
  { code: 'Semicolon', label: ';', width: 1 },
  { code: 'Quote', label: "'", width: 1 },
  { code: 'Enter', label: 'Enter', width: 2.25 },
];

const ROW3: readonly RowKeySpec[] = [
  { code: 'ShiftLeft', label: 'Shift', width: 2.25 },
  { code: 'KeyZ', label: 'Z', width: 1 },
  { code: 'KeyX', label: 'X', width: 1 },
  { code: 'KeyC', label: 'C', width: 1 },
  { code: 'KeyV', label: 'V', width: 1 },
  { code: 'KeyB', label: 'B', width: 1 },
  { code: 'KeyN', label: 'N', width: 1 },
  { code: 'KeyM', label: 'M', width: 1 },
  { code: 'Comma', label: ',', width: 1 },
  { code: 'Period', label: '.', width: 1 },
  { code: 'Slash', label: '/', width: 1 },
  { code: 'ShiftRight', label: 'Shift', width: 2.75 },
];

const ROW4: readonly RowKeySpec[] = [
  { code: 'ControlLeft', label: 'Ctrl', width: 1.25 },
  { code: 'MetaLeft', label: 'Meta', width: 1.25 },
  { code: 'AltLeft', label: 'Alt', width: 1.25 },
  { code: 'Space', label: '', width: 6.25 },
  { code: 'AltRight', label: 'Alt', width: 1.25 },
  { code: 'MetaRight', label: 'Meta', width: 1.25 },
  { code: 'ContextMenu', label: 'Menu', width: 1.25 },
  { code: 'ControlRight', label: 'Ctrl', width: 1.25 },
];

export const KEY_LAYOUT: readonly KeyDef[] = [
  ...buildRow(-2, ROW0),
  ...buildRow(-1, ROW1),
  ...buildRow(0, ROW2),
  ...buildRow(1, ROW3),
  ...buildRow(2, ROW4),
];

export const KEY_BY_CODE: ReadonlyMap<string, KeyDef> = new Map(
  KEY_LAYOUT.map((k) => [k.code, k]),
);

export function isLargeKey(width: number): boolean {
  return width >= 1.75;
}
