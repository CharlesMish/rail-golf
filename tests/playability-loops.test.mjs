import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { createRangeHarness } from '../scripts/range/run.mjs';
import { performanceFromResonance } from '../lib/worldcraft-resonance.js';
import { createContactLoopPlayer,createLoopPlan,importLoopLines,loadLoopPair,loopEvents,LOOP_GAIN,LOOP_STORAGE_KEY,readLocalLoopLines,validateLoopLine,validateLoopPlan } from '../lib/playability-loops.js';
Logger.LogLevels=0;
const sourceText=await readFile(new URL('../public/playability/loops-examples.json',import.meta.url),'utf8');
const lines=importLoopLines(sourceText).lines,plan=createLoopPlan(lines);
const copy=value=>structuredClone(value);

test('loop sources require existing immutable identity, full path and source contact correspondence',()=>{
 assert.deepEqual(validateLoopLine(lines[0]),lines[0]);
 for(const key of ['id','createdAt','contacts','launch','worldSnapshot']){const bad=copy(lines[0]);delete bad[key];assert.throws(()=>validateLoopLine(bad));}
 for(const change of [l=>{l.id=null;},l=>{l.createdAt=null;},l=>{l.id=undefined;},l=>{l.createdAt=undefined;},l=>{l.points.reverse();},l=>{l.points[0].x+=1;},l=>{l.terminal.position[0]+=1;},l=>{l.terminal.elapsed+=1;},l=>{l.performance.impacts[0].time+=.5;},l=>{l.performance.impacts[0].piece='fake';},l=>{l.performance.impacts[0].hz=440;},l=>{l.worldSnapshot.world.objects[0].x+=1;}]){const bad=copy(lines[0]);change(bad);assert.throws(()=>validateLoopLine(bad));}
});

test('bundled examples reproduce their recorded sound events, contact ledger, path and ending in actual Havok',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 for(const line of lines){
  const h=createRangeHarness(havok,line.worldSnapshot.world,line.worldSnapshot.build);h.runtime.setDynamics('normal-speed');
  try{const shot=h.shoot(line.worldSnapshot.world,line.setup);assert.deepEqual(performanceFromResonance(shot.resonance),line.performance);assert.deepEqual(shot.contacts,line.contacts);assert.deepEqual(shot.samples,line.points);assert.deepEqual(shot.terminal,line.terminal);}finally{h.dispose();}
 }
});

test('a shared cycle pads whole flights with silence; B delay never quantizes, clips or retimes a contact',()=>{
 assert.equal(plan.period,7.5);assert.equal(plan.cycles,8);
 const events=loopEvents(plan);assert.equal(events.length,48);
 for(const event of events)assert.equal(event.time,event.cycle*plan.period+lines[event.layer].performance.impacts[event.index].time);
 const shifted=createLoopPlan(lines,true),later=loopEvents(shifted);
 for(const event of later)assert.equal(event.time,event.cycle*plan.period+lines[event.layer].performance.impacts[event.index].time+(event.layer===1?3.75:0));
 assert.ok(later.at(-1).time>plan.period*plan.cycles);
 assert.deepEqual(validateLoopPlan(JSON.parse(JSON.stringify(shifted))),shifted);
 assert.throws(()=>validateLoopPlan({...plan,period:4}));
});

test('dense valid-looking contact imports are refused rather than silently dropping attacks',()=>{
 const dense=copy(lines[0]);dense.performance.impacts=Array.from({length:32},()=>copy(dense.performance.impacts[0]));
 assert.throws(()=>loopEvents(createLoopPlan([dense,dense])),/too dense/);
});

test('source shelves are read-only and malformed arrangement bytes remain untouched',()=>{
 const memory=new Map([['rail-golf:worldcraft:v1:lines',JSON.stringify({version:1,entries:lines})],[LOOP_STORAGE_KEY,'broken']]);let writes=0;
 const storage={getItem:key=>memory.get(key)??null,setItem(){writes++;throw Error('must not write');}};
 assert.equal(readLocalLoopLines(storage).lines.length,2);assert.equal(writes,0);
 assert.equal(loadLoopPair(storage).writable,false);assert.equal(memory.get(LOOP_STORAGE_KEY),'broken');
 assert.equal(loadLoopPair({getItem:()=>JSON.stringify(plan)}).plan.period,7.5);
 assert.throws(()=>importLoopLines('x'.repeat(2200001)));assert.throws(()=>importLoopLines('{broken'));
});

function fixture({suspended=false}={}){
 const contexts=[],scheduled=[],timers=new Map();let nextTimer=0,resolveResume;
 class Context{
  constructor(){this.currentTime=0;this.state=suspended?'suspended':'running';this.closed=0;contexts.push(this);}
  resume(){return new Promise(resolve=>{resolveResume=()=>{this.state='running';resolve();};});}
  close(){this.state='closed';this.closed++;return Promise.resolve();}
 }
 const schedule=(ctx,when,impact)=>{const nodes=Array.from({length:5},()=>({stops:0,disconnects:0,stop(){this.stops++;},disconnect(){this.disconnects++;},addEventListener(type,fn){if(type==='ended')this.ended=fn;}}));scheduled.push({ctx,when,impact,nodes});return nodes;};
 const states=[];
 const player=createContactLoopPlayer({Context,schedule,setInterval:fn=>{const id=++nextTimer;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),onState:state=>states.push(state)});
 return {player,contexts,scheduled,timers,states,resume:()=>resolveResume(),advance:time=>{contexts.at(-1).currentTime=time;for(const fn of [...timers.values()])fn();}};
}

