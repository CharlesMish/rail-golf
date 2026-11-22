#!/usr/bin/env node
// Author-only evidence sampler. This runs the accepted spatial session; it is
// neither a trajectory predictor nor an imported-world execution interface.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger,PhysicsMotionType} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {createSpatialSession,spatialLaunch} from '../../lib/spatial-lab-session.js';
import {HORIZONS_SWING_GATE,SWING_GATE,buildSwingGate} from '../../lib/horizons-swing-gate.js';
import {VERTICAL_YARD_LAB} from '../../lib/vertical-yard-config.js';

export const ATLAS_LIMITS=Object.freeze({defaultShots:64,maxShots:320,pathStride:12,maxPathSamples:602,maxContactEvents:256,maxTicks:7202});
const dt=1/120,root=fileURLToPath(new URL('../../',import.meta.url));
const controls=['railIndex','yaw','elevation','powerPercent','phaseTick'];
const gateSources=['lib/horizons-swing-gate.js','lib/periodic-reflector.js'];
const sharedSources=['lib/rail-golf-v02.js','lib/stations.js','lib/spatial-lab-session.js','lib/mechanism-range-session.js','lib/line-recognition.js'];
export const ATLAS_CONFIGS=Object.freeze({
  'swing-gate':{config:HORIZONS_SWING_GATE,sourceFiles:gateSources,phaseTicks:1440,restorePhase:(world,tick)=>world.environment.restore({layout:SWING_GATE.id,gateMode:'LIVE',gateTick:String(tick)})},
  'swing-gate-absent':{config:{...HORIZONS_SWING_GATE,id:'horizons-swing-gate-absent',buildWorld:(...args)=>buildSwingGate(...args,{control:'absent'})},sourceFiles:gateSources,phaseTicks:1440,restorePhase:(world,tick)=>world.environment.restore({layout:SWING_GATE.id,gateMode:'LIVE',gateTick:String(tick)})},
  'vertical-yard':{config:VERTICAL_YARD_LAB,sourceFiles:['lib/vertical-yard-config.js','lib/vertical-yard.js','lib/vertical-yard-scene.js'],phaseTicks:1},
});

const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const detent=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max&&Number.isInteger(value*2);
export function expandGrid(grid,{phaseTicks=1,limit=ATLAS_LIMITS.defaultShots}={}){
  if(!integer(limit,1,ATLAS_LIMITS.maxShots))throw Error('Shot limit must be an integer from 1 through 320');
  if(!grid||typeof grid!=='object'||Array.isArray(grid)||Object.keys(grid).some(k=>!controls.includes(k)))throw Error('Grid must contain only the five declared controls');
  const checks={railIndex:v=>integer(v,0,RAIL_RULES.railPositions.length-1),yaw:v=>detent(v,RAIL_RULES.minYaw,RAIL_RULES.maxYaw),elevation:v=>detent(v,RAIL_RULES.minElevation,RAIL_RULES.maxElevation),powerPercent:v=>integer(v,0,100),phaseTick:v=>integer(v,0,phaseTicks-1)};
  for(const key of controls){
    const values=grid[key];
    if(!Array.isArray(values)||!values.length||values.length>limit||new Set(values).size!==values.length||!values.every(checks[key]))throw Error(`Invalid ${key} values (use explicit unique player detents)`);
  }
  const count=controls.reduce((n,key)=>n*grid[key].length,1);
  if(count>limit)throw Error(`Grid has ${count} shots; limit is ${limit} (hard maximum 320)`);
  const rows=[];
  for(const railIndex of grid.railIndex)for(const yaw of grid.yaw)for(const elevation of grid.elevation)for(const powerPercent of grid.powerPercent)for(const phaseTick of grid.phaseTick){
    rows.push({id:`shot-${String(rows.length+1).padStart(3,'0')}`,setup:{railIndex,yaw,elevation,charge:powerPercent/100},phaseTick,controls:{railIndex,yaw,elevation,powerPercent,phaseTick}});
  }
  return rows;
}

