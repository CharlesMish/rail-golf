#!/usr/bin/env node
// Bounded author diagnostic. Every outcome comes from the accepted 120 Hz
// Havok session. Sampling is an accessibility probe, never a player-frequency
// estimate or a contact-count quality score.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runAtlas} from '../playgrounds/outcome-atlas.mjs';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {PLAYABILITY_CISTERN} from '../../lib/playability-cistern.js';
import * as yard from '../../lib/places-architecture.js';

export const ARCHITECTURE_GRID=Object.freeze({railIndex:[1],yaw:[-60,-40,-20,0,20,40,60],elevation:[5,15,25,35,45,60,75],powerPercent:[15,25,40,55,70,85],phaseTick:[0]});
const setup=(carriageMode,yaw,elevation,charge)=>({railIndex:1,carriageMode,yaw,elevation,charge});
export const EXCHANGE_CASES=Object.freeze({
 'underpass-short':setup('forecourt',0,25,.4),
 'underpass-delivery':setup('forecourt',0,15,.85),
 'viaduct-face':setup('forecourt',0,35,.4),
 'viaduct-top':setup('forecourt',0,45,.4),
 'roof-return':setup('forecourt',20,35,.7),
 'roof-to-gallery':setup('forecourt',-20,35,.7),
 'service-platform':setup('service',0,15,.7),
 'service-hall':setup('service',0,15,.85),
 'service-gallery':setup('service',-20,35,.4),
 'service-roof':setup('service',0,45,.7),
 'short-ground':setup('forecourt',0,5,.15),
 'open-sky-exit':setup('forecourt',20,45,.7),
 'slow-gallery':setup('forecourt',-20,75,.7),
});
export function exchangeNeighbours(value){return [
 ...[-.5,.5].map(delta=>({change:`yaw ${delta>0?'+':''}${delta}°`,setup:{...value,yaw:value.yaw+delta}})),
 ...[-.5,.5].map(delta=>({change:`elevation ${delta>0?'+':''}${delta}°`,setup:{...value,elevation:value.elevation+delta}})),
 ...[-.01,.01].map(delta=>({change:`power ${delta>0?'+':''}${Math.round(delta*100)}%`,setup:{...value,charge:Number((value.charge+delta).toFixed(2))}})),
 ].filter(n=>n.setup.elevation>=5&&n.setup.elevation<=85&&n.setup.yaw>=-70&&n.setup.yaw<=70&&n.setup.charge>=0&&n.setup.charge<=1);}
const physicalIds=result=>result.record.contacts.map(c=>c.body.replace(/^exchange-/,''));
const topContact=(result,id,y)=>result.impacts.some(c=>c.body==='exchange-'+id&&Math.abs(c.point[1]-y)<.15&&Math.abs(c.normal[1])>.95&&c.incoming[1]<-1);
export function retainsRelationship(id,result){const ids=physicalIds(result);switch(id){
 case 'underpass-short':return ids.every(id=>id==='street')&&result.path.some(p=>p[3]>29&&p[3]<41&&p[2]<9);
 case 'underpass-delivery':return ids[0]==='freight-dock'&&!ids.includes('viaduct-deck')&&result.path.some(p=>p[3]>29&&p[3]<41&&p[2]<9);
 case 'viaduct-face':return ids[0]==='viaduct-deck'&&result.impacts.some(c=>c.body==='exchange-viaduct-deck'&&Math.abs(c.point[2]-28.5)<.15&&Math.abs(c.normal[2])>.95);
 case 'viaduct-top':return ids[0]==='viaduct-deck'&&topContact(result,'viaduct-deck',11.5);
 case 'roof-return':return ids.filter(id=>id==='station-roof').length>=2&&ids.includes('far-retaining-wall');
 case 'roof-to-gallery':return ids[0]==='west-store-roof'&&ids.includes('far-retaining-wall')&&topContact(result,'west-loading-gallery',8);
 case 'service-platform':return ids[0]==='station-platform';
 case 'service-hall':return ids.includes('station-hall')&&ids.includes('station-platform');
 case 'service-gallery':return topContact(result,'west-loading-gallery',8)&&ids.includes('freight-dock');
 case 'service-roof':return ids.includes('station-roof');
 case 'short-ground':return ids.every(id=>id==='street');
 case 'open-sky-exit':return result.record.reason==='out-of-bounds';
 case 'slow-gallery':return result.record.elapsed>15;
 default:return false;}}
