// Shared numeric helpers: interpolation, clamping, easing, decay.

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutBack(t: number, s = 1.7): number {
  const p = t - 1;
  return p * p * ((s + 1) * p + s) + 1;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeHalfSine(t: number): number {
  return Math.sin(clamp(t, 0, 1) * Math.PI);
}

// Analytic exponential decay toward 0 with time constant tau, evaluated at elapsed time t.
export function expDecay(t: number, tau: number): number {
  return Math.exp(-t / tau);
}
