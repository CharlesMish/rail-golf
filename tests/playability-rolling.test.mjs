import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsMotionType,Vector3} from '@babylonjs/core';
import {rollingHarness} from '../scripts/playability/rolling-harness.mjs';
import {persistenceHarness} from '../scripts/playgrounds/persistence-harness.mjs';
import {ROLLING_PROPS,rollingPose,rollingEnvironment} from '../lib/playability-rolling.js';
import {createRollingShelf,validRollingRecord,rollingShelfKey} from '../lib/playability-rolling-records.js';
const opening={railIndex:1,yaw:0,elevation:8,charge:.55};
const pos=r=>rollingPose(r.settledEnvironment);
const order=r=>r.contacts.map(c=>c.body);
const finish=h=>{for(let i=0;i<9000&&!h.session.last?.settledEnvironment&&h.world.status!=='blocked';i++)h.step();return structuredClone(h.session.last);};

test('rolling sphere uses a real analytic body with unchanged Guest coefficients; stone comparison reproduces original',()=>{
 const sphere=rollingHarness(),control=rollingHarness({shape:'stone'}),original=persistenceHarness();try{
  for(const key of ['mass','diameter','friction','restitution','linearDamping','angularDamping','quietTicks','settleLimitTicks','linearQuiet','angularQuiet'])assert.equal(ROLLING_PROPS.sphere[key],ROLLING_PROPS.stone[key]);
  const a=sphere.shoot(opening),b=control.shoot(opening),c=original.shoot(opening);assert.deepEqual(b.path,c.path);assert.deepEqual(b.stonePath,c.stonePath);assert.equal(b.settledEnvironment.pose,c.settledEnvironment.pose);
  assert.ok(pos(a)[2]>26.7&&pos(a)[2]<26.8);assert.ok(pos(b)[2]>24.9&&pos(b)[2]<25);assert.ok(Math.abs(pos(a)[3])>.28);assert.ok(a.settleElapsed<4.8&&a.settleElapsed>4.7);assert.equal(sphere.world.propAggregate.body.getMotionType(),PhysicsMotionType.STATIC);
  assert.equal(sphere.world.prop.getChildMeshes().length,2);assert.ok(sphere.world.prop.getChildMeshes().every(m=>m.name.startsWith('rolling-paint-')));
 }finally{sphere.dispose();control.dispose();original.dispose();}
});

test('sphere keeps central, opposite flank and bank access families across ordinary adjacent detents',()=>{
 const h=rollingHarness();try{
  for(const [setup,side,bank] of [[opening,0,false],[{...opening,yaw:-5},1,false],[{...opening,yaw:5},-1,false],[{railIndex:1,yaw:-50,elevation:10,charge:.85},1,true]])for(const patch of [{},{yaw:setup.yaw-.5},{yaw:setup.yaw+.5},{elevation:setup.elevation-.5},{elevation:setup.elevation+.5},{charge:setup.charge-.01},{charge:setup.charge+.01}]){
   const r=h.shoot({...setup,...patch});assert.deepEqual(order(r),bank?['rolling-west-bank','rolling-prop','rolling-pavement']:['rolling-prop','rolling-pavement']);assert.ok(r.settleElapsed<6);if(side)assert.ok(pos(r)[0]*side>.65);else assert.ok(Math.abs(pos(r)[0])<.15);
  }
  const weak=h.shoot(opening),strong=h.shoot({...opening,charge:.75}),miss=h.shoot({...opening,yaw:25});assert.ok(pos(strong)[2]>pos(weak)[2]+1);assert.ok(!order(miss).includes('rolling-prop'));assert.equal(pos(miss)[2],24);
 }finally{h.dispose();}
});

test('first-ground ends only the ball; automatic next manual Fire is gated by held state and preserves prior result',()=>{
 const h=rollingHarness();try{
  h.session.fire(opening);while(!h.session.last)h.step();assert.equal(h.session.last.reason,'first-ground-contact');assert.equal(h.session.last.settledEnvironment,null);assert.equal(h.session.flight.aggregate.shape.filterMembershipMask,0);assert.equal(h.session.fire(opening),false);
  const done=finish(h),held=h.world.environment.snapshot();assert.notDeepEqual(done.endEnvironment,done.settledEnvironment);for(let i=0;i<3600;i++)h.step();assert.deepEqual(h.world.environment.snapshot(),held);assert.deepEqual(h.session.last,done);
  assert.equal(h.session.fire(opening),true);const second=finish(h);assert.deepEqual(second.environment,done.settledEnvironment);assert.ok(pos(second)[2]>pos(done)[2]);h.session.undo();assert.deepEqual(h.world.environment.snapshot(),second.environment);for(let i=0;i<10;i++)h.step();
 }finally{h.dispose();}
});

