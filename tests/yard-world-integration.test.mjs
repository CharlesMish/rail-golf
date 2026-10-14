import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {
  DirectionalLight, FreeCamera, HavokPlugin, MeshBuilder, NullEngine,
  PhysicsAggregate, PhysicsShapeType, RawTexture, Scene, ShadowGenerator,
  StandardMaterial, TransformNode, Vector3, VertexBuffer,
} from '@babylonjs/core';
import { COURTYARD_HOLES, COURTYARD_TARGETS } from '../lib/courtyard.js';
import { buildCourtyard } from '../lib/courtyard-scene.js';
import { createYardEnvironment } from '../lib/yard-environment.js';
import { createYardPresentationMaterials } from '../lib/yard-presentation.js';
import { applyYardGroundUVs, applyYardSurfaceMaterials } from '../lib/yard-surfaces.js';

const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const materialKeys = ['timber', 'brick', 'steel', 'machine', 'rough', 'fairwayA', 'fairwayB', 'bark', 'sand', 'amber', 'boost', 'cyan', 'lime'];

function fixture({ enhanced = false, historical = false } = {}) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -12, 0), new HavokPlugin(true, havok));
  const camera = new FreeCamera('existing-camera', new Vector3(0, 7.8, -15), scene);
  camera.maxZ = 280;
  scene.activeCamera = camera;
  const light = new DirectionalLight('existing-sun', new Vector3(-.42, -.85, .35), scene);
  const shadows = new ShadowGenerator(256, light);
  const materials = Object.fromEntries(materialKeys.map(key => [key, new StandardMaterial(key, scene)]));
  const borrowedTexture = RawTexture.CreateRGBATexture(new Uint8Array([190, 167, 135, 255]), 1, 1, scene, false);
  borrowedTexture.name = 'existing-shared-timber';
  materials.timber.diffuseTexture = materials.brick.diffuseTexture = borrowedTexture;
  const surfaceMaterials = enhanced ? applyYardSurfaceMaterials(scene, materials) : {};
  const presentationMaterials = historical ? {} : createYardPresentationMaterials(scene, materials);
  const courtyardMaterials = { ...materials, ...surfaceMaterials, ...presentationMaterials };
  let root = null, bodies = [], environment = null;

  const disposeCourse = () => {
    for (const aggregate of bodies) aggregate.dispose();
    bodies = [];
    for (const mesh of root?.getChildMeshes() ?? []) shadows.removeShadowCaster(mesh);
    root?.dispose(false, false);
    root = null;
  };
  const add = (mesh, shape, options) => {
    const body = new PhysicsAggregate(mesh, shape, options, scene);
    bodies.push(body);
    return body;
  };
  const build = hole => {
    disposeCourse();
    root = new TransformNode(`course-${hole.id}`, scene);
    // Same floor and stripe construction used by createCourse in the app.
    const rough = MeshBuilder.CreateBox(`${hole.id}-rough`, { width: hole.courseWidth, height: 1, depth: hole.courseLength + 42 }, scene);
    rough.parent = root;
    rough.position.set(0, -.5, (hole.courseLength + 8) / 2);
    rough.material = materials.rough;
    rough.receiveShadows = true;
    if (enhanced) applyYardGroundUVs(rough);
    add(rough, PhysicsShapeType.BOX, { mass: 0, friction: .8, restitution: .1 });
    for (let i = 0; i < hole.fairwayCenters.length; i++) {
      const stripe = MeshBuilder.CreateBox(`${hole.id}-stripe-${i}`, { width: Math.max(17, 30 - i * .95), height: .065, depth: 10.15 }, scene);
      stripe.parent = root;
      stripe.position.set(hole.fairwayCenters[i], .025, 4 + i * 10);
      stripe.material = i % 2 ? materials.fairwayB : materials.fairwayA;
      stripe.receiveShadows = true;
      if (enhanced) applyYardGroundUVs(stripe);
    }
    const tee = MeshBuilder.CreateBox(`${hole.id}-tee`, { width: 13, height: .34, depth: 7.5 }, scene);
    tee.parent = root;
    tee.position.set(0, .16, -.5);
    tee.material = materials.steel;
    add(tee, PhysicsShapeType.BOX, { mass: 0, friction: .9, restitution: .06 });
    for (const target of COURTYARD_TARGETS) {
      const active = target.id === hole.target.id;
      const mesh = MeshBuilder.CreateCylinder(`${hole.id}-${target.id}-target`, { height: active ? .22 : .16, diameter: target.radius * 2, tessellation: 64 }, scene);
      mesh.parent = root;
      mesh.position.set(target.x, active ? .2 : .16, target.z);
      mesh.material = materials[target.material];
      add(mesh, PhysicsShapeType.CYLINDER, { mass: 0, friction: .74, restitution: .12 });
    }
    buildCourtyard(scene, root, courtyardMaterials, shadows, aggregate => bodies.push(aggregate), hole,
      historical ? undefined : { legibility: true, surfaceDetail: enhanced });
    return root;
  };
  return {
    engine, scene, camera, shadows, materials, borrowedTexture, courtyardMaterials, build, disposeCourse,
    get root() { return root; },
    environment() { return environment ??= createYardEnvironment(scene, { camera }); },
    dispose() { disposeCourse(); environment?.dispose(); scene.dispose(); engine.dispose(); },
  };
}

