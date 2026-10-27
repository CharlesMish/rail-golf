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
// Face speed uses a higher knee. A square hit's incoming normal speed is the
// approach speed, which already passes 22 on an ordinary charge. 32 keeps a
// graze, a medium strike, and a hard strike apart. The fastest square hits
// still reach 1. This constant is acoustic. It is not a physics speed.
export const WORLDCRAFT_RESONANCE_NORMAL_FULL = 32;
// Live Musical Workshop mapping. total-speed remains available for comparison.
export const RESONANCE_DYNAMICS = 'normal-speed';
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
  // Bank voice study (music3): a longer woody body with a stronger octave and
  // midrange, and a band-passed knock instead of white hiss. Its level is set so
  // the first 100 ms reads at the same K-weighted loudness as `timber` at equal
  // gain: the extra is resonance and midrange, not a louder strike.
  timberWoody: Object.freeze({
    level: 0.7,
    partials: Object.freeze([
      Object.freeze({ ratio: 1, gain: 0.56, decay: 0.62 }),
      Object.freeze({ ratio: 2, gain: 0.36, decay: 0.4 }),
      Object.freeze({ ratio: 3.01, gain: 0.16, decay: 0.2 }),
      Object.freeze({ ratio: 4.2, gain: 0.05, decay: 0.04 }),
    ]),
    noise: 0.5,
    noiseDecay: 0.02,
    noiseBand: Object.freeze({ hz: 1700, q: 1.2 }),
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

export function impactGain(speed, full = WORLDCRAFT_RESONANCE_FULL_SPEED) {
  if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(full) || full <= 0) return 0;
  const t = Math.min(1, speed / full);
  return t * t * (3 - 2 * t);
}

/**
 * Acoustic gain only. total-speed is the post-contact projectile speed.
 * normal-speed is the pre-step speed along the contact normal.
 * impulse is the solver impulse divided by the projectile mass, on the same knee
 * as normal-speed, so a render can compare it. The live ear does not select it.
 */
export function dynamicsGain(mapping, sample) {
  const speed = Number.isFinite(sample?.speed) ? sample.speed : 0;
  if (mapping === 'normal-speed') {
    const strike = Number.isFinite(sample?.normalSpeed) ? sample.normalSpeed : speed;
    return impactGain(strike, WORLDCRAFT_RESONANCE_NORMAL_FULL);
  }
  if (mapping === 'impulse') {
    const strike = Number.isFinite(sample?.impulse) ? sample.impulse / 1.5 : speed;
    return impactGain(strike, WORLDCRAFT_RESONANCE_NORMAL_FULL);
  }
  return impactGain(speed);
}

/**
 * Copy the contact fields the Havok callback actually exposes.
 * The normal and point vectors are reused by the plugin on the next event,
 * so the numbers are copied here. Missing incoming speed leaves normalSpeed null.
 */
export function contactStrike(event, incoming) {
  const raw = event?.normal;
  const nx = Number.isFinite(raw?.x) ? raw.x : 0;
  const ny = Number.isFinite(raw?.y) ? raw.y : 0;
  const nz = Number.isFinite(raw?.z) ? raw.z : 0;
  const normalLength = Math.hypot(nx, ny, nz);
  let normalSpeed = null;
  if (incoming && normalLength > 0 && [incoming.x, incoming.y, incoming.z].every(Number.isFinite)) {
    normalSpeed = Math.abs((incoming.x * nx + incoming.y * ny + incoming.z * nz) / normalLength);
  }
  const point = event?.point;
  return {
    normalSpeed,
    impulse: Number.isFinite(event?.impulse) ? event.impulse : null,
    type: typeof event?.type === 'string' ? event.type : null,
    normalLength,
    point: point && [point.x, point.y, point.z].every(Number.isFinite) ? { x: point.x, y: point.y, z: point.z } : null,
  };
}

const PIECE_ROLES = new Set(['ramp', 'bank', 'plate', 'block']);

/** Notes in contact order, with the elapsed time since the previous note. */
export function noteTimeline(impacts) {
  const notes = (Array.isArray(impacts) ? impacts : []).filter(impact => impact && PIECE_ROLES.has(impact.role) && Number.isFinite(impact.time));
  return notes.map((impact, index) => ({
    note: impact.note,
    role: impact.role,
    piece: impact.piece,
    time: impact.time,
    gap: index === 0 ? null : impact.time - notes[index - 1].time,
    point: impact.point && [impact.point.x, impact.point.y, impact.point.z].every(Number.isFinite) ? { x: impact.point.x, y: impact.point.y, z: impact.point.z } : null,
  }));
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
  if (impact.dynamics === 'normal-speed' && Number.isFinite(impact.normalSpeed)) {
    return `${impact.piece} · ${impact.time.toFixed(3)} s · ${impact.normalSpeed.toFixed(2)} m/s into the face · ${note}`;
  }
  return `${impact.piece} · ${impact.time.toFixed(3)} s · ${impact.speed.toFixed(2)} m/s · ${note}`;
}

const KIND_LABEL = { ramp: 'Ramp', bank: 'Bank', plate: 'Plate', block: 'Block', bell: 'Bell', orc: 'Stand-in' };

/** Piece name and note, from the impact the ear actually kept. */
export function impactHeadline(impact) {
  const kind = KIND_LABEL[impact.role] ?? impact.role;
  if (impact.material === 'thunk') return `${kind} thunk`;
  return `${kind} ${impact.note}`;
}

function pieceLabel(object) {
  const kind = KIND_LABEL[object.kind] ?? object.kind;
  if (!object.voice) return kind;
  const tone = WORLDCRAFT_SCALE[object.voice.degree];
  return tone ? `${kind} ${tone.name}` : kind;
}

function contactObject(world, body) {
  if (typeof body !== 'string' || !body.startsWith('worldcraft-object-')) return null;
  return world?.objects?.find(item => item.id === body.slice('worldcraft-object-'.length)) ?? null;
}

/**
 * Human order of the sounds this shot actually made, plus why the note count
 * is what it is. Ground is not a note. A repeat contact is one note.
 * A touched piece with no voice does not ring.
 */
export function describeImpactSequence(world, contacts, resonance) {
  const impacts = Array.isArray(resonance?.impacts) ? resonance.impacts : [];
  const headline = impacts.length ? impacts.map(impactHeadline).join(' → ') : 'No resonant note';
  const pieceNotes = impacts.filter(impact => ['ramp', 'bank', 'plate', 'block'].includes(impact.role));
  const list = Array.isArray(contacts) ? contacts : [];
  const rung = new Set(pieceNotes.map(impact => impact.piece));
  const repeats = [];
  const silent = [];
  for (const contact of list) {
    if (!contact || contact.body === 'worldcraft-ground') continue;
    const spec = resonanceOf(world, contact.body);
    const object = contactObject(world, contact.body);
    if (spec && ['ramp', 'bank', 'plate', 'block'].includes(spec.role)) {
      const label = object ? pieceLabel(object) : impactHeadline(spec);
      const impact = impacts.find(item => item.body === contact.body || item.piece === spec.piece);
      if ((contact.count > 1 || (impact && impact.callbacks > 1)) && !repeats.includes(label)) repeats.push(label);
    } else if (!spec) {
      const label = object ? `${pieceLabel(object)} ${object.id}` : 'A silent piece';
      if (!silent.includes(label)) silent.push(label);
    }
  }
  const missed = (world?.objects ?? [])
    .filter(object => object.voice && !rung.has(object.id))
    .map(pieceLabel);
  const noteCount = pieceNotes.length;
  const sentences = [`${noteCount === 1 ? '1 note' : `${noteCount} notes`}.`];
  if (pieceNotes.length) sentences.push(`Touched ${pieceNotes.map(impactHeadline).join(', ')}.`);
  if (repeats.length) sentences.push(`Repeat contacts on ${repeats.join(', ')} are one note each.`);
  const later = [];
  const heard = new Map();
  for (const impact of pieceNotes) {
    const count = (heard.get(impact.piece) ?? 0) + 1;
    heard.set(impact.piece, count);
    if (count === 2) later.push(impactHeadline(impact));
  }
  if (later.length === 1) sentences.push(`${later[0]} was hit again later, so that later hit is its own note.`);
  else if (later.length) sentences.push(`${later.join(', ')} were hit again later, so each later hit is its own note.`);
  if (silent.length) sentences.push(`${silent.join(', ')} ${silent.length === 1 ? 'was' : 'were'} touched and did not ring.`);
  if (missed.length) sentences.push(`${missed.join(', ')} ${missed.length === 1 ? 'was' : 'were'} not touched.`);
  const thunk = impacts.some(impact => impact.material === 'thunk');
  const bell = impacts.some(impact => impact.role === 'bell');
  if (thunk) sentences.push('The stand-in thunk is not a piece note.');
  if (bell) sentences.push('The bell is its own ring.');
  return {
    headline,
    noteCount,
    explanation: sentences.join(' '),
    impacts: impacts.map(impact => ({ ...impact })),
  };
}

/** Relative offsets for a kept line. Replay adds these to the audio clock. It does not resimulate. */
export function recordedReplayTimes(impacts, start = 0) {
  if (!Array.isArray(impacts)) throw new Error('Recorded sounds need their impacts');
  return impacts.map(impact => {
    if (!impact || !Number.isFinite(impact.time)) throw new Error('Recorded impact time is invalid');
    return start + impact.time;
  });
}

/** The fields a kept line needs in order to play the sounds it already recorded. */
export function performanceFromResonance(resonance) {
  const impacts = Array.isArray(resonance?.impacts) ? resonance.impacts : [];
  return {
    impacts: impacts.map(impact => ({
      piece: impact.piece,
      role: impact.role,
      time: impact.time,
      material: impact.material,
      degree: impact.degree,
      note: impact.note,
      hz: impact.hz,
      gain: impact.gain,
      callbacks: impact.callbacks,
    })),
  };
}

// ---------------------------------------------------------------------------
// Bank voice study (music3). Acoustic only: every variant reads the same
// measured strike (pre-step face speed from PR #55) and none writes Havok.
export const SOUND_VARIANTS = Object.freeze([
  Object.freeze({ id: 'pr55', label: 'A · PR #55', detail: 'Face speed on the smoothstep curve, original timber knock.' }),
  Object.freeze({ id: 'even-db', label: 'B · Even-decibel curve', detail: 'Same face speed, spread evenly in decibels so soft contacts stay audible. Original timber.' }),
  Object.freeze({ id: 'woody', label: 'C · Woody timber', detail: 'B, plus a longer woody resonance with more midrange and octave. Same strike loudness.' }),
  Object.freeze({ id: 'woody-bright', label: 'D · Woody + strike colour', detail: 'C, plus harder hits slightly brighter and softer hits slightly darker, at matched loudness.' }),
]);
export const DEFAULT_SOUND_VARIANT = 'pr55';
const VARIANT_IDS = new Set(SOUND_VARIANTS.map(variant => variant.id));
export const isSoundVariant = id => VARIANT_IDS.has(id);

// 18 dB from the softest real contact to a full strike; the knee matches PR #55.
// Shape 1.7 tracks PR #55 within ~1 dB from about 20 m/s up, so firm hits are
// unchanged and only the soft end is lifted.
// Below 1 m/s into the face nothing sounds (slides and rests); 1–2 m/s fades in.
export const EVEN_DB_CURVE = Object.freeze({ rangeDb: 18, shape: 1.7, knee: WORLDCRAFT_RESONANCE_NORMAL_FULL, gate: 1, gateFull: 2 });

export function evenDbGain(speed, curve = EVEN_DB_CURVE) {
  if (!Number.isFinite(speed) || speed <= curve.gate) return 0;
  const t = Math.min(1, speed / curve.knee);
  const fade = Math.min(1, (speed - curve.gate) / (curve.gateFull - curve.gate));
  return 10 ** (-curve.rangeDb * (1 - t) ** curve.shape / 20) * fade;
}

/**
 * Face speed for an impact. Live impacts carry it. Kept lines store only the
 * PR #55 gain, which is a smoothstep of face speed, so it is inverted exactly
 * (a stored gain of 1 means at least the knee, where every curve is at 1).
 */
export function strikeSpeedOf(impact) {
  if (Number.isFinite(impact?.normalSpeed)) return impact.normalSpeed;
  const gain = Number.isFinite(impact?.gain) ? Math.min(1, Math.max(0, impact.gain)) : 0;
  if (gain >= 1) return WORLDCRAFT_RESONANCE_NORMAL_FULL;
  const t = 0.5 - Math.sin(Math.asin(1 - 2 * gain) / 3);
  return t * WORLDCRAFT_RESONANCE_NORMAL_FULL;
}

/** A copy of the impact voiced for one variant: gain, voice and strike colour. */
export function voiceImpact(impact, variant = DEFAULT_SOUND_VARIANT) {
  const id = isSoundVariant(variant) ? variant : DEFAULT_SOUND_VARIANT;
  const speed = strikeSpeedOf(impact);
  const strike = Math.min(1, speed / WORLDCRAFT_RESONANCE_NORMAL_FULL);
  const gain = id === 'pr55' ? impactGain(speed, WORLDCRAFT_RESONANCE_NORMAL_FULL) : evenDbGain(speed);
  return { ...impact, gain, sound: id, strike };
}

// Restrained strike colour: upper partials and knock move about ±1.5 dB with
// strike (soft darker, hard brighter), renormalised by energy (gain² × decay)
// so the overall level of the note stays put.
export function strikeColour(voice, strike) {
  const b = Number.isFinite(strike) ? Math.min(1, Math.max(0, strike)) : 0.5;
  const weights = voice.partials.map((partial, index) => (index === 0 ? 1 : 0.84 + 0.32 * b));
  const noise = 0.8 + 0.4 * b;
  const energy = (w, n) => voice.partials.reduce((sum, partial, index) => sum + (partial.gain * w[index]) ** 2 * partial.decay, 0) + (voice.noise * n) ** 2 * voice.noiseDecay;
  const norm = Math.sqrt(energy(voice.partials.map(() => 1), 1) / energy(weights, noise));
  return { partials: weights.map(weight => weight * norm), noise: noise * norm };
}

function voiceFor(impact) {
  if (impact.material === 'timber' && (impact.sound === 'woody' || impact.sound === 'woody-bright')) return RESONANCE_VOICES.timberWoody;
  return RESONANCE_VOICES[impact.material];
}

/** One sound per impact. Solver callbacks inside the hold window only increment the count. */
export function createResonanceEar() {
  let impacts = [];
  let open = new Map();
  let callbacks = 0;
  let resonantCallbacks = 0;
  return {
    begin() { impacts = []; open = new Map(); callbacks = 0; resonantCallbacks = 0; },
    hear({ body, time, speed, normalSpeed, impulse, point, world, dynamics }) {
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
      const mapping = dynamics === 'normal-speed' ? 'normal-speed' : 'total-speed';
      const strikePoint = point && [point.x, point.y, point.z].every(Number.isFinite) ? { x: point.x, y: point.y, z: point.z } : null;
      const impact = {
        piece: spec.piece, role: spec.role, body, time: when, last: when,
        speed: Number.isFinite(speed) ? speed : 0,
        normalSpeed: Number.isFinite(normalSpeed) ? normalSpeed : null,
        impulse: Number.isFinite(impulse) ? impulse : null,
        point: strikePoint,
        dynamics: mapping,
        material: spec.material, degree: spec.degree,
        note: spec.note, hz: spec.hz, gain: dynamicsGain(mapping, { speed, normalSpeed }), callbacks: 1,
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

// Chrome can emit the first sample of a sample-aligned BufferSource at the
// GainNode's default of 1, before setValueAtTime(peak, start) applies. That
// sample is the raw noise generator and does not follow impact.gain. Holding
// the attack level one sample earlier keeps that click at the intended gain.
function armGain(param, peak, start, decay, sampleRate) {
  const earlier = Math.max(0, start - 1 / sampleRate);
  if (earlier < start) param.setValueAtTime(peak, earlier);
  param.setValueAtTime(peak, start);
  param.exponentialRampToValueAtTime(0.0001, start + decay);
}

/** Schedule one impact on a live or offline audio context. Gain is already on the impact. */
export function scheduleImpact(ctx, when, impact) {
  const voice = voiceFor(impact);
  const nodes = [];
  if (!voice || !(impact.gain > 0) || !(impact.hz > 0)) return nodes;
  const start = Math.max(0, when);
  const level = impact.gain * 0.42 * (voice.level ?? 1);
  const colour = impact.sound === 'woody-bright' && impact.material === 'timber' ? strikeColour(voice, impact.strike) : null;
  for (const [index, base] of voice.partials.entries()) {
    const partial = colour ? { ...base, gain: base.gain * colour.partials[index] } : base;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = Math.max(0.0002, level * partial.gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(impact.hz * partial.ratio, start);
    armGain(gain.gain, peak, start, partial.decay, ctx.sampleRate);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + partial.decay + 0.02);
    nodes.push(osc);
  }
  if (!(voice.noise > 0)) return nodes;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const peak = Math.max(0.0002, level * voice.noise * (colour ? colour.noise : 1));
  source.buffer = noiseBuffer(ctx, voice.noiseDecay);
  armGain(gain.gain, peak, start, voice.noiseDecay, ctx.sampleRate);
  if (voice.noiseBand) {
    // A wooden knock is a band of noise, not broadband hiss.
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(voice.noiseBand.hz, start);
    band.Q.setValueAtTime(voice.noiseBand.q, start);
    source.connect(band);
    band.connect(gain);
  } else {
    source.connect(gain);
  }
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
  const mix = options.mix ?? 1;
  if (!Number.isFinite(mix) || mix < 0 || mix > 1) throw new Error('Render mix must be from 0 to 1');
  const end = impacts.reduce((max, impact) => Math.max(max, impact.time), 0) + (options.tail ?? TAIL);
  const ctx = new Ctx(1, Math.ceil(end * sampleRate), sampleRate);
  const variant = options.variant;
  for (const impact of impacts) {
    const voiced = variant ? voiceImpact(impact, variant) : impact;
    scheduleImpact(ctx, impact.time, { ...voiced, gain: voiced.gain * mix });
  }
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
    play(impact, variant) {
      if (!Context) return;
      this.unlock();
      if (!ctx) return;
      const voiced = variant ? voiceImpact(impact, variant) : impact;
      for (const node of scheduleImpact(ctx, ctx.currentTime + 0.012, voiced)) ledger.watch(node);
    },
    playRecorded(impacts, variant) {
      if (!Context || !Array.isArray(impacts) || !impacts.length) return 0;
      this.unlock();
      if (!ctx) return 0;
      const start = ctx.currentTime + 0.05;
      let nodes = 0;
      for (const impact of impacts) {
        const when = recordedReplayTimes([impact], start)[0];
        const voiced = variant ? voiceImpact(impact, variant) : impact;
        for (const node of scheduleImpact(ctx, when, voiced)) ledger.watch(node);
        nodes += 1;
      }
      return nodes;
    },
    release() { return ledger.release(); },
    counts() { return ledger.counts(); },
    state() { return ctx ? ctx.state : 'uncreated'; },
    dispose() { ledger.release(); if (ctx && ctx.state !== 'closed') void ctx.close(); ctx = null; },
  };
}
