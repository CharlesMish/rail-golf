import test from 'node:test';
import assert from 'node:assert/strict';
import { Color3, NullEngine, Scene, VertexBuffer } from '@babylonjs/core';
import { createWorldcraftPresentation, WORLDCRAFT_PRESENTATION } from '../lib/worldcraft-presentation.js';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  return { scene, dispose() { scene.dispose(); engine.dispose(); } };
}

test('Worldcraft presentation meets a small fixed budget and creates no physical or pickable scenery', () => {
  const f = fixture();
  try {
    const presentation = createWorldcraftPresentation(f.scene);
    assert.equal(Object.keys(presentation.materials).length, 9);
    assert.ok(presentation.meshes.length <= 8);
    assert.equal(presentation.stats.textureBytes, 0);
    assert.equal(f.scene.textures.length, 0);
    assert.equal(f.scene.lights.length, 0);
    assert.equal(presentation.stats.opaqueDraws, presentation.meshes.length);
    assert.ok(presentation.stats.vertices < 5000);
    for (const key of ['bank','ramp','block','ground','steel','machine','cyan','amber']) assert.ok(presentation.materials[key]);
    for (const mesh of presentation.meshes) {
      assert.equal(mesh.isPickable, false);
      assert.equal(mesh.physicsBody, undefined);
      assert.equal(mesh.receiveShadows, false);
      assert.equal(mesh.metadata.worldcraftScenery, true);
      assert.equal(mesh.metadata.lineFeature, undefined);
      assert.equal(mesh.metadata.rangeGround, undefined);
      assert.equal(mesh.subMeshes.length, 1);
    }
  } finally { f.dispose(); }
});

test('surrounding solids stay outside the physical yard; track remains shallow launcher trim', () => {
  const f = fixture();
  try {
    const p = createWorldcraftPresentation(f.scene), bounds = WORLDCRAFT_PRESENTATION.bounds;
    for (const mesh of p.meshes.filter(mesh => ['forest','service','ridge'].includes(mesh.metadata.role))) {
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i], z = positions[i + 2];
        assert.ok(x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ, `${mesh.name}: ${x},${z}`);
      }
    }
    const track = p.meshes.find(mesh => mesh.metadata.role === 'track').getVerticesData(VertexBuffer.PositionKind);
    for (let i = 0; i < track.length; i += 3) {
      assert.ok(Math.abs(track[i]) <= 12);
      assert.ok(track[i + 1] >= .299 && track[i + 1] <= .371);
      assert.ok(Math.abs(track[i + 2]) <= 2);
    }
    const apron = p.meshes.find(mesh => mesh.metadata.role === 'apron').getVerticesData(VertexBuffer.PositionKind);
    for (let i = 1; i < apron.length; i += 3) assert.ok(apron[i] < 0);
  } finally { f.dispose(); }
});

test('the forest clearing is deterministic and leaves the caller lighting and fog untouched', () => {
  const a = fixture(), b = fixture();
  try {
    a.scene.fogStart = 61; a.scene.fogEnd = 171; a.scene.fogColor = new Color3(.12,.18,.2);
    const first = createWorldcraftPresentation(a.scene), second = createWorldcraftPresentation(b.scene);
    const snapshot = p => p.meshes.map(mesh => ({
      name: mesh.name, positions: mesh.getVerticesData(VertexBuffer.PositionKind),
      colors: mesh.getVerticesData(VertexBuffer.ColorKind), indices: mesh.getIndices(),
    }));
    assert.deepEqual(snapshot(first), snapshot(second));
    assert.equal(a.scene.fogStart, 61); assert.equal(a.scene.fogEnd, 171);
    assert.deepEqual(a.scene.fogColor.asArray(), [.12,.18,.2]);
    assert.equal(a.scene.lights.length, 0);
    assert.ok(first.materials.ramp.diffuseColor.r > first.materials.bank.diffuseColor.r);
    assert.ok(first.materials.bank.diffuseColor.r > first.materials.block.diffuseColor.r);
  } finally { a.dispose(); b.dispose(); }
});

test('repeated presentation creation and idempotent disposal release all owned meshes and materials', () => {
  const f = fixture();
  try {
    for (let i = 0; i < 4; i++) {
      const p = createWorldcraftPresentation(f.scene);
      assert.equal(f.scene.materials.length, 9);
      assert.equal(f.scene.meshes.length, 6);
      p.dispose(); p.dispose();
      assert.equal(f.scene.materials.length, 0);
      assert.equal(f.scene.meshes.length, 0);
      assert.equal(f.scene.transformNodes.length, 0);
      assert.equal(f.scene.textures.length, 0);
    }
  } finally { f.dispose(); }
});
