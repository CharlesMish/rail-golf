import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES, chargeToSpeed } from '../lib/rail-golf-v02.js';
import { stationMuzzle, stationAim, stationRailPosition } from '../lib/stations.js';
import {
  createHouseShotWorld, createOrcStaticWorld, createStarterWorld, createEmptyWorld,
  exportWorldJSON, parseWorldJSON, worldcraftIdentity, validateWorld, validateWorldEdit,
  validateWorldcraftShot, worldcraftFixedSetup, worldcraftPinResult, worldcraftTargetResult,
  worldcraftGoalResult, WORLDCRAFT_CATALOG,
} from '../lib/worldcraft-model.js';
import {
  adaptRangePreset, bindRangeShot, createOpenWorkshopPreset, exportRangePreset, importRangeDocument,
  inferOutcome, latchRecordedComparison, listRangePresets, parseRangePreset, projectRangePreset,
  rangeBindingText, rangePreset, recordedTrail, sha256Hex, validateRangePreset,
} from '../lib/worldcraft-range.js';
import { createVoiceLedger } from '../lib/worldcraft-resonance.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';
import { runRange } from '../scripts/range/run.mjs';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';

function launchFor(setup) {
  const station = { id: 'worldcraft', label: 'Worldcraft apron', x: setup.originX, z: 0, yaw: 0 };
  const aim = stationAim(setup, station);
  const rail = stationRailPosition(setup.railIndex, station);
  rail.y = 0;
  return { station, muzzle: stationMuzzle(setup, station), rail, aim, direction: aim, speed: chargeToSpeed(setup.charge), mass: RAIL_RULES.projectileMass, radius: RAIL_RULES.projectileRadius };
}
function harness(world) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: '4a2be209' });
  return { runtime, physics,
    shoot(setup) {
      assert.equal(runtime.setMode('play'), true);
      assert.equal(runtime.launch(setup), true, runtime.error);
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
      assert.ok(runtime.last);
      runtime.setMode('build');
      return runtime.last;
    },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}

test('v1 worlds keep their bytes, rules, and lack an explicit goal', () => {
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
  const house = createHouseShotWorld(), orc = createOrcStaticWorld(), starter = createStarterWorld();
  assert.equal(Object.hasOwn(house.rules, 'goal'), false);
  assert.equal(Object.hasOwn(orc.rules, 'goal'), false);
  assert.equal(starter.rules, null);
  assert.equal(worldcraftGoalResult(house, { reason: 'first-ground-contact', position: [-10, .43, 72.5] }), null);
  assert.equal(worldcraftPinResult(house, { reason: 'first-ground-contact', position: [-10, .43, 72.5] }).status, 'clear');
  assert.equal(parseWorldJSON(exportWorldJSON(house)).rules.pin.r, 3);
  assert.throws(() => parseWorldJSON(exportRangePreset(createOpenWorkshopPreset())));
  const imported = importRangeDocument(exportWorldJSON(orc));
  assert.equal(imported.kind, 'world');
  assert.deepEqual(imported.world, orc);
  assert.equal(WORLDCRAFT_CATALOG.plate.friction, .18);
  assert.equal(WORLDCRAFT_CATALOG.plate.restitution, .86);
  assert.equal(RAIL_RULES.projectileMass, 1.5);
  assert.equal(RAIL_RULES.projectileRadius, .43);
  assert.equal(RAIL_RULES.gravity, 12);
});

