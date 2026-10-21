import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, PhysicsMotionType, DirectionalLight, ShadowGenerator, Logger } from '@babylonjs/core';
import { RAIL_RULES, chargeToSpeed } from '../lib/rail-golf-v02.js';
import { REDIRECT_GATES } from '../lib/line-recognition.js';
import { createStarterWorld, createEmptyWorld, exportWorldJSON, parseWorldJSON, WORLDCRAFT_CATALOG, worldcraftIdentity, captureWorldSnapshot, packWorldcraftLine } from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime, WORLDCRAFT_SAMPLE_LIMIT } from '../lib/worldcraft-runtime.js';
import { worldcraftMuzzleClearance, WORLDCRAFT_CONTACTS } from '../lib/worldcraft-scene.js';
import { mechanismHarness } from './helpers/mechanism-range-physics.mjs';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const BANK = Object.freeze({ railIndex: 1, originX: 0, yaw: -18, elevation: 15, charge: .7 });
const RAMP = Object.freeze({ railIndex: 1, originX: 0, yaw: 5, elevation: 20, charge: .65 });
const redirects = record => record.evidence.filter(event => event.kind === 'redirect');
const features = record => redirects(record).map(event => event.feature);
const distance = (a,b) => Math.hypot(...a.map((value,i) => value-b[i]));

function harness(world = createStarterWorld({ id: 'physics-starter' })) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0), new HavokPlugin(true,havok));
  const physics = scene.getPhysicsEngine(); physics.setTimeStep(1/120); physics.setSubTimeStep(1000/120);
  const light = new DirectionalLight('fixture-sun',new Vector3(-.4,-1,.3),scene), shadows = new ShadowGenerator(256,light);
  const events = [], runtime = createWorldcraftRuntime(scene,{ world, shadows, build: '4a2be209', onEvent: event => events.push(event) });
  return { engine, scene, physics, shadows, runtime, events,
    step() { runtime.beforeStep(); physics._step(1/120); runtime.afterStep(); },
    shoot(setup) {
      runtime.clearShot(); assert.equal(runtime.setMode('play'),true); assert.equal(runtime.launch(setup),true,runtime.error);
      for (let i=0;i<7300 && !runtime.flight.ended;i++) this.step();
      assert.ok(runtime.last,'shot resolves within shared safety limit'); return runtime.last;
    },
    replace(world) { assert.equal(runtime.setMode('build'),true); assert.deepEqual(runtime.replaceWorld(world),{ok:true}); },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}

test('Worldcraft compiles exact catalog boxes with existing coefficients and unchanged launcher/projectile authority', () => {
  const h = harness();
  try {
    assert.equal(h.runtime.diagnostics().staticBodies,5);
    for (const record of h.runtime.world.objects) {
      const mesh = h.runtime.objectMeshes.get(record.id), prefab = WORLDCRAFT_CATALOG[record.kind];
      assert.equal(mesh.physicsBody.getMotionType(),PhysicsMotionType.STATIC);
      assert.deepEqual(mesh.position.asArray(),[record.x,prefab.centerY,record.z]);
      const bounds = mesh.getBoundingInfo().boundingBox;
      for (const [actual,expected] of bounds.extendSize.asArray().map((value,i) => [value*2,[prefab.width,prefab.height,prefab.depth][i]])) assert.ok(Math.abs(actual-expected)<1e-6);
      const rotation = mesh.rotationQuaternion.toEulerAngles();
      assert.ok(Math.abs(rotation.x-prefab.pitch*Math.PI/180)<1e-6); assert.ok(Math.abs(rotation.y-record.yaw*Math.PI/180)<1e-6);
      assert.equal(mesh.physicsBody.shape.material.restitution,prefab.restitution);
      assert.equal(mesh.physicsBody.shape.material.friction,prefab.friction);
      assert.equal(mesh.metadata.worldcraftId,record.id); assert.equal(mesh.metadata.cascadeStep,undefined);
    }
    assert.deepEqual(WORLDCRAFT_CONTACTS.block,{mass:0,restitution:.1,friction:.8});
    assert.deepEqual(REDIRECT_GATES,{minIncomingSpeed:4,minOutgoingSpeed:3,minTurnDegrees:25,maxContactSeconds:.12,freeSeconds:.10,minSeparation:1,maxWaitSeconds:.65,minReturnHorizontalSpeed:3,minReturnTurnDegrees:120});
    h.runtime.setMode('play'); const setup = {...BANK,originX:3.5}; assert.equal(h.runtime.launch(setup),true);
    const flight = h.runtime.flight, velocity = flight.aggregate.body.getLinearVelocity();
    assert.equal(flight.aggregate.body.getMassProperties().mass,1.5);
    assert.equal(flight.aggregate.shape.material.restitution,.38); assert.equal(flight.aggregate.shape.material.friction,.28);
    const incumbent = mechanismHarness(havok);
    try {
      incumbent.session.fire(setup);
      assert.deepEqual(velocity.asArray(),incumbent.session.flight.aggregate.body.getLinearVelocity().asArray(),'exact incumbent Havok launch velocity');
      assert.ok(Math.abs(velocity.length()-chargeToSpeed(setup.charge))<.1,'same nominal tolerance as the incumbent Havok fixtures');
    } finally { incumbent.dispose(); }
    assert.ok(Math.abs(flight.mesh.position.x-(3.5+Math.sin(setup.yaw*Math.PI/180)*Math.cos(setup.elevation*Math.PI/180)*5.18))<1e-6,'origin is not combined with an extra legacy rail offset');
    const radius = flight.mesh.getBoundingInfo().boundingBox.extendSize.x; assert.ok(Math.abs(radius-.43)<1e-6);
    h.step(); assert.ok(Math.abs(flight.aggregate.body.getLinearVelocity().y-(velocity.y-12/120))<.001);
  } finally { h.dispose(); }
});

