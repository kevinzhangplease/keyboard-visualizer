// One synth voice: osc morph (sine/triangle/saw) + FM partial + noise + filter + envelope (§7.4).

import { smoothstep } from '../core/math';
import type { Style } from '../style/types';
import type { AudioGraph } from './engine';

interface VoiceCore {
  context: AudioContext;
  oscillators: OscillatorNode[];
  modulator: OscillatorNode;
  noiseSrc: AudioBufferSourceNode;
  lowpass: BiquadFilterNode;
  env: GainNode;
  baseCutoff: number;
}

function buildCore(graph: AudioGraph, style: Style, freq: number, velocity: number): VoiceCore {
  const { context, noiseBuffer } = graph;
  const now = context.currentTime;

  const s = style.oscShape;
  const sineGain = Math.max(0, 1 - 2 * s);
  const triGain = 1 - Math.abs(2 * s - 1);
  const sawGain = Math.max(0, 2 * s - 1);

  const sine = context.createOscillator();
  sine.type = 'sine';
  sine.frequency.value = freq;
  const sineG = context.createGain();
  sineG.gain.value = sineGain;
  sine.connect(sineG);

  const tri = context.createOscillator();
  tri.type = 'triangle';
  tri.frequency.value = freq;
  const triG = context.createGain();
  triG.gain.value = triGain;
  tri.connect(triG);

  const saw = context.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = freq;
  const sawG = context.createGain();
  sawG.gain.value = sawGain;
  saw.connect(sawG);

  const osc2 = context.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq;
  osc2.detune.value = style.detune;
  const osc2G = context.createGain();
  osc2G.gain.value = 0.5;
  osc2.connect(osc2G);

  const oscillators = [sine, tri, saw, osc2];

  const modulator = context.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.value = freq * 2.997;
  const modGain = context.createGain();
  modGain.gain.value = style.fmAmount * freq * 1.5;
  modulator.connect(modGain);
  for (const osc of oscillators) modGain.connect(osc.frequency);

  const noiseSrc = context.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = freq * 2;
  noiseFilter.Q.value = 1;
  const noiseGain = context.createGain();
  noiseGain.gain.value = style.noiseAmount * 0.3;
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  const sum = context.createGain();
  sineG.connect(sum);
  triG.connect(sum);
  sawG.connect(sum);
  osc2G.connect(sum);
  noiseGain.connect(sum);

  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = style.filterQ;
  const baseCutoff = style.filterCutoff * (1 + 2 * velocity);
  sum.connect(lowpass);

  const env = context.createGain();
  env.gain.setValueAtTime(0, now);
  lowpass.connect(env);
  env.connect(graph.voiceBus);

  for (const osc of oscillators) osc.start(now);
  modulator.start(now);
  noiseSrc.start(now);

  return { context, oscillators, modulator, noiseSrc, lowpass, env, baseCutoff };
}

function scheduleStop(core: VoiceCore, stopTime: number): void {
  const allOscs = [...core.oscillators, core.modulator];
  for (const osc of allOscs) osc.stop(stopTime);
  core.noiseSrc.stop(stopTime);
  const delayMs = Math.max(0, (stopTime - core.context.currentTime) * 1000 + 50);
  window.setTimeout(() => {
    for (const osc of allOscs) osc.disconnect();
    core.noiseSrc.disconnect();
    core.lowpass.disconnect();
    core.env.disconnect();
  }, delayMs);
}

function makeEarlyStop(core: VoiceCore): () => void {
  return () => {
    const t = core.context.currentTime;
    core.env.gain.cancelScheduledValues(t);
    const current = core.env.gain.value;
    core.env.gain.setValueAtTime(current, t);
    core.env.gain.setTargetAtTime(0, t, 0.02);
    scheduleStop(core, t + 0.08);
  };
}

// Standard press voice (spec §7.4).
export function spawnVoice(
  graph: AudioGraph,
  style: Style,
  freq: number,
  opts: { velocity: number; large: boolean },
): () => void {
  const { velocity, large } = opts;
  const core = buildCore(graph, style, freq, velocity);
  const now = core.context.currentTime;

  const sweepAmount = smoothstep(0.5, 1.0, style.oscShape) * 2.0;
  core.lowpass.frequency.setValueAtTime(core.baseCutoff * (1 + sweepAmount), now);
  core.lowpass.frequency.setTargetAtTime(core.baseCutoff, now, Math.max(style.release / 4, 0.001));

  const peak = 0.22 * (large ? 1.33 : 1) * Math.pow(10, (3 * velocity) / 20);
  const attack = Math.max(style.attack, 0.001);
  core.env.gain.linearRampToValueAtTime(peak, now + attack);
  const release = large ? style.release * 1.4 : style.release;
  core.env.gain.setTargetAtTime(0, now + attack, Math.max(release / 6, 0.001));

  const stopTime = now + attack + release * 1.5;
  scheduleStop(core, stopTime);

  return makeEarlyStop(core);
}

// Backspace reverse voice: swell then cut, downward pitch glide, closing filter (spec §6.4).
export function spawnReverseVoice(graph: AudioGraph, style: Style, freq: number): () => void {
  const core = buildCore(graph, style, freq, 0);
  const now = core.context.currentTime;

  const endFreq = freq * Math.pow(2, -5 / 12);
  for (const osc of core.oscillators) {
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setValueAtTime(osc.frequency.value, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), now + 0.24);
  }
  core.modulator.frequency.setValueAtTime(core.modulator.frequency.value, now);
  core.modulator.frequency.exponentialRampToValueAtTime(
    Math.max(endFreq * 2.997, 1),
    now + 0.24,
  );

  core.lowpass.frequency.setValueAtTime(core.baseCutoff * 2.0, now);
  core.lowpass.frequency.linearRampToValueAtTime(core.baseCutoff * 0.6, now + 0.24);

  const peak = 0.22;
  core.env.gain.linearRampToValueAtTime(peak, now + 0.24);
  core.env.gain.linearRampToValueAtTime(0, now + 0.27);

  const stopTime = now + 0.3;
  scheduleStop(core, stopTime);

  return makeEarlyStop(core);
}
