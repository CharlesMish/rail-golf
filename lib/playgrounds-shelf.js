import {RAIL_RULES} from './rail-golf-v02.js';

const LIMIT=4,MAX_ENTRY=220000;
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>finite(n,-10000,10000));
const descriptor=d=>d&&typeof d.layout==='string'&&/^playgrounds-[a-z0-9-]{1,64}-v\d+$/.test(d.layout)&&typeof d.validateEnvironment==='function'&&typeof d.station==='function';
const safeData=(v,depth=0)=>depth<=8&&(v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=1024||typeof v==='number'&&Number.isFinite(v)||Array.isArray(v)&&v.length<=500&&v.every(n=>safeData(n,depth+1))||typeof v==='object'&&v!==null&&!Array.isArray(v)&&Object.keys(v).length<=40&&Object.entries(v).every(([k,n])=>k.length<=100&&safeData(n,depth+1)));

// This descriptor belongs to a bundled lab config. It is never accepted from a
// world import. Historical routes do not acquire browser storage through here.
export function validPlaygroundEntry(entry,contract){
 if(!descriptor(contract))return false;
 try{
  if(!entry||entry.format!=='rail-golf-playgrounds-line'||entry.version!==1||entry.layout!==contract.layout||typeof entry.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(entry.id)||typeof entry.build!=='string'||!(/^[a-f0-9]{7,40}(?:-dirty)?$/.test(entry.build)||entry.build==='unknown')||typeof entry.keptAt!=='string'||!Number.isFinite(Date.parse(entry.keptAt)))return false;
  const r=entry.record,s=r?.setup,t=r?.station;
  if(!s||!Number.isInteger(s.railIndex)||s.railIndex<0||s.railIndex>=RAIL_RULES.railPositions.length||!finite(s.yaw,RAIL_RULES.minYaw,RAIL_RULES.maxYaw)||!finite(s.elevation,RAIL_RULES.minElevation,RAIL_RULES.maxElevation)||!finite(s.charge,0,1))return false;
  if(Object.keys(s).some(k=>!['railIndex','yaw','elevation','charge','originX','carriageMode','tourDirection','tourRunning'].includes(k))||s.originX!==undefined&&!finite(s.originX,-1000,1000)||s.carriageMode!==undefined&&(typeof s.carriageMode!=='string'||!/^[a-z0-9-]{1,64}$/.test(s.carriageMode))||s.tourDirection!==undefined&&![-1,1].includes(s.tourDirection)||s.tourRunning!==undefined&&typeof s.tourRunning!=='boolean')return false;
  if(!t||typeof t.id!=='string'||t.id.length>100||typeof t.label!=='string'||t.label.length>150||!vector([t.x,t.y??0,t.z])||!finite(t.yaw,-360,360))return false;
  const expected=contract.station(s);
  if(!expected||['id','x','z','yaw'].some(k=>t[k]!==expected[k])||(t.y??0)!==(expected.y??0))return false;
  if(!contract.validateEnvironment(r.environment)||!contract.validateEnvironment(r.endEnvironment)||!['first-ground-contact','out-of-bounds','settled','safety-timeout'].includes(r.reason)||!finite(r.elapsed,0,60.1)||!vector(r.position))return false;
  if(!Array.isArray(r.contacts)||r.contacts.length>500||!r.contacts.every(c=>typeof c.body==='string'&&c.body.length<128&&Number.isSafeInteger(c.count)&&c.count>0&&finite(c.first,0,r.elapsed)&&finite(c.last,c.first,r.elapsed)&&c.point&&vector([c.point.x,c.point.y,c.point.z]))||!Array.isArray(r.evidence)||r.evidence.length>500||!r.evidence.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&typeof e.kind==='string'&&safeData(e)))return false;
  if(!Array.isArray(entry.path)||entry.path.length<1||entry.path.length>602)return false;
  let previous=-1;
  for(const point of entry.path){if(!Array.isArray(point)||point.length!==4||!finite(point[0],0,r.elapsed)||point[0]<previous||!vector(point.slice(1)))return false;previous=point[0];}
  const end=entry.path.at(-1);
  if(entry.path[0][0]!==0||Math.abs(end[0]-r.elapsed)>1e-7||end.slice(1).some((n,i)=>Math.abs(n-r.position[i])>1e-6))return false;
  return JSON.stringify(entry).length<=MAX_ENTRY;
 }catch{return false;}
}

export function createBrowserPlaygroundShelf(contract,host=globalThis){
 if(!descriptor(contract))return null;
 let storage=null;try{storage=host.localStorage;}catch{}
 return createPlaygroundShelf(contract,storage);
}

export function createPlaygroundShelf(contract,storage){
 if(!descriptor(contract))throw Error('Unknown playground contract');
 const key=`rail-golf:playgrounds:${contract.layout}`;
 let entries=[],warning='',writable=true;
 try{
  const raw=storage?.getItem(key);
  if(raw){
   if(raw.length>MAX_ENTRY*LIMIT)throw Error('Oversized shelf');
   const data=JSON.parse(raw);
   if(data.version!==1||data.layout!==contract.layout||!Array.isArray(data.entries)||data.entries.length>LIMIT||!data.entries.every(e=>validPlaygroundEntry(e,contract))||new Set(data.entries.map(e=>e.id)).size!==data.entries.length)throw Error('Invalid saved lines');
   entries=data.entries;
  }
 }catch{writable=false;warning='Saved lines could not be read. Original data is preserved; new keeps last only for this visit.';}
 const persist=()=>{
  if(!storage||!writable){warning||='Keeps last only for this visit. Download before leaving.';return;}
  try{storage.setItem(key,JSON.stringify({version:1,layout:contract.layout,entries}));}
  catch{warning='Storage is unavailable. Keeps last only for this visit; download before leaving.';}
 };
 return {
  entries:()=>structuredClone(entries),warning:()=>warning,
  keep(record,path,build){
   if(entries.length>=LIMIT)return null;
   const entry=structuredClone({format:'rail-golf-playgrounds-line',version:1,layout:contract.layout,id:crypto.randomUUID(),build,keptAt:new Date().toISOString(),record,path});
   if(!validPlaygroundEntry(entry,contract))throw Error('Cannot keep incomplete or foreign physical evidence');
   entries.push(entry);persist();return structuredClone(entry);
  },
  get:id=>structuredClone(entries.find(e=>e.id===id)??null),
  remove(id){entries=entries.filter(e=>e.id!==id);persist();},
 };
}
