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
  worldcraftGoalResult, contactPhraseHeard, WORLDCRAFT_CATALOG,
} from '../lib/worldcraft-model.js';
import {
  adaptRangePreset, bindRangeShot, createBackPocketPreset, createOpenWorkshopPreset, createResonantRunFreePreset,
  createResonantRunPhrasePreset, createSoftLandingPreset,
  exportRangePreset, importRangeDocument,
  inferOutcome, latchRecordedComparison, listRangePresets, parseRangePreset, projectRangePreset,
  rangeBindingText, rangeOpeningSetup, rangePreset, rangeStartingSetup, recordedTrail, retargetRangeOpening, sha256Hex, validateRangePreset,
} from '../lib/worldcraft-range.js';
import { createVoiceLedger } from '../lib/worldcraft-resonance.js';
import { buildWorldcraftScene, createWorldcraftMaterials, WORLDCRAFT_CONTACTS } from '../lib/worldcraft-scene.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';
import { createRangeHarness, runRange } from '../scripts/range/run.mjs';

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
    { id: 'back-pocket', name: 'Back Pocket', goal: 'first-ground-zone' },
    { id: 'soft-landing', name: 'Soft Landing', goal: 'first-ground-zone' },
    { id: 'resonant-run-free', name: 'Resonant Run: Free', goal: 'none' },
    { id: 'resonant-run-phrase', name: 'Resonant Run: Phrase', goal: 'contact-phrase' },
    { id: 'travelling-bell', name: 'Travelling Bell', goal: 'target-contact' },
    { id: 'clockwork-gallery', name: 'Clockwork Gallery', goal: 'target-contact' },
  ]);
  assert.deepEqual(inferOutcome(world, { reason: 'first-ground-contact', position: [0, .43, 90], contacts: [{ body: 'worldcraft-target-stand-in-orc' }] }), { kind: 'none', status: 'none', scored: false });
  assert.equal(worldcraftPinResult(world, { reason: 'first-ground-contact', position: [0, .43, 72.5] }), null);
  assert.equal(worldcraftTargetResult(world, { reason: 'first-ground-contact', contacts: [{ body: 'worldcraft-target-stand-in-orc' }] }), null);
  assert.throws(() => validateWorldcraftShot(world, { ...worldcraftFixedSetup(world), yaw: 1 }));
  const moved = { ...world, objects: world.objects.map(object => object.id === 'ramp-yours' ? { ...object, yaw: 5 } : object) };
  assert.equal(worldcraftIdentity(adaptRangePreset(projectRangePreset(preset, moved)).world), worldcraftIdentity(validateWorld(moved)));
  const unfixed = validateRangePreset({ ...preset, id: 'open-aim', name: 'Open aim', rules: { ...preset.rules, launcher: { ...preset.rules.launcher, fixed: false } } });
  assert.equal(unfixed.rules.launcher.fixed, false);
  assert.equal(adaptRangePreset(unfixed).world.rules.rail, null);
  assert.throws(() => validateRangePreset({ ...preset, rules: { ...preset.rules, launcher: { ...preset.rules.launcher, fixed: 'yes' } } }));
  assert.throws(() => validateWorld({ ...world, rules: { ...world.rules, pin: { x: -10, z: 72.5, r: 3 } } }));
});

