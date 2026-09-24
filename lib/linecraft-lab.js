import {packLine} from './shot-library.js';
import {recognizedIntentEvents} from './intent-lab.js';
import {RAIL_RULES} from './rail-golf-v02.js';

// An opt-in curriculum/memory layer. Physics, recognition gates and score values
// remain the incumbent authorities; no helper below generates physical evidence.
export const LINECRAFT_LESSONS=Object.freeze([
 {id:'banks',station:'gate',label:'BANK A → BANK B',clauses:[['bank-a','BANK A'],['bank-b','BANK B']]},
 {id:'treads',station:'lumber',label:'TREAD 1 → TREAD 2 → TREAD 3',clauses:[['step-a','TREAD 1'],['step-b','TREAD 2'],['step-c','TREAD 3']]},
].map(lesson=>Object.freeze({...lesson,clauses:Object.freeze(lesson.clauses.map(([surface,label])=>Object.freeze({surface,label})))})));
export const LINECRAFT_SHELF_LIMIT=4;
export const LINECRAFT_REPLAY_SECONDS=6;
const clone=value=>JSON.parse(JSON.stringify(value));
// Historical observations retain their original identity and two-clause meaning.
const legacyTreadPair=Object.freeze({id:'tread-pair',clauses:LINECRAFT_LESSONS[1].clauses.slice(0,2)});
const lessonFor=id=>{const found=LINECRAFT_LESSONS.find(lesson=>lesson.id===id)??(id==='tread-pair'?legacyTreadPair:null);if(!found)throw Error('Unknown Linecraft lesson');return found;};
const metaOf=meta=>meta?.linecraft??meta;
const endings=new Set(['retry-interrupted','interrupted','unresolved']);

export function matchLinecraftSentence(id,ledger){
 const lesson=lessonFor(id),seen=new Set();let reached=0;
 for(const event of ledger){
  if(event.kind!=='redirect'||!event.feature||seen.has(event.feature))continue;
  seen.add(event.feature);
  if(event.surface===lesson.clauses[reached]?.surface)reached++;
 }
 const labels=lesson.clauses.map(clause=>clause.label),total=labels.length,complete=reached===total;
 return {id,reached,total,complete,labels,headline:complete?'SENTENCE COMPLETE':reached?'REACHED '+labels[reached-1]:'NO CLAUSE YET'};
}
export function linecraftActualDiverges(id,ledger){
 const lesson=lessonFor(id),events=recognizedIntentEvents(ledger);
 const match=matchLinecraftSentence(id,ledger);
 return events.length!==match.reached||events.some((event,index)=>event.kind!=='redirect'||event.surface!==lesson.clauses[index]?.surface);
}

// Curriculum is session-only. Reload always starts a fresh Learn session; the
// independent shelf and study journals survive when browser storage is available.
export function createLinecraftSession(){
 return {stage:'learn',lessonIndex:0,progress:Object.fromEntries(LINECRAFT_LESSONS.map(lesson=>[lesson.id,{attempted:0,completed:false}])),
  scoreVisible:false,openEntry:'trained',attemptIds:[],openExposures:[]};
}
export function linecraftMeta(session,relation=null){
 return {linecraft:{stage:session.stage,lessonId:session.stage==='learn'?LINECRAFT_LESSONS[session.lessonIndex].id:null,
  scoreVisible:session.stage==='open'&&session.scoreVisible,openEntry:session.openEntry,progress:clone(session.progress),
  openExposures:clone(session.openExposures),relation:relation===null?null:clone(relation)}};
}
export function recordLinecraftAttempt(session,attemptId,ledger,fireMeta=linecraftMeta(session)){
 if(typeof attemptId!=='string'||!attemptId||session.attemptIds.includes(attemptId))return session;
 const terminal=ledger.findLast(event=>event.kind==='termination')?.reason;
 if(!terminal||endings.has(terminal))return session;
 const meta=metaOf(fireMeta),current=LINECRAFT_LESSONS[session.lessonIndex];
 // A resolved old ticket must never advance a newly selected lesson or stage.
 if(!meta||meta.stage!==session.stage||(meta.stage==='learn'&&meta.lessonId!==current?.id))return session;
 const next=clone(session);next.attemptIds.push(attemptId);
 if(meta.stage==='learn'){
  const progress=next.progress[meta.lessonId];progress.attempted++;
  progress.completed=progress.completed||matchLinecraftSentence(meta.lessonId,ledger).complete;
 }
 return next;
}
export function enterLinecraftOpen(session,entry='cold'){
 if(!['trained','cold','revisit'].includes(entry))throw Error('Unknown Linecraft Open entry');
 const next=clone(session);next.stage='open';next.openEntry=entry;
 next.openExposures.push({entry,at:new Date().toISOString(),progress:clone(session.progress)});
 return next;
}
export function continueLinecraftSession(session){
 if(session.stage!=='learn'||!session.progress[LINECRAFT_LESSONS[session.lessonIndex].id].attempted)return session;
 if(session.lessonIndex===LINECRAFT_LESSONS.length-1)return enterLinecraftOpen(session,'trained');
 return {...clone(session),lessonIndex:session.lessonIndex+1};
}