test('Open Workshop is a versioned preset with a fixed launcher, movable resonant pieces, and goal none', async () => {
  const preset = createOpenWorkshopPreset();
  const text = exportRangePreset(preset);
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-open-workshop.json', import.meta.url), 'utf8'), text);
  assert.equal(exportRangePreset(parseRangePreset(text)), text);
  assert.deepEqual(parseRangePreset(text), preset);
  const loaded = importRangeDocument(text);
  assert.equal(loaded.kind, 'preset');
  assert.deepEqual(loaded.preset, preset);
  const { world } = adaptRangePreset(preset);
  assert.equal(world.rules.goal.kind, 'none');
  assert.equal(world.rules.pin, null);
  assert.equal(Object.hasOwn(world.rules, 'target'), false);
  assert.deepEqual(worldcraftFixedSetup(world), { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: .55 });
  assert.deepEqual(world.rules.locked, []);
  assert.deepEqual(preset.objects.map(object => [object.id, object.voice.material, object.voice.degree]), [
    ['ramp-yours', 'metal', 1], ['bank-yours', 'timber', 0], ['plate-yours', 'metal', 2],
  ]);
  assert.deepEqual(listRangePresets(), [
    { id: 'open-workshop', name: 'Open Workshop', goal: 'none' },
    { id: 'travelling-bell', name: 'Travelling Bell', goal: 'target-contact' },
  ]);
  assert.deepEqual(inferOutcome(world, { reason: 'first-ground-contact', position: [0, .43, 90], contacts: [{ body: 'worldcraft-target-stand-in-orc' }] }), { kind: 'none', status: 'none', scored: false });
  assert.equal(worldcraftPinResult(world, { reason: 'first-ground-contact', position: [0, .43, 72.5] }), null);
  assert.equal(worldcraftTargetResult(world, { reason: 'first-ground-contact', contacts: [{ body: 'worldcraft-target-stand-in-orc' }] }), null);
  assert.throws(() => validateWorldcraftShot(world, { ...worldcraftFixedSetup(world), yaw: 1 }));
  const moved = { ...world, objects: world.objects.map(object => object.id === 'ramp-yours' ? { ...object, yaw: 5 } : object) };
  assert.equal(worldcraftIdentity(adaptRangePreset(projectRangePreset(preset, moved)).world), worldcraftIdentity(validateWorld(moved)));
  assert.throws(() => validateRangePreset({ ...preset, rules: { ...preset.rules, launcher: { ...preset.rules.launcher, fixed: false } } }));
  assert.throws(() => validateWorld({ ...world, rules: { ...world.rules, pin: { x: -10, z: 72.5, r: 3 } } }));
});

test('fixed pieces cannot be moved and goal kinds do not borrow each others outcomes', () => {
  const open = createOpenWorkshopPreset();
  const locked = validateRangePreset({
    ...open,
    id: 'locked-shield',
    name: 'Locked shield',
    objects: [...open.objects, { id: 'shield', kind: 'block', x: -10, z: 52, yaw: 0 }],
    rules: { ...open.rules, fixed: ['shield'] },
  });
  const { world } = adaptRangePreset(locked);
  assert.deepEqual(world.rules.locked, ['shield']);
  assert.throws(() => validateWorldEdit(world, { ...world, objects: world.objects.map(object => object.id === 'shield' ? { ...object, x: -9.5 } : object) }));
  assert.throws(() => validateWorldEdit(world, { ...world, objects: world.objects.filter(object => object.id !== 'shield') }));
  assert.doesNotThrow(() => validateWorldEdit(world, { ...world, objects: world.objects.map(object => object.id === 'bank-yours' ? { ...object, yaw: 5 } : object) }));
  const zone = adaptRangePreset(validateRangePreset({
    ...open,
    id: 'zone-check',
    name: 'Zone check',
    objects: [open.objects[0]],
    rules: { ...open.rules, allowance: { ramp: 1 }, goal: { kind: 'first-ground-zone', x: -10, z: 72.5, r: 3 } },
  })).world;
  assert.deepEqual(worldcraftGoalResult(zone, { reason: 'first-ground-contact', position: [-10, .43, 72.5] }).scored, true);
  assert.equal(worldcraftGoalResult(zone, { reason: 'first-ground-contact', position: [10, .43, 40] }).scored, false);
  assert.equal(worldcraftTargetResult(zone, { reason: 'first-ground-contact', contacts: [{ body: 'worldcraft-target-stand-in-orc' }] }), null);
  const target = adaptRangePreset(validateRangePreset({
    ...open,
    id: 'target-check',
    name: 'Target check',
    rules: { ...open.rules, goal: { kind: 'target-contact', id: 'stand-in-orc', x: -26, z: 58.5, yaw: 0 } },
  })).world;
  const hit = worldcraftGoalResult(target, { reason: 'first-ground-contact', contacts: [{ body: 'worldcraft-target-stand-in-orc', point: { x: 0, y: 1, z: 2 }, count: 1, first: 1, last: 1 }] });
  assert.equal(hit.scored, true);
  assert.equal(hit.kind, 'target-contact');
  assert.equal(worldcraftPinResult(target, { reason: 'first-ground-contact', position: [-26, .43, 58.5] }), null);
  assert.throws(() => validateRangePreset({ ...open, rules: { ...open.rules, goal: { kind: 'score' } } }));
});

