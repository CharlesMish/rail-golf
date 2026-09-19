import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {PhysicsMotionType,FreeCamera,Vector3,Matrix,Viewport} from '@babylonjs/core';
import {verticalHarness} from './helpers/vertical-yard-physics.mjs';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
import {VERTICAL_STATION,VERTICAL_DEFAULT,VERTICAL_SOLIDS,VERTICAL_APRON} from '../lib/vertical-yard.js';
import {VERTICAL_YARD_LAB} from '../lib/vertical-yard-config.js';
import {spatialLaunch,spatialCameraFrame} from '../lib/spatial-lab-session.js';
import {placeRangeCamera} from '../lib/mechanism-range-framing.js';
import {RAIL_RULES,chargeToSpeed} from '../lib/rail-golf-v02.js';
import {stationMuzzle,stationAim} from '../lib/stations.js';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const features=r=>r.evidence.filter(e=>e.kind==='redirect').map(e=>e.feature);
// QA-only physical references. These are never imported by player-facing code.
const refs={
 low:{railIndex:1,yaw:-25,elevation:10,charge:.85},
 terraces:{railIndex:1,yaw:15,elevation:20,charge:.45},
 gallery:{railIndex:1,yaw:-25,elevation:50,charge:.65},
 high:{railIndex:1,yaw:0,elevation:40,charge:.85},
 cross:{railIndex:1,yaw:15,elevation:10,charge:.85},
 edge:{railIndex:1,yaw:0,elevation:40,charge:1},
};

test('vertical blockout has one elevated station, honest static bodies and no mechanism/target',()=>{
 const h=verticalHarness(hv);try{
  assert.equal(h.world.features.size,VERTICAL_SOLIDS.length+4);
  for(const record of VERTICAL_SOLIDS){
   const mesh=h.world.features.get(record.id);assert.ok(mesh);assert.equal(mesh.physicsBody.getMotionType(),PhysicsMotionType.STATIC);
   assert.deepEqual(mesh.position.asArray(),[record.x,record.y,record.z]);
   assert.ok(Math.abs(mesh.rotationQuaternion.toEulerAngles().x-(record.pitch??0)*Math.PI/180)<.00001);
  }
  assert.equal(VERTICAL_APRON.y+VERTICAL_APRON.h/2,VERTICAL_STATION.y);
  assert.equal(h.world.mechanism,undefined);assert.equal(h.world.target,undefined);
  assert.equal(h.scene.getMeshByName('vy-return-face').physicsBody,undefined);
 }finally{h.dispose();}
});

test('elevated launcher reuses incumbent aim, muzzle offset and full-power speed',()=>{
 const h=verticalHarness(hv),incumbent=mechanismHarness(hv);try{
  for(const railIndex of [0,1,2]){
   const setup={...VERTICAL_DEFAULT,railIndex,elevation:5,charge:1};
   const launch=spatialLaunch(VERTICAL_YARD_LAB,setup),base=stationMuzzle(setup,VERTICAL_STATION);
   assert.deepEqual(launch.aim,stationAim(setup,VERTICAL_STATION));
   assert.deepEqual(launch.muzzle,{...base,y:base.y+8});
   h.session.action('retry');assert.equal(h.session.fire(setup),true);
   incumbent.session.action('retry');incumbent.session.fire(setup);
   assert.deepEqual(h.session.flight.aggregate.body.getLinearVelocity().asArray(),incumbent.session.flight.aggregate.body.getLinearVelocity().asArray());
   assert.ok(Math.abs(h.session.flight.aggregate.body.getLinearVelocity().length()-chargeToSpeed(1))<.1,'same nominal launch impulse and Havok mass authority');
   assert.deepEqual(h.session.flight.mesh.position.asArray(),[launch.muzzle.x,launch.muzzle.y,launch.muzzle.z]);
   for(let i=0;i<10;i++)h.step();assert.equal(h.session.flight.contacts.length,0,'apron/supports do not obstruct the muzzle');
  }
  assert.equal(RAIL_RULES.gravity,12);assert.equal(RAIL_RULES.projectileRadius,.43);assert.equal(RAIL_RULES.projectileMass,1.5);
 }finally{h.dispose();incumbent.dispose();}
});

test('verticality supports distinct low, terrace, gallery and cross-space physical relationships',()=>{
 const h=verticalHarness(hv);try{
  for(const [setup,expected] of [
   [refs.low,['low-cheek','lower-ramp','terrace-one']],
   [refs.terraces,['lower-ramp','terrace-two','terrace-three']],
   [refs.gallery,['gallery-deck','gallery-cheek','cross-gantry']],
   [refs.cross,['lower-ramp','terrace-three','far-return']],
  ]){
   const r=h.shoot(setup);assert.deepEqual(features(r),expected);assert.equal(r.reason,'first-ground-contact');
   for(const event of r.evidence.filter(e=>e.kind==='redirect'))assert.ok(r.contacts.some(c=>c.body===event.body));
   assert.equal('score' in r,false);
  }
 }finally{h.dispose();}
});

