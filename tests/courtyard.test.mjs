import { stationRailPosition } from '../lib/stations.js';
import { CASCADE_STEPS } from '../lib/lumber-cascade.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine, Scene, FreeCamera, Vector3, Matrix, Logger } from '@babylonjs/core';
import { COURTYARD_HOLES, COURTYARD_BANKS, isCourtyardChallengeUnlocked } from '../lib/courtyard.js';
import { RAIL_RULES, mergeHoleRecord, normalizeHoleRecord, classifyChallengeRuling, segmentSphereAabbIntersection } from '../lib/rail-golf-v02.js';
import { courtyardShot } from './helpers/courtyard-physics.mjs';
Logger.LogLevels = Logger.NoneLogLevel;

test('courtyard mastery requires two distinct banks in the authored order within one stroke', () => {
  const hole = COURTYARD_HOLES[1];
  for (const tags of [[], ['bank-a'], ['bank-a', 'bank-a'], ['bank-b', 'bank-a']]) {
    assert.equal(classifyChallengeRuling({ hole, tags, targetHit: true }), 'ace');
  }
  assert.equal(classifyChallengeRuling({ hole, tags: ['bank-a', 'bank-b'], targetHit: true }), 'double');
  assert.equal(classifyChallengeRuling({ hole, tags: ['bank-a', 'bank-b'], targetHit: false }), 'breach');
});

test('full mill scene supports a long carry and a neighborhood of actual two-wall rebounds', async (t) => {
  const havok = await HavokPhysics({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  for (const charge of [.87,.89,.91]) await t.test(`long carry at ${charge}`, () => {
    const result = courtyardShot(havok, COURTYARD_HOLES[0], { railIndex: 1, yaw: 0, elevation: 42, charge });
    assert.equal(result.outcome, 'ace');
    assert.deepEqual(result.tags, []);
    assert.ok(result.point.z > 140);
  });
  for (const yaw of [-2,-1,0]) for (const charge of [.85,.9,.95]) await t.test(`two banks, yaw ${yaw}, power ${charge}`, () => {
    const result = courtyardShot(havok, COURTYARD_HOLES[1], { railIndex: 0, yaw, elevation: 25, charge });
    assert.equal(result.outcome, 'double', JSON.stringify(result));
    assert.deepEqual(result.tags, ['bank-a','bank-b']);
    assert.equal(result.collisions.length, 2);
    result.contacts.forEach((contact, i) => {
      const bank = COURTYARD_BANKS[i];
      assert.ok(result.collisions.some(name => name.includes(bank.id)), 'scoring sweep must accompany a physical collision');
      assert.ok(contact.point.y < bank.maxY - RAIL_RULES.projectileRadius, 'bank below the top edge');
    });
  });
});

test('courtyard destination beacons fit the mobile address view without a bank hiding them', () => {
  const engine = new NullEngine({ renderWidth: 844, renderHeight: 390, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
  const scene = new Scene(engine);
  try {
    const camera = new FreeCamera('address', Vector3.Zero(), scene);
    camera.fov = .69; camera.minZ = .1; camera.maxZ = 280;
    for (const hole of COURTYARD_HOLES) for (const [railIndex, railX] of RAIL_RULES.railPositions.entries()) {
      const yaw = (hole.defaultShot.yaw + hole.station.yaw) * Math.PI / 180;
      const aim = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const rail = stationRailPosition(railIndex,hole.station);
      const origin = new Vector3(rail.x, .4, rail.z);
      camera.position = origin.subtract(aim.scale(15)).add(new Vector3(0,7.4,0));
      camera.setTarget(origin.add(aim.scale(34)).add(new Vector3(0,3.2,0)));
      camera.getViewMatrix(true); camera.getProjectionMatrix(true);
      for (const height of hole.id === 'lumber-cascade' ? [hole.target.beaconHeight] : [.2, 6.4 * Math.max(1, hole.target.z / 80)]) {
        const point = new Vector3(hole.target.x, height, hole.target.z);
        for (const bank of COURTYARD_BANKS) assert.equal(segmentSphereAabbIntersection(camera.position, point, bank, 0), null, `${hole.id} rail ${railX} hidden by ${bank.id}`);
        if(hole.id==='lumber-cascade') for(const step of CASCADE_STEPS) assert.equal(segmentSphereAabbIntersection(camera.position,point,{x:step.x,z:step.z,minY:0,maxY:step.top,halfWidth:step.width/2,halfDepth:step.depth/2},0),null,'receiving beacon must clear the stacks');
        const screen = Vector3.Project(point, Matrix.Identity(), camera.getTransformationMatrix(), camera.viewport.toGlobal(844,390));
        assert.ok(screen.z > 0 && screen.z < 1 && screen.x > 0 && screen.x < 844 && screen.y > 60 && screen.y < 263, `${hole.id} rail ${railX}: ${screen}`);
      }
    }
  } finally { scene.dispose(); engine.dispose(); }
});

test('a normal target clear unlocks the next challenge and survives saved-record normalization', () => {
  const id = COURTYARD_HOLES[0].id;
  assert.equal(isCourtyardChallengeUnlocked(0), true);
  assert.equal(isCourtyardChallengeUnlocked(1), false);
  const missed = mergeHoleRecord(undefined, 'breach');
  assert.equal(isCourtyardChallengeUnlocked(1, { [id]: missed }), false);
  const cleared = normalizeHoleRecord(JSON.parse(JSON.stringify(mergeHoleRecord(missed, 'ace'))));
  assert.equal(cleared.perfect, false);
  assert.equal(isCourtyardChallengeUnlocked(1, { [id]: cleared }), true);
  assert.equal(isCourtyardChallengeUnlocked(3, { [id]: cleared }), false);
});
