import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {LINECRAFT_LESSONS,LINECRAFT_SHELF_LIMIT,LINECRAFT_REPLAY_SECONDS,matchLinecraftSentence,linecraftActualDiverges,createLinecraftSession,linecraftMeta,recordLinecraftAttempt,continueLinecraftSession,enterLinecraftExplore,enterLinecraftOpen,linecraftStorage,createLinecraftShelf,createLinecraftDecisions,exportLinecraftStudy,linecraftStudyCSV,sampleRecordedPath} from '../lib/linecraft-lab.js';
import {captureLabLaunch} from '../lib/lab-controls.js';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {recordLineReceipt,scoreLine} from '../lib/line-score.js';
import {makeSurveyRecord} from '../lib/survey-ledger.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';

const storage=()=>{const values=new Map();return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),clear:()=>values.clear()};};
const redirect=(surface,feature=surface)=>({kind:'redirect',surface,feature,label:surface.toUpperCase()});
const banks=[redirect('bank-a'),redirect('bank-b')],treads=[redirect('step-a'),redirect('step-b'),redirect('step-c')];
const terminal={kind:'termination',reason:'ground-contact'};
function fixture({station='gate',ledger=[...banks,terminal],floor='A',after='B'}={}){
 const setup={railIndex:1,yaw:0,elevation:42,charge:.4};
 const launch=captureLabLaunch(selectOpenLineStation(station),setup,{floor},'8eb7ef65');
 const line={...setup,build:launch.build,holeId:launch.card,stationId:launch.station,windId:launch.windId,projectileId:1,
  outcome:'miss',receipt:'GROUND CONTACT',environment:{floor},environmentAfter:{floor:after},ledger,lineReceipt:recordLineReceipt(ledger),
  points:Array.from({length:500},(_,index)=>({x:index/100,y:3,z:index/10})),contacts:[{id:'c1',kind:'bank-a',point:{x:1,y:3,z:20}}]};
 return {line,launch};
}
const kept=(manager,id,session=createLinecraftSession(),options)=>{const {line,launch}=fixture(options);return manager.keep(id,line,launch,linecraftMeta(session));};

test('curriculum uses two relationships and strictly ordered qualified departures',()=>{
 assert.deepEqual(LINECRAFT_LESSONS.map(lesson=>[lesson.id,lesson.station]),[['banks','gate'],['treads','lumber']]);
 assert.equal(matchLinecraftSentence('banks',banks).complete,true);
 assert.equal(matchLinecraftSentence('banks',[banks[1],banks[0]]).reached,1);
 assert.equal(matchLinecraftSentence('banks',[{kind:'contact',surface:'bank-a'},banks[1]]).reached,0);
 assert.equal(matchLinecraftSentence('banks',[banks[0],redirect('bank-b','bank-a')]).reached,1);
 assert.equal(matchLinecraftSentence('tread-pair',treads).complete,true);
 assert.equal(matchLinecraftSentence('treads',treads.slice(0,2)).headline,'REACHED TREAD 2');
 assert.equal(matchLinecraftSentence('treads',[treads[0],redirect('lumber','step-b'),treads[2]]).complete,false);
 assert.equal(matchLinecraftSentence('banks',[]).headline,'NO CLAUSE YET');
 assert.equal(linecraftActualDiverges('banks',banks),false);
 assert.equal(linecraftActualDiverges('banks',[banks[1],banks[0]]),true,'a qualified out-of-order event needs an actual-chain line');
 assert.equal(linecraftActualDiverges('treads',treads.slice(0,2)),false,'partial in-order progress is already shown by clauses');
});

test('one resolved attempt permits Continue without success; attempts, completion and Open exposure are distinct',()=>{
 const original=createLinecraftSession();assert.equal(continueLinecraftSession(original),original);
 let session=recordLinecraftAttempt(original,'learn:1',[terminal]);
 assert.deepEqual(session.progress.banks,{attempted:1,completed:false});assert.equal(original.progress.banks.attempted,0);
 assert.equal(recordLinecraftAttempt(session,'learn:1',[...banks,terminal]),session,'same ticket cannot double count');
 session=continueLinecraftSession(session);assert.equal(session.lessonIndex,1);
 session=recordLinecraftAttempt(session,'learn:2',[...treads.slice(0,2),terminal]);assert.equal(session.progress.treads.completed,false);
 session=recordLinecraftAttempt(session,'learn:3',[...treads,terminal]);assert.equal(session.progress.treads.completed,true);
 session=continueLinecraftSession(session);assert.equal(session.stage,'open');assert.equal(session.openEntry,'trained');assert.equal(session.openExposures.length,1);
 assert.equal(session.progress.banks.completed,false,'graduation is exposure, not falsely claimed mastery');
 assert.deepEqual(createLinecraftSession(),original,'reload/restart creates fresh session progress');
});

