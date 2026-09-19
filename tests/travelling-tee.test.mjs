import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stationRailPosition,stationMuzzle,stationAim} from '../lib/stations.js';
import {RAIL_RULES,chargeToSpeed} from '../lib/rail-golf-v02.js';
import {TEE_DEFAULT,TEE_STOPS,TEE_ORIGIN_CONTROL,normalizeTeeSetup,selectTeeMode,selectTeeOrigin,shiftTeeOrigin,teeStation} from '../lib/travelling-tee.js';

const actualOrigin=setup=>stationRailPosition(setup.railIndex,teeStation(setup));
test('travelling tee compares three incumbent rails, five wider origins and stopped continuous positions',()=>{
 const start={...TEE_DEFAULT,yaw:12.5,elevation:37,charge:.7};
 for(const [mode,points] of [['rails',[-4,0,4]],['stops',TEE_STOPS],['continuous',[-20,-12.5,0,7.5,20]]]){
  const s=selectTeeMode(start,mode);
  for(const x of points){const next=selectTeeOrigin(s,x);assert.equal(actualOrigin(next).x,x);assert.equal(actualOrigin(next).z,0);assert.equal(next.yaw,start.yaw);assert.equal(next.elevation,start.elevation);assert.equal(next.charge,start.charge);}
 }
 assert.deepEqual(TEE_ORIGIN_CONTROL.stops('rails'),RAIL_RULES.railPositions);
 assert.deepEqual(TEE_ORIGIN_CONTROL.stops('stops'),TEE_STOPS);assert.equal(TEE_ORIGIN_CONTROL.stops('continuous'),null);
});
test('origin changes preserve sporting-equipment direction, muzzle-relative position and release speed',()=>{
 const baseline=normalizeTeeSetup(TEE_DEFAULT),baseOrigin=actualOrigin(baseline),baseMuzzle=stationMuzzle(baseline,teeStation(baseline)),baseAim=stationAim(baseline,teeStation(baseline));
 for(const mode of ['rails','stops','continuous'])for(const x of [-20,-4,0,3.5,20]){
  const setup=selectTeeOrigin(selectTeeMode(baseline,mode),x),origin=actualOrigin(setup),muzzle=stationMuzzle(setup,teeStation(setup));
  assert.deepEqual(stationAim(setup,teeStation(setup)),baseAim);
  assert.ok(Math.abs((muzzle.x-origin.x)-(baseMuzzle.x-baseOrigin.x))<1e-12);assert.equal(muzzle.y,baseMuzzle.y);assert.equal(muzzle.z,baseMuzzle.z);
  assert.equal(chargeToSpeed(setup.charge),chargeToSpeed(baseline.charge));
 }
});
test('carriage controls clamp physical origin, snap five stops, and never discard aim',()=>{
 let s=selectTeeMode({...TEE_DEFAULT,yaw:-31,elevation:44},'continuous');
 assert.equal(selectTeeOrigin(s,300).originX,20);assert.equal(selectTeeOrigin(s,-300).originX,-20);assert.equal(selectTeeOrigin(s,7.23).originX,7);
 assert.equal(selectTeeMode({...s,originX:16},'stops').originX,20);
 assert.equal(selectTeeMode({...s,originX:16},'rails').originX,4);
 for(let i=0;i<100;i++)s=shiftTeeOrigin(s,1);
 assert.equal(s.originX,20);assert.equal(s.yaw,-31);assert.equal(s.elevation,44);assert.equal(s.railIndex,1);
 const five=shiftTeeOrigin({...TEE_DEFAULT,originX:0},1);assert.equal(five.originX,10);
});
test('travelling tee reuses accepted world and adds no projectile or score authority',async()=>{
 const scene=await readFile(new URL('../lib/travelling-tee-scene.js',import.meta.url),'utf8'),config=await readFile(new URL('../lib/travelling-tee-config.js',import.meta.url),'utf8');
 assert.match(scene,/buildMechanismRange\(scene,root,materials,shadows\)/);assert.doesNotMatch(scene,/applyImpulse|setLinearVelocity|projectileMass|projectileRadius|scoreLine/);
 assert.match(config,/originControl:TEE_ORIGIN_CONTROL/);assert.doesNotMatch(config,/scoreLine|progression|targetBody/);
});

import Havok from '@babylonjs/havok';
import {teeHarness} from './helpers/travelling-tee-physics.mjs';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
import {RANGE_DEFAULT} from '../lib/mechanism-range.js';
import {spatialCameraFrame,spatialLaunch} from '../lib/spatial-lab-session.js';
import {travellingTeeConfig} from '../lib/travelling-tee-config.js';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const features=record=>record.evidence.filter(e=>e.kind==='redirect').map(e=>e.feature);

