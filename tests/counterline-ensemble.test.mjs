import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3} from '@babylonjs/core';
import {ensembleSettings,createCounterlineEnsemble,validateCounterlineEnsemble,createEnsembleAudio,loadEnsembles,saveEnsembles,ENSEMBLE_KEY,ensembleAttackOverlap} from '../lib/counterline-ensemble.js';
import {validateCounterlineRecording,counterlineRecordedImpacts} from '../lib/counterline-recording.js';
import {counterlineStepBudget,createCounterlinePair,validateCounterlinePair} from '../lib/counterline.js';
import {counterlineWorlds} from '../lib/counterline-worlds.js';
import {createWorldcraftRuntime} from '../lib/worldcraft-runtime.js';
import {RAIL_RULES} from '../lib/rail-golf-v02.js';
import {packWorldcraftLine,captureWorldSnapshot} from '../lib/worldcraft-model.js';
import {performanceFromResonance} from '../lib/worldcraft-resonance.js';
import {createRangeHarness} from '../scripts/range/run.mjs';
Logger.LogLevels=0;
const old=JSON.parse(await readFile(new URL('../public/playability/loops-examples.json',import.meta.url))).lines;
const captures=JSON.parse(await readFile(new URL('../public/refinement/counterline-examples.json',import.meta.url))).recordings.map(validateCounterlineRecording);
const worlds=counterlineWorlds(old[0].worldSnapshot.world);
const copy=structuredClone;
function fixture({suspended=false,scheduleThrows=false}={}){
 const contexts=[],scheduled=[],timers=new Set(),interrupts=[],states=[];let resume;
 class Context{constructor(){this.state=suspended?'suspended':'running';this.currentTime=0;this.closed=0;contexts.push(this);}resume(){return new Promise(resolve=>{resume=()=>{this.state='running';resolve();};});}close(){this.state='closed';this.closed++;return Promise.resolve();}}
 const player=createEnsembleAudio({Context,schedule(ctx,time,impact){if(scheduleThrows)throw Error('intentional audio failure');const nodes=Array.from({length:5},()=>({stop(){this.stopped=true;},disconnect(){this.disconnected=true;},addEventListener(type,fn){this.ended=fn;}}));scheduled.push({time,impact,nodes});return nodes;},setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);},onInterrupt:detail=>interrupts.push(detail),onState:value=>states.push(value)});
 return {player,contexts,scheduled,timers,interrupts,states,resume:()=>resume(),advance(time){contexts.at(-1).currentTime=time;for(const fn of [...timers])fn();},finishNodes(){for(const s of scheduled)for(const n of s.nodes)n.ended?.();}};
}
const companions=captures.slice(0,2).map(r=>({line:r.line,acoustics:r.acoustics}));
const trio=()=>createCounterlineEnsemble([captures[0].line,captures[2].line,captures[3].line],[captures[0].acoustics,captures[2].acoustics,captures[3].acoustics],ensembleSettings());
test('ensemble preserves three independent sources and per-source acoustic policies without rewriting pair formats',()=>{
 const input=trio(),result=validateCounterlineEnsemble(JSON.parse(JSON.stringify(input)));assert.deepEqual(result,input);assert.notEqual(result.sources[0],input.sources[0]);
 assert.throws(()=>{result.sources[0].performance.impacts[0].time=99;});assert.notEqual(input.sources[0].performance.impacts[0].time,99);
 const sparse=createCounterlineEnsemble([null,captures[0].line,captures[2].line],[null,null,captures[2].acoustics],ensembleSettings({layers:[{gain:0,muted:true},{gain:.2,muted:false},{gain:.4,muted:false}]}));assert.equal(sparse.sources[0],null);assert.equal(sparse.acoustics[1],null);assert.deepEqual(counterlineRecordedImpacts(sparse.sources[1],sparse.acoustics[1]),captures[0].line.performance.impacts);
 const legacy=createCounterlinePair(...old);assert.deepEqual(validateCounterlinePair(JSON.parse(JSON.stringify(legacy))),legacy);assert.equal(legacy.version,1);
});
test('ensemble rejects unbounded settings, unapproved fields, source or acoustic tampering',()=>{
 for(const mutate of [p=>p.sources.push(old[0]),p=>p.sources[2]=null,p=>p.acoustics.pop(),p=>p.sources[0].worldSnapshot.world.objects[0].x++,p=>p.sources[0].points.reverse(),p=>p.acoustics[0].normalSpeeds=[],p=>p.settings.layers[0].gain=.46,p=>p.settings.layers[0].gain=NaN,p=>p.settings.layers[0].muted=1,p=>p.settings.delay=.2,p=>p.settings.layers[0].voice='remote',p=>p.extra=true]){const bad=copy(trio());mutate(bad);assert.throws(()=>validateCounterlineEnsemble(bad));}
 for(const value of [-.1,.46,Infinity,NaN])assert.throws(()=>ensembleSettings({layers:[{gain:value,muted:false},{gain:.3,muted:false},{gain:.3,muted:false}]}));
});
test('three layers preserve unquantized common timestamps, pitches, and independent gain',async()=>{
 const f=fixture(),settings=ensembleSettings({layers:[{gain:.1,muted:false},{gain:.2,muted:false},{gain:.3,muted:false}]});await f.player.prepare(settings);assert.equal(f.player.commit([{line:old[0],acoustics:null},{line:old[0],acoustics:null}]),true);
 const impact=old[0].performance.impacts[0];for(let t=.02;t<=.28;t+=.02)f.advance(t);f.player.live(impact);
 assert.equal(f.scheduled.length,3);assert.deepEqual(f.scheduled.map(n=>n.time),Array(3).fill(.1+impact.time));assert.deepEqual(f.scheduled.map(n=>n.impact.hz),Array(3).fill(impact.hz));assert.deepEqual(f.scheduled.map(n=>n.impact.gain),[.1,.2,.3].map(g=>g*impact.gain));assert.deepEqual(f.player.state().audit.scheduled.map(n=>n.layer),[0,1,2]);assert.equal(f.player.state().audit.late.length,0);f.player.dispose();
});
test('short live completion lets both companions and full captured tails finish',async()=>{
 const f=fixture();await f.player.prepare();f.player.commit(companions);f.player.finish(.05);for(let t=.02;t<8;t+=.02){f.advance(t);f.finishNodes();}
 assert.equal(f.interrupts.length,0);assert.equal(f.scheduled.length,companions.reduce((n,s)=>n+counterlineRecordedImpacts(s.line,s.acoustics).filter(x=>x.gain>0).length,0));assert.equal(f.player.state().active,false);assert.equal(f.player.state().audit.status,'finished');assert.equal(f.timers.size,0);assert.equal(f.contexts[0].closed,1);
});
test('ended companions cannot prematurely stop a live physical contribution',async()=>{
 const f=fixture();await f.player.prepare();f.player.commit(companions);for(let t=.02;t<9;t+=.02){f.advance(t);f.finishNodes();}assert.equal(f.player.state().active,true);f.player.finish(9);for(let t=9;t<12;t+=.02){f.advance(t);f.finishNodes();}assert.equal(f.player.state().audit.status,'finished');
});
test('muting one layer retires only its scheduled nodes and never replays old contacts',async()=>{
 const f=fixture();await f.player.prepare();f.player.commit([{line:old[0],acoustics:null},{line:old[0],acoustics:null}]);for(let t=.02;t<.3;t+=.02)f.advance(t);assert.equal(f.scheduled.length,2);f.player.setLayer(0,{muted:true});assert.equal(f.player.state().sources[0].active,0);assert.ok(f.player.state().sources[1].active>0);f.player.setLayer(0,{muted:false});assert.throws(()=>f.player.setLayer(0,{gain:.15}),/Stop or finish/);f.advance(.32);assert.equal(f.scheduled.length,2);f.player.dispose();assert.equal(f.player.state().sources.reduce((n,l)=>n+l.active,0),0);
});
test('two dense recorded sources fail explicitly and live overflow stops all layers instead of dropping notes',async()=>{
 const dense=copy(old[0]);dense.performance.impacts=Array.from({length:32},()=>copy(dense.performance.impacts[0]));const f=fixture();await f.player.prepare();f.player.commit([{line:dense,acoustics:null},{line:dense,acoustics:null}]);for(let t=.02;t<.3&&f.player.state().active;t+=.02)f.advance(t);assert.equal(f.player.state().active,false);assert.match(f.states.at(-1).detail,/budget/i);assert.ok(f.scheduled.length<=36);f.player.dispose();
 const live=fixture();await live.player.prepare();live.player.commit([]);for(let i=0;i<37;i++)live.player.live({...old[0].performance.impacts[0],time:0});assert.equal(live.player.state().active,false);assert.match(live.interrupts[0],/36 overlapping attacks/i);assert.equal(live.scheduled.length,36);assert.equal(live.player.state().sources.reduce((n,l)=>n+l.active,0),0);
});
test('Stop during async unlock and twelve repeated launches leave no stale timers or voices',async()=>{
 const delayed=fixture({suspended:true}),pending=delayed.player.prepare();delayed.player.stop();delayed.resume();assert.equal(await pending,false);assert.equal(delayed.player.commit(companions),false);assert.equal(delayed.contexts[0].closed,1);
 const f=fixture();for(let i=0;i<12;i++){await f.player.prepare();f.player.commit([{line:old[0],acoustics:null},{line:old[0],acoustics:null}]);for(let t=.02;t<.3;t+=.02)f.advance(t);f.player.stop();assert.equal(f.timers.size,0);assert.equal(f.player.state().sources.reduce((n,l)=>n+l.active,0),0);}assert.ok(f.contexts.every(c=>c.closed===1));f.player.dispose();assert.equal(await f.player.prepare(),false);
});
test('suspension, missed live deadline, scheduler stall, and scheduling error are explicit interruptions',async()=>{
 for(const mode of ['suspend','late','stall','throw']){const f=fixture({scheduleThrows:mode==='throw'});await f.player.prepare();f.player.commit([{line:old[0],acoustics:null}]);if(mode==='suspend'){f.contexts[0].state='suspended';f.contexts[0].onstatechange();}else if(mode==='late'){for(let t=.02;t<.4;t+=.02)f.advance(t);f.player.live(old[0].performance.impacts[0]);}else if(mode==='stall')f.advance(.3);else for(let t=.02;t<.3;t+=.02)f.advance(t);assert.equal(f.player.state().active,false,mode);assert.equal(f.interrupts.length,1,mode);assert.equal(f.timers.size,0,mode);assert.equal(f.contexts[0].closed,1,mode);}
});
test('actual Havok solo, duet and trio preserve complete physical results across equivalent frame partitions',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 for(const entry of worlds.slice(0,2)){
  const h=createRangeHarness(havok,entry.world,'unknown');h.runtime.setDynamics(entry.profile.dynamics);const baseline=h.shoot(entry.world,entry.opening);h.dispose();
  for(const count of [0,1,2])for(const frames of [[1/30],[1/144],[1/144,1/30,.07,1/60]]){
   const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
   const f=fixture(),runtime=createWorldcraftRuntime(scene,{world:entry.world,build:'unknown',onEvent(e){if(e.kind==='resonance')f.player.live(e.impact);}});runtime.setMode('play');runtime.setDynamics(entry.profile.dynamics);const bodies=physics.getBodies().length;
   await f.player.prepare({},entry.profile);runtime.launch(entry.opening);f.player.commit(companions.slice(0,count));assert.equal(physics.getBodies().length,bodies+1);
   let ticks=0,elapsed=0,index=0;while(!runtime.flight.ended&&ticks<7300){elapsed+=frames[index++%frames.length];f.advance(elapsed);const due=counterlineStepBudget(elapsed,ticks);for(let n=0;n<due&&!runtime.flight.ended;n++){runtime.beforeStep();physics._step(1/120);ticks++;runtime.afterStep();}}
   for(const key of ['setup','launch','contacts','samples','evidence','terminal','resonance'])assert.deepEqual(runtime.last[key],baseline[key],`${entry.id} ${count} ${key}`);
   assert.equal(f.interrupts.length,0);assert.equal(f.player.state().audit.late.length,0);f.player.finish(runtime.last.elapsed);f.player.dispose();runtime.dispose();assert.equal(physics.getBodies().length,0);assert.equal(f.timers.size,0);scene.dispose();engine.dispose();
  }
 }
});

