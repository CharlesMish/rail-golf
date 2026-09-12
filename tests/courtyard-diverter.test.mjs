import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Vector3} from '@babylonjs/core';
import {legacyChargeToCurrent} from '../lib/rail-golf-v02.js';
import HavokPhysics from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {courtyardShot} from './helpers/courtyard-physics.mjs';
import {COURTYARD_DIVERTER as HOLE,COURTYARD_DIVERTER_HOLES as HOLES} from '../lib/courtyard-diverter.js';
import {COURTYARD_HOLES,COURTYARD_SKIP_PAD} from '../lib/courtyard.js';
import {withSharedYardPad,padImpulse} from '../lib/delivery-routes.js';
import {packLine,normalizeShotLibrary,lineFamily} from '../lib/shot-library.js';
const hv=await HavokPhysics({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
// Source-only Mode B setups. Keep these out of the blind player handoff.
export const YARD_REFERENCE_SHOTS={
 floorA:{railIndex:1,yaw:-4,elevation:44,charge:.56},
 floorB:{railIndex:1,yaw:0,elevation:36,charge:.585},
 direct:{railIndex:1,yaw:-2,elevation:24,charge:.9},
 switch:{railIndex:1,yaw:32,elevation:12,charge:.45},
};

test('integrated yard supports ordinary and real-floor clear neighborhoods in both states',async t=>{
 for(const state of ['A','B']){
  const h=diverterHarness(hv,state,true);
  try{
   assert.equal(h.shoot(YARD_REFERENCE_SHOTS.direct).outcome,'ace');
   for(const yaw of state==='A'?[-5,-4,-3]:[-1,0,1])for(const charge of state==='A'?[.54,.55,.56,.57]:[.58,.585,.59]){
    await t.test(`state ${state}, yaw ${yaw}, power ${charge}`,()=>{
     const r=h.shoot({...YARD_REFERENCE_SHOTS['floor'+state],yaw,charge});
     assert.equal(r.outcome,'ace',JSON.stringify(r));assert.ok(r.tags.includes('floor-'+state.toLowerCase()));
     assert.equal(r.contacts.find(c=>c.kind.startsWith('floor')).body,'diverter-bounce-floor');
     assert.equal(r.start,state);assert.equal(r.end,state);
    });
   }
  }finally{h.dispose();}
 }
});

test('same launch reaches different useful lines in the two physical states',()=>{
 const h=diverterHarness(hv,'A',true);
 try{
  const shot={railIndex:1,yaw:-2,elevation:28,charge:.625};
  const a=h.shoot(shot),old=h.world.floorBody;h.world.setState('B');const b=h.shoot(shot);
  assert.notEqual(old,h.world.floorBody);assert.equal(a.outcome,'ace');assert.equal(b.outcome,'ace');
  assert.ok(Math.abs(a.point[0]-b.point[0])>5);
  assert.ok(a.tags.includes('floor-a'));assert.ok(b.tags.includes('floor-b'));
  const matrix=h.world.floor.computeWorldMatrix(true);
  const left=Vector3.TransformCoordinates(new Vector3(-7,.4,0),matrix),right=Vector3.TransformCoordinates(new Vector3(7,.4,0),matrix);
  assert.ok(right.y-left.y>1.8);
 }finally{h.dispose();}
});

test('shot contact switches both ways in the real yard; retry persists, reset and entry restore A',()=>{
 const h=diverterHarness(hv,'A',true);
 try{
  for(const yaw of [31,32,33,34])for(const elevation of [10,12,14]){
   h.action('reset');const shot={...YARD_REFERENCE_SHOTS.switch,yaw,elevation};
   const b=h.shoot(shot,{stopOnSwitch:true});assert.equal(b.end,'B');assert.deepEqual(b.tags,['switch-b']);
   assert.equal(b.contacts[0].body,'diverter-switch');h.action('retry');assert.equal(h.world.state,'B');
   const a=h.shoot(shot,{stopOnSwitch:true});assert.equal(a.end,'A');assert.deepEqual(a.tags,['switch-a']);
  }
  h.shoot(YARD_REFERENCE_SHOTS.switch,{stopOnSwitch:true});h.action('retry');
  assert.equal(h.shoot(YARD_REFERENCE_SHOTS.floorB).outcome,'ace');
  h.action('reset');assert.equal(h.world.state,'A');assert.equal(h.world.floor.rotation.z,0);
  assert.equal(h.shoot(YARD_REFERENCE_SHOTS.floorA).outcome,'ace');
 }finally{h.dispose();}
 const fresh=diverterHarness(hv,undefined,true);assert.equal(fresh.world.state,'A');fresh.dispose();
});

test('integrated saved lines retain start/end state through storage and recall',()=>{
 const h=diverterHarness(hv,'B',true);
 try{
  const shot=YARD_REFERENCE_SHOTS.floorB,r=h.shoot(shot);
  const line=packLine({...shot,holeId:HOLE.id,stationId:'gate',windId:HOLE.wind.id,projectileId:1,
   environment:{floor:r.start},environmentAfter:{floor:r.end},outcome:r.outcome,receipt:'Physical yard contact',points:[],
   contacts:r.contacts.map((c,i)=>({id:String(i),kind:c.kind,point:c.point}))});
  const data={version:1,holes:{[HOLE.id]:{recent:[line],wins:[line]}}};
  const saved=normalizeShotLibrary(JSON.parse(JSON.stringify(data)),HOLES)[HOLE.id].wins[0];
  assert.equal(saved.environment.floor,'B');assert.match(lineFamily(saved),/FLOOR B.*floor-b/);
  h.action('reset');h.action('recall',saved.environment);const replay=h.shoot(saved);
  assert.equal(replay.outcome,'ace');assert.ok(Math.hypot(...replay.point.map((v,i)=>v-r.point[i]))<.05);
  data.holes[HOLE.id].recent[0]={...line,environment:undefined};
  assert.equal(normalizeShotLibrary(data,HOLES)[HOLE.id].recent.length,0);
 }finally{h.dispose();}
});

test('the original pad stays physically powered on Gallery and Lumber Walk, without Delivery awards',()=>{
 for(const hole of [...COURTYARD_HOLES,HOLE]){
  assert.equal(withSharedYardPad(hole).boost,COURTYARD_SKIP_PAD);
  assert.deepEqual(padImpulse({x:1,y:-12,z:-10},hole),padImpulse({x:1,y:-12,z:-10},COURTYARD_HOLES[0]));
 }
 for(const [hole,shot] of [
  [COURTYARD_HOLES[1],{railIndex:1,yaw:0,elevation:20,charge:legacyChargeToCurrent(.7)}],
  [COURTYARD_HOLES[2],{railIndex:1,yaw:16,elevation:30,charge:.6}],
 ]){
  const r=courtyardShot(hv,hole,shot);
  assert.ok(r.tags.includes('boost'),JSON.stringify(r));assert.ok(!r.routes.includes('skip'));
  const at=r.contacts.find(c=>c.kind==='boost').point;
  assert.ok(Math.abs(r.point.z-at.z)>15,'powered rebound continues beyond pad contact');
 }
});