test('wider stopped origins expose distinct real bench/table/rack relationships at unchanged aim and power',()=>{
 const h=teeHarness(hv);try{
  // QA source fixtures only; the player-facing comparison contains no shot solutions.
  const near={...TEE_DEFAULT,yaw:-17,elevation:15,charge:.65};
  const a=h.shoot({...near,originX:-10}),b=h.shoot({...near,originX:0}),c=h.shoot({...near,originX:20});
  assert.deepEqual(features(a),['split-bench']);assert.deepEqual(features(b),['split-bench','transfer-table']);assert.deepEqual(features(c),['transfer-table']);
  const far={...TEE_DEFAULT,yaw:23,elevation:22,charge:.85};
  assert.deepEqual(features(h.shoot({...far,originX:-10})),['rack-middle','rack-high']);
  assert.deepEqual(features(h.shoot({...far,originX:0})),['rack-high']);
  assert.deepEqual(features(h.shoot({...far,originX:10})),['return-wall']);
 }finally{h.dispose();}
});
test('three-rail comparison and center stop retain accepted mechanical fixture exactly',()=>{
 const h=teeHarness(hv),accepted=mechanismHarness(hv);try{
  const before=accepted.shoot(RANGE_DEFAULT);
  for(const carriageMode of ['rails','stops','continuous']){
   const result=h.shoot({...TEE_DEFAULT,carriageMode});
   assert.equal(result.reason,before.reason);assert.equal(result.elapsed,before.elapsed);assert.deepEqual(result.position,before.position);assert.deepEqual(result.evidence,before.evidence);assert.deepEqual(result.contacts,before.contacts);
  }
 }finally{h.dispose();accepted.dispose();}
});
test('stopped carriage has no platform velocity at release and snapshots the actual launch origin',()=>{
 const h=teeHarness(hv),incumbent=mechanismHarness(hv);try{
  const setup=selectTeeOrigin(selectTeeMode({...TEE_DEFAULT,charge:1},'continuous'),17.5);
  h.world.updatePresentation({...setup,originX:-20});h.world.updatePresentation(setup);
  assert.equal(h.session.fire(setup),true);
  const expected=spatialLaunch(travellingTeeConfig,setup);
  assert.equal(h.session.flight.mesh.position.x,expected.muzzle.x);
  h.step();const velocity=h.session.flight.aggregate.body.getLinearVelocity();
  incumbent.session.fire({...RANGE_DEFAULT,charge:1});incumbent.step();
  assert.deepEqual(velocity.asArray(),incumbent.session.flight.aggregate.body.getLinearVelocity().asArray());
  h.session.action('retry');assert.equal(h.session.last.setup.originX,17.5);assert.equal(h.session.last.station.x,17.5);
  assert.equal(h.session.last.reason,'interrupted');
 }finally{h.dispose();incumbent.dispose();}
});
test('Retry/Reset/Recall preserve or restore launch origin and environment through the shared session',()=>{
 const h=teeHarness(hv);try{
  const setup={...TEE_DEFAULT,carriageMode:'continuous',originX:7.5};h.world.mechanism.setState('B');
  h.shoot(setup);const saved=h.session.last;
  assert.deepEqual(h.session.action('retry'),setup);assert.equal(h.world.mechanism.state,'B');
  h.session.action('reset');assert.equal(h.world.mechanism.state,'A');
  assert.deepEqual(h.session.action('recall'),setup);assert.equal(h.world.mechanism.state,'B');
  const repeat=h.shoot(setup);assert.deepEqual(repeat.position,saved.position);assert.deepEqual(repeat.evidence,saved.evidence);
 }finally{h.dispose();}
});
test('familiar camera translates with stopped origin while retaining launcher-relative equipment framing',()=>{
 const center=spatialCameraFrame(travellingTeeConfig,TEE_DEFAULT,844,390);
 for(const originX of TEE_STOPS){
  const setup={...TEE_DEFAULT,originX},frame=spatialCameraFrame(travellingTeeConfig,setup,844,390);
  assert.equal(frame.fov,.69);assert.ok(Math.abs(frame.position[0]-center.position[0]-originX)<1e-12);assert.ok(Math.abs(frame.target[0]-center.target[0]-originX)<1e-12);
  assert.deepEqual(frame.position.slice(1),center.position.slice(1));assert.deepEqual(frame.target.slice(1),center.target.slice(1));
 }
});
