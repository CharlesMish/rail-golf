import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  createHouseShotWorld, createOrcStaticWorld, createStarterWorld, createEmptyWorld, exportWorldJSON,
  worldcraftBellPose, worldcraftBellTarget, worldcraftGoalResult, worldcraftIdentity, worldcraftLaunchPhase,
  worldcraftPinResult, worldcraftTargetResult, WORLDCRAFT_BELL, WORLDCRAFT_CATALOG,
} from '../lib/worldcraft-model.js';
import { resonanceOf } from '../lib/worldcraft-resonance.js';
import {
  adaptRangePreset, bindRangeShot, createTravellingBellPreset, exportRangePreset, exportRangeShot,
  parseRangeShot, rangeBindingText, sha256Hex,
} from '../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';

function harness(world) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: '4a2be209' });
  return { engine, scene, runtime, physics,
    shoot(setup) {
      assert.equal(runtime.setMode('play'), true);
      assert.equal(runtime.launch(setup), true, runtime.error);
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
      assert.ok(runtime.last);
      runtime.setMode('build');
      return runtime.last;
    },
    async shootObservable(setup) {
      assert.equal(runtime.setMode('play'), true);
      assert.equal(runtime.launch(setup), true, runtime.error);
      scene.onBeforePhysicsObservable.add(() => runtime.beforeStep());
      scene.onAfterPhysicsObservable.add(() => runtime.afterStep());
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) scene._advancePhysicsEngineStep(1000 / 120);
      assert.ok(runtime.last);
      runtime.setMode('build');
      return runtime.last;
    },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}

function signature(last) {
  return {
    reason: last.terminal.reason,
    position: last.terminal.position.map(value => Math.round(value * 1000) / 1000),
    contacts: last.contacts.map(contact => ({ body: contact.body, count: contact.count, first: Math.round(contact.first * 1e6) / 1e6 })),
    status: last.goalResult?.status ?? null,
  };
}

const { preset, world } = adaptRangePreset(createTravellingBellPreset());
const setup = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };

test('the travelling bell is a target-contact preset and does not change v1 worlds', async () => {
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-travelling-bell.json', import.meta.url), 'utf8'), exportRangePreset(preset));
  assert.equal(preset.rules.goal.kind, 'target-contact');
  assert.equal(preset.rules.goal.motion.phaseReference, 'endpoint-0');
  assert.equal(preset.rules.goal.motion.hit, 'any-contact-before-ledger-close');
  assert.equal(preset.rules.goal.motion.collider.shape, 'lathe-convex-hull');
  assert.equal(preset.rules.goal.motion.collider.friction, WORLDCRAFT_CATALOG.block.friction);
  assert.equal(preset.rules.goal.motion.collider.restitution, WORLDCRAFT_CATALOG.block.restitution);
  assert.equal(world.rules.pin, null);
  assert.equal(Object.hasOwn(preset.rules.goal, 'x'), false);
  assert.equal(worldcraftPinResult(world, { reason: 'first-ground-contact', position: [-24, WORLDCRAFT_BELL.centerY, 58] }), null);
  assert.equal(worldcraftGoalResult(world, { reason: 'first-ground-contact', position: [-24, .43, 58], contacts: [] }).kind, 'target-contact');
  assert.equal(worldcraftGoalResult(world, { reason: 'first-ground-contact', position: [-24, .43, 58], contacts: [] }).scored, false);
  const hit = worldcraftGoalResult(world, { reason: 'first-ground-contact', contacts: [{ body: 'worldcraft-target-bell' }] });
  assert.equal(hit.scored, true);
  assert.equal(hit.kind, 'target-contact');
  assert.notEqual(hit.kind, 'first-ground-zone');
  const before = worldcraftIdentity(world);
  assert.equal(worldcraftLaunchPhase(world, 8), 0);
  assert.equal(worldcraftLaunchPhase(world, -1), 7);
  assert.equal(worldcraftIdentity(world), before);
  const pose = worldcraftBellPose(world.rules.target, 0);
  assert.deepEqual({ x: pose.x, z: pose.z, direction: pose.direction }, { x: -28, z: 58, direction: 1 });
  assert.deepEqual({ x: worldcraftBellPose(world.rules.target, 4).x, direction: worldcraftBellPose(world.rules.target, 4).direction }, { x: -24, direction: -1 });
  assert.equal(resonanceOf(world, 'worldcraft-target-bell').role, 'bell');
  assert.equal(resonanceOf(createOrcStaticWorld(), 'worldcraft-target-stand-in-orc').role, 'orc');
  assert.throws(() => adaptRangePreset({ ...preset, rules: { ...preset.rules, goal: { ...preset.rules.goal, motion: { ...preset.rules.goal.motion, collider: { ...preset.rules.goal.motion.collider, restitution: 0.2 } } } } }));
});

