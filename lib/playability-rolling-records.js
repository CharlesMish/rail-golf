import {rollingPose,rollingInstantPose,rollingConfig,validRollingSetup} from './playability-rolling.js';
import {stationMuzzle} from './stations.js';
export const rollingShelfKey=shape=>`rail-golf.playability.${rollingConfig(shape).id}`;
const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===expected.split(',').sort().join(',');
const finiteArray=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
const vector=v=>keys(v,'x,y,z')&&[v.x,v.y,v.z].every(Number.isFinite);
const boundedJSON=(v,depth=0)=>depth<=7&&(v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=300||typeof v==='number'&&Number.isFinite(v)||Array.isArray(v)&&v.length<=500&&v.every(x=>boundedJSON(x,depth+1))||v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=30&&Object.entries(v).every(([k,x])=>k.length<80&&!['script','src','url','href','asset','remote','__proto__'].includes(k)&&boundedJSON(x,depth+1)));
export {validRollingSetup};
export function validRollingRecord(record,shape='sphere'){
 try{
  if(!keys(record,'setup,environment,endEnvironment,reason,elapsed,evidence,contacts,position,station,path,stonePath,impacts,settledEnvironment,settleElapsed')||JSON.stringify(record).length>250000||!validRollingSetup(record.setup))return false;
  const config=rollingConfig(shape);if([record.environment,record.endEnvironment,record.settledEnvironment].some(e=>e?.layout!==config.id))return false;const station=config.station(record.setup);if(!keys(record.station,'id,label,x,z,yaw')||Object.keys(station).some(k=>record.station[k]!==station[k]))return false;
  const before=rollingPose(record.environment),after=rollingPose(record.settledEnvironment);rollingInstantPose(record.endEnvironment);
  if(!['first-ground-contact','out-of-bounds','safety-timeout','settled'].includes(record.reason)||!Number.isFinite(record.elapsed)||record.elapsed<=0||record.elapsed>60.1||!Number.isFinite(record.settleElapsed)||record.settleElapsed<record.elapsed||record.settleElapsed>70.1||!finiteArray(record.position,3))return false;
  if(!Array.isArray(record.path)||record.path.length<2||record.path.length>1400||record.path.some((p,i)=>!finiteArray(p,4)||p[0]<0||p[0]>record.elapsed+.000001||(i>0&&p[0]<=record.path[i-1][0])))return false;
  const muzzle=stationMuzzle(record.setup,station);if(record.path[0][0]!==0||record.path[0].slice(1).some((v,i)=>v!==[muzzle.x,muzzle.y,muzzle.z][i])||record.path.at(-1)[0]!==record.elapsed||record.path.at(-1).slice(1).some((v,i)=>v!==record.position[i]))return false;
  if(!Array.isArray(record.stonePath)||record.stonePath.length<2||record.stonePath.length>1500||record.stonePath.some((p,i)=>!finiteArray(p,8)||p[0]<0||p[0]>record.settleElapsed+.000001||(i>0&&p[0]<=record.stonePath[i-1][0])))return false;
  if(record.stonePath[0][0]!==0||record.stonePath[0].slice(1).some((v,i)=>v!==before[i])||record.stonePath.at(-1)[0]!==record.settleElapsed||record.stonePath.at(-1).slice(1).some((v,i)=>v!==after[i]))return false;
  if(!Array.isArray(record.contacts)||record.contacts.length>500||record.contacts.some(c=>!keys(c,'body,point,count,first,last')||typeof c.body!=='string'||!c.body.startsWith('rolling-')||c.body.length>100||!vector(c.point)||!Number.isSafeInteger(c.count)||c.count<1||!Number.isFinite(c.first)||!Number.isFinite(c.last)||c.first<0||c.last<c.first||c.last>record.elapsed))return false;
  if(!Array.isArray(record.impacts)||record.impacts.length>100||record.impacts.some((r,i)=>!keys(r,'body,time,point,normal,incoming,outgoing')||typeof r.body!=='string'||!r.body.startsWith('rolling-')||r.body.length>100||!Number.isFinite(r.time)||r.time<0||r.time>record.elapsed||(i>0&&r.time<record.impacts[i-1].time)||!['point','normal','incoming','outgoing'].every(k=>finiteArray(r[k],3))))return false;
  if(!Array.isArray(record.evidence)||record.evidence.length>500||record.evidence.some(e=>!e||Array.isArray(e)||typeof e!=='object'||typeof e.kind!=='string'||!boundedJSON(e)))return false;
  return true;
 }catch{return false;}
}
export function createRollingShelf(storage=null,shape='sphere'){
 const layout=rollingConfig(shape).id,key=rollingShelfKey(shape);
 let entries=[],warning='',blocked=false,serial=0;
 try{const raw=storage?.getItem(key);if(raw){if(raw.length>1000000)throw Error('oversized');const saved=JSON.parse(raw);if(!Array.isArray(saved)||saved.length>4||saved.some(e=>!keys(e,'id,layout,build,record')||typeof e.id!=='string'||e.id.length>100||typeof e.build!=='string'||e.build.length>80||e.layout!==layout||!validRollingRecord(e.record,shape))||new Set(saved.map(e=>e.id)).size!==saved.length)throw Error('malformed');entries=saved;}}
 catch{blocked=true;warning='Saved lines could not be read. Their original bytes are preserved; new Keeps stay in memory.';}
 const persist=()=>{if(blocked)return;try{if(!storage){warning='Storage is unavailable. Keeps remain in this tab only.';return;}storage.setItem(key,JSON.stringify(entries));warning='';}catch{warning='Saving failed. These Keeps remain in this tab only.';}};
 return {entries:()=>structuredClone(entries),warning:()=>warning,
  keep(record,build){if(!validRollingRecord(record,shape))throw Error('Only a completed, settled Rolling Yard record can be kept.');if(entries.length>=4){warning='Four lines are kept. Remove one explicitly before keeping another.';return null;}const entry={id:`rolling-${Date.now()}-${++serial}`,layout:layout,build:String(build).slice(0,80),record:JSON.parse(JSON.stringify(record))};entries.push(entry);persist();return structuredClone(entry);},
  remove(id){entries=entries.filter(e=>e.id!==id);persist();},
 };
}
