import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '@babylonjs/core';
import {repeaterHarness} from '../scripts/playability/repeater-harness.mjs';
import {persistenceHarness} from '../scripts/playgrounds/persistence-harness.mjs';
import {createShotRepeater,REPEATER_PAUSE_TICKS} from '../lib/playability-repeater.js';
import {createGuestShelf,validGuestRecord} from '../lib/playgrounds-persistence-records.js';
const opening={railIndex:1,yaw:0,elevation:8,charge:.55};
const hit=r=>r.contacts.some(c=>c.body==='guest-stone');

test('a finite sequence requires a manually tried exact setup and 3–5 new shots',()=>{
 const h=repeaterHarness();try{
  assert.equal(h.queue.start(opening,3),false);assert.equal(h.queue.manual(opening),true);assert.equal(h.queue.manual(opening),false);h.finish();
  for(const n of [0,1,2,6,Infinity,3.1])assert.equal(h.queue.start(opening,n),false);
  assert.equal(h.queue.start({...opening,charge:.56},3),false);assert.equal(h.queue.start(opening,3),true);assert.equal(h.queue.start(opening,3),false);h.finish();
  assert.equal(h.queue.records.length,3);assert.equal(h.queue.state.status,'idle');assert.equal(h.queue.state.remaining,0);assert.ok(h.queue.records.every(validGuestRecord));
  for(const r of h.queue.records)assert.deepEqual(r.setup,opening);
 }finally{h.dispose();}
});

test('each repeat starts from the preceding settled world and exactly matches manual continuation',()=>{
 const h=repeaterHarness(),control=persistenceHarness();try{
  const run=h.run({...opening,elevation:5,charge:1}),manual=[];
  for(let i=0;i<6;i++)manual.push(control.shoot({...opening,elevation:5,charge:1},{reset:i===0}));
  assert.deepEqual([run.trial,...run.records],manual);
  const records=[run.trial,...run.records];for(let i=1;i<records.length;i++)assert.deepEqual(records[i].environment,records[i-1].settledEnvironment);
  assert.ok(JSON.parse(records.at(-1).settledEnvironment.pose)[2]>38);
 }finally{h.dispose();control.dispose();}
});

test('evolving-world misses remain legitimate individual records; the queue never resets to force hits',()=>{
 const h=repeaterHarness();try{
  const run=h.run({...opening,charge:.4});assert.deepEqual([run.trial,...run.records].map(hit),[true,true,true,true,false,false]);
  assert.ok(run.records.every(r=>validGuestRecord(r)&&r.reason==='first-ground-contact'));
  assert.ok(Math.abs(JSON.parse(run.records[3].settledEnvironment.pose)[2]-JSON.parse(run.records[2].settledEnvironment.pose)[2])<1e-5);
 }finally{h.dispose();}
});

test('a new projectile cannot start before complete prop rest and the fixed observation pause',()=>{
 const h=repeaterHarness();try{
  h.queue.manual(opening);h.finish();h.queue.start(opening,3);while(h.queue.records.length===0)h.step();
  const held=h.world.environment.snapshot();assert.equal(h.queue.state.pauseTicks,REPEATER_PAUSE_TICKS);assert.equal(h.queue.state.started,1);assert.equal(h.world.status,'ready');
  for(let i=0;i<REPEATER_PAUSE_TICKS-1;i++){h.step();assert.equal(h.queue.state.started,1);assert.deepEqual(h.world.environment.snapshot(),held);assert.equal(h.scene.getPhysicsEngine().getBodies().length,12);}
  h.step();assert.equal(h.queue.state.started,2);assert.equal(h.scene.getPhysicsEngine().getBodies().length,12);h.finish();
 }finally{h.dispose();}
});

