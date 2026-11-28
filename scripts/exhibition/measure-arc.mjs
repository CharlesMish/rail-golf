// Independent actual-Havok review; no source geometry or engine coefficients change.
// Usage: node scripts/exhibition/measure-arc.mjs [arc.json exchange.json hairpin.json]
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,PhysicsMotionType,Matrix,Frustum} from '@babylonjs/core';
import {importInstrument,validateInstrument,instrumentWorld,instrumentReferences,instrumentCameraFrame} from '../../lib/instrument-foundry.js';
import {counterlineCameraFrame} from '../../lib/counterline-worlds.js';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {worldcraftIdentity,validateWorldcraftShot,worldcraftBox} from '../../lib/worldcraft-model.js';
import {counterlineVoicedImpact} from '../../lib/counterline-recording.js';
import {ensembleAttackOverlap} from '../../lib/counterline-ensemble.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {measureInstrument,validateInstrumentProbes} from '../instrument-foundry/validate.mjs';
Logger.LogLevels=0;
const baseline='8278fee69fb1bd0c196c2d6fa258faaaaec452e6',sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const paths=process.argv.slice(2),ids=['antiphonal-arc-v1','exchange','hairpin-fable-v1'];
const raw=await Promise.all(ids.map((id,i)=>readFile(paths[i]??new URL(`../../worlds/instruments/${id}/instrument.json`,import.meta.url),'utf8'))),definitions=raw.map(importInstrument),arc=definitions[0],entry=instrumentWorld(arc);
const probePath=paths[0]?resolve(dirname(paths[0]),'probes.json'):new URL('../../worlds/instruments/antiphonal-arc-v1/probes.json',import.meta.url);
const probes=validateInstrumentProbes(arc,JSON.parse(await readFile(probePath,'utf8')));
const native=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const physical=last=>Object.fromEntries(['world','setup','launch','contacts','samples','evidence','terminal','resonance'].map(k=>[k,last[k]]));
const setting=(originX,yaw,elevation,charge)=>({railIndex:1,originX,yaw,elevation,charge});
function summary(last,profile){const notes=last.resonance.impacts.map(n=>counterlineVoicedImpact(n,profile,n.normalSpeed)).filter(n=>n.gain>0);let grouped=0;for(let i=0;i<notes.length;i++)if(i===0||notes[i].time-notes[i-1].time>.15)grouped++;return{setup:last.setup,pieces:notes.map(n=>n.piece),notes:notes.map(n=>n.note),times:notes.map(n=>n.time),gains:notes.map(n=>n.gain),positive:notes.length,gainAtLeast01:notes.filter(n=>n.gain>=.01).length,onsets150ms:grouped,redirects:last.evidence.filter(e=>e.kind==='redirect').length,maxAttacks2_4s:ensembleAttackOverlap(notes.map(n=>n.time)),terminal:last.terminal,physicalSHA256:hash(physical(last)),pathSHA256:hash(last.samples)};}
function harness(initial){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,native));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const start=performance.now(),runtime=createWorldcraftRuntime(scene,{world:initial.world,build:baseline});runtime.setDynamics(initial.profile.dynamics);
 const counts=()=>({staticBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamicBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length});
 const initialReady=counts(),buildCpuMs=performance.now()-start,loadCosts=[];let current=initial;
 return{scene,runtime,initialReady,buildCpuMs,loadCosts,load(next){runtime.clearShot();runtime.setMode('build');const start=performance.now();assert.equal(runtime.replaceWorld(next.world,{intent:'load'}).ok,true);assert.equal(runtime.setDynamics(next.profile.dynamics),true);current=next;loadCosts.push({id:next.id,cpuMs:performance.now()-start,ready:counts()});},shoot(input,{trace=false}={}){
  const s=validateWorldcraftShot(current.world,input);for(const[k,step]of[['originX',.5],['yaw',.5],['elevation',.5],['charge',.01]])assert.ok(Math.abs(s[k]/step-Math.round(s[k]/step))<1e-8);
  runtime.clearShot();runtime.setMode('build');const ready=counts();runtime.setMode('play');assert.equal(runtime.launch(s),true);assert.equal(counts().dynamicBodies,1);
  const body=runtime.flight.aggregate.body,callbacks=[];let pending=[];
  const observer=trace?body.getCollisionObservable().add(event=>{const other=event.collider===body?event.collidedAgainst:event.collider,row={body:other?.transformNode?.name,time:runtime.flight.elapsed,point:event.point?.asArray(),normal:event.normal?.asArray(),incoming:runtime.flight.acousticIncoming?{...runtime.flight.acousticIncoming}:null};callbacks.push(row);pending.push(row);}):null;
  for(let i=0;i<7300&&!runtime.flight.ended;i++){runtime.beforeStep();physics._step(1/120);const outgoing=body.getLinearVelocity().asArray();for(const row of pending)row.outgoingWholeStep=outgoing;pending=[];runtime.afterStep();}
  if(observer)body.getCollisionObservable().remove(observer);assert.ok(runtime.last);const last=runtime.last,result={...summary(last,current.profile),...(trace?{contacts:last.contacts,impacts:last.resonance.impacts,callbacks,samples:last.samples,recognition:last.evidence}:{} )};runtime.clearShot();runtime.setMode('build');assert.deepEqual(counts(),ready);return result;
 },dispose(){runtime.dispose();const afterRuntime=counts();scene.dispose();const afterScene=counts();engine.dispose();assert.equal(afterRuntime.staticBodies+afterRuntime.dynamicBodies,0);assert.equal(afterScene.meshes+afterScene.materials,0);return{afterRuntime,afterScene};}};
}
const out=new URL('../../docs/experiments/instrument-exhibition/',import.meta.url);await mkdir(out,{recursive:true});
const authoritative=await measureInstrument(arc,probes,{sourceSha,havok:native});await writeFile(new URL('arc-authoritative-validator.json',out),JSON.stringify(authoritative)+'\n');
const fresh=[];
for(const spec of [...probes.cases,{id:'original-opening',setup:entry.originalOpening}]){const h=harness(entry);fresh.push({id:spec.id,...h.shoot(spec.setup,{trace:true}),cleanup:h.dispose()});}
const gridDomain={originX:[-8,0,8],yaw:[-30,-15,0,15,30],elevation:[5,15,30,50],charge:[.35,.55,.75]};
const gridSettings=[];for(const o of gridDomain.originX)for(const y of gridDomain.yaw)for(const e of gridDomain.elevation)for(const p of gridDomain.charge)gridSettings.push(setting(o,y,e,p));
function ablation(id,filter){const d=structuredClone(arc);d.preset.id=id;d.preset.name='Review control '+id;d.preset.objects=d.preset.objects.filter(filter);d.preset.rules.fixed=d.preset.objects.map(p=>p.id).sort();return instrumentWorld(validateInstrument(d));}
const noCanopy=ablation('arc-review-no-canopy-v1',p=>!p.id.startsWith('canopy')),noWings=ablation('arc-review-no-wings-v1',p=>!p.id.startsWith('west-')&&!p.id.startsWith('east-'));
const variants=[];
for(const e of [entry,noCanopy,noWings]){const h=harness(e),grid=gridSettings.map(s=>h.shoot(s)),centres=probes.cases.map(p=>({id:p.id,...h.shoot(p.setup)}));variants.push({id:e.id,reviewOnly:e.id!==entry.id,worldIdentitySHA256:hash(worldcraftIdentity(e.world)),grid,centres,resources:{ready:h.initialReady,buildCpuMs:h.buildCpuMs,...h.dispose()}});}
const arcGrid=variants[0].grid;
const innerHarness=harness(entry),innerCanopy=[];for(const yaw of[-7.5,7.5])for(const elevation of[24,26,28,30,32,34])for(const charge of[.5,.6,.7])innerCanopy.push(innerHarness.shoot(setting(0,yaw,elevation,charge)));const innerCleanup=innerHarness.dispose();
// Preserve real examples discovered by the bounded common grid, without moving geometry.
const discovered=[];const predicates={
 'actual-lateral':r=>r.pieces.some(p=>p.startsWith('west-'))&&r.pieces.some(p=>p.startsWith('east-')),
 'canopy-and-lower':r=>r.pieces.some(p=>p.startsWith('canopy'))&&r.pieces.some(p=>!p.startsWith('canopy')),
 'short-throat':r=>r.pieces.length===1&&r.pieces[0]==='throat-bell',
 'middle-canopy':r=>r.pieces.some(p=>['canopy-w1','canopy-c','canopy-e1'].includes(p))
};
for(const [id,predicate]of Object.entries(predicates)){const candidates=arcGrid.filter(predicate).sort((a,b)=>a.positive-b.positive||a.terminal.elapsed-b.terminal.elapsed),picked=candidates[0];if(!picked){discovered.push({id,found:false});continue;}const h=harness(entry),central=h.shoot(picked.setup,{trace:true}),neighbors=[];for(const[key,step]of[['originX',.5],['yaw',.5],['elevation',.5],['charge',.01]])for(const sign of[-1,1]){const s={...picked.setup,[key]:Math.round((picked.setup[key]+sign*step)*1000)/1000};try{validateWorldcraftShot(entry.world,s);}catch(error){neighbors.push({control:key,delta:step*sign,rejected:error.message});continue;}const row=h.shoot(s);neighbors.push({control:key,delta:step*sign,retainsRelationship:predicate(row),...row});}discovered.push({id,found:true,central,neighbors,cleanup:h.dispose()});}
// Every prior instrument is actually fired before returning to Arc, matching world changes in play.
const history=[];const cases=fresh.filter(r=>['antiphonal-west-to-east','west-ramp-arc-reply','east-ramp-arc-reply','canopy-drop-reply','original-opening'].includes(r.id));
const h=harness(entry),priors=[...instrumentReferences().map(instrumentWorld),...definitions.slice(1).map(instrumentWorld)];
for(const prior of priors)for(const target of cases){h.load(prior);h.shoot(prior.opening);h.load(entry);const row=h.shoot(target.setup);history.push({prior:prior.id,case:target.id,exact:row.physicalSHA256===target.physicalSHA256,piecesExact:JSON.stringify(row.pieces)===JSON.stringify(target.pieces),fresh:target.physicalSHA256,...row});}
for(let cycle=0;cycle<3;cycle++){for(const prior of priors){h.load(prior);h.shoot(prior.opening);}h.load(entry);for(const target of cases){const row=h.shoot(target.setup);history.push({prior:'full-catalog-cycle-'+cycle,case:target.id,exact:row.physicalSHA256===target.physicalSHA256,piecesExact:JSON.stringify(row.pieces)===JSON.stringify(target.pieces),fresh:target.physicalSHA256,...row});}}
const switching={comparisons:history,loadCosts:h.loadCosts,cleanup:h.dispose()};
const seamFan=[];const seamHistory=harness(entry);
for(const yaw of[-5,-4.5,-4,-3.5,-3,3,3.5,4,4.5,5])for(const elevation of[28,32]){
 const s=setting(0,yaw,elevation,.6),freshScene=harness(entry),a=freshScene.shoot(s,{trace:true});delete a.samples;delete a.impacts;delete a.recognition;const freshCleanup=freshScene.dispose();
 for(const prior of[priors[3],priors[1]]){seamHistory.load(prior);seamHistory.shoot(prior.opening);}seamHistory.load(entry);const b=seamHistory.shoot(s,{trace:true});delete b.samples;delete b.impacts;delete b.recognition;
 seamFan.push({...a,switched:b,exactAfterHairpinAndTerraces:a.physicalSHA256===b.physicalSHA256,piecesExactAfterHairpinAndTerraces:JSON.stringify(a.pieces)===JSON.stringify(b.pieces),freshCleanup});
}
const seamCleanup=seamHistory.dispose();
// OBB supporting-axis separation is a geometric lower bound, not a claim that a ball cannot bridge a gap.
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const gaps=[];for(let i=0;i<entry.world.objects.length;i++)for(let j=i+1;j<entry.world.objects.length;j++){const a=worldcraftBox(entry.world.objects[i]),b=worldcraftBox(entry.world.objects[j]),axes=[...a.axes,...b.axes,...a.axes.flatMap(u=>b.axes.map(v=>cross(u,v)))].filter(v=>Math.hypot(v.x,v.y,v.z)>1e-8).map(v=>{const l=Math.hypot(v.x,v.y,v.z);return{x:v.x/l,y:v.y/l,z:v.z/l};});const gap=Math.max(...axes.map(v=>{const ap=a.corners.map(p=>dot(p,v)),bp=b.corners.map(p=>dot(p,v));return Math.max(Math.min(...ap)-Math.max(...bp),Math.min(...bp)-Math.max(...ap));}));gaps.push({a:entry.world.objects[i].id,b:entry.world.objects[j].id,supportingAxisGap:gap});}
const cameras=[];
for(const [width,height]of[[960,650],[390,397],[844,290]])for(const view of['launch','overview']){
 const frame=view==='overview'?instrumentCameraFrame(arc.camera,width,height):counterlineCameraFrame(entry.world,entry.opening,view,width,height);const viewMatrix=Matrix.LookAtLH(new Vector3(frame.position.x,frame.position.y,frame.position.z),new Vector3(frame.target.x,frame.target.y,frame.target.z),Vector3.Up()),projection=Matrix.Identity();Matrix.PerspectiveFovLHToRef(frame.fov,width/height,.1,320,projection,!frame.horizontal);const planes=Frustum.GetPlanes(viewMatrix.multiply(projection)),pieces=entry.world.objects.map(p=>{const box=worldcraftBox(p),inside=q=>planes.every(n=>n.dotCoordinate(new Vector3(q.x,q.y,q.z))>=0);return{id:p.id,centerInside:inside(box.center),cornersInside:box.corners.filter(inside).length};});cameras.push({width,height,view,frame,pieces});
}
const packet={baseline,sourceSha,scriptSHA256:hash(await readFile(new URL('./measure-arc.mjs',import.meta.url),'utf8')),originalInstrumentRawSHA256:hash(raw[0]),originalSourceBuild:arc.sourceBuild,profile:arc.profile,authority:{solver:'Actual Havok, Babylon NullEngine',Hz:120,mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius,gravity:RAIL_RULES.gravity,firstGround:'unchanged'},freshOriginals:fresh,gridDomain,variants,innerCanopy:{purpose:'Targeted visibility/reachability check for the two plates absent from the common grid; not included in common-grid coverage',rows:innerCanopy,cleanup:innerCleanup},discovered,switching,seamFan:{purpose:'Ordinary aim fan near central canopy gaps; compare fresh scenes with Hairpin and Terraces prior worlds',rows:seamFan,cleanup:seamCleanup},gaps,cameras,limits:['No rendered WebGL, listening, GPU draw-call or physical-phone performance claim','Grid samples ordinary launch settings, not human discovery frequency','gain>=.01 and150ms onset grouping are descriptive only; no playback filtering or quantization','Ablations have distinct review-only identities and are not revisions or exhibition instruments','Callback velocities bracket one whole solver step, not isolated impulses','Camera checks are geometric frustum membership only; no occlusion or comfort claim']};
await writeFile(new URL('arc-independent-evidence.json',out),JSON.stringify(packet)+'\n');
console.log(JSON.stringify({instrument:entry.id,originals:authoritative.cases.length,grid:gridSettings.length,variants:variants.map(v=>({id:v.id,silent:v.grid.filter(r=>r.positive===0).length,multi:v.grid.filter(r=>r.positive>=2).length,canopy:v.grid.filter(r=>r.pieces.some(p=>p.startsWith('canopy'))).length,pieces:[...new Set(v.grid.flatMap(r=>r.pieces))]})),discovered:discovered.map(d=>({id:d.id,found:d.found,setup:d.central?.setup,pieces:d.central?.pieces,neighbors:d.neighbors?.filter(n=>n.retainsRelationship).length})),historyExact:history.filter(r=>r.exact).length,historyTotal:history.length,minAxisGap:Math.min(...gaps.map(g=>g.supportingAxisGap)),camera:cameras.map(c=>({size:[c.width,c.height],view:c.view,centres:c.pieces.filter(p=>p.centerInside).length,allCorners:c.pieces.filter(p=>p.cornersInside===8).length}))}));
