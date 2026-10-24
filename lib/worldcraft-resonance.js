import { worldcraftTargetBody } from './worldcraft-model.js';

// Acoustic layer for Worldcraft. Nothing here writes Havok coefficients.
// Major pentatonic, equal temperament. Degrees 0–2 are the authored default
// so a bank, then a ramp, then the plate plays C4, D4, E4 in that order.
export const WORLDCRAFT_SCALE = Object.freeze([
  Object.freeze({ degree: 0, name: 'C4', hz: 261.6256 }),
  Object.freeze({ degree: 1, name: 'D4', hz: 293.6648 }),
  Object.freeze({ degree: 2, name: 'E4', hz: 329.6276 }),
  Object.freeze({ degree: 3, name: 'G4', hz: 391.9954 }),
  Object.freeze({ degree: 4, name: 'A4', hz: 440 }),
]);
// Callbacks closer than this belong to the same impact. 5 solver frames at 120 Hz.
export const WORLDCRAFT_RESONANCE_HOLD = 5 / 120;
// Smoothstep reaches 1 at this projectile speed (m/s). Launch at charge 0.55 is about 26.
export const WORLDCRAFT_RESONANCE_FULL_SPEED = 22;
const TAIL = 2.05;

// Metal uses the free-bar partials (inharmonic, long). Timber is a short near-harmonic knock.
// The orc thunk is fixed and off the scale.
export const RESONANCE_VOICES = Object.freeze({
  metal: Object.freeze({
    partials: Object.freeze([
      Object.freeze({ ratio: 1, gain: 0.52, decay: 1.85 }),
      Object.freeze({ ratio: 2.76, gain: 0.34, decay: 1.25 }),
      Object.freeze({ ratio: 5.404, gain: 0.18, decay: 0.82 }),
      Object.freeze({ ratio: 8.933, gain: 0.09, decay: 0.48 }),
    ]),
    noise: 0.06,
    noiseDecay: 0.025,
  }),
  timber: Object.freeze({
    partials: Object.freeze([
      Object.freeze({ ratio: 1, gain: 0.86, decay: 0.16 }),
      Object.freeze({ ratio: 2, gain: 0.22, decay: 0.08 }),
      Object.freeze({ ratio: 2.98, gain: 0.07, decay: 0.045 }),
    ]),
    noise: 0.28,
    noiseDecay: 0.014,
  }),
  thunk: Object.freeze({
    hz: 82,
    partials: Object.freeze([
      Object.freeze({ ratio: 1, gain: 0.9, decay: 0.12 }),
      Object.freeze({ ratio: 1.47, gain: 0.28, decay: 0.06 }),
    ]),
    noise: 0.4,
    noiseDecay: 0.018,
  }),
});

const noiseCache = new WeakMap();

export function impactGain(speed) {
  if (!Number.isFinite(speed) || speed <= 0) return 0;
  const t = Math.min(1, speed / WORLDCRAFT_RESONANCE_FULL_SPEED);
  return t * t * (3 - 2 * t);
}

export function resonanceOf(world, body) {
  if (typeof body !== 'string' || !body || !world) return null;
  const target = world.rules?.target;
  if (target && body === worldcraftTargetBody(target.id)) {
    if (target.motion?.kind === 'segment-shuttle') {
      const tone = WORLDCRAFT_SCALE[4];
      return { piece: target.id, role: 'bell', material: 'metal', degree: tone.degree, note: tone.name, hz: tone.hz };
    }
    return { piece: target.id, role: 'orc', material: 'thunk', degree: null, note: 'thunk', hz: RESONANCE_VOICES.thunk.hz };
  }
  const prefix = 'worldcraft-object-';
  if (!body.startsWith(prefix)) return null;
  const object = world.objects?.find(item => item.id === body.slice(prefix.length));
  if (!object?.voice) return null;
  const tone = WORLDCRAFT_SCALE[object.voice.degree];
  if (!tone || tone.degree !== object.voice.degree) return null;
  return { piece: object.id, role: object.kind, material: object.voice.material, degree: object.voice.degree, note: tone.name, hz: tone.hz };
}

export function formatResonanceImpact(impact) {
  const note = impact.material === 'thunk' ? 'thunk' : `${impact.note} ${impact.material}`;
  return `${impact.piece} · ${impact.time.toFixed(3)} s · ${impact.speed.toFixed(2)} m/s · ${note}`;
}