test('bounded settling failure can undo, idle and fire again without inventing a settled record',()=>{
 const h=rollingHarness();try{
  h.session.fire(opening);while(!h.session.last)h.step();const before=h.session.last.environment;
  // Adversarial test-only spin is never applied by gameplay; exercises the exact recovery bound.
  for(let i=0;i<1250&&h.world.status!=='blocked';i++){h.world.propAggregate.body.setAngularVelocity(new Vector3(0,4,0));h.step();}
  assert.equal(h.world.status,'blocked');assert.equal(h.world.propAggregate.body.getMotionType(),PhysicsMotionType.STATIC);const paused=h.world.environment.snapshot();for(let i=0;i<120;i++)h.step();assert.deepEqual(h.world.environment.snapshot(),paused);assert.equal(h.session.last.settledEnvironment,null);assert.equal(h.session.fire(opening),false);assert.equal(validRollingRecord(h.session.last),false);
  h.session.undo();assert.deepEqual(h.world.environment.snapshot(),before);for(let i=0;i<120;i++)h.step();assert.equal(h.world.status,'ready');assert.equal(h.session.last.settledEnvironment,null);assert.equal(h.session.fire(opening),true);assert.ok(finish(h).settledEnvironment);
 }finally{h.dispose();}
});

test('held sphere position and quaternion reproduce exactly with 30/60/144 Hz equivalent fixed-step partitions',()=>{
 const source=rollingHarness();try{
  source.shoot({...opening,yaw:-5});const prior=source.world.environment.snapshot(),expected=source.shoot({...opening,yaw:1.5},{reset:false});
  for(const pattern of [[1000/30],[1000/60],[1000/144],[7,21,9,32]]){const h=rollingHarness();try{
   h.session.restore({setup:expected.setup,environment:prior});h.scene.onBeforePhysicsObservable.add(()=>h.session.beforeStep());h.scene.onAfterPhysicsObservable.add(()=>h.session.afterStep());h.session.fire(expected.setup);
   for(let i=0;i<20000&&!h.session.last?.settledEnvironment;i++)h.scene._advancePhysicsEngineStep(pattern[i%pattern.length]);assert.deepEqual(h.session.last,expected);
  }finally{h.dispose();}}
 }finally{source.dispose();}
});

test('north delivery and evolving side route reach distinct held receiving places; stale setup can miss',()=>{
 const h=rollingHarness();try{
  const north=[];for(let i=0;i<4;i++)north.push(h.shoot({...opening,elevation:5,charge:1},{reset:i===0}));assert.ok(pos(north.at(-1))[2]>40);for(let i=1;i<north.length;i++)assert.deepEqual(north[i].environment,north[i-1].settledEnvironment);
  const bank={railIndex:1,yaw:-50,elevation:10,charge:.85},east=[];for(let i=0;i<5;i++)east.push(h.shoot(bank,{reset:i===0}));const stale=h.shoot(bank,{reset:false});assert.ok(!order(stale).includes('rolling-prop'));h.session.undo();for(const yaw of [-51,-51,-52])east.push(h.shoot({...bank,yaw,charge:1},{reset:false}));assert.ok(pos(east.at(-1))[0]>15.9);assert.ok(pos(east.at(-1))[2]>32&&pos(east.at(-1))[2]<33);
 }finally{h.dispose();}
});

test('per-shape voluntary shelves preserve exact provenance and refuse foreign, intermediate and malformed states',()=>{
 const h=rollingHarness(),stone=rollingHarness({shape:'stone'}),data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};try{
  const r=h.shoot(opening),shelf=createRollingShelf(storage),build='a90785ac2a03f3f0f00a4dbd758b05f6f49a3054-dirty';assert.ok(validRollingRecord(r));for(let i=0;i<4;i++)assert.ok(shelf.keep(r,build));const bytes=data.get(rollingShelfKey());assert.equal(shelf.keep(r,build),null);assert.equal(data.get(rollingShelfKey()),bytes);assert.deepEqual(createRollingShelf(storage).entries(),shelf.entries());assert.equal(createRollingShelf(storage,'stone').entries().length,0);
  assert.equal(validRollingRecord(stone.shoot(opening)),false);assert.equal(validRollingRecord({...r,settledEnvironment:null}),false);
  const held=h.world.environment.snapshot();for(const bad of [{...held,layout:'playgrounds-guest-stone-v1'},rollingEnvironment([0,3.5,24,0,0,0,1]),{...held,pose:'[0,1.5,24,0,0,0,1]'}]){if(bad.layout===held.layout&&JSON.parse(bad.pose)[1]>=3.4)continue;assert.throws(()=>h.world.environment.restore(bad));assert.deepEqual(h.world.environment.snapshot(),held);}
  const other=rollingEnvironment([0,2,24,0,0,0,1],'stone');assert.throws(()=>h.session.restore({setup:opening,environment:other}));assert.deepEqual(h.world.environment.snapshot(),held);
  data.set(rollingShelfKey(),'malformed preserved bytes');const broken=createRollingShelf(storage);broken.keep(r,build);assert.equal(data.get(rollingShelfKey()),'malformed preserved bytes');assert.match(broken.warning(),/original bytes/);
 }finally{h.dispose();stone.dispose();}
});

test('repeated load/fire/restore/reset/disposal releases owned sphere, paint and physics resources',()=>{
 for(const shape of ['sphere','stone'])for(let i=0;i<3;i++){const h=rollingHarness({shape});for(let j=0;j<3;j++){const r=h.shoot(opening);h.session.restore({setup:opening,environment:r.settledEnvironment});h.session.reset();assert.equal(h.scene.getPhysicsEngine().getBodies().length,11);assert.equal(h.scene.meshes.length,shape==='sphere'?32:30);}h.session.dispose();h.world.dispose();assert.equal(h.scene.getPhysicsEngine().getBodies().length,0);assert.equal(h.scene.meshes.length,0);assert.equal(h.casters.size,0);h.root.dispose();h.scene.dispose();h.engine.dispose();}
});
