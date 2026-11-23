import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {repeaterHarness} from './repeater-harness.mjs';
import {persistenceHarness} from '../playgrounds/persistence-harness.mjs';
import {validGuestRecord} from '../../lib/playgrounds-persistence-records.js';
const base={railIndex:1,yaw:0,elevation:8,charge:.55};
const cases={steady:base,reachExceeded:{...base,charge:.4},strong:{...base,elevation:5,charge:1},banked:{...base,yaw:-50,elevation:10,charge:.85},reverse:{...base,elevation:20,charge:.85}};
const pose=r=>JSON.parse(r.settledEnvironment.pose);
const brief=r=>({setup:r.setup,contacts:r.contacts.map(c=>c.body),ballEndSeconds:r.elapsed,readySeconds:r.settleElapsed,before:JSON.parse(r.environment.pose),after:pose(r),moveMetres:Math.hypot(pose(r)[0]-JSON.parse(r.environment.pose)[0],pose(r)[2]-JSON.parse(r.environment.pose)[2]),validRecord:validGuestRecord(r)});
const data={authority:{start:'a90785ac2a03f3f0f00a4dbd758b05f6f49a3054',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),engine:'Babylon NullEngine + actual Havok',physicsHz:120,extraObservationTicks:90,method:'manual trial then five finite repeats; no physical state reset between attempts'},cases:{},neighbors:{},resources:{},notes:['Contact callback incoming/outgoing samples bracket a fixed step; they are not isolated impulse solutions.','All setup changes use ordinary controls: yaw/elevation ±0.5 degrees, charge ±1%.','No browser draw-call, frame-time, heap or physical-phone measurement is implied.']};
for(const [name,setup]of Object.entries(cases)){
 const h=repeaterHarness(),control=persistenceHarness();try{
  const run=h.run(setup);const manual=[];for(let i=0;i<6;i++)manual.push(control.shoot(setup,{reset:i===0}));
  const all=[run.trial,...run.records];data.cases[name]={...run,summary:all.map(brief),manualContinuationExact:JSON.stringify(all)===JSON.stringify(manual),sequenceJSONBytes:Buffer.byteLength(JSON.stringify(run))};
 }finally{h.dispose();control.dispose();}
}
for(const name of ['steady','reachExceeded','banked']){
 const s=cases[name];data.neighbors[name]=[];
 for(const patch of [{yaw:s.yaw-.5},{yaw:s.yaw+.5},{elevation:s.elevation-.5},{elevation:s.elevation+.5},{charge:Number((s.charge-.01).toFixed(2))},{charge:Number((s.charge+.01).toFixed(2))}]){
  const h=repeaterHarness();try{const run=h.run({...s,...patch});data.neighbors[name].push({patch,summary:[run.trial,...run.records].map(brief),sequenceSeconds:run.sequenceSeconds});}finally{h.dispose();}
 }
}
const samples=[];
for(let i=0;i<12;i++){
 const h=repeaterHarness();try{
  const ready={bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size};const start=performance.now();const run=h.run(base);const runMs=performance.now()-start;
  const active={bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size};const resetStart=performance.now();h.queue.reset();const resetMs=performance.now()-resetStart;
  h.queue.dispose();h.session.dispose();h.world.dispose();samples.push({buildMs:h.buildMs,runMs,resetMs,ready,active,disposed:{bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size},recordBytes:Buffer.byteLength(JSON.stringify(run))});
 }finally{h.dispose();}
}
const control=[];for(let i=0;i<12;i++){const h=persistenceHarness();try{const start=performance.now();for(let j=0;j<6;j++)h.shoot(base,{reset:j===0});control.push({buildMs:h.buildMs,sixManualMs:performance.now()-start});}finally{h.dispose();}}
const median=arr=>[...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)];data.resources={samples,manualControl:control,median:{buildMs:median(samples.map(s=>s.buildMs)),sixShotsAndPausesMs:median(samples.map(s=>s.runMs)),resetMs:median(samples.map(s=>s.resetMs)),manualBuildMs:median(control.map(s=>s.buildMs)),sixManualShotsMs:median(control.map(s=>s.sixManualMs))}};
await mkdir('docs/experiments/playability',{recursive:true});await writeFile('docs/experiments/playability/repeater-evidence.json',JSON.stringify(data)+'\n');
console.log(JSON.stringify({cases:Object.fromEntries(Object.entries(data.cases).map(([k,v])=>[k,{hits:v.summary.map(r=>r.contacts.includes('guest-stone')),final:v.summary.at(-1).after.slice(0,3),time:v.sequenceSeconds,exact:v.manualContinuationExact,bytes:v.sequenceJSONBytes}])),neighbors:Object.fromEntries(Object.entries(data.neighbors).map(([k,v])=>[k,v.map(row=>({patch:row.patch,hits:row.summary.map(r=>r.contacts.includes('guest-stone'))}))])),resources:data.resources.median}));
