import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_SOUND_VARIANT, EVEN_DB_CURVE, RESONANCE_VOICES, SOUND_VARIANTS, WORLDCRAFT_RESONANCE_NORMAL_FULL,
  createResonanceEar, evenDbGain, impactGain, isSoundVariant, strikeColour, strikeSpeedOf, voiceImpact,
} from '../lib/worldcraft-resonance.js';

const db = gain => 20 * Math.log10(gain);
const REAL_FACE_SPEEDS = [2.0927, 4.1695, 8.2124, 13.7724, 18.3938, 20.3852, 22.5605, 24.0114, 25.8245, 31.2645, 36.7032];

test('six listening variants, PR #55 stays the default', () => {
  assert.deepEqual(SOUND_VARIANTS.map(v => v.id), ['pr55', 'even-db', 'woody', 'woody-bright', 'tuned', 'tuned-long']);
  assert.equal(DEFAULT_SOUND_VARIANT, 'pr55');
  assert.equal(isSoundVariant('woody'), true);
  assert.equal(isSoundVariant('louder'), false);
});

test('pr55 voicing reproduces the live PR #55 gain exactly', () => {
  const ear = createResonanceEar();
  const world = { objects: [{ id: 'bank-yours', kind: 'bank', voice: { material: 'timber', degree: 0 } }] };
  for (const [index, speed] of REAL_FACE_SPEEDS.entries()) {
    ear.begin();
    const heard = ear.hear({ body: 'worldcraft-object-bank-yours', time: index, speed: 20, normalSpeed: speed, world, dynamics: 'normal-speed' });
    assert.equal(voiceImpact(heard, 'pr55').gain, heard.gain);
    assert.equal(voiceImpact(heard).gain, heard.gain, 'no variant means PR #55');
  }
});

test('even-decibel curve lifts soft contacts and leaves firm hits within about 1 dB of PR #55', () => {
  assert.equal(evenDbGain(0.5), 0, 'slides and rests below the gate stay silent');
  assert.equal(evenDbGain(EVEN_DB_CURVE.knee), 1);
  let previous = 0;
  for (const speed of REAL_FACE_SPEEDS) {
    const even = evenDbGain(speed), pr55 = impactGain(speed, WORLDCRAFT_RESONANCE_NORMAL_FULL);
    assert.ok(even > previous, 'monotonic'); previous = even;
    if (speed < 13) assert.ok(even > pr55, `soft ${speed} m/s is lifted`);
    if (speed >= 13.7) assert.ok(Math.abs(db(even) - db(pr55)) <= 1.2, `firm ${speed} m/s ${db(even).toFixed(1)} vs ${db(pr55).toFixed(1)}`);
  }
  assert.ok(db(evenDbGain(REAL_FACE_SPEEDS[0])) > -18.5, 'softest real graze within the 18 dB range');
});

test('kept lines recover face speed from the stored PR #55 gain', () => {
  for (const speed of REAL_FACE_SPEEDS.filter(v => v < WORLDCRAFT_RESONANCE_NORMAL_FULL)) {
    const stored = { gain: impactGain(speed, WORLDCRAFT_RESONANCE_NORMAL_FULL) };
    assert.ok(Math.abs(strikeSpeedOf(stored) - speed) < 1e-9);
  }
  assert.equal(strikeSpeedOf({ gain: 1 }), WORLDCRAFT_RESONANCE_NORMAL_FULL);
});

test('voicing copies the impact and only touches acoustic fields', () => {
  const impact = Object.freeze({ piece: 'bank-yours', role: 'bank', material: 'timber', note: 'C4', hz: 261.6256, time: 0.7, speed: 24, normalSpeed: 4.17, gain: 0.0465, callbacks: 2 });
  const voiced = voiceImpact(impact, 'woody-bright');
  assert.equal(voiced.sound, 'woody-bright');
  assert.ok(voiced.gain > impact.gain);
  for (const key of ['piece', 'role', 'material', 'note', 'hz', 'time', 'speed', 'normalSpeed', 'callbacks']) assert.equal(voiced[key], impact[key]);
});

test('strike colour is restrained and energy-neutral', () => {
  const voice = RESONANCE_VOICES.timberWoody;
  const energy = (w, n) => voice.partials.reduce((s, p, i) => s + (p.gain * w[i]) ** 2 * p.decay, 0) + (voice.noise * n) ** 2 * voice.noiseDecay;
  const base = energy(voice.partials.map(() => 1), 1);
  for (const strike of [0, 0.25, 0.5, 1]) {
    const colour = strikeColour(voice, strike);
    assert.ok(Math.abs(energy(colour.partials, colour.noise) - base) / base < 1e-9);
    const tilt = db(colour.partials[1] / colour.partials[0]);
    assert.ok(Math.abs(tilt) <= 1.6, `upper partial tilt ${tilt.toFixed(2)} dB`);
  }
  assert.ok(strikeColour(voice, 1).partials[1] > strikeColour(voice, 0).partials[1], 'harder is brighter');
});

test('new timber voices keep at least the original headroom', () => {
  const sum = v => (v.level ?? 1) * (v.partials.reduce((s, p) => s + p.gain, 0) + v.noise);
  for (const name of ['timberWoody', 'timberTuned', 'timberTunedLong']) assert.ok(sum(RESONANCE_VOICES[name]) <= sum(RESONANCE_VOICES.timber) + 1e-9, name);
  assert.ok(RESONANCE_VOICES.timberWoody.partials[0].decay > RESONANCE_VOICES.timber.partials[0].decay * 3, 'longer body');
});

test('the study is acoustic only: runtime, physics and sessions are not edited', async () => {
  const runtime = await readFile(new URL('../lib/worldcraft-runtime.js', import.meta.url), 'utf8');
  assert.ok(!/voiceImpact|SOUND_VARIANTS|evenDbGain/.test(runtime), 'runtime does not select sound variants');
});

test('tuned wood is a pitched bar: harmonic overtones, fundamental never coloured', () => {
  for (const name of ['timberTuned', 'timberTunedLong']) {
    const voice = RESONANCE_VOICES[name];
    assert.ok(voice.partials.some(p => p.ratio === 4), 'two-octave overtone');
    assert.ok(voice.partials.filter(p => p.ratio === 1).some(p => p.decay >= 1.5), 'resonator hum');
    for (const strike of [0, 1]) {
      const colour = strikeColour(voice, strike);
      const fundamentals = voice.partials.map((p, i) => [p, colour.partials[i]]).filter(([p]) => p.ratio === 1);
      assert.ok(fundamentals.every(([, w]) => Math.abs(w - fundamentals[0][1]) < 1e-12), 'fundamental and hum move together');
    }
    assert.ok(strikeColour(voice, 1).partials[4] / strikeColour(voice, 1).partials[0] > strikeColour(voice, 0).partials[4] / strikeColour(voice, 0).partials[0], 'harder mallet, brighter top mode');
  }
  assert.ok(RESONANCE_VOICES.timberTunedLong.partials[1].decay > RESONANCE_VOICES.timberTuned.partials[1].decay);
});
