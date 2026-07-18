// Seeded PRNG. Never use Math.random() anywhere in src/ — always go through rngFromSeed().
// splitmix32 / sfc32 are standard public-domain implementations (bryc's gist "Fast JS PRNGs").

export function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return t >>> 0;
  };
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
  let sa = a >>> 0;
  let sb = b >>> 0;
  let sc = c >>> 0;
  let sd = d >>> 0;
  return function (): number {
    sa >>>= 0;
    sb >>>= 0;
    sc >>>= 0;
    sd >>>= 0;
    let t = (sa + sb) | 0;
    sd = (sd + 1) | 0;
    t = (t + sd) | 0;
    sa = sb ^ (sb >>> 9);
    sb = (sc + (sc << 3)) | 0;
    sc = (sc << 21) | (sc >>> 11);
    sc = (sc + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed: number): () => number {
  const sm = splitmix32(seed >>> 0);
  return sfc32(sm(), sm(), sm(), sm());
}
