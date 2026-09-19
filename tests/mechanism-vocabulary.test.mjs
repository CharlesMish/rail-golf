import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {PhysicsMotionType,Vector3,NullEngine,Scene,FreeCamera,Matrix,Viewport,Camera} from '@babylonjs/core';
import {VOCABULARY_DEFAULT,WIND_VOLUME,VOCABULARY_ENVIRONMENT,PADDLE_HZ,paddleTick,paddleYaw,windAcceleration} from '../lib/mechanism-vocabulary.js';
import {MECHANISM_VOCABULARY} from '../lib/mechanism-vocabulary-experiment.js';
import {RAIL_RULES,chargeToSpeed} from '../lib/rail-golf-v02.js';
import {spatialLaunch,spatialCameraFrame} from '../lib/spatial-lab-session.js';
import {vocabularyHarness} from './helpers/mechanism-vocabulary-physics.mjs';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const paddleShot={railIndex:1,yaw:20,elevation:20,charge:.85};
const windShot={...VOCABULARY_DEFAULT,yaw:-16};
const redirects=record=>record.evidence.filter(e=>e.kind==='redirect');

test('wind is a deterministic bounded acceleration with a genuine OFF state',()=>{
 const center={x:-14,y:12,z:40};
 assert.deepEqual(windAcceleration(center,'OFF'),{x:0,y:0,z:0});
 assert.deepEqual(windAcceleration(center,'LEFT'),{x:-6,y:0,z:0});
 assert.deepEqual(windAcceleration(center,'RIGHT'),{x:6,y:0,z:0});
 for(const point of [{...center,x:WIND_VOLUME.minX-.01},{...center,x:WIND_VOLUME.maxX+.01},{...center,y:0},{...center,y:26},{...center,z:23},{...center,z:67}])assert.deepEqual(windAcceleration(point,'RIGHT'),{x:0,y:0,z:0});
});
test('same setup through the marked fan bay separates LEFT/OFF/RIGHT and repeats exactly',()=>{
 const h=vocabularyHarness(hv);try{
  const records={};for(const state of ['OFF','LEFT','RIGHT']){h.world.environment.restore({wind:state});records[state]=h.shoot(windShot);const again=h.shoot(windShot);assert.deepEqual(again,records[state]);}
  assert.ok(records.LEFT.position[0]<records.OFF.position[0]-4);assert.ok(records.RIGHT.position[0]>records.OFF.position[0]+4);
  assert.equal(records.LEFT.position[2],records.OFF.position[2]);assert.equal(records.RIGHT.position[2],records.OFF.position[2]);
  for(const state of ['LEFT','RIGHT'])assert.deepEqual(records[state].evidence.map(e=>e.kind),['wind-enter','wind-exit']);
  assert.equal(redirects(records.LEFT).length,0,'force exposure is not automatically a redirect claim');
 }finally{h.dispose();}
});
test('shots outside the volume are identical for every fan setting, including MAX',()=>{
 const h=vocabularyHarness(hv);try{
  const shot={railIndex:1,yaw:50,elevation:35,charge:1},results=[];
  for(const wind of ['OFF','LEFT','RIGHT']){h.world.environment.restore({wind});const r=h.shoot(shot);results.push({position:r.position,reason:r.reason,contacts:r.contacts,evidence:r.evidence});}
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
 }finally{h.dispose();}
});
test('wind state survives Retry and Recall restores launch state; Reset is visible LEFT/SYNC',()=>{
 const h=vocabularyHarness(hv);try{
  assert.throws(()=>h.world.environment.restore({wind:'random'}));
  h.world.environment.restore({wind:'LEFT'});const last=h.shoot(windShot);
  h.session.action('retry');assert.deepEqual(h.world.environment.snapshot(),{wind:'LEFT',paddleMode:'SYNC',paddleTick:'0'});
  h.session.action('reset');assert.deepEqual(h.world.environment.snapshot(),VOCABULARY_ENVIRONMENT);
  assert.deepEqual(h.session.action('recall'),last.setup);assert.deepEqual(h.world.environment.snapshot(),last.environment);
  assert.deepEqual(h.shoot(last.setup),last);
 }finally{h.dispose();}
});
test('paddle uses a moving Havok ANIMATED collider and its rendered body follows the target transform',()=>{
 const h=vocabularyHarness(hv);try{
  assert.equal(h.world.paddleBody.body.getMotionType(),PhysicsMotionType.ANIMATED);
  h.session.fire({railIndex:1,yaw:0,elevation:80,charge:1});for(let i=0;i<120;i++)h.step();
  const yaw=h.world.paddle.rotationQuaternion.toEulerAngles().y;
  assert.ok(Math.abs(yaw-paddleYaw(1))<.005);assert.ok(h.world.paddleBody.body.getAngularVelocity().length()>.1);
  h.session.action('retry');h.session.fire(paddleShot);assert.ok(h.world.paddle.rotationQuaternion.toEulerAngles().length()<1e-8,'fresh attempt starts at phase zero');
 }finally{h.dispose();}
});
test('moving paddle contact is stable and repeatable across twelve useful launch approaches, without tunnelling',()=>{
 const h=vocabularyHarness(hv);try{
  for(const [charge,elevation]of [[.65,25],[.75,25],[.85,20],[1,15]])for(const yaw of [16,20,24]){
   const setup={railIndex:1,yaw,elevation,charge},a=h.shoot(setup),b=h.shoot(setup);
   assert.deepEqual(b,a,`repeat at ${chargeToSpeed(charge)} m/s, yaw ${yaw}`);
   assert.ok(a.contacts.some(c=>c.body==='mv-paddle'),'physical contact rather than passing through');
   assert.deepEqual(redirects(a).map(e=>e.feature),['moving-paddle']);
   assert.ok(a.position[2]<45,'actual outgoing leg returns toward the apron');
   assert.ok(a.contacts.filter(c=>c.body==='mv-paddle').reduce((n,c)=>n+c.count,0)<12,'no prolonged contact episode');
  }
 }finally{h.dispose();}
});
test('shared browser physics-observable path matches direct fixed-step authority for wind and moving contact',()=>{
 for(const [wind,setup]of [['RIGHT',windShot],['OFF',paddleShot]]){
  const expected=vocabularyHarness(hv),actual=vocabularyHarness(hv);try{
   expected.world.environment.restore({wind});actual.world.environment.restore({wind});const a=expected.shoot(setup);
   actual.scene.onBeforePhysicsObservable.add(()=>actual.session.beforeStep());actual.scene.onAfterPhysicsObservable.add(()=>actual.session.afterStep());
   actual.session.fire(setup);for(let i=0;i<7300&&!actual.session.flight.ended;i++)actual.scene._advancePhysicsEngineStep(1000/120);
   assert.deepEqual(actual.session.last,a);
  }finally{expected.dispose();actual.dispose();}
 }
});
test('paddle freezes in RESULT and previews its real cycle in READY after recovery',()=>{
 const h=vocabularyHarness(hv);try{
  h.world.environment.restore({wind:'RIGHT'});
  h.shoot(paddleShot);const terminal=h.world.paddle.rotationQuaternion.asArray();
  for(let i=0;i<240;i++)h.step();
  assert.deepEqual(h.world.paddle.rotationQuaternion.asArray(),terminal);assert.equal(h.world.paddleBody.body.getAngularVelocity().length(),0);
  for(const action of ['retry','reset','recall']){
   h.session.action(action);assert.ok(h.world.paddle.rotationQuaternion.toEulerAngles().length()<1e-8);
   for(let i=0;i<120;i++)h.step();
   assert.ok(Math.abs(h.world.paddle.rotationQuaternion.toEulerAngles().y-paddleYaw(1))<.005);
   assert.ok(h.world.paddleBody.body.getAngularVelocity().length()>.1,'real animated body previews while ready');
  }
  assert.deepEqual(h.world.environment.snapshot(),{wind:'RIGHT',paddleMode:'SYNC',paddleTick:'0'});
 }finally{h.dispose();}
});
test('the new world uses incumbent muzzle, speed, mass and gravity authority and never scores',()=>{
 const h=vocabularyHarness(hv),baseline=mechanismHarness(hv);try{
  h.session.fire(paddleShot);const launch=spatialLaunch(MECHANISM_VOCABULARY,paddleShot);
  assert.ok(Vector3.Distance(h.session.flight.mesh.position,new Vector3(launch.muzzle.x,launch.muzzle.y,launch.muzzle.z))<1e-6);
  baseline.session.fire(paddleShot);
  // Compare the real incumbent impulse result, including Havok numeric quantization.
  assert.deepEqual(h.session.flight.aggregate.body.getLinearVelocity().asArray(),baseline.session.flight.aggregate.body.getLinearVelocity().asArray());
  assert.equal(h.session.flight.aggregate.body.getMassProperties().mass,RAIL_RULES.projectileMass);
  const result=h.shoot(paddleShot);assert.equal('score' in result,false);
 }finally{h.dispose();baseline.dispose();}
});
test('baseline far-frame audit: visible solid crossbeam physically returns the round but is intentionally untagged',()=>{
 const h=mechanismHarness(hv);try{
  const beam=h.scene.getMeshByName('mr-loft-crossbeam');assert.ok(beam.physicsBody);assert.equal(beam.metadata?.lineFeature,undefined);
  const r=h.shoot({railIndex:1,yaw:12,elevation:34,charge:1});
  assert.ok(r.contacts.some(c=>c.body==='mr-loft-crossbeam'));
  assert.ok(r.position[2]<95,'real bounce returns into yard');assert.deepEqual(redirects(r),[],'baseline structural beams are raw evidence, not vocabulary');
 }finally{h.dispose();}
});
test('FAMILIAR opening view includes both working-bay centers on desktop and mobile',()=>{
 for(const [width,height]of [[1440,900],[844,390],[390,844]]){
  const engine=new NullEngine({renderWidth:width,renderHeight:height}),scene=new Scene(engine);try{
   const frame=spatialCameraFrame(MECHANISM_VOCABULARY,VOCABULARY_DEFAULT,width,height),camera=new FreeCamera('fixture',Vector3.FromArray(frame.position),scene);
   camera.fov=frame.fov;camera.fovMode=frame.horizontal?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.setTarget(Vector3.FromArray(frame.target));scene.activeCamera=camera;
   camera.getViewMatrix(true);camera.getProjectionMatrix(true);scene.updateTransformMatrix(true);
   for(const point of [new Vector3(-14,12,44),new Vector3(20,8,49)]){
    const projected=Vector3.Project(point,Matrix.Identity(),scene.getTransformMatrix(),new Viewport(0,0,width,height));
    assert.ok(projected.x>width*.15&&projected.x<width*.86);assert.ok(projected.y>height*.2&&projected.y<height*.6);
   }
  }finally{scene.dispose();engine.dispose();}
 }
});


