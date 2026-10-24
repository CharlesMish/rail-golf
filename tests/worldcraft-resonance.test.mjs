import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOrcStaticWorld, createHouseShotWorld, parseWorldJSON } from '../lib/worldcraft-model.js';
import {
  WORLDCRAFT_SCALE, WORLDCRAFT_RESONANCE_HOLD, RESONANCE_VOICES, impactGain, resonanceOf,
  formatResonanceImpact, createResonanceEar, audioBufferToWav,
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

test('the resonant example is the current Orc Stand-in world', () => {
  const text = readFileSync(new URL('../docs/examples/worldcraft-resonant.json', import.meta.url), 'utf8');
  assert.deepEqual(parseWorldJSON(text), createOrcStaticWorld());
});
