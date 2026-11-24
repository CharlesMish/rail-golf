import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsShapeType} from '@babylonjs/core';
import {architectureHarness} from '../scripts/playgrounds/architecture-harness.mjs';
import {EXCHANGE_CASES,exchangeNeighbours,retainsRelationship} from '../scripts/places/architecture-measure.mjs';
import {PLACES_ARCHITECTURE,EXCHANGE_SOLIDS,EXCHANGE_GROUND,EXCHANGE_STATIONS,EXCHANGE_LAYOUT,buildExchangeYard} from '../lib/places-architecture.js';
import {RAIL_RULES} from '../lib/rail-golf-v02.js';
import {spatialLaunch} from '../lib/spatial-lab-session.js';
import {createPlaygroundShelf,validPlaygroundEntry} from '../lib/playgrounds-shelf.js';

const physical=r=>[r.record.reason,r.record.elapsed,r.record.position,r.record.contacts,r.path];
const pathFor=(r)=>{const p=spatialLaunch(PLACES_ARCHITECTURE,r.record.setup).muzzle;return [[0,p.x,p.y,p.z],...r.path.map(p=>p.slice(0,4))];};

test('Exchange solids use the visible box and gabled-prism geometry, with unchanged stock authority',()=>{
 const h=architectureHarness(PLACES_ARCHITECTURE);try{
  assert.deepEqual([RAIL_RULES.projectileMass,RAIL_RULES.projectileRadius,RAIL_RULES.gravity,RAIL_RULES.minSpeed,RAIL_RULES.maxSpeed],[1.5,.43,12,6,43]);
  const records=[EXCHANGE_GROUND,...EXCHANGE_SOLIDS];assert.equal(h.world.bodies.length,records.length);
  for(const r of records){const mesh=h.world.meshes.find(m=>m.name==='exchange-'+r.id),body=h.world.bodies.find(a=>a.body.transformNode===mesh);assert.ok(mesh&&body,r.id);assert.deepEqual(mesh.position.asArray(),[r.x,r.y,r.z]);assert.equal(body.shape.type,r.shape==='gable'?PhysicsShapeType.CONVEX_HULL:PhysicsShapeType.BOX);assert.deepEqual(body.shape.material,{friction:r.ground?.8:.18,restitution:r.ground?.1:.86});
   mesh.computeWorldMatrix(true);const bounds=mesh.getBoundingInfo().boundingBox;assert.deepEqual(bounds.minimum.asArray(),[-r.w/2,r.shape==='gable'?0:-r.h/2,-r.d/2]);assert.deepEqual(bounds.maximum.asArray(),[r.w/2,r.shape==='gable'?r.h:r.h/2,r.d/2]);assert.equal(Boolean(mesh.metadata.rangeGround),Boolean(r.ground));
  }
  assert.equal(h.resources().dynamicBodies,0);assert.equal(h.resources().staticBodies,records.length);
  assert.equal(h.scene.meshes.filter(m=>m.name.startsWith('exchange-painted-')).length,3);
  assert.equal(h.casters.size,EXCHANGE_SOLIDS.length);
 }finally{h.dispose();}
});

test('one ordinary power supports a real underpass, front interception and top landing',()=>{
 const h=architectureHarness(PLACES_ARCHITECTURE);try{
  const under=h.shoot(EXCHANGE_CASES['underpass-short']),front=h.shoot(EXCHANGE_CASES['viaduct-face']),top=h.shoot(EXCHANGE_CASES['viaduct-top']);
  for(const [name,result]of [['underpass-short',under],['viaduct-face',front],['viaduct-top',top]]){assert.equal(retainsRelationship(name,result),true,name);assert.equal(result.record.reason,'first-ground-contact');assert.equal(result.record.contacts.at(-1).body,'exchange-street');}
  assert.ok(under.record.position[2]>front.record.position[2]);assert.ok(top.record.position[2]>under.record.position[2]);
  const absent=architectureHarness({...PLACES_ARCHITECTURE,buildWorld:(...args)=>buildExchangeYard(...args,{solids:EXCHANGE_SOLIDS.filter(s=>s.region!=='viaduct')})});
  try{const delivery=h.shoot(EXCHANGE_CASES['underpass-delivery']),same=absent.shoot(EXCHANGE_CASES['underpass-delivery']);assert.deepEqual(physical(same),physical(delivery));for(const id of ['viaduct-face','viaduct-top'])assert.notDeepEqual(physical(absent.shoot(EXCHANGE_CASES[id])),physical(h.shoot(EXCHANGE_CASES[id])));}finally{absent.dispose();}
 }finally{h.dispose();}
});

