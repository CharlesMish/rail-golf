import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
import {Logger,NullEngine,Scene,HavokPlugin,Vector3,DirectionalLight,ShadowGenerator} from '@babylonjs/core';
import {createRangeHarness} from '../range/run.mjs';
import {adaptRangePreset,createMusicalWorkshopPreset} from '../../lib/worldcraft-range.js';
import {createWorldcraftRuntime} from '../../lib/worldcraft-runtime.js';
import {createWorldcraftPresentation} from '../../lib/worldcraft-presentation.js';
import {buildRangeLauncher,buildRangeProjectile} from '../../lib/mechanism-range-presentation.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),examples=JSON.parse(await readFile(new URL('../../public/playability/loops-examples.json',import.meta.url))).lines;
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const worlds=[{id:'early-plate',world:examples[0].worldSnapshot.world},{id:'original-workshop',world:adaptRangePreset(createMusicalWorkshopPreset()).world}];
const compact=shot=>({setup:shot.setup,terminal:shot.terminal,contacts:shot.contacts,notes:shot.resonance.impacts.map(({time,note,gain,normalSpeed,piece})=>({time,note,gain,normalSpeed,piece}))});
const measured=[];
for(const {id,world} of worlds){
 const start=performance.now(),h=createRangeHarness(havok,world,sha),buildMs=performance.now()-start;h.runtime.setDynamics('normal-speed');
 const setup=examples[0].setup,baseline=h.shoot(world,setup),neighbors=[];
 for(const [key,step]of [['yaw',.5],['elevation',.5],['charge',.01],['originX',.5]])for(const sign of [-1,1])neighbors.push(compact(h.shoot(world,{...setup,[key]:Math.round((setup[key]+sign*step)*1000)/1000})));
 const samples=[];for(const yaw of [-20,-10,0,10,20])for(const elevation of [10,18,26,40,60])for(const charge of [.2,.35,.55,.75])samples.push(compact(h.shoot(world,{...setup,yaw,elevation,charge})));
 const absent=compact(h.shoot({...world,objects:[]},setup));h.dispose();
 const summary={sampled:samples.length,notes:Object.fromEntries([0,1,2,3].map(n=>[n===3?'3+':n,samples.filter(s=>n===3?s.notes.length>=3:s.notes.length===n).length])),phrases:[...new Set(samples.map(s=>s.notes.map(n=>n.note).join(' ')))],endings:Object.fromEntries([...new Set(samples.map(s=>s.terminal.reason))].map(r=>[r,samples.filter(s=>s.terminal.reason===r).length])),neighbors:neighbors.map(s=>s.notes.map(n=>n.note).join(' '))};
 measured.push({id,buildMs,baseline:compact(baseline),neighbors,absent,sampleGrid:{yaw:[-20,-10,0,10,20],elevation:[10,18,26,40,60],charge:[.2,.35,.55,.75],originX:0},summary,samples});
}
const resource=[];
for(const {id,world}of worlds){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const sun=new DirectionalLight('sun',new Vector3(0,-1,1),scene),shadows=new ShadowGenerator(1024,sun),presentation=createWorldcraftPresentation(scene);buildRangeLauncher(scene,presentation.materials,shadows);
 const start=performance.now(),runtime=createWorldcraftRuntime(scene,{world,materials:presentation.materials,shadows,build:sha}),buildMs=performance.now()-start;runtime.setMode('play');runtime.setDynamics('normal-speed');
 const cost=()=>({runtime:runtime.diagnostics(),sceneMeshes:scene.meshes.length,visibleMeshes:scene.meshes.filter(m=>m.isEnabled()&&m.isVisible).length,vertices:scene.meshes.reduce((sum,m)=>sum+m.getTotalVertices(),0),triangles:scene.meshes.reduce((sum,m)=>sum+m.getTotalIndices()/3,0),materials:scene.materials.length,shadowCasters:shadows.getShadowMap().renderList.length,physicsBodies:physics.getBodies().length});
 const ready=cost();runtime.launch(examples[0].setup);const projectile=buildRangeProjectile(scene,runtime.flight.mesh,presentation.materials,shadows);const active=cost();
 while(!runtime.flight.ended){runtime.beforeStep();physics._step(1/120);runtime.afterStep();}projectile.dispose();runtime.clearShot();
 const cycles=[];for(let i=0;i<10;i++){runtime.setMode('build');const started=performance.now();runtime.replaceWorld(world,{intent:'load'});runtime.setMode('play');runtime.launch(examples[0].setup);while(!runtime.flight.ended){runtime.beforeStep();physics._step(1/120);runtime.afterStep();}runtime.clearShot();cycles.push({ms:performance.now()-started,physicsBodies:physics.getBodies().length,meshes:scene.meshes.length,materials:scene.materials.length});}
 runtime.dispose();presentation.dispose();const afterRuntimeDispose={physicsBodies:physics.getBodies().length};scene.dispose();const afterSceneDispose={physicsBodies:physics.getBodies().length,meshes:scene.meshes.length,materials:scene.materials.length};engine.dispose();resource.push({id,buildMs,ready,active,cycles,afterRuntimeDispose,afterSceneDispose});
}
// Collision callbacks are emitted at the beginning-of-step timestamp. Compute
// the exact scheduling headroom under each rendering partition, without claiming
// these synthetic partitions are observed browser frame times.
const latency=[];
for(const frames of [[1/144],[1/60],[1/30],[1/15],[1/144,1/30,.07,1/60]]){
 const contactTimes=examples[0].performance.impacts.map(i=>i.time),latencies=[];let elapsed=0,ticks=0,index=0,next=0;
 while(next<contactTimes.length){elapsed+=frames[index++%frames.length];const target=Math.floor((elapsed+1e-9)*120);while(ticks<target){const physical=ticks/120;ticks++;while(next<contactTimes.length&&contactTimes[next]<=physical+1e-9){latencies.push(elapsed-contactTimes[next]);next++;}}}
 latency.push({framePatternSeconds:frames,notificationLatencyMs:latencies.map(v=>v*1000),delayHeadroomMs:Object.fromEntries([.02,.05,.1].map(delay=>[delay*1000,Math.min(...latencies.map(v=>(delay-v)*1000))]))});
}
const files=['lib/counterline.js','app/lab/places-counterline/counterline.tsx','lib/worldcraft-runtime.js','lib/worldcraft-resonance.js','lib/worldcraft-scene.js'];const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(new URL('../../'+file,import.meta.url))).digest('hex');
const result={sourceSha:sha,sourceHashes:hashes,authority:'Actual Babylon NullEngine + Havok; 120Hz, original physical constants',measured,resource,latency};await mkdir(new URL('../../docs/experiments/counterline/',import.meta.url),{recursive:true});await writeFile(new URL('../../docs/experiments/counterline/evidence.json',import.meta.url),JSON.stringify(result)+'\n');console.log(JSON.stringify({sourceSha:sha,measured:measured.map(({id,summary})=>({id,summary})),resource,latency},null,2));