test('starter bank return and ramp rise each support a neighborhood of qualified real Havok departures', () => {
  const h = harness();
  try {
    for (const [base,feature] of [[BANK,'bank-1'],[RAMP,'ramp-1']]) for (const yawOffset of [-1,0,1]) for (const chargeOffset of [-.02,0,.02]) {
      const record = h.shoot({...base,yaw:base.yaw+yawOffset,charge:base.charge+chargeOffset});
      assert.ok(features(record).includes(feature)); assert.equal(record.reason,'first-ground-contact');
      const redirect = redirects(record).find(event => event.feature===feature);
      assert.ok(record.contacts.some(contact => contact.body===redirect.body));
      assert.ok(redirect.turn>=25 && redirect.freeSeconds>=.10 && redirect.separation>=1);
      if (feature==='bank-1') assert.ok(redirect.outgoing.z<0,'vertical face redirects back across the approach');
      else assert.ok(redirect.incoming.y<0 && redirect.outgoing.y>15,'descending round leaves the pitched ramp upward without a scripted boost');
      assert.equal('score' in record,false);
    }
  } finally { h.dispose(); }
});

test('rotating a bank and positioning a dull block intentionally change outcomes with launch setup held fixed', () => {
  const h = harness();
  try {
    const starter = h.runtime.world, beforeBank = h.shoot(BANK);
    h.replace({...starter,objects:starter.objects.map(object => object.id==='bank-1'?{...object,yaw:40}:object)});
    const rotated = h.shoot(BANK);
    assert.deepEqual(features(beforeBank),['bank-1']); assert.deepEqual(features(rotated),['bank-1']);
    assert.deepEqual(rotated.setup,beforeBank.setup); assert.ok(distance(rotated.position,beforeBank.position)>9);
    h.replace(starter); const beforeRamp = h.shoot(RAMP);
    h.replace({...starter,objects:starter.objects.map(object => object.id==='block-1'?{...object,x:10,z:86}:object)});
    const placed = h.shoot(RAMP);
    assert.deepEqual(placed.setup,beforeRamp.setup);
    assert.deepEqual(features(beforeRamp),['ramp-1']); assert.deepEqual(features(placed),['ramp-1','block-1']);
    assert.ok(placed.contacts.some(contact => contact.body==='worldcraft-object-block-1'));
    assert.ok(distance(placed.position,beforeRamp.position)>12); assert.equal(placed.reason,'first-ground-contact');
    assert.equal(h.runtime.objectMeshes.get('block-1').physicsBody.shape.material.restitution,.1,'composition retains the dull block material');
    assert.notEqual(placed.worldIdentity,beforeRamp.worldIdentity);
    assert.equal(beforeRamp.world.objects.find(object => object.id==='block-1').x,18,'prior evidence retains the fired world');
  } finally { h.dispose(); }
});

