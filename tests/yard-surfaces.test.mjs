import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, StandardMaterial, Color3, MeshBuilder, Texture, Vector3, VertexBuffer } from '@babylonjs/core';
import { createYardSurfacePixels, applyYardSurfaceMaterials, applyYardGroundUVs, YARD_SURFACE_SIZES, YARD_GROUND_BOUNDS } from '../lib/yard-surfaces.js';
import { createYardPresentationMaterials } from '../lib/yard-presentation.js';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  const materials = Object.fromEntries(['timber', 'brick', 'steel', 'machine', 'rough', 'fairwayA', 'fairwayB', 'sand'].map(key => [key, new StandardMaterial(key, scene)]));
  return { scene, materials, dispose() { scene.dispose(); engine.dispose(); } };
}

test('surface data is deterministic, opaque, bounded in size, and rejects unknown inputs', () => {
  let totalBytes = 0;
  for (const kind of Object.keys(YARD_SURFACE_SIZES)) {
    const first = createYardSurfacePixels(kind), second = createYardSurfacePixels(kind);
    assert.deepEqual(first, second, kind);
    assert.equal(first.data.length, first.width * first.height * 4);
    assert.ok((first.width & (first.width - 1)) === 0 && (first.height & (first.height - 1)) === 0);
    for (let i = 3; i < first.data.length; i += 4) assert.equal(first.data[i], 255);
    totalBytes += first.data.byteLength;
  }
  assert.ok(totalBytes * 4 / 3 < 3.6 * 1024 * 1024, 'including approximate full mip chains');
  assert.throws(() => createYardSurfacePixels('unknown'), RangeError);
});

test('ground wear is smooth and geographically anchored rather than restarting on each stripe', () => {
  const field = createYardSurfacePixels('ground');
  const sample = (x, z) => {
    const u = (z - YARD_GROUND_BOUNDS.minZ) / 216, v = (x - YARD_GROUND_BOUNDS.minX) / 100;
    const offset = (Math.round(v * (field.height - 1)) * field.width + Math.round(u * (field.width - 1))) * 4;
    return Array.from(field.data.slice(offset, offset + 3));
  };
  const mill = sample(-25, 104), opposite = sample(25, 104);
  assert.ok(mill[0] - mill[2] > opposite[0] - opposite[2] + 15, 'muted sawdust warmth belongs beside the west mill');
  assert.ok(sample(0, -1)[0] < sample(35, -1)[0] - 5, 'Gate station has broad activity wear');
  assert.ok(sample(22, 153)[0] < sample(-2, 153)[0] - 5, 'Lumber Walk has its own activity wear');
  let maximumNeighbourChange = 0;
  for (let y = 1; y < field.height; y++) for (let x = 1; x < field.width; x++) {
    const offset = (y * field.width + x) * 4;
    for (let channel = 0; channel < 3; channel++) {
      maximumNeighbourChange = Math.max(maximumNeighbourChange,
        Math.abs(field.data[offset + channel] - field.data[offset + channel - 4]),
        Math.abs(field.data[offset + channel] - field.data[offset + channel - field.width * 4]));
    }
  }
  assert.ok(maximumNeighbourChange <= 3, `broad detail, no sharp pixel noise (${maximumNeighbourChange})`);
});

function meshAuthority(mesh) {
  return {
    position: mesh.position.asArray(), rotation: mesh.rotation.asArray(), scaling: mesh.scaling.asArray(),
    world: Array.from(mesh.computeWorldMatrix(true).asArray()),
    positions: Array.from(mesh.getVerticesData(VertexBuffer.PositionKind)),
    indices: Array.from(mesh.getIndices()), normals: Array.from(mesh.getVerticesData(VertexBuffer.NormalKind)),
    metadata: mesh.metadata,
  };
}

test('ground UVs meet across adjacent existing meshes while preserving all geometry and recognition data', () => {
  const f = fixture();
  try {
    const a = MeshBuilder.CreateBox('a', { width: 20, height: .065, depth: 10 }, f.scene);
    const b = MeshBuilder.CreateBox('b', { width: 20, height: .065, depth: 10 }, f.scene);
    a.position.set(0, .025, 10); b.position.set(0, .025, 20);
    a.metadata = { yardLanding: 'ground' }; b.metadata = { unchanged: 'stripe' };
    const before = [a, b].map(meshAuthority);
    for (const mesh of [a, b]) applyYardGroundUVs(mesh);
    assert.deepEqual([a, b].map(meshAuthority), before);
    const boundaryUVs = mesh => {
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind), uvs = mesh.getVerticesData(VertexBuffer.UVKind), seen = new Map();
      for (let i = 0; i < positions.length; i += 3) {
        const p = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), mesh.getWorldMatrix());
        if (p.z === 15) seen.set(p.x, [uvs[i / 3 * 2], uvs[i / 3 * 2 + 1]]);
      }
      return [...seen].sort(([x], [y]) => x - y);
    };
    assert.equal(boundaryUVs(a).length, 2);
    assert.deepEqual(boundaryUVs(a), boundaryUVs(b));
    for (const [, [u]] of boundaryUVs(a)) assert.ok(Math.abs(u - 32 / 216) < 1e-6);
  } finally { f.dispose(); }
});

test('scene shares four mipmapped textures across materials; repeat application preserves resources and PR50 contrast', () => {
  const f = fixture();
  try {
    f.materials.machine.diffuseColor = new Color3(.085, .13, .135);
    f.materials.steel.diffuseColor = new Color3(.29, .35, .34);
    const initialColors = Object.fromEntries(Object.entries(f.materials).map(([key, material]) => [key, material.diffuseColor.asArray()]));
    const overrides = applyYardSurfaceMaterials(f.scene, f.materials);
    const presentation = createYardPresentationMaterials(f.scene, f.materials);
    const textures = [...f.scene.textures], materialCount = f.scene.materials.length;
    assert.equal(textures.length, 4);
    assert.equal(presentation.yardTreadTop.diffuseTexture, f.materials.timber.diffuseTexture);
    assert.equal(presentation.yardSupportGrain.diffuseTexture, f.materials.timber.diffuseTexture);
    assert.ok(presentation.yardTreadTop.diffuseColor.r > presentation.yardSupportGrain.diffuseColor.r);
    for (let i = 0; i < 6; i++) {
      assert.equal(applyYardSurfaceMaterials(f.scene, f.materials), overrides);
      assert.deepEqual(f.scene.textures, textures);
      assert.equal(f.scene.materials.length, materialCount);
    }
    for (const texture of textures) {
      assert.equal(texture.samplingMode, Texture.TRILINEAR_SAMPLINGMODE);
      assert.equal(texture.getInternalTexture().generateMipMaps, true);
      assert.equal(texture.anisotropicFilteringLevel, 4);
    }
    assert.equal(f.materials.rough.diffuseTexture, f.materials.fairwayA.diffuseTexture);
    assert.equal(f.materials.rough.diffuseTexture, f.materials.fairwayB.diffuseTexture);
    assert.equal(f.materials.steel.diffuseTexture, f.materials.machine.diffuseTexture);
    assert.deepEqual(Object.fromEntries(Object.entries(f.materials).map(([key, material]) => [key, material.diffuseColor.asArray()])), initialColors);
    assert.equal(f.scene.meshes.length, 0, 'surface presentation adds no meshes');
  } finally { f.dispose(); }
});