const values = array => array ? Array.from(array) : null;
const vector = item => item?.asArray() ?? null;

function authoritySnapshot(root, includeUVs = false) {
  return root.getChildMeshes().map(mesh => {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox, body = mesh.physicsBody;
    const mass = body?.getMassProperties();
    return {
      name: mesh.name,
      positions: values(mesh.getVerticesData(VertexBuffer.PositionKind)),
      indices: values(mesh.getIndices()),
      normals: values(mesh.getVerticesData(VertexBuffer.NormalKind)),
      ...(includeUVs ? { uvs: values(mesh.getVerticesData(VertexBuffer.UVKind)) } : {}),
      world: values(mesh.getWorldMatrix().asArray()),
      localBounds: [box.minimum.asArray(), box.maximum.asArray()],
      worldBounds: [box.minimumWorld.asArray(), box.maximumWorld.asArray()],
      metadata: mesh.metadata ? JSON.parse(JSON.stringify(mesh.metadata)) : null,
      body: body ? {
        shapeType: body.shape.type,
        material: { ...body.shape.material },
        membership: body.shape.filterMembershipMask,
        collide: body.shape.filterCollideMask,
        motion: body.getMotionType(),
        mass: mass.mass,
        center: vector(mass.centerOfMass),
        inertia: vector(mass.inertia),
        orientation: vector(mass.inertiaOrientation),
      } : null,
    };
  });
}

const shadowNames = fixture => (fixture.shadows.getShadowMap().renderList ?? []).map(mesh => mesh.name).sort();
const sameObjects = (actual, expected, message) => {
  assert.equal(actual.length, expected.length, `${message}: count`);
  assert.ok(actual.every((item, index) => item === expected[index]), `${message}: identities`);
};
const assetIds = scene => ({
  materials: scene.materials.map(item => item.uniqueId).sort((a, b) => a - b),
  textures: scene.textures.map(item => item.uniqueId).sort((a, b) => a - b),
});

test('composed public artwork preserves all three courses physical geometry, masks, recognition metadata and shadow lists', () => {
  const before = fixture(), after = fixture({ enhanced: true });
  try {
    const environment = after.environment();
    for (const hole of COURTYARD_HOLES) {
      before.build(hole);
      after.build(hole);
      assert.deepEqual(authoritySnapshot(after.root), authoritySnapshot(before.root), hole.id);
      assert.deepEqual(shadowNames(after), shadowNames(before), `${hole.id}: no new shadow casters`);
      assert.equal(after.scene.getPhysicsEngine().getBodies().length, before.scene.getPhysicsEngine().getBodies().length);
      const oldFloor = before.scene.getMeshByName(`${hole.id}-rough`), newFloor = after.scene.getMeshByName(`${hole.id}-rough`);
      assert.notDeepEqual(newFloor.getVerticesData(VertexBuffer.UVKind), oldFloor.getVerticesData(VertexBuffer.UVKind), 'the tested enhanced path actually remaps floor UVs');
    }
    for (const mesh of environment.meshes) {
      assert.ok(!mesh.physicsBody && !mesh.physicsImpostor, mesh.name);
      assert.equal(mesh.metadata, null, `${mesh.name}: no scoring/contact identity`);
      assert.equal(mesh.isPickable, false);
      assert.equal(mesh.checkCollisions, false);
      assert.equal(mesh.receiveShadows, false);
      assert.ok(!after.shadows.getShadowMap().renderList.includes(mesh));
    }
  } finally { before.dispose(); after.dispose(); }
});