test('unchanged layout/setup repeats after JSON reload and browser physics-observable stepping', () => {
  const a = harness(), b = harness();
  try {
    const first = a.shoot(RAMP), repeated = a.shoot(RAMP);
    assert.deepEqual(repeated.setup,first.setup); assert.deepEqual(features(repeated),features(first));
    assert.ok(distance(repeated.position,first.position)<.001);
    a.replace(parseWorldJSON(exportWorldJSON(a.runtime.world))); const loaded = a.shoot(RAMP);
    assert.equal(loaded.worldIdentity,first.worldIdentity); assert.deepEqual(features(loaded),features(first)); assert.ok(distance(loaded.position,first.position)<.001);
    b.scene.onBeforePhysicsObservable.add(()=>b.runtime.beforeStep()); b.scene.onAfterPhysicsObservable.add(()=>b.runtime.afterStep());
    b.runtime.setMode('play'); b.runtime.launch(RAMP);
    for (let i=0;i<7300&&!b.runtime.flight.ended;i++) b.scene._advancePhysicsEngineStep(1000/120);
    assert.deepEqual(features(b.runtime.last),features(first)); assert.equal(b.runtime.last.reason,first.reason);
    assert.ok(distance(b.runtime.last.position,first.position)<.001);
  } finally { a.dispose(); b.dispose(); }
});

test('stored trail is bounded actual history with immutable fired-world/setup and exact terminal samples', () => {
  const h = harness();
  try {
    const input = {...RAMP}; h.runtime.setMode('play'); h.runtime.launch(input);
    const actual = new Map([[0,h.runtime.flight.mesh.position.asArray()]]);
    input.yaw=50;
    while (!h.runtime.flight.ended) { h.step(); actual.set(h.runtime.flight.elapsed,h.runtime.flight.mesh.position.asArray()); }
    const record = h.runtime.last;
    assert.deepEqual(record.setup,RAMP); assert.equal(record.worldIdentity,worldcraftIdentity(record.world));
    assert.ok(Object.isFrozen(record)&&Object.isFrozen(record.world.objects)&&Object.isFrozen(record.setup));
    assert.ok(record.samples.length>100 && record.samples.length<=WORLDCRAFT_SAMPLE_LIMIT);
    assert.deepEqual(record.samples[0],{t:0,...record.launch.muzzle});
    for (const sample of record.samples) assert.deepEqual([sample.x,sample.y,sample.z],actual.get(sample.t));
    const last = record.samples.at(-1);
    assert.equal(last.t,record.elapsed); assert.deepEqual([last.x,last.y,last.z],record.terminal.position);
    assert.equal(record.build,'4a2be209');
    assert.equal(h.events.filter(event=>event.kind==='end').length,1);
  } finally { h.dispose(); }
});

test('Build and Play guards reject live edits, invalid launches and stale actions while preserving the active world', () => {
  const h = harness();
  try {
    assert.equal(h.runtime.launch(RAMP),false,'cannot fire in Build');
    const original = h.runtime.world, bodyIds = [...h.runtime.objectMeshes.values()].map(mesh=>mesh.uniqueId);
    assert.equal(h.runtime.replaceWorld({...original,objects:[{...original.objects[0],x:NaN}]}).ok,false);
    assert.equal(h.runtime.world,original); assert.deepEqual([...h.runtime.objectMeshes.values()].map(mesh=>mesh.uniqueId),bodyIds);
    h.runtime.setMode('play');
    for (const patch of [{originX:Infinity},{originX:10.5},{originX:.1},{railIndex:0},{yaw:71},{elevation:4},{charge:1.01}]) assert.equal(h.runtime.launch({...RAMP,...patch}),false);
    assert.equal(h.runtime.launch(RAMP),true); h.step();
    assert.equal(h.runtime.launch(BANK),false); assert.equal(h.runtime.setMode('build'),false);
    assert.equal(h.runtime.replaceWorld(original).ok,false); assert.equal(h.runtime.world,original);
    h.runtime.clearShot(); assert.equal(h.runtime.last.reason,'interrupted'); assert.equal(h.runtime.flight,null);
    assert.equal(h.runtime.setMode('build'),true); assert.deepEqual(h.runtime.replaceWorld(original),{ok:true});
    assert.equal(h.runtime.last,null,'edited-world sessions cannot recall stale records');
    const eventsBefore = h.events.length;
    h.runtime.dispose(); h.runtime.dispose(); h.runtime.beforeStep(); h.physics._step(1/120); h.runtime.afterStep();
    assert.equal(h.runtime.launch(RAMP),false); assert.equal(h.runtime.replaceWorld(original).ok,false);
    assert.equal(h.events.length,eventsBefore); assert.equal(h.physics.getBodies().length,0);
  } finally { h.dispose(); }
});