test('SYNC idle preview duration cannot change the recorded launch phase or resulting physical line',()=>{
 const h=vocabularyHarness(hv);try{
  h.world.environment.restore({wind:'OFF',paddleMode:'SYNC',paddleTick:'0'});const expected=h.shoot(paddleShot);
  for(const idle of [60,270,731]){
   h.session.action('retry');for(let i=0;i<idle;i++)h.step();
   assert.notEqual(h.world.paddle.rotationQuaternion.toEulerAngles().y,0);
   assert.equal(h.session.fire(paddleShot),true);
   assert.equal(h.session.flight.start.paddleTick,'0');
   assert.ok(h.world.paddle.rotationQuaternion.toEulerAngles().length()<1e-8);
   for(let i=0;i<7300&&!h.session.flight.ended;i++)h.step();assert.deepEqual(h.session.last,expected);
  }
 }finally{h.dispose();}
});
test('LIVE captures the physically visible integer phase; Recall holds it and repeats exactly',()=>{
 const h=vocabularyHarness(hv);try{
  h.world.environment.setControl('wind','OFF');h.world.environment.setControl('paddleMode','LIVE');
  for(let i=0;i<180;i++)h.step();
  const visible=h.world.paddle.rotationQuaternion.asArray();assert.equal(h.world.environment.snapshot().paddleTick,'180');
  assert.equal(h.session.fire(paddleShot),true);assert.equal(h.session.flight.start.paddleTick,'180');
  const atLaunch=h.world.paddle.rotationQuaternion.asArray();for(let i=0;i<4;i++)assert.ok(Math.abs(visible[i]-atLaunch[i])<1e-5);
  for(let i=0;i<7300&&!h.session.flight.ended;i++)h.step();const expected=h.session.last;
  assert.equal(expected.environment.paddleMode,'LIVE');assert.equal(expected.environment.paddleTick,'180');
  h.session.action('recall');const held=h.world.paddle.rotationQuaternion.asArray();
  for(let i=0;i<480;i++)h.step();for(let i=0;i<4;i++)assert.ok(Math.abs(h.world.paddle.rotationQuaternion.asArray()[i]-held[i])<1e-7,'held phase only receives Havok float quantization');assert.equal(h.world.paddleBody.body.getAngularVelocity().length(),0);
  assert.match(h.world.diagnostics().recallHeld,/RECALLED PHASE HELD/);
  h.world.environment.setControl('wind','LEFT');assert.equal(h.world.environment.snapshot().paddleTick,'180');
  assert.match(h.world.diagnostics().recallHeld,/RECALLED PHASE HELD/);
  h.world.environment.setControl('wind','OFF');
  assert.equal(h.session.fire(expected.setup),true);for(let i=0;i<7300&&!h.session.flight.ended;i++)h.step();assert.deepEqual(h.session.last,expected);
  h.session.action('recall');h.world.environment.setControl('paddleMode','LIVE');
  for(let i=0;i<60;i++)h.step();assert.equal(h.world.environment.snapshot().paddleTick,'240');assert.equal(h.world.diagnostics().recallHeld,'');
  h.session.action('retry');assert.equal(h.world.environment.snapshot().paddleMode,'LIVE');const before=h.world.environment.snapshot().paddleTick;h.step();assert.notEqual(h.world.environment.snapshot().paddleTick,before);
  h.session.action('reset');assert.deepEqual(h.world.environment.snapshot(),VOCABULARY_ENVIRONMENT);
 }finally{h.dispose();}
});
test('LIVE phase payload is bounded and rejects malformed state without changing the physical environment',()=>{
 const h=vocabularyHarness(hv);try{
  for(const value of ['nan','-1','1.5','1080',Infinity,{},null])assert.throws(()=>paddleTick(value));
  for(const state of [{wind:'RANDOM'},{wind:'LEFT',paddleMode:'CHAOS'},{wind:'LEFT',paddleMode:'LIVE',paddleTick:'9999'}]){
   const before=h.world.environment.snapshot();assert.throws(()=>h.world.environment.restore(state));assert.deepEqual(h.world.environment.snapshot(),before);
  }
  assert.equal(paddleTick('1079'),1079);assert.equal(PADDLE_HZ,120);
 }finally{h.dispose();}
});
test('active wind moves directional cues in READY; OFF visibly collapses them without adding physical authority',()=>{
 const h=vocabularyHarness(hv);try{
  const cues=h.world.streamers;assert.equal(h.world.environment.snapshot().wind,'LEFT');assert.equal(cues.length,9);
  const positions=()=>cues.map(({ribbon})=>ribbon.position.asArray());const first=positions();
  for(let i=0;i<60;i++)h.world.updatePresentation(VOCABULARY_DEFAULT,1/60);
  assert.notDeepEqual(positions(),first);assert.ok(h.world.fanRotors.every(r=>r.rotation.y!==0));
  for(const {ribbon,arrow}of cues){assert.equal(ribbon.physicsBody,undefined);assert.equal(arrow.physicsBody,undefined);assert.equal(arrow.isEnabled(),true);assert.ok(arrow.position.x<0);}
  h.world.environment.setControl('wind','RIGHT');for(const {arrow}of cues)assert.ok(arrow.position.x>0);
  h.world.environment.setControl('wind','OFF');const off=positions(),rotors=h.world.fanRotors.map(r=>r.rotation.y);
  for(let i=0;i<60;i++)h.world.updatePresentation(VOCABULARY_DEFAULT,1/60);
  assert.deepEqual(positions(),off);assert.deepEqual(h.world.fanRotors.map(r=>r.rotation.y),rotors);
  assert.ok(cues.every(({ribbon,arrow})=>ribbon.scaling.x===.16&&!arrow.isEnabled()));
  assert.ok(h.scene.meshes.filter(m=>/paddle-(motion-stripe|band|pivot-collar)/.test(m.name)).every(m=>!m.physicsBody));
  assert.deepEqual(MECHANISM_VOCABULARY.controls.map(c=>[c.id,c.placement,c.options]),[['wind','primary',['OFF','LEFT','RIGHT']],['paddleMode','primary',['SYNC','LIVE']]]);
 }finally{h.dispose();}
});

