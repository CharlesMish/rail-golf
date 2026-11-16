import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { HavokPlugin, NullEngine, Scene, Vector3, Logger, MeshBuilder } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { exportWorldJSON, parseWorldJSON, worldcraftIdentity, validateWorld } from '../lib/worldcraft-model.js';
import { foundryRecord, foundryRemixWorld } from '../lib/worldcraft-foundry.js';
import { worldcraftTerraceFacets } from '../lib/worldcraft-terrace.js';
import { sphereIntersectsConvexMesh } from '../lib/worldcraft-scene.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;

test('stone world persists its opt-in physical identity through export and remix', () => {
  const world = foundryRecord('amphitheater-place').world;
  assert.deepEqual(parseWorldJSON(exportWorldJSON(world)), world);
  const copy = foundryRemixWorld(world, { id: 'stone-copy' });
  assert.equal(worldcraftIdentity(copy), worldcraftIdentity(world));
  assert.equal(copy.environment.preset, 'amphitheater-place-v1');
  assert.deepEqual(copy.objects.map(o => o.facetDegrees), [24, 24, 24]);
  assert.deepEqual(copy.objects.map(o => worldcraftTerraceFacets(o).length), [8, 8, 8]);
  const old = structuredClone(copy); old.environment.preset = 'forest-clearing-v1';
  assert.notEqual(worldcraftIdentity(validateWorld(old)), worldcraftIdentity(copy));
});

test('stone world really launches, returns, and repeated loading disposes every body', async () => {
  const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine(); physics.setTimeStep(1 / 120); physics.setSubTimeStep(1000 / 120);
  const world = foundryRecord('amphitheater-place').world;
  const runtime = createWorldcraftRuntime(scene, { world, build: 'amphi-test' });
  assert.equal(runtime.diagnostics().staticBodies, 25);
  assert.equal(scene.getMeshByName('worldcraft-tee'), null);
  runtime.setMode('play');
  for (const originX of [-9, -10]) {
    assert.equal(runtime.launch({ railIndex: 1, originX, yaw: 0, elevation: 8, charge: .45 }), true, runtime.error);
    runtime.clearShot();
  }
  assert.equal(runtime.launch({ railIndex: 1, originX: 0, yaw: 0, elevation: 8, charge: .45 }), true, runtime.error);
  for (let i = 0; i < 1000 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
  assert.equal(runtime.last.terminal.reason, 'first-ground-contact');
  assert.ok(runtime.last.contacts.some(row => row.body === 'worldcraft-object-step-2'));
  const radii = runtime.last.samples.map(point => Math.hypot(point.x, point.z - 32));
  const farthest = radii.indexOf(Math.max(...radii));
  assert.ok(Math.min(...radii.slice(farthest + 1)) < radii[farthest] - 2); // measured after the outward leg
  runtime.clearShot(); runtime.setMode('build');
  for (let i = 0; i < 3; i++) {
    assert.equal(runtime.replaceWorld(world, { intent: 'load' }).ok, true);
    assert.equal(runtime.diagnostics().physicsBodies, 25);
  }
  runtime.dispose(); assert.equal(physics.getBodies().length, 0);
  scene.dispose(); engine.dispose();
});

// The AABB includes points outside the convex hull; still detect real overlaps.
test('convex narrow phase distinguishes face, edge, vertex, and interior clearance', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const box = MeshBuilder.CreateBox('clearance-cube', { size: 2 }, scene);
  assert.equal(sphereIntersectsConvexMesh(box, new Vector3(0, 0, 0), .1), true);
  assert.equal(sphereIntersectsConvexMesh(box, new Vector3(1.2, 0, 0), .21), true);
  assert.equal(sphereIntersectsConvexMesh(box, new Vector3(1.3, 1.3, 0), .3), false);
  assert.equal(sphereIntersectsConvexMesh(box, new Vector3(1.3, 1.3, 0), .43), true);
  assert.equal(sphereIntersectsConvexMesh(box, new Vector3(1.3, 1.3, 1.3), .5), false);
  assert.equal(sphereIntersectsConvexMesh(box, new Vector3(1.3, 1.3, 1.3), .53), true);
  scene.dispose(); engine.dispose();
});
