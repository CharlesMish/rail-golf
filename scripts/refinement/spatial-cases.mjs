import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {exchangeNeighbours,EXCHANGE_CASES} from '../places/architecture-measure.mjs';
import {PLACES_ARCHITECTURE_REFINED,PLACES_ARCHITECTURE,buildExchangeYard,EXCHANGE_SOLIDS,EXCHANGE_REFINED_STATIONS} from '../../lib/places-architecture.js';
const shot=(yaw,elevation,charge)=>({railIndex:1,carriageMode:'freight',yaw,elevation,charge});
export const FREIGHT_CASES=Object.freeze({
 'platform-hall':shot(-60,5,.15),
 'pier-gallery':shot(20,15,.7),
 'bridge-signal':shot(20,35,.4),
 'roof-bridge':shot(-40,35,.4),
 'roof-bridge-long':shot(-60,45,.4),
 'bridge-top':shot(0,35,.4),
 'bridge-edge-sensitive':shot(0,15,.7),
 'empty-carry':shot(0,25,.7),
 'short-ground':shot(0,5,.15),
 'high-open-arc':shot(0,75,.85),
});
export function retainsFreight(id,r){const names=r.record.contacts.map(c=>c.body.replace('exchange-',''));const later=(a,b)=>names.indexOf(a)>=0&&names.indexOf(b)>names.indexOf(a);switch(id){
 case 'platform-hall':return later('station-platform','station-hall');
 case 'pier-gallery':return later('west-pier','west-loading-gallery');
 case 'bridge-signal':return later('viaduct-deck','signal-roof');
 case 'roof-bridge':case 'roof-bridge-long':return later('station-roof','viaduct-deck');
 case 'bridge-top':return r.impacts.some(c=>c.body==='exchange-viaduct-deck'&&Math.abs(c.point[1]-11.5)<.15&&c.incoming[1]<0);
 case 'bridge-edge-sensitive':return names[0]==='viaduct-deck';
 default:return names.every(c=>c==='street');
}}
const physical=r=>[r.record.reason,r.record.elapsed,r.record.position,r.record.contacts,r.path,r.impacts];
export function measureFreight(){const h=architectureHarness(PLACES_ARCHITECTURE_REFINED),rows={};try{for(const[id,setup]of Object.entries(FREIGHT_CASES)){const result=h.shoot(setup);rows[id]={setup,result,retains:retainsFreight(id,result),neighbors:exchangeNeighbours(setup).map(n=>{const result=h.shoot(n.setup);return {...n,retains:retainsFreight(id,result),record:result.record};}),rails:[0,2].map(railIndex=>{const result=h.shoot({...setup,railIndex});return {railIndex,retains:retainsFreight(id,result),record:result.record};})};}return rows;}finally{h.dispose();}}
async function main(){
 const cases=measureFreight(),sameForecourt=[],roofReplay=[];
 const old=architectureHarness({...PLACES_ARCHITECTURE,buildWorld:(...a)=>buildExchangeYard(...a,{legacyRoofWinding:true})}),fixed=architectureHarness(PLACES_ARCHITECTURE),selected=architectureHarness(PLACES_ARCHITECTURE_REFINED);
 try{for(const[id,setup]of Object.entries(EXCHANGE_CASES)){const original=old.shoot(setup),corrected=fixed.shoot(setup);roofReplay.push({id,identical:JSON.stringify(original)===JSON.stringify(corrected)});if(setup.carriageMode==='forecourt')sameForecourt.push({id,identicalPhysical:JSON.stringify(physical(original))===JSON.stringify(physical(selected.shoot(setup)))});}}finally{old.dispose();fixed.dispose();selected.dispose();}
 const cycles=[];for(const[variant,config]of [['original',PLACES_ARCHITECTURE],['refined',PLACES_ARCHITECTURE_REFINED]])for(let cycle=0;cycle<7;cycle++){const h=architectureHarness(config),before=h.resources();h.shoot(config.defaultSetup);h.session.action('retry');if(variant==='refined'){h.shoot(FREIGHT_CASES['bridge-signal']);h.session.action('reset');}const after=h.resources(),cleanup=h.disposeWorld();h.scene.dispose();h.engine.dispose();cycles.push({variant,cycle,buildMs:h.buildMs,before,after,cleanup});}
 const ablations={};for(const[name,filter]of [['without-bridge',s=>s.region!=='viaduct'],['without-signal-roof',s=>s.id!=='signal-roof']]){const h=architectureHarness({...PLACES_ARCHITECTURE_REFINED,buildWorld:(...args)=>buildExchangeYard(...args,{solids:EXCHANGE_SOLIDS.filter(filter),stations:EXCHANGE_REFINED_STATIONS,layout:'playgrounds-exchange-yard-v2-ablation'})});try{ablations[name]=h.shoot(FREIGHT_CASES['bridge-signal']);}finally{h.dispose();}}
 const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];const buildSummary=['original','refined'].map(variant=>({variant,warmMedianMs:median(cycles.filter(c=>c.variant===variant&&c.cycle>0).map(c=>c.buildMs))}));
 const result={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base:'8b02b8ceab95f28383f607cc4e891fe7e31dfc7a',authority:'Actual Havok at120Hz, stock physics and first-ground. Impact times label pre-step time; incoming/outgoing bracket the whole step. Unmodified Havok normals. NullEngine CPU/resource evidence, not rendered performance.',cases,roofReplay,sameForecourt,ablations,cycles,buildSummary};await writeFile('docs/experiments/refinement/spatial-cases.json',JSON.stringify(result)+'\n');console.log(JSON.stringify({roofReplay,sameForecourt,buildSummary,cases:Object.fromEntries(Object.entries(cases).map(([id,c])=>[id,{time:c.result.record.elapsed,retains:c.retains,neighbors:c.neighbors.filter(n=>n.retains).length,totalNeighbors:c.neighbors.length,rails:c.rails.map(r=>r.retains),sequence:c.result.record.contacts.map(c=>c.body)}]))}));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