test('interruptions and stale fire-time lessons cannot advance curriculum',()=>{
 const session=createLinecraftSession(),meta=linecraftMeta(session);
 for(const ledger of [banks,[...banks,{kind:'termination',reason:'retry-interrupted'}],[{kind:'termination',reason:'unresolved'}]])assert.equal(recordLinecraftAttempt(session,'shot:1',ledger,meta),session);
 const next=continueLinecraftSession(recordLinecraftAttempt(session,'shot:1',[terminal],meta));
 assert.equal(recordLinecraftAttempt(next,'shot:2',[...banks,terminal],meta),next);
 const open=enterLinecraftOpen(next,'cold');assert.equal(recordLinecraftAttempt(open,'shot:3',[...banks,terminal],meta),open);
});

test('cold Open is explicit; score visibility changes presentation metadata, never evidence or state progression',()=>{
 const cold=enterLinecraftOpen(createLinecraftSession(),'cold');assert.equal(cold.openExposures[0].entry,'cold');assert.equal(cold.progress.banks.attempted,0);
 const hidden=linecraftMeta(cold),visible=linecraftMeta({...cold,scoreVisible:true});
 assert.equal(hidden.linecraft.scoreVisible,false);assert.equal(visible.linecraft.scoreVisible,true);assert.equal(visible.linecraft.lessonId,null);
 assert.deepEqual(hidden.linecraft.progress,visible.linecraft.progress);assert.equal(linecraftMeta({...createLinecraftSession(),scoreVisible:true}).linecraft.scoreVisible,false);
 visible.linecraft.progress.banks.attempted=900;assert.equal(cold.progress.banks.attempted,0,'ticket metadata is immutable copy');
 assert.throws(()=>enterLinecraftOpen(cold,'mystery'));
});

test('local Explore needs a completed bank relationship and exports separately from Learn, cold Open and trained Open',()=>{
 const learn=createLinecraftSession();assert.equal(enterLinecraftExplore(learn),learn);
 const done=recordLinecraftAttempt(learn,'bank:1',[...banks,terminal]),explore=enterLinecraftExplore(done);
 assert.equal(explore.stage,'explore');assert.equal(explore.openEntry,'local-explore');assert.equal(explore.lessonIndex,0);
 assert.equal(explore.openExposures.at(-1).entry,'local-explore');assert.equal(linecraftMeta(explore).linecraft.lessonId,null);
 const shot=recordLinecraftAttempt(explore,'free:1',[...treads,terminal],linecraftMeta(explore));
 assert.equal(shot.progress.treads.attempted,0);assert.equal(shot.progress.treads.completed,false);
 const next=continueLinecraftSession(shot);assert.equal(next.stage,'learn');assert.equal(next.lessonIndex,1);
 assert.equal(next.progress.treads.attempted,0);
 const raw=storage(),shelf=createLinecraftShelf(raw),journal=createLinecraftDecisions(raw);
 const sessions=[done,shot,enterLinecraftOpen(createLinecraftSession(),'cold'),enterLinecraftOpen(next,'trained')];
 const records=sessions.map((session,index)=>{
  const entry=kept(shelf,'path:'+index,session);journal.append(entry);
  return makeSurveyRecord({...entry.launchContext,...entry.meta,id:entry.attemptId,session:'path',sequence:index,startedAt:'2026-09-22T00:00:00.000Z'},entry.line.ledger);
 });
 const exported=exportLinecraftStudy({records,exportedAt:'now'},journal.export(),shelf.entries());
 assert.deepEqual(exported.records.map(r=>[r.linecraft.stage,r.linecraft.openEntry]),[
  ['learn','trained'],['explore','local-explore'],['open','cold'],['open','trained']]);
 assert.equal(exported.records[1].sentenceResult,null);assert.equal(exported.records[1].scoreTotal,undefined);
 assert.equal(exported.decisions[1].linecraft.stage,'explore');assert.equal(exported.decisions[1].sentenceResult,null);
 assert.equal(exported.shelf[1].line.lineReceipt,undefined);assert.equal(exported.records[2].receipt.total,records[2].receipt.total);
});

