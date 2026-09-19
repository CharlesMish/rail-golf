import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {createSpatialSession,spatialCameraFrame,spatialLaunch,spatialControlSetup,spatialEnd} from '../lib/spatial-lab-session.js';
import {createMechanismSession} from '../lib/mechanism-range-session.js';
import {buildMechanismRange} from '../lib/mechanism-range-scene.js';
import {RANGE_STATION,RANGE_DEFAULT,RANGE_BOUNDS,rangeEnd} from '../lib/mechanism-range.js';
import {rangeCameraFrame} from '../lib/mechanism-range-framing.js';
import {RAIL_RULES} from '../lib/rail-golf-v02.js';
import {travellingTeeConfig} from '../lib/travelling-tee-config.js';
Logger.LogLevels=0;
const havok=await HavokPhysics({wasmBinary:await fs.readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const config={station:()=>RANGE_STATION,defaultSetup:RANGE_DEFAULT,bounds:RANGE_BOUNDS,survey:{position:[77,88,-18],target:[0,3,55]}};
function harness(adapter){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.getPhysicsEngine().setTimeStep(1/120);
 const material=new StandardMaterial('test',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material]));
 const world=buildMechanismRange(scene,new TransformNode('lab',scene),materials,{addShadowCaster(){},removeShadowCaster(){}});
 let session;if(adapter){world.environment={snapshot:()=>({floor:world.mechanism.state}),restore:x=>world.mechanism.setState(x.floor),reset:()=>world.mechanism.setState('A')};world.contact=(o,p,f)=>world.mechanism.contact(o,p,f.id);world.flush=()=>world.mechanism.flush();session=createSpatialSession(scene,world,config);}else session=createMechanismSession(scene,world);
 return {session,world,step(){session.beforeStep();scene.getPhysicsEngine()._step(1/120);session.afterStep();},shoot(setup){assert.equal(session.fire(setup),true);for(let i=0;i<7300&&!session.flight.ended;i++)this.step();return session.last;},dispose(){session.dispose();world.dispose();scene.dispose();engine.dispose();}};
}
test('new configurable labs use identical accepted body/launch/contact/terminal records',()=>{
 for(const setup of [{...RANGE_DEFAULT,charge:.6},{railIndex:0,yaw:-16,elevation:10,charge:1},{railIndex:1,yaw:70,elevation:20,charge:1}]){
  const a=harness(false),b=harness(true);try{a.world.mechanism.setState('B');b.world.mechanism.setState('B');const old=a.shoot(setup),next=b.shoot(setup);const {station,...record}=next;assert.deepEqual(station,RANGE_STATION);assert.deepEqual(record,old);}finally{a.dispose();b.dispose();}
 }
});
test('FAMILIAR camera math is identical at ground level and translates with elevated station',()=>{
 for(const size of [[1440,900],[844,390],[390,844]])for(const railIndex of [0,1,2]){
  const setup={...RANGE_DEFAULT,railIndex};assert.deepEqual(spatialCameraFrame(config,setup,...size),rangeCameraFrame(setup,'familiar',...size));
  const high={...config,station:()=>({...RANGE_STATION,y:8})},a=spatialLaunch(config,setup),b=spatialLaunch(high,setup);
  assert.deepEqual(a.aim,b.aim);assert.ok(Math.abs(b.muzzle.y-a.muzzle.y-8)<1e-12);assert.equal(b.rail.y,8);
  const frame=spatialCameraFrame(high,setup,...size),base=spatialCameraFrame(config,setup,...size);assert.ok(Math.abs(frame.position[1]-base.position[1]-8)<1e-12);assert.ok(Math.abs(frame.target[1]-base.target[1]-8)<1e-12);
 }
});
test('late setup gestures cannot change origin in charging/flight/result; ordinary aim semantics survive',()=>{
 const setup={...RANGE_DEFAULT,originX:0,carriageMode:'stops'},originConfig={...config,originControl:{normalize:s=>s}};
 for(const phase of ['charging','flight','result','loading','error'])for(const patch of [{originX:20},{carriageMode:'rails'},{railIndex:0}])assert.equal(spatialControlSetup(originConfig,setup,patch,phase),setup);
 assert.equal(spatialControlSetup(originConfig,setup,{originX:20},'ready').originX,20);
 assert.equal(spatialControlSetup(config,setup,{yaw:20},'charging').yaw,20);
 assert.equal(spatialControlSetup(config,setup,{yaw:20},'flight'),setup);
});
test('spatial bounds and safety remain separate from successful in-bounds long flight',()=>{
 for(const t of [0,13,40,60])assert.equal(spatialEnd(RANGE_BOUNDS,{x:0,y:20,z:60},{x:2,y:-1,z:3},t,null),rangeEnd({x:0,y:20,z:60},{x:2,y:-1,z:3},t,null));
 assert.equal(spatialEnd(RANGE_BOUNDS,{x:56,y:20,z:60},{x:2,y:-1,z:3},1,null),'out-of-bounds');
});
test('new shell preserves familiar equipment and explicit result recovery without score/progression writes',async()=>{
 const source=await fs.readFile(new URL('../app/lab/spatial-lab.tsx',import.meta.url),'utf8');
 assert.match(source,/buildRangeLauncher/);assert.match(source,/buildRangeProjectile/);assert.match(source,/createSpatialSession/);
 assert.match(source,/Continue playing/);assert.match(source,/spatialControlSetup/);assert.match(source,/view.set\('launch'\);placeRangeCamera/);
 assert.doesNotMatch(source,/localStorage|createSurveyArchive|lineReceipt|scoreWeights|selectHole|nextHole/);
});

test('carriage UI adapter preserves the nearest origin when changing modes, and rejects stale changes',()=>{
 const atRight={...travellingTeeConfig.defaultSetup,carriageMode:'continuous',originX:16};
 const rail=spatialControlSetup(travellingTeeConfig,atRight,{carriageMode:'rails'},'ready');
 assert.equal(rail.railIndex,2);assert.equal(rail.originX,4);assert.equal(rail.yaw,atRight.yaw);
 assert.equal(spatialControlSetup(travellingTeeConfig,atRight,{carriageMode:'rails'},'charging'),atRight);
});
