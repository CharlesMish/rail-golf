import { legacyChargeToCurrent } from '../lib/rail-golf-v02.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { COURTYARD_HOLES, isCourtyardChallengeUnlocked } from '../lib/courtyard.js';
import { CASCADE_STEPS, cascadeContactTag } from '../lib/lumber-cascade.js';
import { YARD_STATIONS, stationRailPosition, stationAim, stationMuzzle } from '../lib/stations.js';
import { muzzleFromShot, directionFromAim, classifyChallengeRuling, formatMiss, mergeHoleRecord } from '../lib/rail-golf-v02.js';
import { courtyardShot } from './helpers/courtyard-physics.mjs';
Logger.LogLevels=0;
const hole=COURTYARD_HOLES[2];

test('gate station exactly preserves the original launch; lumber station reverses local rails and aim',()=>{
  const shot={railIndex:0,yaw:7,elevation:42,charge:.5};
  assert.deepEqual(stationMuzzle(shot),muzzleFromShot(shot));
  assert.deepEqual(stationAim(shot),directionFromAim(7,42));
  assert.equal(stationRailPosition(0,YARD_STATIONS.lumber).x,26);
  assert.equal(stationRailPosition(2,YARD_STATIONS.lumber).x,18);
  const aimed=stationAim({yaw:0,elevation:30},YARD_STATIONS.lumber);
  assert.ok(aimed.z<0 && Math.abs(aimed.x)<1e-10);
  assert.match(formatMiss(hole,{x:22,y:.92,z:56}),/10.0 m short/);
  assert.match(formatMiss(hole,{x:24,y:.92,z:46}),/2.0 m left/);
});

test('delivery opens both branches; a mechanism miss opens neither; cascade mastery stays optional',()=>{
  const id=COURTYARD_HOLES[0].id;
  const clear=mergeHoleRecord(undefined,'ace');
  assert.equal(isCourtyardChallengeUnlocked(2,{[id]:clear}),true);
  assert.equal(isCourtyardChallengeUnlocked(1,{[id]:clear}),true);
  assert.equal(isCourtyardChallengeUnlocked(2,{[id]:mergeHoleRecord(undefined,'breach')}),false);
  assert.equal(isCourtyardChallengeUnlocked(3,{[id]:clear}),false);
  for(const tags of [[],['step-a'],['step-b','step-c'],['step-c','step-b','step-a'],['step-a','step-a','step-c']]) {
    assert.equal(classifyChallengeRuling({hole,targetHit:true,tags}),'ace');
  }
  assert.equal(classifyChallengeRuling({hole,targetHit:true,tags:['step-a','step-b','step-c']}),'double');
  assert.equal(classifyChallengeRuling({hole,targetHit:false,tags:['step-a','step-b','step-c']}),'breach');
});

test('tread evidence requires an actual top-face contact supplied by the collision handler',()=>{
  for(const step of CASCADE_STEPS){
    assert.equal(cascadeContactTag(step.id,{x:step.x,y:step.top,z:step.z}),step.id);
    assert.equal(cascadeContactTag(step.id,{x:step.x,y:step.top-.5,z:step.z}),null);
    assert.equal(cascadeContactTag(step.id,{x:step.x+step.width,y:step.top,z:step.z}),null);
    assert.equal(cascadeContactTag(step.id,null),null);
  }
  assert.equal(cascadeContactTag('stack',{x:22,y:8,z:122}),null);
});

test('full yard supports 27 three-tread landings and nine direct carries across all rails',async(t)=>{
  const havok=await HavokPhysics({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
  for(const railIndex of [0,1,2]) for(const yaw of [-1,0,1]) for(const charge of [.025,.05,.075]) await t.test(`cascade rail ${railIndex}, yaw ${yaw}, charge ${charge}`,()=>{
    const r=courtyardShot(havok,hole,{railIndex,yaw,elevation:30,charge:legacyChargeToCurrent(charge)});
    assert.equal(r.outcome,'double',JSON.stringify(r));
    assert.deepEqual(r.tags.slice(0,3),['step-a','step-b','step-c']);
    for (const extra of r.tags.slice(3)) assert.ok(r.collisions.some(name=>name.includes(extra)), 'additional bank evidence must also have a physical contact');
    for(const step of CASCADE_STEPS){
      assert.ok(r.collisions.some(name=>name.includes(`${step.id}-`)&&!name.includes('stack')), 'real tread collider must be touched');
      const contact=r.contacts.find(c=>c.kind===step.id);
      assert.ok(contact && Math.abs(contact.point.y-step.top)<.15);
    }
  });
  for(const railIndex of [0,1,2]) for(const charge of [.55,.6,.65]) await t.test(`direct rail ${railIndex}, charge ${charge}`,()=>{
    const r=courtyardShot(havok,hole,{railIndex,yaw:0,elevation:40,charge:legacyChargeToCurrent(charge)});
    assert.equal(r.outcome,'ace',JSON.stringify(r));
    assert.deepEqual(r.tags,[]); assert.deepEqual(r.collisions,[]);
  });
});
