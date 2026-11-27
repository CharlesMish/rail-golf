// Author audition validator. Run from the repository root:
// node scripts/instrument-foundry/validate.mjs instrument.json --probes probes.json --output report.json
// All central inputs validate before Havok starts. A musical miss is evidence,
// not a validator failure, and no contact-count target is imposed.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,PhysicsMotionType} from '@babylonjs/core';
import {importInstrument,instrumentWorld,validateInstrument} from '../../lib/instrument-foundry.js';
import {worldcraftIdentity,validateWorldcraftShot} from '../../lib/worldcraft-model.js';
import {counterlineVoicedImpact} from '../../lib/counterline-recording.js';
import {ensembleAttackOverlap} from '../../lib/counterline-ensemble.js';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
export const PROBE_FORMAT='rail-golf-instrument-probes',PROBE_LIMIT=32,PROBE_BYTES=65536;
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(v,keys,label)=>{if(!plain(v)||Object.keys(v).sort().join(',')!==keys.slice().sort().join(','))throw Error(`${label}: unsupported or missing fields.`);};
function setup(world,input){
 exact(input,['railIndex','originX','yaw','elevation','charge'],'Probe setup');
 const validated=validateWorldcraftShot(world,input);
 for(const [key,step]of [['originX',.5],['yaw',.5],['elevation',.5],['charge',.01]])if(Math.abs(validated[key]/step-Math.round(validated[key]/step))>1e-8)throw Error(`Probe ${key}: use ordinary player control detents.`);
 return validated;
}
export function validateInstrumentProbes(instrument,input=null){
 const value=validateInstrument(instrument),entry=instrumentWorld(value);
 if(input===null)input={format:PROBE_FORMAT,version:1,cases:[{id:'curated-opening',family:'Curated starting setup',kind:'family',setup:entry.opening},{id:'original-opening',family:'Authored original opening',kind:'family',setup:entry.originalOpening}]};
 if(new TextEncoder().encode(JSON.stringify(input)).length>PROBE_BYTES)throw Error('Probe document exceeds 64 KiB.');
 exact(input,['format','version','cases'],'Probe document');
 if(input.format!==PROBE_FORMAT||input.version!==1||!Array.isArray(input.cases)||input.cases.length<1||input.cases.length>PROBE_LIMIT)throw Error('Probe document needs version1 and 1–32 cases.');
 const ids=new Set();const cases=input.cases.map(probe=>{
  exact(probe,['id','family','kind','setup'],'Probe');
  if(typeof probe.id!=='string'||!(/^[a-z0-9][a-z0-9-]{0,63}$/).test(probe.id)||ids.has(probe.id))throw Error('Probe ids must be unique lowercase slugs, at most64 characters.');ids.add(probe.id);
  if(typeof probe.family!=='string'||probe.family.length<1||probe.family.length>240||probe.family.trim()!==probe.family||/[\u0000-\u001f\u007f]/.test(probe.family))throw Error('Describe each probe family in 1–240 plain-text characters.');
  if(!['family','negative'].includes(probe.kind))throw Error('Probe kind must be family or negative.');
  return {...probe,setup:setup(entry.world,probe.setup)};
 });
 return {format:PROBE_FORMAT,version:1,cases};
}
const musical=last=>last.resonance.impacts.map(n=>Object.fromEntries(['piece','role','time','material','degree','note','hz','gain','callbacks','normalSpeed','speed','point'].filter(k=>k in n).map(k=>[k,n[k]])));
const physical=last=>Object.fromEntries(['world','setup','launch','contacts','samples','evidence','terminal','resonance'].map(k=>[k,last[k]]));
export async function measureInstrument(instrument,probeInput=null,{sourceSha='unknown',havok=null}={}){
 // Keep this ahead of Havok initialization and engine/scene construction.
 const definition=validateInstrument(instrument),entry=instrumentWorld(definition),probes=validateInstrumentProbes(definition,probeInput);
 const sourceHashes={};for(const file of ['lib/instrument-foundry.js','lib/worldcraft-model.js','lib/worldcraft-runtime.js','lib/worldcraft-scene.js','lib/worldcraft-resonance.js','lib/counterline-recording.js','scripts/instrument-foundry/validate.mjs'])sourceHashes[file]=hash(await readFile(new URL('../../'+file,import.meta.url),'utf8'));
 const native=havok??await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 Logger.LogLevels=0;
 const buildStart=performance.now(),engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,native));scene.physicsEnabled=false;const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 let runtime=null,report=null;
 const count=()=>({staticBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamicBodies:physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length});
 try{
  runtime=createWorldcraftRuntime(scene,{world:entry.world,build:sourceSha});runtime.setDynamics(entry.profile.dynamics);const ready=count(),buildCpuMs=performance.now()-buildStart;
  const fire=setting=>{
   const begin=performance.now();if(runtime.mode!=='build')runtime.setMode('build');runtime.setMode('play');assert.equal(runtime.launch(setting),true,'Validated probe failed to launch');const active=count();assert.equal(active.dynamicBodies,1,'Only one projectile may be active');
   for(let i=0;i<7300&&!runtime.flight.ended;i++){runtime.beforeStep();physics._step(1/120);runtime.afterStep();}assert.ok(runtime.last,'Probe must reach a recorded terminal');const last=runtime.last,voiced=last.resonance.impacts.map(n=>counterlineVoicedImpact(n,entry.profile,n.normalSpeed));
   runtime.clearShot();runtime.setMode('build');const reset=count();assert.deepEqual(reset,ready,'Reset leaked runtime-owned resources');
   return {setup:setting,contacts:last.contacts,musicalImpacts:musical(last),voicedImpacts:voiced.map(n=>({piece:n.piece,time:n.time,note:n.note,hz:n.hz,gain:n.gain})),qualifiedRedirects:last.evidence.filter(e=>e.kind==='redirect'),terminal:last.terminal,pathSamples:last.samples.length,pathSHA256:hash(last.samples),fullPhysicalSHA256:hash(physical(last)),maxAttacks2_4s:ensembleAttackOverlap(voiced.filter(n=>n.gain>0).map(n=>n.time)),resources:{active,reset},acceleratedCpuMs:performance.now()-begin};
  };
  const cases=probes.cases.map(probe=>{
   const central=fire(probe.setup),neighbors=[];
   for(const [control,detent]of [['originX',.5],['yaw',.5],['elevation',.5],['charge',.01]])for(const sign of [-1,1]){
    const candidate={...probe.setup,[control]:Math.round((probe.setup[control]+sign*detent)*1000)/1000};let validated;
    try{validated=setup(entry.world,candidate);}catch(error){neighbors.push({control,delta:sign*detent,setup:candidate,rejected:error.message});continue;}
    neighbors.push({control,delta:sign*detent,...fire(validated)});
   }
   return {id:probe.id,family:probe.family,kind:probe.kind,central,neighbors};
  });
  report={format:'rail-golf-instrument-validation',version:1,ok:true,sourceSha,sourceHashes,instrumentSourceBuild:definition.sourceBuild,instrumentId:entry.id,instrumentSHA256:hash(definition),worldIdentitySHA256:hash(worldcraftIdentity(entry.world)),profile:entry.profile,probeSHA256:hash(probes),authority:{physics:'Actual Havok with Babylon NullEngine',Hz:120,mass:RAIL_RULES.projectileMass,radius:RAIL_RULES.projectileRadius,gravity:RAIL_RULES.gravity,firstGround:'unchanged',audio:'Measured physical events and authored acoustic parameters; no audible rendering'},cases,resources:{scope:'Runtime-only; excludes presentation, launcher, trails and shadows',ready,buildCpuMs},limits:['ok means valid inputs and completed actual physics, NOT a musical quality or accessibility score','Sounding impacts and qualified sport redirects are separate ledgers','Neighbor rejections remain explicit; no clamping to manufacture apparent sensitivity','Original collision timings and pitches are not quantized','No browser rendering, listening, GPU draw calls or phone frame timing measured']};
 }finally{
  runtime?.dispose();const afterRuntime=count();scene.dispose();const afterScene=count();engine.dispose();
  if(report){report.resources.afterRuntime=afterRuntime;report.resources.afterScene=afterScene;assert.equal(afterRuntime.staticBodies+afterRuntime.dynamicBodies,0);assert.equal(afterScene.meshes,0);assert.equal(afterScene.materials,0);}
 }
 return report;
}
async function main(){
 const args=process.argv.slice(2);if(!args.length||args[0].startsWith('--'))throw Error('Usage: node scripts/instrument-foundry/validate.mjs instrument.json [--probes probes.json] [--output report.json]');
 const path=args.shift(),options={};while(args.length){const key=args.shift();if(!['--probes','--output'].includes(key)||!args.length||options[key])throw Error('Use each --probes/--output flag once with a file path.');options[key]=args.shift();}
 const instrument=importInstrument(await readFile(path,'utf8'));
 let probes=null;if(options['--probes']){const raw=await readFile(options['--probes'],'utf8');if(new TextEncoder().encode(raw).length>PROBE_BYTES)throw Error('Probe document exceeds64 KiB.');probes=JSON.parse(raw);}
 validateInstrumentProbes(instrument,probes);let sha='unknown';try{sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const report=await measureInstrument(instrument,probes,{sourceSha:sha});const text=JSON.stringify(report)+'\n';
 if(options['--output']){await writeFile(options['--output'],text);console.log(JSON.stringify({ok:true,instrument:report.instrumentId,cases:report.cases.length,fired:report.cases.reduce((n,c)=>n+1+c.neighbors.filter(r=>!r.rejected).length,0),report:options['--output'],authority:'Actual Havok; not a quality score'}));}else process.stdout.write(text);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1;});
