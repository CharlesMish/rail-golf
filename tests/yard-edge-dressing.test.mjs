import test from 'node:test';
import assert from 'node:assert/strict';
import { FreeCamera, GlowLayer, NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';
import { createYardEdgeDressing, YARD_EDGE_DRESSING } from '../lib/yard-edge-dressing.js';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.activeCamera = new FreeCamera('existing-camera', new Vector3(0, 8, -15), scene);
  return { scene, dispose() { scene.dispose(); engine.dispose(); } };
}

const triangles = mesh => {
  const p = mesh.getVerticesData(VertexBuffer.PositionKind), idx = mesh.getIndices(), out = [];
  for (let i = 0; i < idx.length; i += 3) out.push([idx[i], idx[i + 1], idx[i + 2]].map(k => p.slice(k * 3, k * 3 + 3)));
  return out;
};

const onPerimeter = ([x, , z]) => {
  const { x: fx, south, north } = YARD_EDGE_DRESSING.fence, reach = YARD_EDGE_DRESSING.perimeterReach;
  return Math.abs(Math.abs(x) - fx) <= reach || Math.abs(z - south) <= reach || Math.abs(z - north) <= reach;
};
const beyondMargin = ([x, y, z]) => {
  const o = YARD_EDGE_DRESSING.outside;
  return y >= -1.6 && (Math.abs(x) > o.x || z < o.south || z > o.north);
};
const outsideSlab = ([x, , z]) => {
  const s = YARD_EDGE_DRESSING.slab;
  return Math.abs(x) >= s.x - 1e-6 || z <= s.south + 1e-6 || z >= s.north - 1e-6;
};
// Shoulders and roads lie on the apron, below the slab's top, outside its footprint.
const belowSlab = v => v[1] < -.6 && outsideSlab(v);
// The retaining skin hugs the slab faces and never rises above floor detail.
const slabSkin = ([x, y, z]) => {
  const s = YARD_EDGE_DRESSING.slab, d = YARD_EDGE_DRESSING.skinDepth;
  const nearFace = (Math.abs(x) >= s.x - 1e-6 && Math.abs(x) <= s.x + d) || (z <= s.south + 1e-6 && z >= s.south - d) || (z >= s.north - 1e-6 && z <= s.north + d);
  return nearFace && Math.abs(x) <= s.x + d && z >= s.south - d && z <= s.north + d && y <= YARD_EDGE_DRESSING.floorMaxY && y >= -1;
};

test('edge dressing is deterministic and carries no gameplay authority', () => {
  const a = fixture(), b = fixture();
  try {
    const first = createYardEdgeDressing(a.scene), second = createYardEdgeDressing(b.scene);
    assert.deepEqual(first.meshes.map(m => m.getVerticesData(VertexBuffer.PositionKind)), second.meshes.map(m => m.getVerticesData(VertexBuffer.PositionKind)));
    assert.ok(first.stats.meshes <= 5, `draws ${first.stats.meshes}`);
    assert.ok(first.stats.triangles <= 20000, `triangles ${first.stats.triangles}`);
    assert.equal(a.scene.textures.length, 0); assert.equal(a.scene.lights.length, 0);
    assert.equal(a.scene.getPhysicsEngine(), null);
    for (const mesh of first.meshes) {
      assert.equal(mesh.isPickable, false); assert.equal(mesh.checkCollisions, false);
      assert.equal(mesh.physicsBody, undefined); assert.equal(mesh.metadata, null);
      assert.equal(mesh.receiveShadows, false);
    }
  } finally { a.dispose(); b.dispose(); }
});

test('inside the slab only the perimeter stands taller than floor detail; stockpiles stay beyond the environment margin', () => {
  const f = fixture();
  try {
    const dressing = createYardEdgeDressing(f.scene);
    for (const mesh of dressing.meshes) {
      const p = mesh.getVerticesData(VertexBuffer.PositionKind);
      for (let i = 0; i < p.length; i += 3) {
        const v = p.slice(i, i + 3), [x, y, z] = v;
        if (beyondMargin(v) || belowSlab(v) || slabSkin(v)) continue;
        assert.ok(Math.abs(x) <= 49.5 && z >= -16.5 && z <= 197 && y >= 0, `${mesh.name} hangs between the slab and the outside margin: ${x},${y},${z}`);
        if (y > YARD_EDGE_DRESSING.floorMaxY + 1e-6) assert.ok(onPerimeter(v), `${mesh.name} stands inside the yard: ${x},${y},${z}`);
      }
      if (!mesh.name.includes('floor')) continue;
      for (const tri of triangles(mesh)) {
        const cx = tri.reduce((s, v) => s + v[0], 0) / 3, cz = tri.reduce((s, v) => s + v[2], 0) / 3;
        for (const zone of YARD_EDGE_DRESSING.keepClear) {
          assert.ok(!(cx > zone.minX && cx < zone.maxX && cz > zone.minZ && cz < zone.maxZ), `floor detail enters ${zone.id} at ${cx.toFixed(1)},${cz.toFixed(1)}`);
        }
      }
    }
  } finally { f.dispose(); }
});

test('dressing is excluded from glow and disposes cleanly', () => {
  const f = fixture();
  try {
    const glow = new GlowLayer('existing-glow', f.scene);
    const baseline = { meshes: f.scene.meshes.length, materials: f.scene.materials.length, roots: f.scene.transformNodes.length };
    for (let i = 0; i < 3; i++) {
      const dressing = createYardEdgeDressing(f.scene, { glow });
      for (const mesh of dressing.meshes) assert.equal(glow.hasMesh(mesh), false);
      dressing.dispose(); dressing.dispose();
      assert.deepEqual({ meshes: f.scene.meshes.length, materials: f.scene.materials.length, roots: f.scene.transformNodes.length }, baseline);
    }
  } finally { f.dispose(); }
});
