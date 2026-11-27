import test from 'node:test';
import assert from 'node:assert/strict';
import {architectureHarness} from '../scripts/playgrounds/architecture-harness.mjs';
import {CROWN_CASES,crownNeighbors,crownShot,retainsCrownFamily} from '../scripts/expressive-geometry/measure.mjs';
import {EXPRESSIVE_CROWN,EXPRESSIVE_CROWN_FLAT,CROWN_SOLID,crownViewClear} from '../lib/expressive-crown.js';
import {barrelPlanes} from '../lib/architectural-forms.js';
import {createPlaygroundShelf,validPlaygroundEntry} from '../lib/playgrounds-shelf.js';
import {validateCounterlinePhysicalLine} from '../lib/counterline-recording.js';
import {spatialLaunch} from '../lib/spatial-lab-session.js';
import {Vector3} from '@babylonjs/core';

test('the transverse crown is one visible faceted hull, not disconnected curved segments',()=>{
 const h=architectureHarness(EXPRESSIVE_CROWN),flat=architectureHarness(EXPRESSIVE_CROWN_FLAT);
 try{
  const mesh=h.world.meshes.find(m=>m.name==='worldcraft-object-crown'),positions=mesh.getVerticesData('position'),planes=barrelPlanes(CROWN_SOLID);
  const axis=Vector3.TransformNormal(new Vector3(1,0,0),mesh.computeWorldMatrix(true));
  assert.ok(Math.abs(axis.x)<1e-6&&Math.abs(axis.z+1)<1e-6,'the crown axis is transversely rotated');assert.equal(mesh.getTotalIndices()/3,40);assert.equal(mesh.material.backFaceCulling,true);
  for(let i=0;i<positions.length;i+=3)for(const[a,b,c,d]of planes)assert.ok(a*positions[i]+b*positions[i+1]+c*positions[i+2]<=d+1e-5);
  assert.equal(h.resources().staticBodies,4);assert.equal(flat.resources().staticBodies,4);
  assert.equal(h.resources().triangles-flat.resources().triangles,28);
  assert.equal(crownViewClear({x:0,y:2,z:20},{x:0,y:2,z:45}),false,'camera checks the rotated physical crown');
 }finally{h.dispose();flat.dispose();}
});
test('ordinary controls admit repeated crown impacts, returns and carries independently of sports recognition',()=>{
 const h=architectureHarness(EXPRESSIVE_CROWN),flat=architectureHarness(EXPRESSIVE_CROWN_FLAT);
 try{
  for(const id of ['repeat-crown','near-return','low-carry','high-carry']){
   assert.equal(retainsCrownFamily(id,crownShot(h,CROWN_CASES[id])),true,id);
   for(const n of crownNeighbors(CROWN_CASES[id]))assert.equal(retainsCrownFamily(id,crownShot(h,n.setup)),true,`${id} ${n.id}`);
  }
  const result=crownShot(h,CROWN_CASES['repeat-crown']),impacts=result.resonance.impacts;
  assert.equal(impacts[0].piece,'crown');assert.equal(impacts[1].piece,'crown');
  assert.ok(impacts[1].time-impacts[0].time>2,'separated free-flight impacts, not duplicate callbacks');
  assert.equal(result.record.evidence.filter(e=>e.kind==='redirect').length,1,'sports tracker does not create a second award for this repeated body');
  assert.equal(retainsCrownFamily('repeat-crown',crownShot(flat,CROWN_CASES['repeat-crown'])),false);
  assert.equal(retainsCrownFamily('near-return',crownShot(flat,CROWN_CASES['near-return'])),true,'a near return alone does not justify the curve');
  assert.equal(retainsCrownFamily('low-carry',crownShot(flat,CROWN_CASES['low-carry'])),false);
 }finally{h.dispose();flat.dispose();}
});
test('study memory cannot impersonate Worldcraft music and resets/disposes all owned physical resources',()=>{
 const h=architectureHarness(EXPRESSIVE_CROWN);
 try{
  const result=crownShot(h,CROWN_CASES['repeat-crown']),contract={...EXPRESSIVE_CROWN.playground,station:EXPRESSIVE_CROWN.station},shelf=createPlaygroundShelf(contract,null),m=spatialLaunch(EXPRESSIVE_CROWN,result.record.setup).muzzle;
  const entry=shelf.keep(result.record,[[0,m.x,m.y,m.z],...result.path.map(p=>p.slice(0,4))],'10b09ba');
  assert.equal(validPlaygroundEntry(entry,contract),true);
  assert.equal(validPlaygroundEntry(entry,{...EXPRESSIVE_CROWN_FLAT.playground,station:EXPRESSIVE_CROWN_FLAT.station}),false);
  assert.throws(()=>validateCounterlinePhysicalLine(entry));
  assert.throws(()=>h.world.environment.restore({layout:EXPRESSIVE_CROWN_FLAT.playground.layout}));
  h.session.action('retry');h.world.environment.restore(entry.record.environment);assert.equal(h.session.flight,null);
  const next=crownShot(h,CROWN_CASES['low-miss']);assert.equal(next.record.reason,'first-ground-contact');assert.equal(next.resonance.impacts.some(i=>i.piece==='crown'),false);
  h.session.action('reset');assert.equal(h.resources().staticBodies,4);assert.equal(h.resources().dynamicBodies,0);
  const cleanup=h.disposeWorld();for(const key of ['staticBodies','dynamicBodies','animatedBodies','meshes','materials','textures','geometries','casters','subMeshes'])assert.equal(cleanup[key],0,key);
 }finally{h.dispose();}
});
