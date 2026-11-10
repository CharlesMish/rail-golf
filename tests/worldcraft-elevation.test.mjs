import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  WORLDCRAFT_CATALOG, WORLDCRAFT_CATALOG_VERSION, WORLDCRAFT_ELEVATION, WORLDCRAFT_PHYSICS_CONTRACT,
  captureWorldSnapshot, createEmptyWorld, createHouseShotWorld, createOrcStaticWorld, createStarterWorld,
  exportWorldJSON, parseWorldJSON, validateWorld, validateWorldEdit, worldcraftBox, worldcraftElevated,
  worldcraftFootprint, worldcraftIdentity, worldcraftPose,
} from '../lib/worldcraft-model.js';
import { adaptRangePreset, exportRangePreset, parseRangePreset } from '../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';
import { WORLDCRAFT_CONTACTS, buildWorldcraftScene, createWorldcraftMaterials } from '../lib/worldcraft-scene.js';
import { applyFoundryLayout, foundryPreset } from '../lib/worldcraft-foundry.js';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
// Same four v1 exports and the same hash the foundry and range suites pin.
const V1_EXPORT_SHA = '127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389';
const voice = { material: 'metal', degree: 2 };
const world = objects => ({ ...createEmptyWorld({ id: 'elevation-fixture', name: 'Elevation fixture' }), objects });
const plate = (id, extra = {}) => ({ id, kind: 'plate', x: 0, z: 30, yaw: 0, ...extra, voice });

function physicsScene() {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  return { engine, scene, physics };
}

test('a world without lift or tilt keeps its v1 bytes, identity, pose, and footprint', () => {
  const blob = [createHouseShotWorld(), createOrcStaticWorld(), createStarterWorld({ id: 'old-world' }), createEmptyWorld({ id: 'empty', name: 'Untitled clearing' })].map(exportWorldJSON).join('\n');
  assert.equal(createHash('sha256').update(blob).digest('hex'), V1_EXPORT_SHA);
  assert.equal(WORLDCRAFT_CATALOG_VERSION, 'worldcraft-prefabs-v2');
  assert.equal(WORLDCRAFT_PHYSICS_CONTRACT, 'rail-golf-v02-worldcraft-v1');
  const standing = validateWorld(world([plate('a'), { id: 'r', kind: 'ramp', x: 12, z: 40, yaw: 30 }]));
  assert.deepEqual(Object.keys(standing.objects[0]), ['id', 'kind', 'x', 'z', 'yaw', 'voice']);
  assert.equal(exportWorldJSON(standing).includes('lift'), false);
  assert.equal(worldcraftIdentity(standing).includes('lift'), false);
  assert.equal(worldcraftElevated(standing.objects[0]), false);
  for (const object of standing.objects) {
    const prefab = WORLDCRAFT_CATALOG[object.kind];
    assert.deepEqual(worldcraftPose(object), { centerY: prefab.centerY, pitch: prefab.pitch });
  }
  // The ramp footprint is the same projection the v1 importer used: pitch -20°, then yaw.
  const foot = worldcraftFootprint(standing.objects[1]);
  assert.equal(foot.halfX, 5);
  assert.ok(Math.abs(foot.halfZ - (Math.cos(20 * Math.PI / 180) * 10 + Math.sin(20 * Math.PI / 180) * 0.8) / 2) < 1e-12);
  // Every registered v1 foundry preset still exports the bytes it parses from.
  for (const id of ['ricochet-garden-loop', 'open-contacts', 'bell-loft', 'soft-landing']) {
    const preset = foundryPreset(id);
    assert.equal(exportRangePreset(parseRangePreset(exportRangePreset(preset))), exportRangePreset(preset));
    assert.equal(exportRangePreset(preset).includes('"lift"'), false);
  }
});

