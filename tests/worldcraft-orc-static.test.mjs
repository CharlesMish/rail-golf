import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, PhysicsMotionType, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { createOrcStaticWorld, validateWorld, worldcraftFixedSetup, worldcraftTargetBody, WORLDCRAFT_ORC } from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });

function layout(ramp, bank) {
  const base = createOrcStaticWorld();
  return validateWorld({ ...base, objects: [
    { id: 'ramp-yours', kind: 'ramp', ...ramp },
    { id: 'bank-yours', kind: 'bank', ...bank },
    base.objects.find(object => object.id === 'shield'),
  ] });
}
function order(last) {
  const names = [];
  for (const contact of last.contacts) {
    const kind = contact.body === worldcraftTargetBody('stand-in-orc') ? 'orc'
      : contact.body === 'worldcraft-object-ramp-yours' ? 'ramp'
      : contact.body === 'worldcraft-object-bank-yours' ? 'bank'
      : contact.body === 'worldcraft-object-shield' ? 'shield' : null;
    if (kind && names.at(-1) !== kind) names.push(kind);
  }
  return names.join('>');
}

test('Orc Stand-in default misses and two contact orders reach the same stand-in', () => {
  const world = createOrcStaticWorld();
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120); physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: 'orc-static-test' });
  const setup = worldcraftFixedSetup(world);
  const shoot = () => {
    assert.equal(runtime.setMode('play'), true);
    assert.equal(runtime.launch(setup), true, runtime.error);
    for (let i = 0; i < 7300 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
    assert.ok(runtime.last.reason === 'first-ground-contact' || runtime.last.reason === 'out-of-bounds');
    return runtime.last;
  };
  try {
    const orc = scene.getMeshByName(worldcraftTargetBody('stand-in-orc'));
    assert.equal(orc.physicsBody.getMotionType(), PhysicsMotionType.STATIC);
    assert.equal(orc.physicsBody.shape.material.restitution, WORLDCRAFT_ORC.restitution);
    assert.equal(orc.physicsBody.shape.material.friction, WORLDCRAFT_ORC.friction);
    assert.equal(orc.isPickable, false);
    for (const name of ['eye-l', 'eye-r', 'mouth']) assert.equal(scene.getMeshByName(`${orc.name}-${name}`).physicsBody ?? null, null);
    assert.equal(runtime.diagnostics().staticBodies, 6);

    const missed = shoot();
    assert.equal(missed.reason, 'first-ground-contact');
    assert.equal(missed.targetResult.status, 'miss');
    assert.equal(order(missed).includes('orc'), false);
    assert.ok(Math.abs(missed.position[0]) < 1 && missed.position[2] < 72, 'centerline loft stays on the middle of the yard');

    runtime.setMode('build');
    assert.equal(runtime.replaceWorld(layout({ x: -8, z: 40, yaw: 0 }, { x: 0, z: 16, yaw: 80 })).ok, true);
    const early = shoot();
    assert.equal(early.reason, 'first-ground-contact');
    assert.equal(early.targetResult.status, 'hit');
    assert.equal(order(early), 'bank>ramp>orc');
    assert.equal(early.targetResult.contact.body, worldcraftTargetBody('stand-in-orc'));

    runtime.setMode('build');
    assert.equal(runtime.replaceWorld(layout({ x: -1, z: 42, yaw: 20 }, { x: -6, z: 68, yaw: 20 })).ok, true);
    const late = shoot();
    assert.equal(late.targetResult.status, 'hit');
    assert.equal(order(late), 'ramp>bank>orc');
    assert.ok(late.targetResult.contact.point.y < WORLDCRAFT_ORC.height + RAIL_RULES.projectileRadius);
  } finally { runtime.dispose(); scene.dispose(); engine.dispose(); }
});