test('four-slot shelf retains exact launch authority and endpoint samples; explicit removal never evicts a different line',()=>{
 const raw=storage(),manager=createLinecraftShelf(linecraftStorage(raw));const {line,launch}=fixture();
 const entry=manager.keep('s:1',line,launch,linecraftMeta(createLinecraftSession()));
 for(const key of ['railIndex','yaw','elevation','charge','build','stationId','environment','environmentAfter','ledger','lineReceipt'])assert.deepEqual(entry.line[key],line[key]);
 assert.deepEqual(entry.launchContext,launch);assert.equal(entry.line.points.length,320);assert.deepEqual(entry.line.points[0],line.points[0]);assert.deepEqual(entry.line.points.at(-1),line.points.at(-1));
 line.points[0].x=400;entry.line.environment.floor='B';assert.equal(manager.entries()[0].line.points[0].x,0);assert.equal(manager.entries()[0].line.environment.floor,'A');
 for(let index=2;index<=4;index++)kept(manager,'s:'+index);assert.equal(manager.entries().length,LINECRAFT_SHELF_LIMIT);
 assert.equal(kept(manager,'s:5'),null);assert.deepEqual(manager.entries().map(item=>item.attemptId),['s:1','s:2','s:3','s:4']);
 assert.equal(manager.remove('missing'),false);assert.equal(manager.remove('s:2'),true);kept(manager,'s:5');
 assert.deepEqual(createLinecraftShelf(linecraftStorage(raw)).entries(),manager.entries(),'local shelf survives a reload');
});

test('Keep applies equally to Learn, hidden-score Open, visible-score Open and unrecognized resolved misses',()=>{
 const manager=createLinecraftShelf(storage()),learn=createLinecraftSession(),open=enterLinecraftOpen(learn,'cold');
 for(const [index,session]of [learn,open,{...open,scoreVisible:true}].entries()){
  const entry=kept(manager,'a:'+index,session,{ledger:[terminal]});assert.equal(entry.attemptId,'a:'+index);assert.equal(entry.line.lineReceipt.total,0);
 }
 const {line,launch}=fixture({ledger:[{kind:'termination',reason:'retry-interrupted'}]});
 assert.throws(()=>manager.keep('bad',line,launch,linecraftMeta(learn)),/unresolved/);
});

test('namespaced storage never sees or clears incumbent journal or production progress',()=>{
 const raw=storage();raw.setItem('rail-golf-timber-courtyard-v01','production');raw.setItem('rail-golf:line-survey:pending:baseline','baseline');
 const scoped=linecraftStorage(raw);scoped.setItem('rail-golf:line-survey:pending:trial','trial');scoped.setItem('shelf-v1','shelf');scoped.setItem('shelf-v1-quarantine-recovery','original bytes');
 assert.equal(scoped.length,3);assert.equal(scoped.getItem('rail-golf-timber-courtyard-v01'),null);scoped.clear();assert.equal(raw.length,3);assert.equal(raw.getItem('rail-golf:line-survey:pending:baseline'),'baseline');assert.equal(scoped.getItem('shelf-v1-quarantine-recovery'),'original bytes');
});

test('malformed shelf and quota failures are visible; Keep remains exportable in memory',()=>{
 const raw=storage();raw.setItem('shelf-v1',JSON.stringify({version:1,entries:[{attemptId:'bad',line:{}}]}));
 const invalid=createLinecraftShelf(raw);assert.equal(invalid.entries().length,0);assert.match(invalid.warning(),/quarantine/);
 raw.setItem('keep-observations-v1',JSON.stringify([{attemptId:'bad',action:'keep',sequence:1,linecraft:linecraftMeta(createLinecraftSession()).linecraft}]));
 const badJournal=createLinecraftDecisions(raw);assert.equal(badJournal.export().length,0);assert.match(badJournal.warning(),/quarantine/);
 const failed={getItem:()=>null,setItem:()=>{throw Error('quota');},removeItem:()=>{}};
 const shelf=createLinecraftShelf(failed),entry=kept(shelf,'q:1');assert.equal(shelf.entries().length,1);assert.match(shelf.warning(),/only in memory/);
 const decisions=createLinecraftDecisions(failed);decisions.append(entry);assert.equal(decisions.export().length,1);assert.match(decisions.warning(),/only in memory/);
 const {line,launch}=fixture();assert.throws(()=>shelf.keep('q:2',line,{...launch,launchSpeed:6},linecraftMeta(createLinecraftSession())),/incomplete/);
});