const PREFIX='rail-golf:linecraft:';
export function linecraftStorage(storage){
 const keys=()=>Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(key=>key?.startsWith(PREFIX));
 return {get length(){return keys().length;},key:index=>keys()[index]?.slice(PREFIX.length)??null,
  getItem:key=>storage.getItem(PREFIX+key),setItem:(key,value)=>storage.setItem(PREFIX+key,value),removeItem:key=>storage.removeItem(PREFIX+key),
  clear(){for(const key of keys())storage.removeItem(key);}};
}
const SHELF_KEY='shelf-v1',DECISIONS_KEY='keep-observations-v1';
const vector=point=>point&&['x','y','z'].every(key=>Number.isFinite(point[key])&&Math.abs(point[key])<10000);
const validMeta=value=>value&&['learn','open'].includes(value.stage)&&typeof value.scoreVisible==='boolean'&&
 (value.stage==='open'?value.lessonId===null:LINECRAFT_LESSONS.some(lesson=>lesson.id===value.lessonId)||value.lessonId==='tread-pair');
const validLine=line=>line&&line.holeId==='open-line'&&['gate','lumber'].includes(line.stationId)&&typeof line.windId==='string'&&
 typeof line.build==='string'&&/^([a-f0-9]{7,40}(-dirty)?|unknown)$/.test(line.build)&&
 Number.isInteger(line.railIndex)&&line.railIndex>=0&&line.railIndex<RAIL_RULES.railPositions.length&&
 Number.isFinite(line.yaw)&&line.yaw>=RAIL_RULES.minYaw&&line.yaw<=RAIL_RULES.maxYaw&&
 Number.isFinite(line.elevation)&&line.elevation>=RAIL_RULES.minElevation&&line.elevation<=RAIL_RULES.maxElevation&&
 Number.isFinite(line.charge)&&line.charge>=0&&line.charge<=1&&
 ['A','B'].includes(line.environment?.floor)&&['A','B'].includes(line.environmentAfter?.floor)&&
 Array.isArray(line.points)&&line.points.length>0&&line.points.length<=320&&line.points.every(vector)&&
 Array.isArray(line.contacts)&&line.contacts.length<=32&&line.contacts.every(contact=>vector(contact?.point))&&
 Array.isArray(line.ledger)&&line.ledger.every(event=>event&&typeof event.kind==='string')&&
 typeof line.ledger.findLast(event=>event.kind==='termination')?.reason==='string'&&
 !endings.has(line.ledger.findLast(event=>event.kind==='termination')?.reason)&&
 Number.isFinite(line.lineReceipt?.total);
const validLaunch=(launch,line)=>launch&&launch.card===line.holeId&&launch.station===line.stationId&&launch.windId===line.windId&&launch.build===line.build&&
 launch.environment?.floor===line.environment.floor&&vector(launch.muzzle)&&vector(launch.direction)&&
 Number.isFinite(launch.launchSpeed)&&launch.launchSpeed===line.speed&&launch.launchSpeed>=RAIL_RULES.minSpeed&&launch.launchSpeed<=RAIL_RULES.maxSpeed&&
 ['railIndex','yaw','elevation','charge'].every(key=>launch.setup?.[key]===line[key]);
const validEntry=entry=>entry&&typeof entry.attemptId==='string'&&entry.attemptId.length>0&&typeof entry.keptAt==='string'&&
 validLine(entry.line)&&validLaunch(entry.launchContext,entry.line)&&validMeta(metaOf(entry.meta));
const validDecision=entry=>entry&&typeof entry.attemptId==='string'&&entry.attemptId.length>0&&entry.action==='keep'&&Number.isSafeInteger(entry.sequence)&&entry.sequence>0&&
 typeof entry.at==='string'&&validMeta(entry.linecraft)&&entry.launchContext&&typeof entry.launchContext.build==='string'&&
 ['gate','lumber'].includes(entry.launchContext.station)&&entry.launchContext.setup&&['railIndex','yaw','elevation','charge'].every(key=>Number.isFinite(entry.launchContext.setup[key]))&&
 vector(entry.launchContext.muzzle)&&vector(entry.launchContext.direction)&&typeof entry.ending==='string'&&
 Array.isArray(entry.orderedEvents)&&entry.orderedEvents.every(event=>event&&typeof event.kind==='string'&&typeof event.label==='string')&&
 (entry.linecraft.stage==='learn'||(Number.isFinite(entry.scoreTotal)&&entry.lineReceipt?.total===entry.scoreTotal));

