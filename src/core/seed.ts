// URL seed encoding (?s=<base36>) and the five reserved named-theme seeds.

export const NAMED_SEEDS = {
  Mountains: 1,
  Ice: 2,
  Ocean: 3,
  Space: 4,
  Desert: 5,
} as const;

export const NAMED_SEED_LIST = [1, 2, 3, 4, 5] as const;

export function encodeSeed(n: number): string {
  return (n >>> 0).toString(36);
}

export function decodeSeed(s: string): number {
  const n = parseInt(s, 36);
  if (!Number.isFinite(n) || Number.isNaN(n)) return 1;
  return n >>> 0;
}

export function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  let n = a[0] as number;
  if (n <= 5) n += 5;
  return n;
}

export function getSeedFromURL(): number {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('s');
  if (s === null) return 1;
  return decodeSeed(s);
}

export function replaceSeedInURL(seed: number): void {
  const url = '?s=' + encodeSeed(seed);
  history.replaceState(null, '', url);
}
