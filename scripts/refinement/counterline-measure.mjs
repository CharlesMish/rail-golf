// Bounded repertoire check. Uses registered documents and the incumbent Havok
// harness. Survey frequency is not human success frequency; no audio pleasure
// can be inferred from these contact-derived events.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,DirectionalLight,ShadowGenerator,PhysicsMotionType} from '@babylonjs/core';
import {createRangeHarness} from '../range/run.mjs';
import {foundryRecord} from '../../lib/worldcraft-foundry.js';
import {adaptRangePreset,createMusicalWorkshopPreset,rangeOpeningSetup} from '../../lib/worldcraft-range.js';
import {worldcraftIdentity,packWorldcraftLine,captureWorldSnapshot} from '../../lib/worldcraft-model.js';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {createWorldcraftPresentation} from '../../lib/worldcraft-presentation.js';
import {buildRangeLauncher,buildRangeProjectile} from '../../lib/mechanism-range-presentation.js';
import {captureCounterlineRecording} from '../../lib/counterline-recording.js';
import {voiceImpact,performanceFromResonance} from '../../lib/worldcraft-resonance.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const examples=JSON.parse(await readFile(new URL('../../public/playability/loops-examples.json',import.meta.url))).lines;
const original=createMusicalWorkshopPreset();
const worlds=[...['descending-resonance','chime-terraces'].map(id=>{const record=foundryRecord(id);return {id,world:record.world,preset:record.preset,manifest:record.manifest,opening:rangeOpeningSetup(record.preset),sound:record.manifest.presentation?.bankVoice?'tuned-even':null};}),{id:'early-plate',world:examples[0].worldSnapshot.world,opening:examples[0].setup,sound:null},{id:'original-workshop',world:adaptRangePreset(original).world,opening:rangeOpeningSetup(original),sound:null}];
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const broadGrid={yaw:Array.from({length:25},(_,i)=>-24+i*2),elevation:[8,12,16,20,24,30,40],charge:[.35,.45,.55,.65,.8],originX:0};
const matchedGrid={yaw:[-20,-10,0,10,20],elevation:[10,18,26,40,60],charge:[.2,.35,.55,.75],originX:0};
const setupRows=grid=>grid.yaw.flatMap(yaw=>grid.elevation.flatMap(elevation=>grid.charge.map(charge=>({railIndex:1,originX:grid.originX,yaw,elevation,charge}))));
const groups=notes=>{const result=[];for(const impact of notes){if(!result.length||impact.time-result.at(-1).at(-1).time>.15)result.push([]);result.at(-1).push(impact);}return result;};
const summarizeShot=(shot,sound)=>{
 const notes=shot.resonance.impacts.filter(i=>i.gain>0),onsets=groups(notes),unique=[...new Set(notes.map(i=>i.piece))],family=unique.length>=3?unique.slice(0,3).join('>'):notes.length?'short:'+unique.join('>'):'(silent)';
 const voiced=notes.map(i=>sound?voiceImpact(i,sound):i).filter(i=>i.gain>0);
 const maxWindow=Math.max(0,...voiced.map(note=>voiced.filter(n=>n.time>=note.time&&n.time-note.time<2.4).length));
 return {y:shot.setup.yaw,e:shot.setup.elevation,c:shot.setup.charge,x:shot.setup.originX,n:notes.length,a:onsets.length,u:unique.length,f:family,s:notes.map(i=>i.piece+':'+i.note).join('>')||'(silent)',p:onsets.map(g=>g.map(i=>i.note).join('+')).join('>')||'(silent)',o:shot.contacts.map(c=>c.body.replace(/^worldcraft-object-/,'').replace(/^worldcraft-/, '')).join('>')||'(none)',maxAttacks2_4s:maxWindow,ending:shot.reason,elapsed:shot.elapsed,voicedNotes:voiced.length,voicedEvents:groups(voiced).length,pitches:[...new Set(notes.map(i=>i.note))],pieces:unique};
};
const histogram=(values)=>Object.fromEntries([...new Set(values)].sort().map(k=>[k,values.filter(v=>v===k).length]));
const bins=(rows,key)=>Object.fromEntries([['0',rows.filter(r=>r[key]===0).length],['1–2',rows.filter(r=>r[key]>=1&&r[key]<=2).length],['3–5',rows.filter(r=>r[key]>=3&&r[key]<=5).length],['6+',rows.filter(r=>r[key]>=6).length]]);
const summary=rows=>({shots:rows.length,raw:bins(rows,'n'),events150ms:bins(rows,'a'),audibleAfterVoice:bins(rows,'voicedEvents'),withMergedOnsets:rows.filter(r=>r.n>r.a).length,families:new Set(rows.map(r=>r.f)).size,pitchPhrases:new Set(rows.map(r=>r.p)).size,pitches:[...new Set(rows.flatMap(r=>r.pitches))],pieces:[...new Set(rows.flatMap(r=>r.pieces))].sort(),endings:histogram(rows.map(r=>r.ending)),over15Seconds:rows.filter(r=>r.elapsed>15).length,maxSeconds:Math.max(...rows.map(r=>r.elapsed)),maxAttacks2_4s:Math.max(...rows.map(r=>r.maxAttacks2_4s))});
const shortNotes=shot=>shot.resonance.impacts.map(({piece,role,time,note,hz,gain,normalSpeed,speed,material,callbacks,point})=>({piece,role,time,note,hz,gain,normalSpeed,speed,material,callbacks,point}));
const measured=[],recordings=[];
for(const entry of worlds){
 const {id,world,opening,sound}=entry,start=performance.now(),h=createRangeHarness(havok,world,sha);h.runtime.setDynamics('normal-speed');
 const take=(setup)=>h.shoot(world,setup),openingShot=take(opening);let broad=[],historical=null;
 if(entry.preset&&id!=='original-workshop'){
  for(const setup of setupRows(broadGrid))broad.push(summarizeShot(take(setup),sound));
  const previous=JSON.parse(await readFile(new URL(`../../docs/experiments/chime-terraces/raw/shots-${id}.json`,import.meta.url)));
  const keys=['y','e','c','n','a','u','f','s','p','o'];const oldMap=new Map(previous.rows.map(r=>[[r.y,r.e,r.c].join('|'),r]));
  const differences=broad.flatMap(row=>{const old=oldMap.get([row.y,row.e,row.c].join('|'));const changed=keys.filter(k=>old?.[k]!==row[k]);return changed.length?[{setup:[row.y,row.e,row.c],changed,old,current:row}]:[];});
  historical={path:`docs/experiments/chime-terraces/raw/shots-${id}.json`,rows:previous.rows.length,comparedFields:keys,identicalRows:broad.length-differences.length,differences};
 }
 const matched=setupRows(matchedGrid).map(setup=>summarizeShot(take(setup),sound));
 const candidateRows=broad.length?broad:matched,selectors=[['opening',summarizeShot(openingShot,sound)],['single strike',candidateRows.find(r=>r.n===1)],['separated phrase',candidateRows.find(r=>r.a>=3&&r.pitches.length>=3)],['clustered phrase',candidateRows.find(r=>r.n>=3&&r.a<r.n)],['silence',candidateRows.find(r=>r.n===0)],['long flight',candidateRows.reduce((best,r)=>r.elapsed>best.elapsed?r:best,candidateRows[0])]];
 for(const manifest of entry.manifest?.testedShots??[]){if(['descent','west-descent','centre-climb','east-walk'].includes(manifest.id))selectors.push(['manifest '+manifest.id,summarizeShot(take(manifest.setup),sound)]);}
 const representatives=[];
 for(const [label,row] of selectors){if(!row)continue;const setup={railIndex:1,originX:row.x,yaw:row.y,elevation:row.e,charge:row.c},shot=take(setup),neighbors=[];
  for(const [key,step]of [['yaw',.5],['elevation',.5],['charge',.01],['originX',.5]])for(const sign of [-1,1]){const changed={...setup,[key]:Math.round((setup[key]+sign*step)*1000)/1000};neighbors.push({control:key,delta:sign*step,summary:summarizeShot(take(changed),sound)});}
  if((id==='descending-resonance'&&['manifest descent','manifest west-descent'].includes(label))||(id==='chime-terraces'&&['manifest centre-climb','manifest east-walk'].includes(label))){const line=packWorldcraftLine({id:'repertoire-'+id+'-'+label.replaceAll(' ','-'),createdAt:'2026-11-25T16:00:00.000Z',worldSnapshot:captureWorldSnapshot(world,sha),setup:shot.setup,launch:shot.launch,points:shot.samples,events:shot.evidence,contacts:shot.contacts,terminal:shot.terminal,performance:performanceFromResonance(shot.resonance)});recordings.push(captureCounterlineRecording(line,shot.resonance,{version:1,dynamics:'normal-speed',bankVoice:sound}));}
  representatives.push({label,setup,summary:summarizeShot(shot,sound),contacts:shot.contacts,notes:shortNotes(shot),terminal:shot.terminal,pathSamples:shot.samples.length,pathSHA256:hash(shot.samples),...(label==='opening'||label==='separated phrase'?{path:shot.samples}:{}),neighbors});
 }
 const regions=broad.length?['left','centre','right'].flatMap(aim=>['low','high'].map(elev=>{const rows=broad.filter(r=>(aim==='left'?r.y<=-8:aim==='right'?r.y>=8:Math.abs(r.y)<=6)&&(elev==='low'?r.e<=16:r.e>=20));return {aim,elevation:elev,...summary(rows)};})):[];
 h.dispose();measured.push({id,worldIdentitySHA256:hash(worldcraftIdentity(world)),worldDocumentSHA256:hash(world),presetSHA256:entry.preset?hash(entry.preset):null,opening,manifestPresentation:entry.manifest?.presentation??null,sound,rawDynamics:'normal-speed',pieceCount:world.objects.length,capacity:world.capacity??12,matched:{grid:matchedGrid,summary:summary(matched),rows:matched},...(broad.length?{broad:{grid:broadGrid,summary:summary(broad),regions,rows:broad},historical}:{}),representatives,cpuSurveyMs:performance.now()-start});
 console.log(JSON.stringify({id,matched:summary(matched),broad:broad.length?summary(broad):null,historical:historical?{identicalRows:historical.identicalRows,differences:historical.differences.length}:null}));
}
// Historical comparison used one reused scene across several authored worlds.
// Check whether seam-contact ordering depends on that construction history.
const lifecycleComparisons=[];
const descending=worlds[0],reference=JSON.parse(await readFile(new URL('../../docs/experiments/chime-terraces/raw/shots-descending-resonance.json',import.meta.url))).rows;
const keys=['y','e','c','n','a','u','f','s','p','o'];
for(const before of [[],['chime-terraces'],['chime-terraces','chime-fan','chime-garden']]){
 const first=before.length?foundryRecord(before[0]):descending,h=createRangeHarness(havok,first.world,sha);h.runtime.setDynamics('normal-speed');
 for(const id of before){const record=foundryRecord(id);h.shoot(record.world,rangeOpeningSetup(record.preset));}
 const rows=setupRows(broadGrid).map(setup=>summarizeShot(h.shoot(descending.world,setup),descending.sound));
 const examples=[{railIndex:1,originX:0,yaw:4,elevation:20,charge:.35},{railIndex:1,originX:0,yaw:-1,elevation:24,charge:.56}].map(setup=>{const shot=h.shoot(descending.world,setup);return {setup,notes:shortNotes(shot),terminal:shot.terminal,contacts:shot.contacts,pathSHA256:hash(shot.samples)};});h.dispose();
 const differences=rows.flatMap((row,i)=>{const changed=keys.filter(k=>row[k]!==reference[i][k]);return changed.length?[{setup:[row.y,row.e,row.c],changed,old:reference[i],current:row}]:[];});
 const isolated=measured[0].broad.rows;const versusIsolated=rows.flatMap((row,i)=>keys.some(k=>row[k]!==isolated[i][k])?[{setup:[row.y,row.e,row.c],current:row}]:[]);
 lifecycleComparisons.push({before,examples,summary:summary(rows),historicalIdentical:875-differences.length,versusHistorical:differences,versusIsolated});
}
const resources=[];
for(const entry of worlds){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const sun=new DirectionalLight('sun',new Vector3(0,-1,1),scene),shadows=new ShadowGenerator(1024,sun),presentation=createWorldcraftPresentation(scene);buildRangeLauncher(scene,presentation.materials,shadows);
 const start=performance.now(),runtime=createWorldcraftRuntime(scene,{world:entry.world,materials:presentation.materials,shadows,build:sha}),buildMs=performance.now()-start;runtime.setMode('play');runtime.setDynamics('normal-speed');
 const cost=()=>({bodies:physics.getBodies().length,staticBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamicBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,enabledVisibleMeshes:scene.meshes.filter(m=>m.isEnabled()&&m.isVisible).length,subMeshes:scene.meshes.reduce((sum,m)=>sum+(m.subMeshes?.length??0),0),triangles:scene.meshes.reduce((sum,m)=>sum+m.getTotalIndices()/3,0),materials:scene.materials.length,shadowCasters:shadows.getShadowMap().renderList.length});
 const ready=cost();runtime.launch(entry.opening);let projectile=buildRangeProjectile(scene,runtime.flight.mesh,presentation.materials,shadows);const active=cost();while(!runtime.flight.ended){runtime.beforeStep();physics._step(1/120);runtime.afterStep();}projectile.dispose();runtime.clearShot();
 const cycles=[];for(let i=0;i<10;i++){runtime.setMode('build');const target=worlds[i%worlds.length],t0=performance.now();runtime.replaceWorld(target.world,{intent:'load'});const switchMs=performance.now()-t0;runtime.setMode('play');runtime.launch(target.opening);projectile=buildRangeProjectile(scene,runtime.flight.mesh,presentation.materials,shadows);while(!runtime.flight.ended){runtime.beforeStep();physics._step(1/120);runtime.afterStep();}projectile.dispose();const resetStart=performance.now();runtime.clearShot();cycles.push({world:target.id,switchMs,resetMs:performance.now()-resetStart,fullCpuCycleMs:performance.now()-t0,...cost()});}
 runtime.dispose();presentation.dispose();const afterRuntimeDispose={bodies:physics.getBodies().length};scene.dispose();const afterSceneDispose={bodies:physics.getBodies().length,meshes:scene.meshes.length,materials:scene.materials.length};engine.dispose();resources.push({id:entry.id,buildMs,ready,active,cycles,afterRuntimeDispose,afterSceneDispose});
}
const sourceFiles=['lib/worldcraft-runtime.js','lib/worldcraft-scene.js','lib/worldcraft-resonance.js','lib/worldcraft-foundry.js','lib/worldcraft-model.js','lib/counterline-recording.js','scripts/refinement/counterline-measure.mjs'],sourceHashes={};for(const file of sourceFiles)sourceHashes[file]=hash(await readFile(new URL('../../'+file,import.meta.url),'utf8'));
const result={sourceSha:sha,baselineSha:'8b02b8ceab95f28383f607cc4e891fe7e31dfc7a',sourceHashes,authority:{renderer:'Babylon NullEngine CPU only',solver:'actual Havok',Hz:120,mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius,gravity:RAIL_RULES.gravity,seed:20261114,seedAppliedToPhysics:false},definitions:{sounding:'raw resonance gain > 0',event:'Consecutive sounding impacts separated by at most 150ms join one event',voice:'Descending uses live normalSpeed with tuned-even; raw historical comparison remains raw gain > 0',grid:'Sampled ordinary control settings, not human frequency',drawCalls:'Unmeasured. Mesh/submesh counts are allocations; NullEngine has no rendered frame cost.'},measured,lifecycleComparisons,resources,recordedFixtures:{path:'public/refinement/counterline-examples.json',sha256:hash({recordings}),ids:recordings.map(r=>r.line.id)}};
await mkdir(new URL('../../public/refinement/',import.meta.url),{recursive:true});await writeFile(new URL('../../public/refinement/counterline-examples.json',import.meta.url),JSON.stringify({recordings})+'\n');
await writeFile(new URL('../../docs/experiments/refinement/counterline-evidence.json',import.meta.url),JSON.stringify(result)+'\n');console.log(JSON.stringify({done:true,resources}));
