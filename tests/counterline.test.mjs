import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3} from '@babylonjs/core';
import {createRangeHarness} from '../scripts/range/run.mjs';
import {createWorldcraftRuntime} from '../lib/worldcraft-runtime.js';
import {RAIL_RULES} from '../lib/rail-golf-v02.js';
import {performanceFromResonance} from '../lib/worldcraft-resonance.js';
import {createCounterlineAudio,createCounterlinePair,validateCounterlinePair,loadCounterlinePair,counterlineStepBudget,COUNTERLINE_DELAY,COUNTERLINE_GAIN,assertCounterlineSourceIds} from '../lib/counterline.js';
Logger.LogLevels=0;
const lines=JSON.parse(await readFile(new URL('../public/playability/loops-examples.json',import.meta.url))).lines;
const copy=structuredClone;
function fixture({suspended=false,scheduleThrows=false}={}){
 const contexts=[],scheduled=[],timers=new Map(),states=[],interrupts=[];let next=0,resume;
 class Context{constructor(){this.currentTime=0;this.state=suspended?'suspended':'running';this.closed=0;contexts.push(this);}resume(){return new Promise(resolve=>{resume=()=>{this.state='running';resolve();};});}close(){this.closed++;this.state='closed';return Promise.resolve();}}
 const player=createCounterlineAudio({Context,schedule(ctx,when,impact){if(scheduleThrows)throw Error('audio failed');const nodes=Array.from({length:5},()=>({stops:0,disconnects:0,stop(){this.stops++;},disconnect(){this.disconnects++;},addEventListener(type,fn){this.ended=fn;}}));scheduled.push({ctx,when,impact,nodes});return nodes;},setInterval(fn){const id=++next;timers.set(id,fn);return id;},clearInterval(id){timers.delete(id);},onState:state=>states.push(state),onInterrupt:detail=>interrupts.push(detail)});
 return {player,contexts,scheduled,timers,states,interrupts,resume:()=>resume(),advance(time){contexts.at(-1).currentTime=time;for(const fn of [...timers.values()])fn();},finishNodes(){for(const s of scheduled)for(const n of s.nodes)n.ended?.();}};
}
test('pair preserves two independent physical records, explicit canonical settings and immutable provenance',()=>{
 const pair=createCounterlinePair(...lines);assert.deepEqual(validateCounterlinePair(JSON.parse(JSON.stringify(pair))),pair);assert.notEqual(pair.sources[0],lines[0]);pair.sources[0].performance.impacts[0].time=99;assert.notEqual(lines[0].performance.impacts[0].time,99);
 for(const mutate of [p=>{p.settings=null;},p=>{delete p.settings.voice;},p=>{p.settings.voice='exact-original-timbre';},p=>{p.settings.gain=100;},p=>{p.sources[0].contacts=[];},p=>{p.sources[1].points.reverse();},p=>{p.sources[1].worldSnapshot.world.objects[0].x++;},p=>{p.settings.extra=true;}]){const bad=createCounterlinePair(...lines);mutate(bad);assert.throws(()=>validateCounterlinePair(bad));}
 const storage={getItem:()=>'{bad'};assert.equal(loadCounterlinePair(storage).writable,false);assert.equal(storage.getItem(),'{bad');
});
test('live and companion use exactly one audio origin and same unquantized delay/gain',async()=>{
 const f=fixture();await f.player.prepare();assert.equal(f.player.commit(lines[0]),true);
 for(let t=.02;t<=.28;t+=.02)f.advance(t);
 f.player.live(lines[0].performance.impacts[0]);assert.equal(f.scheduled.length,2);
 for(const scheduled of f.scheduled){assert.equal(scheduled.when,COUNTERLINE_DELAY+lines[0].performance.impacts[0].time);assert.equal(scheduled.impact.gain,lines[0].performance.impacts[0].gain*COUNTERLINE_GAIN);assert.equal(scheduled.impact.hz,lines[0].performance.impacts[0].hz);}
 assert.deepEqual(f.player.state().audit.scheduled.map(s=>s.layer),[0,1]);assert.equal(f.player.state().audit.late.length,0);f.player.dispose();
});
test('a natural live ending leaves later companion contacts and full tails; finite finish closes resources',async()=>{
 const f=fixture();await f.player.prepare();f.player.commit(lines[1]);f.player.finish(.5);
 for(let t=.02;t<9.5;t+=.02){f.advance(t);f.finishNodes();}
 assert.equal(f.scheduled.length,3);assert.equal(f.scheduled.at(-1).when,COUNTERLINE_DELAY+lines[1].performance.impacts.at(-1).time);assert.equal(f.states.at(-1).status,'finished');assert.equal(f.contexts[0].closed,1);assert.equal(f.timers.size,0);assert.equal(f.player.state().active,false);
});
test('a short companion does not terminate the still-live physical contribution',async()=>{
 const f=fixture();await f.player.prepare();f.player.commit(lines[0]);for(let t=.02;t<7;t+=.02){f.advance(t);f.finishNodes();}assert.equal(f.player.state().active,true);f.player.finish(7);for(let t=7;t<9.5;t+=.02){f.advance(t);f.finishNodes();}assert.equal(f.states.at(-1).status,'finished');
});
test('mute retires already scheduled source nodes; unmute does not replay past contacts',async()=>{
 const f=fixture();await f.player.prepare();f.player.commit(lines[0]);for(let t=.02;t<.3;t+=.02)f.advance(t);assert.equal(f.scheduled.length,1);f.player.setMuted(0,true);assert.equal(f.player.state().sources[0].active,0);assert.ok(f.scheduled[0].nodes.every(n=>n.stops===1&&n.disconnects===1));f.player.setMuted(0,false);f.advance(.32);assert.equal(f.scheduled.length,1);assert.equal(f.player.state().firedSettings.companionMuted,false);f.player.dispose();
});
test('Stop during async unlock, repeated launch and disposal never revive a stale context',async()=>{
 const delayed=fixture({suspended:true}),pending=delayed.player.prepare();delayed.player.stop();delayed.resume();assert.equal(await pending,false);assert.equal(delayed.player.commit(lines[0]),false);assert.equal(delayed.contexts[0].closed,1);
 const f=fixture();for(let i=0;i<12;i++){await f.player.prepare();f.player.commit(lines[0]);for(let t=.02;t<.3;t+=.02)f.advance(t);f.player.stop();assert.equal(f.timers.size,0);assert.equal(f.player.state().sources.reduce((n,l)=>n+l.active,0),0);}assert.ok(f.contexts.every(c=>c.closed===1));f.player.dispose();assert.equal(await f.player.prepare(),false);
});
test('suspension, missed deadlines, long scheduler stalls and node errors interrupt explicitly',async()=>{
 for(const mode of ['suspend','late','stall','throw']){const f=fixture({scheduleThrows:mode==='throw'});await f.player.prepare();f.player.commit(lines[0]);if(mode==='suspend'){f.contexts[0].state='suspended';f.contexts[0].onstatechange();}else if(mode==='late'){for(let t=.02;t<.4;t+=.02)f.advance(t);f.player.live(lines[0].performance.impacts[0]);}else if(mode==='stall')f.advance(.3);else for(let t=.02;t<.3;t+=.02)f.advance(t);assert.equal(f.player.state().active,false,mode);assert.equal(f.interrupts.length,1,mode);assert.equal(f.timers.size,0,mode);assert.equal(f.contexts[0].closed,1,mode);}
});
test('dense playback is stopped at a bounded voice budget rather than accumulating arbitrary sources',async()=>{
 const dense=copy(lines[0]);dense.performance.impacts=Array.from({length:32},()=>copy(dense.performance.impacts[0]));const f=fixture();await f.player.prepare();f.player.commit(dense);for(let t=.02;t<.3;t+=.02)f.advance(t);assert.equal(f.scheduled.length,24);assert.match(f.interrupts[0],/voice budget/);assert.equal(f.player.state().sources[0].active,0);
});
test('fixed-step budget preserves elapsed time and refuses backlog instead of dropping steps',()=>{
 assert.equal(counterlineStepBudget(1/30,0),4);assert.equal(counterlineStepBudget(1/60,0),2);assert.equal(counterlineStepBudget(1/144,0),0);assert.equal(counterlineStepBudget(.1,0),12);assert.throws(()=>counterlineStepBudget(.2,0),/fell behind/);assert.throws(()=>counterlineStepBudget(NaN,0));
});
test('actual Havok live records equal Solo under 15/30/60/144Hz and mixed render partitions; companion never enters the ledger',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 const source=lines[0],h=createRangeHarness(havok,source.worldSnapshot.world,'unknown');h.runtime.setDynamics('normal-speed');const baseline=h.shoot(source.worldSnapshot.world,source.setup);h.dispose();
 const expected={contacts:baseline.contacts,points:baseline.samples,terminal:baseline.terminal,performance:performanceFromResonance(baseline.resonance)};
 for(const frames of [[1/15],[1/30],[1/60],[1/144],[1/144,1/30,.07,1/60]]){
  const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
  const f=fixture();let events=0;const runtime=createWorldcraftRuntime(scene,{world:source.worldSnapshot.world,build:'unknown',onEvent(e){if(e.kind==='resonance'){f.player.live(e.impact);events++;}}});runtime.setMode('play');runtime.setDynamics('normal-speed');await f.player.prepare();runtime.launch(source.setup);f.player.commit(lines[1]);
  let ticks=0,elapsed=0,index=0;while(!runtime.flight.ended&&ticks<7200){elapsed+=frames[index++%frames.length];f.advance(elapsed);const due=counterlineStepBudget(elapsed,ticks);for(let i=0;i<due&&!runtime.flight.ended;i++){runtime.beforeStep();physics._step(1/120);ticks++;runtime.afterStep();}}
  const last=runtime.last;assert.deepEqual({contacts:last.contacts,points:last.samples,terminal:last.terminal,performance:performanceFromResonance(last.resonance)},expected);assert.equal(events,3);assert.equal(f.player.state().audit.late.length,0);assert.equal(f.interrupts.length,0);assert.ok(f.player.state().audit.scheduled.some(e=>e.layer===0));assert.ok(f.player.state().audit.scheduled.some(e=>e.layer===1));f.player.finish(last.elapsed);f.player.dispose();runtime.dispose();assert.equal(physics.getBodies().length,0);scene.dispose();engine.dispose();
 }
});

test('conflicting source identifiers are rejected while byte-identical history stays deduplicable',()=>{assert.equal(assertCounterlineSourceIds([lines[0],copy(lines[0])]),true);const different=copy(lines[1]);different.id=lines[0].id;assert.throws(()=>assertCounterlineSourceIds([lines[0],different]),/different recorded line/);});
