import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsMotionType} from '@babylonjs/core';
import {gateHarness} from '../scripts/horizons/gate-harness.mjs';
import {SWING_GATE,swingGateTick} from '../lib/horizons-swing-gate.js';
import {createGateShelf,createBrowserGateShelf,validGateEntry} from '../lib/horizons-gate-shelf.js';
const setup={railIndex:2,yaw:0,elevation:18,charge:.55};
const collisionBodies=r=>r.contacts.map(c=>c.body);
const runToEnd=h=>{for(let i=0;i<7300&&!h.session.flight.ended;i++)h.step();return h.session.last;};

test('historical and foreign layouts never access browser persistence without the gate opt-in',()=>{
 let accesses=0;const host={get localStorage(){accesses++;throw Error('Unavailable');}};
 assert.equal(createBrowserGateShelf(undefined,host),null);assert.equal(createBrowserGateShelf('mechanism-vocabulary',host),null);assert.equal(createBrowserGateShelf('foreign',host),null);assert.equal(accesses,0);
 assert.ok(createBrowserGateShelf(SWING_GATE.id,host));assert.equal(accesses,1);
});

test('gate is a broad real animated body; visible structure and ground retain actual static boxes',()=>{
 const h=gateHarness();try{
  assert.equal(h.world.paddleBody.body.getMotionType(),PhysicsMotionType.ANIMATED);
  assert.deepEqual(h.world.paddle.getBoundingInfo().boundingBox.extendSize.asArray(),[7,6,.7]);
  const counts=h.scene.getPhysicsEngine().getBodies().reduce((a,b)=>(a[b.getMotionType()]=(a[b.getMotionType()]??0)+1,a),{});
  assert.equal(counts[PhysicsMotionType.ANIMATED],1);assert.equal(counts[PhysicsMotionType.STATIC],6);
  for(const name of ['hg-ground','hg-tee','hg-portal-post','hg-portal-beam','hg-far-face'])assert.ok(h.scene.getMeshByName(name).physicsBody,name);
  assert.equal(h.world.ground.metadata.rangeGround,true);
 }finally{h.dispose();}
});

test('one setup passes at open phase, physically returns at closed phase, and reaches distinct lateral destinations',()=>{
 const h=gateHarness(),absent=gateHarness({control:'absent'});try{
  const passage=h.shoot(setup,240),free=absent.shoot(setup,240);
  assert.deepEqual(collisionBodies(passage.record),['hg-ground']);assert.deepEqual(passage.path,free.path);
  const a=h.shoot(setup,0),b=h.shoot(setup,600),c=h.shoot(setup,1320);
  for(const r of [a,b,c]){assert.deepEqual(collisionBodies(r.record),['hg-gate','hg-ground']);assert.equal(r.record.reason,'first-ground-contact');assert.ok(r.record.evidence.some(e=>e.feature==='swing-gate'&&e.kind==='redirect'));assert.ok(r.impacts.some(e=>e.body==='hg-gate'&&e.normal.length===3&&e.incoming[2]>0&&e.outgoing[2]<0));}
  assert.ok(a.record.position[0]<-12);assert.ok(b.record.position[0]>3);assert.ok(c.record.position[2]<b.record.position[2]-7);
  const onward=h.shoot({...setup,charge:.75},240);assert.deepEqual(collisionBodies(onward.record),['hg-far-face','hg-ground']);
 }finally{h.dispose();absent.dispose();}
});

test('passage and return survive adjacent player controls and nearby release phases, with exact repeated physics',()=>{
 const h=gateHarness();try{
  const variations=[setup,{...setup,yaw:-.5},{...setup,yaw:.5},{...setup,elevation:17.5},{...setup,elevation:18.5},{...setup,charge:.54},{...setup,charge:.56}];
  for(const base of [240,600])for(const delta of [-6,0,6])for(const s of variations){const a=h.shoot(s,base+delta),b=h.shoot(s,base+delta);assert.deepEqual(a,b);assert.deepEqual(collisionBodies(a.record),base===240?['hg-ground']:['hg-gate','hg-ground']);}
 }finally{h.dispose();}
});