test('an interrupted real contact can be kept with its rejection diagnostic, raw contacts and exact launch provenance', () => {
  const h = harness();
  try {
    h.runtime.setMode('play'); h.runtime.launch(BANK);
    for (let i=0;i<1000 && !h.runtime.flight.contacts.length;i++) h.step();
    assert.ok(h.runtime.flight.contacts.length); h.runtime.clearShot();
    const record=h.runtime.last;
    assert.equal(record.reason,'interrupted');
    assert.ok(record.evidence.some(event=>event.kind==='rejected'&&event.reason==='shot-ended-before-free-flight'));
    const line=packWorldcraftLine({worldSnapshot:captureWorldSnapshot(record.world,record.build),setup:record.setup,
      launch:record.launch,contacts:record.contacts,points:record.samples,events:record.evidence,terminal:record.terminal});
    assert.deepEqual(line.setup,record.setup); assert.deepEqual(line.launch,record.launch); assert.deepEqual(line.contacts,record.contacts);
    assert.equal(line.events[0].reason,'shot-ended-before-free-flight');
    assert.equal(Object.hasOwn(line.events[0],'freeSeconds'),false,'absent optional measurements remain absent, not fabricated');
    assert.deepEqual(line.points.at(-1),record.samples.at(-1));
  } finally { h.dispose(); }
});

test('muzzle sphere clearance uses oriented physical extents and rejects overlap and out-of-bounds starts', () => {
  const h = harness();
  try {
    const mesh = h.runtime.objectMeshes.get('bank-1'), sceneView = {meshes:[mesh]};
    const inside = Vector3.TransformCoordinates(new Vector3(0,0,0),mesh.computeWorldMatrix(true));
    assert.equal(worldcraftMuzzleClearance(sceneView,inside).ok,false);
    const nearFace = Vector3.TransformCoordinates(new Vector3(0,0,.5+.42),mesh.getWorldMatrix());
    assert.equal(worldcraftMuzzleClearance(sceneView,nearFace).ok,false,'sphere radius matters outside the visual face');
    const outsideFace = Vector3.TransformCoordinates(new Vector3(0,0,.5+.6),mesh.getWorldMatrix());
    assert.equal(worldcraftMuzzleClearance(sceneView,outsideFace).ok,true);
    assert.equal(worldcraftMuzzleClearance(sceneView,{x:31.8,y:3,z:20}).ok,false);
    assert.equal(worldcraftMuzzleClearance(sceneView,{x:0,y:.2,z:20}).ok,false);
    assert.equal(worldcraftMuzzleClearance(sceneView,{x:NaN,y:3,z:20}).ok,false);
    // A stale/corrupt presentation transform must never permit an overlapping launch.
    h.runtime.setMode('play');
    mesh.position.set(0,3.5,4); mesh.computeWorldMatrix(true);
    assert.equal(h.runtime.launch({...RAMP,yaw:0,elevation:15}),false);
    assert.equal(h.runtime.flight,null);
  } finally { h.dispose(); }
});

