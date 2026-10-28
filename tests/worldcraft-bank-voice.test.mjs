import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BANK_VARIANT_SETTINGS, DEFAULT_SOUND_VARIANT, MUSICAL_WORKSHOP_SOUND, EVEN_DB_CURVE, RESONANCE_VOICES, SOUND_VARIANTS, WORLDCRAFT_RESONANCE_NORMAL_FULL,
  createResonanceEar, evenDbGain, impactAcoustics, impactGain, isSoundVariant, strikeColour, strikeSpeedOf, voiceImpact,
} from '../lib/worldcraft-resonance.js';

const db = gain => 20 * Math.log10(gain);
const REAL_FACE_SPEEDS = [2.0927, 4.1695, 8.2124, 13.7724, 18.3938, 20.3852, 22.5605, 24.0114, 25.8245, 31.2645, 36.7032];

test('listening variants, PR #55 stays the default', () => {
  assert.deepEqual(SOUND_VARIANTS.map(v => v.id), ['pr55', 'even-db', 'woody', 'woody-bright', 'tuned', 'tuned-long', 'tuned-presence', 'tuned-even', 'tuned-forward']);
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

test('presence variants stay inside the original timber headroom and only reshape the bank', () => {
  const sum = (v, trim = 1) => trim * (v.level ?? 1) * (v.partials.reduce((s, p) => s + p.gain, 0) + v.noise);
  for (const [id, settings] of Object.entries(BANK_VARIANT_SETTINGS)) {
    assert.ok(sum(RESONANCE_VOICES[settings.voice], settings.trim) <= sum(RESONANCE_VOICES.timber) + 1e-9, id);
    const plate = { role: 'plate', material: 'metal', normalSpeed: 4.17, gain: 0 };
    assert.equal(voiceImpact(plate, id).gain, evenDbGain(4.17), `${id} leaves a metal plate on the B curve`);
    const timberRamp = { role: 'ramp', material: 'timber', normalSpeed: 4.17, gain: 0 };
    assert.equal(voiceImpact(timberRamp, id).gain, evenDbGain(4.17), `${id} leaves a timber ramp on the B curve`);
    const timberPlate = { role: 'plate', material: 'timber', normalSpeed: 4.17, gain: 0 };
    assert.equal(voiceImpact(timberPlate, id).gain, evenDbGain(4.17), `${id} leaves a timber plate on the B curve`);
    for (const impact of [timberRamp, timberPlate]) {
      const acoustics = impactAcoustics(voiceImpact(impact, id));
      assert.equal(acoustics.voiceName, 'timber', `${id} keeps ordinary timber on ${impact.role}`);
      assert.equal(acoustics.trim, 1);
      assert.equal(acoustics.coloured, false);
    }
    const bank = voiceImpact({ role: 'bank', material: 'timber', normalSpeed: 4.17, gain: 0 }, id);
    const heard = impactAcoustics(bank);
    assert.equal(heard.voiceName, settings.voice);
    assert.equal(heard.trim, settings.trim);
    assert.equal(bank.gain, evenDbGain(4.17, { ...EVEN_DB_CURVE, rangeDb: settings.bankRangeDb }));
  }
  const graze = { role: 'bank', material: 'timber', normalSpeed: 2.0927, gain: 0 };
  assert.ok(db(voiceImpact(graze, 'tuned-even').gain) > db(voiceImpact(graze, 'tuned-presence').gain) + 4, 'gentler bank range lifts a graze');
  const metalBank = voiceImpact({ role: 'bank', material: 'metal', normalSpeed: 4.17, gain: 0 }, 'tuned-even');
  assert.equal(metalBank.gain, evenDbGain(4.17), 'a metal bank stays on the 18 dB curve');
  assert.notEqual(metalBank.gain, evenDbGain(4.17, { ...EVEN_DB_CURVE, rangeDb: 12 }));
  const metalHeard = impactAcoustics(metalBank);
  assert.equal(metalHeard.voiceName, 'metal');
  assert.equal(metalHeard.trim, 1);
  assert.equal(metalHeard.coloured, false);
  assert.equal(impactAcoustics(voiceImpact({ role: 'ramp', material: 'timber', normalSpeed: 10, gain: 0 }, 'tuned-long')).voiceName, 'timberTunedLong');
});

test('H is a timber bank; a metal bank and timber ramp or plate stay ordinary', () => {
  const speed = 4.17;
  const timberBank = { role: 'bank', material: 'timber', normalSpeed: speed, gain: 0 };
  const metalBank = { role: 'bank', material: 'metal', normalSpeed: speed, gain: 0 };
  const timberRamp = { role: 'ramp', material: 'timber', normalSpeed: speed, gain: 0 };
  const timberPlate = { role: 'plate', material: 'timber', normalSpeed: speed, gain: 0 };
  const heard = impactAcoustics(voiceImpact(timberBank, 'tuned-even'));
  assert.equal(heard.voiceName, 'timberTunedLong');
  assert.equal(heard.voice, RESONANCE_VOICES.timberTunedLong);
  assert.equal(heard.trim, 1.36);
  assert.equal(heard.coloured, true);
  assert.equal(voiceImpact(timberBank, 'tuned-even').gain, evenDbGain(speed, { rangeDb: 12, shape: 1.7, knee: 32, gate: 1, gateFull: 2 }));
  const metal = impactAcoustics(voiceImpact(metalBank, 'tuned-even'));
  assert.equal(metal.voiceName, 'metal');
  assert.equal(metal.voice, RESONANCE_VOICES.metal);
  assert.equal(metal.trim, 1);
  assert.equal(metal.coloured, false);
  assert.equal(voiceImpact(metalBank, 'tuned-even').gain, evenDbGain(speed));
  for (const piece of [timberRamp, timberPlate]) {
    const ordinary = impactAcoustics(voiceImpact(piece, 'tuned-even'));
    assert.equal(ordinary.voiceName, 'timber');
    assert.equal(ordinary.voice, RESONANCE_VOICES.timber);
    assert.equal(ordinary.trim, 1);
    assert.equal(ordinary.coloured, false);
    assert.equal(voiceImpact(piece, 'tuned-even').gain, evenDbGain(speed));
  }
  // C–F still retimbre every timber piece and leave a metal bank on ordinary metal.
  const study = { woody: 'timberWoody', 'woody-bright': 'timberWoody', tuned: 'timberTuned', 'tuned-long': 'timberTunedLong' };
  for (const [id, voiceName] of Object.entries(study)) {
    const timber = impactAcoustics(voiceImpact(timberBank, id));
    assert.equal(timber.voiceName, voiceName, id);
    assert.equal(timber.trim, 1);
    const metalPiece = impactAcoustics(voiceImpact(metalBank, id));
    assert.equal(metalPiece.voiceName, 'metal', id);
    assert.equal(metalPiece.trim, 1);
    assert.equal(metalPiece.coloured, false);
    assert.equal(voiceImpact(metalBank, id).gain, evenDbGain(speed), id);
  }
  // G and I share H's timber-bank gate.
  for (const id of ['tuned-presence', 'tuned-forward']) {
    assert.equal(impactAcoustics(voiceImpact(metalBank, id)).voiceName, 'metal', id);
    assert.equal(impactAcoustics(voiceImpact(timberBank, id)).voiceName, BANK_VARIANT_SETTINGS[id].voice, id);
    assert.equal(impactAcoustics(voiceImpact(timberBank, id)).trim, BANK_VARIANT_SETTINGS[id].trim, id);
  }
});

test('the Musical Workshop plays the owner-chosen bank sound H by default', async () => {
  assert.equal(MUSICAL_WORKSHOP_SOUND, 'tuned-even');
  assert.equal(isSoundVariant(MUSICAL_WORKSHOP_SOUND), true);
  const ui = await readFile(new URL('../app/lab/worldcraft/worldcraft.tsx', import.meta.url), 'utf8');
  assert.match(ui, /soundVariant: MUSICAL_WORKSHOP_SOUND/);
});
