import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '@babylonjs/core';
import {repeaterHarness} from '../scripts/playability/repeater-harness.mjs';
import {persistenceHarness} from '../scripts/playgrounds/persistence-harness.mjs';
import {validGuestRecord} from '../lib/playgrounds-persistence-records.js';
const setup={railIndex:1,yaw:0,elevation:8,charge:.55};
const direct=()=>repeaterHarness(()=>{},{requireTrial:false});

test('direct finite commitment needs valid held setup but no manual trial; N means N total new shots',()=>{
 const h=direct(),control=persistenceHarness();try{
  assert.equal(h.queue.trial,null);assert.equal(h.queue.canStart(setup),true);
  for(const invalid of [{...setup,yaw:71},{...setup,charge:NaN},{...setup,elevation:4},{...setup,railIndex:3}])assert.equal(h.queue.start(invalid,3),false);
  for(const n of [0,1,2,6,3.1,Infinity])assert.equal(h.queue.start(setup,n),false);
  assert.equal(h.queue.start(setup,3),true);assert.equal(h.queue.manual(setup),false);assert.equal(h.queue.start(setup,3),false);h.finish();
  assert.equal(h.queue.trial,null);assert.equal(h.queue.records.length,3);assert.equal(h.queue.state.started,3);
  const manual=Array.from({length:3},(_,i)=>control.shoot(setup,{reset:i===0}));assert.deepEqual(h.queue.records,manual);assert.ok(h.queue.records.every(validGuestRecord));
  assert.equal(h.queue.start({...setup,yaw:.5},3),true);h.finish();assert.equal(h.queue.records.length,3);
 }finally{h.dispose();control.dispose();}
});

test('a direct five-shot batch includes its own missed outcomes without a hidden preparatory blow',()=>{
 const h=direct();try{
  const short={...setup,charge:.4};h.queue.start(short,5);h.finish();
  assert.deepEqual(h.queue.records.map(r=>r.contacts.some(c=>c.body==='guest-stone')),[true,true,true,true,false]);
  for(let i=1;i<5;i++)assert.deepEqual(h.queue.records[i].environment,h.queue.records[i-1].settledEnvironment);
  const prior=h.queue.records[0];h.queue.restore(prior);assert.equal(h.session.flight,null);assert.equal(h.queue.canStart(short),true);
  for(let i=0;i<1000;i++)h.step();assert.equal(h.session.flight,null);assert.equal(h.queue.state.status,'idle');
  h.queue.reset();assert.equal(h.queue.state.planned,0);assert.equal(h.session.flight,null);
 }finally{h.dispose();}
});

test('direct finite batches remain exact under 30, 60, 144 Hz and uneven render partitions',()=>{
 const reference=direct();try{
  reference.queue.start(setup,3);reference.finish();
  for(const pattern of [[1000/30],[1000/60],[1000/144],[7,21,9,32]]){const h=direct();try{
   h.scene.onBeforePhysicsObservable.add(()=>h.queue.beforeStep());h.scene.onAfterPhysicsObservable.add(()=>h.queue.afterStep());h.queue.start(setup,3);
   for(let i=0;i<40000&&(h.queue.state.busy||h.queue.state.status==='running');i++)h.scene._advancePhysicsEngineStep(pattern[i%pattern.length]);
   assert.deepEqual(h.queue.records,reference.queue.records);
  }finally{h.dispose();}}
 }finally{reference.dispose();}
});

test('direct batches cancel on leaving the view and clean up without another ball',()=>{
 for(const when of ['flight','settling','pause']){const h=direct();try{
  h.queue.start(setup,5);
  if(when==='settling')while(h.world.status!=='settling')h.step();
  if(when==='pause')while(h.queue.records.length===0)h.step();
  h.queue.stop('left-view');h.finish();for(let i=0;i<500;i++)h.step();assert.equal(h.queue.records.length,1);assert.equal(h.queue.state.started,1);
  assert.equal(h.scene.getPhysicsEngine().getBodies().length,12);h.queue.reset();assert.equal(h.scene.getPhysicsEngine().getBodies().length,11);
  h.queue.dispose();h.session.dispose();h.world.dispose();assert.equal(h.scene.getPhysicsEngine().getBodies().length,0);assert.equal(h.scene.meshes.length,0);assert.equal(h.casters.size,0);
 }finally{h.dispose();}}
});

test('direct blocked settling preserves the incomplete attempt and exact Undo permits a new explicit commitment',()=>{
 const h=direct();try{
  const before=h.world.environment.snapshot();h.queue.start(setup,3);while(!h.session.last)h.step();
  // Test-only sustained spin forces the real Havok recovery path; not a designed shot.
  for(let i=0;i<1300&&h.queue.state.status!=='blocked';i++){h.world.propAggregate.body.setAngularVelocity(new Vector3(0,4,0));h.step();}
  assert.equal(h.queue.state.status,'blocked');assert.equal(h.queue.records.length,0);assert.equal(h.queue.canStart(setup),false);assert.equal(h.queue.incomplete.record.settledEnvironment,null);
  assert.deepEqual(h.queue.undo(),setup);assert.deepEqual(h.world.environment.snapshot(),before);for(let i=0;i<120;i++)h.step();assert.equal(h.session.flight,null);
  assert.equal(h.queue.start(setup,3),true);h.finish();assert.equal(h.queue.records.length,3);
 }finally{h.dispose();}
});
