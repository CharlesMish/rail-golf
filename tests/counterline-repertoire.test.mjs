import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3} from '@babylonjs/core';
import {foundryRecord} from '../lib/worldcraft-foundry.js';
import {rangeOpeningSetup} from '../lib/worldcraft-range.js';
import {packWorldcraftLine,captureWorldSnapshot,worldcraftIdentity} from '../lib/worldcraft-model.js';
import {voiceImpact,performanceFromResonance} from '../lib/worldcraft-resonance.js';
import {counterlineWorlds,counterlineControls,counterlineSetup} from '../lib/counterline-worlds.js';
import {captureCounterlineRecording,validateCounterlineRecording,counterlineRecordedImpacts,counterlineVoicedImpact,assertCounterlineRecordingIds,loadCounterlineRecordings} from '../lib/counterline-recording.js';
import {createCounterlineAudio,createCounterlinePair,validateCounterlinePair,counterlineStepBudget} from '../lib/counterline.js';
import {createRangeHarness} from '../scripts/range/run.mjs';
import {createWorldcraftRuntime} from '../lib/worldcraft-runtime.js';
import {RAIL_RULES} from '../lib/rail-golf-v02.js';
Logger.LogLevels=0;
const old=JSON.parse(await readFile(new URL('../public/playability/loops-examples.json',import.meta.url))).lines;
const captures=JSON.parse(await readFile(new URL('../public/refinement/counterline-examples.json',import.meta.url))).recordings.map(validateCounterlineRecording);
const worlds=counterlineWorlds(old[0].worldSnapshot.world);
const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
function audioFixture(){const contexts=[],scheduled=[],interrupts=[],timers=new Set();class Context{constructor(){this.state='running';this.currentTime=0;contexts.push(this);}close(){this.state='closed';return Promise.resolve();}}
 const audio=createCounterlineAudio({Context,schedule(ctx,time,impact){scheduled.push({time,impact});return [];},setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);},onInterrupt:detail=>interrupts.push(detail)});
 return {audio,scheduled,interrupts,timers,advance(t){contexts.at(-1).currentTime=t;for(const fn of timers)fn();}};
}
test('registered rich worlds retain exact geometry/rules/capacity; curated starts and original openings stay separate',()=>{
 assert.equal(worlds.length,4);
 for(const entry of worlds.slice(0,2)){const record=foundryRecord(entry.id);assert.deepEqual(entry.world,record.world);assert.equal(worldcraftIdentity(entry.world),record.worldIdentity);assert.deepEqual(entry.originalOpening,rangeOpeningSetup(record.preset));assert.notDeepEqual(entry.opening,entry.originalOpening);assert.ok(record.manifest.testedShots.some(shot=>JSON.stringify(shot.setup)===JSON.stringify(entry.opening)));}
 assert.equal(worlds[1].world.objects.length,21);assert.equal(worlds[1].world.capacity,24);assert.equal(worlds[0].profile.bankVoice,'tuned-even');assert.equal(worlds[1].profile.bankVoice,null);
});
test('launch adapter obeys actual world constraints and never replaces a restored setup with a workshop opening',()=>{
 const w=structuredClone(worlds[0].world);w.rules.originFixed=true;w.rules.aimWindow={yawMin:-10,yawMax:15,elevationMin:10,elevationMax:45,chargeMin:.2,chargeMax:.7};
 assert.deepEqual(counterlineControls(w),{originX:[0,0],yaw:[-10,15],elevation:[10,45],charge:[.2,.7]});
 assert.deepEqual(counterlineSetup(w,worlds[0].opening,{originX:9,yaw:50,elevation:65,charge:1}),{railIndex:1,originX:0,yaw:15,elevation:45,charge:.7});
 assert.throws(()=>counterlineSetup(w,worlds[0].opening,{charge:NaN}));assert.equal(counterlineSetup(worlds[0].world,worlds[0].opening,{originX:-9.5}).originX,-9.5);
});
test('acoustic capture leaves physical v1 bytes untouched, reproduces H from measured face speeds, and rejects policy tampering',()=>{
 const record=captures[0],before=JSON.stringify(record.line),validated=validateCounterlineRecording(JSON.parse(JSON.stringify(record)));
 const voiced=counterlineRecordedImpacts(record.line,record.acoustics);
 for(const [i,impact]of record.line.performance.impacts.entries())assert.deepEqual(voiced[i],voiceImpact({...impact,normalSpeed:record.acoustics.normalSpeeds[i]},'tuned-even'));
 assert.equal(JSON.stringify(validated.line),before);
 for(const mutate of [r=>r.acoustics.profile.dynamics='total-speed',r=>r.acoustics.normalSpeeds.pop(),r=>r.acoustics.normalSpeeds[0]=null,r=>r.acoustics.normalSpeeds[0]=0,r=>r.acoustics.gain=2,r=>r.line.arbitrary=true,r=>r.acoustics.profile.bankVoice='remote',r=>r.acoustics.normalSpeeds[0]=Infinity]){const bad=structuredClone(record);mutate(bad);assert.throws(()=>validateCounterlineRecording(bad));}
 const different=structuredClone(record);different.acoustics.profile.bankVoice=null;assert.throws(()=>assertCounterlineRecordingIds([record,different]),/different captured/);
});
test('unknown historical gain is never inferred as face speed; v1 pair bytes and explicit v2 null policy survive import',()=>{
 const legacy=structuredClone(old[0]);legacy.performance.impacts[0].gain=.12345;
 assert.deepEqual(counterlineRecordedImpacts(legacy),legacy.performance.impacts);
 const v1=createCounterlinePair(legacy,old[1]);assert.deepEqual(validateCounterlinePair(v1),v1);assert.equal(v1.version,1);
 const v2=createCounterlinePair(captures[0].line,captures[2].line,{},[null,captures[2].acoustics]);const loaded=validateCounterlinePair(v2);assert.equal(loaded.acoustics[0],null);assert.deepEqual(counterlineRecordedImpacts(loaded.sources[0],loaded.acoustics[0]),captures[0].line.performance.impacts);
 const bad=structuredClone(v2);bad.acoustics[1].normalSpeeds=[];assert.throws(()=>validateCounterlinePair(bad));
 const corrupt={getItem:()=>'{bad'};assert.equal(loadCounterlineRecordings(corrupt).writable,false);assert.equal(corrupt.getItem(),'{bad');
});
test('silent physical captures remain valid independent records even though they cannot be musical companions',()=>{
 const entry=worlds[0],h=createRangeHarness(havok,entry.world,'unknown');h.runtime.setDynamics(entry.profile.dynamics);const shot=h.shoot(entry.world,{...entry.originalOpening,yaw:70,elevation:5,charge:.1});
 assert.equal(shot.resonance.impacts.length,0);const line=packWorldcraftLine({worldSnapshot:captureWorldSnapshot(shot.world,'unknown'),setup:shot.setup,launch:shot.launch,points:shot.samples,events:shot.evidence,contacts:shot.contacts,terminal:shot.terminal,performance:performanceFromResonance(shot.resonance)});
 const capture=captureCounterlineRecording(line,shot.resonance,entry.profile);assert.deepEqual(validateCounterlineRecording(JSON.parse(JSON.stringify(capture))),capture);assert.throws(()=>createCounterlinePair(capture.line,old[0]),/no recorded/);h.dispose();
});
test('actual rich-world Havok lines equal their solo controls at 30/144Hz and mixed frames; captured live and historical notes remain separate',async()=>{
 for(const entry of worlds.slice(0,2)){
  const h=createRangeHarness(havok,entry.world,'unknown');h.runtime.setDynamics(entry.profile.dynamics);const baseline=h.shoot(entry.world,entry.opening);h.dispose();
  for(const frames of [[1/30],[1/144],[1/144,1/30,.07,1/60]]){
   const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
   const f=audioFixture();const runtime=createWorldcraftRuntime(scene,{world:entry.world,build:'unknown',onEvent(e){if(e.kind==='resonance')f.audio.live(e.impact);}});runtime.setMode('play');runtime.setDynamics(entry.profile.dynamics);
   await f.audio.prepare({voice:'captured-resonance-v1'},entry.profile);runtime.launch(entry.opening);f.audio.commit(captures[0].line,captures[0].acoustics);
   let ticks=0,elapsed=0,index=0;while(!runtime.flight.ended){elapsed+=frames[index++%frames.length];f.advance(elapsed);const due=counterlineStepBudget(elapsed,ticks);for(let n=0;n<due&&!runtime.flight.ended;n++){runtime.beforeStep();physics._step(1/120);ticks++;runtime.afterStep();}}
   const last=runtime.last;for(const key of ['contacts','samples','terminal','resonance'])assert.deepEqual(last[key],baseline[key]);
   const live=f.audio.state().audit.scheduled.filter(a=>a.layer===1);assert.equal(live.length,last.resonance.impacts.length);assert.equal(f.interrupts.length,0);assert.equal(f.audio.state().audit.late.length,0);
   f.audio.finish(last.elapsed);f.audio.dispose();runtime.dispose();assert.equal(physics.getBodies().length,0);scene.dispose();engine.dispose();assert.equal(f.timers.size,0);
  }
 }
});
test('richer simultaneous captured pair retains original timings, bounded budget, and full tuned tails',async()=>{
 for(const [a,b]of [[captures[0],captures[1]],[captures[2],captures[3]],[captures[0],captures[2]]]){
  const f=audioFixture();await f.audio.prepare({voice:'captured-resonance-v1'},b.acoustics.profile);f.audio.commit(a.line,a.acoustics);let index=0;
  const end=Math.max(a.line.terminal.elapsed,b.line.terminal.elapsed);
  for(let t=.01;t<end+3;t+=.01){f.advance(t);while(index<b.line.performance.impacts.length&&b.line.performance.impacts[index].time<=t){const impact=b.line.performance.impacts[index];f.audio.live({...impact,normalSpeed:b.acoustics.normalSpeeds[index++]});}if(t>=b.line.terminal.elapsed&&f.audio.state().active)f.audio.finish(b.line.terminal.elapsed);}
  assert.equal(f.interrupts.length,0);assert.equal(f.scheduled.length,a.line.performance.impacts.length+b.line.performance.impacts.length);assert.equal(f.audio.state().audit.status,'finished');assert.equal(f.timers.size,0);assert.ok(f.scheduled.every(s=>s.time>=.1));f.audio.dispose();
 }
});
test('captured voice failure cancels instead of reinterpreting missing normal speed',async()=>{const f=audioFixture();await f.audio.prepare({voice:'captured-resonance-v1'},worlds[0].profile);f.audio.commit();f.audio.live(old[0].performance.impacts[0]);assert.equal(f.interrupts.length,1);assert.equal(f.audio.state().active,false);assert.deepEqual(counterlineVoicedImpact(old[0].performance.impacts[0],worlds[1].profile,null),old[0].performance.impacts[0]);});
