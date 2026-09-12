import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import {Vector3,FreeCamera,Matrix} from '@babylonjs/core';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {DIVERTER_HOLE,DIVERTER_HOLES,DIVERTER_SWITCH,DIVERTER_FLOOR,floorForAction} from '../lib/diverter-lab.js';
import {packLine,collectLine,normalizeShotLibrary,lineFamily} from '../lib/shot-library.js';
import {buildIdentity} from '../build/build-identity.js';
const hv=await HavokPhysics({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});

// Mode B authority only. Do not include these setups in the blind playtest handoff.
export const LAB_REFERENCE_SHOTS=Object.freeze({
 direct:{railIndex:1,yaw:0,elevation:42,charge:.62},
 floorA:{railIndex:1,yaw:0,elevation:20,charge:.55},
 floorB:{railIndex:1,yaw:0,elevation:20,charge:.53},
 switch:{railIndex:1,yaw:35,elevation:12,charge:.45},
});

test('both passive floor states have ordinary clears and broad real-bounce neighborhoods on all rails',async t=>{
 for(const state of ['A','B']){
  const h=diverterHarness(hv,state);
  try{
   for(const railIndex of [0,1,2])for(const yaw of [-1,0,1])for(const charge of state==='A'?[.54,.55,.56]:[.51,.53,.55]){
    await t.test('floor '+state+' rail '+railIndex+' yaw '+yaw+' charge '+charge,()=>{
     const r=h.shoot({railIndex,yaw,elevation:20,charge});
     assert.equal(r.outcome,'ace',JSON.stringify(r));assert.deepEqual(r.tags,['floor-'+state.toLowerCase()]);
     assert.equal(r.contacts[0].body,'diverter-bounce-floor');
     assert.equal(r.start,state);assert.equal(r.end,state);
    });
   }
   for(const railIndex of [0,1,2])for(const charge of [.6,.62,.64]){
    const r=h.shoot({...LAB_REFERENCE_SHOTS.direct,railIndex,charge});
    assert.equal(r.outcome,'ace');assert.deepEqual(r.tags,[]);
   }
  }finally{h.dispose();}
 }
});

test('same setup has a materially different physical rebound in A and B, without a target-directed impulse',()=>{
 const h=diverterHarness(hv);
 try{
  const a=h.shoot(LAB_REFERENCE_SHOTS.floorA);
  const oldBody=h.world.floorBody;
  h.world.setState('B');
  assert.notEqual(h.world.floorBody,oldBody);
  const b=h.shoot(LAB_REFERENCE_SHOTS.floorA);
  assert.equal(a.outcome,'ace');assert.equal(b.outcome,'ace');
  assert.ok(Math.abs(a.point[2]-b.point[2])>4);
  const near=Vector3.TransformCoordinates(new Vector3(0,.4,-8),h.world.floor.computeWorldMatrix(true));
  const far=Vector3.TransformCoordinates(new Vector3(0,.4,8),h.world.floor.computeWorldMatrix(true));
  assert.ok(far.y-near.y>3, 'state B raises the far edge of the real floor');
 }finally{h.dispose();}
});

test('real switch hits change once per shot in both directions; retry preserves and reset restores the actual body',()=>{
 const h=diverterHarness(hv);
 try{
  const first=h.shoot(LAB_REFERENCE_SHOTS.switch,{stopOnSwitch:true});
  assert.deepEqual(first.tags,['switch-b']);assert.equal(first.contacts[0].body,'diverter-switch');
  assert.equal(h.world.state,'B');
  h.action('retry');assert.equal(h.world.state,'B');
  const afterRetry=h.shoot(LAB_REFERENCE_SHOTS.floorB);assert.equal(afterRetry.outcome,'ace');assert.deepEqual(afterRetry.tags,['floor-b']);
  const second=h.shoot(LAB_REFERENCE_SHOTS.switch,{stopOnSwitch:true});
  assert.deepEqual(second.tags,['switch-a']);assert.equal(h.world.state,'A');
  const repeat=h.shoot(LAB_REFERENCE_SHOTS.switch);assert.deepEqual(repeat.tags,['switch-b']);assert.equal(h.world.state,'B');
  h.action('reset');assert.equal(h.world.state,'A');assert.equal(h.world.floor.rotation.x,0);
  assert.equal(h.shoot(LAB_REFERENCE_SHOTS.floorA).outcome,'ace');
  // A foreign body and a null point cannot impersonate switch contact.
  assert.equal(h.world.contact({},new Vector3(12,3.5,16),500),null);
  assert.equal(h.world.contact(h.world.switchBody,null,500),null);
 }finally{h.dispose();}
 const fresh=diverterHarness(hv);assert.equal(fresh.world.state,'A');fresh.dispose();
});