test('LIVE physical contacts repeat across six recorded phases and three useful speeds without observed tunnelling',()=>{
 const h=vocabularyHarness(hv);try{
  for(const tick of [0,180,360,540,720,900])for(const [charge,elevation]of [[.65,25],[.85,20],[1,15]]){
   const state={wind:'OFF',paddleMode:'LIVE',paddleTick:String(tick)},setup={railIndex:1,yaw:20,elevation,charge};
   h.world.environment.restore(state);const a=h.shoot(setup);h.world.environment.restore(state);const b=h.shoot(setup);
   assert.deepEqual(a,b,`same setup/state repeats at tick ${tick}, speed ${chargeToSpeed(charge)}`);
   assert.deepEqual(a.environment,state);
   const contact=a.contacts.filter(c=>c.body==='mv-paddle');assert.ok(contact.length>0,'real moving-body contact');
   assert.ok(contact.reduce((sum,c)=>sum+c.count,0)<12,'no prolonged episode');
   assert.deepEqual(redirects(a).map(e=>e.feature),['moving-paddle']);assert.ok(a.position[2]<48,'departure returns before paddle plane');
  }
 }finally{h.dispose();}
});
test('browser physics-observable idle and launch steps capture the same LIVE phase and result as direct Havok steps',()=>{
 const direct=vocabularyHarness(hv),browser=vocabularyHarness(hv);try{
  for(const h of [direct,browser]){h.world.environment.setControl('wind','OFF');h.world.environment.setControl('paddleMode','LIVE');}
  browser.scene.onBeforePhysicsObservable.add(()=>browser.session.beforeStep());browser.scene.onAfterPhysicsObservable.add(()=>browser.session.afterStep());
  for(let i=0;i<180;i++)direct.step();
  // Scene owns a substep accumulator, so compare executed physical ticks rather
  // than assuming one submitted frame always yields exactly one physics step.
  for(let i=0;i<182&&browser.world.environment.snapshot().paddleTick!=='180';i++)browser.scene._advancePhysicsEngineStep(1000/120);
  assert.deepEqual(browser.world.environment.snapshot(),direct.world.environment.snapshot());
  assert.equal(direct.session.fire(paddleShot),true);assert.equal(browser.session.fire(paddleShot),true);
  for(let i=0;i<7300&&(!direct.session.flight.ended||!browser.session.flight.ended);i++){
   if(!direct.session.flight.ended)direct.step();if(!browser.session.flight.ended)browser.scene._advancePhysicsEngineStep(1000/120);
  }
  assert.deepEqual(browser.session.last,direct.session.last);
 }finally{direct.dispose();browser.dispose();}
});
