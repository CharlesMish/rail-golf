import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsMotionType,Vector3} from '@babylonjs/core';
import {persistenceHarness} from '../scripts/playgrounds/persistence-harness.mjs';
import {GUEST_STONE,guestEnvironment,guestPose} from '../lib/playgrounds-persistence.js';
import {createGuestShelf,validGuestRecord,GUEST_SHELF_KEY} from '../lib/playgrounds-persistence-records.js';
const opening={railIndex:1,yaw:0,elevation:8,charge:.55};
const pose=r=>guestPose(r.settledEnvironment);
const order=r=>r.contacts.map(c=>c.body);
const finish=h=>{for(let i=0;i<9000&&!h.session.last?.settledEnvironment&&h.world.status!=='blocked';i++)h.step();return structuredClone(h.session.last);};

test('Guest uses one real passive convex prop and freezes only the ball at its original first ground',()=>{
 const h=persistenceHarness();try{
  assert.equal(h.scene.getPhysicsEngine().getBodies().length,11);assert.equal(h.world.propAggregate.body.getMotionType(),PhysicsMotionType.STATIC);
  h.session.fire(opening);assert.equal(h.world.propAggregate.body.getMotionType(),PhysicsMotionType.DYNAMIC);assert.equal(h.world.propAggregate.body.getMassProperties().mass,12);
  while(!h.session.last)h.step();const instant=structuredClone(h.session.last);assert.equal(instant.reason,'first-ground-contact');assert.equal(instant.settledEnvironment,null);assert.equal(h.world.status,'settling');assert.equal(h.session.flight.aggregate.body.getMotionType(),PhysicsMotionType.STATIC);assert.equal(h.session.flight.aggregate.shape.filterMembershipMask,0);assert.equal(h.session.fire(opening),false);
  const terminal=h.session.flight.mesh.position.asArray(),done=finish(h);assert.deepEqual(h.session.flight.mesh.position.asArray(),terminal);assert.ok(done.settleElapsed>done.elapsed+.49);assert.ok(pose(done)[2]>24.8);assert.notDeepEqual(done.endEnvironment,done.settledEnvironment);assert.equal(h.world.status,'ready');assert.equal(h.world.propAggregate.body.getMotionType(),PhysicsMotionType.STATIC);
 }finally{h.dispose();}
});

test('central and flank blows retain understandable movement across real adjacent controls',()=>{
 const h=persistenceHarness();try{
  for(const [yaw,side] of [[0,0],[-5,1],[5,-1]])for(const patch of [{},{yaw:yaw-.5},{yaw:yaw+.5},{elevation:7.5},{elevation:8.5},{charge:.54},{charge:.56}]){
   const r=h.shoot({...opening,yaw,...patch});assert.deepEqual(order(r),['guest-stone','guest-pavement']);assert.ok(r.settleElapsed<2.2);assert.ok(pose(r)[2]>24.1);
   if(side)assert.ok(pose(r)[0]*side>.1);else assert.ok(Math.abs(pose(r)[0])<.15);
  }
 }finally{h.dispose();}
});

test('the west bank adds side access; absent bank and clean miss retain negative evidence',()=>{
 const h=persistenceHarness(),bare=persistenceHarness({context:false});try{
  const setup={railIndex:1,yaw:-50,elevation:10,charge:.85},r=h.shoot(setup),control=bare.shoot(setup);
  assert.deepEqual(order(r),['guest-west-bank','guest-stone','guest-pavement']);assert.ok(pose(r)[0]>.7);assert.ok(!order(control).includes('guest-stone'));
  const miss=h.shoot({...opening,yaw:25});assert.ok(!order(miss).includes('guest-stone'));assert.ok(Math.hypot(pose(miss)[0],pose(miss)[2]-24)<1e-5);
 }finally{h.dispose();bare.dispose();}
});

