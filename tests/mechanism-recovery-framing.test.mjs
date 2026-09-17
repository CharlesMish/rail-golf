import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {Vector3,FreeCamera,Matrix,Viewport} from '@babylonjs/core';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
import {RANGE_DEFAULT,RANGE_STATION,RANGE_CAMERA} from '../lib/mechanism-range.js';
import {stationMuzzle,stationAim} from '../lib/stations.js';
import {rangeCameraFrame,placeRangeCamera,advanceRangeCamera} from '../lib/mechanism-range-framing.js';
import {recoverRangeToSetup} from '../lib/mechanism-range-recovery.js';
import {createRangeView,rangeViewLabel} from '../lib/mechanism-range-controls.js';
import {buildRangeProjectile,buildRangePresentationMaterials} from '../lib/mechanism-range-presentation.js';
import {launchCharge} from '../lib/shot-tools.js';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const frameNames=['familiar','range'];
function rig(){
 const h=mechanismHarness(hv),camera=new FreeCamera('recovery-camera',Vector3.Zero(),h.scene),target=Vector3.Zero(),view=createRangeView();
 const materials=buildRangePresentationMaterials(h.scene),shadows={addShadowCaster(){},removeShadowCaster(){}};let visual=null;
 let setup={...RANGE_DEFAULT},mode='hold',max=true,phase='ready',framing='familiar',held=true;
 h.scene.onBeforePhysicsObservable.add(()=>h.session.beforeStep());h.scene.onAfterPhysicsObservable.add(()=>h.session.afterStep());
 const step=()=>{h.scene._advancePhysicsEngineStep(1000/120);if(h.session.flight?.ended){phase='result';view.set('impact');}};
 return {h,camera,target,view,step,get setup(){return setup;},get phase(){return phase;},get max(){return max;},get held(){return held;},
  setFraming(next){framing=next;},
  shoot(shot){setup={...shot};assert.equal(h.session.fire(setup),true);phase='flight';view.set('flight');visual?.dispose();visual=buildRangeProjectile(h.scene,h.session.flight.mesh,materials,shadows);for(let i=0;i<7300&&!h.session.flight.ended;i++)step();return h.session.last;},
  recover(action){const order=[];assert.equal(recoverRangeToSetup(action,{session:h.session,current:setup,mode,max,view,
   cancelInput(){held=false;order.push('input');},clearPresentation(){visual?.dispose();visual=null;order.push('presentation');},publishSetup(next){setup=next.setup;mode=next.mode;max=next.max;order.push('setup');},
   placeCamera(){placeRangeCamera(camera,target,rangeCameraFrame(setup,framing,844,390));order.push('camera');},ready(){assert.equal(h.session.flight,null);phase='ready';order.push('ready');},
  }),true);assert.deepEqual(order,['input','presentation','setup','camera','ready']);},
  fireAfter(){assert.equal(phase,'ready');const expected=stationMuzzle(setup,RANGE_STATION);assert.equal(h.session.fire({...setup,charge:launchCharge(mode,setup.charge,0,max)}),true);assert.deepEqual(h.session.flight.mesh.position.asArray(),[expected.x,expected.y,expected.z]);step();assert.ok(h.session.flight.aggregate.body.getLinearVelocity().length()>5);},
  dispose(){visual?.dispose();h.dispose();},
 };
}

