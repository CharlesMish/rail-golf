import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  WORLDCRAFT_CATALOG, WORLDCRAFT_CLOCKWORK, createEmptyWorld, createHouseShotWorld, createOrcStaticWorld, createStarterWorld,
  exportWorldJSON, worldcraftClockworkPose, worldcraftClockworkTarget, worldcraftGoalResult, worldcraftIdentity,
  worldcraftLaunchPhase, worldcraftPinResult,
} from '../lib/worldcraft-model.js';
import { resonanceOf } from '../lib/worldcraft-resonance.js';
import {
  adaptRangePreset, bindRangeShot, createClockworkGalleryPreset, createTravellingBellPreset, exportRangePreset,
  exportRangeShot, parseRangeShot, rangeBindingText, sha256Hex, validateRangePreset,
} from '../lib/worldcraft-range.js';
import { buildWorldcraftScene, createWorldcraftMaterials } from '../lib/worldcraft-scene.js';
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
  return {
    engine, scene, runtime, physics,
    shoot(phase = 0) {
      assert.equal(runtime.setLaunchPhase(phase).ok, true);
      assert.equal(runtime.setMode('play'), true);
      assert.equal(runtime.launch(runtime.world.rules.rail ? { railIndex: 1, originX: runtime.world.launcher.x, ...runtime.world.rules.rail } : null), true, runtime.error);
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
      assert.ok(runtime.last);
      runtime.setMode('build');
      return runtime.last;
    },
    async shootObservable(phase = 0) {
      assert.equal(runtime.setLaunchPhase(phase).ok, true);
      assert.equal(runtime.setMode('play'), true);
      assert.equal(runtime.launch({ railIndex: 1, originX: 0, ...runtime.world.rules.rail }), true, runtime.error);
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
    position: last.terminal.position.map(value => Math.round(value * 1e6) / 1e6),
    contacts: last.contacts.map(contact => ({ body: contact.body, count: contact.count, first: Math.round(contact.first * 1e9) / 1e9, point: contact.point })),
    status: last.goalResult?.status ?? null,
    launchPhase: last.launchPhase,
  };
}

const { preset, world } = adaptRangePreset(createClockworkGalleryPreset());
const onPathPreset = validateRangePreset({
  ...preset,
  rules: {
    ...preset.rules,
    goal: { ...preset.rules.goal, motion: { ...preset.rules.goal.motion, center: { x: 0, z: 44 } } },
  },
});
const onPath = adaptRangePreset(onPathPreset).world;