test('Back Pocket locks the screen and the carriage, and keeps aim inside its window', async () => {
  const preset = createBackPocketPreset();
  const text = exportRangePreset(preset);
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-back-pocket.json', import.meta.url), 'utf8'), text);
  assert.equal(exportRangePreset(parseRangePreset(text)), text);
  const { world } = adaptRangePreset(preset);
  assert.equal(world.rules.goal.kind, 'first-ground-zone');
  assert.equal(world.rules.pin.r, 4);
  assert.equal(world.rules.rail, null);
  assert.equal(world.rules.originFixed, true);
  assert.deepEqual(world.rules.locked, ['screen-a', 'screen-b', 'screen-c']);
  assert.deepEqual(world.rules.aimWindow, { yawMin: -60, yawMax: 60, elevationMin: 8, elevationMax: 26, chargeMin: 0.3, chargeMax: 0.9 });
  assert.deepEqual(rangeOpeningSetup(preset), { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 });
  assert.throws(() => validateWorldcraftShot(world, { ...rangeOpeningSetup(preset), originX: 1 }));
  assert.throws(() => validateWorldcraftShot(world, { ...rangeOpeningSetup(preset), yaw: 61 }));
  assert.throws(() => validateWorldcraftShot(world, { ...rangeOpeningSetup(preset), elevation: 7 }));
  assert.throws(() => validateWorldcraftShot(world, { ...rangeOpeningSetup(preset), charge: 0.95 }));
  assert.doesNotThrow(() => validateWorldcraftShot(world, { ...rangeOpeningSetup(preset), yaw: -6, elevation: 24, charge: 0.65 }));
  assert.throws(() => validateWorldEdit(world, { ...world, objects: world.objects.map(object => object.id === 'screen-b' ? { ...object, x: -5.5 } : object) }));
  const moved = { ...world, objects: world.objects.map(object => object.id === 'bank-yours' ? { ...object, x: -8, z: 62, yaw: 0 } : object) };
  assert.equal(worldcraftIdentity(adaptRangePreset(projectRangePreset(preset, moved)).world), worldcraftIdentity(validateWorld(moved)));
  const aimed = retargetRangeOpening(preset, { railIndex: 1, originX: 0, yaw: -6, elevation: 24, charge: 0.65 });
  assert.equal(aimed.rules.launcher.fixed, false);
  assert.equal(aimed.rules.launcher.yaw, -6);
  assert.deepEqual(aimed.rules.launcher.window, preset.rules.launcher.window);
  assert.throws(() => retargetRangeOpening(preset, { railIndex: 1, originX: 2, yaw: 0, elevation: 18, charge: 0.55 }));
});