test('bounded arrangement storage preserves corrupt bytes, rejects conflicting writes, and round-trips separate sources',()=>{
 const bytes=new Map(),storage={getItem:key=>bytes.get(key)??null,setItem:(key,value)=>bytes.set(key,value)};const arrangement=trio();let state=loadEnsembles(storage);assert.equal(state.writable,true);assert.deepEqual(state.records,[]);const raw=saveEnsembles(storage,[arrangement],state.raw);assert.equal(raw,storage.getItem(ENSEMBLE_KEY));state=loadEnsembles(storage);assert.deepEqual(state.records,[arrangement]);assert.throws(()=>saveEnsembles(storage,[arrangement],null),/Another tab/);assert.throws(()=>saveEnsembles(storage,Array(5).fill(arrangement),raw),/four/i);assert.equal(storage.getItem(ENSEMBLE_KEY),raw);storage.setItem(ENSEMBLE_KEY,'{bad');state=loadEnsembles(storage);assert.equal(state.writable,false);assert.equal(storage.getItem(ENSEMBLE_KEY),'{bad');assert.throws(()=>saveEnsembles(null,[arrangement],null),/memory only/);
});

test('an actual silent live shot stays an independent ensemble source rather than fabricating a note',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});const entry=worlds[0],h=createRangeHarness(havok,entry.world,'unknown');h.runtime.setDynamics(entry.profile.dynamics);const shot=h.shoot(entry.world,{railIndex:1,originX:0,yaw:70,elevation:5,charge:.1});h.dispose();assert.equal(shot.resonance.impacts.length,0);const line=packWorldcraftLine({worldSnapshot:captureWorldSnapshot(shot.world,'unknown'),setup:shot.setup,launch:shot.launch,points:shot.samples,events:shot.evidence,contacts:shot.contacts,terminal:shot.terminal,performance:performanceFromResonance(shot.resonance)});const value=createCounterlineEnsemble([captures[0].line,null,line],[captures[0].acoustics,null,null],{});assert.deepEqual(validateCounterlineEnsemble(JSON.parse(JSON.stringify(value))),value);assert.equal(value.sources[2].performance.impacts.length,0);
});

test('attack limit counts true 2.4-second overlap, not an overly broad centered window',()=>{
 const separated=[...Array(13).fill(.3),...Array(12).fill(2),...Array(13).fill(3)];assert.equal(ensembleAttackOverlap(separated),25);assert.equal(ensembleAttackOverlap([...Array(36).fill(0),2.4]),36);assert.equal(ensembleAttackOverlap([...Array(36).fill(0),2.399]),37);
});

test('recorded-only audition applies the saved mix even after an unrelated preparation',async()=>{
 const f=fixture(),settings=ensembleSettings({layers:[{gain:.1,muted:false},{gain:.2,muted:false},{gain:.4,muted:false}]}),record=createCounterlineEnsemble([old[0],old[0],old[0]],[null,null,null],settings);await f.player.prepare();assert.equal(f.player.audition(record),true);for(let t=.02;t<.3;t+=.02)f.advance(t);assert.deepEqual(f.scheduled.map(n=>n.impact.gain),[.1,.2,.4].map(g=>g*old[0].performance.impacts[0].gain));assert.deepEqual(f.player.state().firedSettings,settings);f.player.dispose();
});