// A quarantined raw snapshot is a separate, durable key. Never write a partial
// collection over unreadable source data if the backup itself could not be saved.
function loadCollection(storage,key,decode,label){
 let entries=[],warning='',writable=true;
 try{
  const raw=storage.getItem(key);
  if(raw!==null){
   try{const result=decode(JSON.parse(raw));entries=clone(result.entries);
    if(result.damaged)throw Error('Invalid entries quarantined');
   }catch(error){
    try{
     const backup=key+'-quarantine-'+new Date().toISOString()+'-'+Math.random().toString(36).slice(2);
     storage.setItem(backup,raw);
     warning=`${label}: original raw data preserved as ${backup}. ${String(error)}`;
    }catch(backupError){writable=false;warning=`${label}: original raw data could not be preserved (${String(backupError)}). New choices remain in memory; export before leaving.`;}
   }
  }
 }catch(error){writable=false;warning=`${label} could not be read: ${String(error)}. New choices remain in memory; export before leaving.`;}
 return {entries,warning,writable};
}
function recoverEntries(saved,valid,limit=Infinity){
 if(!Array.isArray(saved))throw Error('Invalid collection envelope');
 const entries=[],seen=new Set();let damaged=false;
 for(const entry of saved){
  if(!valid(entry)||seen.has(entry.attemptId)||entries.length>=limit){damaged=true;continue;}
  entries.push(entry);seen.add(entry.attemptId);
 }
 return {entries,damaged};
}
export function createLinecraftShelf(storage){
 const loaded=loadCollection(storage,SHELF_KEY,saved=>{
  if(!saved||saved.version!==1)throw Error('Unsupported shelf version');
  return recoverEntries(saved.entries,validEntry,LINECRAFT_SHELF_LIMIT);
 },'Line Shelf');
 let entries=loaded.entries,warning=loaded.warning;
 const persist=()=>{if(!loaded.writable)return;
  try{storage.setItem(SHELF_KEY,JSON.stringify({version:1,entries}));if(!loaded.warning)warning='';}
  catch(error){warning='Line Shelf retained only in memory: '+String(error)+'. Export before leaving.';}};
 return {
  entries:()=>clone(entries),warning:()=>warning,
  keep(attemptId,line,launchContext,meta){
   const prior=entries.find(entry=>entry.attemptId===attemptId);if(prior)return clone(prior);
   if(entries.length>=LINECRAFT_SHELF_LIMIT)return null;
   const entry=clone({attemptId,line:packLine(line),launchContext,meta,keptAt:new Date().toISOString()});
   if(!validEntry(entry))throw Error('Cannot Keep incomplete or unresolved Linecraft evidence');
   entries=[...entries,entry];persist();return clone(entry);
  },
  remove(attemptId){const next=entries.filter(entry=>entry.attemptId!==attemptId);if(next.length===entries.length)return false;entries=next;persist();return true;},
 };
}

// Keep observations are append-only and independent of the four viewing slots.
// Removing a slot or evicting a survey attempt does not erase the player's choice.
export function createLinecraftDecisions(storage){
 const loaded=loadCollection(storage,DECISIONS_KEY,saved=>recoverEntries(saved,validDecision),'Keep observations');
 let entries=loaded.entries,warning=loaded.warning;
 return {
  append(entry){
   if(!validEntry(entry))throw Error('Invalid kept line observation');
   const prior=entries.find(item=>item.attemptId===entry.attemptId);if(prior)return clone(prior);
   const linecraft=clone(metaOf(entry.meta)),open=linecraft.stage==='open';
   const observation={attemptId:entry.attemptId,action:'keep',sequence:Math.max(0,...entries.map(item=>item.sequence))+1,at:entry.keptAt,
    linecraft,launchContext:clone(entry.launchContext),orderedEvents:recognizedIntentEvents(entry.line.ledger),
    sentenceResult:open?null:matchLinecraftSentence(linecraft.lessonId,entry.line.ledger),
    ...(Number.isInteger(entry.meta.shelfAvailable)&&entry.meta.shelfAvailable>=0&&entry.meta.shelfAvailable<=LINECRAFT_SHELF_LIMIT?{capacityAtFire:entry.meta.shelfAvailable}:{}),
    ending:entry.line.ledger.findLast(event=>event.kind==='termination')?.reason??'unresolved',
    ...(open?{scoreTotal:entry.line.lineReceipt.total,lineReceipt:clone(entry.line.lineReceipt)}:{})};
   entries=[...entries,observation];
   if(loaded.writable)try{storage.setItem(DECISIONS_KEY,JSON.stringify(entries));if(!loaded.warning)warning='';}catch(error){warning='Keep observations retained only in memory: '+String(error)+'. Export before leaving.';}
   return clone(observation);
  },export:()=>clone(entries),warning:()=>warning,
 };
}