test('audio clock schedules only near events, trims both layers consistently, and Stop retires every source',async()=>{
 const f=fixture();assert.equal(await f.player.start(plan),true);assert.equal(f.scheduled.length,0);
 f.advance(.2);assert.equal(f.scheduled.length,1);assert.equal(f.scheduled[0].when,.08+lines[0].performance.impacts[0].time);assert.equal(f.scheduled[0].impact.gain,lines[0].performance.impacts[0].gain*LOOP_GAIN);
 assert.equal(f.player.counts().active,5);f.player.stop();assert.equal(f.contexts[0].closed,1);assert.equal(f.timers.size,0);assert.equal(f.player.counts().active,0);assert.equal(f.player.counts().pending,0);
 for(const node of f.scheduled[0].nodes){assert.equal(node.stops,1);assert.equal(node.disconnects,1);}
});

test('mute stops already scheduled layer voices and unmute never replays missed old attacks',async()=>{
 const f=fixture();await f.player.start(plan);f.advance(.2);f.player.setMuted(0,true);assert.equal(f.player.counts().active,0);
 f.player.setMuted(0,false);f.advance(.3);assert.equal(f.scheduled.length,1);
 for(const time of [.6,.9,1.2,1.4])f.advance(time);
 assert.equal(f.scheduled.length,3);f.player.setMuted(1,true);
 assert.equal(f.scheduled.find(s=>s.impact.role==='ramp').nodes[0].stops,1);f.player.dispose();assert.equal(f.contexts[0].closed,1);
});

test('Stop during asynchronous resume cannot revive a context, timer or source',async()=>{
 const f=fixture({suspended:true}),pending=f.player.start(plan);assert.equal(f.contexts.length,1);f.player.stop();f.resume();assert.equal(await pending,false);
 assert.equal(f.scheduled.length,0);assert.equal(f.timers.size,0);assert.equal(f.contexts[0].closed,1);assert.equal(f.player.counts().active,0);
});

test('background-like scheduling delay stops instead of piling overdue notes into one burst',async()=>{
 const f=fixture();await f.player.start(plan);f.advance(3);assert.equal(f.player.counts().playing,false);assert.equal(f.scheduled.length,0);assert.match(f.states.at(-1).detail,/delayed/);assert.equal(f.contexts[0].closed,1);
});

test('finite playback closes its audio context; repeated start/stop creates no surviving source',async()=>{
 const f=fixture();await f.player.start(plan);
 for(let t=.1;t<63;t+=.1){f.advance(t);for(const shot of f.scheduled)for(const node of shot.nodes)node.ended?.();}
 assert.equal(f.player.counts().playing,false);assert.equal(f.contexts[0].closed,1);assert.equal(f.timers.size,0);
 for(let i=0;i<12;i++){await f.player.start(plan);f.advance(.2);f.player.stop();}
 assert.equal(f.contexts.length,13);assert.ok(f.contexts.every(ctx=>ctx.closed===1));assert.equal(f.player.counts().active,0);assert.equal(f.timers.size,0);
 f.player.dispose();assert.equal(await f.player.start(plan),false);
});

test('external suspension retires the finite listen instead of freezing forever',async()=>{
 const f=fixture();await f.player.start(plan);f.advance(.2);f.contexts[0].state='suspended';f.advance(.3);assert.equal(f.player.counts().playing,false);assert.equal(f.player.counts().active,0);assert.equal(f.timers.size,0);assert.match(f.states.at(-1).detail,/interrupted/);
});

test('a later scheduler error closes the context and clears the interval',async()=>{
 let tick,clears=0;const states=[],contexts=[];
 class Context{constructor(){this.state='running';this.currentTime=0;contexts.push(this);}close(){this.state='closed';return Promise.resolve();}}
 const player=createContactLoopPlayer({Context,schedule(){throw Error('node budget');},setInterval(fn){tick=fn;return 1;},clearInterval(){clears++;},onState:state=>states.push(state)});
 assert.equal(await player.start(plan),true);const ctx=contexts[0];ctx.currentTime=.2;tick();assert.equal(ctx.state,'closed');assert.equal(clears,1);assert.equal(player.counts().playing,false);assert.equal(player.counts().pending,0);assert.match(states.at(-1).detail,/node budget/);
});

test('Start refuses a dense import visibly without creating an audio context',async()=>{
 const dense=copy(lines[0]);dense.performance.impacts=Array.from({length:32},()=>copy(dense.performance.impacts[0]));
 const f=fixture();assert.equal(await f.player.start(createLoopPlan([dense,dense])),false);assert.equal(f.contexts.length,0);assert.match(f.states.at(-1).detail,/too dense/);
});
