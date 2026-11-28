// Independent Hairpin review. Reads author data/reports; never executes author code.
// node scripts/exhibition/measure-hairpin.mjs --submission /path/to/hairpin-fable-v1
//   [--exchange worlds/instruments/exchange/instrument.json] [--arc path/to/instrument.json]
//   [--output docs/experiments/instrument-exhibition/hairpin-evidence.json]
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,PhysicsMotionType} from '@babylonjs/core';
import {importInstrument,instrumentWorld,instrumentReferences} from '../../lib/instrument-foundry.js';
import {validateWorldcraftShot,worldcraftIdentity,worldcraftBox} from '../../lib/worldcraft-model.js';
import {counterlineVoicedImpact} from '../../lib/counterline-recording.js';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {ensembleAttackOverlap} from '../../lib/counterline-ensemble.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {measureInstrument,validateInstrumentProbes} from '../instrument-foundry/validate.mjs';

const args=process.argv.slice(2),options={};
while(args.length){const key=args.shift();assert.ok(['--submission','--exchange','--arc','--output'].includes(key)&&args.length&&!options[key],'Use documented argument pairs');options[key]=args.shift();}
assert.ok(options['--submission'],'--submission points to the unchanged author directory');
const dir=resolve(options['--submission']),output=resolve(options['--output']??'docs/experiments/instrument-exhibition/hairpin-evidence.json');
const raw=await readFile(resolve(dir,'instrument.json'),'utf8'),definition=importInstrument(raw),entry=instrumentWorld(definition);
assert.equal(entry.id,'hairpin-fable-v1');
const probeRaw=await readFile(resolve(dir,'probes.json'),'utf8'),probes=validateInstrumentProbes(definition,JSON.parse(probeRaw));
const submitted=JSON.parse(await readFile(resolve(dir,'evidence/validator-report.json'),'utf8'));
const authorHistory=JSON.parse(await readFile(resolve(dir,'evidence/construction-history.json'),'utf8'));
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dependencies=['scripts/exhibition/measure-hairpin.mjs','lib/worldcraft-model.js','lib/worldcraft-runtime.js','lib/worldcraft-scene.js','lib/worldcraft-resonance.js','lib/counterline-recording.js'];
const sourceHashes=Object.fromEntries(await Promise.all(dependencies.map(async file=>[file,hash(await readFile(new URL('../../'+file,import.meta.url),'utf8'))])));
const native=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});Logger.LogLevels=0;
const independent=await measureInstrument(definition,probes,{sourceSha,havok:native});
const compare=[];
for(const current of independent.cases){
 const original=submitted.cases.find(c=>c.id===current.id);assert.ok(original);
 for(const [label,a,b] of [['central',original.central,current.central],...current.neighbors.map((n,i)=>['neighbor-'+i,original.neighbors[i],n])]){
  assert.equal(Boolean(a.rejected),Boolean(b.rejected));
  if(b.rejected)continue;
  const voicedStructureIdentical=a.voicedImpacts.length===b.voicedImpacts.length&&a.voicedImpacts.every((n,i)=>['piece','time','note','hz'].every(k=>n[k]===b.voicedImpacts[i][k]));
  const maxGainDelta=voicedStructureIdentical?Math.max(0,...a.voicedImpacts.map((n,i)=>Math.abs(n.gain-b.voicedImpacts[i].gain))):null;
  compare.push({id:current.id,shot:label,fullPhysicalIdentical:a.fullPhysicalSHA256===b.fullPhysicalSHA256,pathIdentical:a.pathSHA256===b.pathSHA256,voicedBitIdentical:JSON.stringify(a.voicedImpacts)===JSON.stringify(b.voicedImpacts),voicedStructureIdentical,maxGainDelta,voicedGainWithin1e12:maxGainDelta!==null&&maxGainDelta<=1e-12});
 }
}
const compactRun=r=>r.rejected?{setup:r.setup,rejected:r.rejected}:{setup:r.setup,fullPhysicalSHA256:r.fullPhysicalSHA256,pathSHA256:r.pathSHA256,terminal:r.terminal,qualifiedRedirects:r.qualifiedRedirects.map(e=>({piece:e.piece,body:e.body,time:e.time})),contactRuns:r.contacts.length,rawCallbackCount:r.contacts.reduce((n,c)=>n+c.count,0),musicalImpacts:r.musicalImpacts,voicedImpacts:r.voicedImpacts,maxAttacks2_4s:r.maxAttacks2_4s};
const lifecycle=[];
function session(first,label){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,native));scene.physicsEnabled=false;
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const runtime=createWorldcraftRuntime(scene,{world:first.world,build:'independent-hairpin'});runtime.setDynamics(first.profile.dynamics);
 const count=()=>({static:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamic:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length});
 let shots=0,switches=0;
 return {
  shoot(world,setup,{reload=false,details=false}={}){
   if(runtime.mode!=='build')runtime.setMode('build');
   if(reload||worldcraftIdentity(runtime.world)!==worldcraftIdentity(world.world)){assert.ok(runtime.replaceWorld(world.world,{intent:'load'}).ok);runtime.setDynamics(world.profile.dynamics);switches++;}
   const ready=count();runtime.setMode('play');assert.ok(runtime.launch(validateWorldcraftShot(world.world,setup)));assert.equal(count().dynamic,1);
   const callbacks=[],body=runtime.flight.aggregate.body;let incoming=null,pending=[];
   if(details)body.getCollisionObservable().add(event=>{const other=event.collider===body?event.collidedAgainst:event.collider;pending.push({body:other?.transformNode?.name,time:runtime.flight.elapsed,point:event.point?.asArray()??null,normal:event.normal?.asArray()??null,incomingWholeStep:incoming});});
   for(let i=0;i<7300&&!runtime.flight.ended;i++){if(details)incoming=body.getLinearVelocity().asArray();runtime.beforeStep();physics._step(1/120);if(details){const outgoing=body.getLinearVelocity().asArray();callbacks.push(...pending.map(c=>({...c,outgoingWholeStep:outgoing})));pending=[];}runtime.afterStep();}assert.ok(runtime.last);
   const last=runtime.last;runtime.clearShot();runtime.setMode('build');assert.deepEqual(count(),ready);shots++;return details?{last,callbacks}:last;
  },
  dispose(){runtime.dispose();const afterRuntime=count();assert.equal(afterRuntime.static+afterRuntime.dynamic,0);scene.dispose();const afterScene=count();assert.equal(afterScene.meshes+afterScene.materials,0);engine.dispose();lifecycle.push({label,shots,switches,afterRuntime,afterScene});}
 };
}
const physical=last=>Object.fromEntries(['setup','launch','contacts','samples','evidence','terminal','resonance'].map(k=>[k,last[k]]));
const voiced=last=>last.resonance.impacts.map(n=>counterlineVoicedImpact(n,entry.profile,n.normalSpeed));
const significant=last=>voiced(last).filter(n=>n.gain>=.01); // Analysis floor only, never a playback rule.
const region=piece=>piece.startsWith('floor')?'floor':piece.startsWith('bell')?'bell':'lid';
const summary=last=>{const notes=voiced(last),n=notes.filter(x=>x.gain>=.01);return {setup:last.setup,terminal:{reason:last.terminal.reason,elapsed:last.terminal.elapsed},notes:notes.map(x=>({piece:x.piece,note:x.note,time:x.time,gain:x.gain})),significantCount:n.length,redirectCount:last.evidence.filter(x=>x.kind==='redirect').length,fullPhysicalSHA256:hash(physical(last)),maxAttacks2_4s:ensembleAttackOverlap(notes.filter(x=>x.gain>0).map(x=>x.time))};};
const sampleSession=session(entry,'bounded-coverage');
const domain={origins:[-8,0,8],yaws:[-25,-12,0,12,25],elevations:[5,12,20,32,50],charges:[.15,.35,.55,.8]};
const rows=[];
for(const originX of domain.origins)for(const yaw of domain.yaws)for(const elevation of domain.elevations)for(const charge of domain.charges){
 const last=sampleSession.shoot(entry,{railIndex:1,originX,yaw,elevation,charge}),notes=significant(last);
 rows.push({setup:[originX,yaw,elevation,charge],count:notes.length,regions:notes.map(n=>region(n.piece)),pieces:notes.map(n=>n.piece),notes:notes.map(n=>n.note),span:notes.length?notes.at(-1).time-notes[0].time:0,terminal:last.terminal.reason,elapsed:last.terminal.elapsed,redirects:last.evidence.filter(e=>e.kind==='redirect').length,fullPhysicalSHA256:hash(physical(last))});
}
const laneRows=[];
for(const originX of [-8,-6,-4,-2,0,2,4,6,8])for(const charge of [.3,.5,.7,.9])laneRows.push(summary(sampleSession.shoot(entry,{railIndex:1,originX,yaw:0,elevation:5,charge})));
const seamRows=[];
for(const yaw of [5.5,6,6.5,7]){
 const {last,callbacks}=sampleSession.shoot(entry,{railIndex:1,originX:0,yaw,elevation:5,charge:.5},{details:true});
 const described=callbacks.map(c=>{const id=c.body?.replace('worldcraft-object-',''),piece=entry.world.objects.find(x=>x.id===id),normal=c.normal;const alignment=piece&&normal?Math.max(...worldcraftBox(piece).axes.map(a=>Math.abs(a.x*normal[0]+a.y*normal[1]+a.z*normal[2]))):null;return {...c,axisNormalAlignment:alignment};});
 seamRows.push({...summary(last),callbacks:described});
}
sampleSession.dispose();
const tally=list=>({shots:list.length,silent:list.filter(x=>!x.count).length,one:list.filter(x=>x.count===1).length,two:list.filter(x=>x.count===2).length,threeOrFour:list.filter(x=>x.count>=3&&x.count<=4).length,fiveToEight:list.filter(x=>x.count>=5&&x.count<=8).length,ninePlus:list.filter(x=>x.count>=9).length,outOfBounds:list.filter(x=>x.terminal==='out-of-bounds').length,settledOrTimeout:list.filter(x=>!['first-ground-contact','out-of-bounds'].includes(x.terminal)).length,overSixSecondSpan:list.filter(x=>x.span>6).length,impactsExceedRedirects:list.filter(x=>x.count>x.redirects).length});
const [descending,terraces]=instrumentReferences().map(instrumentWorld),others=[],skippedOthers=[];
for(const key of ['--exchange','--arc'])if(options[key]){try{others.push(instrumentWorld(importInstrument(await readFile(options[key],'utf8'))));}catch(error){skippedOthers.push({path:options[key],reason:String(error)});}}
const run=(label,prior=[],order=probes.cases,reload=false)=>{const s=session(prior[0]??entry,label);for(const world of prior)s.shoot(world,world.opening);const result={};for(const p of order)result[p.id]=hash(physical(s.shoot(entry,p.setup,{reload})));s.dispose();return result;};
const fresh=run('fresh-forward'),histories={
 reverse:run('reverse',[],[...probes.cases].reverse()),
 referencesBeforeHairpin:run('references-before',[descending,terraces]),
 alternatingReferences:run('alternating-reference-history',[descending,terraces,entry,descending]),
 freshEach: Object.fromEntries(probes.cases.map(p=>{const s=session(entry,'fresh-'+p.id),value=hash(physical(s.shoot(entry,p.setup)));s.dispose();return [p.id,value];})),
 reloadEach:run('same-world-reload',[],probes.cases,true),
};
if(others.length)histories.otherSubmissions=run('other-submissions-before',others);
const historyComparisons=Object.fromEntries(Object.entries(histories).map(([label,h])=>{const differing=probes.cases.filter(p=>fresh[p.id]!==h[p.id]).map(p=>p.id);return [label,{compared:probes.cases.length,identical:probes.cases.length-differing.length,differing}];}));
const authorFreshDiffering=probes.cases.filter(p=>fresh[p.id]!==authorHistory.freshFullPhysicalSHA256[p.id]).map(p=>p.id);
const report={format:'rail-golf-independent-hairpin-review',version:1,sourceSha,sourceHashes,base:'8278fee69fb1bd0c196c2d6fa258faaaaec452e6',input:{instrumentSHA256:hash(raw),probesSHA256:hash(probeRaw),sourceBuild:definition.sourceBuild},authority:{physics:'Actual Havok / Babylon NullEngine',Hz:120,mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius,gravity:RAIL_RULES.gravity,acoustics:entry.profile},submissionComparison:{declaredSource:submitted.sourceSha,sourceFilesIdentical:JSON.stringify(independent.sourceHashes)===JSON.stringify(submitted.sourceHashes),instrumentHashIdentical:independent.instrumentSHA256===submitted.instrumentSHA256,worldHashIdentical:independent.worldIdentitySHA256===submitted.worldIdentitySHA256,probesHashIdentical:independent.probeSHA256===submitted.probeSHA256,shots:compare.length,allPhysicalIdentical:compare.every(c=>c.fullPhysicalIdentical&&c.pathIdentical),allVoicedWithinTolerance:compare.every(c=>c.voicedStructureIdentical&&c.voicedGainWithin1e12),maxVoicedGainDelta:Math.max(...compare.map(c=>c.maxGainDelta??Infinity)),voicedBitIdenticalCount:compare.filter(c=>c.voicedBitIdentical).length,comparisons:compare},validator:{ok:independent.ok,cases:independent.cases.map(c=>({id:c.id,family:c.family,kind:c.kind,central:compactRun(c.central),neighbors:c.neighbors.map(n=>({control:n.control,delta:n.delta,...compactRun(n)}))})),resources:independent.resources},coverage:{domain,tally:tally(rows),byElevation:Object.fromEntries(domain.elevations.map(e=>[e,tally(rows.filter(r=>r.setup[2]===e))])),rows},laneControl:{description:'Yaw0/elevation5, nine origins and four ordinary powers; data only, not a player-frequency sample',rows:laneRows},seams:{description:'Four ordinary yaw detents straddling the ramp seam; callback velocities bracket a whole physics step, not one isolated collision impulse',rows:seamRows},history:{fresh,comparedWithAuthorFresh:probes.cases.length,authorFreshDiffering,comparisons:historyComparisons,skippedOthers},lifecycle,limits:['Gain >=.01 is a descriptive count, not audibility or a playback filter','Re-voiced gain comparison retains both exact equality and a 1e-12 numerical tolerance; physical records require exact hashes','No rendered WebGL, listening, GPU or physical-phone performance measured','Author negative geometries were not supplied and are not independently reproduced','Bounded samples and construction histories do not establish universal stability or enjoyment']};
await writeFile(output,JSON.stringify(report)+'\n');
console.log(JSON.stringify({ok:true,instrument:entry.id,authorMatches:compare.length,coverage:report.coverage.tally,history:historyComparisons,authorFreshDiffering,lifecycleSessions:lifecycle.length,output}));