test('twelve maximum-size layout replacements release old bodies/casters and keep shared assets bounded', () => {
  const h = harness();
  try {
    const base = createEmptyWorld({id:'maximum-world'});
    const objects = [-22.5,-7.5,7.5,22.5].flatMap((x,col)=>[22,50,80].map((z,row)=>({id:`piece-${col}-${row}`,kind:['bank','ramp','block'][(col+row)%3],x,z,yaw:0})));
    const materials = h.scene.materials.map(material=>material.uniqueId), textures = h.scene.textures.map(texture=>texture.uniqueId);
    const callbacks = [h.scene.onBeforePhysicsObservable.observers.length,h.scene.onAfterPhysicsObservable.observers.length];
    let maximumRebuildMs=0;
    for (let edit=0;edit<12;edit++) {
      const priorMeshes=[...h.runtime.objectMeshes.values()],priorBodies=priorMeshes.map(mesh=>mesh.physicsBody);
      h.replace({...base,objects:objects.map((object,i)=>i===0?{...object,yaw:edit%2?5:0}:object)});
      const d=h.runtime.diagnostics();maximumRebuildMs=Math.max(maximumRebuildMs,d.rebuildMs);
      assert.equal(d.objectCount,12); assert.equal(d.staticBodies,14); assert.equal(d.physicsBodies,14); assert.equal(d.meshes,14);
      assert.equal(d.shadowCasters,13,'floor receives shadows but is not an extra caster');
      assert.deepEqual(h.scene.materials.map(material=>material.uniqueId),materials); assert.deepEqual(h.scene.textures.map(texture=>texture.uniqueId),textures);
      assert.ok(priorBodies.every(body=>body.isDisposed)); assert.ok(priorMeshes.every(mesh=>mesh.isDisposed()));
      assert.deepEqual([h.scene.onBeforePhysicsObservable.observers.length,h.scene.onAfterPhysicsObservable.observers.length],callbacks);
    }
    assert.ok(Number.isFinite(maximumRebuildMs)&&maximumRebuildMs>0,'diagnostics measure full synchronous replacement');
    assert.equal(h.runtime.diagnostics().rebuildCount,13);
    h.runtime.dispose(); assert.equal(h.physics.getBodies().length,0); assert.equal(h.shadows.getShadowMap().renderList.length,0);
    assert.equal(h.scene.meshes.length,0); assert.equal(h.scene.materials.length,0);
  } finally { h.dispose(); }
});

test('House Shot miss–turn–clear uses the same real launch; rules survive retry, load and rejected fixed edits', async () => {
  const {createHouseShotWorld,worldcraftFixedSetup}=await import('../lib/worldcraft-model.js');
  const world=createHouseShotWorld(),setup=worldcraftFixedSetup(world),h=harness(world);
  try {
    h.runtime.setMode('play');
    for(const patch of [{originX:.5},{yaw:5},{elevation:20},{charge:.7}])assert.equal(h.runtime.launch({...setup,...patch}),false);
    const before=h.shoot(setup);
    assert.equal(before.pinResult.status,'miss'); assert.ok(Math.abs(before.position[2]-69.7659)<.001);
    const results=[];
    for(const yaw of [5,10,15,20,25,30]){
      h.replace({...world,objects:[{...world.objects[0],yaw}]});
      const after=h.shoot(setup); results.push([yaw,after.pinResult.status]);
      assert.deepEqual(after.setup,before.setup); assert.deepEqual(after.launch,before.launch);
      assert.ok(after.position[0]<0,'positive surface yaw sends the round left in world coordinates');
      assert.equal(after.terminal.reason,'first-ground-contact');
      if(yaw===20){
        assert.ok(after.pinResult.distance<.5); assert.notEqual(after.worldIdentity,before.worldIdentity);
        const line=packWorldcraftLine({worldSnapshot:captureWorldSnapshot(after.world,after.build),setup:after.setup,launch:after.launch,contacts:after.contacts,points:after.samples,events:after.evidence,terminal:after.terminal});
        assert.deepEqual(line.worldSnapshot.world.rules,world.rules);
        h.replace(parseWorldJSON(exportWorldJSON(after.world)));
        assert.ok(distance(h.shoot(setup).position,after.position)<.001);
      }
    }
    assert.deepEqual(results,[[5,'miss'],[10,'miss'],[15,'clear'],[20,'clear'],[25,'clear'],[30,'miss']]);
    assert.equal(before.world.objects[0].yaw,0,'retained pre-edit record remains immutable');
    h.runtime.clearShot();h.runtime.launch(setup);h.step();h.runtime.clearShot();
    assert.deepEqual(h.runtime.last.pinResult,{status:'unfinished',distance:null});
    h.runtime.setMode('build');
    const fixed={...world,rules:{...world.rules,locked:['ramp-yours'],allowance:{}}};
    assert.equal(h.runtime.replaceWorld(fixed,{intent:'load'}).ok,true);
    const meshes=[...h.runtime.objectMeshes.values()];
    for(const patch of [{rules:null},{objects:[{...world.objects[0],yaw:10}]}])assert.equal(h.runtime.replaceWorld({...fixed,...patch}).ok,false);
    assert.deepEqual([...h.runtime.objectMeshes.values()],meshes,'rejected edits retain physical bodies');
    assert.equal(h.runtime.replaceWorld(createStarterWorld(),{intent:'load'}).ok,true);
    assert.equal(h.shoot(BANK).pinResult,null,'an explicit sandbox load removes challenge result authority');
  } finally {h.dispose();}
});

