import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  WORLDCRAFT_CATALOG, WORLDCRAFT_CATALOG_VERSION, createEmptyWorld, createHouseShotWorld, createOrcStaticWorld, createStarterWorld,
  exportWorldJSON, validateWorld, worldcraftCanAdd,
} from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';
import { pieceDisplayLabels } from '../lib/worldcraft-resonance.js';
import { exportRangePreset, parseRangePreset, projectRangePreset } from '../lib/worldcraft-range.js';
import { terraceSagitta } from '../lib/worldcraft-terrace.js';

const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';

function shell(objects, launcher = { x: 0 }) {
  return {
    format: 'rail-golf-worldcraft', version: 1, id: 'terrace-fixture', name: 'Terrace fixture',
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher,
    objects,
    rules: { pin: null, locked: objects.map(object => object.id), allowance: {}, rail: null, goal: { kind: 'none' } },
  };
}

function step(index, patch = {}) {
  const elevation = (index + 1) * 0.5;
  return {
    id: `step-${index}`, kind: 'terrace', x: 0, z: 32, yaw: -180,
    innerRadius: 8 + index * 2, depth: 2, riser: elevation, span: 228, elevation, gap: 12,
    voice: { material: 'timber', degree: index % 5 },
    ...patch,
  };
}

test('the v1 export hash and the placeable catalog are unchanged', () => {
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
  assert.equal(WORLDCRAFT_CATALOG_VERSION, 'worldcraft-prefabs-v2');
  assert.deepEqual(Object.keys(WORLDCRAFT_CATALOG), ['bank', 'ramp', 'block', 'plate']);
  assert.equal(blob.includes('terrace'), false);
});

test('a curved terrace is a fixed lab piece and stays off the placeable catalog', () => {
  const bowl = validateWorld(shell([0, 1, 2, 3, 4, 5].map(index => step(index))));
  assert.equal(bowl.objects.length, 6);
  assert.equal(bowl.objects[5].gap, 12);
  assert.equal(exportWorldJSON(bowl).includes('"kind": "terrace"'), true);
  assert.equal(worldcraftCanAdd(bowl, 'terrace'), false);
  assert.ok(terraceSagitta(18) < 0.1);
  const unlocked = shell([step(0)]);
  unlocked.rules.locked = [];
  assert.throws(() => validateWorld(unlocked), /fixed lab piece/);
  assert.throws(() => validateWorld(shell([{ id: 'a', kind: 'bank', x: 0, z: 40, yaw: 0, innerRadius: 8 }])), /unsupported or missing fields/);
  assert.throws(() => validateWorld(shell([step(0, { span: 200 })])), /12 increments/);
  const stage = validateWorld(shell([0, 1, 2, 3, 4, 5].map(index => step(index)), { x: 0, z: 32, yaw: -180 }));
  assert.deepEqual(stage.launcher, { x: 0, z: 32, yaw: -180 });
  assert.equal(exportWorldJSON(validateWorld(shell([]))).includes('"yaw"'), false);
  const labels = pieceDisplayLabels(stage.objects);
  assert.notEqual(labels.get('step-0'), labels.get('step-5'));
  assert.match(labels.get('step-5'), /3 m/);
  const preset = parseRangePreset(exportRangePreset({
    format: 'rail-golf-worldcraft-range-preset', version: 1, id: 'stage-round-trip', name: 'Stage round trip',
    environment: stage.environment, launcher: stage.launcher, objects: stage.objects,
    rules: { launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 }, fixed: stage.objects.map(object => object.id), allowance: {}, goal: { kind: 'none' } },
  }));
  const projected = projectRangePreset(preset, stage);
  assert.deepEqual(projected.launcher, { x: 0, z: 32, yaw: -180 });
});

test('a landing on a terrace is not first ground', async () => {
  const one = step(0, { innerRadius: 8, depth: 4, riser: 0.5, span: 180, elevation: 0.5 });
  delete one.gap;
  const world = validateWorld(shell([one]));
  const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: 'terrace-test' });
  runtime.setMode('play');
  assert.equal(runtime.launch({ railIndex: 1, originX: 0, yaw: 0, elevation: 8, charge: 0.35 }), true);
  for (let i = 0; i < 7300 && !runtime.flight.ended; i += 1) {
    runtime.beforeStep();
    physics._step(1 / 120);
    runtime.afterStep();
  }
  const contacts = runtime.last.contacts.map(row => row.body);
  assert.equal(contacts[0], 'worldcraft-object-step-0');
  assert.ok(contacts.at(-1) === 'worldcraft-ground' || contacts.at(-1) === 'worldcraft-tee');
  assert.notEqual(contacts.at(-1), 'worldcraft-object-step-0');
  assert.equal(runtime.last.terminal.reason, 'first-ground-contact');
  assert.equal(runtime.last.resonance.impacts.some(impact => impact.piece === 'step-0' && impact.gain > 0), true);
  runtime.dispose();
  assert.equal(physics.getBodies().length, 0);
  scene.dispose();
  engine.dispose();
});