test('clockwork gallery is a turntable preset and does not change v1 worlds or the bell', async () => {
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-travelling-bell.json', import.meta.url), 'utf8'), exportRangePreset(createTravellingBellPreset()));
  assert.equal(await readFile(new URL('../docs/examples/worldcraft-clockwork-gallery.json', import.meta.url), 'utf8'), exportRangePreset(preset));
  assert.equal(preset.rules.goal.motion.kind, 'turntable');
  assert.equal(preset.rules.goal.motion.phaseReference, 'near-point');
  assert.equal(preset.rules.goal.motion.collider.shape, 'box');
  assert.equal(preset.rules.goal.motion.collider.friction, WORLDCRAFT_CATALOG.block.friction);
  assert.equal(preset.rules.goal.motion.collider.restitution, WORLDCRAFT_CATALOG.block.restitution);
  assert.equal(world.rules.pin, null);
  assert.equal(worldcraftPinResult(world, { reason: 'first-ground-contact', position: [4, .43, 42] }), null);
  assert.equal(worldcraftGoalResult(world, { reason: 'first-ground-contact', contacts: [] }).scored, false);
  assert.equal(worldcraftGoalResult(world, { reason: 'first-ground-contact', contacts: [{ body: 'worldcraft-target-figure' }] }).status, 'hit');
  assert.equal(resonanceOf(world, 'worldcraft-target-figure').role, 'clockwork');
  assert.equal(resonanceOf(world, 'worldcraft-target-figure').material, 'timber');
  assert.equal(resonanceOf(world, 'worldcraft-target-figure').note, 'E4');
  const bell = adaptRangePreset(createTravellingBellPreset()).world;
  assert.equal(resonanceOf(bell, 'worldcraft-target-bell').role, 'bell');
  const before = worldcraftIdentity(world);
  assert.equal(worldcraftLaunchPhase(world, 8), 0);
  assert.equal(worldcraftLaunchPhase(world, -1), 7);
  assert.equal(worldcraftIdentity(world), before);
  const pose = worldcraftClockworkPose(worldcraftClockworkTarget(world), 0);
  assert.deepEqual({ x: pose.x, z: pose.z, yaw: pose.yaw }, { x: 4, z: 42, yaw: 0 });
  assert.equal(pose.heading, 'near point, face toward the tee');
  const quarter = worldcraftClockworkPose(worldcraftClockworkTarget(world), 2);
  assert.ok(Math.abs(quarter.x - 6) < 1e-9);
  assert.ok(Math.abs(quarter.z - 44) < 1e-9);
  assert.equal(quarter.heading, 'going out, to the right');
  const far = worldcraftClockworkPose(worldcraftClockworkTarget(world), 4);
  assert.ok(Math.abs(far.x - 4) < 1e-9);
  assert.ok(Math.abs(far.z - 46) < 1e-9);
  assert.equal(worldcraftClockworkPose(worldcraftClockworkTarget(world), 8).z, pose.z);
  assert.equal(pose.arcSpeed, 2 * Math.PI * 2 / 8);
  assert.equal(WORLDCRAFT_CLOCKWORK.centerY, 1.35);
  const savedBell = parseRangeShot(await readFile(new URL('../docs/experiments/range/appendix/travelling-bell/hit-shot.json', import.meta.url), 'utf8'));
  assert.equal(savedBell.launchPhase, 1);
  assert.equal(savedBell.outcome.body, 'worldcraft-target-bell');
});

test('the figure follows the turntable without a projectile, and the comic reaction adds no body', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  const materials = createWorldcraftMaterials(scene);
  const built = buildWorldcraftScene(scene, world, { materials: materials.materials });
  try {
    const bodies = () => physics.getBodies().length;
    const before = bodies();
    assert.ok(before >= 1);
    built.setLaunchPhase(0);
    const figure = scene.getMeshByName('worldcraft-target-figure');
    const pose0 = worldcraftClockworkPose(worldcraftClockworkTarget(world), 0);
    assert.ok(Math.hypot(figure.position.x - pose0.x, figure.position.z - pose0.z) < 1e-6);
    for (let i = 0; i < 240; i++) {
      built.beforeStep({ ended: false, elapsed: i / 120 }, 1 / 120);
      physics._step(1 / 120);
      built.afterStep({ ended: false, elapsed: (i + 1) / 120 }, 1 / 120);
    }
    const pose2 = worldcraftClockworkPose(worldcraftClockworkTarget(world), 2);
    assert.ok(Math.hypot(figure.position.x - pose2.x, figure.position.z - pose2.z) < 1e-4, `figure drifted to ${figure.position.x}, ${figure.position.z}`);
    assert.ok(Math.abs(figure.position.y - WORLDCRAFT_CLOCKWORK.centerY) < 1e-5);
    const parked = figure.position.clone();
    built.queueComicHit();
    built.afterStep({ ended: false }, 1 / 120);
    assert.ok(scene.meshes.some(mesh => mesh.metadata?.worldcraftClockworkHeart));
    assert.equal(bodies(), before, 'hearts added a physics body');
    assert.ok(Math.hypot(figure.position.x - parked.x, figure.position.z - parked.z) < 1e-6);
    const head = scene.getMeshByName('worldcraft-clockwork-head');
    assert.ok(Math.abs(head.rotation.z) > 0 || Math.abs(head.rotation.x) > 0);
    built.dispose();
    built.dispose();
    assert.equal(bodies(), 0);
  } finally {
    materials.dispose();
    scene.dispose();
    engine.dispose();
  }
});

