import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOrcStaticWorld, createHouseShotWorld, parseWorldJSON } from '../lib/worldcraft-model.js';
import {
  WORLDCRAFT_SCALE, WORLDCRAFT_RESONANCE_HOLD, WORLDCRAFT_RESONANCE_NORMAL_FULL, RESONANCE_VOICES, impactGain, dynamicsGain, contactStrike, noteTimeline, resonanceOf,
  formatResonanceImpact, createResonanceEar, audioBufferToWav, describeImpactSequence, impactHeadline, recordedReplayTimes, performanceFromResonance,
} from '../lib/worldcraft-resonance.js';

const world = createOrcStaticWorld();
const ramp = 'worldcraft-object-ramp-yours';

test('default tuning is a rising pentatonic and metal rings longer than timber', () => {
  assert.deepEqual(WORLDCRAFT_SCALE.map(tone => tone.name), ['C4', 'D4', 'E4', 'G4', 'A4']);
  assert.equal(resonanceOf(world, 'worldcraft-object-bank-yours').note, 'C4');
  assert.equal(resonanceOf(world, ramp).note, 'D4');
  assert.equal(resonanceOf(world, 'worldcraft-object-plate-yours').note, 'E4');
  assert.equal(resonanceOf(world, 'worldcraft-target-stand-in-orc').note, 'thunk');
  assert.equal(resonanceOf(world, 'worldcraft-object-shield'), null);
  assert.equal(resonanceOf(createHouseShotWorld(), 'worldcraft-object-ramp-yours'), null);
  const metalRatios = RESONANCE_VOICES.metal.partials.map(partial => partial.ratio);
  assert.ok(metalRatios.some(ratio => !Number.isInteger(ratio)));
  assert.ok(Math.max(...RESONANCE_VOICES.metal.partials.map(partial => partial.decay)) > 1);
  assert.ok(Math.max(...RESONANCE_VOICES.timber.partials.map(partial => partial.decay)) < 0.25);
  assert.ok(RESONANCE_VOICES.timber.partials[0].decay < RESONANCE_VOICES.metal.partials[0].decay);
  assert.equal(impactGain(0), 0);
  assert.ok(impactGain(8) > impactGain(2));
  assert.ok(impactGain(40) === 1);
});

test('solver callbacks inside one impact do not retrigger, and a later hit does', () => {
  const ear = createResonanceEar();
  ear.begin();
  const burst = 24;
  for (let i = 0; i < burst; i += 1) {
    const heard = ear.hear({ body: ramp, time: i / 120, speed: 12 + i, world });
    assert.equal(heard, i === 0 ? heard : null);
  }
  const first = ear.snapshot().impacts[0];
  assert.equal(ear.snapshot().sounds, 1);
  assert.equal(first.callbacks, burst);
  assert.equal(first.speed, 12);
  assert.equal(first.note, 'D4');
  assert.equal(first.gain, impactGain(12));
  const again = ear.hear({ body: ramp, time: (burst - 1) / 120 + WORLDCRAFT_RESONANCE_HOLD + 1 / 120, speed: 4, world });
  assert.equal(again.note, 'D4');
  assert.ok(again.gain < first.gain);
  const plate = ear.hear({ body: 'worldcraft-object-plate-yours', time: again.time + 0.2, speed: 9, world });
  assert.equal(plate.note, 'E4');
  ear.hear({ body: 'worldcraft-ground', time: plate.time, speed: 8, world });
  const log = ear.snapshot();
  assert.equal(log.sounds, 3);
  assert.equal(log.resonantCallbacks, burst + 2);
  assert.equal(log.callbacks, burst + 3);
  assert.equal(log.collapsed, burst + 2 - 3);
  assert.equal(log.maxCallbacks, burst);
  assert.equal(formatResonanceImpact(log.impacts[0]), `ramp-yours · ${first.time.toFixed(3)} s · 12.00 m/s · D4 metal`);
  assert.equal(formatResonanceImpact({ piece: 'stand-in-orc', time: 4.333, speed: 12.45, note: 'thunk', material: 'thunk' }), 'stand-in-orc · 4.333 s · 12.45 m/s · thunk');
});

test('wav bytes from a buffer start with a RIFF header and keep the samples', () => {
  const wav = audioBufferToWav({ sampleRate: 8000, numberOfChannels: 1, getChannelData: () => Float32Array.from([0, 0.5, -1]) });
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
  assert.equal(wav.length, 44 + 6);
});