test('roof return and cross-yard receiving families survive nearby legal controls, with honest negative cases',()=>{
 const h=architectureHarness(PLACES_ARCHITECTURE);try{
  for(const id of ['underpass-delivery','viaduct-top','roof-return','service-hall','service-gallery','service-roof']){assert.equal(retainsRelationship(id,h.shoot(EXCHANGE_CASES[id])),true,id);for(const n of exchangeNeighbours(EXCHANGE_CASES[id]))assert.equal(retainsRelationship(id,h.shoot(n.setup)),true,`${id} ${n.change}`);}
  const fragile=exchangeNeighbours(EXCHANGE_CASES['roof-to-gallery']).map(n=>retainsRelationship('roof-to-gallery',h.shoot(n.setup)));assert.equal(fragile.filter(Boolean).length,0); // The removed eave also removes this formerly fragile transfer.
  assert.equal(h.shoot(EXCHANGE_CASES['short-ground']).record.contacts.length,1);
  assert.equal(h.shoot(EXCHANGE_CASES['open-sky-exit']).record.reason,'out-of-bounds');
  const formerPocket=h.shoot(EXCHANGE_CASES['slow-gallery']);assert.equal(formerPocket.record.reason,'first-ground-contact');assert.ok(formerPocket.record.elapsed<15);
  const overhung=architectureHarness({...PLACES_ARCHITECTURE,buildWorld:(...args)=>buildExchangeYard(...args,{solids:EXCHANGE_SOLIDS.map(s=>s.id==='west-store-roof'?{...s,w:12}:s)})});try{const trapped=overhung.shoot(EXCHANGE_CASES['slow-gallery']);assert.equal(trapped.record.reason,'settled');assert.ok(trapped.record.elapsed>20);assert.ok(trapped.impacts.some(c=>c.body==='exchange-west-store-roof'&&c.incoming[1]>2&&Math.abs(c.normal[1])>.95));assert.equal(formerPocket.impacts.some(c=>c.body==='exchange-west-store-roof'),false);}finally{overhung.dispose();}
  const roofless=architectureHarness({...PLACES_ARCHITECTURE,buildWorld:(...args)=>buildExchangeYard(...args,{solids:EXCHANGE_SOLIDS.filter(s=>s.id!=='station-roof')})});try{assert.equal(roofless.shoot(EXCHANGE_CASES['roof-return']).record.reason,'out-of-bounds');assert.equal(roofless.shoot(EXCHANGE_CASES['service-roof']).record.reason,'out-of-bounds');}finally{roofless.dispose();}
 }finally{h.dispose();}
});

test('both freely selected stations keep and restore exact independent launch provenance',()=>{
 const h=architectureHarness(PLACES_ARCHITECTURE),other=architectureHarness(PLACES_ARCHITECTURE),data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},contract={...PLACES_ARCHITECTURE.playground,station:PLACES_ARCHITECTURE.station},shelf=createPlaygroundShelf(contract,storage);
 try{
  assert.equal(EXCHANGE_STATIONS.length,2);assert.throws(()=>spatialLaunch(PLACES_ARCHITECTURE,{...PLACES_ARCHITECTURE.defaultSetup,carriageMode:'unknown'}));
  for(const id of ['roof-return','service-gallery']){const first=h.shoot(EXCHANGE_CASES[id]);const kept=shelf.keep(first.record,pathFor(first),'60f3e07');assert.ok(kept);assert.equal(kept.layout,EXCHANGE_LAYOUT);assert.equal(kept.record.station.id,kept.record.setup.carriageMode);assert.equal(validPlaygroundEntry(kept,contract),true);
   const rejected=first.record.evidence.find(e=>e.kind==='rejected');assert.ok(rejected);assert.ok(Object.hasOwn(rejected,'outgoing'));assert.equal(rejected.outgoing,undefined);assert.deepEqual(kept.record,JSON.parse(JSON.stringify(first.record)));
   for(const corrupt of [entry=>{entry.record.evidence[0].unapprovedUndefined=undefined;},entry=>{entry.record.evidence[0].members.push(undefined);},entry=>{entry.record.evidence[0].incoming.x=NaN;}]){const malformed=structuredClone(kept);corrupt(malformed);assert.equal(validPlaygroundEntry(malformed,contract),false);assert.throws(()=>shelf.keep(malformed.record,malformed.path,'60f3e07'));}
   const restored=createPlaygroundShelf(contract,storage).get(kept.id);other.world.environment.restore(restored.record.environment);assert.deepEqual(other.shoot(restored.record.setup),first);
   const forged=structuredClone(kept);forged.record.setup.carriageMode=id==='roof-return'?'service':'forecourt';assert.equal(validPlaygroundEntry(forged,contract),false);
   const foreign=structuredClone(kept);foreign.layout='playgrounds-ringwell-v1';assert.equal(validPlaygroundEntry(foreign,contract),false);
  }
  h.session.action('reset');assert.equal(h.session.flight,null);assert.equal(h.resources().dynamicBodies,0);assert.deepEqual(h.world.environment.snapshot(),{layout:EXCHANGE_LAYOUT});
 }finally{h.dispose();other.dispose();}
});

test('fire, stop, reset, rebuild and station-switch lifecycles release all owned bodies and render resources',()=>{
 for(let cycle=0;cycle<3;cycle++){const h=architectureHarness(PLACES_ARCHITECTURE);try{
  const baseline=h.resources();for(const id of ['roof-return','service-gallery','underpass-delivery']){h.shoot(EXCHANGE_CASES[id]);h.session.action('retry');assert.deepEqual(h.resources(),baseline);}
  h.session.fire(EXCHANGE_CASES['slow-gallery']);for(let i=0;i<120;i++)h.step();h.session.action('stop');assert.equal(h.session.last.reason,'interrupted');assert.equal(h.session.flight,null);assert.deepEqual(h.resources(),baseline);
  const cleanup=h.disposeWorld();for(const key of ['staticBodies','dynamicBodies','animatedBodies','meshes','materials','textures','geometries','casters','subMeshes'])assert.equal(cleanup[key],0,key);
 }finally{h.scene.dispose();h.engine.dispose();}}
});