let havokPromise;
async function getHavok(){
  havokPromise??=readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url)).then(wasmBinary=>Havok({wasmBinary}));
  return havokPromise;
}
function counts(scene,casters){const bodies=scene.getPhysicsEngine().getBodies();return {bodies:bodies.length,staticBodies:bodies.filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,animatedBodies:bodies.filter(b=>b.getMotionType()===PhysicsMotionType.ANIMATED).length,dynamicBodies:bodies.filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,materials:scene.materials.length,geometries:scene.geometries.length,shadowCasters:casters.size};}
function bodyCatalog(physics){
  const occurrences=new Map();
  return physics.getBodies().map(body=>{
    const node=body.transformNode,n=(occurrences.get(node.name)??0)+1;occurrences.set(node.name,n);
    node.computeWorldMatrix(true);const box=node.getBoundingInfo?.().boundingBox;
    return {body,id:`${node.name}#${n}`,name:node.name,feature:node.metadata?.lineFeature?.id??null,label:node.metadata?.lineFeature?.label??null,terminal:Boolean(node.metadata?.rangeGround),motionType:body.getMotionType(),shapeType:body.shape?.type??null,material:body.shape?.material??null,worldMatrix:node.getWorldMatrix().asArray(),localBounds:box?{min:box.minimum.asArray(),max:box.maximum.asArray()}:null};
  });
}
export function summarize(records,catalog){
  const reasons={},surfaceShots=new Map(catalog.map(s=>[s.id,new Set()])),families=new Map();
  for(const record of records){
    reasons[record.terminal.reason]=(reasons[record.terminal.reason]??0)+1;
    for(const contact of record.contactEvents)surfaceShots.get(contact.surface)?.add(record.id);
    // A diagnostic label only. Repeated contacts, time, location and velocity
    // still live in the raw record; this is not an equivalence or quality score.
    const sequence=record.contactEpisodes.filter(c=>!c.terminal).map(c=>c.feature??c.body).join(' → ')||'(no nonterminal contact)';
    const key=`${sequence} / ${record.terminal.reason}`;
    if(!families.has(key))families.set(key,[]);families.get(key).push(record.id);
  }
  return {shots:records.length,contactCoverageComplete:records.every(r=>r.truncation.droppedContactEvents===0),terminalReasons:reasons,
    surfaceCoverage:catalog.map(s=>({id:s.id,name:s.name,feature:s.feature,terminal:s.terminal,hitShots:surfaceShots.get(s.id).size,shotIds:[...surfaceShots.get(s.id)]})),
    untouchedNonterminalSurfaces:catalog.filter(s=>!s.terminal&&!surfaceShots.get(s.id).size).map(s=>s.id),
    observedSequences:[...families].map(([sequence,shotIds])=>({sequence,shotIds})),
    caveat:'Coverage applies only to this explicit grid. Untouched does not mean unreachable; a frequent sequence is not evidence of enjoyment.'};
}
async function provenance(sourceFiles){
  const files=[...new Set([...sharedSources,...sourceFiles,'scripts/playgrounds/outcome-atlas.mjs'])];
  const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(new URL(`../../${file}`,import.meta.url))).digest('hex');
  const gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const dirty=execFileSync('git',['status','--porcelain','--',...files],{cwd:root,encoding:'utf8'}).trim();
  return {gitHead,sourceFilesModifiedSinceHead:Boolean(dirty),sourceHashes:hashes};
}