test('Stop during flight, prop settling or between attempts cancels all later launches',()=>{
 for(const phase of ['flight','settling','pause']){const h=repeaterHarness();try{
  h.queue.manual(opening);h.finish();h.queue.start(opening,5);
  if(phase==='settling')while(h.world.status!=='settling')h.step();
  if(phase==='pause')while(h.queue.records.length===0)h.step();
  h.queue.stop(phase==='pause'?'left-view':'player');h.finish();for(let i=0;i<1000;i++)h.step();
  assert.equal(h.queue.state.started,1);assert.equal(h.queue.records.length,1);assert.ok(validGuestRecord(h.queue.records[0]));assert.equal(h.queue.state.status,'idle');assert.equal(h.queue.state.remaining,0);
 }finally{h.dispose();}}
});

test('Stop in the completion callback cannot schedule the next shot',()=>{
 let h;h=repeaterHarness(e=>{if(e.kind==='shot-complete'&&e.number)h.queue.stop('callback');});try{h.run(opening);assert.equal(h.queue.records.length,1);assert.equal(h.queue.state.started,1);}finally{h.dispose();}
});

test('restore, reset, undo and fresh shelf reload never grant an implicit sequence restart',()=>{
 const h=repeaterHarness(),data=new Map(),shelf=createGuestShelf({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});try{
  const run=h.run(opening);shelf.keep(run.records[1],'repeater-test');
  h.queue.start(opening,3);while(!h.queue.records.length)h.step();h.queue.restore(run.records[0]);for(let i=0;i<300;i++)h.step();
  assert.equal(h.queue.state.started,1);assert.equal(h.queue.canStart(opening),false);assert.deepEqual(h.world.environment.snapshot(),run.records[0].environment);
  h.queue.manual(opening);h.finish();h.queue.start(opening,3);while(!h.queue.records.length)h.step();assert.equal(h.queue.reset(),true);for(let i=0;i<300;i++)h.step();assert.equal(h.queue.state.planned,0);
  const fresh=repeaterHarness();try{const loaded=createGuestShelf({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}).entries()[0];fresh.queue.restore(loaded.record,true);assert.equal(fresh.queue.canStart(loaded.record.setup),false);assert.equal(fresh.session.flight,null);assert.equal(fresh.queue.records.length,0);}finally{fresh.dispose();}
 }finally{h.dispose();}
});

test('the entire repeated sequence reproduces at equivalent 30, 60, 144 and mixed render partitions',()=>{
 const source=repeaterHarness();try{
  const expected=source.run({...opening,charge:.4});
  for(const pattern of [[1000/30],[1000/60],[1000/144],[7,21,9,32]]){const h=repeaterHarness();try{
   h.scene.onBeforePhysicsObservable.add(()=>h.queue.beforeStep());h.scene.onAfterPhysicsObservable.add(()=>h.queue.afterStep());const advance=()=>{for(let i=0;i<40000&&(h.queue.state.busy||h.queue.state.status==='running');i++)h.scene._advancePhysicsEngineStep(pattern[i%pattern.length]);};
   h.queue.manual({...opening,charge:.4});advance();h.queue.start({...opening,charge:.4},5);advance();assert.deepEqual(h.queue.trial,expected.trial);assert.deepEqual(h.queue.records,expected.records);
  }finally{h.dispose();}}
 }finally{source.dispose();}
});

test('a blocked settle cancels the plan and preserves the incomplete receipt without claiming settled rest',()=>{
 const h=repeaterHarness();try{
  h.queue.manual(opening);h.finish();const accepted=h.session,stub={...accepted,get status(){return 'blocked';},get last(){return {...h.queue.trial,settledEnvironment:null,settleElapsed:null};},fire:()=>true,next:()=>null,reset(){this.resets=(this.resets??0)+1;},beforeStep(){},afterStep(){}};
  // Inject only lifecycle status in this control test: no altered physics is design evidence.
  let status='ready';Object.defineProperty(stub,'status',{get:()=>status});const q=createShotRepeater(stub);assert.equal(q.manual(opening),true);status='blocked';q.afterStep();
  assert.equal(q.state.status,'blocked');assert.equal(q.state.busy,false);assert.equal(q.incomplete.record.settledEnvironment,null);assert.equal(validGuestRecord(q.incomplete.record),false);assert.equal(q.reset(),true);assert.equal(stub.resets,1);q.dispose();
 }finally{h.dispose();}
});