test('legacy two-tread evidence survives migration without changing its historical identity',()=>{
 const raw=storage(),shelf=createLinecraftShelf(raw),session=createLinecraftSession();
 const old={...linecraftMeta(session),linecraft:{...linecraftMeta(session).linecraft,lessonId:'tread-pair',progress:{...session.progress,'tread-pair':{attempted:1,completed:true}}}};
 const {line,launch}=fixture({station:'lumber',ledger:[...treads.slice(0,2),terminal]});
 const kept=shelf.keep('old:1',line,launch,old);
 const journal=createLinecraftDecisions(raw);journal.append(kept);
 assert.equal(createLinecraftShelf(raw).entries()[0].meta.linecraft.lessonId,'tread-pair');
 assert.equal(createLinecraftDecisions(raw).export()[0].sentenceResult.complete,true);
 assert.equal(matchLinecraftSentence('treads',line.ledger).complete,false);
});

test('damaged Shelf and Keep journal entries preserve valid neighbors and quarantine the exact original bytes',()=>{
 const raw=storage(),shelf=createLinecraftShelf(raw),journal=createLinecraftDecisions(raw);
 const first=kept(shelf,'valid:1');journal.append(first);const second=kept(shelf,'valid:2');journal.append(second);
 for(const [key,valid] of [['shelf-v1',shelf.entries()],['keep-observations-v1',journal.export()]]){
  const source=key==='shelf-v1'?JSON.stringify({version:1,entries:[valid[0],{attemptId:'bad',line:{}},valid[1]]}):JSON.stringify([valid[0],{attemptId:'bad'},valid[1]]);
  raw.setItem(key,source);
  const loaded=key==='shelf-v1'?createLinecraftShelf(raw):createLinecraftDecisions(raw);
  assert.deepEqual((key==='shelf-v1'?loaded.entries():loaded.export()).map(e=>e.attemptId),['valid:1','valid:2']);
  assert.match(loaded.warning(),/quarantine/);
  const backup=[...Array(raw.length).keys()].map(i=>raw.key(i)).find(k=>k.startsWith(key+'-quarantine-'));
  assert.equal(raw.getItem(backup),source);
 }
});

test('unreadable raw collections cannot be overwritten by a later Keep if quarantine fails',()=>{
 for(const key of ['shelf-v1','keep-observations-v1']){
  let raw='broken json';const storage={getItem:k=>k===key?raw:null,setItem:(k,value)=>{if(k!==key)throw Error('backup denied');raw=value;}};
  const shelf=createLinecraftShelf(storage),entry=kept(shelf,'new:1');
  if(key==='keep-observations-v1'){const journal=createLinecraftDecisions(storage);journal.append(entry);assert.equal(journal.export().length,1);assert.match(journal.warning(),/could not be preserved/);}
  else {assert.equal(shelf.entries().length,1);assert.match(shelf.warning(),/could not be preserved/);}
  assert.equal(raw,'broken json');
 }
});

test('Keep observations are immutable, survive slot removal and reload, and preserve original Open receipt',()=>{
 const raw=storage(),shelf=createLinecraftShelf(raw),decisions=createLinecraftDecisions(raw),open=enterLinecraftOpen(createLinecraftSession(),'cold');
 const {line,launch}=fixture();const entry=shelf.keep('o:1',line,launch,{...linecraftMeta(open),shelfAvailable:3}),expected=structuredClone(entry.line.lineReceipt);decisions.append(entry);shelf.remove(entry.attemptId);
 entry.line.lineReceipt.total=9999;decisions.append(entry);assert.deepEqual(decisions.export()[0].lineReceipt,expected);
 assert.equal(decisions.export().length,1);assert.equal(decisions.export()[0].capacityAtFire,3);assert.deepEqual(createLinecraftDecisions(raw).export(),decisions.export());
 const learn=kept(shelf,'l:1');decisions.append(learn);assert.equal(decisions.export()[1].lineReceipt,undefined,'Learn observations hide numeric receipts');
});