// A new code-owned lab may call this exported runner with its reviewed config.
// The CLI never loads a module path from data or arguments. Additional lifecycle
// semantics (e.g. post-terminal settling) require a deliberate adapter, not a
// claim that every arbitrary world is already supported.
export async function runAtlas(spec,grid,{limit=ATLAS_LIMITS.defaultShots}={}){
  if(!spec?.config?.buildWorld||typeof spec.config.station!=='function')throw Error('A code-owned spatial config is required');
  const rows=expandGrid(grid,{phaseTicks:spec.phaseTicks??1,limit}),config=spec.config;
  Logger.LogLevels=0;
  const engine=new NullEngine({renderWidth:1440,renderHeight:900,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
  let world,session;const casters=new Set(),timing={};
  try{
    scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,await getHavok()));
    const physics=scene.getPhysicsEngine();physics.setTimeStep(dt);physics.setSubTimeStep(1000/120);
    const material=new StandardMaterial('atlas-fixture',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material]));
    const worldRoot=new TransformNode('atlas-world',scene),start=performance.now();
    world=config.buildWorld(scene,worldRoot,materials,{addShadowCaster:m=>casters.add(m),removeShadowCaster:m=>casters.delete(m)});
    timing.buildMs=performance.now()-start;
    const catalog=bodyCatalog(physics),byName=new Map(catalog.map(c=>[c.name,c])),byBody=new Map(catalog.map(c=>[c.body,c]));
    const cleanCatalog=catalog.map(({body,...entry})=>{void body;return entry;});
    const idleCounts=counts(scene,casters);session=createSpatialSession(scene,world,config);
    const records=[];const batchStart=performance.now();
    for(const row of rows){
      session.action('reset');spec.restorePhase?.(world,row.phaseTick);
      const environment=structuredClone(world.environment?.snapshot()??{}),launch=spatialLaunch(config,row.setup);
      if(!session.fire(row.setup))throw Error(`Runtime rejected ${row.id}`);
      const contactEvents=[],path=[[0,...session.flight.mesh.position.asArray()]];
      let droppedContacts=0,droppedPath=0,tick=0,pending=[];
      // Phase restore may rebuild an animated body; its transformNode provides
      // the stable catalog identity even when the PhysicsBody object changes.
      session.flight.aggregate.body.getCollisionObservable().add(event=>{
        const own=session.flight.aggregate.body,other=event.collider===own?event.collidedAgainst:event.collider;
        const surface=byBody.get(other)??byName.get(other.transformNode.name);
        pending.push({surface:surface?.id??other.transformNode.name,body:other.transformNode.name,feature:surface?.feature??null,terminal:surface?.terminal??false,point:event.point?.asArray()??null,normal:event.normal?.asArray()??null,projectileIsCollider:event.collider===own});
      });
      for(;tick<ATLAS_LIMITS.maxTicks&&!session.flight.ended;){
        const incoming=session.flight.aggregate.body.getLinearVelocity().asArray();pending=[];
        session.beforeStep();physics._step(dt);
        const outgoing=session.flight.aggregate.body.getLinearVelocity().asArray();
        for(const event of pending){if(contactEvents.length<ATLAS_LIMITS.maxContactEvents)contactEvents.push({...event,step:[tick,tick+1],incoming,outgoing});else droppedContacts++;}
        session.afterStep();tick++;
        if(tick%ATLAS_LIMITS.pathStride===0||session.flight.ended){
          const sample=[tick,...session.flight.mesh.position.asArray()];
          if(path.length<ATLAS_LIMITS.maxPathSamples)path.push(sample);else{path[path.length-1]=sample;droppedPath++;}
        }
      }
      if(!session.flight.ended||!session.last)throw Error(`No accepted terminal result for ${row.id}`);
      const last=structuredClone(session.last);
      records.push({id:row.id,controls:row.controls,setup:row.setup,station:launch.station,muzzle:launch.muzzle,aim:launch.aim,environmentBefore:environment,environmentAtTerminal:last.endEnvironment,
        terminal:{reason:last.reason,tick,elapsed:last.elapsed,position:last.position},
        contactEpisodes:last.contacts.map(c=>({...c,feature:byName.get(c.body)?.feature??null,terminal:byName.get(c.body)?.terminal??false})),
        contactEvents,actualPath:path,truncation:{droppedContactEvents:droppedContacts,droppedPathSamples:droppedPath}});
    }
    timing.batchMs=performance.now()-batchStart;
    session.action('reset');const afterResetCounts=counts(scene,casters);
    session.dispose();session=null;world.dispose();world=null;worldRoot.dispose();material.dispose();const afterDisposeCounts=counts(scene,casters);
    return {format:'rail-golf-author-atlas-v1',configId:config.id,authority:await provenance(spec.sourceFiles??[]),
      simulation:{runtime:'createSpatialSession',engine:'Babylon NullEngine + Havok',hz:120,projectileMass:RAIL_RULES.projectileMass,projectileRadius:RAIL_RULES.projectileRadius,gravity:RAIL_RULES.gravity,pathColumns:['tick','x','y','z'],pathStrideTicks:ATLAS_LIMITS.pathStride,
        contactTiming:'Raw callbacks occur within the supplied [startTick,endTick] 120 Hz step. Incoming/outgoing are whole-step projectile velocities, not isolated per-contact impulses. Simultaneous contacts share a bracket.',normalConvention:'Unmodified Havok event.normal; projectileIsCollider preserves the event ordering. No inferred oriented normal or impulse.'},
      grid:structuredClone(grid),bounds:config.bounds,catalog:cleanCatalog,records,summary:summarize(records,cleanCatalog),resources:{idle:idleCounts,afterReset:afterResetCounts,afterDispose:afterDisposeCounts,timing,limits:'World-only NullEngine counts/timing, not draw calls, frame rate or phone performance.'}};
  }finally{session?.dispose();world?.dispose();scene.dispose();engine.dispose();}
}