test('successive physical blows reach the cradle; persistence changes later collision positions',()=>{
 const h=persistenceHarness();try{
  const records=[];for(let i=0;i<8;i++)records.push(h.shoot({...opening,elevation:5,charge:1},{reset:i===0}));
  assert.ok(pose(records[0])[2]<27);assert.ok(pose(records[6])[2]>40);assert.ok(pose(records[7])[2]<41);
  for(let i=1;i<records.length;i++)assert.deepEqual(records[i].environment,records[i-1].settledEnvironment);
  assert.ok(records[6].contacts[0].point.z-records[0].contacts[0].point.z>12);
  h.session.undo();assert.deepEqual(h.world.environment.snapshot(),records.at(-1).environment);
  h.session.reset();assert.deepEqual(h.world.environment.snapshot(),guestEnvironment(GUEST_STONE.home));
 }finally{h.dispose();}
});

test('fresh restore reproduces starting, terminal and settled states across equivalent frame partitions',()=>{
 const source=persistenceHarness();try{
  source.shoot(opening);const prior=source.world.environment.snapshot();const expected=source.shoot({...opening,yaw:1.5},{reset:false});
  for(const pattern of [[1000/30],[1000/60],[1000/144],[7,21,9,32]]){
   const h=persistenceHarness();try{
    h.world.environment.restore(prior);for(let i=0;i<360;i++)h.step();h.scene.onBeforePhysicsObservable.add(()=>h.session.beforeStep());h.scene.onAfterPhysicsObservable.add(()=>h.session.afterStep());h.session.fire(expected.setup);
    for(let i=0;i<20000&&!h.session.last?.settledEnvironment;i++)h.scene._advancePhysicsEngineStep(pattern[i%pattern.length]);assert.deepEqual(h.session.last,expected);
   }finally{h.dispose();}
  }
 }finally{source.dispose();}
});

test('post-settle pose remains fixed during long idle and invalid state is rejected atomically',()=>{
 const h=persistenceHarness();try{
  const r=h.shoot(opening),held=h.world.environment.snapshot();for(let i=0;i<3600;i++)h.step();assert.deepEqual(h.world.environment.snapshot(),held);
  for(const bad of [{...held,layout:'foreign'},{...held,pose:'[0,0,0,0,0,0,0]'},{...held,pose:'[0,2,24,0,0,0,2]'},{...held,pose:'bad'},{...held,url:'bad'}]){assert.throws(()=>h.world.environment.restore(bad));assert.deepEqual(h.world.environment.snapshot(),held);}
  h.session.restore(r);assert.deepEqual(h.world.environment.snapshot(),r.environment);assert.equal(h.session.flight,null);
 }finally{h.dispose();}
});

test('voluntary bounded Keep retains before, terminal and settled snapshots and never overwrites a full shelf',()=>{
 const h=persistenceHarness(),data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};try{
  const r=h.shoot(opening);assert.equal(validGuestRecord(r),true);const shelf=createGuestShelf(storage);for(let i=0;i<4;i++)assert.ok(shelf.keep(r,'test-build'));const bytes=data.get(GUEST_SHELF_KEY);assert.equal(shelf.keep(r,'test-build'),null);assert.equal(data.get(GUEST_SHELF_KEY),bytes);
  const loaded=createGuestShelf(storage);assert.deepEqual(loaded.entries(),shelf.entries());assert.deepEqual(loaded.entries()[0].record.settledEnvironment,r.settledEnvironment);
  assert.equal(validGuestRecord({...r,settledEnvironment:{layout:'foreign',pose:'[]'}}),false);assert.equal(validGuestRecord({...r,path:[[0,NaN,0,0]]}),false);
  data.set(GUEST_SHELF_KEY,'not json');const broken=createGuestShelf(storage);assert.ok(broken.keep(r,'test'));assert.equal(data.get(GUEST_SHELF_KEY),'not json');assert.match(broken.warning(),/original bytes/);
 }finally{h.dispose();}
});