test('high return admits a broad three-rail family and returns through lower space without a scripted impulse',()=>{
 const h=verticalHarness(hv);try{
  for(const railIndex of [0,1,2])for(const yaw of [-5,0,5]){
   const r=h.shoot({...refs.high,railIndex,yaw});assert.deepEqual(features(r),['cross-gantry','far-return']);
   const e=r.evidence.find(e=>e.feature==='far-return'&&e.kind==='redirect');
   assert.ok(e.point.y>35);assert.ok(e.incoming.z>25);assert.ok(e.outgoing.z<-18);assert.ok(e.outgoing.y<-10);
   assert.ok(r.position[2]<80);assert.ok(r.position[1]<1);assert.equal(r.reason,'first-ground-contact');
  }
  const edge=h.shoot(refs.edge);assert.equal(edge.reason,'out-of-bounds','receiver does not rescue every far trajectory');
  assert.ok(features(edge).includes('far-return'));
 }finally{h.dispose();}
});

test('repeated setup and browser-observable stepping agree under real Havok',()=>{
 const a=verticalHarness(hv),b=verticalHarness(hv);try{
  const expected=a.shoot(refs.cross),repeat=a.shoot(refs.cross);
  assert.deepEqual(features(repeat),features(expected));assert.ok(Vector3.Distance(Vector3.FromArray(repeat.position),Vector3.FromArray(expected.position))<.001);
  b.scene.onBeforePhysicsObservable.add(()=>b.session.beforeStep());b.scene.onAfterPhysicsObservable.add(()=>b.session.afterStep());
  b.session.fire(refs.cross);for(let i=0;i<7300&&!b.session.flight.ended;i++)b.scene._advancePhysicsEngineStep(1000/120);
  assert.deepEqual(features(b.session.last),features(expected));assert.equal(b.session.last.reason,expected.reason);
  assert.ok(Vector3.Distance(Vector3.FromArray(b.session.last.position),Vector3.FromArray(expected.position))<.001);
 }finally{a.dispose();b.dispose();}
});

test('vertical Retry, Reset and Recall preserve real station and can fire after terminal results',()=>{
 const h=verticalHarness(hv);try{
  const result=h.shoot(refs.edge);assert.equal(result.station.id,'hoist-apron');assert.equal(result.station.y,8);
  for(const action of ['retry','reset','recall']){
   h.session.action(action);assert.equal(h.session.flight,null);assert.equal(h.session.fire(refs.high),true);
   for(let i=0;i<12;i++)h.step();assert.equal(h.session.flight.ended,null);
  }
  h.session.action('retry');const saved=h.session.last;
  assert.deepEqual(h.session.action('recall'),saved.setup);assert.deepEqual(saved.environment,{});
 }finally{h.dispose();}
});

test('familiar frame follows elevated origin and keeps the incumbent muzzle centred',()=>{
 const h=verticalHarness(hv);try{
  const camera=new FreeCamera('view',Vector3.Zero(),h.scene),target=Vector3.Zero();h.scene.activeCamera=camera;
  for(const [width,height] of [[1440,900],[844,390],[390,844]]){
   h.engine.setSize(width,height);
   const frame=spatialCameraFrame(VERTICAL_YARD_LAB,VERTICAL_DEFAULT,width,height);
   assert.equal(frame.position[1],15.8);assert.equal(frame.target[1],11.6);
   assert.equal(frame.fov,width<height?.92:.69);placeRangeCamera(camera,target,frame);
   camera.getViewMatrix(true);camera.getProjectionMatrix(true);h.scene.updateTransformMatrix(true);
   const muzzle=spatialLaunch(VERTICAL_YARD_LAB,VERTICAL_DEFAULT).muzzle;
   const p=Vector3.Project(new Vector3(muzzle.x,muzzle.y,muzzle.z),Matrix.Identity(),h.scene.getTransformMatrix(),new Viewport(0,0,width,height));
   assert.ok(Math.abs(p.x-width/2)<1);assert.ok(p.y>height*.15&&p.y<height*.85);
  }
 }finally{h.dispose();}
});

test('vertical scene has no scorer, trajectory assistance or production imports',async()=>{
 const scene=await readFile(new URL('../lib/vertical-yard-scene.js',import.meta.url),'utf8'),config=await readFile(new URL('../lib/vertical-yard-config.js',import.meta.url),'utf8');
 for(const source of [scene,config])assert.doesNotMatch(source,/applyImpulse|setLinearVelocity|scoreLine|COURTYARD_HOLES|localStorage|indexedDB|buildCourtyard/);
 assert.equal(VERTICAL_YARD_LAB.defaultSetup,VERTICAL_DEFAULT);
 assert.equal(VERTICAL_YARD_LAB.station(VERTICAL_DEFAULT),VERTICAL_STATION);
});
