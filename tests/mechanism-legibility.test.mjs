import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,FreeCamera,Ray} from '@babylonjs/core';
import {rangeLineReceipt,rangeLineEvents,createRangeDepartureMarkers,RANGE_EVENT_HOLD_MS} from '../lib/mechanism-range-legibility.js';
import {RANGE_CAMERA} from '../lib/mechanism-range.js';
import {mechanismHarness} from './helpers/mechanism-range-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const fixtures=JSON.parse(await readFile(new URL('./fixtures/mechanism-range-v01-authority.json',import.meta.url),'utf8')).cases;
const redirect=(label,feature)=>({kind:'redirect',label,feature,point:{x:7,y:1.8,z:44}});

test('an immediate ground ending preserves ordered qualified events independently of termination',()=>{
 const evidence=[redirect('SPLIT BENCH REBOUND','split-bench'),{kind:'contact',label:'NO TRICK'},redirect('TRANSFER TABLE REBOUND','transfer-table'),{kind:'rejected',label:'NOT A TRICK'}];
 const record={reason:'first-ground-contact',evidence};const frozen=JSON.stringify(record);
 const receipt=rangeLineReceipt(record);
 assert.deepEqual(receipt.events.map(e=>e.label),['SPLIT BENCH REBOUND','TRANSFER TABLE REBOUND']);
 assert.equal(receipt.terminal,'LINE ENDED — FIRST GROUND CONTACT');assert.equal(JSON.stringify(record),frozen);
 assert.deepEqual(rangeLineReceipt({reason:'first-ground-contact',evidence:evidence.filter(e=>e.kind!=='redirect')}).events,[]);
 assert.deepEqual(rangeLineEvents([{kind:'switch',state:'B'},...evidence,{kind:'switch',state:'A'}]).map(e=>e.label),['TRANSFER A → B · RAISED','SPLIT BENCH REBOUND','TRANSFER TABLE REBOUND','TRANSFER B → A · LEVEL']);
});
test('the real short bench line retains its rebound despite ground arriving within 0.3 seconds',()=>{
 const h=mechanismHarness(hv);try{
  h.session.fire(fixtures.find(f=>f.name==='bench'&&f.state==='A').setup);let seen=0,qualifiedAt=null;
  for(let i=0;i<7300&&!h.session.flight.ended;i++){h.step();for(const event of h.events.slice(seen))if(event.kind==='redirect')qualifiedAt=h.session.flight.elapsed;seen=h.events.length;}
  assert.ok(qualifiedAt!==null);assert.ok(h.session.last.elapsed-qualifiedAt<.3);
  const receipt=rangeLineReceipt(h.session.last);assert.equal(receipt.events[0].label,'SPLIT BENCH REBOUND');assert.equal(receipt.terminal,'LINE ENDED — FIRST GROUND CONTACT');
 }finally{h.dispose();}
});
test('only qualified redirects get finite-lived, non-physical departure markers',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),markers=createRangeDepartureMarkers(scene);try{
  for(const kind of ['contact','rejected','switch','end'])assert.equal(markers.add({kind,point:{x:0,y:0,z:0}},0),false);
  assert.equal(markers.add({kind:'redirect',point:{x:NaN,y:0,z:0}},0),false);assert.equal(markers.count,0);
  const event=redirect('TRANSFER TABLE REBOUND','transfer-table');assert.equal(markers.add(event,100),true);
  const root=scene.getMeshByName('mr-qualified-departure');assert.deepEqual(root.position.asArray(),[7,1.8,44]);
  assert.ok(scene.meshes.every(mesh=>!mesh.physicsBody&&!mesh.isPickable));markers.update(100+RANGE_EVENT_HOLD_MS-1);assert.equal(markers.count,1);
  markers.update(100+RANGE_EVENT_HOLD_MS);assert.equal(markers.count,0);assert.equal(scene.meshes.length,0);
  markers.add(event,0);markers.clear();assert.equal(markers.count,0);
 }finally{markers.dispose();scene.dispose();engine.dispose();}
});
test('v0.1 physical records remain byte-identical across bench, table, rack and switch families in A/B',()=>{
 const h=mechanismHarness(hv);try{
  for(const fixture of fixtures){h.world.mechanism.setState(fixture.state);const record=h.shoot(fixture.setup);
   assert.equal(createHash('sha256').update(JSON.stringify(record)).digest('hex'),fixture.sha256,`${fixture.state} ${fixture.name}`);
   assert.deepEqual(rangeLineReceipt(record).events.filter(e=>e.kind==='redirect').map(e=>e.feature),fixture.features);
  }
 }finally{h.dispose();}
});
test('drive linkage and far-wall finish add no physical/recognition authority; drive follows state',()=>{
 const h=mechanismHarness(hv);try{
  const added=h.scene.meshes.filter(m=>m.name.startsWith('mr-readability-'));
  assert.ok(added.length>10);assert.ok(added.every(m=>!m.physicsBody&&!m.metadata&&!m.isPickable));
  const count=h.scene.getPhysicsEngine().getBodies().length,control=h.world.mechanism.switchBody;
  for(const state of ['B','A']){h.world.mechanism.setState(state);h.scene.onBeforeRenderObservable.notifyObservers(h.scene);
   assert.equal(h.world.mechanism.switchBody,control);assert.equal(h.scene.getPhysicsEngine().getBodies().length,count);
   for(const name of ['drive-out','drive-long','drive-cross'])assert.equal(h.scene.getMeshByName('mr-readability-'+name).material,control.transformNode.material);
  }
  const face=h.scene.getMeshByName('mr-readability-return-face'),wall=h.world.features.get('return-wall');
  assert.equal(face.parent,wall);assert.deepEqual(face.position.asArray(),[-.722,0,0]);
  assert.equal(wall.position.x,38);assert.equal(wall.position.z,83);assert.ok(Math.abs(wall.rotationQuaternion.toEulerAngles().y+25*Math.PI/180)<.000001);
 }finally{h.dispose();}
});
test('existing return face has a clear launch sightline; multiple cross-space families remain distinct',()=>{
 const h=mechanismHarness(hv);try{
  new FreeCamera('test-camera',Vector3.FromArray(RANGE_CAMERA.address),h.scene);
  const face=h.scene.getMeshByName('mr-readability-return-face');for(const m of h.scene.meshes)m.computeWorldMatrix(true);
  const from=Vector3.FromArray(RANGE_CAMERA.address),to=Vector3.TransformCoordinates(new Vector3(0,6,0),face.computeWorldMatrix(true));
  const hit=h.scene.pickWithRay(new Ray(from,to.subtract(from).normalize(),Vector3.Distance(from,to)+1),m=>Boolean(m.physicsBody));
  assert.equal(hit?.pickedMesh?.name,'mr-return-wall');
  const named=(state,name)=>fixtures.find(f=>f.state===state&&f.name===name);
  assert.deepEqual(named('A','low').features,['transfer-table','rack-low']);assert.deepEqual(named('B','middle').features,['transfer-table','rack-middle']);
  assert.deepEqual(named('A','rack').features,['return-wall']);assert.deepEqual(named('A','table').features,['transfer-table'],'a table rebound is not automatically routed to the rack');
 }finally{h.dispose();}
});
test('result/live wiring preserves blind brief and never substitutes raw contacts for qualified feedback',async()=>{
 const ui=await readFile(new URL('../app/lab/mechanism-range/range.tsx',import.meta.url),'utf8');
 assert.match(ui,/rangeLineReceipt\(last\)/);assert.match(ui,/receipt.events.map/);assert.match(ui,/receipt.terminal/);
 assert.match(ui,/RANGE_EVENT_HOLD_MS/);assert.match(ui,/departureMarkers.add\(event/);
 assert.doesNotMatch(ui,/setCaption\(\(event.reason|Shoot the control|one shared machine/);
 assert.match(ui,/if\(event.kind==='switch'\)setDiscovered\(true\)/);assert.match(ui,/feedback&&/);
});
