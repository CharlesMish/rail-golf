// Independent acceptance probe for a data-only contributor submission.
// Requires a previously edited instrument and the CLI's actual-Havok report.
// The sound sink is a deterministic scheduler fixture, not audible audio.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3} from '@babylonjs/core';
import {importInstrument,exportInstrument,instrumentWorld,appendInstrument,instrumentReferences} from '../../lib/instrument-foundry.js';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {captureWorldSnapshot,packWorldcraftLine} from '../../lib/worldcraft-model.js';
import {performanceFromResonance} from '../../lib/worldcraft-resonance.js';
import {captureCounterlineRecording,validateCounterlineRecording,counterlineRecordedImpacts} from '../../lib/counterline-recording.js';
import {createEnsembleAudio,createCounterlineEnsemble,validateCounterlineEnsemble} from '../../lib/counterline-ensemble.js';

const [instrumentPath,reportPath,outputPath]=process.argv.slice(2);
assert.ok(instrumentPath&&reportPath&&outputPath,'Pass instrument.json, CLI report.json and output.json');
Logger.LogLevels=0;
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const input=await readFile(instrumentPath,'utf8'),definition=importInstrument(input),entry=instrumentWorld(definition);
const cli=JSON.parse(await readFile(reportPath,'utf8'));
assert.equal(cli.instrumentId,entry.id);assert.equal(cli.instrumentSHA256,hash(definition));
assert.deepEqual(importInstrument(exportInstrument(definition)),definition);
const references=instrumentReferences(),before=JSON.stringify(references);
let admitted=appendInstrument(references,definition);
assert.equal(admitted.length,references.length+1);assert.equal(JSON.stringify(references),before);
assert.deepEqual(appendInstrument(admitted,definition),admitted);
const conflict=structuredClone(definition);conflict.invitation='A changed wrapper under the same already admitted identity.';
assert.throws(()=>appendInstrument(admitted,conflict),/different content/);
assert.throws(()=>importInstrument(JSON.stringify({...definition,script:'return 1;'})));
const offDetent=structuredClone(definition);offDetent.opening.yaw+=.01;assert.throws(()=>importInstrument(JSON.stringify(offDetent)),/detents/);