test('repeated world load, fire, undo, reset and dispose release owned resources',()=>{
 for(let i=0;i<6;i++){const h=persistenceHarness();for(let j=0;j<4;j++){h.shoot(opening);h.session.undo();h.session.reset();assert.equal(h.scene.getPhysicsEngine().getBodies().length,11);assert.equal(h.scene.meshes.length,30);}h.session.dispose();h.world.dispose();assert.equal(h.scene.getPhysicsEngine().getBodies().length,0);assert.equal(h.scene.meshes.length,0);assert.equal(h.casters.size,0);h.root.dispose();h.scene.dispose();h.engine.dispose();}
});

test('retiring the terminal ball by collision masks matches removing its body entirely during stone settling',()=>{
 const masked=persistenceHarness(),removed=persistenceHarness();try{
  masked.session.fire({...opening,elevation:5,charge:1});removed.session.fire({...opening,elevation:5,charge:1});
  while(!masked.session.last)masked.step();while(!removed.session.last)removed.step();removed.session.flight.aggregate.dispose();
  const a=finish(masked),b=finish(removed);assert.deepEqual(a,b);assert.deepEqual(masked.world.environment.snapshot(),removed.world.environment.snapshot());
 }finally{masked.dispose();removed.dispose();}
});

test('Keep rejects falsified provenance, malformed physical rows and ablation layouts',()=>{
 const h=persistenceHarness(),bare=persistenceHarness({context:false});try{
  const record=h.shoot(opening),mutations=[
   r=>{r.station={id:'another-world',x:100,y:100,z:100,yaw:17};},
   r=>{r.setup.originX=Infinity;r.setup.script='code';},
   r=>{r.path.at(-1)[1]+=500;},r=>{r.path[1][0]=r.path[0][0];},
   r=>{r.impacts=[null];},r=>{r.evidence=[null];},r=>{r.stonePath=[];},
   r=>{r.stonePath[1][0]=r.stonePath[0][0];},r=>{r.stonePath.at(-1)[1]+=2;},
  ];
  for(const mutate of mutations){const bad=structuredClone(record);mutate(bad);assert.equal(validGuestRecord(bad),false);}
  assert.equal(validGuestRecord(bare.shoot(opening)),false);
 }finally{h.dispose();bare.dispose();}
});


test('adversarial post-terminal prop motion crosses a retired ball exactly as if its collider were removed',()=>{
 const results={};
 for(const mode of ['masked','removed','reenabled']){const h=persistenceHarness();try{
  h.session.fire(opening);while(!h.session.last)h.step();const ballPosition=h.session.flight.mesh.position.asArray();
  if(mode==='removed')h.session.flight.aggregate.dispose();
  if(mode==='reenabled'){h.session.flight.aggregate.shape.filterMembershipMask=0xffffffff;h.session.flight.aggregate.shape.filterCollideMask=0xffffffff;}
  // Test-only adversarial velocity: absent from gameplay and all design evidence.
  h.world.propAggregate.body.setLinearVelocity(new Vector3(0,0,-20));for(let i=0;i<90;i++)h.step();
  results[mode]={position:h.world.prop.position.asArray(),velocity:h.world.propAggregate.body.getLinearVelocity().asArray()};assert.deepEqual(h.session.flight.mesh.position.asArray(),ballPosition);
 }finally{h.dispose();}}
 assert.deepEqual(results.masked,results.removed);assert.ok(results.reenabled.position[2]-results.masked.position[2]>5);
});

test('Keep preserves the exact documented dirty-build provenance string',()=>{
 const h=persistenceHarness(),data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};try{
  const build='959805aa19aa417d506bf802e8864064a8ff2363-dirty',shelf=createGuestShelf(storage);shelf.keep(h.shoot(opening),build);assert.equal(createGuestShelf(storage).entries()[0].build,build);
 }finally{h.dispose();}
});
