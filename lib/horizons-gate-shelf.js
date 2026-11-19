import {RAIL_RULES} from './rail-golf-v02.js';
const LAYOUT='horizons-swing-gate-v1',KEY='rail-golf:horizons:swing-gate-shelf-v1',LIMIT=4;
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>finite(n,-10000,10000));
const environment=e=>e&&Object.keys(e).sort().join(',')==='gateMode,gateTick,layout'&&e.layout===LAYOUT&&['LIVE','PAUSED'].includes(e.gateMode)&&typeof e.gateTick==='string'&&/^\d+$/.test(e.gateTick)&&Number(e.gateTick)<1440;
// Historical labs have no storage dependency. Access the browser storage API
// only for the explicit, code-owned gate layout opt-in.
export function createBrowserGateShelf(layout,host=globalThis){
 if(layout!==LAYOUT)return null;
 let storage=null;try{storage=host.localStorage;}catch{}
 return createGateShelf(storage);
}
export function validGateEntry(entry){
 if(!entry||entry.format!=='rail-golf-horizons-line'||entry.version!==1||entry.layout!==LAYOUT||typeof entry.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(entry.id)||typeof entry.build!=='string'||!(/^[a-f0-9]{7,40}$/.test(entry.build)||entry.build==='unknown')||typeof entry.keptAt!=='string'||!Number.isFinite(Date.parse(entry.keptAt)))return false;
 const r=entry.record,s=r?.setup,station=r?.station;
 if(!s||!Number.isInteger(s.railIndex)||s.railIndex<0||s.railIndex>=RAIL_RULES.railPositions.length||!finite(s.yaw,RAIL_RULES.minYaw,RAIL_RULES.maxYaw)||!finite(s.elevation,RAIL_RULES.minElevation,RAIL_RULES.maxElevation)||!finite(s.charge,0,1))return false;
 if(!station||station.id!=='swing-gate-apron'||station.x!==0||station.z!==0||station.yaw!==0||!environment(r.environment)||!environment(r.endEnvironment)||!['first-ground-contact','out-of-bounds','settled','safety-timeout'].includes(r.reason)||!finite(r.elapsed,0,60.1)||!vector(r.position))return false;
 if(!Array.isArray(r.contacts)||r.contacts.length>500||!r.contacts.every(c=>typeof c.body==='string'&&c.body.length<128&&Number.isSafeInteger(c.count)&&c.count>0&&finite(c.first,0,r.elapsed)&&finite(c.last,c.first,r.elapsed)&&c.point&&vector([c.point.x,c.point.y,c.point.z]))||!Array.isArray(r.evidence)||r.evidence.length>500)return false;
 if(!Array.isArray(entry.path)||entry.path.length<1||entry.path.length>602)return false;
 let previous=-1;
 for(const point of entry.path){if(!Array.isArray(point)||point.length!==4||!finite(point[0],0,r.elapsed)||point[0]<previous||!vector(point.slice(1)))return false;previous=point[0];}
 return JSON.stringify(entry).length<=200000;
}
export function createGateShelf(storage){
 let entries=[],warning='',writable=true;
 try{
  const raw=storage?.getItem(KEY);
  if(raw){if(raw.length>800000)throw Error('Oversized saved shelf');const parsed=JSON.parse(raw);if(parsed.version!==1||!Array.isArray(parsed.entries)||parsed.entries.length>LIMIT||!parsed.entries.every(validGateEntry)||new Set(parsed.entries.map(e=>e.id)).size!==parsed.entries.length)throw Error('Invalid or foreign saved line');entries=parsed.entries;}
 }catch{warning='Saved shelf could not be read. Its original bytes are preserved; new keeps last only for this visit.';writable=false;}
 const persist=()=>{if(!storage||!writable){if(!warning)warning='Keeps last only for this visit. Download a line to preserve its evidence.';return;}try{storage.setItem(KEY,JSON.stringify({version:1,entries}));}catch{warning='Storage is unavailable. Keeps last only for this visit; download before leaving.';}};
 return {
  entries:()=>structuredClone(entries),warning:()=>warning,
  keep(record,path,build){if(entries.length>=LIMIT)return null;const entry=structuredClone({format:'rail-golf-horizons-line',version:1,layout:LAYOUT,id:crypto.randomUUID(),build,keptAt:new Date().toISOString(),record,path});if(!validGateEntry(entry))throw Error('Cannot keep incomplete gate evidence');entries.push(entry);persist();return structuredClone(entry);},
  get(id){return structuredClone(entries.find(e=>e.id===id)??null);},
  remove(id){entries=entries.filter(e=>e.id!==id);persist();},
 };
}
