// Actual fixed-step Havok comparisons. Audio notifications use a deterministic
// fake context clock; this is not a browser rendering or listening measurement.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,PhysicsMotionType} from '@babylonjs/core';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {counterlineWorlds} from '../../lib/counterline-worlds.js';
import {counterlineRecordedImpacts,validateCounterlineRecording} from '../../lib/counterline-recording.js';
import {createEnsembleAudio,ensembleSettings,createCounterlineEnsemble,validateCounterlineEnsemble} from '../../lib/counterline-ensemble.js';
import {counterlineStepBudget} from '../../lib/counterline.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {createRangeHarness} from '../range/run.mjs';
import {packWorldcraftLine,captureWorldSnapshot} from '../../lib/worldcraft-model.js';
import {performanceFromResonance} from '../../lib/worldcraft-resonance.js';
import {captureCounterlineRecording} from '../../lib/counterline-recording.js';
Logger.LogLevels=0;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),physicalBaseline='6f080b78efb5afbeb5d8d087b1426e5681d6726d';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const files=['lib/counterline-ensemble.js','lib/counterline-recording.js','lib/worldcraft-runtime.js','lib/worldcraft-model.js','lib/worldcraft-resonance.js','scripts/forms-ensemble/ensemble-measure.mjs'];const sourceHashes={};for(const file of files)sourceHashes[file]=hash(await readFile(new URL('../../'+file,import.meta.url),'utf8'));
const legacy=JSON.parse(await readFile(new URL('../../public/playability/loops-examples.json',import.meta.url))).lines;
const captures=JSON.parse(await readFile(new URL('../../public/refinement/counterline-examples.json',import.meta.url))).recordings.map(validateCounterlineRecording);
const worlds=counterlineWorlds(legacy[0].worldSnapshot.world),companions=[captures[0],captures[2]].map(r=>({line:r.line,acoustics:r.acoustics}));
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const physical=last=>Object.fromEntries(['world','setup','launch','contacts','samples','evidence','terminal','resonance'].map(k=>[k,last[k]]));
function clock(){const contexts=[],timers=new Set(),interrupts=[];class Context{constructor(){this.currentTime=0;this.state='running';contexts.push(this);}close(){this.state='closed';return Promise.resolve();}}
 const player=createEnsembleAudio({Context,schedule(){return [];},setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);},onInterrupt:detail=>interrupts.push(detail)});
 return {player,contexts,timers,interrupts,advance(t){contexts.at(-1).currentTime=t;for(const fn of [...timers])fn();}};
}
async function run(entry,setup,parts,frames){
 const start=performance.now(),engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);const c=clock();
 const runtime=createWorldcraftRuntime(scene,{world:entry.world,build:'unknown',onEvent(event){if(event.kind==='resonance')c.player.live(event.impact);}});runtime.setMode('play');runtime.setDynamics(entry.profile.dynamics);
 const counts=()=>({bodies:physics.getBodies().length,staticBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamicBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length});
 const ready=counts(),buildMs=performance.now()-start;await c.player.prepare(ensembleSettings(),entry.profile);assert.equal(runtime.launch(setup),true);assert.equal(c.player.commit(companions.slice(0,parts)),true);const active=counts();assert.equal(active.bodies,ready.bodies+1);
 let ticks=0,elapsed=0,index=0;while(!runtime.flight.ended&&ticks<7300){elapsed+=frames[index++%frames.length];c.advance(elapsed);const due=counterlineStepBudget(elapsed,ticks);for(let i=0;i<due&&!runtime.flight.ended;i++){runtime.beforeStep();physics._step(1/120);ticks++;runtime.afterStep();}}
 assert.ok(runtime.last);const last=runtime.last,payload=physical(last),schedule=c.player.state();assert.equal(c.interrupts.length,0);assert.equal(schedule.audit.late.length,0);
 c.player.finish(last.elapsed);for(let t=elapsed+.02;t<Math.max(elapsed,...companions.slice(0,parts).map(s=>s.line.terminal.elapsed))+3;t+=.02)c.advance(t);
 const final=c.player.state();assert.equal(final.active,false);assert.equal(c.timers.size,0);c.player.dispose();runtime.clearShot();const reset=counts();runtime.dispose();const disposed=counts();assert.equal(disposed.bodies,0);scene.dispose();const sceneDisposed=counts();engine.dispose();
 return {setup,parts,frames,ticks,fullPhysicalSHA256:hash(payload),contactsSHA256:hash(last.contacts),pathSHA256:hash(last.samples),terminal:last.terminal,contactBodies:last.contacts.map(c=>c.body),rawImpacts:last.resonance.impacts,liveAudioAttacks:schedule.audit.scheduled.filter(s=>s.layer===2).length,scheduledPerLayer:[0,1,2].map(layer=>final.audit.scheduled.filter(s=>s.layer===layer).length),late:final.audit.late.length,status:final.audit.status,ready,active,reset,disposed,sceneDisposed,buildCpuMs:buildMs,cycleCpuMs:performance.now()-start};
}
const results=[];
for(const entry of worlds){
 const cases=[['arrival',entry.opening],['yaw-left',{...entry.opening,yaw:entry.opening.yaw-.5}],['yaw-right',{...entry.opening,yaw:entry.opening.yaw+.5}],['lower-elevation',{...entry.opening,elevation:entry.opening.elevation-.5}],['more-power',{...entry.opening,charge:Math.min(1,entry.opening.charge+.01)}],['low-edge-miss',{railIndex:1,originX:0,yaw:70,elevation:5,charge:.1}],['high-carry',{railIndex:1,originX:0,yaw:0,elevation:70,charge:.9}]];
 for(const [label,setup]of cases){const baseline=await run(entry,setup,0,[1/120]);const runs=[];for(const parts of [0,1,2])for(const frames of [[1/30],[1/144],[1/144,1/30,.07,1/60]]){const row=await run(entry,setup,parts,frames);assert.equal(row.fullPhysicalSHA256,baseline.fullPhysicalSHA256,`${entry.id}/${label}/${parts}/${frames}`);const {rawImpacts,contactBodies,...compact}=row;assert.ok(Array.isArray(rawImpacts)&&Array.isArray(contactBodies));runs.push(compact);}results.push({world:entry.id,label,baseline,runs});}
 console.log(JSON.stringify({world:entry.id,cases:cases.length,comparisons:cases.length*9}));
}
const triplets=[];
for(let a=0;a<captures.length;a++)for(let b=0;b<captures.length;b++)for(let c=0;c<captures.length;c++){
 const chosen=[captures[a],captures[b],captures[c]],events=chosen.flatMap((r,layer)=>counterlineRecordedImpacts(r.line,r.acoustics).filter(n=>n.gain>0).map(n=>({layer,time:n.time}))).sort((a,b)=>a.time-b.time);
 const maxOverlappingAttacks=Math.max(0,...events.map(n=>events.filter(e=>e.time>=n.time&&e.time-n.time<2.4).length));
 const arrangement=createCounterlineEnsemble(chosen.map(r=>r.line),chosen.map(r=>r.acoustics),ensembleSettings());assert.deepEqual(validateCounterlineEnsemble(JSON.parse(JSON.stringify(arrangement))),arrangement);
 triplets.push({sources:[a,b,c],attacks:events.length,maxAttacks2_4s:maxOverlappingAttacks,events});
}
const denseWorld=worlds[1],denseHarness=createRangeHarness(havok,denseWorld.world,physicalBaseline);denseHarness.runtime.setDynamics(denseWorld.profile.dynamics);const denseShot=denseHarness.shoot(denseWorld.world,{railIndex:1,originX:0,yaw:10,elevation:12,charge:.8});denseHarness.dispose();
const denseLine=packWorldcraftLine({id:'ensemble-terraces-dense-20261126',createdAt:'2026-11-26T00:00:00.000Z',worldSnapshot:captureWorldSnapshot(denseShot.world,physicalBaseline),setup:denseShot.setup,launch:denseShot.launch,points:denseShot.samples,events:denseShot.evidence,contacts:denseShot.contacts,terminal:denseShot.terminal,performance:performanceFromResonance(denseShot.resonance)}),denseCapture=captureCounterlineRecording(denseLine,denseShot.resonance,denseWorld.profile);
const denseTrio=createCounterlineEnsemble(Array(3).fill(denseCapture.line),Array(3).fill(denseCapture.acoustics),ensembleSettings());const denseClock=clock();await denseClock.player.prepare(denseTrio.settings);assert.equal(denseClock.player.audition(denseTrio),true);for(let t=.02;t<6;t+=.02)denseClock.advance(t);const densePlayback=denseClock.player.state();assert.equal(densePlayback.audit.scheduled.length,30);assert.equal(densePlayback.audit.late.length,0);assert.equal(densePlayback.audit.status,'finished');denseClock.player.dispose();
const resources=worlds.map(entry=>{const rows=results.filter(r=>r.world===entry.id).flatMap(r=>r.runs),sorted=rows.map(r=>r.buildCpuMs).sort((a,b)=>a-b);return {world:entry.id,runtimeOnlyReady:rows[0].ready,runtimeOnlyActive:rows[0].active,runtimeOnlyReset:rows[0].reset,cleanCycles:rows.length,maxBodiesAfterDispose:Math.max(...rows.map(r=>r.disposed.bodies)),maxMeshesAfterSceneDispose:Math.max(...rows.map(r=>r.sceneDisposed.meshes)),medianBuildCpuMs:sorted[Math.floor(sorted.length/2)],renderedDrawCalls:null,renderedFrameMs:null};});
for(const file of files)assert.equal(hash(await readFile(new URL('../../'+file,import.meta.url),'utf8')),sourceHashes[file],`Source changed while measuring: ${file}`);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha,'HEAD changed while measuring');
const packet={sourceSha:sha,baselineSha:'6f080b78efb5afbeb5d8d087b1426e5681d6726d',sourceHashes,authority:{physics:'actual Havok with Babylon NullEngine',Hz:120,gravity:RAIL_RULES.gravity,mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius,audio:'deterministic fake AudioContext clock; scheduled impact parameters only, no sound generated',resources:'runtime-only scene; no presentation/launcher meshes or shadow map',physicalHashFields:['world','setup','launch','contacts','samples','evidence','terminal','resonance']},comparisonCount:results.reduce((n,r)=>n+r.runs.length,0),results,triplets,denseTrio,densePlayback,resources,limits:['No browser-rendered frame timing or listening judgment','Old Descending construction-history discrepancy remains; comparisons use equivalent fresh scenes','Same 2.4-second conservative budget window; no arbitrary import guarantee','Sampled detents are physical comparisons, not measured human discovery rates']};
await mkdir(new URL('../../public/forms-ensemble/',import.meta.url),{recursive:true});await writeFile(new URL('../../public/forms-ensemble/ensemble-examples.json',import.meta.url),JSON.stringify({dense:denseCapture})+'\n');
await mkdir(new URL('../../docs/experiments/forms-ensemble/',import.meta.url),{recursive:true});await writeFile(new URL('../../docs/experiments/forms-ensemble/ensemble-evidence.json',import.meta.url),JSON.stringify(packet)+'\n');console.log(JSON.stringify({comparisons:packet.comparisonCount,resources,maxFixtureWindow:Math.max(...triplets.map(t=>t.maxAttacks2_4s))}));
