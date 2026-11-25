#!/usr/bin/env node
// Independent geometric orientation and historical actual-Havok replay audit.
// Run from the reviewed checkout, passing its path if different from cwd.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]??process.cwd());
const load=path=>import(pathToFileURL(resolve(source,path)));
const {architectureHarness}=await load('scripts/playgrounds/architecture-harness.mjs');
const {PLACES_ARCHITECTURE,EXCHANGE_SOLIDS}=await load('lib/places-architecture.js');
const expected=JSON.parse(await readFile(resolve(source,'docs/experiments/places/architecture-camera.json'),'utf8'));
const h=architectureHarness(PLACES_ARCHITECTURE),roofFaces=[],replays=[];
try{
 for(const solid of EXCHANGE_SOLIDS.filter(s=>s.shape==='gable')){
  const mesh=h.world.meshes.find(m=>m.name==='exchange-'+solid.id),p=mesh.getVerticesData('position'),n=mesh.getVerticesData('normal'),indices=mesh.getIndices(),center=[0,solid.h/3,0];
  assert.equal(mesh.material.backFaceCulling,true,'Do not hide winding errors by disabling back-face culling');
  for(let i=0;i<indices.length;i+=3){
   const ids=indices.slice(i,i+3),centroid=[0,1,2].map(j=>ids.reduce((sum,k)=>sum+p[k*3+j],0)/3),normal=[0,1,2].map(j=>ids.reduce((sum,k)=>sum+n[k*3+j],0)/3),dot=normal.reduce((sum,v,j)=>sum+v*(centroid[j]-center[j]),0);
   roofFaces.push({roof:solid.id,triangle:i/3,centroid,normal,outwardDot:dot});
  }
 }
 for(const [name,entry]of Object.entries(expected.cases)){
  const measured=h.shoot(entry.setup,{fullPath:true});
  assert.deepEqual(JSON.parse(JSON.stringify(measured.record)),entry.record,`Historical physical record changed: ${name}`);
  replays.push({name,exactHistoricalRecord:true,reason:measured.record.reason,elapsed:measured.record.elapsed,contacts:measured.record.contacts.map(c=>c.body)});
 }
 const cleanup=h.disposeWorld();
 for(const key of ['staticBodies','dynamicBodies','animatedBodies','meshes','materials','textures','geometries','casters','subMeshes'])assert.equal(cleanup[key],0,key);
 const files=['lib/places-architecture.js','lib/spatial-lab-session.js'],hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(resolve(source,file))).digest('hex');
 const report={sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sourceModified:Boolean(execFileSync('git',['status','--porcelain','--',...files],{cwd:source,encoding:'utf8'}).trim()),sourceHashes:hashes,authority:'Babylon normals against interior centroid plus actual Havok replay. No WebGL, light or shadow observation is claimed.',roofFaces,outward:roofFaces.every(f=>f.outwardDot>0),replays,cleanup};
 const out=process.argv[3]??'docs/experiments/refinement/review-roof-evidence.json';await writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({sourceSha:report.sourceSha,sourceModified:report.sourceModified,roofTriangles:roofFaces.length,outward:report.outward,exactReplays:replays.length,cleanup}));
}finally{h.scene.dispose();h.engine.dispose();}