test('study joins Keep by ticket, freezes Open scoring even when hidden, hides Learn numbers and retains orphan choices',()=>{
 const raw=storage(),shelf=createLinecraftShelf(raw),journal=createLinecraftDecisions(raw),learn=createLinecraftSession(),open=enterLinecraftOpen(learn,'cold');
 const states=[learn,open,{...open,scoreVisible:true}];const records=states.map((state,index)=>{
  const entry=kept(shelf,'study:'+index,state);if(index<2)journal.append(entry);
  const ticket={...entry.launchContext,...entry.meta,id:entry.attemptId,session:'study',sequence:index,startedAt:'2026-09-22T00:00:00.000Z'};
  return makeSurveyRecord(ticket,entry.line.ledger);
 });
 const gone=kept(shelf,'evicted:1',open);journal.append(gone);shelf.remove('evicted:1');
 const original=JSON.stringify(records),study=exportLinecraftStudy({records,exportedAt:'now',evicted:1},journal.export(),shelf.entries());
 assert.equal(JSON.stringify(records),original);assert.equal(study.records[0].receipt,undefined);assert.equal(study.records[0].scoreTotal,undefined);assert.equal(study.shelf[0].line.lineReceipt,undefined);
 for(const index of [1,2]){assert.deepEqual(study.records[index].receipt,records[index].receipt);assert.equal(study.records[index].scoreTotal,scoreLine([...banks,terminal]).total);}
 assert.equal(study.records[1].decision.action,'keep');assert.equal(study.records[2].decision,null);assert.equal(study.records[2].voluntarilyKept,false);
 assert.equal(study.orphanKeepObservations[0].attemptId,'evicted:1');assert.equal(study.orphanKeepObservations[0].scoreTotal,records[1].receipt.total);
 const csv=linecraftStudyCSV(study);assert.match(csv,/"scoreVisible"/);assert.match(csv,/"voluntarilyKept"/);assert.match(csv,/"archivedAttemptMissing"/);
 assert.match(csv.split('\r\n').find(row=>row.startsWith('"evicted:1"')),/"true","true",""$/);
});

test('replay interpolates recorded spatial distance only, handles repeated samples, never mutates history',()=>{
 assert.equal(LINECRAFT_REPLAY_SECONDS,6);const points=[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:1,y:0,z:0},{x:1,y:3,z:0}],copy=structuredClone(points);
 assert.deepEqual(sampleRecordedPath(points,.5),{x:1,y:1,z:0});assert.deepEqual(sampleRecordedPath(points,-1),points[0]);assert.deepEqual(sampleRecordedPath(points,2),points.at(-1));
 assert.deepEqual(sampleRecordedPath([points[0],points[0]],.7),points[0]);assert.equal(sampleRecordedPath([],0),null);assert.equal(sampleRecordedPath(points,NaN),null);assert.deepEqual(points,copy);
});

test('each curriculum sentence remains physically attainable under unchanged Open Line Havok authority',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 // QA-only fixtures. Player-facing curriculum contains no coordinates or solutions.
 const fixtures=[['banks','gate',{railIndex:0,yaw:-1,elevation:25,charge:.93}],['treads','lumber',{railIndex:1,yaw:0,elevation:30,charge:(22+21*.05-6)/37}]];
 for(const [id,station,setup]of fixtures){
  const h=diverterHarness(havok,'A',true,selectOpenLineStation(station),{scoreLab:true});
  try{const shot=h.shoot(setup);assert.equal(matchLinecraftSentence(id,shot.ledger).complete,true,id);const score=scoreLine(shot.ledger);const session={...createLinecraftSession(),stage:'open',scoreVisible:false};
   const record=makeSurveyRecord({...captureLabLaunch(selectOpenLineStation(station),setup,{floor:'A'},'8eb7ef65'),...linecraftMeta(session),id:'physics:'+id,session:'physics',sequence:1,startedAt:'now'},shot.ledger);
   assert.equal(exportLinecraftStudy({records:[record],exportedAt:'now'},[]).records[0].receipt.total,score.total);
  }finally{h.dispose();}
 }
});