test('lift and tilt are an explicit pair on a plate, on their grids, with one spelling per pose', () => {
  const raised = validateWorld(world([plate('a', { lift: 7, tilt: -10 })]));
  assert.deepEqual(Object.keys(raised.objects[0]), ['id', 'kind', 'x', 'z', 'yaw', 'lift', 'tilt', 'voice']);
  assert.equal(worldcraftElevated(raised.objects[0]), true);
  assert.deepEqual(parseWorldJSON(exportWorldJSON(raised)), raised);
  assert.notEqual(worldcraftIdentity(raised), worldcraftIdentity(validateWorld(world([plate('a')]))));
  assert.notEqual(worldcraftIdentity(raised), worldcraftIdentity(validateWorld(world([plate('a', { lift: 7, tilt: -15 })]))));
  assert.throws(() => validateWorld(world([plate('a', { lift: 3 })])), /needs both lift and tilt/);
  assert.throws(() => validateWorld(world([plate('a', { tilt: 10 })])), /needs both lift and tilt/);
  assert.throws(() => validateWorld(world([plate('a', { lift: 0, tilt: 0 })])), /omit lift and tilt for a standing plate/);
  assert.throws(() => validateWorld(world([plate('a', { lift: 3.2, tilt: 0 })])), /lift: use 0\.5 increments/);
  assert.throws(() => validateWorld(world([plate('a', { lift: 3, tilt: 7 })])), /tilt: use 5 increments/);
  assert.throws(() => validateWorld(world([plate('a', { lift: -0.5, tilt: 10 })])), /lift: expected 0 to 20/);
  assert.throws(() => validateWorld(world([plate('a', { lift: 2, tilt: 95 })])), /tilt: expected -90 to 90/);
  assert.throws(() => validateWorld(world([plate('a', { lift: 20.5, tilt: 0 })])), /lift: expected 0 to 20/);
  assert.equal(worldcraftBox(validateWorld(world([plate('a', { lift: 20, tilt: 0 })])).objects[0]).maxY, 24);
  assert.throws(() => validateWorld(world([plate('a', { lift: 3, tilt: 0, roll: 5 })])), /unsupported or missing fields/);
  for (const kind of ['bank', 'ramp', 'block']) {
    assert.equal(WORLDCRAFT_ELEVATION.kinds.includes(kind), false);
    assert.throws(() => validateWorld(world([{ id: 'a', kind, x: 0, z: 40, yaw: 0, lift: 3, tilt: 0 }])), /unsupported or missing fields/);
  }
  // lift is the height of the lowest point, so no accepted pose reaches below the ground.
  for (const tilt of [-90, -45, 0, 30, 90]) for (const lift of [0, 0.5, 6]) {
    if (lift === 0 && tilt === 0) continue;
    const solid = worldcraftBox({ id: 'a', kind: 'plate', x: 0, z: 30, yaw: 25, lift, tilt });
    assert.ok(Math.abs(solid.minY - lift) < 1e-9, `lift ${lift} tilt ${tilt}`);
  }
  assert.ok(Math.abs(worldcraftBox({ id: 'a', kind: 'plate', x: 0, z: 30, yaw: 0, lift: 0, tilt: 90 }).maxY - WORLDCRAFT_CATALOG.plate.depth) < 1e-9);
});

test('a pair with an elevated plate is judged as two solid boxes; standing pairs keep the footprint rule', () => {
  const bank = { id: 'wall', kind: 'bank', x: 0, z: 30, yaw: 0 };
  // Directly above the 7 m bank: clear at 7 m (touching), overlapping at 6.5 m.
  assert.equal(validateWorld(world([bank, plate('a', { lift: 7, tilt: 0 })])).objects.length, 2);
  assert.throws(() => validateWorld(world([bank, plate('a', { lift: 6.5, tilt: 0 })])), /overlaps another piece/);
  // Two standing plates on one spot are still refused by the v1 footprint rule.
  assert.throws(() => validateWorld(world([plate('a'), plate('b')])), /overlaps another piece/);
  // Stacked plates need the pair; the upper one may sit on the lower one's top edge.
  assert.equal(validateWorld(world([plate('a'), plate('b', { lift: 4, tilt: 0 })])).objects.length, 2);
  assert.throws(() => validateWorld(world([plate('a'), plate('b', { lift: 3.5, tilt: 0 })])), /overlaps another piece/);
  // A leaning plate that crosses a standing one in space is refused even though both are plates.
  assert.throws(() => validateWorld(world([plate('a'), { ...plate('b', { lift: 1, tilt: 60 }), z: 31 }])), /overlaps another piece/);
  // The launcher corridor and the yard edge still use the plan footprint, which widens with tilt.
  assert.throws(() => validateWorld(world([{ ...plate('a', { lift: 8, tilt: 0 }), z: 10 }])), /launcher corridor/);
  assert.throws(() => validateWorld(world([{ ...plate('a', { lift: 2, tilt: 90 }), z: 95 }])), /whole footprint must fit inside the yard/);
  assert.equal(validateWorld(world([{ ...plate('a', { lift: 2, tilt: 0 }), z: 95 }])).objects.length, 1);
});