test('adding and disposing the environment preserves live Havok body identities and shared course assets', () => {
  const f = fixture({ enhanced: true });
  try {
    f.build(COURTYARD_HOLES[2]);
    const bodies = [...f.scene.getPhysicsEngine().getBodies()], snapshot = authoritySnapshot(f.root, true);
    const shadows = [...f.shadows.getShadowMap().renderList], assets = assetIds(f.scene);
    const environment = f.environment();
    sameObjects(f.scene.getPhysicsEngine().getBodies(), bodies, 'environment creation keeps bodies');
    assert.deepEqual(authoritySnapshot(f.root, true), snapshot);
    sameObjects(f.shadows.getShadowMap().renderList, shadows, 'environment creation keeps shadow list');
    environment.dispose();
    sameObjects(f.scene.getPhysicsEngine().getBodies(), bodies, 'environment disposal keeps bodies');
    assert.deepEqual(authoritySnapshot(f.root, true), snapshot);
    assert.deepEqual(assetIds(f.scene), assets);
    assert.ok(f.scene.textures.includes(f.borrowedTexture), 'environment disposal leaves borrowed texture ownership intact');
  } finally { f.dispose(); }
});

test('six real card rebuilds preserve scene-owned environment IDs, shared texture/material IDs and bounded transient materials', () => {
  const f = fixture({ enhanced: true });
  try {
    const environment = f.environment();
    f.build(COURTYARD_HOLES[0]);
    const assets = assetIds(f.scene), environmentIds = environment.meshes.map(mesh => mesh.uniqueId);
    const first = { meshes: f.scene.meshes.length, roots: f.scene.transformNodes.length, shadows: shadowNames(f) };
    const transientCount = f.scene.multiMaterials.length;
    const transientIDs = new Set(f.scene.multiMaterials.map(material => material.uniqueId));
    assert.ok(transientCount > 0, 'the test exercises the existing per-tread MultiMaterials');
    for (const index of [1, 2, 0, 1, 2, 0]) {
      f.build(COURTYARD_HOLES[index]);
      assert.deepEqual(assetIds(f.scene), assets, `card ${index + 1}: shared assets survive unchanged`);
      assert.deepEqual(environment.meshes.map(mesh => mesh.uniqueId), environmentIds);
      assert.ok(environment.meshes.every(mesh => !mesh.isDisposed() && f.scene.meshes.includes(mesh)));
      assert.equal(f.scene.multiMaterials.length, transientCount, 'per-tread MultiMaterials do not accumulate');
      assert.ok(f.scene.multiMaterials.every(material => !transientIDs.has(material.uniqueId)), 'disposed card MultiMaterials are replaced');
      assert.ok(f.scene.textures.includes(f.borrowedTexture));
      if (index === 0) assert.deepEqual({ meshes: f.scene.meshes.length, roots: f.scene.transformNodes.length, shadows: shadowNames(f) }, first);
    }
    f.disposeCourse();
    assert.equal(f.scene.getPhysicsEngine().getBodies().length, 0);
    assert.equal(f.scene.multiMaterials.length, 0);
    assert.equal(f.shadows.getShadowMap().renderList.length, 0);
    assert.deepEqual(assetIds(f.scene), assets);
    assert.deepEqual(f.scene.meshes.map(mesh => mesh.uniqueId).sort((a, b) => a - b), [...environmentIds].sort((a, b) => a - b));
  } finally { f.dispose(); }
});

test('historical default courtyard rebuild keeps its exact UVs and material references without new artwork assets', () => {
  const f = fixture({ historical: true });
  try {
    const originalMaterials = Object.values(f.materials), originalTextures = [...f.scene.textures];
    for (const hole of COURTYARD_HOLES) {
      f.build(hole);
      const before = authoritySnapshot(f.root, true);
      const renderMaterials = f.root.getChildMeshes().map(mesh => mesh.material);
      f.build(hole);
      assert.deepEqual(authoritySnapshot(f.root, true), before);
      sameObjects(f.root.getChildMeshes().map(mesh => mesh.material), renderMaterials, 'historical mesh materials');
      sameObjects(f.scene.materials, originalMaterials, 'historical scene materials');
      sameObjects(f.scene.textures, originalTextures, 'historical scene textures');
      assert.equal(f.scene.multiMaterials.length, 0);
      assert.ok(f.scene.meshes.every(mesh => !mesh.name.startsWith('yard-environment-')));
      assert.equal(f.camera.maxZ, 280);
    }
  } finally { f.dispose(); }
});