test('LIVE captures visible phase, PAUSED and Recall hold it, but each fired shot resumes real motion',()=>{
 const h=gateHarness();try{
  for(let i=0;i<240;i++)h.step();assert.equal(h.world.environment.snapshot().gateTick,'240');
  h.world.environment.setControl('gateMode','PAUSED');for(let i=0;i<120;i++)h.step();assert.equal(h.world.environment.snapshot().gateTick,'240');
  h.session.fire(setup);h.step();assert.equal(h.session.flight.start.gateTick,'240');assert.equal(h.world.environment.snapshot().gateTick,'241');const expected=runToEnd(h);
  h.session.action('recall');for(let i=0;i<480;i++)h.step();assert.equal(h.world.environment.snapshot().gateTick,'240');assert.ok(h.world.diagnostics().recallHeld);assert.equal(h.world.paddleBody.body.getAngularVelocity().length(),0);
  h.session.fire(setup);assert.deepEqual(runToEnd(h),expected);
  h.session.action('recall');h.world.environment.setControl('gateMode','LIVE');h.step();assert.equal(h.world.environment.snapshot().gateTick,'241');
  h.session.action('reset');assert.deepEqual(h.world.environment.snapshot(),{layout:SWING_GATE.id,gateMode:'LIVE',gateTick:'0'});
 }finally{h.dispose();}
});

test('saved phase reproduces complete contacts and terminal under 30/60/144 Hz and mixed frame partitions',()=>{
 const direct=gateHarness();try{
  const expected=direct.shoot(setup,600).record;
  for(const pattern of [[1000/30],[1000/60],[1000/144],[7,21,9,32]]){const h=gateHarness();try{
   h.world.environment.restore(expected.environment);h.scene.onBeforePhysicsObservable.add(()=>h.session.beforeStep());h.scene.onAfterPhysicsObservable.add(()=>h.session.afterStep());h.session.fire(setup);
   for(let i=0;i<20000&&!h.session.flight.ended;i++)h.scene._advancePhysicsEngineStep(pattern[i%pattern.length]);assert.deepEqual(h.session.last,expected);
  }finally{h.dispose();}}
 }finally{direct.dispose();}
});

test('phase data rejects foreign/malformed state atomically; stationary ablation changes the physical result',()=>{
 const h=gateHarness(),stationary=gateHarness({control:'static'});try{
  for(const value of [-1,1440,1.5,NaN,'1.5',null,{}])assert.throws(()=>swingGateTick(value));
  for(const state of [{layout:'foreign',gateMode:'LIVE',gateTick:'0'},{layout:SWING_GATE.id,gateMode:'RANDOM',gateTick:'0'},{layout:SWING_GATE.id,gateMode:'LIVE',gateTick:'1440'}]){const before=h.world.environment.snapshot();assert.throws(()=>h.world.environment.restore(state));assert.deepEqual(h.world.environment.snapshot(),before);}
  const moving=h.shoot(setup,600),stopped=stationary.shoot(setup,600);assert.notDeepEqual(moving.record.position,stopped.record.position);
 }finally{h.dispose();stationary.dispose();}
});

test('voluntary Keep persists exact phase and actual evidence; rejects foreign records and never replaces a full shelf',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},h=gateHarness();try{
  const result=h.shoot(setup,600),path=result.path.filter((_,i)=>i%12===0),shelf=createGateShelf(storage),entry=shelf.keep(result.record,path,'0b151c5');
  assert.ok(validGateEntry(entry));assert.equal(entry.record.environment.gateTick,'600');const loaded=createGateShelf(storage);assert.deepEqual(loaded.get(entry.id),entry);
  for(const patch of [{layout:'foreign'},{record:{...entry.record,environment:{...entry.record.environment,gateTick:'1440'}}},{path:[[0,NaN,0,0]]}])assert.equal(validGateEntry({...entry,...patch}),false);
  const fresh=gateHarness();try{fresh.world.environment.restore(loaded.get(entry.id).record.environment);for(let i=0;i<480;i++)fresh.step();fresh.session.fire(entry.record.setup);assert.deepEqual(runToEnd(fresh),result.record);}finally{fresh.dispose();}
  for(let i=0;i<3;i++)loaded.keep(result.record,path,'0b151c5');assert.equal(loaded.keep(result.record,path,'0b151c5'),null);assert.equal(loaded.entries().length,4);
  const key=[...data.keys()][0];data.set(key,'not json');const broken=createGateShelf(storage);broken.keep(result.record,path,'0b151c5');assert.equal(data.get(key),'not json');assert.match(broken.warning(),/original bytes are preserved/);
 }finally{h.dispose();}
});

test('repeated load, fire, reset and dispose release all bodies, owned meshes and shadow registrations',()=>{
 for(let i=0;i<8;i++){const h=gateHarness();for(let shot=0;shot<5;shot++){h.shoot(setup,(shot*240)%1440);h.session.action('reset');assert.equal(h.scene.getPhysicsEngine().getBodies().length,7);assert.equal(h.scene.meshes.length,18);}h.session.dispose();h.world.dispose();assert.equal(h.scene.getPhysicsEngine().getBodies().length,0);assert.equal(h.scene.meshes.length,0);assert.equal(h.casters.size,0);h.root.dispose();h.scene.dispose();h.engine.dispose();}
});
