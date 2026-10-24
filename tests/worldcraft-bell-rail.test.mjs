import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, PhysicsMotionType, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { playBellBong } from '../lib/worldcraft-bell-audio.js';
import {
  WORLDCRAFT_BELL, WORLDCRAFT_CATALOG, WORLDCRAFT_DELAY, createBellRailWorld, createHouseShotWorld, createOrcStaticWorld,
  exportWorldJSON, parseWorldJSON, validateWorld, validateWorldEdit, worldcraftBellPose, worldcraftFixedSetup,
  worldcraftIdentity, worldcraftLaunchDelay, worldcraftTargetBody, worldcraftTargetResult,
} from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;

test('bell pose shuttles the rail at constant speed and the delay is part of the world', () => {
  const world = createBellRailWorld();
  assert.equal(world.id, 'bell-rail-v1');
  assert.equal(world.timing.delay, 0);
  assert.deepEqual(world.rules.target.endpoints, [{ x: -28, z: 58 }, { x: -24, z: 58 }]);
  assert.equal(world.rules.target.speed, 1);
  assert.equal(WORLDCRAFT_BELL.restitution, WORLDCRAFT_CATALOG.block.restitution);
  assert.equal(WORLDCRAFT_BELL.friction, WORLDCRAFT_CATALOG.block.friction);
  assert.deepEqual(parseWorldJSON(exportWorldJSON(world)), world);
  assert.equal(worldcraftLaunchDelay(world), 0);
  assert.equal(JSON.parse(worldcraftIdentity(createHouseShotWorld())).timing, undefined);
  assert.equal(JSON.parse(worldcraftIdentity(createOrcStaticWorld())).timing, undefined);
  assert.notEqual(worldcraftIdentity(world), worldcraftIdentity({ ...world, timing: { delay: 0.5 } }));
  const target = world.rules.target;
  const start = worldcraftBellPose(target, 0);
  const mid = worldcraftBellPose(target, 2);
  const end = worldcraftBellPose(target, 4);
  const again = worldcraftBellPose(target, 8);
  assert.deepEqual([start.x, start.z], [-28, 58]);
  assert.deepEqual([mid.x, mid.z], [-26, 58]);
  assert.deepEqual([end.x, end.z], [-24, 58]);
  assert.deepEqual([again.x, again.z], [-28, 58]);
  assert.equal(start.y, WORLDCRAFT_BELL.centerY);
  assert.equal(start.period, 8);
  const step = worldcraftBellPose(target, 2.5);
  assert.ok(Math.abs(Math.hypot(step.x - mid.x, step.z - mid.z) - 0.5) < 1e-9);
  assert.doesNotThrow(() => validateWorldEdit(world, { ...world, timing: { delay: 2.5 } }));
  assert.throws(() => validateWorldEdit(world, { ...world, timing: { delay: 0.25 } }));
  assert.throws(() => validateWorldEdit(world, { ...world, rules: { ...world.rules, target: { ...target, speed: 1.5 } } }));
  assert.throws(() => validateWorld({ ...world, timing: undefined }));
  assert.throws(() => validateWorld({ ...createOrcStaticWorld(), timing: { delay: 0 } }));
  assert.throws(() => validateWorld({ ...world, rules: { ...world.rules, target: { ...target, endpoints: [{ x: -28, z: 58 }, { x: -27.5, z: 58 }] } } }));
  const body = worldcraftTargetBody('bell');
  const contact = { body, point: { x: -26, y: 1.5, z: 58 }, count: 1, first: 4.3, last: 4.3 };
  assert.equal(worldcraftTargetResult(world, { reason: 'first-ground-contact', contacts: [contact] }).status, 'hit');
  assert.equal(worldcraftTargetResult(world, { reason: 'first-ground-contact', contacts: [] }).status, 'miss');
  assert.equal(WORLDCRAFT_DELAY.step, 0.5);
  assert.equal(WORLDCRAFT_DELAY.max, 10);
});

test('bell bong is a short inharmonic decay scheduled on the supplied context', () => {
  const events = [];
  const node = kind => {
    const self = {
      kind,
      gain: {
        setValueAtTime(value, time) { events.push(['set', value, time]); },
        exponentialRampToValueAtTime(value, time) { events.push(['ramp', value, time]); },
      },
      frequency: { setValueAtTime(value, time) { events.push(['freq', value, time]); } },
      connect(target) { events.push(['connect', kind, target.kind ?? 'dest']); return target; },
      start(time) { events.push(['start', time]); },
      stop(time) { events.push(['stop', time]); },
    };
    return self;
  };
  const context = { currentTime: 3, destination: { kind: 'dest' }, createGain: () => node('gain'), createOscillator: () => node('osc') };
  const played = playBellBong(context);
  assert.ok(played.duration <= 1.2);
  assert.ok(played.partials >= 4);
  const starts = events.filter(event => event[0] === 'start').map(event => event[1]);
  const stops = events.filter(event => event[0] === 'stop').map(event => event[1]);
  assert.equal(starts.length, played.partials);
  assert.ok(starts.every(time => time === 3));
  assert.ok(stops.every(time => time > 3 && time - 3 <= 1.2));
  assert.ok(events.some(event => event[0] === 'connect' && event[2] === 'dest'));
});