export function landingSvg(atlas){
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const {minX,maxX,minZ,maxZ}=atlas.bounds,w=640,h=540,pad=36;
  const scale=Math.min((w-2*pad)/(maxX-minX),(h-2*pad)/(maxZ-minZ));
  const x=v=>pad+(v-minX)*scale,z=v=>h-pad-(v-minZ)*scale;
  const marks=atlas.records.map(r=>{const [px,,pz]=r.terminal.position;return `<circle cx="${x(px).toFixed(3)}" cy="${z(pz).toFixed(3)}" r="3" fill="${r.terminal.reason==='first-ground-contact'?'#0e7490':'#b45309'}"><title>${escape(r.id)}: ${escape(r.terminal.reason)}; x=${px}, z=${pz}</title></circle>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f8fafc"/><text x="36" y="24" font-size="16" font-family="sans-serif">${escape(atlas.configId)} — measured terminal positions</text><rect x="${x(minX)}" y="${z(maxZ)}" width="${(maxX-minX)*scale}" height="${(maxZ-minZ)*scale}" fill="none" stroke="#94a3b8"/>${marks}<text x="36" y="530" font-size="12" font-family="sans-serif">x right · z up · shared metre scale · cyan: ground; amber: other terminal</text></svg>\n`;
}

async function main(args){
  if(args.includes('--help')){console.log('Usage: node scripts/playgrounds/outcome-atlas.mjs --config swing-gate|swing-gate-absent|vertical-yard --grid grid.json --output atlas.json [--limit 1..320] [--svg landings.svg]\nGrid: explicit arrays railIndex, yaw (0.5°), elevation (0.5°), powerPercent (integer), phaseTick (integer 120 Hz release tick; static 0). No module/file URLs accepted as config.');return;}
  const options={};for(let i=0;i<args.length;i+=2){const key=args[i];if(!['--config','--grid','--output','--limit','--svg'].includes(key)||!args[i+1]||Object.hasOwn(options,key))throw Error('Unknown, incomplete or duplicated argument');options[key]=args[i+1];}
  if(!Object.hasOwn(ATLAS_CONFIGS,options['--config'])||!options['--grid']||!options['--output'])throw Error('Choose a whitelisted config, an explicit grid and an output file; see --help');
  const bytes=await readFile(options['--grid']);if(bytes.length>16384)throw Error('Grid file exceeds 16 KiB');
  const atlas=await runAtlas(ATLAS_CONFIGS[options['--config']],JSON.parse(bytes),{limit:options['--limit']===undefined?ATLAS_LIMITS.defaultShots:Number(options['--limit'])});
  await writeFile(options['--output'],JSON.stringify(atlas)+'\n');if(options['--svg'])await writeFile(options['--svg'],landingSvg(atlas));
  console.log(JSON.stringify({config:atlas.configId,shots:atlas.records.length,terminalReasons:atlas.summary.terminalReasons,untouched:atlas.summary.untouchedNonterminalSurfaces,output:options['--output']}));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
