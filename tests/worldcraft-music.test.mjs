import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { validateWorld } from '../lib/worldcraft-model.js';
import { adaptRangePreset, bindRangeShot, createMusicalWorkshopPreset, validateRangePreset } from '../lib/worldcraft-range.js';
import { createRangeHarness } from '../scripts/range/run.mjs';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const record = JSON.parse(await readFile(new URL('../docs/experiments/range/appendix/music/search.json', import.meta.url), 'utf8'));

test('the five Musical Workshop arrangements repeat their recorded contact order', () => {
  assert.equal(record.presetId, 'musical-workshop');
  assert.equal(record.seed, 20261025);
  assert.equal(record.retune.identicalSamples, true);
  assert.equal(record.retune.notesChanged, true);
  assert.deepEqual(record.arrangements.map(row => row.order.join('>')), ['D4>E4', 'D4>C4>E4', 'C4>D4>E4', 'E4', 'D4>D4']);
  assert.ok(record.arrangements.every(row => row.confirmed === true));
  const preset = createMusicalWorkshopPreset();
  const session = createRangeHarness(havok, adaptRangePreset(preset).world, 'unknown');
  try {
    for (const arrangement of record.arrangements) {
      const document = validateRangePreset({ ...preset, objects: arrangement.objects });
      const world = adaptRangePreset(document).world;
      const first = session.shoot(world, arrangement.setup);
      const second = session.shoot(world, arrangement.setup);
      const notes = first.resonance.impacts.filter(impact => ['ramp', 'bank', 'plate', 'block'].includes(impact.role));
      assert.deepEqual(notes.map(impact => impact.note), arrangement.order);
      assert.equal(notes.length, second.resonance.impacts.filter(impact => ['ramp', 'bank', 'plate', 'block'].includes(impact.role)).length);
      for (let i = 0; i < first.samples.length; i++) {
        assert.equal(Object.is(first.samples[i].t, second.samples[i].t), true);
        assert.equal(Object.is(first.samples[i].x, second.samples[i].x), true);
        assert.equal(Object.is(first.samples[i].y, second.samples[i].y), true);
        assert.equal(Object.is(first.samples[i].z, second.samples[i].z), true);
      }
      for (let i = 0; i < notes.length; i++) {
        const again = second.resonance.impacts.filter(impact => ['ramp', 'bank', 'plate', 'block'].includes(impact.role))[i];
        assert.equal(Object.is(notes[i].time, again.time), true);
        assert.equal(JSON.stringify(notes[i].time), JSON.stringify(arrangement.impacts[i].time));
        assert.equal(notes[i].piece, arrangement.impacts[i].piece);
      }
      assert.deepEqual(first.terminal.position, arrangement.terminal.position);
    }
    const caught = record.arrangements.find(row => row.id === 'late-catch-4');
    const world = adaptRangePreset(validateRangePreset({ ...preset, objects: caught.objects })).world;
    const before = session.shoot(world, caught.setup);
    const retuned = validateWorld({
      ...world,
      objects: world.objects.map(object => ({ ...object, voice: { material: 'timber', degree: (object.voice.degree + 1) % 5 } })),
    });
    assert.equal(session.runtime.replaceWorld(retuned, { intent: 'load' }).ok, true);
    const after = session.shoot(retuned, caught.setup);
    assert.equal(after.samples.length, before.samples.length);
    for (let i = 0; i < before.samples.length; i++) {
      assert.equal(Object.is(before.samples[i].t, after.samples[i].t), true);
      assert.equal(Object.is(before.samples[i].x, after.samples[i].x), true);
      assert.equal(Object.is(before.samples[i].y, after.samples[i].y), true);
      assert.equal(Object.is(before.samples[i].z, after.samples[i].z), true);
    }
    assert.notEqual(after.resonance.impacts.map(impact => impact.note).join('>'), before.resonance.impacts.map(impact => impact.note).join('>'));
  } finally { session.dispose(); }
});

test('a stored Musical Workshop shot binds to the recorded world', async () => {
  const preset = createMusicalWorkshopPreset();
  const arrangement = record.arrangements[0];
  const document = validateRangePreset({ ...preset, objects: arrangement.objects });
  const world = adaptRangePreset(document).world;
  const session = createRangeHarness(havok, world, 'unknown');
  try {
    const last = session.shoot(world, arrangement.setup);
    const shot = await bindRangeShot({
      preset: document,
      world,
      setup: arrangement.setup,
      build: 'unknown',
      launch: last.launch,
      points: last.samples,
      events: last.evidence,
      contacts: last.contacts,
      terminal: last.terminal,
    });
    assert.equal(shot.bindingHash, arrangement.bindingHash);
    assert.equal(shot.outcome.scored, false);
    assert.equal(shot.outcome.kind, 'none');
  } finally { session.dispose(); }
});