test('Soft Landing judges a gold circle and leaves the launcher inside the existing shot bounds', async () => {
  const preset = createSoftLandingPreset();
  const text = exportRangePreset(preset);
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-soft-landing.json', import.meta.url), 'utf8'), text);
  assert.equal(exportRangePreset(parseRangePreset(text)), text);
  const { world } = adaptRangePreset(preset);
  assert.equal(world.rules.rail, null);
  assert.equal(worldcraftFixedSetup(world), null);
  assert.equal(world.rules.goal.kind, 'first-ground-zone');
  assert.deepEqual(world.rules.pin, { x: 0, z: 64, r: 2.5 });
  assert.deepEqual(world.rules.goal, { kind: 'first-ground-zone', x: 0, z: 64, r: 2.5 });
  assert.deepEqual(rangeStartingSetup(preset), { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 });
  assert.deepEqual(preset.objects.map(object => [object.id, object.kind, object.x, object.z, object.yaw]), [
    ['backstop', 'block', 18, 86, 0],
    ['redirect', 'bank', -18, 28, 0],
  ]);
  assert.deepEqual(preset.rules.allowance, { bank: 1, block: 1 });
  assert.deepEqual(world.rules.locked, []);
  const aimed = { ...rangeStartingSetup(preset), yaw: 4, elevation: 25, charge: 0.61 };
  assert.deepEqual(validateWorldcraftShot(world, aimed), aimed);
  assert.throws(() => validateWorldcraftShot(world, { ...aimed, yaw: 71 }));
  assert.throws(() => validateWorldcraftShot(world, { ...aimed, originX: 0.25 }));
  const moved = { ...world, objects: world.objects.map(object => object.id === 'backstop' ? { ...object, x: 0, z: 69 } : object) };
  const projected = projectRangePreset(preset, moved);
  assert.equal(projected.rules.launcher.fixed, false);
  assert.equal(projected.rules.launcher.charge, 0.55);
  assert.deepEqual(projected.rules.goal, preset.rules.goal);
  assert.equal(worldcraftIdentity(adaptRangePreset(projected).world), worldcraftIdentity(validateWorld(moved)));
  assert.throws(() => validateWorld({ ...world, objects: [...world.objects, { id: 'extra-block', kind: 'block', x: 0, z: 48, yaw: 0 }] }));
  const fragile = parseRangePreset(await readFile(new URL('../docs/experiments/range/appendix/soft-landing/fragile.json', import.meta.url), 'utf8'));
  const forgiving = parseRangePreset(await readFile(new URL('../docs/experiments/range/appendix/soft-landing/forgiving.json', import.meta.url), 'utf8'));
  const session = harness(world);
  try {
    const opening = session.shoot(rangeStartingSetup(preset));
    assert.equal(opening.goalResult.kind, 'first-ground-zone');
    assert.equal(opening.goalResult.scored, false);
    assert.equal(opening.reason, 'first-ground-contact');
    assert.ok(opening.goalResult.distance > 10);
    assert.equal(opening.launch.mass, 1.5);
    assert.equal(opening.launch.radius, 0.43);
    const fragileText = exportRangePreset(fragile);
    const forgivingText = exportRangePreset(forgiving);
    assert.equal(await readFile(new URL('../docs/experiments/range/appendix/soft-landing/fragile.json', import.meta.url), 'utf8'), fragileText);
    assert.equal(await readFile(new URL('../docs/experiments/range/appendix/soft-landing/forgiving.json', import.meta.url), 'utf8'), forgivingText);
    assert.equal(fragile.rules.goal.r, preset.rules.goal.r);
    assert.equal(forgiving.rules.goal.z, preset.rules.goal.z);
    assert.deepEqual(fragile.objects, preset.objects);
    assert.equal(forgiving.objects.find(object => object.id === 'backstop').z, 69);
    const fragileWorld = adaptRangePreset(fragile).world;
    const forgivingWorld = adaptRangePreset(forgiving).world;
    const fragileShot = session.shoot(rangeStartingSetup(fragile));
    const missedLong = session.shoot({ ...rangeStartingSetup(forgiving), railIndex: 1 });
    assert.equal(missedLong.goalResult.scored, false);
    session.runtime.setMode('build');
    assert.equal(session.runtime.replaceWorld(forgivingWorld, { intent: 'load' }).ok, true);
    const forgivingShot = session.shoot(rangeStartingSetup(forgiving));
    assert.equal(fragileShot.goalResult.scored, true);
    assert.equal(forgivingShot.goalResult.scored, true);
    assert.ok(forgivingShot.contacts.some(contact => contact.body === 'worldcraft-object-backstop'));
    assert.equal(fragileShot.contacts.some(contact => contact.body === 'worldcraft-object-backstop'), false);
    assert.equal(worldcraftIdentity(fragileWorld), worldcraftIdentity(world));
    assert.notEqual(worldcraftIdentity(forgivingWorld), worldcraftIdentity(world));
  } finally { session.dispose(); }
  const again = await runRange({ preset: forgiving, setups: [rangeStartingSetup(forgiving)], seed: 20261024, gitSha: '4a2be209', havok });
  const replay = await runRange({ preset: parseRangePreset(exportRangePreset(forgiving)), setups: [rangeStartingSetup(forgiving)], seed: 20261024, gitSha: '4a2be209', havok });
  assert.equal(again.lines[1].outcome.scored, true);
  assert.deepEqual(again.lines[1].terminal, replay.lines[1].terminal);
  assert.deepEqual(again.lines[1].points, replay.lines[1].points);
  assert.equal(again.lines[1].presetHash, await sha256Hex(exportRangePreset(forgiving)));
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

test('Back Pocket opening misses and both appendix imports clear under Havok', async () => {
  const session = createRangeHarness(havok, adaptRangePreset(createBackPocketPreset()).world, '4a2be209');
  try {
    const opening = session.shoot(adaptRangePreset(createBackPocketPreset()).world, rangeOpeningSetup(createBackPocketPreset()));
    assert.equal(opening.goalResult.scored, false);
    assert.equal(opening.reason, 'first-ground-contact');
    assert.ok(opening.goalResult.distance > 10);
    for (const name of ['family-1', 'family-2']) {
      const text = await readFile(new URL(`../docs/experiments/range/appendix/back-pocket/${name}.json`, import.meta.url), 'utf8');
      const preset = parseRangePreset(text);
      assert.equal(exportRangePreset(preset) + '\n', text);
      assert.equal(preset.id, 'back-pocket');
      const world = adaptRangePreset(preset).world;
      const shot = session.shoot(world, rangeOpeningSetup(preset));
      assert.equal(shot.reason, 'first-ground-contact');
      assert.equal(shot.goalResult.scored, true);
      assert.ok(shot.goalResult.distance < 1);
      assert.ok(shot.contacts.some(contact => contact.body === 'worldcraft-object-bank-yours'));
    }
  } finally { session.dispose(); }
  assert.deepEqual(listRangePresets().map(item => item.id), ['open-workshop', 'back-pocket', 'soft-landing', 'resonant-run-free', 'resonant-run-phrase', 'travelling-bell', 'clockwork-gallery']);
});

test('a contact phrase is the ledger order, and the stand-in is a separate judgement', async () => {
  const { world } = adaptRangePreset(createResonantRunPhrasePreset());
  const opening = [
    { body: 'worldcraft-object-ramp-yours', point: { x: 0, y: 1, z: 42 }, count: 4, first: 1.4, last: 1.43 },
    { body: 'worldcraft-object-plate-yours', point: { x: 0, y: 1, z: 68 }, count: 2, first: 4.4, last: 4.42 },
    { body: 'worldcraft-ground', point: { x: 0, y: 0, z: 90 }, count: 1, first: 7, last: 7 },
  ];
  assert.deepEqual(contactPhraseHeard(world, opening), [1, 2]);
  const miss = worldcraftGoalResult(world, { reason: 'first-ground-contact', position: [0, .43, 90], contacts: opening });
  assert.equal(miss.kind, 'contact-phrase');
  assert.equal(miss.status, 'miss');
  assert.equal(miss.scored, false);
  assert.deepEqual(miss.notes, [0, 1, 2]);
  assert.equal(miss.standIn.status, 'miss');
  assert.equal(miss.standIn.body, 'worldcraft-target-stand-in-orc');
  assert.equal(worldcraftPinResult(world, { reason: 'first-ground-contact', position: [0, .43, 72] }), null);
  assert.equal(worldcraftTargetResult(world, { reason: 'first-ground-contact', contacts: opening }), null);
  const spelled = [
    { body: 'worldcraft-object-bank-yours', point: { x: 0, y: 1, z: 1 }, count: 8, first: .2, last: .26 },
    { body: 'worldcraft-object-ramp-yours', point: { x: 0, y: 1, z: 2 }, count: 2, first: 1, last: 1.02 },
    { body: 'worldcraft-target-stand-in-orc', point: { x: -26, y: 1, z: 58 }, count: 3, first: 2, last: 2.04 },
    { body: 'worldcraft-object-plate-yours', point: { x: 0, y: 1, z: 4 }, count: 2, first: 3, last: 3.02 },
  ];
  const hit = worldcraftGoalResult(world, { reason: 'first-ground-contact', contacts: spelled });
  assert.equal(hit.status, 'match');
  assert.deepEqual(hit.heard, [0, 1, 2]);
  assert.equal(hit.standIn.status, 'hit');
  assert.equal(hit.scored, false);
  const stopped = worldcraftGoalResult(world, { reason: 'interrupted', contacts: spelled });
  assert.equal(stopped.status, 'unfinished');
  assert.equal(stopped.standIn.status, 'hit');
  assert.equal(worldcraftGoalResult(world, { contacts: spelled }).status, 'unfinished');
  const free = adaptRangePreset(createResonantRunFreePreset());
  assert.equal(free.world.rules.goal.kind, 'none');
  assert.equal(Object.hasOwn(free.world.rules, 'target'), false);
  assert.deepEqual(free.world.objects, adaptRangePreset(createOpenWorkshopPreset()).world.objects);
  assert.deepEqual(free.preset.rules.allowance, { bank: 1, plate: 1, ramp: 1 });
  assert.equal(exportRangePreset(rangePreset('resonant-run-free')).includes('"Resonant Run: Free"'), true);
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-resonant-run-free.json', import.meta.url), 'utf8'), exportRangePreset(createResonantRunFreePreset()));
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-resonant-run-phrase.json', import.meta.url), 'utf8'), exportRangePreset(createResonantRunPhrasePreset()));
  assert.throws(() => validateRangePreset({ ...free.preset, rules: { ...free.preset.rules, goal: { kind: 'contact-phrase', notes: [0], standIn: null } } }));
});

function shapeMaterials(world) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const palette = createWorldcraftMaterials(scene);
  const built = buildWorldcraftScene(scene, world, { materials: palette.materials });
  const rows = built.bodies.map(aggregate => {
    const material = aggregate.shape?.material;
    if (!material || !Number.isFinite(material.friction) || !Number.isFinite(material.restitution)) {
      throw new Error(`No Havok material on ${aggregate.transformNode?.name}`);
    }
    return { name: aggregate.transformNode.name, friction: material.friction, restitution: material.restitution };
  });
  built.dispose();
  palette.dispose();
  scene.dispose();
  engine.dispose();
  return rows;
}

test('Resonant Run opening misses the phrase, and retuning leaves Havok materials and samples unchanged', () => {
  const phrase = adaptRangePreset(createResonantRunPhrasePreset());
  const session = harness(phrase.world);
  try {
    const opening = session.shoot(worldcraftFixedSetup(phrase.world));
    assert.equal(opening.goalResult.status, 'miss');
    assert.deepEqual(opening.goalResult.heard, [1, 2]);
    assert.equal(opening.goalResult.standIn.status, 'miss');
    assert.equal(opening.goalResult.scored, false);
    const resonantRows = opening.contacts.filter(contact => contact.body.startsWith('worldcraft-object-'));
    assert.equal(opening.resonance.sounds, resonantRows.length);
    assert.equal(opening.resonance.sounds, opening.goalResult.heard.length);
    assert.ok(opening.resonance.resonantCallbacks >= opening.resonance.sounds);
    assert.ok(resonantRows.every(contact => contact.count > 1));
    assert.equal(opening.resonance.collapsed, opening.resonance.resonantCallbacks - opening.resonance.sounds);
    const retuned = validateWorld({
      ...phrase.world,
      objects: phrase.world.objects.map(object => ({
        ...object,
        voice: { material: object.voice.material === 'metal' ? 'timber' : 'metal', degree: (object.voice.degree + 3) % 5 },
      })),
    });
    assert.equal(session.runtime.replaceWorld(retuned, { intent: 'load' }).ok, true);
    const again = session.shoot(worldcraftFixedSetup(retuned));
    assert.equal(again.samples.length, opening.samples.length);
    for (let i = 0; i < opening.samples.length; i++) {
      assert.equal(Object.is(again.samples[i].t, opening.samples[i].t), true);
      assert.equal(Object.is(again.samples[i].x, opening.samples[i].x), true);
      assert.equal(Object.is(again.samples[i].y, opening.samples[i].y), true);
      assert.equal(Object.is(again.samples[i].z, opening.samples[i].z), true);
    }
    assert.notEqual(worldcraftIdentity(retuned), worldcraftIdentity(phrase.world));
    assert.deepEqual(again.terminal.position, opening.terminal.position);
    const before = shapeMaterials(phrase.world);
    const after = shapeMaterials(retuned);
    assert.deepEqual(after, before);
    const byName = Object.fromEntries(before.map(row => [row.name, row]));
    assert.deepEqual(byName['worldcraft-object-ramp-yours'], { name: 'worldcraft-object-ramp-yours', friction: WORLDCRAFT_CONTACTS.ramp.friction, restitution: WORLDCRAFT_CONTACTS.ramp.restitution });
    assert.deepEqual(byName['worldcraft-object-bank-yours'], { name: 'worldcraft-object-bank-yours', friction: WORLDCRAFT_CATALOG.bank.friction, restitution: WORLDCRAFT_CATALOG.bank.restitution });
    assert.deepEqual(byName['worldcraft-object-plate-yours'], { name: 'worldcraft-object-plate-yours', friction: WORLDCRAFT_CATALOG.plate.friction, restitution: WORLDCRAFT_CATALOG.plate.restitution });
    assert.equal(byName['worldcraft-target-stand-in-orc'].friction, WORLDCRAFT_CATALOG.block.friction);
    assert.equal(byName['worldcraft-target-stand-in-orc'].restitution, WORLDCRAFT_CATALOG.block.restitution);
    assert.equal(WORLDCRAFT_CATALOG.bank.friction, .18);
    assert.equal(WORLDCRAFT_CATALOG.bank.restitution, .86);
  } finally { session.dispose(); }
});