const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });

function layout(ramp, bank, delay) {
  const base = createBellRailWorld();
  return validateWorld({
    ...base,
    objects: [
      { id: 'ramp-yours', kind: 'ramp', ...ramp },
      { id: 'bank-yours', kind: 'bank', ...bank },
      base.objects.find(object => object.id === 'shield'),
    ],
    timing: { delay },
  });
}
function order(last) {
  const names = [];
  for (const contact of last.contacts) {
    const kind = contact.body === worldcraftTargetBody('bell') ? 'bell'
      : contact.body === 'worldcraft-object-ramp-yours' ? 'ramp'
      : contact.body === 'worldcraft-object-bank-yours' ? 'bank'
      : contact.body === 'worldcraft-object-shield' ? 'shield' : null;
    if (kind && names.at(-1) !== kind) names.push(kind);
  }
  const at = names.indexOf('bell');
  return (at < 0 ? names : names.slice(0, at + 1)).join('>');
}

test('Bell Rail default misses at every delay, and two contact orders reach the bell', () => {
  const world = createBellRailWorld();
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120); physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: 'bell-rail-test' });
  const setup = worldcraftFixedSetup(world);
  const shoot = () => {
    assert.equal(runtime.setMode('play'), true);
    assert.equal(runtime.launch(setup), true, runtime.error);
    for (let i = 0; i < 7300 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
    assert.ok(runtime.last.reason === 'first-ground-contact' || runtime.last.reason === 'out-of-bounds');
    return runtime.last;
  };
  try {
    const bell = scene.getMeshByName(worldcraftTargetBody('bell'));
    assert.equal(bell.physicsBody.getMotionType(), PhysicsMotionType.ANIMATED);
    assert.equal(bell.physicsBody.shape.material.restitution, WORLDCRAFT_BELL.restitution);
    assert.equal(bell.isPickable, false);
    assert.equal(scene.getMeshByName('worldcraft-bell-rail').physicsBody ?? null, null);
    assert.equal(scene.getMeshByName('worldcraft-bell-stop-a').physicsBody ?? null, null);
    assert.equal(scene.meshes.some(mesh => /eye|mouth/.test(mesh.name)), false);
    assert.equal(runtime.diagnostics().staticBodies, 5);
    assert.equal(runtime.setMode('play'), true);
    assert.equal(runtime.launch(setup), true, runtime.error);
    for (let step = 0; step < 240 && !runtime.flight.ended; step++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
    const pose = worldcraftBellPose(world.rules.target, runtime.flight.elapsed);
    assert.ok(Math.hypot(bell.position.x - pose.x, bell.position.y - pose.y, bell.position.z - pose.z) < 1e-6);
    runtime.clearShot();
    assert.equal(runtime.setMode('build'), true, runtime.error);

    for (let delay = 0; delay <= 10; delay += 0.5) {
      assert.equal(runtime.replaceWorld(layout({ x: 0, z: 42, yaw: 0 }, { x: 14, z: 28, yaw: 0 }, delay), { intent: 'load' }).ok, true);
      const missed = shoot();
      assert.equal(missed.targetResult.status, 'miss', `delay ${delay}`);
      assert.equal(order(missed).includes('bell'), false);
      runtime.setMode('build');
    }

    assert.equal(runtime.replaceWorld(layout({ x: -8, z: 40, yaw: 0 }, { x: 0, z: 16, yaw: 80 }, 1), { intent: 'load' }).ok, true);
    const early = shoot();
    assert.equal(early.targetResult.status, 'hit');
    assert.equal(order(early), 'bank>ramp>bell');
    assert.equal(early.targetResult.contact.body, worldcraftTargetBody('bell'));
    runtime.setMode('build');
    const earlyAgain = shoot();
    assert.equal(order(earlyAgain), order(early));
    assert.equal(earlyAgain.targetResult.status, 'hit');
    assert.equal(earlyAgain.contacts.length, early.contacts.length);
    for (let i = 0; i < early.contacts.length; i++) {
      assert.equal(earlyAgain.contacts[i].body, early.contacts[i].body);
      assert.ok(Math.abs(earlyAgain.contacts[i].first - early.contacts[i].first) < 1e-6);
    }
    runtime.setMode('build');
    assert.equal(runtime.setLaunchDelay(1.5).ok, true, runtime.error);
    const shifted = shoot();
    assert.equal(shifted.targetResult.status, 'hit');
    assert.equal(order(shifted), 'bank>ramp>bell');
    assert.equal(runtime.world.timing.delay, 1.5);

    runtime.setMode('build');
    assert.equal(runtime.replaceWorld(layout({ x: -1, z: 42, yaw: 20 }, { x: -6, z: 68, yaw: 20 }, 0), { intent: 'load' }).ok, true);
    const late = shoot();
    assert.equal(late.targetResult.status, 'hit');
    assert.equal(order(late), 'ramp>bank>bell');
  } finally { runtime.dispose(); scene.dispose(); engine.dispose(); }
});