test('the compiled mesh and Havok box sit exactly where the model says', () => {
  const { engine, scene } = physicsScene();
  const owned = createWorldcraftMaterials(scene);
  const document = validateWorld(world([
    { id: 'wall', kind: 'bank', x: 0, z: 34, yaw: 0 },
    { ...plate('lean', { lift: 7, tilt: -10 }), z: 33.5, yaw: 15 },
    { ...plate('shelf', { lift: 1.5, tilt: 90 }), x: 8, z: 20, yaw: -40 },
    { ...plate('stand') , x: -8, z: 20 },
  ]));
  const compiled = buildWorldcraftScene(scene, document, { materials: owned.materials });
  for (const object of document.objects) {
    const mesh = compiled.objectMeshes.get(object.id), prefab = WORLDCRAFT_CATALOG[object.kind], solid = worldcraftBox(object);
    const matrix = mesh.computeWorldMatrix(true);
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
      const corner = Vector3.TransformCoordinates(new Vector3(a * prefab.width / 2, b * prefab.height / 2, c * prefab.depth / 2), matrix);
      const nearest = Math.min(...solid.corners.map(point => Math.hypot(point.x - corner.x, point.y - corner.y, point.z - corner.z)));
      assert.ok(nearest < 1e-5, `${object.id} corner ${a},${b},${c} is ${nearest} m off`);
    }
    const body = compiled.bodies.find(item => item.transformNode === mesh);
    assert.equal(body.shape.material.restitution, WORLDCRAFT_CONTACTS[object.kind].restitution);
    assert.equal(body.shape.material.friction, WORLDCRAFT_CONTACTS[object.kind].friction);
  }
  // Height guides are lines. They are not in the collider list or the muzzle-clearance list.
  const guides = scene.meshes.filter(mesh => mesh.metadata?.worldcraftHeightGuide);
  assert.deepEqual(guides.map(mesh => mesh.metadata.worldcraftHeightGuide).sort(), ['lean', 'shelf']);
  assert.equal(guides.some(mesh => compiled.meshes.includes(mesh) || mesh.isPickable), false);
  assert.equal(compiled.bodies.length, 2 + document.objects.length);
  compiled.dispose();
  assert.equal(scene.meshes.filter(mesh => mesh.metadata?.worldcraftHeightGuide || mesh.metadata?.worldcraftId).length, 0);
  assert.equal(scene.getPhysicsEngine().getBodies().length, 0);
  owned.dispose();
  scene.dispose();
  engine.dispose();
});

