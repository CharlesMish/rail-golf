import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {collectLineStepEvents} from '../lib/line-recognition.js';
import {COURTYARD_SKIP_PAD} from '../lib/courtyard.js';
import {LINECRAFT_SECOND_PAD,LINECRAFT_CROSS_FACE,collectLinecraftStepEvents} from '../lib/linecraft-yard.js';
import {TIMBER_RECEIVER} from '../lib/timber-receiver.js';
import {matchLinecraftSentence} from '../lib/linecraft-lab.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';

const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const card=selectOpenLineStation('gate');
const shot=(railIndex,yaw,elevation,charge)=>({railIndex,yaw,elevation,charge});

test('second pad is a distinct parallel alternative with incumbent swept boost and first-ground precedence',()=>{
 assert.equal(LINECRAFT_SECOND_PAD.z,COURTYARD_SKIP_PAD.z);
 assert.equal(LINECRAFT_SECOND_PAD.verticalSpeed,COURTYARD_SKIP_PAD.verticalSpeed);
 assert.ok(LINECRAFT_SECOND_PAD.x+LINECRAFT_SECOND_PAD.halfWidth<COURTYARD_SKIP_PAD.x-COURTYARD_SKIP_PAD.halfWidth);
 const start={x:LINECRAFT_SECOND_PAD.x,y:2,z:84},end={...start,y:0};
 assert.equal(collectLineStepEvents(start,end,card,[],[],false).filter(e=>e.kind==='boost').length,0);
 const events=collectLinecraftStepEvents(start,end,card);
 assert.equal(events[0].kind,'boost');assert.equal(events[0].pad,'side');
 assert.ok(events.findIndex(e=>e.kind==='first-kiss')>0);
 assert.equal(collectLinecraftStepEvents(start,end,card,['boost']).filter(e=>e.kind==='boost').length,0);
 assert.equal(collectLinecraftStepEvents(end,start,card).filter(e=>e.kind==='boost').length,0);
 const original={x:COURTYARD_SKIP_PAD.x,y:2,z:84};
 assert.deepEqual(collectLinecraftStepEvents(original,{...original,y:0},card).map(e=>e.kind),collectLineStepEvents(original,{...original,y:0},card,[],[],false).map(e=>e.kind));
});

test('both timber faces are physical, Linecraft-only, and retain the established restitution',()=>{
 const h=diverterHarness(hv,'A',true,card,{scoreLab:true,linecraft:true});
 try{
  for(const id of ['timber-receiver','linecraft-cross-face']){
   const wall=h.scene.getMeshByName(id);assert.ok(wall?.physicsBody,id);
   assert.equal(wall.physicsBody.shape.material.restitution,.86);
   assert.equal(wall.physicsBody.shape.material.friction,.18);
   assert.equal(wall.metadata.lineFeature.kind,'receiver');
  }
  assert.equal(h.scene.meshes.filter(m=>m.name.startsWith('courtyard-delivery-pad')).length,2);
  assert.equal(h.scene.getMeshByName('delivery-sky-token'),null);
  assert.equal(TIMBER_RECEIVER.x,45);assert.equal(LINECRAFT_CROSS_FACE.x,-11);
 }finally{h.dispose();}
 const baseline=diverterHarness(hv,'A',true,card,{scoreLab:true});
 try{assert.equal(baseline.scene.getMeshByName('timber-receiver'),null);assert.equal(baseline.scene.getMeshByName('linecraft-cross-face'),null);assert.equal(baseline.scene.meshes.filter(m=>m.name.startsWith('courtyard-delivery-pad')).length,1);}finally{baseline.dispose();}
});

test('a real side-pad descent launches once, while the original pad remains usable',()=>{
 const h=diverterHarness(hv,'A',true,card,{scoreLab:true,linecraft:true});
 try{
  for(const x of [LINECRAFT_SECOND_PAD.x,COURTYARD_SKIP_PAD.x]){
   const result=h.shoot(shot(1,0,25,.7),{launch:{position:[x,10,84],velocity:[0,-8,0]}});
   assert.equal(result.ledger.filter(e=>e.kind==='pad-activation').length,1,`pad at x=${x}`);
   assert.equal(result.ledger.find(e=>e.kind==='pad-activation').surface,'skip-pad');
   assert.ok(result.ledger.some(e=>e.kind==='termination'));
  }
 }finally{h.dispose();}
});

test('both return faces can be struck and produce qualified departures',()=>{
 const h=diverterHarness(hv,'A',true,card,{scoreLab:true,linecraft:true});
 try{
  for(const [id,setup,options] of [
   ['linecraft-cross-face',shot(1,0,25,.7),{launch:{position:[-24,5,120],velocity:[25,0,0]}}],
   ['timber-receiver',shot(0,17.5,20,1),{}],
  ]){
   const result=h.shoot(setup,options);
   assert.ok(result.ledger.some(e=>e.kind==='contact'&&e.body===id),id+' physical contact');
   assert.ok(result.ledger.some(e=>e.kind==='redirect'&&e.feature===id),id+' qualified redirect');
  }
 }finally{h.dispose();}
});

test('bank, full tread and Open fixtures remain reachable with new Linecraft geometry',()=>{
 const fixtures=[
  ['banks','gate',shot(0,-1,25,.93)],
  ['treads','lumber',shot(1,0,30,(22+21*.05-6)/37)],
  [null,'gate',shot(1,0,42,.93)],
 ];
 for(const [lesson,station,setup] of fixtures){
  const h=diverterHarness(hv,'A',true,selectOpenLineStation(station),{scoreLab:true,linecraft:true});
  try{const result=h.shoot(setup);if(lesson)assert.equal(matchLinecraftSentence(lesson,result.ledger).complete,true,lesson);else assert.ok(result.ledger.some(e=>e.kind==='termination'));
   h.action('retry');assert.deepEqual(h.shoot(setup).ledger,result.ledger,station+' exact retry');
  }finally{h.dispose();}
 }
});
