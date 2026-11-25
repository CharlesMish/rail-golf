import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {runAtlas} from '../playgrounds/outcome-atlas.mjs';
import {ARCHITECTURE_GRID,compactAtlas} from '../places/architecture-measure.mjs';
import {PLACES_ARCHITECTURE,stationConfig} from '../../lib/places-architecture.js';
export const CANDIDATES=Object.freeze({
 freight:Object.freeze({id:'freight',label:'Freight dock · back through the district',x:-2,y:3.5,z:67,yaw:180}),
 eastCourt:Object.freeze({id:'east-court',label:'East forecourt · across the crossing',x:42,y:0,z:17,yaw:-90}),
 crossing:Object.freeze({id:'crossing',label:'Crossing · along the viaduct',x:-18,y:11.5,z:35,yaw:90}),
});
export const candidateConfig=(id)=>{const station=CANDIDATES[id];return {...PLACES_ARCHITECTURE,id:'refinement-probe-'+id,station:()=>station};};
const ids=r=>r.contactEpisodes.filter(c=>!c.terminal).map(c=>c.feature??c.body);
const bearing=v=>Math.atan2(v[0],v[2])*180/Math.PI;
function supplement(atlas){
 const first={},destinations={},outgoing={};
 for(const r of atlas.records){const sequence=ids(r);const f=sequence[0]??'(none)';first[f]=(first[f]??0)+1;const destination=sequence.slice(1).join(' → ')||'(no later contact)';destinations[destination]=(destinations[destination]??0)+1;const event=r.contactEvents.find(c=>!c.terminal);if(event){const b=bearing(event.outgoing);const sector=Math.round(b/45)*45;outgoing[sector]=(outgoing[sector]??0)+1;}}
 return {first,destinations,outgoingBearing45DegreeBins:outgoing,anyContact:atlas.records.filter(r=>ids(r).length).length};
}
async function main(){
const results=[];
for(const [id,config]of [['forecourt',stationConfig('forecourt')],['service',stationConfig('service')],...Object.keys(CANDIDATES).map(id=>[id,candidateConfig(id)])]){
 const atlas=await runAtlas({config,sourceFiles:['lib/places-architecture.js','scripts/refinement/spatial-study.mjs']},ARCHITECTURE_GRID,{limit:294});
 results.push({...compactAtlas(atlas,id),...supplement(atlas)});
 await writeFile(`/tmp/exchange-refinement-${id}.json`,JSON.stringify(atlas)+'\n');
 console.log(JSON.stringify({id,anyContact:results.at(-1).anyContact,first:results.at(-1).first,regions:atlas.summary.surfaceCoverage.filter(c=>!c.terminal).map(c=>[c.feature,c.hitShots]),terminal:atlas.summary.terminalReasons,duration:results.at(-1).duration}));
}
await writeFile('docs/experiments/refinement/spatial-atlas.json',JSON.stringify({base:'8b02b8ceab95f28383f607cc4e891fe7e31dfc7a',candidates:CANDIDATES,scope:'Matched294shot ordinary-detent grids; samples are diagnostics, not human frequency. Original geometry; no added architecture.',atlases:results})+'\n');

}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
