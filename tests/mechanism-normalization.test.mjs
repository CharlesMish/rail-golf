import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {Vector3,NullEngine,Scene,FreeCamera,PhysicsBody} from '@babylonjs/core';
import {createRangeView,rangeViewLabel,stepRangeView,rangeRail,rangeDrag,rangeSetup,rangeRestore,RANGE_BLIND_BRIEF,transferFeedback} from '../lib/mechanism-range-controls.js';
import {buildRangeProjectile,buildRangeLauncher,buildRangePresentationMaterials} from '../lib/mechanism-range-presentation.js';
import {RAIL_RULES,chargeFromHold,chargeToSpeed,clampYaw,clampElevation,shiftRail} from '../lib/rail-golf-v02.js';
import {launchCharge} from '../lib/shot-tools.js';
import {RANGE_DEFAULT,RANGE_CAMERA} from '../lib/mechanism-range.js';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const shadows={addShadowCaster(){},removeShadowCaster(){}};

for(const phase of ['ready','result'])test(`${phase.toUpperCase()} Survey/Return repeatedly converges to the named camera frame`,()=>{
 const engine=new NullEngine(),scene=new Scene(engine),camera=new FreeCamera('test',Vector3.FromArray(RANGE_CAMERA.address),scene),target=Vector3.FromArray(RANGE_CAMERA.look),view=createRangeView();
 try{
  if(phase==='result'){view.set('impact');camera.position.set(30,15,80);target.set(25,3,86);}
  for(let cycle=0;cycle<8;cycle++){
   assert.equal(view.toggle(phase),true);assert.equal(rangeViewLabel(view.getSnapshot()),'Return to launch view');
   for(let i=0;i<180;i++)assert.equal(stepRangeView(camera,target,view.getSnapshot(),0,1/60,.86),true);
   assert.ok(Vector3.Distance(camera.position,Vector3.FromArray(RANGE_CAMERA.survey))<.002);
   assert.equal(view.toggle(phase),true);assert.equal(rangeViewLabel(view.getSnapshot()),'Survey the space');
   for(let i=0;i<180;i++)stepRangeView(camera,target,view.getSnapshot(),0,1/60,.86);
   assert.ok(Vector3.Distance(camera.position,Vector3.FromArray(RANGE_CAMERA.address))<.002);
   assert.ok(Vector3.Distance(target,Vector3.FromArray(RANGE_CAMERA.look))<.002);
  }
  for(const disabled of ['loading','charging','flight','error'])assert.equal(view.toggle(disabled),false);
 }finally{scene.dispose();engine.dispose();}
});
test('Survey then Retry/Reset/Recall restores launch mode with the correct setup and environment',()=>{
 const h=mechanismHarness(hv),view=createRangeView();try{
  h.world.mechanism.setState('B');const saved=h.shoot({railIndex:0,yaw:9,elevation:20,charge:.6});
  for(const action of ['retry','reset','recall']){
   view.toggle('result');assert.equal(view.getSnapshot(),'survey');
   const restored=h.session.action(action),next=rangeRestore(action,{...RANGE_DEFAULT,yaw:40},restored,'hold',true);view.set('launch');
   assert.equal(rangeViewLabel(view.getSnapshot()),'Survey the space');
   assert.equal(h.world.mechanism.state,action==='reset'?'A':'B');
   assert.equal(next.setup.yaw,action==='reset'?RANGE_DEFAULT.yaw:saved.setup.yaw);
   assert.equal(next.max,action!=='recall');assert.equal(next.mode,action==='recall'?'set':'hold');
  }
 }finally{h.dispose();}
});
test('rail, fine aim, drag and power adapt incumbent authority without dropping aim',()=>{
 const start={railIndex:1,yaw:23.6,elevation:21.2,charge:.655};
 for(const direction of [-1,1,-10,10]){const next=rangeRail(start,direction);assert.equal(next.railIndex,shiftRail(start.railIndex,direction));assert.equal(next.yaw,start.yaw);assert.equal(next.elevation,start.elevation);assert.equal(next.charge,start.charge);}
 for(const [pointer,sensitivity] of [['mouse',.075],['touch',.11]]){
  const next=rangeDrag(start,40,-20,pointer);assert.equal(next.yaw,clampYaw(start.yaw+40*sensitivity));assert.equal(next.elevation,clampElevation(start.elevation+20*sensitivity));
 }
 assert.equal(rangeSetup(start,{yaw:900}).yaw,RAIL_RULES.maxYaw);assert.equal(rangeSetup(start,{elevation:-900}).elevation,RAIL_RULES.minElevation);
 for(const ms of [0,20,500,1200,2000,2700,3000,4500])assert.equal(launchCharge('hold',.1,ms),chargeFromHold(ms));
 assert.equal(launchCharge('hold',.1,0,true),1);assert.equal(launchCharge('set',.655,0,false),.655);
 const recall=rangeRestore('recall',start,start,'hold',true);assert.equal(launchCharge(recall.mode,recall.setup.charge,0,recall.max),.655);
});
test('range launch limits, mass/radius and launch speeds remain the incumbent values',()=>{
 const h=mechanismHarness(hv),applyImpulse=PhysicsBody.prototype.applyImpulse;let applied;
 PhysicsBody.prototype.applyImpulse=function(impulse,point){applied=impulse.clone();return applyImpulse.call(this,impulse,point);};try{
  for(const setup of [{...RANGE_DEFAULT,yaw:RAIL_RULES.minYaw,elevation:RAIL_RULES.minElevation},{...RANGE_DEFAULT,yaw:RAIL_RULES.maxYaw,elevation:RAIL_RULES.maxElevation}]){
   assert.equal(h.session.fire(setup),true);assert.ok(Math.abs(applied.length()/RAIL_RULES.projectileMass-chargeToSpeed(setup.charge))<.000001);
   assert.equal(h.session.flight.aggregate.body.getMassProperties().mass,RAIL_RULES.projectileMass);
   assert.ok(Math.abs(h.session.flight.mesh.getBoundingInfo().boundingBox.extendSize.x-RAIL_RULES.projectileRadius)<.00001);h.session.action('retry');
  }
  for(const patch of [{yaw:RAIL_RULES.maxYaw+.01},{elevation:RAIL_RULES.minElevation-.01},{railIndex:RAIL_RULES.railPositions.length}])assert.equal(h.session.fire({...RANGE_DEFAULT,...patch}),false);
 }finally{PhysicsBody.prototype.applyImpulse=applyImpulse;h.dispose();}
});
test('rail-round/ball swap never adds a collider, changes velocity or moves the hidden body',()=>{
 const h=mechanismHarness(hv);try{
  h.session.fire(RANGE_DEFAULT);const body=h.session.flight.mesh,physical=h.session.flight.aggregate.body;
  const velocity=physical.getLinearVelocity().asArray(),position=body.position.asArray(),count=h.scene.getPhysicsEngine().getBodies().length;
  const materials=buildRangePresentationMaterials(h.scene),visual=buildRangeProjectile(h.scene,body,materials,shadows);
  assert.equal(body.isVisible,false);assert.equal(visual.round.isEnabled(),true);assert.equal(visual.ball.isEnabled(),false);
  for(let i=0;i<100;i++){visual.select(i%2?'round':'ball');visual.sync(physical.getLinearVelocity());}
  assert.equal(h.scene.getPhysicsEngine().getBodies().length,count);assert.deepEqual(physical.getLinearVelocity().asArray(),velocity);assert.deepEqual(body.position.asArray(),position);
  assert.ok(visual.root.getChildMeshes().every(mesh=>!mesh.physicsBody));
  visual.dispose();assert.ok(body.physicsBody);assert.deepEqual(physical.getLinearVelocity().asArray(),velocity);
 }finally{h.dispose();}
});
test('both projectile visuals preserve switch hits and identical A/B table fixtures step for step',()=>{
 for(const state of ['A','B'])for(const shot of [{railIndex:1,yaw:33,elevation:12,charge:.65},{railIndex:1,yaw:9,elevation:20,charge:.6}]){
  const runs=[];
  for(const mode of ['physics-only','round','ball','alternating']){
   const h=mechanismHarness(hv);try{
    h.world.mechanism.setState(state);h.session.fire(shot);const materials=buildRangePresentationMaterials(h.scene);
    const visual=mode==='physics-only'?null:buildRangeProjectile(h.scene,h.session.flight.mesh,materials,shadows,mode==='ball'?'ball':'round');
    const samples=[];
    for(let i=0;i<7300&&!h.session.flight.ended;i++){if(mode==='alternating')visual.select(i%2?'round':'ball');visual?.sync(h.session.flight.aggregate.body.getLinearVelocity());h.step();if(i%12===0)samples.push(h.session.flight.mesh.position.asArray());}
    runs.push({samples,last:h.session.last});visual?.dispose();
   }finally{h.dispose();}
  }
  for(const run of runs.slice(1))assert.deepEqual(run,runs[0]);
  if(shot.yaw===33)assert.equal(runs[0].last.endEnvironment.floor,state==='A'?'B':'A');
  else assert.ok(runs[0].last.evidence.some(e=>e.kind==='redirect'&&e.feature==='transfer-table'));
 }
});
test('incumbent launcher silhouette and projectile dimensions remain presentation-only',()=>{
 const engine=new NullEngine(),scene=new Scene(engine);try{
  const {launcher,loft}=buildRangeLauncher(scene,buildRangePresentationMaterials(scene),shadows);
  const mesh=name=>scene.getMeshByName(name);assert.equal(launcher.position.z,0);assert.equal(loft.parent.position.y,1.55);
  assert.equal(mesh('mr-muzzle').position.z,RAIL_RULES.muzzleLength);assert.equal(mesh('mr-trim').position.y,1.49);assert.equal(mesh('mr-coil').position.z,2.42);
  assert.ok(Math.abs(mesh('mr-barrel').getBoundingInfo().boundingBox.extendSize.z-2.85)<.000001);
  assert.ok(scene.meshes.every(m=>!m.physicsBody));
 }finally{scene.dispose();engine.dispose();}
});
test('blind brief and initial state contain no mechanism instructions; actual switch enables clear feedback',async()=>{
 assert.equal(RANGE_BLIND_BRIEF,'Explore the range. No target or score. First ground contact ends the line.');
 assert.equal(transferFeedback(false,'A'),null);assert.equal(transferFeedback(false,'B'),null);
 assert.equal(transferFeedback(true,'B'),'TRANSFER B · RAISED');assert.equal(transferFeedback(true,'A'),'TRANSFER A · LEVEL');
 const ui=await readFile(new URL('../app/lab/mechanism-range/range.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/Shoot the control|one shared machine|Reset · A|surveyRef|phaseRef.current!==['"]result['"]\|\|/);
 assert.match(ui,/if\(event.kind==='switch'\)setDiscovered\(true\)/);assert.equal((ui.match(/setDiscovered\(true\)/g)||[]).length,1);
 assert.match(ui,/rangeViewLabel\(viewMode\)/);assert.match(ui,/advanceRangeCamera\(camera,target,cameraFrame\(\),dt\)/);
 assert.match(ui,/useSyncExternalStore\(view.subscribe,view.getSnapshot,view.getServerSnapshot\)/);
 assert.match(ui,/\},\[view\]\)/,'presentation toggles do not restart the scene');
 assert.match(ui,/powerModeRef.current,setupRef.current.charge/);
});