const publicCaptures=JSON.parse(await readFile(new URL('../../public/refinement/counterline-examples.json',import.meta.url))).recordings.map(validateCounterlineRecording);
const companions=[publicCaptures[0],publicCaptures[2]].map(r=>({line:r.line,acoustics:r.acoustics}));
const companionBefore=JSON.stringify(companions),runs=[];
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
let baseline=null,recording=null;
for(const companionCount of [0,1,2]){
 const engine=new NullEngine(),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const contexts=[],timers=new Set(),scheduled=[],interrupts=[];
 class Context{constructor(){this.state='running';this.currentTime=0;this.closed=0;contexts.push(this);}close(){this.state='closed';this.closed++;return Promise.resolve();}}
 const audio=createEnsembleAudio({Context,schedule(_ctx,time,impact){scheduled.push({time,impact});return [];},setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);},onInterrupt:reason=>interrupts.push(reason)});
 const advance=t=>{contexts.at(-1).currentTime=t;for(const timer of [...timers])timer();};
 const runtime=createWorldcraftRuntime(scene,{world:entry.world,build:source,onEvent:event=>{if(event.kind==='resonance')audio.live(event.impact);}});
 runtime.setMode('play');runtime.setDynamics(entry.profile.dynamics);const readyBodies=physics.getBodies().length;
 assert.equal(await audio.prepare({},entry.profile),true);assert.equal(runtime.launch(entry.opening),true);assert.equal(audio.commit(companions.slice(0,companionCount)),true);
 assert.equal(physics.getBodies().length,readyBodies+1);
 let ticks=0;while(!runtime.flight.ended&&ticks<7300){advance(ticks/120);runtime.beforeStep();physics._step(1/120);runtime.afterStep();ticks++;}
 const shot=runtime.last;assert.ok(shot);
 const payload=Object.fromEntries(['world','setup','launch','contacts','samples','evidence','terminal','resonance'].map(key=>[key,shot[key]]));
 if(baseline)assert.deepEqual(payload,baseline);else baseline=structuredClone(payload);
 const line=packWorldcraftLine({id:'review-author-physical-line',createdAt:'2026-11-27T00:00:00.000Z',worldSnapshot:captureWorldSnapshot(shot.world,source),setup:shot.setup,launch:shot.launch,points:shot.samples,events:shot.evidence,contacts:shot.contacts,terminal:shot.terminal,performance:performanceFromResonance(shot.resonance)});
 recording=captureCounterlineRecording(line,shot.resonance,entry.profile);
 audio.finish(shot.elapsed);for(let t=ticks/120;audio.state().active&&t<15;t+=1/120)advance(t);
 assert.deepEqual(interrupts,[]);assert.equal(audio.state().audit.status,'finished');assert.equal(timers.size,0);assert.equal(contexts[0].closed,1);
 const expected=[...companions.slice(0,companionCount).flatMap(c=>counterlineRecordedImpacts(c.line,c.acoustics)),...counterlineRecordedImpacts(recording.line,recording.acoustics)].filter(n=>n.gain>0);
 assert.equal(scheduled.length,expected.length);
 for(const event of scheduled)assert.equal(event.time,.1+event.impact.time);
 runtime.dispose();assert.equal(physics.getBodies().length,0);scene.dispose();engine.dispose();audio.dispose();
 runs.push({companionCount,readyBodies,activeBodies:readyBodies+1,fullPhysicalSHA256:hash(payload),musicalImpacts:shot.resonance.impacts.length,qualifiedRedirects:shot.evidence.filter(e=>e.kind==='redirect').length,scheduledAttacks:scheduled.length,lateEvents:audio.state().audit.late.length,remainingTimers:timers.size,remainingBodies:physics.getBodies().length});
}
assert.equal(JSON.stringify(companions),companionBefore);
// Session-only catalog disposal cannot destroy a complete captured source.
admitted=instrumentReferences();assert.ok(!admitted.some(v=>v.preset.id===entry.id));
const restored=validateCounterlineRecording(JSON.parse(JSON.stringify(recording)));
assert.deepEqual(restored,recording);assert.deepEqual(restored.line.worldSnapshot.world,entry.world);
const ensemble=createCounterlineEnsemble([companions[0].line,companions[1].line,restored.line],[companions[0].acoustics,companions[1].acoustics,restored.acoustics]);
assert.deepEqual(validateCounterlineEnsemble(JSON.parse(JSON.stringify(ensemble))),ensemble);
const result={source,authority:'Data-only external-author workflow; actual Havok physics and a deterministic fake audio-clock/scheduler sink, no rendered/audio-listening claim',instrument:{id:entry.id,sourceBuild:definition.sourceBuild,sha256:hash(definition),pieces:definition.preset.objects.length,profile:definition.profile},cli:{sourceSha:cli.sourceSha,cases:cli.cases.length,fired:cli.cases.reduce((sum,c)=>sum+1+c.neighbors.filter(n=>!n.rejected).length,0),central:cli.cases.map(c=>({id:c.id,notes:c.central.voicedImpacts.filter(n=>n.gain>0).map(n=>n.note),terminal:c.central.terminal.reason,validNeighbors:c.neighbors.filter(n=>!n.rejected).length})),resources:cli.resources},checks:{idempotentImport:true,conflictingIdRejected:true,offDetentRejected:true,scriptRejected:true,sourceSnapshotsIndependent:true,ensembleRoundTrip:true,sessionCatalogIndependentOfKeptSources:true},runs,limits:['Review fixture only, not a selected or independently creative instrument','No WebGL images, audible performance or device frame-rate evidence','Fresh equivalently ordered scenes for physical comparison']};
await writeFile(outputPath,JSON.stringify(result)+'\n');console.log(JSON.stringify({ok:true,runs:runs.length,output:outputPath}));
