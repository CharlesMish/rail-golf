import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,FreeCamera,Camera,Vector3,Matrix,Viewport,PhysicsMotionType,Ray} from '@babylonjs/core';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
import {RANGE_CAMERA,RANGE_SOLIDS,RANGE_DEFAULT,RANGE_SWITCH,rangeEnd} from '../lib/mechanism-range.js';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
// Physical feasibility fixtures, not a route/stamp vocabulary or player walkthrough.
const refs={switch:{railIndex:1,yaw:33,elevation:12,charge:.65},table:{railIndex:1,yaw:9,elevation:20,charge:.6},cross:{railIndex:1,yaw:-18,elevation:22,charge:.55},rack:{railIndex:1,yaw:23,elevation:40,charge:.8}};
const features=r=>r.evidence.filter(e=>e.kind==='redirect').map(e=>e.feature);

test('mechanism blockout uses real static faces, one switch/table, and no target',()=>{
 const h=mechanismHarness(hv);try{
  assert.equal(h.world.features.size,6);assert.deepEqual(new Set(RANGE_SOLIDS.map(s=>s.zone)),new Set(['bench','rack']));
  assert.equal(h.world.mechanism.targetBody,null);
  for(const mesh of h.world.features.values())assert.equal(mesh.physicsBody.getMotionType(),PhysicsMotionType.STATIC);
  assert.equal(h.world.mechanism.floorBody.getMotionType(),PhysicsMotionType.STATIC);
  assert.equal(h.scene.meshes.filter(m=>m.name==='mr-transfer-switch').length,1);
 }finally{h.dispose();}
});
test('near bench, table in either state, and tall return have real qualified departures',()=>{
 const h=mechanismHarness(hv);try{
  assert.ok(features(h.shoot(RANGE_DEFAULT)).includes('split-bench'));
  assert.ok(features(h.shoot(refs.rack)).includes('return-wall'));
  for(const state of ['A','B'])for(const railIndex of [0,1,2]){
   h.world.mechanism.setState(state);let hits=0;
   for(const yaw of [7,9,11])for(const charge of [.55,.58,.6,.62])if(features(h.shoot({...refs.table,railIndex,yaw,charge})).includes('transfer-table'))hits++;
   assert.ok(hits>=5,`${state} rail ${railIndex}: ${hits} of 12 nearby setups`);
  }
 }finally{h.dispose();}
});
test('real projectile switch contacts toggle A↔B once per shot and use a different static transform',()=>{
 const h=mechanismHarness(hv);try{
  const original=h.world.mechanism.floorBody;
  const a=h.shoot(refs.switch);assert.equal(a.endEnvironment.floor,'B');assert.ok(a.contacts.some(c=>c.body==='mr-transfer-switch'));
  assert.equal(a.evidence.filter(e=>e.kind==='switch').length,1);assert.notEqual(h.world.mechanism.floorBody,original);
  const b=h.shoot(refs.switch);assert.equal(b.endEnvironment.floor,'A');assert.equal(b.evidence.filter(e=>e.kind==='switch').length,1);
  assert.equal(h.world.mechanism.contact({},new Vector3(19,3,29),1000),null);
  assert.equal(h.world.mechanism.contact(h.world.mechanism.switchBody,null,1000),null);
 }finally{h.dispose();}
});
test('table B visibly and physically rises; identical shot generates a different unassisted arc',()=>{
 const h=mechanismHarness(hv);try{
  const nearA=h.world.tableTop(0,-10),farA=h.world.tableTop(0,10),a=h.shoot(refs.table);
  h.world.mechanism.setState('B');const nearB=h.world.tableTop(0,-10),farB=h.world.tableTop(0,10),b=h.shoot(refs.table);
  assert.ok(Math.abs(nearB.y-nearA.y)<.001);assert.ok(farB.y-farA.y>7);
  assert.ok(features(a).includes('transfer-table'));assert.ok(features(b).includes('transfer-table'));
  assert.ok(Math.abs(a.position[2]-b.position[2])>10);
  h.world.mechanism.setState('A');const repeat=h.shoot(refs.table);assert.ok(Vector3.Distance(Vector3.FromArray(a.position),Vector3.FromArray(repeat.position))<.02);
 }finally{h.dispose();}
});
test('cross-zone relationships exist without targets or destination impulses',()=>{
 const h=mechanismHarness(hv);try{
  assert.deepEqual(features(h.shoot(refs.cross)),['split-bench','transfer-table']);
  const a=h.shoot({...refs.table,charge:.62});assert.deepEqual(features(a),['transfer-table','rack-low']);
  h.world.mechanism.setState('B');const b=h.shoot({...refs.table,charge:.65});assert.deepEqual(features(b),['transfer-table','rack-middle']);
  assert.equal(a.reason,'first-ground-contact');assert.equal(b.reason,'first-ground-contact');
 }finally{h.dispose();}
});
test('browser Scene physics-observable stepping matches the fixed-step Havok fixture',()=>{
 const manual=mechanismHarness(hv),browser=mechanismHarness(hv);try{
  const expected=manual.shoot(refs.cross);
  browser.scene.onBeforePhysicsObservable.add(()=>browser.session.beforeStep());
  browser.scene.onAfterPhysicsObservable.add(()=>browser.session.afterStep());
  browser.session.fire(refs.cross);
  for(let i=0;i<7300&&!browser.session.flight.ended;i++)browser.scene._advancePhysicsEngineStep(1000/120);
  const actual=browser.session.last;assert.equal(actual.reason,expected.reason);assert.deepEqual(features(actual),features(expected));
  assert.ok(Vector3.Distance(Vector3.FromArray(actual.position),Vector3.FromArray(expected.position))<.02);
 }finally{manual.dispose();browser.dispose();}
});
test('interrupt/retry preserves state; reset restores A; recall restores launch setup and starting state',()=>{
 const h=mechanismHarness(hv);try{
  h.shoot(refs.switch);assert.equal(h.world.mechanism.state,'B');h.session.action('retry');assert.equal(h.world.mechanism.state,'B');
  assert.equal(h.session.fire(refs.table),true);assert.equal(h.session.fire(refs.table),false);
  for(let i=0;i<20;i++)h.step();h.session.action('retry');assert.equal(h.session.last.reason,'interrupted');assert.equal(h.world.mechanism.state,'B');
  const before=h.session.last;h.session.action('reset');assert.equal(h.world.mechanism.state,'A');
  assert.deepEqual(h.session.action('recall'),before.setup);assert.equal(h.world.mechanism.state,'B');
  const r=h.shoot(refs.table),position=[...r.position];for(let i=0;i<30;i++)h.step();assert.deepEqual(h.session.flight.mesh.position.asArray(),position);
 }finally{h.dispose();}
});
test('launch/first ground/long-flight safety remain separate, with bounded non-scoring evidence',()=>{
 const h=mechanismHarness(hv);try{
  assert.equal(h.session.fire({...refs.table,charge:NaN}),false);
  const r=h.shoot({railIndex:1,yaw:0,elevation:85,charge:.5});assert.equal(r.reason,'first-ground-contact');
  assert.deepEqual(features(r),[]);assert.ok(r.contacts.length<=500);assert.ok(r.evidence.length<=500);assert.equal('score' in r,false);
  assert.equal(rangeEnd({x:0,y:40,z:30},{x:1,y:-10,z:3},13,null),null);
  assert.equal(rangeEnd({x:0,y:40,z:30},{x:1,y:-10,z:3},60,null),'safety-timeout');
  assert.equal(rangeEnd({x:56,y:40,z:30},{x:1,y:-10,z:3},4,null),'out-of-bounds');
 }finally{h.dispose();}
});
test('address camera projects distinct bench, actuator, table and rack within desktop/mobile frames',()=>{
 for(const [w,h] of [[1440,900],[844,390],[390,844]]){
  const engine=new NullEngine({renderWidth:w,renderHeight:h,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
  try{
   const camera=new FreeCamera('view',Vector3.FromArray(RANGE_CAMERA.address),scene);camera.setTarget(Vector3.FromArray(RANGE_CAMERA.look));camera.fov=w/h<1.3?1.25:RANGE_CAMERA.fov;camera.fovMode=w/h<1.3?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;scene.activeCamera=camera;
   camera.getViewMatrix(true);camera.getProjectionMatrix(true);scene.updateTransformMatrix(true);
   for(const p of [new Vector3(-14,4,26),new Vector3(RANGE_SWITCH.x,RANGE_SWITCH.y,RANGE_SWITCH.z),new Vector3(7,1.8,44),new Vector3(27,12,65)]){
    const q=Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),new Viewport(0,0,w,h));assert.ok(q.x>w*.08&&q.x<w*.92,`${w}: x ${q.x}`);assert.ok(q.y>h*.23&&q.y<h*.64,`${h}: y ${q.y}`);
   }
  }finally{scene.dispose();engine.dispose();}
 }
 const harness=mechanismHarness(hv);try{
  // Real mesh ray check, not a claim of rendered visual QA.
  for(const target of [harness.world.mechanism.switchBody.transformNode,harness.world.mechanism.floor]){
   const from=Vector3.FromArray(RANGE_CAMERA.address),point=target===harness.world.mechanism.floor?harness.world.tableTop():target.position;
   for(const mesh of harness.scene.meshes)mesh.computeWorldMatrix(true);
   const ray=new Ray(from,point.subtract(from).normalize(),Vector3.Distance(from,point)+1);
   const hit=harness.scene.pickWithRay(ray,m=>Boolean(m.physicsBody));assert.equal(hit?.pickedMesh,target);
  }
 }finally{harness.dispose();}
});
test('new route has no score/progression/archive writes and does not reuse courtyard scene',async()=>{
 const scene=await readFile(new URL('../lib/mechanism-range-scene.js',import.meta.url),'utf8'),session=await readFile(new URL('../lib/mechanism-range-session.js',import.meta.url),'utf8'),ui=await readFile(new URL('../app/lab/mechanism-range/range.tsx',import.meta.url),'utf8');
 for(const source of [scene,session,ui])assert.doesNotMatch(source,/scoreLine\(|localStorage|indexedDB|buildCourtyard\(|COURTYARD_HOLES|createSurveyLedger/);
 assert.equal((session.match(/\.applyImpulse\(/g)||[]).length,1,'only the initial launch uses an impulse');
 assert.match(ui,/chargeFromHold/);assert.match(ui,/Recall last setup \+ state/);
});
