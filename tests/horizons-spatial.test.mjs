import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { PhysicsMotionType } from '@babylonjs/core';
import { overpassPreset, SPATIAL_REFERENCES, spatialFamily } from '../scripts/horizons/spatial-layout.mjs';
import { spatialHarness } from '../scripts/horizons/spatial-harness.mjs';
import { worldcraftBox } from '../lib/worldcraft-model.js';
import { validateFoundryDirectory } from '../scripts/foundry/validate.mjs';
import { resultFraming } from '../lib/worldcraft-play-copy.js';

const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const authority = row => ({ terminal: row.terminal, contacts: row.contacts, redirects: row.redirects });

test('Overpass stays in the existing declarative vocabulary and every visible solid has its matching static body', async () => {
  const file = JSON.parse(await readFile(new URL('../worlds/foundry/overpass/preset.json', import.meta.url)));
  assert.deepEqual(file, overpassPreset());
  assert.equal(file.objects.length, 11);
  assert.equal(file.capacity, undefined);
  assert.equal(file.rules.goal.kind, 'none');
  const h = spatialHarness(havok, file);
  try {
    for (const object of file.objects) {
      const mesh = h.runtime.objectMeshes.get(object.id), box = worldcraftBox(object);
      assert.equal(mesh.physicsBody.getMotionType(), PhysicsMotionType.STATIC);
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo().boundingBox;
      assert.ok(Math.abs(bounds.minimumWorld.y - box.minY) < 1e-5);
      assert.ok(Math.abs(bounds.maximumWorld.y - box.maxY) < 1e-5);
      if (object.id.startsWith('deck-')) {
        assert.ok(Math.abs(box.minY - 7) < 1e-8);
        assert.ok(Math.abs(box.maxY - 7.35) < 1e-8);
      }
      assert.equal(Boolean(mesh.metadata.rangeGround), false);
    }
    assert.deepEqual(h.resources(), { physicsBodies: 13, staticBodies: 13, animatedBodies: 0, dynamicBodies: 0, sceneMeshes: 21, heightGuides: 8, materials: 15, textures: 0, geometries: 21, transformNodes: 1, shadowCasters: 12 });
    const report = await validateFoundryDirectory('worlds/foundry/overpass', havok);
    assert.equal(report.shots.length, 7);
    assert.equal(report.customCode, null);
  } finally { h.dispose(); }
});

test('a real roof-top carry and lower through-return coexist; removing the roof removes only the upper route', () => {
  const h = spatialHarness(havok, overpassPreset());
  try {
    const upper = h.shoot(SPATIAL_REFERENCES['upper-carry'], { points: true });
    const lower = h.shoot(SPATIAL_REFERENCES['lower-return'], { points: true });
    assert.equal(spatialFamily(upper), 'top');
    assert.equal(spatialFamily(lower), 'wall');
    assert.ok(upper.terminal.position[2] > 65);
    assert.ok(lower.terminal.position[2] < 30);
    const contact = upper.rawContacts.find(row => row.body.includes('-deck-') && Math.abs(row.normal[1]) > .98);
    assert.ok(contact.point[1] > 7.3 && contact.incoming[1] < 0);
    const redirect = upper.redirects.find(row => row.feature.startsWith('deck-'));
    assert.ok(redirect.incoming.y < -8 && redirect.outgoing.y > 7);
    const below = lower.ticks.filter(row => row.position[2] >= 32 && row.position[2] <= 40);
    assert.ok(below.some(row => row.velocity[2] > 0) && below.some(row => row.velocity[2] < 0));
    assert.ok(below.every(row => row.position[1] + .43 < 7));
    assert.equal(upper.terminal.reason, 'first-ground-contact');
    assert.equal(lower.terminal.reason, 'first-ground-contact');
    h.load(overpassPreset({ control: 'no-deck' }));
    const upperControl = h.shoot(SPATIAL_REFERENCES['upper-carry']);
    const lowerControl = h.shoot(SPATIAL_REFERENCES['lower-return']);
    assert.equal(spatialFamily(upperControl), 'wall');
    assert.ok(upperControl.terminal.position[2] < 43);
    assert.deepEqual(authority(lowerControl), authority(lower));
  } finally { h.dispose(); }
});

test('both primary families survive every immediate player-control neighbour; overrun, shortfall and ceiling edge remain real alternatives', () => {
  const h = spatialHarness(havok, overpassPreset());
  try {
    for (const [id, expected] of [['upper-carry', 'top'], ['lower-return', 'wall']]) {
      const centre = SPATIAL_REFERENCES[id];
      for (const [key, step] of [['yaw', .5], ['elevation', .5], ['charge', .01], ['originX', .5]]) for (const sign of [-1, 1]) {
        const setup = { ...centre, [key]: Math.round((centre[key] + step * sign) * 100) / 100 };
        assert.equal(spatialFamily(h.shoot(setup)), expected, `${id} ${key} ${sign}`);
      }
    }
    assert.equal(spatialFamily(h.shoot(SPATIAL_REFERENCES['beyond-deck'])), 'wall');
    assert.equal(spatialFamily(h.shoot(SPATIAL_REFERENCES.short)), 'no-piece');
    assert.equal(spatialFamily(h.shoot(SPATIAL_REFERENCES.ceiling)), 'underside');
    assert.equal(spatialFamily(h.shoot(SPATIAL_REFERENCES['ceiling-lip'])), 'edge-or-pier');
    assert.equal(spatialFamily(h.shoot(SPATIAL_REFERENCES['high-bypass'])), 'no-piece');
  } finally { h.dispose(); }
});

test('repeat, Scene-observable stepping and load-fire-reset-switch preserve physics and release every owned scene resource', () => {
  const h = spatialHarness(havok, overpassPreset());
  try {
    const first = h.shoot(SPATIAL_REFERENCES['upper-carry']);
    assert.deepEqual(authority(h.shoot(SPATIAL_REFERENCES['upper-carry'])), authority(first));
    assert.deepEqual(authority(h.shoot(SPATIAL_REFERENCES['upper-carry'], { sceneSteps: true })), authority(first));
    const counts = h.resources();
    for (let i = 0; i < 4; i++) {
      h.load(overpassPreset({ control: 'no-deck' }));
      h.shoot(SPATIAL_REFERENCES['lower-return']);
      h.load(overpassPreset());
      h.shoot(SPATIAL_REFERENCES['upper-carry']);
      h.load(overpassPreset());
      assert.deepEqual(h.resources(), counts);
    }
    assert.equal(first.activeResources.dynamicBodies, 1);
    const frame = resultFraming(h.runtime.world, first, 'overpass');
    assert.equal(frame.view, 'survey');
    assert.ok(frame.radius >= 60);
    assert.ok(Object.values(h.disposeRuntime()).every(count => count === 0));
  } finally { h.dispose(); }
});
