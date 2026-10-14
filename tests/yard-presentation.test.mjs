import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, Vector3, HavokPlugin, TransformNode, StandardMaterial, MeshBuilder, VertexBuffer } from '@babylonjs/core';
import { createYardPresentationMaterials, applyTreadTopMaterial } from '../lib/yard-presentation.js';
import { buildCourtyard } from '../lib/courtyard-scene.js';
import { COURTYARD_HOLES } from '../lib/courtyard.js';

const hv = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  const materials = Object.fromEntries(['timber', 'brick', 'machine', 'bark', 'sand', 'steel', 'amber', 'boost'].map(key => [key, new StandardMaterial(key, scene)]));
  const presentation = createYardPresentationMaterials(scene, materials);
  return { engine, scene, materials, presentation, dispose() { scene.dispose(); engine.dispose(); } };
}

test('tread paint uses only existing upward polygons and keeps side faces and geometry unchanged', () => {
  const f = fixture();
  try {
    const mesh = MeshBuilder.CreateBox('tread', { width: 12, height: .8, depth: 16 }, f.scene);
    mesh.material = f.materials.timber;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind), indices = mesh.getIndices();
    applyTreadTopMaterial(mesh, f.presentation.yardTreadTop);
    assert.deepEqual(mesh.getVerticesData(VertexBuffer.PositionKind), positions);
    assert.deepEqual(mesh.getIndices(), indices);
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind), covered = [];
    for (const sub of mesh.subMeshes) {
      for (let i = sub.indexStart; i < sub.indexStart + sub.indexCount; i++) {
        covered.push(i);
        assert.equal(sub.materialIndex === 1, normals[indices[i] * 3 + 1] === 1);
      }
    }
    assert.deepEqual(covered, Array.from({ length: indices.length }, (_, i) => i));
    assert.equal(mesh.material.subMaterials[0], f.materials.timber);
    const multimaterial = mesh.material;
    mesh.dispose();
    assert.ok(!f.scene.multiMaterials.includes(multimaterial));
    assert.ok(f.scene.materials.includes(f.materials.timber));
    assert.ok(f.scene.materials.includes(f.presentation.yardTreadTop));
  } finally { f.dispose(); }
});

function yard(hole, legibility) {
  const f = fixture(), bodies = [];
  f.scene.enablePhysics(new Vector3(0, -12, 0), new HavokPlugin(true, hv));
  buildCourtyard(f.scene, new TransformNode('yard', f.scene), { ...f.materials, ...f.presentation }, { addShadowCaster() {} }, body => bodies.push(body), hole, { legibility });
  return { ...f, bodies, dispose() { for (const body of bodies) body.dispose(); f.dispose(); } };
}

function geometrySnapshot(f) {
  return f.scene.meshes.map(mesh => ({
    name: mesh.name,
    position: mesh.position.asArray(),
    rotation: mesh.rotation.asArray(),
    quaternion: mesh.rotationQuaternion?.asArray() ?? null,
    positions: mesh.getVerticesData(VertexBuffer.PositionKind),
    indices: mesh.getIndices(),
    metadata: mesh.metadata,
    body: mesh.physicsBody ? {
      material: mesh.physicsBody.shape.material,
      mass: mesh.physicsBody.getMassProperties().mass,
      motion: mesh.physicsBody.getMotionType(),
    } : null,
  }));
}

test('production presentation preserves every courtyard vertex, collider, recognition tag and physical material', () => {
  for (const hole of COURTYARD_HOLES) {
    const before = yard(hole, false), after = yard(hole, true);
    try {
      assert.deepEqual(geometrySnapshot(after), geometrySnapshot(before), hole.id);
      assert.equal(after.bodies.length, before.bodies.length);
    } finally { before.dispose(); after.dispose(); }
  }
});

test('production bank strike paint follows actual bank requirements; historical default is unchanged', () => {
  for (const hole of COURTYARD_HOLES) {
    const before = yard(hole, false), after = yard(hole, true);
    try {
      for (const mesh of after.scene.meshes.filter(mesh => mesh.name.startsWith('courtyard-strike-band-'))) {
        assert.equal(mesh.material.name, hole.requiredTags.includes(mesh.parent.metadata.yardBank) ? 'amber' : 'brick');
      }
      for (const mesh of before.scene.meshes.filter(mesh => mesh.name.startsWith('courtyard-strike-band-'))) {
        assert.equal(mesh.material.name, hole.requiredTags.length ? 'amber' : 'brick');
      }
      for (const mesh of before.scene.meshes.filter(mesh => mesh.metadata?.cascadeStep)) assert.equal(mesh.material, before.materials.timber);
    } finally { before.dispose(); after.dispose(); }
  }
});
