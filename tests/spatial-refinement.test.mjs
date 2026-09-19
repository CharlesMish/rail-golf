import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NullEngine,Scene,MeshBuilder,Logger} from '@babylonjs/core';
import {createSpatialOriginClock,spatialControlSetup,spatialLaunch} from '../lib/spatial-lab-session.js';
import {travellingTeeConfig} from '../lib/travelling-tee-config.js';
import {TEE_DEFAULT,selectTeeMode} from '../lib/travelling-tee.js';
import {buildSpatialLabMaterials} from '../lib/spatial-lab-materials.js';
import {buildRangeLauncher,buildRangeProjectile} from '../lib/mechanism-range-presentation.js';
Logger.LogLevels=0;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
function clockHarness(){
 let setup=selectTeeMode(TEE_DEFAULT,'tour'),writes=0;
 const clock=createSpatialOriginClock(travellingTeeConfig,()=>setup,next=>{setup=next;writes++;});
 return {clock,get setup(){return setup;},get writes(){return writes;}};
}

test('origin clock synchronizes release between render frames and captures that same authoritative muzzle',()=>{
 const h=clockHarness();h.clock.reset(1000);h.clock.sync(2000,'ready');
 close(h.setup.originX,2);
 h.clock.sync(4983,'charging');const displayed=h.setup;
 close(displayed.originX,7.966);
 const release=h.clock.sync(5000,'charging');close(release.originX,8);assert.notEqual(release.originX,displayed.originX);
 const captured={...release,charge:.9},actual=spatialLaunch(travellingTeeConfig,captured);
 assert.equal(actual.station.x,captured.originX);
 const parked=spatialLaunch(travellingTeeConfig,{...captured,tourRunning:false});assert.deepEqual(actual,parked);
 assert.equal(h.clock.sync(5033,'flight'),release);assert.equal(h.writes,3);
});
test('Survey and hidden-document pauses consume elapsed wall time instead of catching up when returned',()=>{
 const h=clockHarness();h.clock.reset(0);h.clock.sync(1000,'ready');const origin=h.setup.originX;
 // Survey may keep rendering; all those intervals are consumed while held.
 h.clock.sync(1017,'ready',true);h.clock.sync(60000,'ready',true);assert.equal(h.setup.originX,origin);
 h.clock.reset(60000);h.clock.sync(60020,'ready');close(h.setup.originX,origin+.04);
 // Hidden documents may render no frames. Their visibility-resume reset consumes
 // the whole hidden interval even if only the entry callback ran.
 h.clock.sync(60021,'ready',true);const atHide=h.setup.originX;
 h.clock.reset(300000);h.clock.sync(300020,'ready');close(h.setup.originX,atHide+.04);
});
test('flight/result freeze cannot drift the next origin; explicit recovery clock reset starts a fresh interval',()=>{
 const h=clockHarness();h.clock.reset(0);h.clock.sync(1000,'ready');const atFire=h.setup;
 for(const [now,phase] of [[4000,'flight'],[18000,'result'],[24000,'loading'],[30000,'error']])assert.equal(h.clock.sync(now,phase),atFire);
 assert.equal(h.setup,atFire);h.clock.reset(60000);h.clock.sync(60050,'ready');close(h.setup.originX,atFire.originX+.1);
});
test('shared control adapter routes manual TOUR origin to a paused selection and guards all origin changes',()=>{
 const running=selectTeeMode({...TEE_DEFAULT,yaw:12,elevation:42,charge:.79},'tour');
 const manual=spatialControlSetup(travellingTeeConfig,running,{originX:7.125},'ready');
 assert.equal(manual.originX,7.125);assert.equal(manual.tourRunning,false);assert.equal(manual.yaw,running.yaw);assert.equal(manual.charge,running.charge);
 const resume=spatialControlSetup(travellingTeeConfig,manual,{tourRunning:true},'ready');assert.equal(resume.tourRunning,true);assert.equal(resume.originX,manual.originX);
 const stop=spatialControlSetup(travellingTeeConfig,resume,{carriageMode:'stops'},'ready');assert.equal(stop.originX,10);assert.equal(stop.carriageMode,'stops');assert.equal(Object.hasOwn(stop,'tourRunning'),false);
 const tour=spatialControlSetup(travellingTeeConfig,stop,{carriageMode:'tour'},'ready');assert.equal(tour.originX,10);assert.equal(tour.tourRunning,true);
 for(const phase of ['charging','flight','result','loading','error'])for(const patch of [{originX:18},{carriageMode:'rails'},{railIndex:0},{tourRunning:false}])assert.equal(spatialControlSetup(travellingTeeConfig,running,patch,phase),running);
 const aimed=spatialControlSetup(travellingTeeConfig,running,{yaw:-20,elevation:30},'charging');assert.equal(aimed.yaw,-20);assert.equal(aimed.elevation,30);assert.equal(aimed.originX,running.originX);assert.equal(aimed.tourRunning,true);
});
test('lab machine/track palette aliases incumbent equipment materials instead of independent lookalikes',()=>{
 const engine=new NullEngine(),scene=new Scene(engine);try{
  const {equipment,world}=buildSpatialLabMaterials(scene),shadows={addShadowCaster(){},removeShadowCaster(){}};
  for(const role of ['steel','machine','cyan','amber'])assert.equal(world[role],equipment[role]);
  for(const role of ['sand','timber','bark','violet'])assert.ok(world[role]);
  buildRangeLauncher(scene,equipment,shadows);
  const body=MeshBuilder.CreateSphere('hidden-authority',{diameter:.86},scene),projectile=buildRangeProjectile(scene,body,equipment,shadows);
  assert.equal(scene.getMeshByName('mr-carriage').material,world.machine);
  assert.equal(scene.getMeshByName('mr-round-shell').material,world.steel);
  assert.equal(scene.getMeshByName('mr-round-band').material,world.cyan);
  assert.equal(scene.getMeshByName('mr-round-nose').material,world.amber);
  assert.equal(scene.materials.filter(m=>m.name==='mr-presentation-steel').length,1);
  assert.equal(body.isVisible,false);assert.equal(projectile.round.isEnabled(),true);
  assert.equal(scene.getPhysicsEngine(),null);
 }finally{scene.dispose();engine.dispose();}
});
test('browser launch and focus paths bind the tested origin clock rather than a prior rendered setup',async()=>{
 const source=await readFile(new URL('../app/lab/spatial-lab.tsx',import.meta.url),'utf8');
 const shoot=source.slice(source.indexOf('const shoot='),source.indexOf('let recovering='));
 assert.match(shoot,/originClock\.current\?\.sync[\s\S]*const launchSetup=\{\.\.\.setupRef\.current,charge\};[\s\S]*session\.fire\(launchSetup\)/);
 const blur=source.slice(source.indexOf('const blur='),source.indexOf("surface.addEventListener('pointerdown'"));
 assert.match(blur,/view\.getSnapshot\(\)==='survey'\|\|document\.hidden/);assert.match(blur,/tourRunning:false/);
 assert.match(source,/originControl\?\.recover\?\.\(next,action\)/);
 assert.match(source,/originControl\.returnTo\(setupRef\.current,last\.setup\)/);
 assert.match(source,/SURVEY HOLD/);assert.match(source,/SHOT HOLD/);
});
