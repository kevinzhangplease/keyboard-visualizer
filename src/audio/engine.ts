// AudioContext lifecycle, master chain (dry/reverb/delay -> compressor -> master), resume-on-gesture (§7.4).

import { rngFromSeed } from '../core/prng';
import type { KeyDef } from '../input/layout';
import type { Style } from '../style/types';
import { keyToMidi, midiToFreq } from './music';
import { spawnReverseVoice, spawnVoice } from './voice';

export interface AudioGraph {
  context: AudioContext;
  voiceBus: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  delayNode: DelayNode;
  noiseBuffer: AudioBuffer;
}

const MAX_VOICES = 24;

let graph: AudioGraph | null = null;
let resumeAttached = false;
const activeVoices: { stop: () => void }[] = [];

function buildNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate; // 1s, looped
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = rngFromSeed(0x5eed01);
  for (let i = 0; i < length; i++) data[i] = rng() * 2 - 1;
  return buffer;
}

function buildReverbImpulse(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 2.5);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  const seeds = [0xc0ffee, 0x7331];
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const rng = rngFromSeed(seeds[ch]!);
    for (let i = 0; i < length; i++) {
      const t = i / context.sampleRate;
      data[i] = (rng() * 2 - 1) * Math.pow(1 - t / 2.5, 2.8);
    }
  }
  return buffer;
}

function buildGraph(context: AudioContext): AudioGraph {
  const voiceBus = context.createGain();

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;

  voiceBus.connect(compressor);

  const reverbSend = context.createGain();
  reverbSend.gain.value = 0;
  const convolver = context.createConvolver();
  convolver.buffer = buildReverbImpulse(context);
  voiceBus.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(compressor);

  const delaySend = context.createGain();
  delaySend.gain.value = 0;
  const delayNode = context.createDelay(1.0);
  delayNode.delayTime.value = 0.3;
  const delayFeedback = context.createGain();
  delayFeedback.gain.value = 0.35;
  const delayFilter = context.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 2400;

  voiceBus.connect(delaySend);
  delaySend.connect(delayNode);
  delayNode.connect(delayFilter);
  delayFilter.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayFilter.connect(compressor);

  compressor.connect(masterGain);
  masterGain.connect(context.destination);

  return { context, voiceBus, reverbSend, delaySend, delayNode, noiseBuffer: buildNoiseBuffer(context) };
}

function ensureContext(): AudioGraph {
  if (!graph) {
    const context = new AudioContext();
    graph = buildGraph(context);
  }
  return graph;
}

function attachResumeHandlers(): void {
  if (resumeAttached) return;
  resumeAttached = true;
  const resume = (): void => {
    const g = ensureContext();
    if (g.context.state !== 'running') {
      g.context.resume().catch(() => {
        /* resumed on a later gesture instead */
      });
    }
  };
  window.addEventListener('keydown', resume);
  window.addEventListener('pointerdown', resume);
}

function registerVoice(stop: () => void): void {
  activeVoices.push({ stop });
  if (activeVoices.length > MAX_VOICES) {
    activeVoices.shift()?.stop();
  }
}

function withRunningContext(play: (g: AudioGraph) => void): void {
  const g = ensureContext();
  if (g.context.state === 'running') {
    play(g);
  } else {
    g.context
      .resume()
      .then(() => play(g))
      .catch(() => {
        /* first keypress didn't carry a valid gesture yet; next one will */
      });
  }
}

export function initAudioEngine(): void {
  attachResumeHandlers();
}

export function noteOn(style: Style, def: KeyDef, velocity: number): void {
  withRunningContext((g) => {
    const freq = midiToFreq(keyToMidi(def, style));
    registerVoice(spawnVoice(g, style, freq, { velocity, large: def.large }));
  });
}

export function noteOnBackspace(style: Style, def: KeyDef): void {
  withRunningContext((g) => {
    const freq = midiToFreq(keyToMidi(def, style));
    registerVoice(spawnReverseVoice(g, style, freq));
  });
}

export function setAudioStyle(style: Style): void {
  if (!graph) return;
  const now = graph.context.currentTime;
  graph.reverbSend.gain.setTargetAtTime(style.reverbMix, now, 0.2);
  graph.delaySend.gain.setTargetAtTime(style.delayMix, now, 0.2);
  graph.delayNode.delayTime.setTargetAtTime(style.delayTime, now, 0.2);
}