export function measureCases(){
 const h=architectureHarness(yard.PLACES_ARCHITECTURE),cases={};
 try{for(const [id,launch]of Object.entries(EXCHANGE_CASES)){
   const result=h.shoot(launch),count=result.impacts.length;
   // Retain all raw callbacks for short examples. A long resting tail has a
   // separately reported count and its first/last brackets rather than a binary archive.
   const impacts=count<=96?result.impacts:[...result.impacts.slice(0,64),...result.impacts.slice(-16)];
   cases[id]={setup:launch,record:result.record,path10Hz:result.path,impacts,rawImpactCount:count,omittedImpactCount:count-impacts.length,retains:retainsRelationship(id,result),neighbours:exchangeNeighbours(launch).map(n=>{const r=h.shoot(n.setup);return {...n,retains:retainsRelationship(id,r),record:r.record};})};
  }
  const ablations={};
  for(const [id,predicate,examples]of [['viaduct-absent',s=>s.region!=='viaduct',['underpass-delivery','viaduct-face','viaduct-top']],['station-roof-absent',s=>s.id!=='station-roof',['roof-return','service-roof']]]){
   const ablation=architectureHarness({...yard.PLACES_ARCHITECTURE,buildWorld:(...args)=>yard.buildExchangeYard(...args,{solids:yard.EXCHANGE_SOLIDS.filter(predicate)})});
   try{ablations[id]={purpose:'Non-playable causal comparison: remove named physical architecture; all projectile/material rules unchanged.',cases:Object.fromEntries(examples.map(name=>{const r=ablation.shoot(EXCHANGE_CASES[name]);return [name,{record:r.record,path10Hz:r.path,identicalPhysicalOutcome:JSON.stringify([r.record.reason,r.record.elapsed,r.record.position,r.record.contacts,r.path])===JSON.stringify([cases[name].record.reason,cases[name].record.elapsed,cases[name].record.position,cases[name].record.contacts,cases[name].path10Hz])}];}))};}finally{ablation.dispose();}
  }
  return {cases,ablations};
 }finally{h.dispose();}
}
const sourceFiles=['lib/places-architecture.js','scripts/places/architecture-measure.mjs'];
const changed=files=>Boolean(execFileSync('git',['status','--porcelain','--',...files],{encoding:'utf8'}).trim());
const average=values=>values.reduce((a,b)=>a+b,0)/values.length;
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function contactIds(record){return [...new Set(record.contactEpisodes.filter(c=>!c.terminal).map(c=>c.feature??c.body))];}
function group(atlas,key){return [...new Set(atlas.records.map(r=>r.controls[key]))].map(value=>{const records=atlas.records.filter(r=>r.controls[key]===value);return {value,shots:records.length,anyNonterminalContact:records.filter(r=>contactIds(r).length).length,noNonterminalContact:records.filter(r=>!contactIds(r).length).length,outOfBounds:records.filter(r=>r.terminal.reason==='out-of-bounds').length,over15Seconds:records.filter(r=>r.terminal.elapsed>15).length,touchedFeatures:[...new Set(records.flatMap(contactIds))]};});}
export function compactAtlas(atlas,stationId){
 return {stationId,configId:atlas.configId,authority:atlas.authority,simulation:atlas.simulation,grid:atlas.grid,bounds:atlas.bounds,catalog:atlas.catalog,resources:atlas.resources,summary:atlas.summary,
  bands:{elevation:group(atlas,'elevation'),powerPercent:group(atlas,'powerPercent'),yaw:group(atlas,'yaw')},
  duration:{min:Math.min(...atlas.records.map(r=>r.terminal.elapsed)),median:median(atlas.records.map(r=>r.terminal.elapsed)),max:Math.max(...atlas.records.map(r=>r.terminal.elapsed)),over15Seconds:atlas.records.filter(r=>r.terminal.elapsed>15).length},
  records:atlas.records.map(r=>({id:r.id,controls:r.controls,station:r.station,terminal:r.terminal,contactEpisodes:r.contactEpisodes,truncation:r.truncation})),
  rawEvidence:'Compact rows retain every sampled setup, actual station, accepted contact ledger and terminal. Full raw collision brackets and paths can be regenerated with --full-dir; selected examples below retain them.'};
}
export async function measureAccessibility({fullDir}={}){
 const choices=yard.PLACES_ARCHITECTURE.stationChoices??Object.values(yard.EXCHANGE_STATIONS);
 const atlases=[];
 for(const choice of choices){const config=yard.stationConfig(choice.id);const atlas=await runAtlas({config,sourceFiles,phaseTicks:1},ARCHITECTURE_GRID,{limit:294});atlases.push({stationId:choice.id,atlas});}
 const control=await runAtlas({config:PLAYABILITY_CISTERN,sourceFiles:['lib/playgrounds-architecture.js','lib/playability-cistern.js'],phaseTicks:1},ARCHITECTURE_GRID,{limit:294});atlases.push({stationId:'cistern-control',atlas:control});
 if(fullDir){await mkdir(fullDir,{recursive:true});for(const {stationId,atlas}of atlases)await writeFile(`${fullDir}/${stationId}.json`,JSON.stringify(atlas)+'\n');}
 return atlases;
}
async function main(){
 const fullIndex=process.argv.indexOf('--full-dir'),fullDir=fullIndex>=0?process.argv[fullIndex+1]:undefined;
 if(fullIndex>=0&&!fullDir)throw Error('--full-dir requires a local output directory');
 const atlases=await measureAccessibility({fullDir});
 const examples=measureCases();
 for(const [id,example]of Object.entries(examples.cases)){
  const atlas=atlases.find(a=>a.stationId===example.setup.carriageMode).atlas;
  const record=atlas.records.find(r=>['railIndex','yaw','elevation','charge'].every(k=>r.setup[k]===example.setup[k]));
  if(!record)throw Error(`Missing atlas match for ${id}`);
  if(record.terminal.reason!==example.record.reason||record.terminal.elapsed!==example.record.elapsed||JSON.stringify(record.terminal.position)!==JSON.stringify(example.record.position))throw Error(`Atlas and ordinary station setup disagree for ${id}`);
  example.contactEvents=record.contactEvents;example.atlasTruncation=record.truncation;
  example.contactTiming='[startTick,endTick] at120Hz; velocities bracket the entire step, simultaneous contacts share the bracket. Raw Havok normal retains projectileIsCollider. The separate impacts tail uses the same pre-step elapsed time.';
 }

 const cycles=[];
 for(const [variant,config]of [['exchange',yard.PLACES_ARCHITECTURE],['cistern',PLAYABILITY_CISTERN]])for(let cycle=0;cycle<6;cycle++){
  const h=architectureHarness(config),before=h.resources();h.shoot(config.defaultSetup);h.session.action('reset');const afterReset=h.resources(),cleanup=h.disposeWorld();h.scene.dispose();h.engine.dispose();cycles.push({variant,cycle,buildMs:h.buildMs,before,afterReset,cleanup});
 }
 const hashes={};for(const file of sourceFiles)hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 const result={format:'rail-golf-places-architecture-v1',baseSha:'ddeed5b688ae8c15166c42a0302bf768bb11be70',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFilesModifiedSinceHead:changed(sourceFiles),sourceHashes:hashes,
  ...examples,scope:'Same explicit 294-setup launch grid per freely selectable station and Cistern control. Grid coverage is not human play frequency, and untouched surfaces are not established unreachable.',atlases:atlases.map(({stationId,atlas})=>compactAtlas(atlas,stationId)),cycles,
  buildSummary:['exchange','cistern'].map(variant=>{const times=cycles.filter(c=>c.variant===variant).map(c=>c.buildMs);return {variant,firstMs:times[0],warmMedianMs:median(times.slice(1)),warmMeanMs:average(times.slice(1))};}),
  limitations:['NullEngine body/mesh/submesh/triangle ownership and CPU timing are not rendered draw calls, frame rate, GPU memory, or phone performance.','Raw collision callback caps can omit late persistent contacts; each record reports truncation. Accepted episode ledgers remain separately preserved.','No sampled outcome proves that a place is understandable or enjoyable. Owner play is still required.']};
 await mkdir('docs/experiments/places',{recursive:true});await writeFile('docs/experiments/places/architecture-evidence.json',JSON.stringify(result)+'\n');
 console.log(JSON.stringify({atlases:result.atlases.map(a=>({station:a.stationId,terminals:a.summary.terminalReasons,untouched:a.summary.untouchedNonterminalSurfaces,duration:a.duration,elevations:a.bands.elevation,powers:a.bands.powerPercent,resources:a.resources})),buildSummary:result.buildSummary,cases:Object.fromEntries(Object.entries(result.cases).map(([id,c])=>[id,{retains:c.retains,neighbors:c.neighbours.filter(n=>n.retains).length,reason:c.record.reason,time:c.record.elapsed,sequence:c.record.contacts.map(x=>x.body)}])),ablations:result.ablations},null,2));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)main().catch(error=>{console.error(error);process.exitCode=1;});