test('a shot record binds outcome to the recorded world and setup, and the previous trail stays the recorded one', async () => {
  const { preset, world } = adaptRangePreset(createOpenWorkshopPreset());
  const setup = worldcraftFixedSetup(world);
  const terminal = { reason: 'first-ground-contact', elapsed: 4, position: [0, .43, 91] };
  const contacts = [{ body: 'worldcraft-object-ramp-yours', point: { x: 0, y: 1, z: 42 }, count: 2, first: 1.4, last: 1.42 }];
  const points = [{ t: 0, x: 0, y: 1.5, z: 0 }, { t: 1, x: 0, y: 2, z: 20 }];
  const shot = await bindRangeShot({ preset, world, setup, build: '4a2be209', launch: launchFor(setup), points, contacts, terminal });
  assert.equal(shot.outcome.kind, 'none');
  assert.equal(shot.outcome.scored, false);
  assert.equal(shot.presetId, 'open-workshop');
  assert.equal(shot.bindingHash, await sha256Hex(rangeBindingText(shot.worldSnapshot.worldIdentity, shot.setup)));
  assert.equal(shot.presetHash, await sha256Hex(exportRangePreset(preset)));
  assert.deepEqual(shot.contacts, contacts);
  assert.deepEqual(shot.terminal, terminal);
  assert.equal(shot.worldSnapshot.worldIdentity, worldcraftIdentity(world));
  const previous = recordedTrail({ label: 'Latest line', worldIdentity: shot.worldSnapshot.worldIdentity, setup, points });
  const nextPoints = [{ t: 0, x: 1, y: 1, z: 0 }, { t: 1, x: 4, y: 1, z: 30 }];
  const latched = latchRecordedComparison(previous, { label: 'Latest line', worldIdentity: 'later-world', setup, points: nextPoints });
  assert.deepEqual(latched.comparison.points, points);
  assert.deepEqual(latched.history.points, nextPoints);
  points[0].x = 99;
  assert.equal(latched.comparison.points[0].x, 0);
  const house = createHouseShotWorld();
  const houseSetup = worldcraftFixedSetup(house);
  const houseShot = await bindRangeShot({ world: house, setup: houseSetup, build: '4a2be209', launch: launchFor(houseSetup), points: [{ t: 0, x: 0, y: 1, z: 0 }], contacts: [], terminal: { reason: 'first-ground-contact', position: [-10, .43, 72.5] } });
  assert.equal(houseShot.presetId, null);
  assert.equal(houseShot.outcome.kind, 'first-ground-zone');
  assert.equal(houseShot.outcome.scored, true);
});

