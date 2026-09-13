import {YARD_STATIONS} from '../lib/stations.js';
import {scoreLine} from '../lib/line-score.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
 floorA:{railIndex:1,yaw:-26,elevation:40,charge:.6},
 floorB:{railIndex:1,yaw:-26,elevation:40,charge:.6},
 direct:{railIndex:1,yaw:0,elevation:42,charge:.93},
 switch:{railIndex:1,yaw:-43,elevation:18,charge:.5},
};

test('cleaned dock reuses the loading-platform footprint and existing targets with real contacts in both states',()=>{
 const results=[];
 for(const state of ['A','B']){
  const h=diverterHarness(hv,state,true);
  try{
   const scene=h.world.floor.getScene();
   assert.equal(scene.meshes.filter(m=>m.name.includes('loading-platform')).length,0,'old platform collider is replaced, not doubled');
   assert.equal(scene.meshes.filter(m=>m.name.includes('bounce-floor')).length,1);
   assert.equal(scene.meshes.filter(m=>m.name.includes('yard-dispatch')).length,0);
   assert.equal(h.world.floor.position.x,-28);assert.equal(h.world.floor.position.z,63);
   const direct=h.shoot(YARD_REFERENCE_SHOTS.direct);assert.equal(direct.outcome,'ace');assert.equal(scoreLine(direct.ledger).total,800);
   const r=h.shoot(YARD_REFERENCE_SHOTS['floor'+state]);
   assert.ok(r.tags.includes('floor-'+state.toLowerCase()));
   assert.equal(r.contacts.find(c=>c.kind.startsWith('floor')).body,'diverter-bounce-floor');assert.equal(scoreLine(r.ledger).claimTotal,200);results.push(r);
  }finally{h.dispose();}
 }
 assert.ok(Math.hypot(...results[0].point.map((v,i)=>v-results[1].point[i]))>3,'same input produces distinct real rebounds');
});

test('shot contact switches both ways in the real yard; retry persists, reset and entry restore A',()=>{
 const h=diverterHarness(hv,'A',true);
 try{
  for(const yaw of [-41,-43,-45])for(const elevation of [16,18,20]){
   h.action('reset');const shot={...YARD_REFERENCE_SHOTS.switch,yaw,elevation};
   const b=h.shoot(shot,{stopOnSwitch:true,station:YARD_STATIONS.lumber});assert.equal(b.end,'B');assert.deepEqual(b.tags,['switch-b']);
   assert.equal(b.contacts[0].body,'diverter-switch');assert.equal(scoreLine(b.ledger).total,250);h.action('retry');h.action('card');h.action('station');assert.equal(h.world.state,'B');
   const a=h.shoot(shot,{stopOnSwitch:true,station:YARD_STATIONS.lumber});assert.equal(a.end,'A');assert.deepEqual(a.tags,['switch-a']);
  }
  h.shoot(YARD_REFERENCE_SHOTS.switch,{stopOnSwitch:true,station:YARD_STATIONS.lumber});h.action('retry');
  assert.ok(h.shoot(YARD_REFERENCE_SHOTS.floorB).tags.includes('floor-b'));
  h.action('reset');assert.equal(h.world.state,'A');assert.equal(h.world.floor.rotation.z,0);
  assert.ok(h.shoot(YARD_REFERENCE_SHOTS.floorA).tags.includes('floor-a'));
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
  const saved=normalizeShotLibrary(JSON.parse(JSON.stringify(data)),HOLES)[HOLE.id].recent[0];
  assert.equal(saved.environment.floor,'B');assert.match(lineFamily(saved),/FLOOR B.*floor-b/);
  h.action('reset');h.action('recall',saved.environment);const replay=h.shoot(saved);
  assert.equal(replay.outcome,r.outcome);assert.ok(Math.hypot(...replay.point.map((v,i)=>v-r.point[i]))<.05);
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

test('recognition captions real Gallery, Cascade, roof, Sky and unauthored lumber and reverse-pad lines',()=>{
 const fixtures=[
  {card:1,shot:{railIndex:0,yaw:-1,elevation:25,charge:.93},claims:['common:bank-a','common:bank-b','banks','seat']},
  {card:2,shot:{railIndex:1,yaw:0,elevation:30,charge:legacyChargeToCurrent(.05)},claims:['common:step-a','common:step-b','common:step-c','treads','seat']},
  {card:0,shot:{railIndex:1,yaw:-14,elevation:65,charge:1},claims:['common:mill-roof:-29.9:104','mill','seat']},
  {card:0,shot:{railIndex:1,yaw:0,elevation:52,charge:legacyChargeToCurrent(.95)},claims:['sky','seat']},
  {card:2,shot:{railIndex:1,yaw:-34,elevation:10,charge:.8},claims:['common:stack-body:41:126'],miss:true},
  {card:2,shot:{railIndex:1,yaw:16,elevation:30,charge:.6},claims:['skip'],miss:true},
 ];
 for(const f of fixtures){
  const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[f.card]);
  try{const r=h.shoot(f.shot),receipt=scoreLine(r.ledger),ids=receipt.awards.map(a=>a.id);
   for(const claim of f.claims)assert.ok(ids.includes(claim),JSON.stringify({claim,receipt}));
   if(f.miss)assert.ok(!ids.includes('seat'));
   assert.deepEqual(scoreLine(JSON.parse(JSON.stringify(r.ledger))),receipt);
   for(const e of r.ledger.filter(e=>e.kind==='redirect')){
    assert.ok(r.ledger.some(raw=>raw.kind==='contact'&&raw.body===e.body));
    assert.ok(e.turn>=25&&e.freeSeconds>=.1&&e.separation>=1);
   }
  }finally{h.dispose();}
 }
});

test('world state travels from Lumber Walk switch to a rebuilt Yard Gate and back; Reset and Recall remain explicit',()=>{
 let h=diverterHarness(hv,'A',true,COURTYARD_HOLES[2]);
 const changed=h.shoot(YARD_REFERENCE_SHOTS.switch,{stopOnSwitch:true});assert.equal(changed.end,'B');
 h.action('station');const carry=h.world.state;h.dispose();
 h=diverterHarness(hv,carry,true,COURTYARD_HOLES[0]);
 try{assert.equal(h.world.state,'B');const r=h.shoot(YARD_REFERENCE_SHOTS.floorB);assert.equal(r.start,'B');assert.ok(r.tags.includes('floor-b'));
  h.action('card');h.action('retry');assert.equal(h.world.state,'B');h.action('reset');assert.equal(h.world.state,'A');h.action('recall',{floor:'B'});assert.equal(h.world.state,'B');
 }finally{h.dispose();}
});
