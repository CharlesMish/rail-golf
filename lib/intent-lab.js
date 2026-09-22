import {packLine} from './shot-library.js';

// Presentation/study authority only: existing Havok, recognition and score rules remain
// the authority. No function in this module changes a physical or recognition parameter.
export const INTENT_CONDITIONS=Object.freeze(['sentence','keep','score']);
export const SENTENCES=Object.freeze([
 {id:'banks',station:'gate',label:'BANK A → BANK B',clauses:[['bank-a','BANK A'],['bank-b','BANK B']]},
 {id:'treads',station:'lumber',label:'TREAD 1 → TREAD 2 → TREAD 3',clauses:[['step-a','TREAD 1'],['step-b','TREAD 2'],['step-c','TREAD 3']]},
 {id:'reverse',station:'lumber',label:'BANK B → BANK A',clauses:[['bank-b','BANK B'],['bank-a','BANK A']]},
].map(s=>Object.freeze({...s,clauses:Object.freeze(s.clauses.map(([surface,label])=>Object.freeze({surface,label})))})));
const clone=value=>JSON.parse(JSON.stringify(value));
const sentenceFor=id=>{const sentence=SENTENCES.find(s=>s.id===id);if(!sentence)throw Error('Unknown Intent sentence');return sentence;};

// Ordered subsequence of already-qualified departures. Unrelated evidence is ignored;
// an earlier out-of-order clause is not banked for later. One body/family cannot repeat.
export function matchIntentSentence(id,ledger){
 const sentence=sentenceFor(id),seen=new Set();let reached=0;
 for(const event of ledger){
  if(event.kind!=='redirect'||!event.feature||seen.has(event.feature))continue;
  seen.add(event.feature);
  if(event.surface===sentence.clauses[reached]?.surface)reached++;
 }
 const labels=sentence.clauses.map(c=>c.label),total=labels.length,complete=reached===total;
 return {id,reached,total,complete,labels,headline:complete?'PROMPT COMPLETE':reached?'REACHED '+labels[reached-1]:'NO CLAUSE YET'};
}

// These captions describe evidence; they neither value it nor decide whether to Keep.
export function recognizedIntentEvents(ledger){
 const seen=new Set(),events=[];
 ledger.forEach((event,index)=>{
  let key,label;
  if(event.kind==='redirect'&&event.feature){key='redirect:'+event.feature;label=event.label??'QUALIFIED REBOUND';}
  else if(event.kind==='token'&&event.surface==='sky'){key='sky';label='SKY TOKEN';}
  else if(event.kind==='pad-activation'){key='skip';label='SKIP';}
  else if(event.kind==='relationship'&&event.surface==='saw-mill'){key='saw-mill';label='SAW → MILL';}
  else if(event.kind==='switch-use'&&(event.state==='A'||event.state==='B')){key='switch';label='PALLET '+event.state;}
  if(!key||seen.has(key))return;seen.add(key);
  events.push({kind:event.kind,label,sourceIndex:Number.isInteger(event.sourceIndex)?event.sourceIndex:index,
   ...(event.feature?{feature:event.feature}:{}),...(event.surface?{surface:event.surface}:{}),...(event.state?{state:event.state}:{})});
 });
 return events;
}

// Session-only repertoire. The stored path is sampled historical evidence, never an
// aim prediction; setup/speed, environment, event order and build remain exact copies.
export function keepIntentLine(kept,attemptId,line){
 if(!attemptId||kept.length>=3||kept.some(entry=>entry.attemptId===attemptId))return kept;
 return [...kept,{attemptId,line:clone(packLine(line))}];
}

