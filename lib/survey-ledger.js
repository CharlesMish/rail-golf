import {scoreLine,normalizeLineEvidence} from './line-score.js';
// Instrumentation only. Never read by progress/scoring. IndexedDB archive + synchronous
// write-ahead journal: the immutable receipt is durable before React/history can change.
export const SURVEY_LIMITS=Object.freeze({attempts:2000,bytes:64*1024*1024,recordBytes:96*1024,journalBytes:2*1024*1024});
const PREFIX='rail-golf:line-survey:pending:';
const clone=v=>JSON.parse(JSON.stringify(v));
const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
export function makeSurveyRecord(ticket,ledger){
 const {ignored,...scored}=scoreLine(ledger);const receipt=clone(scored);
 const ignoredSummary=Object.entries(ignored.reduce((counts,e)=>{counts[e.reason]=(counts[e.reason]??0)+1;return counts;},{})).map(([reason,count])=>({reason,count}));
 const contacts=new Map();const evidence=[];
 ledger.forEach((event,index)=>{
  // Saved-line validation caps assembly members at four; a forensic archive must
  // also retain longer legitimate assembly episodes without dropping their velocities.
  const members=Array.isArray(event.members)&&event.members.length<=128&&event.members.every(id=>typeof id==='string'&&id.length<=180)?event.members:undefined;
  const normalized=normalizeLineEvidence([{...event,...(members?{members:members.slice(0,4)}:{})}])[0];
  if(normalized&&members)normalized.members=[...members];
  if(!normalized){evidence.push({kind:'unserializable-evidence',sourceIndex:index});return;}
  if(event.kind!=='contact'){evidence.push({...normalized,sourceIndex:index});return;}
  const key=JSON.stringify([event.body,event.surface,event.feature,event.terminal]);
  const existing=contacts.get(key);
  if(existing){existing.count+=event.count??1;existing.lastIndex=index;existing.lastPoint=normalized.point;}
  else contacts.set(key,{...normalized,sourceIndex:index,lastIndex:index,lastPoint:normalized.point});
 });
 const record={version:1,...clone(ticket),resolvedAt:new Date().toISOString(),ending:ledger.findLast(e=>e.kind==='termination')?.reason??'interrupted',
  targetClear:ledger.some(e=>e.kind==='ruling'&&e.targetHit===true),receipt,ignoredSummary,evidence,contacts:[...contacts.values()],
  rawEventCount:ledger.length,rawContactCount:ledger.filter(e=>e.kind==='contact').reduce((n,e)=>n+(e.count??1),0),
  compaction:'contacts grouped by body/surface; source indices refer to original ledger',omittedEvidence:0,omittedContactGroups:0};
 // Receipt/awards always use the COMPLETE ledger. Oversized diagnostics are explicitly
 // truncated, never silently represented as a complete trace. Normal shots fit intact.
 while(bytes(record)>SURVEY_LIMITS.recordBytes&&(record.evidence.length||record.contacts.length)){
  if(record.evidence.length>record.contacts.length){const n=Math.max(1,Math.ceil(record.evidence.length/10));record.evidence.splice(-n);record.omittedEvidence+=n;}
  else{const n=Math.max(1,Math.ceil(record.contacts.length/10));record.contacts.splice(-n);record.omittedContactGroups+=n;}
 }
 return clone(record);
}
export function surveyCSV(records){
 const columns=['id','session','sequence','build','startedAt','resolvedAt','card','station','railIndex','yaw','elevation','charge','launchSpeed','startingFloor','ending','total','claims','variety','run','runDistance','uniqueFeatureCount','targetClear'];
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return [columns,...records.map(r=>[r.id,r.session,r.sequence,r.build,r.startedAt,r.resolvedAt,r.card,r.station,r.setup.railIndex,r.setup.yaw,r.setup.elevation,r.setup.charge,r.launchSpeed,r.environment?.floor,r.ending,r.receipt.total,r.receipt.claimIds.join('|'),r.receipt.secondary,r.receipt.run,r.receipt.runDistance,r.receipt.uniqueFeatureCount,r.targetClear])].map(row=>row.map(quote).join(',')).join('\r\n');
}
export function createSurveyArchive(indexedDB,limits=SURVEY_LIMITS,databaseName='rail-golf-line-survey'){
 let database;
 const open=()=>database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open(databaseName,1);
  request.onupgradeneeded=()=>{const db=request.result;const store=db.createObjectStore('attempts',{keyPath:'order',autoIncrement:true});store.createIndex('id','id',{unique:true});db.createObjectStore('meta');};
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Survey archive blocked by another tab'));
  request.onsuccess=()=>resolve(request.result);
 }).catch(error=>{database=null;throw error;});
 return {
  async append(record){
   const db=await open();return new Promise((resolve,reject)=>{
    const tx=db.transaction(['attempts','meta'],'readwrite'),store=tx.objectStore('attempts'),meta=tx.objectStore('meta');let stats;
    tx.oncomplete=()=>resolve(stats);tx.onerror=tx.onabort=()=>reject(tx.error??Error('Survey transaction aborted'));
    const duplicate=store.index('id').getKey(record.id);
    duplicate.onsuccess=()=>{if(duplicate.result!==undefined)return;
     const get=meta.get('size');get.onsuccess=()=>{
      const size=get.result??{count:0,bytes:0,evicted:0};const entry={id:record.id,bytes:bytes(record),record};store.add(entry);size.count++;size.bytes+=entry.bytes;
      if(size.count<=limits.attempts&&size.bytes<=limits.bytes){stats={...size};meta.put(size,'size');return;}
      const cursor=store.openCursor();cursor.onsuccess=()=>{const current=cursor.result;
       if(current&&(size.count>limits.attempts||size.bytes>limits.bytes)){size.count--;size.bytes-=current.value.bytes;size.evicted++;current.delete();current.continue();}
       else {stats={...size};meta.put(size,'size');}
      };
     };
    };
   });
  },
  async read(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['attempts','meta'],'readonly'),all=tx.objectStore('attempts').getAll(),meta=tx.objectStore('meta').get('size');tx.oncomplete=()=>resolve({records:all.result.map(e=>e.record),evicted:meta.result?.evicted??0});tx.onerror=()=>reject(tx.error);});},
  async clear(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['attempts','meta'],'readwrite');tx.objectStore('attempts').clear();tx.objectStore('meta').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
 };
}
export function createSurveyLog({storage,archive,session=globalThis.crypto.randomUUID(),onStatus=()=>{}}){
 let sequence=0,queue=Promise.resolve(),warning='',count=0,evicted=0,pendingBytes=0;
 const pending=new Map(),captured=new Set();
 const notify=()=>onStatus({count,pending:pending.size,evicted,warning});
 const keys=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(PREFIX));
 const enqueue=entry=>{
  const id=entry.id;
  queue=queue.then(async()=>{const record=pending.get(id);if(!record)return;try{const stats=await archive.append(record);storage.removeItem(PREFIX+record.id);if(pending.delete(record.id))pendingBytes-=bytes(record);if(stats){count=stats.count+pending.size;evicted=Math.max(evicted,stats.evicted);}}
   catch(error){warning='Survey storage incomplete: '+String(error)+'. Export now; unsaved attempts remain in memory.';}notify();});
 };
 try{for(const key of keys()){const record=JSON.parse(storage.getItem(key));if(record?.version===1&&record.id&&record.receipt){pending.set(record.id,record);pendingBytes+=bytes(record);enqueue(record);}else warning='Unreadable survey journal entry retained; export existing data before clearing.';}}
 catch(error){warning='Survey journal unavailable: '+String(error);}
 queue=queue.then(async()=>{try{const saved=await archive.read();count=saved.records.length+pending.size;evicted=saved.evicted;}catch(error){warning='Survey archive unavailable: '+String(error);}notify();});
 return {
  begin(meta){return clone({...meta,session,sequence:++sequence,id:session+':'+sequence,startedAt:new Date().toISOString()});},
  append(ticket,ledger){
   if(captured.has(ticket.id))return;captured.add(ticket.id);
   const record=makeSurveyRecord(ticket,ledger);pending.set(record.id,record);pendingBytes+=bytes(record);count++;
   while(pending.size>SURVEY_LIMITS.attempts||pendingBytes>SURVEY_LIMITS.bytes){const [oldId,old]=pending.entries().next().value;pending.delete(oldId);pendingBytes-=bytes(old);evicted++;count--;try{storage.removeItem(PREFIX+oldId);}catch{}warning='Unsaved survey buffer reached its limit; oldest attempts retired. Export now.';}
   try{const used=keys().reduce((n,k)=>n+(storage.getItem(k)?.length??0)*2,0);const json=JSON.stringify(record);
    if(used+json.length*2>SURVEY_LIMITS.journalBytes)throw Error('Pending journal full');storage.setItem(PREFIX+record.id,json);
   }catch(error){warning='Survey journal unavailable: '+String(error)+'. Export before leaving until archive saves.';}
   notify();enqueue(record); // Receipt copied and journaled synchronously BEFORE returning.
  },
  async export(){await queue;let records=[],storedEvicted=evicted;
   try{const saved=await archive.read();records=saved.records;storedEvicted=saved.evicted;}catch(error){warning='Archive export failed: '+String(error);}
   const unique=new Map(records.map(r=>[r.id,r]));for(const [id,r]of pending)unique.set(id,r);
   records=[...unique.values()];count=records.length;evicted=storedEvicted;notify();
   return {version:1,exportedAt:new Date().toISOString(),limits:SURVEY_LIMITS,evicted,warning,records:clone(records)};
  },
  async clear(){await queue;await archive.clear();for(const key of keys())storage.removeItem(key);pending.clear();pendingBytes=0;captured.clear();count=0;evicted=0;warning='';notify();},
  ready(){return queue;}
 };
}