test('sequence allocation stays at one ball, bounded ledger, and disposal releases the original bodies',()=>{
 for(let cycle=0;cycle<3;cycle++){const h=repeaterHarness();h.run(opening,5);assert.equal(h.queue.records.length,5);assert.equal(h.scene.getPhysicsEngine().getBodies().length,12);h.queue.reset();assert.equal(h.scene.getPhysicsEngine().getBodies().length,11);h.queue.manual(opening);h.queue.dispose();assert.equal(h.queue.start(opening,5),false);h.session.dispose();h.world.dispose();assert.equal(h.scene.getPhysicsEngine().getBodies().length,0);assert.equal(h.scene.meshes.length,0);assert.equal(h.casters.size,0);h.root.dispose();h.scene.dispose();h.engine.dispose();}
});

test('blocked-to-Undo clears the pending terminal lifecycle before idle ticks and a manual retry',()=>{
 const h=repeaterHarness();try{
  h.queue.manual(opening);while(!h.session.last)h.step();assert.equal(h.session.last.settledEnvironment,null);
  // Controlled failure injection is a recovery test, not physical evidence of a naturally blocked blow.
  Object.defineProperty(h.world,'status',{configurable:true,get:()=> 'blocked'});h.queue.afterStep();assert.equal(h.queue.state.status,'blocked');
  assert.deepEqual(h.queue.undo(),opening);assert.equal(h.session.last,null);assert.equal(h.session.flight,null);
  for(let i=0;i<20;i++)h.step();assert.equal(h.queue.state.status,'idle');assert.equal(h.queue.canStart(opening),false);
  Object.defineProperty(h.world,'status',{configurable:true,get:()=> 'ready'});assert.equal(h.queue.manual(opening),true);
 }finally{h.dispose();}
});

test('a new manual trial clears the previous bounded sequence association without resetting the world',()=>{
 const h=repeaterHarness();try{const run=h.run(opening);const held=h.world.environment.snapshot();assert.ok(h.queue.manual({...opening,yaw:1}));assert.equal(h.queue.records.length,0);assert.equal(h.queue.plan,null);assert.equal(h.queue.trial,null);h.finish();assert.deepEqual(h.queue.trial.environment,held);assert.notDeepEqual(h.queue.trial.setup,run.trial.setup);}finally{h.dispose();}
});


test('an actual Havok prop held above the rest threshold cancels a batch and recovers through exact Undo',()=>{
 const h=repeaterHarness();try{
  h.queue.manual(opening);h.finish();const before=h.world.environment.snapshot();h.queue.start(opening,5);
  while(!h.session.last)h.step();
  // Deliberate test-only sustained spin exercises failure handling. It is absent from runtime design.
  for(let i=0;i<1300&&h.queue.state.status!=='blocked';i++){
   h.world.propAggregate.body.setAngularVelocity(new Vector3(0,4,0));h.step();
  }
  assert.equal(h.queue.state.status,'blocked');assert.equal(h.queue.state.started,1);assert.equal(h.queue.records.length,0);
  assert.equal(h.queue.incomplete.record.settledEnvironment,null);assert.equal(h.queue.incomplete.record.reason,'first-ground-contact');
  assert.deepEqual(h.queue.undo(),opening);assert.deepEqual(h.world.environment.snapshot(),before);
  for(let i=0;i<120;i++)h.step();assert.equal(h.session.flight,null);assert.equal(h.queue.canStart(opening),false);
  assert.ok(h.queue.manual(opening));h.finish();assert.ok(validGuestRecord(h.queue.trial));assert.deepEqual(h.queue.trial.environment,before);
 }finally{h.dispose();}
});
