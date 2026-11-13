import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { validateFoundryDirectory } from '../scripts/foundry/validate.mjs';
import {
  WORLDCRAFT_EXPERIMENT_CAPACITY, WORLDCRAFT_LIMITS,
  createEmptyWorld, createHouseShotWorld, createOrcStaticWorld, createStarterWorld,
  exportWorldJSON, validateWorld, worldcraftCanAdd, worldcraftIdentity,
} from '../lib/worldcraft-model.js';
import { adaptRangePreset, exportRangePreset, parseRangePreset } from '../lib/worldcraft-range.js';
import { foundryPreset } from '../lib/worldcraft-foundry.js';

const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';

function plates(count) {
  const objects = [];
  const xs = [-21, -15, -9, -3, 3, 9, 15, 21];
  for (let index = 0; index < count; index += 1) {
    objects.push({
      id: `plate-${index}`,
      kind: 'plate',
      x: xs[index % xs.length],
      z: 24 + Math.floor(index / xs.length) * 12,
      yaw: 0,
      voice: { material: index % 2 ? 'metal' : 'timber', degree: index % 5 },
    });
  }
  return objects;
}

function worldWith(count, capacity) {
  return {
    ...createEmptyWorld({ id: 'capacity-probe', name: 'Capacity probe' }),
    objects: plates(count),
    rules: { pin: null, locked: plates(count).map(object => object.id), allowance: {}, rail: null, goal: { kind: 'none' } },
    ...(capacity ? { capacity } : {}),
  };
}

test('the production object cap stays 12 and the v1 export hash is unchanged', () => {
  assert.equal(WORLDCRAFT_LIMITS.objects, 12);
  assert.equal(WORLDCRAFT_EXPERIMENT_CAPACITY, 24);
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
  const house = exportWorldJSON(createHouseShotWorld());
  assert.equal(house.includes('capacity'), false);
  const before = foundryPreset('descending-resonance');
  const descending = exportRangePreset(before);
  assert.equal(descending.includes('"capacity"'), false);
  const again = exportRangePreset(parseRangePreset(descending));
  assert.equal(again, descending);
  assert.equal(worldcraftIdentity(adaptRangePreset(parseRangePreset(descending)).world), worldcraftIdentity(adaptRangePreset(before).world));
});

test('24 pieces require the experimental field and do not become the default', () => {
  assert.throws(() => validateWorld(worldWith(13)), /at most 12 pieces/);
  assert.throws(() => validateWorld(worldWith(12, 16)), /Experimental capacity must be 24/);
  assert.throws(() => validateWorld(worldWith(25, 24)), /at most 24 pieces/);
  const opted = validateWorld(worldWith(24, 24));
  assert.equal(opted.objects.length, 24);
  assert.equal(opted.capacity, 24);
  assert.equal(exportWorldJSON(opted).includes('"capacity": 24'), true);
  const round = validateWorld(JSON.parse(exportWorldJSON(opted)));
  assert.equal(round.objects.length, 24);
  assert.equal(worldcraftIdentity(round), worldcraftIdentity(opted));
  assert.equal(worldcraftCanAdd(opted, 'plate'), false);
  const twelve = validateWorld(worldWith(12));
  assert.equal(Object.hasOwn(twelve, 'capacity'), false);
  assert.equal(worldcraftCanAdd(twelve, 'plate'), false);
  const editable = validateWorld({ ...worldWith(23, 24), rules: { pin: null, locked: [], allowance: { plate: 24 }, rail: null, goal: { kind: 'none' } } });
  assert.equal(worldcraftCanAdd(editable, 'plate'), true);
});

test('Descending Resonance and Ricochet Loop files are still the 12-piece documents', async () => {
  const descending = JSON.parse(await readFile(new URL('../worlds/foundry/descending-resonance/preset.json', import.meta.url), 'utf8'));
  const loop = JSON.parse(await readFile(new URL('../worlds/foundry/ricochet-garden-loop/preset.json', import.meta.url), 'utf8'));
  assert.equal(descending.objects.length, 12);
  assert.equal(Object.hasOwn(descending, 'capacity'), false);
  assert.equal(loop.objects.length <= 12, true);
  assert.equal(parseRangePreset(JSON.stringify(descending)).objects.length, 12);
  assert.equal(parseRangePreset(JSON.stringify(loop)).objects.length, loop.objects.length);
});

test('the 24-piece fixtures keep the original Descending Resonance shots', async () => {
  Logger.LogLevels = 0;
  const wasm = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
  const havok = await Havok({ wasmBinary: wasm });
  const passiveReport = await validateFoundryDirectory('worlds/foundry/capacity-24-passive', havok);
  const activeReport = await validateFoundryDirectory('worlds/foundry/capacity-24-active', havok);
  assert.equal(passiveReport.id, 'capacity-24-passive');
  assert.equal(activeReport.id, 'capacity-24-active');
  assert.equal(passiveReport.shots.includes('opening') && passiveReport.shots.includes('four'), true);
  assert.equal(activeReport.shots.includes('east-rake'), true);
  const passive = foundryPreset('capacity-24-passive');
  const active = foundryPreset('capacity-24-active');
  const original = foundryPreset('descending-resonance');
  for (const object of original.objects) {
    assert.deepEqual(passive.objects.find(item => item.id === object.id), object);
    assert.deepEqual(active.objects.find(item => item.id === object.id), object);
  }
  assert.equal(passive.objects.length, 24);
  assert.equal(active.objects.length, 24);
  assert.equal(passive.capacity, 24);
  assert.equal(active.capacity, 24);
});
