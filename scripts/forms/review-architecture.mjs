import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {PLACES_ARCHITECTURE_REFINED,PLACES_ARCHITECTURE_FORMS,EXCHANGE_FORMS_ADDITION,EXCHANGE_SOLIDS} from '../../lib/places-architecture.js';
import {barrelPlanes} from '../../lib/architectural-forms.js';
import {FORM_CASES,flatConfig,retainsForm} from './architecture-measure.mjs';
import {exchangeNeighbours} from '../places/architecture-measure.mjs';
const old=architectureHarness(PLACES_ARCHITECTURE_REFINED),formed=architectureHarness(PLACES_ARCHITECTURE_FORMS),flat=architectureHarness(flatConfig);
try{
 const canopy=EXCHANGE_FORMS_ADDITION[0],mesh=formed.world.meshes.find(m=>m.name==='exchange-maintenance-canopy'),p=mesh.getVerticesData('position'),n=mesh.getVerticesData('normal'),idx=mesh.getIndices();
 const vertexKeys=[],vertices=new Map(),edges=new Map();
 for(let i=0;i<p.length;i+=3){const key=p.slice(i,i+3).map(x=>x.toFixed(8)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);vertexKeys.push(vertices.get(key));}
 for(let i=0;i<idx.length;i+=3){const ids=idx.slice(i,i+3),centre=[0,0,0];for(const id of ids)for(let c=0;c<3;c++)centre[c]+=p[id*3+c]/3;centre[1]-=canopy.h/3;for(const id of ids)assert.ok(centre.reduce((sum,v,c)=>sum+v*n[id*3+c],0)>0,'outward flat normal');for(let k=0;k<3;k++){const edge=[vertexKeys[ids[k]],vertexKeys[ids[(k+1)%3]]].sort((a,b)=>a-b).join(',');edges.set(edge,(edges.get(edge)??0)+1);}}
 assert.ok([...edges.values()].every(x=>x===2),'watertight two-triangle edge incidence');assert.equal(vertices.size-edges.size+idx.length/3,2,'closed convex solid Euler characteristic');
 const planes=barrelPlanes(canopy);for(let i=0;i<p.length;i+=3)for(const[x,y,z,d]of planes)assert.ok(x*p[i]+y*p[i+1]+z*p[i+2]<=d+1e-6,'every rendered vertex inside camera/convex halfspaces');
 for(const record of EXCHANGE_SOLIDS){const a=old.world.meshes.find(m=>m.name==='exchange-'+record.id),b=formed.world.meshes.find(m=>m.name===a.name);for(const buffer of ['position','normal'])assert.deepEqual(b.getVerticesData(buffer),a.getVerticesData(buffer),record.id);assert.deepEqual(b.getIndices(),a.getIndices(),record.id);}
 const resources={old:old.resources(),canopy:formed.resources()};
 assert.equal(resources.canopy.staticBodies-resources.old.staticBodies,5);assert.equal(PLACES_ARCHITECTURE_FORMS.playground.validateEnvironment({layout:PLACES_ARCHITECTURE_REFINED.playground.layout}),false);
 const cases={};for(const id of ['forecourt-curve-hall','forecourt-curve-crossing','freight-direct-canopy','freight-roof-crossing-canopy','freight-long-transfer']){const setup=FORM_CASES[id],r=formed.shoot(setup),f=flat.shoot(setup),neighbors=exchangeNeighbours(setup).map(v=>({change:v.change,retained:retainsForm(id,formed.shoot(v.setup))}));const impacts=r.impacts.filter(v=>v.body==='exchange-maintenance-canopy').map(v=>({...v,closestPlaneNormalAgreement:Math.max(...planes.map(([x,y,z])=>Math.abs((v.normal[0]*x+v.normal[1]*y+v.normal[2]*z)/Math.hypot(x,y,z))))}));cases[id]={setup,sequence:r.record.contacts.map(x=>x.body),flatSequence:f.record.contacts.map(x=>x.body),terminal:r.record.reason,seconds:r.record.elapsed,neighbors,impacts};}
 assert.ok(cases['forecourt-curve-hall'].neighbors.every(v=>v.retained));assert.equal(cases['forecourt-curve-hall'].flatSequence.includes('exchange-station-hall'),false);
 const evidence={reviewed:'9afffe9ae6badc8950e1138099170781f367a796',cameraFollowup:'0f07d74854cd9c62dc899ce0f7150e54aec74f76',authority:'Actual 120Hz Havok; independent topology and boundary checks. No rendered inspection.',topology:{vertices:vertices.size,edges:edges.size,triangles:idx.length/3,allEdgesTwice:true,allNormalsOutward:true,exactOriginalMeshBuffers:true},resources,cases};await writeFile('docs/experiments/forms-ensemble/review-architecture.json',JSON.stringify(evidence)+'\n');console.log(JSON.stringify({topology:evidence.topology,cases:Object.fromEntries(Object.entries(cases).map(([id,c])=>[id,{sequence:c.sequence,flat:c.flatSequence,retained:c.neighbors.filter(n=>n.retained).length,normalAgreement:c.impacts.map(i=>i.closestPlaneNormalAgreement)}]))},null,2));
}finally{old.dispose();formed.dispose();flat.dispose();}
