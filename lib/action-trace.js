// Local lab diagnostics, separate from the proven 2,000-attempt survey archive.
// One key per tab/session avoids cross-tab overwrite. No network/telemetry.
export const ACTION_TRACE_LIMITS=Object.freeze({entries:5000,bytes:1024*1024});
const PREFIX='rail-golf:line-actions:';
const clone=x=>JSON.parse(JSON.stringify(x));
export function createActionTrace({storage,build,session=globalThis.crypto.randomUUID(),limits=ACTION_TRACE_LIMITS}){
 let sequence=0,entries=[],retired=0,warning='';
 const key=PREFIX+session;
 const readAll=()=>{
  const all=[];let evicted=0;
  for(let i=0;i<storage.length;i++){const k=storage.key(i);if(!k?.startsWith(PREFIX)||k===key)continue;
   try{const value=JSON.parse(storage.getItem(k));if(value?.version===1&&Array.isArray(value.entries)){all.push(...value.entries);evicted+=value.retired??0;}}
   catch{warning='An action trace could not be read; existing data retained.';}
  }
  return {entries:[...all,...entries].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.sequence-b.sequence),retired:evicted+retired};
 };
 const persist=()=>{
  // Enforce total retained size across sessions. Evict oldest whole prior sessions
  // first, then oldest entries in this session. Explicit retirement counts export.
  let keys=[];
  for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(PREFIX)&&k!==key)keys.push(k);}
  const firstTime=k=>{try{return JSON.parse(storage.getItem(k)).entries?.[0]?.timestamp??'';}catch{return '';}};
  keys=keys.sort((a,b)=>firstTime(a).localeCompare(firstTime(b)));
  const packed=()=>JSON.stringify({version:1,session,retired,entries});
  let json=packed();
  const size=()=>keys.reduce((n,k)=>n+(storage.getItem(k)?.length??0)*2,0)+json.length*2;
  const count=()=>keys.reduce((n,k)=>{try{return n+JSON.parse(storage.getItem(k)).entries.length;}catch{return n;}},0)+entries.length;
  while(keys.length&&(size()>limits.bytes||count()>limits.entries)){
   const k=keys.shift();try{const old=JSON.parse(storage.getItem(k));retired+=(old.entries?.length??0)+(old.retired??0);}catch{}storage.removeItem(k);json=packed();
  }
  while(entries.length&&(json.length*2>limits.bytes||entries.length>limits.entries)){entries.shift();retired++;json=packed();}
  storage.setItem(key,json);
 };
 return {
  append(entry){entries.push(clone({...entry,build,session,sequence:++sequence,timestamp:new Date().toISOString(),monotonicMs:performance.now()}));
   // Bounds apply even if storage is unavailable.
   while(entries.length&&(entries.length>limits.entries||JSON.stringify(entries).length*2>limits.bytes-256)){entries.shift();retired++;}
   try{persist();}catch(error){warning='Action trace storage unavailable: '+String(error)+'. Export before leaving.';}
  },
  export(){let data;try{data=readAll();}catch(error){warning='Action trace read unavailable: '+String(error);data={entries,retired};}return clone({version:1,limits,...data,warning});},
  clear(){try{const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(PREFIX))keys.push(k);}keys.forEach(k=>storage.removeItem(k));entries=[];retired=0;warning='';}catch(error){warning='Could not clear action trace: '+String(error);throw error;}},
 };
}
export function actionTraceCSV(trace){
 const rows=[['session','sequence','timestamp','build','action','source','accepted','reason','phaseBefore','phaseAfter','cardBefore','cardAfter','stationBefore','stationAfter','attempt','request'],...trace.entries.map(e=>[e.session,e.sequence,e.timestamp,e.build,e.action,e.source,e.accepted,e.reason,e.before.phase,e.after.phase,e.before.card,e.after.card,e.before.station,e.after.station,e.after.attempt??e.before.attempt,JSON.stringify(e.request??{})])];
 return rows.map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
}
