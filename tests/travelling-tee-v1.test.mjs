import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {TEE_DEFAULT,TEE_MODES,TEE_TOUR,TEE_TRACK,normalizeTeeSetup,selectTeeMode,selectTeeOrigin,shiftTeeOrigin,advanceTeeTour,setTeeTourRunning,restoreTeeOrigin,returnToTeeOrigin} from '../lib/travelling-tee.js';
import {spatialLaunch,spatialCameraFrame} from '../lib/spatial-lab-session.js';
import {travellingTeeConfig} from '../lib/travelling-tee-config.js';
import {teeHarness} from './helpers/travelling-tee-physics.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const startTour=(patch={})=>selectTeeMode({...TEE_DEFAULT,...patch},'tour');

test('TOUR is an explicit fourth origin comparison; five stops remains default',()=>{
 assert.equal(TEE_DEFAULT.carriageMode,'stops');
 assert.deepEqual(TEE_MODES.map(mode=>mode.id),['rails','stops','continuous','tour']);
 assert.equal(startTour().tourRunning,true);assert.equal(startTour().tourDirection,1);
 const saved={...startTour(),originX:7.123456789};
 assert.equal(normalizeTeeSetup(saved).originX,saved.originX);
 assert.equal(selectTeeMode(saved,'continuous').originX,7);
 assert.equal(Object.hasOwn(selectTeeMode(saved,'stops'),'tourRunning'),false);
});
test('TOUR travels predictably at 2 m/s with reflected endpoints and no frame-count dependence',()=>{
 const start=startTour({yaw:23,elevation:37,charge:.67});
 const atRight=advanceTeeTour(start,10,'ready');assert.equal(atRight.originX,20);assert.equal(atRight.tourDirection,-1);
 const toLeft=advanceTeeTour(atRight,20,'ready');assert.equal(toLeft.originX,-20);assert.equal(toLeft.tourDirection,1);
 assert.equal(advanceTeeTour(start,TEE_TOUR.period,'ready').originX,start.originX);
 const one=advanceTeeTour(start,67.3,'ready');let many=start;
 for(let i=0;i<673;i++)many=advanceTeeTour(many,.1,'ready');
 close(many.originX,one.originX);assert.equal(many.tourDirection,one.tourDirection);
 for(const s of [atRight,toLeft,one,many]){assert.equal(s.yaw,start.yaw);assert.equal(s.elevation,start.elevation);assert.equal(s.charge,start.charge);assert.ok(s.originX>=TEE_TRACK.min&&s.originX<=TEE_TRACK.max);}
});
test('TOUR advances during charge and captures the release origin, not the hold-start origin',()=>{
 const start=advanceTeeTour(startTour(),1.125,'ready');
 const lastFrame=advanceTeeTour(start,2.875,'charging');
 const release=advanceTeeTour(lastFrame,.017,'charging');
 close(release.originX,8.034);assert.notEqual(release.originX,lastFrame.originX);
 assert.equal(advanceTeeTour(release,10,'flight'),release);
 for(const phase of ['result','survey','loading','error'])assert.equal(advanceTeeTour(release,10,phase),release);
 for(const seconds of [-1,0,Infinity,NaN])assert.equal(advanceTeeTour(release,seconds,'ready'),release);
 const paused=setTeeTourRunning(release,false);assert.equal(advanceTeeTour(paused,8,'ready'),paused);
 assert.equal(selectTeeOrigin(release,9.5).tourRunning,false);assert.equal(shiftTeeOrigin(release,1).tourRunning,false);
});
test('return-to-origin preserves current aim/power while full recovery parks the exact launch origin',()=>{
 const saved={...startTour(),originX:8.034,tourDirection:-1,yaw:12,elevation:44,charge:.831};
 const current={...TEE_DEFAULT,yaw:-27,elevation:60,charge:.3};
 const returned=returnToTeeOrigin(current,saved);
 assert.equal(returned.carriageMode,'tour');assert.equal(returned.originX,saved.originX);assert.equal(returned.tourDirection,-1);assert.equal(returned.tourRunning,false);
 assert.equal(returned.yaw,current.yaw);assert.equal(returned.elevation,current.elevation);assert.equal(returned.charge,current.charge);
 for(const action of ['retry','recall']){const restored=restoreTeeOrigin(saved,action);assert.equal(restored.originX,saved.originX);assert.equal(restored.tourDirection,saved.tourDirection);assert.equal(restored.charge,saved.charge);assert.equal(restored.tourRunning,false);assert.equal(advanceTeeTour(restored,60,'ready'),restored);}
 const reset=restoreTeeOrigin(saved,'reset');assert.equal(reset.carriageMode,'stops');assert.equal(reset.originX,0);assert.equal(reset.charge,saved.charge);
 const resumed=setTeeTourRunning(restoreTeeOrigin(saved,'retry'),true);close(advanceTeeTour(resumed,1,'ready').originX,saved.originX-2);
});
test('FAMILIAR launch frame follows precise TOUR origin without changing equipment direction',()=>{
 const start=startTour(),moved=advanceTeeTour(start,3.125,'ready');
 const before=spatialLaunch(travellingTeeConfig,start),after=spatialLaunch(travellingTeeConfig,moved);
 const first=spatialCameraFrame(travellingTeeConfig,start,844,390),second=spatialCameraFrame(travellingTeeConfig,moved,844,390);
 assert.deepEqual(after.aim,before.aim);close(after.muzzle.x-before.muzzle.x,6.25);assert.equal(after.muzzle.y,before.muzzle.y);assert.equal(after.muzzle.z,before.muzzle.z);
 close(second.position[0]-first.position[0],6.25);close(second.target[0]-first.target[0],6.25);assert.equal(second.fov,first.fov);
});