test('the impact sequence is the notes that rang, and a kept replay uses those times', () => {
  const contacts = [
    { body: ramp, count: 4, first: 1.4 },
    { body: 'worldcraft-object-plate-yours', count: 2, first: 4.4 },
    { body: 'worldcraft-ground', count: 1, first: 7 },
    { body: 'worldcraft-object-shield', count: 1, first: 3 },
  ];
  const impacts = [
    { piece: 'ramp-yours', role: 'ramp', body: ramp, time: 1.4, material: 'metal', note: 'D4', callbacks: 4 },
    { piece: 'plate-yours', role: 'plate', body: 'worldcraft-object-plate-yours', time: 4.4, material: 'metal', note: 'E4', callbacks: 2 },
  ];
  const described = describeImpactSequence(world, contacts, { impacts });
  assert.equal(described.headline, 'Ramp D4 → Plate E4');
  assert.equal(described.noteCount, 2);
  assert.match(described.explanation, /2 notes/);
  assert.match(described.explanation, /Repeat contacts on Ramp D4, Plate E4 are one note each/);
  assert.match(described.explanation, /Block shield was touched and did not ring/);
  assert.match(described.explanation, /Bank C4 was not touched/);
  assert.equal(impactHeadline(impacts[0]), 'Ramp D4');
  const twice = describeImpactSequence(world, contacts, { impacts: [...impacts, { ...impacts[0], time: 6.2, callbacks: 2 }] });
  assert.equal(twice.headline, 'Ramp D4 → Plate E4 → Ramp D4');
  assert.match(twice.explanation, /Ramp D4 was hit again later, so that later hit is its own note/);
  assert.deepEqual(recordedReplayTimes(impacts, 10), [11.4, 14.4]);
  assert.throws(() => recordedReplayTimes([{ time: Number.NaN }]), /time/);
});

test('face speed stays expressive and a copied contact normal does not keep the plugin vector', () => {
  assert.equal(WORLDCRAFT_RESONANCE_NORMAL_FULL, 32);
  assert.ok(impactGain(2.1, 32) < impactGain(8, 32));
  assert.ok(impactGain(8, 32) < impactGain(17, 32));
  assert.ok(impactGain(17, 32) < impactGain(24, 32));
  assert.ok(impactGain(24, 32) < 1);
  assert.equal(impactGain(40, 32), 1);
  assert.equal(impactGain(40), 1);
  const normal = dynamicsGain('normal-speed', { speed: 24, normalSpeed: 2.1 });
  const square = dynamicsGain('normal-speed', { speed: 22, normalSpeed: 24 });
  assert.ok(normal < square * 0.2);
  assert.ok(dynamicsGain('total-speed', { speed: 24, normalSpeed: 2.1 }) > normal);
  const vector = { x: 0, y: 0, z: 1 };
  const point = { x: 1, y: 2, z: 3 };
  const strike = contactStrike({ normal: vector, impulse: 4.5, point, type: 'COLLISION_STARTED' }, { x: 0, y: 0, z: -10 });
  vector.z = 0;
  point.x = 9;
  assert.equal(strike.normalSpeed, 10);
  assert.equal(strike.impulse, 4.5);
  assert.deepEqual(strike.point, { x: 1, y: 2, z: 3 });
  const line = noteTimeline([
    { role: 'bank', piece: 'bank-yours', note: 'C4', time: 0.2, point: { x: 0, y: 1, z: 2 } },
    { role: 'orc', piece: 'stand-in', note: 'thunk', time: 0.4 },
    { role: 'ramp', piece: 'ramp-yours', note: 'D4', time: 1.45, point: { x: 0, y: 2, z: 40 } },
  ]);
  assert.deepEqual(line.map(item => item.note), ['C4', 'D4']);
  assert.equal(line[1].gap, 1.25);
  assert.equal(line[0].gap, null);
  const ear = createResonanceEar();
  ear.begin();
  ear.hear({ body: ramp, time: 1, speed: 20, normalSpeed: 4, impulse: 3, point: { x: 1, y: 2, z: 3 }, world, dynamics: 'normal-speed' });
  const kept = performanceFromResonance(ear.snapshot());
  assert.deepEqual(Object.keys(kept.impacts[0]).sort(), ['callbacks', 'degree', 'gain', 'hz', 'material', 'note', 'piece', 'role', 'time']);
  assert.equal(kept.impacts[0].gain, dynamicsGain('normal-speed', { speed: 20, normalSpeed: 4 }));
});

test('the resonant example is the current Orc Stand-in world', () => {
  const text = readFileSync(new URL('../docs/examples/worldcraft-resonant.json', import.meta.url), 'utf8');
  assert.deepEqual(parseWorldJSON(text), createOrcStaticWorld());
});