const PREFIX='rail-golf:intent:';
export function intentStorage(storage){
 const keys=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(PREFIX));
 return {get length(){return keys().length;},key(i){return keys()[i]?.slice(PREFIX.length)??null;},
  getItem:key=>storage.getItem(PREFIX+key),setItem:(key,value)=>storage.setItem(PREFIX+key,value),removeItem:key=>storage.removeItem(PREFIX+key),
  clear(){for(const key of keys())storage.removeItem(key);}};
}
export function intentMeta(condition,sentenceId=null,relation=null){
 if(!INTENT_CONDITIONS.includes(condition))throw Error('Unknown Intent condition');
 if(condition==='sentence')sentenceFor(sentenceId);
 return {intent:{condition,sentenceId:condition==='sentence'?sentenceId:null,relation:relation===null?null:clone(relation)}};
}
export const INTENT_DECISION_LIMIT=1000;
const DECISIONS_KEY='rail-golf-intent-decisions-v1';
export function createIntentDecisions(storage){
 let entries=[],warning='';
 try{const saved=JSON.parse(storage.getItem(DECISIONS_KEY)??'[]');if(!Array.isArray(saved))throw Error('Invalid decision journal');entries=saved.filter(e=>e&&typeof e.attemptId==='string'&&['keep','discard'].includes(e.action)&&Number.isSafeInteger(e.sequence)&&typeof e.at==='string').slice(-INTENT_DECISION_LIMIT);}
 catch(error){warning='Intent decisions could not be loaded: '+String(error);}
 return {
  append(attemptId,action){
   if(typeof attemptId!=='string'||!attemptId||!['keep','discard'].includes(action))throw Error('Invalid Intent decision');
   // A kept line remains kept. Repeated button activation cannot rewrite that choice.
   const prior=entries.find(e=>e.attemptId===attemptId);if(prior)return clone(prior);
   const entry={attemptId,action,sequence:(entries.at(-1)?.sequence??0)+1,at:new Date().toISOString()};
   entries=[...entries,entry].slice(-INTENT_DECISION_LIMIT);
   try{storage.setItem(DECISIONS_KEY,JSON.stringify(entries));}catch(error){warning='Intent decisions retained only in memory: '+String(error);}
   return clone(entry);
  },
  export:()=>clone(entries),warning:()=>warning,
  clear(){entries=[];try{storage.removeItem(DECISIONS_KEY);warning='';}catch(error){warning='Intent decision clear could not persist: '+String(error);}},
 };
}

// The durable attempt remains immutable. Post-result choices join by the original
// ticket ID, never by array index or currently selected condition/card/station.
export function exportIntentStudy(surveyExport,decisions){
 const firstDecision=new Map();for(const d of decisions)if(!firstDecision.has(d.attemptId))firstDecision.set(d.attemptId,d);
 const records=surveyExport.records.filter(r=>INTENT_CONDITIONS.includes(r.intent?.condition)).map(source=>{
  const record=clone(source),condition=record.intent.condition,ledger=record.evidence??[];
  record.orderedEvents=recognizedIntentEvents(ledger);
  record.sentenceResult=condition==='sentence'?matchIntentSentence(record.intent.sentenceId,ledger):null;
  record.decision=condition==='keep'?clone(firstDecision.get(record.id)??null):null;
  if(condition==='score')record.scoreTotal=record.receipt.total;
  else {delete record.receipt;delete record.scoreTotal;}
  return record;
 });
 return {...clone(surveyExport),version:1,study:'rail-golf-intent-v1',records,decisions:clone(decisions),
  note:'SCORE is the unchanged placeholder control. SENTENCE/KEEP do not export numeric score receipts. Kept geometry is session-only.'};
}
export function intentStudyCSV(study){
 const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 const columns=['id','session','sequence','build','startedAt','condition','sentence','station','rail','yaw','elevation','charge','launchSpeed','startingFloor','terminal','events','clausesReached','promptComplete','scoreTotal','decision','relation'];
 return [columns,...study.records.map(r=>[r.id,r.session,r.sequence,r.build,r.startedAt,r.intent.condition,r.intent.sentenceId,r.station,r.setup.railIndex,r.setup.yaw,r.setup.elevation,r.setup.charge,r.launchSpeed,r.environment?.floor,r.ending,r.orderedEvents.map(e=>e.label).join(' → '),r.sentenceResult?.reached,r.sentenceResult?.complete,r.scoreTotal,r.decision?.action,JSON.stringify(r.intent.relation)])].map(row=>row.map(quote).join(',')).join('\r\n');
}