test('contact state, saved evidence and recall reproduce a line across a reset and storage round trip',()=>{
 const h=diverterHarness(hv,'B');
 try{
  const shot=LAB_REFERENCE_SHOTS.floorB,r=h.shoot(shot);
  const line={...shot,holeId:DIVERTER_HOLE.id,stationId:'gate',windId:DIVERTER_HOLE.wind.id,projectileId:1,outcome:r.outcome,
   environment:{floor:r.start},environmentAfter:{floor:r.end},receipt:'Recorded physical line',
   points:[{x:0,y:1.55,z:0},{x:r.point[0],y:r.point[1],z:r.point[2]}],
   contacts:r.contacts.map((c,i)=>({id:String(i),kind:c.kind,point:{x:c.point.x,y:c.point.y,z:c.point.z}}))};
  const packed=packLine(line);
  const loaded=normalizeShotLibrary(JSON.parse(JSON.stringify({version:1,holes:{[DIVERTER_HOLE.id]:{recent:[packed],wins:[packed]}}})),DIVERTER_HOLES)[DIVERTER_HOLE.id].wins[0];
  h.action('reset');h.action('recall',loaded.environment);
  assert.equal(h.world.state,'B');const replay=h.shoot(loaded);
  assert.equal(replay.outcome,'ace');assert.ok(Math.abs(replay.point[2]-r.point[2])<.05);
  const other={...line,projectileId:2,environment:{floor:'A'},environmentAfter:{floor:'A'}};
  assert.notEqual(lineFamily(line),lineFamily(other));
  assert.equal(collectLine(collectLine(undefined,line),other).wins.length,2);
  for(const bad of [{environment:undefined},{environment:{floor:'C'}},{environmentAfter:undefined}]){
   const data={version:1,holes:{[DIVERTER_HOLE.id]:{recent:[{...packed,...bad}],wins:[]}}};
   assert.deepEqual(normalizeShotLibrary(data,DIVERTER_HOLES)[DIVERTER_HOLE.id].recent,[]);
  }
  assert.throws(()=>floorForAction('A','recall',{}));
 }finally{h.dispose();}
});

test('default lab switch, floor and destination are inside the landscape address viewport',()=>{
 const h=diverterHarness(hv);
 try{
  const scene=h.world.floor.getScene(),camera=new FreeCamera('address',new Vector3(0,7.8,-15),scene);
  camera.fov=.69;camera.minZ=.1;camera.maxZ=280;camera.setTarget(new Vector3(0,3.6,34));
  const engine=scene.getEngine();engine.setSize(844,390);
  camera.getViewMatrix(true);camera.getProjectionMatrix(true);
  for(const p of [new Vector3(DIVERTER_SWITCH.x,7,DIVERTER_SWITCH.z),new Vector3(DIVERTER_FLOOR.x,6,DIVERTER_FLOOR.z),new Vector3(0,9.8,78)]){
   const screen=Vector3.Project(p,Matrix.Identity(),camera.getTransformationMatrix(),camera.viewport.toGlobal(844,390));
   assert.ok(screen.z>0&&screen.z<1&&screen.x>220&&screen.x<810&&screen.y>95&&screen.y<263,screen.toString());
  }
 }finally{h.dispose();}
});

test('build identity prefers deployed SHA; local edits and missing provenance are labelled honestly',()=>{
 const sha='a'.repeat(40);
 assert.equal(buildIdentity({WORKERS_CI_COMMIT_SHA:sha},()=>{throw Error('not needed');}),'aaaaaaaaaa');
 assert.equal(buildIdentity({},(...args)=>args[0]==='rev-parse'?sha:''),'aaaaaaaaaa');
 assert.equal(buildIdentity({},(...args)=>args[0]==='rev-parse'?sha:' M app/page.tsx'),'aaaaaaaaaa-dirty');
 assert.equal(buildIdentity({WORKERS_CI_COMMIT_SHA:'invalid'},()=>{throw Error('no git');}),'unknown');
});



test('interrupted switch shots keep starting and ending states distinct through recall',()=>{
 const h=diverterHarness(hv);
 try{
  for(const yaw of [34,35,36])for(const elevation of [10,12,14])for(const charge of [.4,.45,.5]){
   h.action('reset');
   const r=h.shoot({...LAB_REFERENCE_SHOTS.switch,yaw,elevation,charge},{stopOnSwitch:true});
   assert.equal(r.start,'A');assert.equal(r.end,'B',JSON.stringify({yaw,elevation,charge,r}));assert.deepEqual(r.tags,['switch-b']);
  }
  h.action('reset');const r=h.shoot(LAB_REFERENCE_SHOTS.switch,{stopOnSwitch:true});
  const packed=packLine({...LAB_REFERENCE_SHOTS.switch,holeId:DIVERTER_HOLE.id,stationId:'gate',windId:DIVERTER_HOLE.wind.id,
   projectileId:50,outcome:null,receipt:'Interrupted',environment:{floor:r.start},environmentAfter:{floor:r.end},points:[],
   contacts:r.contacts.map((c,i)=>({id:String(i),kind:c.kind,point:c.point}))});
  const saved=normalizeShotLibrary({version:1,holes:{[DIVERTER_HOLE.id]:{recent:[packed],wins:[packed]}}},DIVERTER_HOLES)[DIVERTER_HOLE.id];
  assert.equal(saved.recent[0].environment.floor,'A');assert.equal(saved.recent[0].environmentAfter.floor,'B');
  assert.equal(saved.wins.length,0);
  h.action('recall',saved.recent[0].environment);assert.equal(h.world.state,'A');
  assert.equal(h.shoot(saved.recent[0],{stopOnSwitch:true}).end,'B');
 }finally{h.dispose();}
});