for(const framing of frameNames)for(const action of ['retry','reset'])test(`${framing}: real OOB and ground → ${action} → READY → actual launch, repeated without reload`,()=>{
 const r=rig();try{r.setFraming(framing);
  for(let cycle=0;cycle<6;cycle++)for(const [expected,shot] of [['out-of-bounds',{railIndex:1,yaw:70,elevation:20,charge:1}],['first-ground-contact',{...RANGE_DEFAULT}]]){
   r.h.session.action('retry');r.h.world.mechanism.setState('B');const record=r.shoot(shot);assert.equal(record.reason,expected);
   r.recover(action);assert.equal(r.phase,'ready');assert.equal(r.view.getSnapshot(),'launch');assert.equal(r.held,false);assert.equal(r.max,true);
   assert.equal(r.h.world.mechanism.state,action==='reset'?'A':'B');assert.equal(r.setup.yaw,action==='reset'?RANGE_DEFAULT.yaw:shot.yaw);
   const f=rangeCameraFrame(r.setup,framing,844,390);assert.deepEqual(r.camera.position.asArray(),f.position);assert.deepEqual(r.target.asArray(),f.target);r.fireAfter();
  }
 }finally{r.dispose();}
});
test('qualified Split Bench → Transfer Table → OOB retains events and recovers through both actions',()=>{
 const r=rig();try{for(const framing of frameNames)for(const action of ['retry','reset']){
  r.h.session.action('retry');r.setFraming(framing);r.h.world.mechanism.setState('B');
  const record=r.shoot({railIndex:0,yaw:-16,elevation:10,charge:1});
  assert.equal(record.reason,'out-of-bounds');assert.deepEqual(record.evidence.filter(e=>e.kind==='redirect').map(e=>e.feature),['split-bench','transfer-table']);
  r.recover(action);assert.equal(r.h.world.mechanism.state,action==='reset'?'A':'B');r.fireAfter();
 }}finally{r.dispose();}
});
for(const ending of ['safety-timeout','settled'])test(`${ending} uses the same complete recovery and can fire again`,()=>{
 const r=rig();try{
  for(const action of ['retry','reset']){r.h.session.action('retry');r.h.session.fire(RANGE_DEFAULT);
   // Controlled lifecycle edge fixture, not an invented natural winning trajectory.
   const f=r.h.session.flight;f.elapsed=ending==='safety-timeout'?60:6;f.slowSince=ending==='settled'?2:null;
   f.aggregate.body.setLinearVelocity(Vector3.Zero());for(let i=0;i<3&&!f.ended;i++)r.step();assert.equal(r.h.session.last.reason,ending);r.recover(action);r.fireAfter();
  }
 }finally{r.dispose();}
});
test('Recall restores the prior starting Transfer state and exact power, overriding MAX',()=>{
 const r=rig();try{r.h.world.mechanism.setState('B');const setup={railIndex:0,yaw:9,elevation:20,charge:.6};r.shoot(setup);r.recover('reset');assert.equal(r.h.world.mechanism.state,'A');r.recover('recall');assert.equal(r.h.world.mechanism.state,'B');assert.equal(r.max,false);assert.deepEqual(r.setup,setup);r.fireAfter();}finally{r.dispose();}
});
test('camera A/B is a presentation-only transform: muzzle, direction and complete Havok record are identical',()=>{
 for(const state of ['A','B']){
  const records=[];
  for(const framing of frameNames){const h=mechanismHarness(hv),camera=new FreeCamera('AB',Vector3.Zero(),h.scene),target=Vector3.Zero();try{
   h.world.mechanism.setState(state);const setup={railIndex:1,yaw:-18,elevation:22,charge:.55},snapshot=JSON.stringify(setup),muzzle=stationMuzzle(setup,RANGE_STATION),aim=stationAim(setup,RANGE_STATION);
   placeRangeCamera(camera,target,rangeCameraFrame(setup,framing,1440,900));h.session.fire(setup);
   for(let i=0;i<7300&&!h.session.flight.ended;i++){advanceRangeCamera(camera,target,rangeCameraFrame(setup,i%2?framing:frameNames[1-frameNames.indexOf(framing)],1440,900),1/60);h.step();}
   assert.equal(JSON.stringify(setup),snapshot);assert.deepEqual(stationMuzzle(setup,RANGE_STATION),muzzle);assert.deepEqual(stationAim(setup,RANGE_STATION),aim);records.push(h.session.last);
  }finally{h.dispose();}}
  assert.deepEqual(records[0],records[1]);
 }
});
test('familiar framing matches incumbent address math; RANGE preserves v0.2; both Survey round trips converge',()=>{
 const r=rig();try{
  for(const framing of frameNames)for(const phase of ['ready','result'])for(const railIndex of [0,1,2]){
   const setup={...RANGE_DEFAULT,railIndex};const f=rangeCameraFrame(setup,framing,1440,900);
   if(framing==='familiar'){const rail=stationMuzzle({...setup,elevation:0},RANGE_STATION).x-Math.sin(setup.yaw*Math.PI/180)*5.18;assert.ok(Math.abs(f.position[0]-(rail-Math.sin(setup.yaw*Math.PI/180)*15))<1e-10);assert.equal(f.position[1],7.8);assert.equal(f.target[1],3.6);assert.equal(f.fov,.69);}
   else{assert.equal(f.position[2],-21);assert.equal(f.position[1],10);assert.deepEqual(f.target,RANGE_CAMERA.look);assert.equal(f.fov,.86);}
   for(let cycle=0;cycle<3;cycle++){r.view.set(phase==='ready'?'launch':'impact');r.view.toggle(phase);assert.equal(rangeViewLabel(r.view.getSnapshot()),'Return to launch view');
    const survey=rangeCameraFrame(setup,framing,1440,900,'survey');for(let i=0;i<180;i++)advanceRangeCamera(r.camera,r.target,survey,1/60);assert.ok(Vector3.Distance(r.camera.position,Vector3.FromArray(RANGE_CAMERA.survey))<.002);
    r.view.toggle(phase);for(let i=0;i<180;i++)advanceRangeCamera(r.camera,r.target,f,1/60);assert.ok(Vector3.Distance(r.camera.position,Vector3.FromArray(f.position))<.002);assert.equal(rangeViewLabel(r.view.getSnapshot()),'Survey the space');
   }
  }
 }finally{r.dispose();}
});
test('familiar muzzle is centered and visible at the retained default aim across desktop/mobile',()=>{
 const r=rig();try{for(const [w,h] of [[1440,900],[844,390],[390,844]]){
  const f=rangeCameraFrame(RANGE_DEFAULT,'familiar',w,h);r.h.engine.setSize(w,h);placeRangeCamera(r.camera,r.target,f);r.camera.getViewMatrix(true);r.camera.getProjectionMatrix(true);
  const m=stationMuzzle(RANGE_DEFAULT,RANGE_STATION),p=Vector3.Project(new Vector3(m.x,m.y,m.z),Matrix.Identity(),r.camera.getTransformationMatrix(),new Viewport(0,0,w,h));
  assert.ok(Math.abs(p.x-w/2)<.01);assert.ok(p.y>h*.5&&p.y<h*.85);
 }}finally{r.dispose();}
});
test('result controls call the same recovery authority and framing changes cannot rewrite setup',async()=>{
 const ui=await readFile(new URL('../app/lab/mechanism-range/range.tsx',import.meta.url),'utf8');
 assert.match(ui,/recoverRangeToSetup\(action/);assert.match(ui,/aria-label="Continue playing"/);assert.match(ui,/Retry Shot/);assert.match(ui,/useState<RangeFraming>\('familiar'\)/);
 assert.match(ui,/framingRef.current=next;setFraming\(next\);/);assert.match(ui,/ready:\(\)=>\{phaseTo\('ready'\)/);assert.match(ui,/cancelInput:releaseInputs/);
});
