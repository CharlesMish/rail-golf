import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  createEmptyWorld, createHouseShotWorld, createOrcStaticWorld, createStarterWorld, createWorldcraftStore,
  exportWorldJSON, worldcraftFixedSetup,
} from '../lib/worldcraft-model.js';
import { createSoftLandingPreset, exportRangePreset, rangeOpeningSetup } from '../lib/worldcraft-range.js';
import { createResonanceOutput, createVoiceLedger } from '../lib/worldcraft-resonance.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';
import {
  foundryPreset, foundryRecord, foundryRemixWorld, listFoundryWorlds, loadFoundryPair, validateFoundryManifest,
} from '../lib/worldcraft-foundry.js';
import { validateFoundryDirectory } from '../scripts/foundry/validate.mjs';

Logger.LogLevels = 0;
const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => { data.set(key, String(value)); } };
}

test('foundry files stay declarative and the gallery lists one seed', async () => {
  const preset = JSON.parse(await readFile(new URL('../worlds/foundry/soft-landing/preset.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../worlds/foundry/soft-landing/manifest.json', import.meta.url), 'utf8'));
  const pair = loadFoundryPair(preset, manifest);
  assert.deepEqual(pair.preset, createSoftLandingPreset());
  assert.equal(pair.manifest.customCode, null);
  assert.notEqual(pair.manifest.challenge.id, pair.manifest.id);
  assert.equal(JSON.stringify(pair.preset).includes(pair.manifest.challenge.id), false);
  const cards = listFoundryWorlds();
  assert.deepEqual(cards.map(card => card.id), ['soft-landing']);
  assert.equal(cards[0].kind, 'shot-study');
  assert.equal(cards[0].editable.launcher, true);
  assert.equal(cards[0].editable.geometry, true);
  assert.equal(cards[0].hasChallenge, true);
  assert.equal(Object.hasOwn(cards[0], 'testedShots'), false);
  assert.equal(JSON.stringify(cards).includes('testedShots'), false);
  assert.equal(foundryRecord('soft-landing').manifest.testedShots[0].outcome.status, 'miss');
  assert.equal(foundryRecord('soft-landing').manifest.testedShots.length, 1);
  assert.equal(foundryRecord('soft-landing').manifest.limitations.length, 1);
  assert.equal(foundryRecord('soft-landing').manifest.limitations[0].category, 'physical-geometry');
  assert.match(foundryRecord('soft-landing').manifest.nearbySensitivity, /0\.5°/);
  assert.equal(JSON.stringify(cards).includes('17.86'), false);
  assert.equal(JSON.stringify(cards).includes('stepped descent'), false);
  const badCategory = structuredClone(manifest);
  badCategory.limitations = [{ category: 'vertical', concept: 'Keep the landing.', missing: 'No stairs.', extension: 'Do not add a prefab.' }];
  assert.throws(() => validateFoundryManifest(badCategory, preset), /category must be/);
  const dropped = structuredClone(manifest);
  delete dropped.limitations[0].extension;
  assert.throws(() => validateFoundryManifest(dropped, preset), /unsupported or missing fields/);
  const presentation = structuredClone(manifest);
  presentation.limitations = [{ category: 'presentation', concept: 'The yard reads on a phone.', missing: 'Survey does not label piece names in the world.', extension: 'A one-line caption under Survey, with no new geometry.' }];
  assert.equal(validateFoundryManifest(presentation, preset).limitations[0].category, 'presentation');
  const spoiled = structuredClone(manifest);
  spoiled.invitation = 'Look at https://example.test/solution';
  assert.throws(() => validateFoundryManifest(spoiled, preset), /remote addresses/);
  const extra = structuredClone(manifest);
  extra.script = 'alert(1)';
  assert.throws(() => validateFoundryManifest(extra, preset), /remote or script fields/);
  const sameId = structuredClone(manifest);
  sameId.challenge = { id: 'soft-landing', label: 'Same id' };
  assert.throws(() => validateFoundryManifest(sameId, preset), /differ from the world id/);
  const declared = structuredClone(manifest);
  declared.customCode = { module: 'lib/example.js', reason: 'A later lane would name this module.' };
  assert.equal(validateFoundryManifest(declared, preset).customCode.module, 'lib/example.js');
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
});