const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
test('actual Havok TOUR fire uses captured muzzle and exactly the stopped launch velocity',()=>{
 const h=teeHarness(hv),stopped=teeHarness(hv);try{
  const atRelease=advanceTeeTour(startTour({charge:1}),3.017,'charging'),launch=spatialLaunch(travellingTeeConfig,atRelease);
  h.world.updatePresentation(atRelease);assert.equal(h.session.fire(atRelease),true);
  assert.deepEqual(h.session.flight.mesh.position.asArray(),[launch.muzzle.x,launch.muzzle.y,launch.muzzle.z]);
  stopped.session.fire({...TEE_DEFAULT,charge:1});h.step();stopped.step();
  assert.deepEqual(h.session.flight.aggregate.body.getLinearVelocity().asArray(),stopped.session.flight.aggregate.body.getLinearVelocity().asArray());
  h.session.action('retry');assert.equal(h.session.last.setup.originX,atRelease.originX);assert.equal(h.session.last.station.x,atRelease.originX);assert.equal(h.session.last.setup.tourDirection,1);assert.equal(h.session.last.reason,'interrupted');
 }finally{h.dispose();stopped.dispose();}
});
test('TOUR Retry/Recall actually fire again from identical origin; repeat line and Transfer state remain exact',()=>{
 const h=teeHarness(hv);try{
  const atRelease=advanceTeeTour(startTour({yaw:-17,elevation:15,charge:.65}),1.543,'ready');h.world.mechanism.setState('B');
  const original=h.shoot(atRelease);
  for(const action of ['retry','recall']){
   if(action==='recall')h.world.mechanism.setState('A');
   const recovered=restoreTeeOrigin(h.session.action(action),action);assert.equal(recovered.tourRunning,false);assert.equal(recovered.originX,atRelease.originX);assert.equal(h.world.mechanism.state,'B');
   const repeat=h.shoot(recovered);assert.equal(repeat.reason,original.reason);assert.equal(repeat.elapsed,original.elapsed);assert.deepEqual(repeat.position,original.position);assert.deepEqual(repeat.contacts,original.contacts);assert.deepEqual(repeat.evidence,original.evidence);
  }
  const reset=restoreTeeOrigin(h.session.action('reset'),'reset');assert.equal(reset.carriageMode,'stops');assert.equal(reset.originX,0);assert.equal(h.world.mechanism.state,'A');assert.equal(h.session.fire(reset),true);
 }finally{h.dispose();}
});