export function exportLinecraftStudy(surveyExport,decisions,shelf=[]){
 const first=new Map();for(const decision of decisions)if(!first.has(decision.attemptId))first.set(decision.attemptId,decision);
 const records=surveyExport.records.filter(record=>validMeta(record.linecraft)).map(source=>{
  const record=clone(source),ledger=record.evidence??[],open=record.linecraft.stage==='open';
  record.orderedEvents=recognizedIntentEvents(ledger);record.sentenceResult=open?null:matchLinecraftSentence(record.linecraft.lessonId,ledger);
  record.decision=clone(first.get(record.id)??null);record.voluntarilyKept=record.decision?.action==='keep';
  if(open)record.scoreTotal=record.receipt.total;else {delete record.receipt;delete record.scoreTotal;}
  return record;
 });
 const ids=new Set(records.map(record=>record.id));
 return {...clone(surveyExport),version:1,study:'rail-golf-linecraft-v1',records,decisions:clone(decisions),
  orphanKeepObservations:clone(decisions.filter(decision=>!ids.has(decision.attemptId))),shelf:clone(shelf).map(entry=>{
   if(metaOf(entry.meta)?.stage==='learn')delete entry.line.lineReceipt;
   return entry;
  }),
  note:'Learn/session progress resets on reload. Local shelf and Keep observations persist independently. Open receipts use the unchanged placeholder score whether displayed or hidden. Missing Keep is undecided, not discard. Replay is a six-second distance-normalized animation of sampled actual history, never new physics.'};
}
export function linecraftStudyCSV(study){
 const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 const columns=['id','session','sequence','build','stage','lesson','openEntry','scoreVisible','station','rail','yaw','elevation','charge','startingFloor','terminal','events','clausesReached','sentenceComplete','scoreTotal','voluntarilyKept','archivedAttemptMissing','capacityAtFire'];
 const rows=study.records.map(record=>[record.id,record.session,record.sequence,record.build,record.linecraft.stage,record.linecraft.lessonId,record.linecraft.openEntry,record.linecraft.scoreVisible,
  record.station,record.setup.railIndex,record.setup.yaw,record.setup.elevation,record.setup.charge,record.environment?.floor,record.ending,record.orderedEvents.map(event=>event.label).join(' → '),
  record.sentenceResult?.reached,record.sentenceResult?.complete,record.scoreTotal,record.voluntarilyKept,false,record.shelfAvailable??record.decision?.capacityAtFire]);
 for(const decision of study.orphanKeepObservations??[]){
  const launch=decision.launchContext,meta=decision.linecraft;
  rows.push([decision.attemptId,null,null,launch.build,meta.stage,meta.lessonId,meta.openEntry,meta.scoreVisible,
   launch.station,launch.setup.railIndex,launch.setup.yaw,launch.setup.elevation,launch.setup.charge,launch.environment?.floor,
   decision.ending,decision.orderedEvents.map(event=>event.label).join(' → '),decision.sentenceResult?.reached,decision.sentenceResult?.complete,
   decision.scoreTotal,true,true,decision.capacityAtFire]);
 }
 return [columns,...rows].map(row=>row.map(quote).join(',')).join('\r\n');
}

// No timestamp or velocity is invented. This is a spatial walk over historical
// sample segments, at normalized distance; callers choose the fixed six-second view.
export function sampleRecordedPath(points,progress){
 if(!Array.isArray(points)||!points.length||!points.every(vector)||!Number.isFinite(progress))return null;
 const value=Math.max(0,Math.min(1,progress));
 if(value===0||points.length===1)return {...points[0]};if(value===1)return {...points.at(-1)};
 const lengths=points.slice(1).map((point,index)=>Math.hypot(point.x-points[index].x,point.y-points[index].y,point.z-points[index].z));
 const total=lengths.reduce((sum,length)=>sum+length,0);if(!total)return {...points[0]};
 let remaining=value*total;
 for(let index=0;index<lengths.length;index++){
  const length=lengths[index];if(length===0)continue;
  if(remaining<=length){const t=remaining/length,a=points[index],b=points[index+1];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}
  remaining-=length;
 }
 return {...points.at(-1)};
}