test('release phase is recorded, idle waiting does not move the bell, and headless matches the browser step', async () => {
  const session = harness(world);
  try {
    const marker = session.scene.getMeshByName('worldcraft-bell-phase');
    assert.ok(marker);
    assert.equal(marker.physicsBody ?? null, null);
    assert.equal(session.runtime.setLaunchPhase(1).ok, true);
    const parked = worldcraftBellPose(worldcraftBellTarget(world), 1);
    const mesh = session.scene.getMeshByName('worldcraft-target-bell');
    assert.ok(Math.hypot(mesh.position.x - parked.x, mesh.position.z - parked.z) < 1e-6);
    assert.ok(Math.hypot(marker.position.x - parked.x, marker.position.z - parked.z) < 1e-6);
    assert.equal(worldcraftIdentity(session.runtime.world), worldcraftIdentity(world));
    session.runtime.setMode('play');
    for (let i = 0; i < 240; i++) { session.runtime.beforeStep(); session.physics._step(1 / 120); session.runtime.afterStep(); }
    assert.ok(Math.hypot(mesh.position.x - parked.x, mesh.position.z - parked.z) < 1e-4);
    session.runtime.setMode('build');
    session.runtime.setMode('play');
    assert.equal(session.runtime.launch(setup), true);
    for (let i = 0; i < 240; i++) { session.runtime.beforeStep(); session.physics._step(1 / 120); session.runtime.afterStep(); }
    const inflight = worldcraftBellPose(worldcraftBellTarget(world), 1 + session.runtime.flight.elapsed);
    assert.ok(Math.hypot(mesh.position.x - inflight.x, mesh.position.y - inflight.y, mesh.position.z - inflight.z) < 1e-9);
    for (let i = 0; i < 7300 && !session.runtime.flight.ended; i++) { session.runtime.beforeStep(); session.physics._step(1 / 120); session.runtime.afterStep(); }
    const first = session.runtime.last;
    session.runtime.setMode('build');
    assert.equal(first.launchPhase, 1);
    assert.equal(first.reason, 'first-ground-contact');
    assert.equal(first.pinResult, null);
    assert.equal(first.goalResult.kind, 'target-contact');
    assert.equal(first.goalResult.status, 'hit');
    assert.equal(first.goalResult.scored, true);
    assert.equal(first.targetResult.body, 'worldcraft-target-bell');
    assert.equal(first.contacts.find(contact => contact.body === 'worldcraft-target-bell').first, 4.308333333333337);
    assert.deepEqual(first.contacts.map(contact => contact.body), [
      'worldcraft-object-bank-yours', 'worldcraft-object-ramp-yours', 'worldcraft-target-bell', 'worldcraft-ground',
    ]);
    assert.ok(Math.hypot(mesh.position.x - parked.x, mesh.position.z - parked.z) < 1e-6);
    const again = session.shoot(setup);
    assert.deepEqual(signature(again), signature(first));
    assert.equal(session.runtime.setLaunchPhase(0).ok, true);
    const miss = session.shoot(setup);
    assert.equal(miss.goalResult.status, 'miss');
    assert.equal(miss.goalResult.scored, false);
    assert.equal(miss.reason, 'first-ground-contact');
    assert.equal(miss.pinResult, null);
    assert.equal(miss.contacts.some(contact => contact.body === 'worldcraft-target-bell'), false);
  } finally { session.dispose(); }

  const browser = harness(world);
  try {
    assert.equal(browser.runtime.setLaunchPhase(1).ok, true);
    const seen = await browser.shootObservable(setup);
    const direct = harness(world);
    try {
      assert.equal(direct.runtime.setLaunchPhase(1).ok, true);
      const headless = direct.shoot(setup);
      assert.deepEqual(signature(seen), signature(headless));
      assert.equal(seen.goalResult.scored, headless.goalResult.scored);
    } finally { direct.dispose(); }
  } finally { browser.dispose(); }
});

test('a saved shot imports and refires the same contact from its recorded phase', async () => {
  const session = harness(world);
  let shot;
  try {
    assert.equal(session.runtime.setLaunchPhase(1).ok, true);
    const last = session.shoot(setup);
    shot = await bindRangeShot({
      preset, world, setup, build: '4a2be209', launch: last.launch, points: last.samples,
      events: last.evidence, contacts: last.contacts, terminal: last.terminal, launchPhase: last.launchPhase,
    });
    assert.equal(shot.launchPhase, 1);
    assert.equal(shot.outcome.kind, 'target-contact');
    assert.equal(shot.bindingHash, await sha256Hex(rangeBindingText(shot.worldSnapshot.worldIdentity, shot.setup, shot.launchPhase)));
    assert.equal(worldcraftIdentity(world), shot.worldSnapshot.worldIdentity);
  } finally { session.dispose(); }

  const text = exportRangeShot(shot);
  const loaded = parseRangeShot(text);
  assert.equal(loaded.launchPhase, 1);
  assert.deepEqual(loaded.outcome, shot.outcome);
  const replay = harness(loaded.worldSnapshot.world);
  try {
    assert.equal(replay.runtime.setLaunchPhase(loaded.launchPhase).ok, true);
    const last = replay.shoot(loaded.setup);
    assert.deepEqual(signature(last), {
      reason: shot.terminal.reason,
      position: shot.terminal.position.map(value => Math.round(value * 1000) / 1000),
      contacts: shot.contacts.map(contact => ({ body: contact.body, count: contact.count, first: Math.round(contact.first * 1e6) / 1e6 })),
      status: shot.outcome.status,
    });
    assert.equal(last.goalResult.kind, 'target-contact');
    assert.equal(worldcraftTargetResult(loaded.worldSnapshot.world, { reason: 'first-ground-contact', position: [0, .43, 40], contacts: [] }).status, 'miss');
  } finally { replay.dispose(); }
});