test('a remix is a new saved world and leaves the authored pair alone', () => {
  const record = foundryRecord('soft-landing');
  const before = exportRangePreset(foundryPreset('soft-landing'));
  const authoredRules = JSON.stringify(record.world.rules);
  const copy = foundryRemixWorld(record.world, { challengeId: record.manifest.challenge.id });
  const second = foundryRemixWorld(record.world, { id: 'copy-second', challengeId: record.manifest.challenge.id });
  assert.notEqual(copy.id, record.world.id);
  assert.notEqual(copy.id, record.manifest.challenge.id);
  assert.equal(copy.name, 'Copy of Soft Landing');
  assert.equal(JSON.stringify(copy.rules), authoredRules);
  assert.deepEqual(copy.objects, record.world.objects);
  assert.equal(exportRangePreset(foundryPreset('soft-landing')), before);
  const store = createWorldcraftStore(memoryStorage());
  const linesBefore = JSON.stringify(store.lines());
  store.saveWorld(copy);
  store.saveWorld(second);
  assert.equal(store.worlds().length, 2);
  assert.equal(JSON.stringify(store.lines()), linesBefore);
  assert.ok(store.worlds().every(entry => entry.world.id !== 'soft-landing' && entry.id !== 'soft-landing'));
  assert.throws(() => foundryRemixWorld(record.world, { id: 'soft-landing', challengeId: record.manifest.challenge.id }), /new world id/);
});

test('tested shots reproduce their terminals, and repeated load reset remix does not grow colliders', async () => {
  const Havok = (await import('@babylonjs/havok')).default;
  const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const template = await validateFoundryDirectory('worlds/foundry/_template', havok);
  const seed = await validateFoundryDirectory('worlds/foundry/soft-landing', havok);
  assert.equal(template.id, 'foundry-template');
  assert.deepEqual(template.shots, ['opening']);
  assert.equal(seed.id, 'soft-landing');
  assert.equal(seed.customCode, null);
  assert.deepEqual(seed.shots, ['opening']);

  const house = createHouseShotWorld();
  const foundry = foundryRecord('soft-landing');
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world: house, build: '46e59a78' });
  const setup = rangeOpeningSetup(foundry.preset);
  const counts = [];
  for (let i = 0; i < 6; i += 1) {
    runtime.setMode('build');
    assert.equal(runtime.replaceWorld(foundry.world, { intent: 'load' }).ok, true);
    assert.equal(runtime.setMode('play'), true);
    assert.equal(runtime.launch(setup), true, runtime.error);
    for (let step = 0; step < 7300 && !runtime.flight.ended; step += 1) {
      runtime.beforeStep();
      physics._step(1 / 120);
      runtime.afterStep();
    }
    assert.equal(runtime.last.terminal.reason, 'first-ground-contact');
    runtime.setMode('build');
    assert.equal(runtime.replaceWorld(foundry.world, { intent: 'load' }).ok, true);
    foundryRemixWorld(foundry.world, { challengeId: foundry.manifest.challenge.id });
    const diagnostics = runtime.diagnostics();
    counts.push({
      staticBodies: diagnostics.staticBodies,
      physicsBodies: diagnostics.physicsBodies,
      meshes: diagnostics.meshes,
      materials: diagnostics.materials,
      textures: diagnostics.textures,
      liveBodies: diagnostics.liveBodies,
    });
  }
  assert.deepEqual(counts[0], counts.at(-1));
  assert.equal(counts[0].liveBodies, 0);
  assert.ok(counts[0].physicsBodies > 0);
  runtime.dispose();
  assert.equal(scene.getPhysicsEngine().getBodies().length, 0);
  scene.dispose();
  engine.dispose();

  const ledger = createVoiceLedger();
  for (let i = 0; i < 6; i += 1) {
    ledger.watch({ stop() {}, disconnect() {} });
    ledger.release();
  }
  assert.deepEqual(ledger.counts(), { started: 6, cleaned: 6, finished: 0, active: 0 });
  const ear = createResonanceOutput();
  assert.equal(ear.state(), 'uncreated');
  ear.release();
  ear.dispose();
  assert.equal(ear.state(), 'uncreated');
  assert.deepEqual(ear.counts(), { started: 0, cleaned: 0, finished: 0, active: 0 });
  assert.ok(worldcraftFixedSetup(house));
});
