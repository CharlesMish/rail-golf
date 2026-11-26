import test from 'node:test';
import assert from 'node:assert/strict';
import {architectureHarness} from '../scripts/playgrounds/architecture-harness.mjs';
import {PLACES_ARCHITECTURE_FORMS as config,PLACES_ARCHITECTURE_REFINED,EXCHANGE_FORMS_ADDITION,EXCHANGE_SOLIDS,EXCHANGE_FORMS_SOLIDS,exchangeSegment} from '../lib/places-architecture.js';
import {barrelPlanes} from '../lib/architectural-forms.js';
import {FORM_CASES,retainsForm,flatConfig} from '../scripts/forms/architecture-measure.mjs';
import {exchangeNeighbours,EXCHANGE_CASES} from '../scripts/places/architecture-measure.mjs';
import {createPlaygroundShelf,validPlaygroundEntry} from '../lib/playgrounds-shelf.js';
import {spatialLaunch} from '../lib/spatial-lab-session.js';

test('the curved receiver is a closed outward convex prism with matching clipping planes and unchanged old solids',()=>{
 assert.deepEqual(EXCHANGE_FORMS_SOLIDS.slice(0,EXCHANGE_SOLIDS.length),EXCHANGE_SOLIDS);
 const h=architectureHarness(config);try{
  const s=EXCHANGE_FORMS_ADDITION[0],m=h.world.meshes.find(m=>m.name==='exchange-'+s.id),p=m.getVerticesData('position'),n=m.getVerticesData('normal'),indices=m.getIndices(),planes=barrelPlanes(s);
  assert.equal(indices.length/3,40);assert.equal(m.material.backFaceCulling,true);
  for(let i=0;i<p.length;i+=3)for(const[a,b,c,d]of planes)assert.ok(a*p[i]+b*p[i+1]+c*p[i+2]<=d+1e-5);
  for(let k=0;k<indices.length;k+=3){const centroid=[0,0,0];for(let j=0;j<3;j++)for(let c=0;c<3;c++)centroid[c]+=p[indices[k+j]*3+c]/3;centroid[1]-=s.h/3;const i=indices[k]*3;assert.ok(centroid.reduce((sum,v,c)=>sum+v*n[i+c],0)>0,'every rendered face points outward');}
  assert.equal(exchangeSegment({x:25,y:4,z:14},{x:25,y:4,z:14},s),null,'passage below actual flat soffit is open');assert.equal(exchangeSegment({x:25,y:8,z:14},{x:25,y:8,z:14},s),0,'crown interior belongs to actual roof');
 }finally{h.dispose();}
});
test('curve departures create a hall continuation absent from a same-bounds flat roof, with ordinary neighboring controls',()=>{
 const h=architectureHarness(config),flat=architectureHarness(flatConfig);try{
 for(const id of ['forecourt-curve-hall','freight-direct-canopy','freight-crossing-canopy','freight-roof-crossing-canopy']){assert.equal(retainsForm(id,h.shoot(FORM_CASES[id])),true,id);for(const n of exchangeNeighbours(FORM_CASES[id]))assert.equal(retainsForm(id,h.shoot(n.setup)),true,`${id} ${n.change}`);}
 assert.equal(retainsForm('forecourt-curve-hall',flat.shoot(FORM_CASES['forecourt-curve-hall'])),false);
 const r=h.shoot(FORM_CASES['forecourt-curve-hall']),hits=r.impacts.filter(c=>c.body==='exchange-maintenance-canopy'),last=hits.at(-1);assert.ok(last.outgoing[1]>10&&last.outgoing[0]<8,'inclined face lifts and steers instead of pretending to be a flat platform');
 const normals=barrelPlanes(EXCHANGE_FORMS_ADDITION[0]).map(p=>{const l=Math.hypot(...p.slice(0,3));return p.slice(0,3).map(x=>x/l);});for(const hit of hits)assert.ok(normals.some(n=>Math.abs(n.reduce((sum,x,i)=>sum+x*hit.normal[i],0))>.999),'Havok normal is an actual facet normal');
 }finally{h.dispose();flat.dispose();}
});
test('old Forecourt histories remain exact while v3 rejects older physical identity and disposes its extra bodies',()=>{
 const h=architectureHarness(config),old=architectureHarness(PLACES_ARCHITECTURE_REFINED),physical=r=>[r.record.reason,r.record.elapsed,r.record.position,r.record.contacts,r.path,r.impacts];
 try{for(const s of Object.values(EXCHANGE_CASES).filter(s=>s.carriageMode==='forecourt'))assert.deepEqual(physical(h.shoot(s)),physical(old.shoot(s)));
 const result=h.shoot(FORM_CASES['freight-direct-canopy']),contract={...config.playground,station:config.station},shelf=createPlaygroundShelf(contract,null),m=spatialLaunch(config,result.record.setup).muzzle,entry=shelf.keep(result.record,[[0,m.x,m.y,m.z],...result.path.map(p=>p.slice(0,4))],'21f18be');
 assert.equal(validPlaygroundEntry(entry,contract),true);assert.equal(validPlaygroundEntry(entry,{...PLACES_ARCHITECTURE_REFINED.playground,station:PLACES_ARCHITECTURE_REFINED.station}),false);assert.throws(()=>h.world.environment.restore({layout:PLACES_ARCHITECTURE_REFINED.playground.layout}));h.session.action('retry');assert.equal(h.session.flight,null);h.world.environment.restore(entry.record.environment);assert.equal(h.session.flight,null);
 assert.equal(h.resources().staticBodies,26);const cleaned=h.disposeWorld();assert.equal(cleaned.staticBodies+cleaned.dynamicBodies+cleaned.meshes+cleaned.materials+cleaned.casters,0);
 }finally{h.dispose();old.dispose();}
});
