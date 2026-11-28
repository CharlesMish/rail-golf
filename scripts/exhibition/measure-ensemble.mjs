// Independent exhibition review: real Havok sources, deterministic clock fixture.
// Does not change a submitted instrument, the physics engine or acoustic policy.
// node scripts/exhibition/measure-ensemble.mjs [instrument-directory] [output-directory]
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,PhysicsMotionType} from '@babylonjs/core';
import {importInstrument,instrumentWorld,instrumentReferences} from '../../lib/instrument-foundry.js';
import {validateInstrumentProbes} from '../instrument-foundry/validate.mjs';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {captureWorldSnapshot,packWorldcraftLine,validateWorldcraftShot} from '../../lib/worldcraft-model.js';
import {performanceFromResonance,impactAcoustics,impactGain,evenDbGain,WORLDCRAFT_RESONANCE_NORMAL_FULL} from '../../lib/worldcraft-resonance.js';
import {captureCounterlineRecording,validateCounterlineRecording,counterlineRecordedImpacts,counterlineRestoreProfile,importCounterlineCaptures} from '../../lib/counterline-recording.js';
import {createEnsembleAudio,createCounterlineEnsemble,validateCounterlineEnsemble,ensembleAttackOverlap,saveEnsembles,loadEnsembles,ENSEMBLE_KEY} from '../../lib/counterline-ensemble.js';
import {counterlineStepBudget} from '../../lib/counterline.js';

