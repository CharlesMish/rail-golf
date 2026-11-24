#!/usr/bin/env node
// Independent rerun of the author's selected actual shots, plus a geometric
// underpass check and station-provenance rejection. No trajectory prediction.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const source=resolve(process.argv[2]??process.cwd());
const get=path=>import(pathToFileURL(resolve(source,path)));
const {PLACES_ARCHITECTURE,EXCHANGE_LAYOUT,exchangeEnvironmentValid,exchangeStation}=await get('lib/places-architecture.js');
const {architectureHarness}=await get('scripts/playgrounds/architecture-harness.mjs');
const {spatialLaunch}=await get('lib/spatial-lab-session.js');
const {createPlaygroundShelf,validPlaygroundEntry}=await get('lib/playgrounds-shelf.js');
const expected=JSON.parse(await readFile(resolve(source,'docs/experiments/places/architecture-camera.json'),'utf8'));
const results=[];
for(const [name,entry]of Object.entries(expected.cases)){
 const h=architectureHarness(PLACES_ARCHITECTURE),setup=entry.setup;
 try{
  const measured=h.shoot(setup,{fullPath:true});assert.deepEqual(JSON.parse(JSON.stringify(measured.record)),entry.record,`serialized physical record changed: ${name}`);
  const launch=spatialLaunch(PLACES_ARCHITECTURE,setup),path=[[0,launch.muzzle.x,launch.muzzle.y,launch.muzzle.z],...measured.path.filter((_,i)=>i%12===0||i===measured.path.length-1).map(p=>p.slice(0,4))];
  const shelf=createPlaygroundShelf({layout:EXCHANGE_LAYOUT,validateEnvironment:exchangeEnvironmentValid,station:exchangeStation},null),kept=shelf.keep(measured.record,path,'unknown');
  assert.ok(kept);const tampered=structuredClone(kept);tampered.record.setup.carriageMode=setup.carriageMode==='service'?'forecourt':'service';assert.equal(validPlaygroundEntry(tampered,{layout:EXCHANGE_LAYOUT,validateEnvironment:exchangeEnvironmentValid,station:exchangeStation}),false);
  const bridgeSamples=measured.path.filter(p=>p[3]>=28.5&&p[3]<=41.5),underpass=name==='underpass'?{samples:bridgeSamples.length,maxTop:Math.max(...bridgeSamples.map(p=>p[2]+.43)),maxLateralExtent:Math.max(...bridgeSamples.map(p=>Math.abs(p[1])+.43)),deckUnderside:9.5,innerPierFace:8.5}:null;
  if(underpass){assert.ok(underpass.samples>0);assert.ok(underpass.maxTop<9.5);assert.ok(underpass.maxLateralExtent<8.5);}
  const firstImpacts=measured.impacts.filter((p,i,list)=>!list.slice(0,i).some(prior=>prior.body===p.body));
  const cleanup=h.disposeWorld();assert.equal(cleanup.staticBodies+cleanup.dynamicBodies+cleanup.animatedBodies,0);assert.equal(cleanup.meshes,0);assert.equal(cleanup.casters,0);
  results.push({name,setup,exactRecordMatch:true,record:measured.record,firstImpacts,underpass,stationTamperRejected:true,cleanup});
 }finally{h.scene.dispose();h.engine.dispose();}
}
const files=['lib/places-architecture.js','lib/playgrounds-shelf.js','scripts/playgrounds/architecture-harness.mjs'];const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(resolve(source,file))).digest('hex');
const report={format:'rail-golf-independent-architecture-review-v1',sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sourceModified:Boolean(execFileSync('git',['status','--porcelain','--',...files],{cwd:source,encoding:'utf8'}).trim()),sourceHashes:hashes,authority:'Independent actual Havok 120Hz rerun of selected fixtures. Callback normals are raw; velocities bracket the whole step, not isolated impulses. This is not rendered camera or human-play evidence.',results};
await mkdir('docs/experiments/places',{recursive:true});await writeFile('docs/experiments/places/review-architecture-evidence.json',JSON.stringify(report)+'\n');
console.log(JSON.stringify({sourceSha:report.sourceSha,sourceModified:report.sourceModified,shots:results.length,exact:results.every(r=>r.exactRecordMatch),underpass:results.find(r=>r.underpass)?.underpass,stationTamperRejected:results.every(r=>r.stationTamperRejected),cleanup:results.every(r=>r.cleanup.staticBodies+r.cleanup.dynamicBodies+r.cleanup.animatedBodies+r.cleanup.meshes+r.cleanup.casters===0)}));
