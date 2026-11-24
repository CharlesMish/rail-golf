import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {repeaterHarness} from '../playability/repeater-harness.mjs';
import {persistenceHarness} from '../playgrounds/persistence-harness.mjs';
import {validGuestRecord} from '../../lib/playgrounds-persistence-records.js';
const base={railIndex:1,yaw:0,elevation:8,charge:.55};
const cases={steady:base,reachExceeded:{...base,charge:.4},strong:{...base,elevation:5,charge:1},banked:{...base,yaw:-50,elevation:10,charge:.85},reverse:{...base,elevation:20,charge:.85}};
const digest=r=>createHash('sha256').update(JSON.stringify(r)).digest('hex');
const brief=r=>({setup:r.setup,contacts:r.contacts,ballEndSeconds:r.elapsed,readySeconds:r.settleElapsed,before:JSON.parse(r.environment.pose),after:JSON.parse(r.settledEnvironment.pose),validRecord:validGuestRecord(r),completeRecordSHA256:digest(r)});
const direct=()=>repeaterHarness(()=>{},{requireTrial:false});
const run=(h,setup,n=5)=>{h.queue.reset();if(!h.queue.start(setup,n))throw Error('Direct commitment refused');const ticks=h.finish();return{summary:h.queue.records.map(brief),seconds:ticks/120,completed:h.queue.records.length,recordBytes:Buffer.byteLength(JSON.stringify(h.queue.records))};};
const data={authority:{base:'ddeed5b688ae8c15166c42a0302bf768bb11be70',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),engine:'Babylon NullEngine + actual Havok',physicsHz:120,extraObservationTicks:90,method:'five total new shots committed directly; no trial, no state reset between attempts'},cases:{},neighbors:{},resources:{},notes:['Every complete record hash includes all contacts, path, setup and environment fields. The script remeasures every record and compares exact JSON against five manual continuations.','Contacts preserve the existing body, point, count, first and last callback fields; the direct-mode queue does not alter the collision recorder.','No rendered draw-call, frame-time, heap or physical-phone claim.']};
for(const [name,setup] of Object.entries(cases)){
 const h=direct(),control=persistenceHarness();try{
  const result=run(h,setup),manual=Array.from({length:5},(_,i)=>control.shoot(setup,{reset:i===0}));
  data.cases[name]={...result,manualContinuationExact:JSON.stringify(h.queue.records)===JSON.stringify(manual)};
 }finally{h.dispose();control.dispose();}
}
for(const name of ['steady','reachExceeded','banked']){
 const s=cases[name];data.neighbors[name]=[];
 for(const patch of [{yaw:s.yaw-.5},{yaw:s.yaw+.5},{elevation:s.elevation-.5},{elevation:s.elevation+.5},{charge:Number((s.charge-.01).toFixed(2))},{charge:Number((s.charge+.01).toFixed(2))}]){
  const h=direct();try{const r=run(h,{...s,...patch});data.neighbors[name].push({patch,hits:r.summary.map(row=>row.contacts.some(c=>c.body==='guest-stone')),final:r.summary.at(-1).after,seconds:r.seconds});}finally{h.dispose();}
 }
}
const samples=[],control=[];
for(let i=0;i<10;i++){
 const h=direct();try{
  const ready={bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size};const start=performance.now();run(h,base);const runMs=performance.now()-start;
  const terminal={bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size};const resetStart=performance.now();h.queue.reset();const resetMs=performance.now()-resetStart;
  h.queue.dispose();h.session.dispose();h.world.dispose();samples.push({buildMs:h.buildMs,runMs,resetMs,ready,terminal,disposed:{bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size}});
 }finally{h.dispose();}
 const m=persistenceHarness();try{const start=performance.now();for(let j=0;j<5;j++)m.shoot(base,{reset:j===0});control.push({buildMs:m.buildMs,fiveManualMs:performance.now()-start});}finally{m.dispose();}
}
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];data.resources={samples,manualControl:control,median:{buildMs:median(samples.map(s=>s.buildMs)),fiveShotsAndPausesMs:median(samples.map(s=>s.runMs)),resetMs:median(samples.map(s=>s.resetMs)),manualBuildMs:median(control.map(s=>s.buildMs)),fiveManualMs:median(control.map(s=>s.fiveManualMs))}};
await mkdir('docs/experiments/places',{recursive:true});await writeFile('docs/experiments/places/repeater-evidence.json',JSON.stringify(data)+'\n');
console.log(JSON.stringify({authority:data.authority,cases:Object.fromEntries(Object.entries(data.cases).map(([k,v])=>[k,{hits:v.summary.map(r=>r.contacts.some(c=>c.body==='guest-stone')),final:v.summary.at(-1).after.slice(0,3),seconds:v.seconds,exact:v.manualContinuationExact,bytes:v.recordBytes}])),neighbors:data.neighbors,resources:data.resources.median},null,2));