test('voice release counts nodes that are stopped, and natural endings are not cleaned twice', () => {
  const ledger = createVoiceLedger();
  let stopped = 0, disconnected = 0, ended = null;
  const node = { stop() { stopped += 1; }, disconnect() { disconnected += 1; }, addEventListener(_type, fn) { ended = fn; } };
  ledger.watch(node);
  assert.deepEqual(ledger.counts(), { started: 1, cleaned: 0, finished: 0, active: 1 });
  assert.equal(ledger.release(), 1);
  assert.equal(stopped, 1);
  assert.equal(disconnected, 1);
  assert.equal(ledger.counts().cleaned, 1);
  assert.equal(ledger.counts().active, 0);
  ended();
  assert.equal(ledger.counts().finished, 0);
  const other = createVoiceLedger();
  let finish = null;
  other.watch({ stop() {}, disconnect() {}, addEventListener(_type, fn) { finish = fn; } });
  finish();
  assert.equal(other.counts().finished, 1);
  assert.equal(other.release(), 0);
});

test('twenty preset reloads keep the same Havok body count, and the runner writes deterministic raw JSONL', async () => {
  const { world } = adaptRangePreset(createOpenWorkshopPreset());
  const session = harness(world);
  try {
    const before = session.runtime.diagnostics();
    assert.equal(before.staticBodies, 5);
    for (let i = 0; i < 20; i++) {
      assert.equal(session.runtime.setMode('build'), true);
      assert.deepEqual(session.runtime.replaceWorld(world, { intent: 'load' }), { ok: true });
    }
    const after = session.runtime.diagnostics();
    assert.equal(after.staticBodies, before.staticBodies);
    assert.equal(after.physicsBodies, before.physicsBodies);
    assert.equal(after.rebuildCount, before.rebuildCount + 20);
    const last = session.shoot(worldcraftFixedSetup(world));
    assert.equal(last.goalResult.kind, 'none');
    assert.equal(last.goalResult.scored, false);
    assert.equal(last.pinResult, null);
    assert.equal(last.targetResult, null);
    assert.equal(last.reason, 'first-ground-contact');
    assert.ok(last.contacts.some(contact => contact.body === 'worldcraft-object-ramp-yours'));
    assert.ok(last.contacts.some(contact => contact.body === 'worldcraft-object-plate-yours'));
    assert.equal(last.launch.mass, 1.5);
    assert.equal(last.launch.radius, .43);
  } finally { session.dispose(); }

  const file = JSON.parse(await readFile(new URL('../docs/experiments/range/setups/open-workshop.json', import.meta.url), 'utf8'));
  const first = await runRange({ preset: 'open-workshop', setups: file.setups, seed: file.seed, gitSha: '4a2be209', havok });
  const second = await runRange({ preset: 'open-workshop', setups: file.setups, seed: file.seed, gitSha: '4a2be209', havok });
  assert.equal(first.rejected, 0);
  assert.equal(first.lines[0].type, 'provenance');
  assert.equal(first.lines[0].seed, 20261024);
  assert.equal(first.lines[0].presetId, 'open-workshop');
  assert.equal(first.lines[0].presetHash, await sha256Hex(exportRangePreset(rangePreset('open-workshop'))));
  assert.equal(first.lines[0].projectileMass, 1.5);
  assert.equal(first.lines[1].type, 'shot');
  assert.equal(first.lines[1].outcome.scored, false);
  assert.deepEqual(first.lines[1].terminal, second.lines[1].terminal);
  assert.deepEqual(first.lines[1].points, second.lines[1].points);
  assert.equal(first.lines[1].bindingHash, second.lines[1].bindingHash);
  const bad = await runRange({ preset: 'open-workshop', setups: [{ ...file.setups[0], yaw: 1 }], seed: file.seed, gitSha: '4a2be209', havok });
  assert.equal(bad.rejected, 1);
  assert.equal(bad.lines[1].type, 'rejected');
  const directory = await mkdtemp(join(tmpdir(), 'range-'));
  const out = join(directory, 'open-workshop.jsonl');
  const written = await runRange({ preset: 'open-workshop', setups: file.setups, seed: file.seed, gitSha: '4a2be209', havok });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(out, written.lines.map(line => JSON.stringify(line)).join('\n') + '\n');
  const rows = (await readFile(out, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].gitSha, '4a2be209');
});
