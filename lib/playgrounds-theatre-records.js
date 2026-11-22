import {RAIL_RULES} from './rail-golf-v02.js';
import {THEATRE_LAYOUT,THEATRE_STATION} from './playgrounds-theatre.js';
export const THEATRE_SHELF_KEY='rail-golf:playgrounds:theatre-v1';
export const THEATRE_KEEP_LIMIT=6;
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const vector=p=>Array.isArray(p)&&p.length===3&&p.every(n=>finite(n,-1000,1000));
const environment=e=>e&&Object.keys(e).join(',')==='layout'&&e.layout===THEATRE_LAYOUT;
export function validTheatreRecord(record){
 const setup=record?.setup,station=record?.station;
 if(!setup||Object.keys(setup).sort().join(',')!=='charge,elevation,railIndex,yaw'||!Number.isInteger(setup.railIndex)||setup.railIndex<0||setup.railIndex>2||!finite(setup.yaw,RAIL_RULES.minYaw,RAIL_RULES.maxYaw)||!finite(setup.elevation,RAIL_RULES.minElevation,RAIL_RULES.maxElevation)||!finite(setup.charge,0,1))return false;
 if(!station||Object.keys(station).sort().join(',')!==Object.keys(THEATRE_STATION).sort().join(',')||Object.keys(THEATRE_STATION).some(key=>station[key]!==THEATRE_STATION[key]))return false;
 if(!environment(record.environment)||!environment(record.endEnvironment)||!['first-ground-contact','out-of-bounds','settled','safety-timeout'].includes(record.reason)||!finite(record.elapsed,0,60.1)||!vector(record.position))return false;
 if(!Array.isArray(record.path)||record.path.length<2||record.path.length>3603)return false;
 let previous=-1;for(const p of record.path){if(!Array.isArray(p)||p.length!==4||!finite(p[0],0,record.elapsed)||p[0]<=previous||!vector(p.slice(1)))return false;previous=p[0];}
 if(record.path[0][0]!==0||record.path.at(-1)[0]!==record.elapsed||record.path.at(-1).slice(1).some((n,i)=>n!==record.position[i]))return false;
 if(!Array.isArray(record.contacts)||record.contacts.length>500||!record.contacts.every(c=>c&&typeof c==='object'&&typeof c.body==='string'&&c.body.startsWith('theatre-')&&c.body.length<80&&Number.isInteger(c.count)&&c.count>0&&finite(c.first,0,record.elapsed)&&finite(c.last,c.first,record.elapsed)&&c.point&&vector([c.point.x,c.point.y,c.point.z])))return false;
 if(!Array.isArray(record.impacts)||record.impacts.length>500||!record.impacts.every(i=>i&&typeof i==='object'&&typeof i.body==='string'&&i.body.startsWith('theatre-')&&i.body.length<80&&typeof i.ground==='boolean'&&finite(i.time,0,record.elapsed)&&vector(i.point)&&(i.normal===null||vector(i.normal))&&vector(i.incoming)&&vector(i.outgoing)))return false;
 return Array.isArray(record.evidence)&&record.evidence.length<=500&&record.evidence.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&typeof e.kind==='string'&&e.kind.length<80)&&JSON.stringify(record).length<=450000;
}
export function validTheatreEntry(entry){return Boolean(entry&&entry.format==='rail-golf-theatre-line'&&entry.version===1&&entry.layout===THEATRE_LAYOUT&&typeof entry.id==='string'&&/^[a-z0-9-]{1,64}$/.test(entry.id)&&typeof entry.build==='string'&&(/^([a-f0-9]{7,40}(?:-dirty)?|unknown)$/.test(entry.build))&&typeof entry.keptAt==='string'&&Number.isFinite(Date.parse(entry.keptAt))&&validTheatreRecord(entry.record));}
export function createTheatreShelf(storage){
 let entries=[],warning='',writable=true;
 try{const raw=storage?.getItem(THEATRE_SHELF_KEY);if(raw){if(raw.length>2800000)throw Error('Oversized shelf');const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.entries)||data.entries.length>THEATRE_KEEP_LIMIT||!data.entries.every(validTheatreEntry)||new Set(data.entries.map(e=>e.id)).size!==data.entries.length)throw Error('Invalid shelf');entries=data.entries;}}
 catch{warning='Saved lines could not be read. Their original data is preserved; new Keeps last only for this visit.';writable=false;}
 const persist=()=>{if(!storage||!writable){warning||='Keeps last only for this visit. Download any line you want to preserve.';return;}try{storage.setItem(THEATRE_SHELF_KEY,JSON.stringify({version:1,entries}));}catch{warning='Device storage could not save these lines. Download them before leaving.';}};
 return {entries:()=>structuredClone(entries),warning:()=>warning,
  keep(record,build){if(entries.length>=THEATRE_KEEP_LIMIT)return null;const entry={format:'rail-golf-theatre-line',version:1,layout:THEATRE_LAYOUT,id:crypto.randomUUID(),build,keptAt:new Date().toISOString(),record:structuredClone(record)};if(!validTheatreEntry(entry))throw Error('Incomplete theatre record');entries.push(entry);persist();return structuredClone(entry);},
  get:id=>structuredClone(entries.find(e=>e.id===id)??null),remove(id){entries=entries.filter(e=>e.id!==id);persist();},
 };
}