test('the catalog opening misses, an on-path phase hits, and the record repeats', async () => {
  const session = harness(world);
  try {
    const coefficients = JSON.stringify(session.runtime.world.rules.target.motion.collider);
    for (const phase of [0, 2, 4, 6]) {
      const last = session.shoot(phase);
      assert.equal(last.goalResult.status, 'miss', `phase ${phase}`);
      assert.equal(last.contacts.some(contact => contact.body === 'worldcraft-target-figure'), false);
      assert.equal(last.terminal.reason, 'first-ground-contact');
      assert.equal(last.pinResult, null);
      assert.equal(last.launchPhase, phase);
    }
    const first = session.shoot(0);
    const second = session.shoot(0);
    assert.deepEqual(signature(first), signature(second));
    assert.equal(JSON.stringify(session.runtime.world.rules.target.motion.collider), coefficients);
    const observable = await session.shootObservable(1);
    session.scene.onBeforePhysicsObservable.clear();
    session.scene.onAfterPhysicsObservable.clear();
    session.runtime.setMode('build');
    const stepped = session.shoot(1);
    assert.deepEqual(signature(observable), signature(stepped));

    const replaced = session.runtime.replaceWorld(onPath, { intent: 'load' });
    assert.equal(replaced.ok, true, replaced.error);
    let hit = null;
    for (let phase = 0; phase < 8; phase += 0.25) {
      const last = session.shoot(phase);
      if (last.goalResult.status === 'hit') { hit = last; break; }
    }
    assert.ok(hit, 'on-path turntable produced no hit on a 0.25 s grid');
    const contact = hit.contacts.find(item => item.body === 'worldcraft-target-figure');
    const pose = worldcraftClockworkPose(worldcraftClockworkTarget(onPath), hit.launchPhase + contact.first);
    assert.equal(pose.u, worldcraftLaunchPhase(onPath, hit.launchPhase + contact.first));
    assert.ok(Math.hypot(contact.point.x - pose.x, contact.point.z - pose.z) < 1.6, `contact far from the figure: ${contact.point.x}, ${contact.point.z} vs ${pose.x}, ${pose.z}`);
    const repeat = session.shoot(hit.launchPhase);
    assert.deepEqual(signature(hit), signature(repeat));
    const shot = await bindRangeShot({
      preset: onPathPreset, world: onPath, setup: hit.setup, build: '4a2be209',
      launch: hit.launch, points: hit.samples, events: hit.evidence, contacts: hit.contacts,
      terminal: hit.terminal, launchPhase: hit.launchPhase,
    });
    assert.equal(shot.launchPhase, hit.launchPhase);
    assert.equal(shot.outcome.status, 'hit');
    assert.equal(shot.bindingHash, await sha256Hex(rangeBindingText(shot.worldSnapshot.worldIdentity, shot.setup, shot.launchPhase)));
    const loaded = parseRangeShot(exportRangeShot(shot));
    assert.equal(loaded.launchPhase, hit.launchPhase);
    const refired = session.shoot(loaded.launchPhase);
    assert.deepEqual(signature(hit), signature(refired));
    await assert.rejects(bindRangeShot({
      world: onPath, setup: hit.setup, build: '4a2be209', launch: hit.launch, points: hit.samples,
      contacts: hit.contacts, terminal: hit.terminal,
    }), /clockwork gallery shot needs its launch phase/);
  } finally { session.dispose(); }
});

test('disposing a clockwork runtime drops every body', () => {
  const session = harness(world);
  session.runtime.setLaunchPhase(1);
  session.runtime.dispose();
  session.runtime.dispose();
  session.runtime.beforeStep();
  session.physics._step(1 / 120);
  session.runtime.afterStep();
  assert.equal(session.physics.getBodies().length, 0);
  session.dispose();
});