/** One sound per impact. Solver callbacks inside the hold window only increment the count. */
export function createResonanceEar() {
  let impacts = [];
  let open = new Map();
  let callbacks = 0;
  let resonantCallbacks = 0;
  return {
    begin() { impacts = []; open = new Map(); callbacks = 0; resonantCallbacks = 0; },
    hear({ body, time, speed, world }) {
      callbacks += 1;
      const spec = resonanceOf(world, body);
      if (!spec) return null;
      resonantCallbacks += 1;
      const when = Number.isFinite(time) ? time : 0;
      const prior = open.get(body);
      if (prior && when - prior.last <= WORLDCRAFT_RESONANCE_HOLD) {
        prior.last = when;
        prior.impact.callbacks += 1;
        prior.impact.last = when;
        return null;
      }
      const impact = {
        piece: spec.piece, role: spec.role, body, time: when, last: when,
        speed: Number.isFinite(speed) ? speed : 0, material: spec.material, degree: spec.degree,
        note: spec.note, hz: spec.hz, gain: impactGain(speed), callbacks: 1,
      };
      open.set(body, { last: when, impact });
      impacts.push(impact);
      return impact;
    },
    snapshot() {
      const copied = impacts.map(impact => ({ ...impact }));
      return {
        impacts: copied,
        sounds: copied.length,
        callbacks,
        resonantCallbacks,
        collapsed: resonantCallbacks - copied.length,
        maxCallbacks: copied.reduce((max, impact) => Math.max(max, impact.callbacks), 0),
      };
    },
  };
}

function noiseBuffer(ctx, seconds) {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const length = Math.max(1, Math.ceil(ctx.sampleRate * Math.max(seconds, 0.05)));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x6d2b79f5;
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    data[i] = state / 4294967296 * 2 - 1;
  }
  noiseCache.set(ctx, buffer);
  return buffer;
}

/** Schedule one impact on a live or offline audio context. Gain is already on the impact. */
export function scheduleImpact(ctx, when, impact) {
  const voice = RESONANCE_VOICES[impact.material];
  const nodes = [];
  if (!voice || !(impact.gain > 0) || !(impact.hz > 0)) return nodes;
  const start = Math.max(0, when);
  const level = impact.gain * 0.42;
  for (const partial of voice.partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = Math.max(0.0002, level * partial.gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(impact.hz * partial.ratio, start);
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + partial.decay);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + partial.decay + 0.02);
    nodes.push(osc);
  }
  if (!(voice.noise > 0)) return nodes;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const peak = Math.max(0.0002, level * voice.noise);
  source.buffer = noiseBuffer(ctx, voice.noiseDecay);
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.noiseDecay);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + voice.noiseDecay + 0.01);
  nodes.push(source);
  return nodes;
}

/** Counts audio nodes started by resonant impacts and nodes stopped on release. */
export function createVoiceLedger() {
  const active = new Set();
  let started = 0, cleaned = 0, finished = 0;
  return {
    watch(node) {
      if (!node) return;
      started += 1;
      active.add(node);
      const done = () => { if (active.delete(node)) finished += 1; };
      if (typeof node.addEventListener === 'function') node.addEventListener('ended', done);
      else node.onended = done;
    },
    release() {
      const batch = [...active];
      active.clear();
      for (const node of batch) {
        try { node.stop(); } catch { /* already stopped */ }
        try { node.disconnect(); } catch { /* already disconnected */ }
        cleaned += 1;
      }
      return batch.length;
    },
    counts() { return { started, cleaned, finished, active: active.size }; },
  };
}

export function audioBufferToWav(buffer) {
  const samples = buffer.getChannelData(0);
  const data = samples.length * 2;
  const out = new ArrayBuffer(44 + data);
  const view = new DataView(out);
  const write = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, 'RIFF');
  view.setUint32(4, 36 + data, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, buffer.numberOfChannels ?? 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, data, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Uint8Array(out);
}

export async function renderResonanceWav(impacts, options = {}) {
  if (!Array.isArray(impacts) || !impacts.length) throw new Error('A resonant render needs at least one impact');
  const Ctx = options.OfflineAudioContext ?? globalThis.OfflineAudioContext;
  if (typeof Ctx !== 'function') throw new Error('OfflineAudioContext is unavailable');
  const sampleRate = options.sampleRate ?? 44100;
  const end = impacts.reduce((max, impact) => Math.max(max, impact.time), 0) + (options.tail ?? TAIL);
  const ctx = new Ctx(1, Math.ceil(end * sampleRate), sampleRate);
  for (const impact of impacts) scheduleImpact(ctx, impact.time, impact);
  return audioBufferToWav(await ctx.startRendering());
}

export function createResonanceOutput() {
  let ctx = null;
  const ledger = createVoiceLedger();
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return {
    unlock() {
      if (!Context) return;
      ctx ??= new Context();
      if (ctx.state === 'suspended') void ctx.resume();
    },
    play(impact) {
      if (!Context) return;
      this.unlock();
      if (!ctx) return;
      for (const node of scheduleImpact(ctx, ctx.currentTime + 0.012, impact)) ledger.watch(node);
    },
    release() { return ledger.release(); },
    counts() { return ledger.counts(); },
    dispose() { ledger.release(); if (ctx && ctx.state !== 'closed') void ctx.close(); ctx = null; },
  };
}