test('a real shot rings an elevated plate at its modelled height and still ends on first ground', async () => {
  const preset = parseRangePreset(await readFile(new URL('../worlds/foundry/descending-resonance/preset.json', import.meta.url), 'utf8'));
  const { world: authored } = adaptRangePreset(preset);
  const { engine, scene, physics } = physicsScene();
  const before = { meshes: scene.meshes.length, materials: scene.materials.length };
  const runtime = createWorldcraftRuntime(scene, { world: authored, build: 'unknown' });
  const shoot = setup => {
    runtime.setMode('play');
    assert.equal(runtime.launch({ railIndex: 1, originX: 0, ...setup }), true, runtime.error);
    for (let step = 0; step < 7300 && !runtime.flight.ended; step += 1) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
    const last = runtime.last;
    runtime.setMode('build');
    return last;
  };
  const descent = shoot({ yaw: -1, elevation: 24, charge: 0.56 });
  assert.deepEqual(descent.contacts.map(row => row.body), ['worldcraft-object-high-c', 'worldcraft-object-wall-near-e', 'worldcraft-object-wall-far-w', 'worldcraft-ground']);
  assert.equal(descent.terminal.reason, 'first-ground-contact');
  // The first contact point lies on the leaning plate.
  const object = authored.objects.find(item => item.id === 'high-c'), solid = worldcraftBox(object), point = descent.contacts[0].point;
  const offset = { x: point.x - solid.center.x, y: point.y - solid.center.y, z: point.z - solid.center.z };
  // Havok reports the point between the two surfaces, so the depth axis gets one ball radius of room.
  solid.axes.forEach((axis, index) => assert.ok(Math.abs(offset.x * axis.x + offset.y * axis.y + offset.z * axis.z) <= solid.half[index] + RAIL_RULES.projectileRadius, `axis ${index}`));
  assert.ok(point.y > 7 && point.y < 11);
  // Heights descend along the phrase. The ear kept one note per contact.
  assert.deepEqual(descent.resonance.impacts.map(impact => impact.piece), ['high-c', 'wall-near-e', 'wall-far-w']);
  const heights = descent.resonance.impacts.map(impact => impact.point.y);
  assert.ok(heights[0] > heights[1] && heights[1] > heights[2]);
  // A low shot that only meets the ground is unchanged: no piece, first ground ends it.
  const low = shoot({ yaw: 60, elevation: 8, charge: 0.3 });
  assert.deepEqual(low.contacts.map(row => row.body), ['worldcraft-ground']);
  assert.equal(low.terminal.reason, 'first-ground-contact');
  // The recorded snapshot carries the elevated geometry, so the line names the world it was fired in.
  const snapshot = captureWorldSnapshot(descent.world, 'unknown');
  assert.equal(snapshot.worldIdentity, worldcraftIdentity(authored));
  assert.equal(snapshot.world.objects.filter(item => worldcraftElevated(item)).length, 6);
  // Cleanup: bodies, meshes, guides, and runtime materials all leave with the runtime.
  const diagnostics = runtime.diagnostics();
  assert.equal(diagnostics.staticBodies, 2 + authored.objects.length);
  assert.equal(diagnostics.liveBodies, 0);
  runtime.dispose();
  assert.equal(scene.getPhysicsEngine().getBodies().length, 0);
  assert.deepEqual({ meshes: scene.meshes.length, materials: scene.materials.length }, before);
  scene.dispose();
  engine.dispose();
});

test('edits and foundry layouts carry lift and tilt through unchanged', () => {
  const start = validateWorld(world([{ id: 'wall', kind: 'bank', x: 0, z: 34, yaw: 0 }, plate('a', { lift: 7.5, tilt: -20 })]));
  const moved = validateWorldEdit(start, { ...start, objects: start.objects.map(object => (object.id === 'a' ? { ...object, x: 6, yaw: 20 } : object)) });
  assert.deepEqual(moved.objects[1], { id: 'a', kind: 'plate', x: 6, z: 30, yaw: 20, lift: 7.5, tilt: -20, voice });
  const preset = parseRangePreset(JSON.stringify({
    format: 'rail-golf-worldcraft-range-preset', version: 1, id: 'layout-fixture', name: 'Layout fixture',
    environment: { preset: 'forest-clearing-v1', seed: 1 }, launcher: { x: 0 }, objects: start.objects,
    rules: { launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 }, fixed: ['wall'], allowance: { plate: 1 }, goal: { kind: 'none' } },
  }));
  const merged = applyFoundryLayout(preset, { objects: [{ id: 'a', x: -4, z: 28, yaw: 0 }] }).preset;
  assert.deepEqual(merged.objects.find(object => object.id === 'a'), { id: 'a', kind: 'plate', x: -4, z: 28, yaw: 0, lift: 7.5, tilt: -20, voice });
});