test('Orc Loop resets a kinematic stand-in, misses by default, and repeats a ramp steer and a bank redirect', async () => {
  const {createOrcLoopWorld,worldcraftFixedSetup,worldcraftTargetPose,validateWorld}=await import('../lib/worldcraft-model.js');
  const world=createOrcLoopWorld(),setup=worldcraftFixedSetup(world);
  const layout=(ramp,bank,delay)=>validateWorld({...world,objects:world.objects.map(object=>object.id==='ramp-yours'?{...object,...ramp}:object.id==='bank-yours'?{...object,...bank}:object),timing:{delay}});
  const rampHit=layout({yaw:-10},{x:16,z:56,yaw:0},3);
  const bankHit=layout({yaw:0},{x:-6,z:66,yaw:-25},0);
  const signature=record=>({status:record.pinResult.status,reason:record.reason,position:record.position.map(value=>Math.round(value*1e6)/1e6),contacts:record.contacts.map(contact=>({body:contact.body,count:contact.count,first:Math.round(contact.first*1e6)/1e6,last:Math.round(contact.last*1e6)/1e6,point:{x:Math.round(contact.point.x*1e6)/1e6,y:Math.round(contact.point.y*1e6)/1e6,z:Math.round(contact.point.z*1e6)/1e6}}))});
  const a=harness(world),b=harness(world);
  try {
    a.runtime.setMode('play'); assert.equal(a.runtime.launch(setup),true);
    const pose=worldcraftTargetPose(world.rules.target,0);
    assert.ok(Math.hypot(a.runtime.targetMesh.position.x-pose.x,a.runtime.targetMesh.position.y-pose.y,a.runtime.targetMesh.position.z-pose.z)<1e-4,'phase snaps back at fire');
    assert.equal(a.runtime.targetMesh.physicsBody.getMotionType(),PhysicsMotionType.ANIMATED);
    for (let i=0;i<1200&&!a.runtime.flight.ended;i++) a.step();
    const first=a.runtime.last;
    assert.equal(first.pinResult.status,'miss');
    assert.equal(first.pinResult.goal,'orc');
    assert.equal(first.contacts.some(contact=>contact.body==='worldcraft-target-orc'),false);
    const second=a.shoot(setup);
    assert.deepEqual(signature(second),signature(first));
    assert.deepEqual(signature(b.shoot(setup)),signature(first));
    a.replace(rampHit);
    const steered=a.shoot(setup),steeredAgain=a.shoot(setup);
    assert.equal(steered.pinResult.status,'clear');
    assert.deepEqual(steered.contacts.map(contact=>contact.body),['worldcraft-object-ramp-yours','worldcraft-target-orc','worldcraft-ground']);
    assert.deepEqual(signature(steeredAgain),signature(steered));
    a.replace(bankHit);
    const kicked=a.shoot(setup),kickedAgain=a.shoot(setup);
    assert.equal(kicked.pinResult.status,'clear');
    assert.deepEqual(kicked.contacts.map(contact=>contact.body),['worldcraft-object-ramp-yours','worldcraft-object-bank-yours','worldcraft-target-orc','worldcraft-ground']);
    assert.ok(kicked.contacts.find(contact=>contact.body==='worldcraft-target-orc').first>kicked.contacts.find(contact=>contact.body==='worldcraft-object-bank-yours').first);
    assert.deepEqual(signature(kickedAgain),signature(kicked));
    assert.deepEqual(signature(b.shoot(setup)),signature(first),'the other runtime is still on the untouched default');
  } finally { a.dispose(); b.dispose(); }
});
