import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {EXCHANGE_CASES,exchangeNeighbours,ARCHITECTURE_GRID} from '../places/architecture-measure.mjs';
import {FREIGHT_CASES} from '../refinement/spatial-cases.mjs';
import * as yard from '../../lib/places-architecture.js';
const setup=(carriageMode,yaw,elevation,charge)=>({railIndex:1,carriageMode,yaw,elevation,charge});
export const FORM_CASES={
 'forecourt-curve-crossing':setup('forecourt',45,20,.4),
 'forecourt-curve-hall':setup('forecourt',45,20,.55),
 'forecourt-short-arc':setup('forecourt',60,50,.25),
 'freight-direct-canopy':setup('freight',-30,40,.55),
 'freight-crossing-canopy':setup('freight',-30,50,.4),
 'freight-roof-crossing-canopy':FREIGHT_CASES['roof-bridge'],
 'freight-long-transfer':FREIGHT_CASES['roof-bridge-long'],
 'canopy-open-exit':setup('forecourt',60,20,.7),
 'miss-low-ground':setup('forecourt',45,5,.15),
};
export const FLAT_SOLIDS=yard.EXCHANGE_FORMS_SOLIDS.map(s=>s.shape==='barrel'?{...s,shape:'box',region:'roof',y:s.y+s.h/2}:s);
export const flatConfig={...yard.PLACES_ARCHITECTURE_FORMS,id:'forms-flat-control',buildWorld:(...a)=>yard.buildExchangeYard(...a,{solids:FLAT_SOLIDS,stations:yard.EXCHANGE_REFINED_STATIONS,layout:'forms-flat-control'})};
const ids=r=>r.record.contacts.map(c=>c.body.replace('exchange-',''));
const physical=r=>[r.record.reason,r.record.elapsed,r.record.position,r.record.contacts,r.path,r.impacts];
const newContacts=r=>ids(r).filter(n=>n.startsWith('maintenance'));
export function retainsForm(id,r){const names=ids(r),has=n=>names.includes(n),later=(a,b)=>names.indexOf(a)>=0&&names.indexOf(b)>names.indexOf(a);switch(id){case'forecourt-curve-crossing':return later('maintenance-canopy','viaduct-deck');case'forecourt-curve-hall':return later('maintenance-canopy','station-hall');case'forecourt-short-arc':return has('maintenance-canopy')&&r.impacts.some(c=>c.body.endsWith('maintenance-canopy')&&c.point[1]>5.5&&Math.abs(c.normal[1])>.4);case'freight-direct-canopy':return names[0]==='maintenance-canopy';case'freight-crossing-canopy':return later('viaduct-deck','maintenance-canopy');case'freight-roof-crossing-canopy':case'freight-long-transfer':return later('station-roof','viaduct-deck')&&later('viaduct-deck','maintenance-canopy');case'canopy-open-exit':return has('maintenance-canopy')&&r.record.reason==='out-of-bounds';case'miss-low-ground':return names.every(n=>n==='street');default:return false;}}
function grid(config){const h=architectureHarness(config),rows=[];try{for(const carriageMode of ['forecourt','freight'])for(const yaw of ARCHITECTURE_GRID.yaw)for(const elevation of ARCHITECTURE_GRID.elevation)for(const powerPercent of ARCHITECTURE_GRID.powerPercent){const s=setup(carriageMode,yaw,elevation,powerPercent/100),r=h.shoot(s),contacts=ids(r);rows.push({setup:s,contacts,first:contacts.find(n=>n!=='street')??null,newRegion:newContacts(r),reason:r.record.reason,elapsed:r.record.elapsed,position:r.record.position});}return rows;}finally{h.dispose();}}
const compact=r=>({record:r.record,path10Hz:r.path,rawImpacts:r.impacts.length<=100?r.impacts:[...r.impacts.slice(0,70),...r.impacts.slice(-20)],rawImpactCount:r.impacts.length});
async function main(){
 const old=architectureHarness(yard.PLACES_ARCHITECTURE_REFINED),formed=architectureHarness(yard.PLACES_ARCHITECTURE_FORMS),flat=architectureHarness(flatConfig),cases={},controls=[];
 try{
  for(const[id,s]of Object.entries(FORM_CASES)){const result=formed.shoot(s);cases[id]={setup:s,result:compact(result),retains:retainsForm(id,result),old:compact(old.shoot(s)),flat:compact(flat.shoot(s)),neighbors:exchangeNeighbours(s).map(n=>{const r=formed.shoot(n.setup);return {...n,retains:retainsForm(id,r),record:r.record};}),rails:[0,2].map(railIndex=>{const r=formed.shoot({...s,railIndex});return {railIndex,retains:retainsForm(id,r),record:r.record};})};}
  for(const[id,s]of [...Object.entries(EXCHANGE_CASES).filter(([,s])=>s.carriageMode==='forecourt'),...Object.entries(FREIGHT_CASES)]){const before=old.shoot(s),after=formed.shoot(s);controls.push({id,setup:s,identicalPhysical:JSON.stringify(physical(before))===JSON.stringify(physical(after)),before:compact(before),after:compact(after)});}
 }finally{old.dispose();formed.dispose();flat.dispose();}
 const atlas={original:grid(yard.PLACES_ARCHITECTURE_REFINED),canopy:grid(yard.PLACES_ARCHITECTURE_FORMS),flat:grid(flatConfig)};
 const summary={};for(const[key,rows]of Object.entries(atlas)){summary[key]={};for(const station of ['forecourt','freight']){const r=rows.filter(r=>r.setup.carriageMode===station);summary[key][station]={shots:r.length,raised:r.filter(r=>r.first).length,newRegion:r.filter(r=>r.newRegion.length).length,newFirst:r.filter(r=>r.first?.startsWith('maintenance')).length,canopy:r.filter(r=>r.contacts.includes('maintenance-canopy')).length,exits:r.filter(r=>r.reason==='out-of-bounds').length,settled:r.filter(r=>r.reason==='settled').length,over15:r.filter(r=>r.elapsed>15).length,maxSeconds:Math.max(...r.map(r=>r.elapsed)),firstRegions:Object.fromEntries([...new Set(r.map(r=>r.first))].map(id=>[id,r.filter(r=>r.first===id).length])),newSequences:[...new Set(r.filter(r=>r.newRegion.length).map(r=>r.contacts.join(' → ')))]};}}
 const seams=[];const seamH=architectureHarness(yard.PLACES_ARCHITECTURE_FORMS);try{for(let yaw=-40;yaw<=-10;yaw+=.5){const s=setup('freight',yaw,40,.55),r=seamH.shoot(s);seams.push({setup:s,record:r.record,canopyImpacts:r.impacts.filter(c=>c.body.endsWith('maintenance-canopy'))});}}finally{seamH.dispose();}
 const cycles=[];for(const[name,config]of [['old',yard.PLACES_ARCHITECTURE_REFINED],['canopy',yard.PLACES_ARCHITECTURE_FORMS],['flat',flatConfig]])for(let i=0;i<7;i++){const h=architectureHarness(config),before=h.resources();h.shoot(FORM_CASES['freight-roof-crossing-canopy']);h.session.action('retry');h.shoot(FORM_CASES['forecourt-curve-crossing']);h.session.action('reset');const after=h.resources(),cleanup=h.disposeWorld();cycles.push({name,i,buildMs:h.buildMs,before,after,cleanup});h.scene.dispose();h.engine.dispose();}
 const sourceFiles=['lib/architectural-forms.js','lib/places-architecture.js','scripts/forms/architecture-measure.mjs'];
 const evidence={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles:Object.fromEntries(sourceFiles.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),base:'21f18bec3286c6c63d094cb1a8ea2135081bdef6',authority:'Actual Havok120Hz, stock mass/radius/gravity/launch/first-ground. Raw normals are unmodified Havok callbacks; incoming/outgoing bracket the entire solver step. NullEngine CPU allocations are not GPU drawcalls/FPS.',cases,controls,summary,atlas,seams,cycles};
 await writeFile('docs/experiments/forms-ensemble/architecture-evidence.json',JSON.stringify(evidence)+'\n');console.log(JSON.stringify({summary,cases:Object.fromEntries(Object.entries(cases).map(([id,c])=>[id,{sequence:ids({record:c.result.record}),retains:c.retains,neighbors:c.neighbors.filter(n=>n.retains).length,total:c.neighbors.length,flat:ids({record:c.flat.record}),time:c.result.record.elapsed}])),controls:controls.map(c=>[c.id,c.setup.carriageMode,c.identicalPhysical])},null,2));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