Logger.LogLevels=0;
const inputRoot=resolve(process.argv[2]??'worlds/instruments/exhibition');
const outputRoot=resolve(process.argv[3]??'docs/experiments/instrument-exhibition');
await mkdir(outputRoot,{recursive:true});
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const definitions={};
for(const id of ['exchange','hairpin-fable-v1','antiphonal-arc-v1']){
 const raw=await readFile(resolve(inputRoot,id,'instrument.json'),'utf8');
 const instrument=importInstrument(raw),probes=validateInstrumentProbes(instrument,JSON.parse(await readFile(resolve(inputRoot,id,'probes.json'),'utf8')));
 definitions[id]={instrument,entry:instrumentWorld(instrument),probes,rawSHA256:hash(raw)};
}
const sourceHashes={};for(const file of ['lib/worldcraft-runtime.js','lib/worldcraft-model.js','lib/worldcraft-resonance.js','lib/counterline-recording.js','lib/counterline-ensemble.js','lib/counterline.js','scripts/exhibition/measure-ensemble.mjs'])sourceHashes[file]=hash(await readFile(new URL('../../'+file,import.meta.url),'utf8'));
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const physical=shot=>Object.fromEntries(['world','setup','launch','contacts','samples','evidence','terminal','resonance'].map(key=>[key,shot[key]]));
const snapshot=r=>({line:r.line,acoustics:r.acoustics});
function audioFixture(){
 const contexts=[],timers=new Set(),events=[],nodes=[],states=[],interrupts=[];
 class Context{constructor(){this.currentTime=0;this.state='running';this.closed=0;contexts.push(this);}close(){this.state='closed';this.closed++;return Promise.resolve();}}
 const player=createEnsembleAudio({Context,setInterval:f=>(timers.add(f),f),clearInterval:f=>timers.delete(f),onState:s=>states.push(s),onInterrupt:s=>interrupts.push(s),schedule(_ctx,time,impact){
  const spec=impactAcoustics(impact),count=spec.voice.partials.length+Number(spec.voice.noise>0);
  const owned=Array.from({length:count},()=>({stopped:false,disconnected:false,stop(){this.stopped=true;},disconnect(){this.disconnected=true;},addEventListener(_type,fn){this.ended=fn;}}));
  nodes.push(...owned);events.push({time,impact,nodes:count});return owned;
 }});
 return {player,contexts,timers,events,nodes,states,interrupts,advance(time){const ctx=contexts.at(-1);assert.ok(ctx);ctx.currentTime=time;for(const f of [...timers])f();}};
}
async function fire(entry,setup,id,companions=[],frames=[1/120]){
 validateWorldcraftShot(entry.world,setup);
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);const sound=audioFixture();
 const runtime=createWorldcraftRuntime(scene,{world:entry.world,build:sourceSha,onEvent:e=>{if(e.kind==='resonance')sound.player.live(e.impact);}});runtime.setMode('play');runtime.setDynamics(entry.profile.dynamics);
 const count=()=>({bodies:physics.getBodies().length,dynamic:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length});
 const ready=count();await sound.player.prepare({},entry.profile);assert.equal(runtime.launch(setup),true);assert.equal(sound.player.commit(companions),true);const active=count();assert.equal(active.dynamic,1);assert.equal(active.bodies,ready.bodies+1);
 let ticks=0,elapsed=0,index=0;
 while(!runtime.flight.ended&&ticks<7300){elapsed+=frames[index++%frames.length];sound.advance(elapsed);const due=counterlineStepBudget(elapsed,ticks);for(let n=0;n<due&&!runtime.flight.ended;n++){runtime.beforeStep();physics._step(1/120);ticks++;runtime.afterStep();}}
 const shot=runtime.last;assert.ok(shot);assert.deepEqual(sound.interrupts,[]);
 const line=packWorldcraftLine({id,createdAt:'2026-11-28T00:00:00.000Z',worldSnapshot:captureWorldSnapshot(shot.world,sourceSha),setup:shot.setup,launch:shot.launch,points:shot.samples,events:shot.evidence,contacts:shot.contacts,terminal:shot.terminal,performance:performanceFromResonance(shot.resonance)});
 const recording=captureCounterlineRecording(line,shot.resonance,entry.profile),voiced=counterlineRecordedImpacts(recording.line,recording.acoustics);
 sound.player.finish(shot.elapsed);const end=Math.max(shot.elapsed,...companions.map(s=>s.line.terminal.elapsed))+3;
 for(let time=elapsed+1/120;time<end&&sound.player.state().active;time+=1/120)sound.advance(time);
 assert.equal(sound.player.state().audit.status,'finished');assert.equal(sound.timers.size,0);assert.equal(sound.contexts[0].closed,1);assert.equal(sound.player.state().sources.reduce((n,s)=>n+s.active,0),0);
 const expected=[...companions.flatMap(s=>counterlineRecordedImpacts(s.line,s.acoustics)),...voiced].filter(n=>n.gain>0);
 assert.equal(sound.events.length,expected.length);
 for(const event of sound.events)assert.equal(event.time,.1+event.impact.time);
 const audit=sound.player.state().audit;sound.player.dispose();runtime.clearShot();const reset=count();assert.deepEqual(reset,ready);runtime.dispose();const afterRuntime=count();assert.equal(afterRuntime.bodies,0);scene.dispose();const afterScene=count();assert.equal(afterScene.meshes,0);assert.equal(afterScene.materials,0);engine.dispose();
 return {recording,physical:physical(shot),summary:{id,world:entry.id,setup,profile:entry.profile,fullPhysicalSHA256:hash(physical(shot)),terminal:shot.terminal,qualifiedRedirects:shot.evidence.filter(e=>e.kind==='redirect').length,rawCallbacks:shot.resonance.resonantCallbacks,impacts:voiced.map((n,i)=>({piece:n.piece,role:n.role,time:n.time,note:n.note,hz:n.hz,material:n.material,rawPhysicalGain:shot.resonance.impacts[i].gain,playbackGain:n.gain,normalSpeed:recording.acoustics.normalSpeeds[i],...Object.fromEntries(Object.entries(impactAcoustics(n)).filter(([key])=>key!=='voice'))})),maxAttacks2_4s:ensembleAttackOverlap(voiced.filter(n=>n.gain>0).map(n=>n.time)),scheduledPerLayer:[0,1,2].map(layer=>audit.scheduled.filter(s=>s.layer===layer).length),late:audit.late.length,status:audit.status,resources:{ready,active,reset,afterRuntime,afterScene},remainingTimers:sound.timers.size,remainingAudioNodes:sound.player.state().sources.reduce((n,s)=>n+s.active,0)}};
}
const selected={
 exchange:['near-ramp-alone','ramp-then-middle','continued-exchange','middle-alone','wide-low-miss'],
 'hairpin-fable-v1':['centre-swell','centre-swell-hard','west-long-roll','single-lid-chime','underpowered-patter','east-bell-and-lid-top'],
 'antiphonal-arc-v1':['antiphonal-west-to-east','west-ramp-arc-reply','east-ramp-arc-reply','canopy-drop-reply','throat-solo-bell']
};
const records=new Map(),summaries=[];
for(const [world,ids]of Object.entries(selected)){
 const {entry,probes}=definitions[world];
 for(const id of ids){const probe=probes.cases.find(c=>c.id===id);assert.ok(probe,id);const key=world+'/'+id,result=await fire(entry,probe.setup,'exhibition-'+id);records.set(key,result);summaries.push(result.summary);}
}
// Additional actual-Havok relationships found by the independent Arc review.
for(const [id,setup]of [
 ['measured-wing-reply',{railIndex:1,originX:-8,yaw:-15,elevation:15,charge:.75}],
 ['measured-throat-bell',{railIndex:1,originX:0,yaw:0,elevation:15,charge:.75}],
 ['measured-canopy-centre',{railIndex:1,originX:0,yaw:0,elevation:30,charge:.55}]
]){const result=await fire(definitions['antiphonal-arc-v1'].entry,setup,'exhibition-arc-'+id);records.set('antiphonal-arc-v1/'+id,result);summaries.push(result.summary);selected['antiphonal-arc-v1'].push(id);}
// Densest measured ordinary neighboring Hairpin setting in the original probe set.
const hairpin=definitions['hairpin-fable-v1'],denseSetup={...hairpin.probes.cases.find(c=>c.id==='west-long-roll').setup,yaw:.5};
const dense=await fire(hairpin.entry,denseSetup,'exhibition-hairpin-neighbor');records.set('hairpin-fable-v1/dense-neighbor',dense);summaries.push(dense.summary);
// Two unchanged historical references remain valid companions.
for(const definition of instrumentReferences()){
 const entry=instrumentWorld(definition),result=await fire(entry,entry.opening,'exhibition-reference-'+entry.id);records.set(entry.id+'/reference',result);summaries.push(result.summary);
}
const get=key=>{const value=records.get(key);assert.ok(value,key);return value.recording;};
const fixtureSpecs=[
 {id:'space-between',label:'Sparse replies across all three instruments',keys:['exchange/ramp-then-middle','hairpin-fable-v1/single-lid-chime','antiphonal-arc-v1/canopy-drop-reply']},
 {id:'three-independent',label:'Three independent instruments, rhythmic Hairpin',keys:['exchange/continued-exchange','hairpin-fable-v1/west-long-roll','antiphonal-arc-v1/measured-wing-reply']},
 {id:'dense-hairpin',label:'Three copies of a real dense Hairpin phrase · stress comparison',keys:Array(3).fill('hairpin-fable-v1/dense-neighbor')},
 {id:'reference-answer',label:'Reference instruments answer a Hairpin gesture',keys:['descending-resonance/reference','chime-terraces/reference','hairpin-fable-v1/centre-swell']}
];
const arrangements=fixtureSpecs.map(spec=>{
 const chosen=spec.keys.map(get),record=createCounterlineEnsemble(chosen.map(r=>r.line),chosen.map(r=>r.acoustics));assert.deepEqual(validateCounterlineEnsemble(JSON.parse(JSON.stringify(record))),record);
 return {id:spec.id,label:spec.label,sourceKeys:spec.keys,record};
});
const physicalComparisons=[];
for(const [world,probeId,keys]of [
 ['exchange','continued-exchange',['hairpin-fable-v1/west-long-roll','antiphonal-arc-v1/canopy-drop-reply']],
 ['hairpin-fable-v1','centre-swell',['exchange/ramp-then-middle','antiphonal-arc-v1/west-ramp-arc-reply']],
 ['antiphonal-arc-v1','canopy-drop-reply',['exchange/continued-exchange','hairpin-fable-v1/west-long-roll']]
]){
 const base=records.get(world+'/'+probeId),entry=definitions[world].entry,companions=keys.map(k=>snapshot(get(k))),before=JSON.stringify(companions);
 for(const count of [0,1,2])for(const frames of [[1/30],[1/144],[1/144,1/30,.07,1/60]]){
  const result=await fire(entry,base.summary.setup,'exhibition-equivalence-'+world,companions.slice(0,count),frames);
  assert.deepEqual(result.physical,base.physical);assert.equal(JSON.stringify(companions),before);
  physicalComparisons.push({world,probeId,companions:count,frames,fullPhysicalSHA256:result.summary.fullPhysicalSHA256,scheduledPerLayer:result.summary.scheduledPerLayer,late:result.summary.late,remainingTimers:result.summary.remainingTimers,remainingAudioNodes:result.summary.remainingAudioNodes,remainingBodies:result.summary.resources.afterRuntime.bodies});
 }
}
const arrangementAudit=[];
for(const fixture of arrangements){
 const f=audioFixture();await f.player.prepare(fixture.record.settings);assert.equal(f.player.audition(fixture.record),true);
 const events=fixture.record.sources.flatMap((line,i)=>line?counterlineRecordedImpacts(line,fixture.record.acoustics[i]).filter(n=>n.gain>0):[]);
 const duration=Math.max(...fixture.record.sources.map(line=>line?.terminal.elapsed??0))+2.6;
 for(let t=1/120;t<duration&&f.player.state().active;t+=1/120)f.advance(t);
 assert.equal(f.events.length,events.length);assert.equal(f.player.state().audit.status,'finished');assert.equal(f.timers.size,0);
 arrangementAudit.push({id:fixture.id,attacks:events.length,maxAttacks2_4s:ensembleAttackOverlap(events.map(n=>n.time)),status:f.player.state().audit.status,scheduled:f.events.length,sourceNodes:f.events.reduce((n,e)=>n+e.nodes,0),tailsComplete:true,late:f.player.state().audit.late.length,remainingTimers:f.timers.size,remainingAudioNodes:f.player.state().sources.reduce((n,s)=>n+s.active,0)});f.player.dispose();
}
const allCombos=[];for(const a of selected.exchange)for(const b of [...selected['hairpin-fable-v1'],'dense-neighbor'])for(const c of selected['antiphonal-arc-v1']){
 const keys=['exchange/'+a,'hairpin-fable-v1/'+b,'antiphonal-arc-v1/'+c];const events=keys.flatMap(key=>{const r=get(key);return counterlineRecordedImpacts(r.line,r.acoustics).filter(n=>n.gain>0);});
 allCombos.push({keys,attacks:events.length,maxAttacks2_4s:ensembleAttackOverlap(events.map(n=>n.time))});
}
// Shelf/library independence: source snapshots survive removal of catalog entries.
const sourceCopies=arrangements[1].record.sources.map(line=>structuredClone(line));
const imports=arrangements[1].record.sources.map((line,i)=>importCounterlineCaptures({format:'rail-golf-counterline-recording',version:1,line,acoustics:arrangements[1].record.acoustics[i]}));
assert.deepEqual(imports.map(v=>v.lines[0]),sourceCopies);
for(const recording of records.values()){
 assert.deepEqual(validateCounterlineRecording(JSON.parse(JSON.stringify(recording.recording))),recording.recording);
 assert.deepEqual(counterlineRestoreProfile(recording.recording.line,recording.recording.acoustics),recording.recording.acoustics.profile);
}
const storageMap=new Map(),storage={getItem:key=>storageMap.get(key)??null,setItem:(key,value)=>storageMap.set(key,value)};
const saved=saveEnsembles(storage,arrangements.map(a=>a.record),null);assert.deepEqual(loadEnsembles(storage).records,arrangements.map(a=>a.record));assert.throws(()=>saveEnsembles(storage,Array(5).fill(arrangements[0].record),saved),/four/i);assert.equal(storage.getItem(ENSEMBLE_KEY),saved);
// Lifecycle/error stress is explicitly synthetic notification input, not a physical line.
const seed=get('hairpin-fable-v1/dense-neighbor').line.performance.impacts[0],stress={authority:'Synthetic scheduler notifications only; no fabricated physical record or playable recipe'};
{
 const f=audioFixture();await f.player.prepare();assert.equal(f.player.commit([]),true);for(let i=0;i<37;i++)f.player.live({...seed,time:0});
 assert.equal(f.events.length,36);assert.equal(f.player.state().active,false);assert.match(f.interrupts[0],/36 overlapping attacks/);assert.equal(f.timers.size,0);assert.equal(f.player.state().sources.reduce((n,s)=>n+s.active,0),0);
 stress.liveOverflow={attempted:37,scheduled:36,status:f.player.state().audit.status,detail:f.interrupts[0],allVoicesStopped:f.nodes.every(n=>n.stopped&&n.disconnected)};f.player.dispose();
}
const lifecycle=[];
for(const mode of ['stop','suspend','stall','late','mute','new-prepare']){
 const f=audioFixture(),record=arrangements[1].record;await f.player.prepare();assert.equal(f.player.commit(record.sources.slice(0,2).map((line,i)=>({line,acoustics:record.acoustics[i]}))),true);
 for(let t=1/120;t<1.1;t+=1/120)f.advance(t);
 if(mode==='stop')f.player.stop();
 if(mode==='suspend'){f.contexts[0].state='suspended';f.contexts[0].onstatechange();}
 if(mode==='stall')f.advance(1.5);
 if(mode==='late')f.player.live({...seed,time:0});
 if(mode==='mute'){f.player.setLayer(0,{muted:true});assert.equal(f.player.state().sources[0].active,0);f.player.setLayer(0,{muted:false});f.player.stop();}
 if(mode==='new-prepare'){await f.player.prepare();assert.equal(f.player.state().active,false);f.player.stop();}
 assert.equal(f.timers.size,0);assert.equal(f.player.state().sources.reduce((n,s)=>n+s.active,0),0);assert.ok(f.contexts.every(c=>c.closed===1));
 lifecycle.push({mode,status:f.player.state().audit.status,interruptions:f.interrupts,remainingTimers:f.timers.size,remainingVoices:f.player.state().sources.reduce((n,s)=>n+s.active,0),contextsClosedOnce:true});f.player.dispose();
}
const gainCurve=[0,.5,1,1.5,2,4,8,16,24,32].map(speed=>({normalSpeed:speed,storedNormalSmoothstep:impactGain(speed,WORLDCRAFT_RESONANCE_NORMAL_FULL),authoredNonBankPlayback:evenDbGain(speed),authoredTimberBankPlayback:evenDbGain(speed,{rangeDb:12,shape:1.7,knee:32,gate:1,gateFull:2})}));
const result={sourceSha,sourceHashes,authority:{physics:'Actual Havok, fresh ordered NullEngine scenes,120Hz',audio:'Deterministic fake clock and node-ledger fixture; parameters only, no audible render',comparison:'Original instruments and their authored profiles unchanged',ownerEvidence:false},inputs:Object.fromEntries(Object.entries(definitions).map(([id,v])=>[id,{rawSHA256:v.rawSHA256,declaredKit:v.instrument.sourceBuild,profile:v.instrument.profile}])),sources:summaries,physicalComparisons,arrangementAudit,combinationSurvey:{count:allCombos.length,maximum:Math.max(...allCombos.map(r=>r.maxAttacks2_4s)),allWithin36:allCombos.every(r=>r.maxAttacks2_4s<=36),densest:allCombos.filter(r=>r.maxAttacks2_4s===Math.max(...allCombos.map(x=>x.maxAttacks2_4s)))},gainCurve,storage:{records:4,bytes:saved.length,allSeparateSnapshots:true,fifthRefused:true,originalBytesPreserved:true,explicitCapturedRestoreProfiles:true},stress,lifecycle,limits:['No browser rendering, physical-phone performance or listening evidence','Headless resource counts exclude presentation and real Web Audio nodes','Synthetic overflow is engine guarding, not a claimed actual phrase','Sampled source combinations do not guarantee every possible imported trio fits the budget','Timbral policy is captured, but perceived loudness and musical roles need owner listening']};
await writeFile(resolve(outputRoot,'ensemble-evidence.json'),JSON.stringify(result)+'\n');
await writeFile(resolve(outputRoot,'ensemble-audio-fixtures.json'),JSON.stringify({format:'rail-golf-exhibition-audio-review',version:1,sourceSha,authority:'Independent actual-Havok study fixtures, not owner Keeps or automatic playback',cases:arrangements})+'\n');
console.log(JSON.stringify({ok:true,sources:summaries.length,physicalComparisons:physicalComparisons.length,arrangements:arrangementAudit,combinationSurvey:result.combinationSurvey,storageBytes:saved.length,outputRoot}));
