// Technical appendix: actual 120 Hz Havok, ordinary player-control detents.
// Neither sampled outcomes nor musical attack counts establish enjoyment.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,PhysicsMotionType} from '@babylonjs/core';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {counterlineWorlds} from '../../lib/counterline-worlds.js';
import {validateCounterlineEnsemble,ensembleAttackOverlap} from '../../lib/counterline-ensemble.js';
import {counterlineRecordedImpacts,counterlineVoicedImpact} from '../../lib/counterline-recording.js';
import {worldcraftIdentity,validateWorldcraftShot,packWorldcraftLine,captureWorldSnapshot} from '../../lib/worldcraft-model.js';
import {performanceFromResonance} from '../../lib/worldcraft-resonance.js';
import {foundryRecord} from '../../lib/worldcraft-foundry.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const baseline='10b09baafc9d85eef0d87a630b55600d623dcde0';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const files=['lib/worldcraft-runtime.js','lib/worldcraft-scene.js','lib/worldcraft-model.js','lib/worldcraft-resonance.js','lib/counterline-worlds.js','lib/counterline-recording.js','lib/instrument-foundry.js','worlds/instruments/descending-resonance/instrument.json','worlds/instruments/chime-terraces/instrument.json','scripts/instrument-foundry/reference-measure.mjs'];
const hashes={};for(const file of files)hashes[file]=hash(await readFile(new URL('../../'+file,import.meta.url),'utf8'));
const examples=JSON.parse(await readFile(new URL('../../public/playability/loops-examples.json',import.meta.url))).lines;
const entries=counterlineWorlds(examples[0].worldSnapshot.world).slice(0,2);
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const out=new URL('../../docs/experiments/instrument-foundry/',import.meta.url);await mkdir(out,{recursive:true});
const physical=last=>Object.fromEntries(['world','setup','launch','contacts','samples','evidence','terminal','resonance'].map(k=>[k,last[k]]));
const region=id=>id.startsWith('ramp')?'ramp':id.startsWith('high')?'upper':id.startsWith('top')?'crown':id.startsWith('mid')?'middle':id.startsWith('low')?'lower':id.startsWith('wall-near')?'near-wall':id.startsWith('wall-far')?'far-wall':id;
const regions=pieces=>pieces.map(region).filter((v,i,a)=>i===0||v!==a[i-1]);
const compact=impact=>Object.fromEntries(['piece','role','time','material','degree','note','hz','gain','callbacks','normalSpeed','speed','point'].filter(k=>k in impact).map(k=>[k,impact[k]]));
const group=impacts=>{const groups=[];for(const n of impacts){if(!groups.length||n.time-groups.at(-1).at(-1).time>.15)groups.push([]);groups.at(-1).push(n);}return groups;};
const summarize=(last,profile)=>{
 const raw=last.resonance.impacts,voiced=raw.map(n=>counterlineVoicedImpact(n,profile,n.normalSpeed)),positive=voiced.filter(n=>n.gain>0),substantial=positive.filter(n=>n.gain>=.01),events=group(positive);
 return {rawMusicalImpacts:raw.length,positiveVoicedImpacts:positive.length,analysisGainAtLeast01:substantial.length,qualifiedRedirects:last.evidence.filter(e=>e.kind==='redirect').length,physicalContactRows:last.contacts.length,rawCollisionCallbacks:raw.reduce((sum,n)=>sum+n.callbacks,0),pieces:positive.map(n=>n.piece),regions:regions(positive.map(n=>n.piece)),notes:positive.map(n=>n.note),times:positive.map(n=>n.time),interAttackSeconds:positive.slice(1).map((n,i)=>n.time-positive[i].time),groupedOnsets150ms:events.length,groupedNotes:events.map(g=>g.map(n=>n.note)),maxAttacks2_4s:ensembleAttackOverlap(positive.map(n=>n.time)),terminal:last.terminal,pathSamples:last.samples.length,pathSHA256:hash(last.samples),physicalSHA256:hash(physical(last))};
};
function harness(entry){
 const start=performance.now(),engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const runtime=createWorldcraftRuntime(scene,{world:entry.world,build:baseline});runtime.setDynamics(entry.profile.dynamics);
 const counts=()=>({bodies:physics.getBodies().length,staticBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamicBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length});
 const ready=counts(),buildCpuMs=performance.now()-start;
 return {ready,buildCpuMs,shoot(setup,world=entry.world){if(runtime.mode!=='build')runtime.setMode('build');if(worldcraftIdentity(runtime.world)!==worldcraftIdentity(world))assert.equal(runtime.replaceWorld(world,{intent:'load'}).ok,true);runtime.setMode('play');assert.equal(runtime.launch(validateWorldcraftShot(world,setup)),true);const active=counts();assert.equal(active.dynamicBodies,1);for(let i=0;i<7300&&!runtime.flight.ended;i++){runtime.beforeStep();physics._step(1/120);runtime.afterStep();}assert.ok(runtime.last);const last=runtime.last;runtime.clearShot();runtime.setMode('build');return {last,active,reset:counts()};},dispose(){runtime.dispose();const afterRuntime=counts();assert.equal(afterRuntime.bodies,0);scene.dispose();const afterScene=counts();assert.equal(afterScene.meshes,0);assert.equal(afterScene.materials,0);engine.dispose();return {afterRuntime,afterScene};}};
}
const setup=(originX,yaw,elevation,charge)=>({railIndex:1,originX,yaw,elevation,charge});
const fromManifest=(id,label)=>foundryRecord(id).manifest.testedShots.find(s=>s.id===label).setup;
const definitions={
 'descending-resonance':[
  {id:'central-descent',intent:'An elevated strike descends through two facing timber walls.',setup:fromManifest('descending-resonance','descent')},
  {id:'west-descent',intent:'A neighboring spatial route changes pitch and receiving wall.',setup:fromManifest('descending-resonance','west-descent')},
  {id:'low-drive-crown-return',intent:'A low ramp strike reaches the crown and returns through the lower space.',setup:setup(2.5,-3.5,5,.56),ownerInspired:true},
  {id:'repeated-plate-wall-answer',intent:'A raised plate and wall answer each other after the first ramp.',setup:setup(-10,12.5,5,.48),ownerInspired:true},
  {id:'sparse-opening',intent:'One direct strike is a valid accompaniment gesture.',setup:fromManifest('descending-resonance','opening')}
 ],
 'chime-terraces':[
  {id:'central-rise-and-cluster',intent:'A ramp reaches the upper row, with a clustered contact and later receiving strike.',setup:fromManifest('chime-terraces','centre-climb')},
  {id:'east-cluster-and-release',intent:'A close pair opens into a later receiving note.',setup:fromManifest('chime-terraces','east-walk')},
  {id:'low-drive-across-terraces',intent:'A displaced low launch crosses between a ramp, raised plate and lower receivers.',setup:setup(-10,7.5,5,.44),ownerInspired:true},
  {id:'compact-chord-or-single',intent:'A short simultaneous pair can split into a single strike.',setup:fromManifest('chime-terraces','opening')},
  {id:'west-ramp-upper-middle',intent:'A western ramp approach reaches an upper plate and its middle receiver.',setup:fromManifest('chime-terraces','west-climb')}
 ]
};
const measured=[];
for(const entry of entries){
 const h=harness(entry),families=[];
 for(const spec of definitions[entry.id]){
  const central=h.shoot(spec.setup),s=summarize(central.last,entry.profile),neighbors=[];
  for(const [control,detent]of [['yaw',.5],['elevation',.5],['charge',.01],['originX',.5]])for(const sign of [-1,1]){
   const changed={...spec.setup,[control]:Math.round((spec.setup[control]+sign*detent)*1000)/1000};
   try{validateWorldcraftShot(entry.world,changed);}catch(error){neighbors.push({control,delta:sign*detent,rejected:String(error.message)});continue;}
   const row=h.shoot(changed),summary=summarize(row.last,entry.profile);
   neighbors.push({control,delta:sign*detent,setup:changed,...summary,samePieceSequence:JSON.stringify(summary.pieces)===JSON.stringify(s.pieces),samePitchSequence:JSON.stringify(summary.notes)===JSON.stringify(s.notes)});
  }
  families.push({...spec,central:{...s,impacts:central.last.resonance.impacts.map(compact),contacts:central.last.contacts},neighbors});
 }
 const negatives=[['low-edge-miss',setup(0,70,5,.1)],['high-carry',setup(0,0,70,.9)]].map(([id,setting])=>({id,setup:setting,...summarize(h.shoot(setting).last,entry.profile)}));
 const originSurvey=[];for(const originX of [-10,0,10])for(const yaw of [-20,-10,0,10,20])for(const elevation of [5,20,40])for(const charge of [.3,.5,.7]){const setting=setup(originX,yaw,elevation,charge);const summary=summarize(h.shoot(setting).last,entry.profile);originSurvey.push({setup:setting,positiveVoicedImpacts:summary.positiveVoicedImpacts,analysisGainAtLeast01:summary.analysisGainAtLeast01,groupedOnsets150ms:summary.groupedOnsets150ms,qualifiedRedirects:summary.qualifiedRedirects,pieces:summary.pieces,notes:summary.notes,terminal:summary.terminal.reason,elapsed:summary.terminal.elapsed});}
 const cycles=[];for(let i=0;i<6;i++){const t0=performance.now(),run=h.shoot(families[i%families.length].setup);assert.deepEqual(run.reset,h.ready);cycles.push({cycle:i,active:run.active,reset:run.reset,acceleratedCpuMs:performance.now()-t0});}
 measured.push({id:entry.id,worldDocumentSHA256:hash(entry.world),worldIdentitySHA256:hash(worldcraftIdentity(entry.world)),profile:entry.profile,opening:entry.opening,originalOpening:entry.originalOpening,families,negatives,originSurvey,resources:{scope:'Runtime-only NullEngine; excludes presentation, launcher, shadows and trail meshes',ready:h.ready,buildCpuMs:h.buildCpuMs,cycles,...h.dispose(),renderedDrawCalls:null,renderedFrameMs:null}});
 console.log(JSON.stringify({world:entry.id,families:families.map(f=>({id:f.id,notes:f.central.notes,redirects:f.central.qualifiedRedirects,neighbors:f.neighbors.filter(n=>!n.rejected).length,samePieceSequence:f.neighbors.filter(n=>n.samePieceSequence).length})),survey:originSurvey.length}));
}
let adapter=null;
try{
 const adapterModule=await import('../../lib/instrument-foundry.js');
 if(adapterModule.instrumentReferences&&adapterModule.instrumentWorld){
  adapter=[];for(const definition of adapterModule.instrumentReferences()){
   const adapted=adapterModule.instrumentWorld(definition),entry=entries.find(e=>e.id===adapted.id);if(!entry)continue;
   assert.deepEqual(adapted.world,entry.world);assert.deepEqual(adapted.profile,entry.profile);assert.deepEqual(adapted.opening,entry.opening);const comparisons=[];
   for(const family of definitions[entry.id]){const a=harness(entry),b=harness({...entry,world:adapted.world}),ar=a.shoot(family.setup).last,br=b.shoot(family.setup).last;assert.deepEqual(physical(ar),physical(br));comparisons.push({family:family.id,physicalSHA256:hash(physical(ar)),exact:true});a.dispose();b.dispose();}
   adapter.push({id:entry.id,worldExact:true,profileExact:true,openingExact:true,comparisons});
  }
 }
}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const packet={sourceSha:sha,baselineSha:baseline,sourceHashes:hashes,authority:{solver:'Actual Havok with Babylon NullEngine',Hz:120,gravity:RAIL_RULES.gravity,mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius,firstGround:'unchanged',audio:'Authored acoustic interpretation; no sound rendering'},definitions:{positive:'Voiced gain > 0',substantialAnalysisOnly:'Voiced gain >= .01; descriptive filter, NEVER playback filtering or timing quantization',onsetAnalysisOnly:'Consecutive impacts <=150 ms apart grouped for description; original times preserved',detents:{originX:.5,yaw:.5,elevation:.5,charge:.01},sample:'135 ordinary setups per world across three origins; not human discovery frequency'},measured,adapter,limits:['No WebGL rendering, listening or physical-phone performance claim','No new geometry or changed physics in reference instruments','Inherited Descending construction-history/seam sensitivity remains','Owner-inspired setups are freshly measured; historical owner records remain authoritative for their own performance']};
for(const file of files)assert.equal(hash(await readFile(new URL('../../'+file,import.meta.url),'utf8')),hashes[file],`Source changed while measuring ${file}`);
await writeFile(new URL('reference-evidence.json',out),JSON.stringify(packet)+'\n');
const ownerIndex=process.argv.indexOf('--owner-file');
if(ownerIndex>=0){
 const bytes=await readFile(process.argv[ownerIndex+1],'utf8'),input=JSON.parse(bytes),ensemble=validateCounterlineEnsemble(input);assert.deepEqual(JSON.parse(JSON.stringify(ensemble)),input);
 const sources=ensemble.sources.map((line,i)=>{
  if(!line)return null;const id=entries.find(e=>worldcraftIdentity(e.world)===worldcraftIdentity(line.worldSnapshot.world))?.id??'unregistered';const notes=counterlineRecordedImpacts(line,ensemble.acoustics[i]),entry=entries.find(e=>e.id===id),h=entry?harness(entry):null,fresh=h?.shoot(line.setup).last??null;h?.dispose();
  const sourcePhysicalFields=['setup','launch','contacts','terminal'];const freshLine=fresh?packWorldcraftLine({id:line.id,createdAt:line.createdAt,worldSnapshot:captureWorldSnapshot(fresh.world,line.worldSnapshot.build),setup:fresh.setup,launch:fresh.launch,points:fresh.samples,events:fresh.evidence,contacts:fresh.contacts,terminal:fresh.terminal,performance:performanceFromResonance(fresh.resonance)}):null;
  return {slot:i,instrument:id,sourceBuild:line.worldSnapshot.build,worldIdentitySHA256:hash(worldcraftIdentity(line.worldSnapshot.world)),setup:line.setup,acousticProfile:ensemble.acoustics[i]?.profile??null,rawMusicalImpacts:line.performance.impacts.length,positiveVoicedImpacts:notes.filter(n=>n.gain>0).length,analysisGainAtLeast01:notes.filter(n=>n.gain>=.01).length,qualifiedRedirects:line.events.filter(e=>e.kind==='redirect').length,physicalContactRows:line.contacts.length,impacts:notes.map(compact),terminal:line.terminal,registeredWorldExact:!!entry,pathSHA256:hash(line.points),freshReplay:freshLine?{compared:['setup','launch','contacts','terminal','points','events','performance'],exact:JSON.stringify(freshLine)===JSON.stringify(line),fields:Object.fromEntries([...sourcePhysicalFields,'points','events','performance'].map(k=>[k,JSON.stringify(freshLine[k])===JSON.stringify(line[k])])),freshSummary:summarize(fresh,entry.profile)}:null};
 });
 const owner={format:ensemble.format,version:ensemble.version,fileSHA256:hash(bytes),validatedWithoutMutation:true,settings:ensemble.settings,sources,combinedPositiveAttacks:ensemble.sources.reduce((sum,line,i)=>sum+(line?counterlineRecordedImpacts(line,ensemble.acoustics[i]).filter(n=>n.gain>0).length:0),0),maxAttacks2_4s:ensembleAttackOverlap(ensemble.sources.flatMap((line,i)=>line?counterlineRecordedImpacts(line,ensemble.acoustics[i]).filter(n=>n.gain>0).map(n=>n.time):[])),limits:['Raw owner file, source IDs, creation timestamps and full trajectories are not published','Schema validation verifies consistency, not external authenticity; supplied by owner as genuine play evidence','Fresh replay comparisons are reported separately from historical source authority','No listening inference from note count or gain']};
 assert.equal(hash(await readFile(process.argv[ownerIndex+1],'utf8')),hash(bytes));await writeFile(new URL('owner-evidence-summary.json',out),JSON.stringify(owner)+'\n');console.log(JSON.stringify({ownerValidated:true,attacks:owner.combinedPositiveAttacks,maxOverlap:owner.maxAttacks2_4s,replays:sources.map(s=>({slot:s.slot,exact:s.freshReplay?.exact,fields:s.freshReplay?.fields}))}));
}
