import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import Havok from '@babylonjs/havok';
import {INTENT_CONDITIONS,SENTENCES,matchIntentSentence,recognizedIntentEvents,keepIntentLine,intentStorage,intentMeta,createIntentDecisions,exportIntentStudy,intentStudyCSV,INTENT_DECISION_LIMIT} from '../lib/intent-lab.js';
import {makeSurveyRecord} from '../lib/survey-ledger.js';import {scoreLine} from '../lib/line-score.js';import {chargeToSpeed} from '../lib/rail-golf-v02.js';import {selectOpenLineStation} from '../lib/line-lab.js';import {diverterHarness} from './helpers/diverter-physics.mjs';
const memoryStorage=()=>{const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),clear:()=>map.clear()};};
const redirect=(surface,feature=surface)=>({kind:'redirect',feature,surface,label:surface.toUpperCase()});
const banks=[redirect('bank-a'),redirect('bank-b')];
const shot={railIndex:1,yaw:0,elevation:42,charge:.4,build:'15e7508',holeId:'open-line',stationId:'gate',windId:'calm',projectileId:3,outcome:null,receipt:'GROUND CONTACT',environment:{floor:'A'},environmentAfter:{floor:'B'},points:Array.from({length:500},(_,i)=>({x:i/10,y:4,z:i/2})),contacts:[],ledger:banks};

test('Intent uses qualified ordered departures; ignores incidentals but never raw, side, out-of-order or duplicate features',()=>{
 assert.deepEqual(INTENT_CONDITIONS,['sentence','keep','score']);assert.equal(SENTENCES.length,3);
 assert.equal(matchIntentSentence('banks',[{kind:'contact',surface:'bank-a'},redirect('bank-b')]).reached,0);
 assert.equal(matchIntentSentence('banks',[banks[1],banks[0]]).complete,false);
 assert.equal(matchIntentSentence('banks',[banks[0],{kind:'contact',surface:'other-solid'},redirect('mill'),banks[1]]).complete,true);
 assert.equal(matchIntentSentence('banks',[banks[0],redirect('bank-b','bank-a')]).reached,1);
 assert.equal(matchIntentSentence('treads',[redirect('step-a'),redirect('lumber','step-b'),redirect('step-c')]).complete,false);
 assert.equal(matchIntentSentence('banks',[]).headline,'NO CLAUSE YET');
 assert.equal(matchIntentSentence('banks',[banks[0]]).headline,'REACHED BANK A');
 assert.equal(matchIntentSentence('banks',banks).headline,'PROMPT COMPLETE');
 assert.equal(matchIntentSentence('banks',[]).reached,0,'fresh retry uses only the new ledger');
});
test('nonnumeric recognition keeps ordered genuine captions and excludes callback chatter, run and diagnostics',()=>{
 const events=recognizedIntentEvents([{kind:'contact',feature:'bank-a'},banks[0],banks[0],{kind:'rejected',label:'NOT A TRICK'},{kind:'run',distance:200},{kind:'token',surface:'sky'},{kind:'token',surface:'sky'},{kind:'pad-activation'},{kind:'pad-activation'},banks[1]]);
 assert.deepEqual(events.map(e=>e.label),['BANK-A','SKY TOKEN','SKIP','BANK-B']);assert.ok(events.every(e=>!('points'in e)));
});
test('Keep retains exact setup/environment/build, historical endpoint trail and ordered events; three maximum, independent immutable copies',()=>{
 let kept=keepIntentLine([],'s:1',shot);assert.equal(kept[0].line.speed,chargeToSpeed(shot.charge));assert.equal(kept[0].line.points.length,320);assert.deepEqual(kept[0].line.points.at(-1),shot.points.at(-1));
 for(const key of ['railIndex','yaw','elevation','charge','build','stationId','environment','environmentAfter','ledger'])assert.deepEqual(kept[0].line[key],shot[key]);
 assert.equal(keepIntentLine(kept,'s:1',shot),kept);
 kept=keepIntentLine(kept,'s:2',shot);kept=keepIntentLine(kept,'s:3',shot);assert.equal(keepIntentLine(kept,'s:4',shot),kept);
 kept[0].line.points[0].x=999;assert.equal(shot.points[0].x,0);assert.equal(kept[1].line.points[0].x,0);
 assert.equal(kept.length,3);assert.deepEqual(kept[0].line.ledger,banks);
});
test('Intent namespaced survey storage cannot see or clear incumbent archive journals',()=>{
 const storage=memoryStorage();storage.setItem('rail-golf:line-survey:pending:baseline','baseline');const scoped=intentStorage(storage);scoped.setItem('rail-golf:line-survey:pending:trial','intent');assert.equal(scoped.length,1);assert.equal(scoped.getItem('rail-golf:line-survey:pending:baseline'),null);scoped.clear();assert.equal(storage.length,1);assert.equal(storage.getItem('rail-golf:line-survey:pending:baseline'),'baseline');
});
test('post-result decisions are bounded, reloadable and first-choice immutable with honest storage failure warning',()=>{
 const storage=memoryStorage(),journal=createIntentDecisions(storage);journal.append('s:1','keep');journal.append('s:1','discard');assert.equal(journal.export()[0].action,'keep');assert.deepEqual(createIntentDecisions(storage).export(),journal.export());
 for(let i=2;i<=INTENT_DECISION_LIMIT+5;i++)journal.append('s:'+i,'discard');assert.equal(journal.export().length,INTENT_DECISION_LIMIT);assert.equal(journal.export().at(-1).sequence,INTENT_DECISION_LIMIT+5);
 const failing=createIntentDecisions({getItem:()=>null,setItem:()=>{throw Error('quota');},removeItem:()=>{}});failing.append('f:1','keep');assert.equal(failing.export().length,1);assert.match(failing.warning(),/only in memory/);
});
const ticket=(condition,id)=>({id,session:'trial',sequence:Number(id.split(':')[1]),startedAt:'2026-09-22T00:00:00Z',build:'15e7508',card:'open-line',station:'gate',setup:{railIndex:1,yaw:0,elevation:42,charge:.4},launchSpeed:chargeToSpeed(.4),environment:{floor:'A'},...intentMeta(condition,condition==='sentence'?'banks':null,{action:'retry',attemptId:'previous:1'})});
test('study joins choices by immutable ticket, isolates conditions, preserves provenance and frozen Score receipt exactly',()=>{
 const ledger=[...banks,{kind:'run',distance:80},{kind:'termination',reason:'ground-contact'}],records=INTENT_CONDITIONS.map((c,i)=>makeSurveyRecord(ticket(c,'trial:'+(i+1)),ledger)),original=JSON.stringify(records);
 const decisions=[{attemptId:'trial:2',action:'keep',at:'now',sequence:1}],study=exportIntentStudy({records,exportedAt:'now',warning:''},decisions);
 assert.equal(JSON.stringify(records),original);assert.equal(study.records[0].sentenceResult.complete,true);assert.equal(study.records[1].decision.action,'keep');assert.equal(study.records[2].decision,null);
 for(const record of study.records.slice(0,2)){assert.equal(record.receipt,undefined);assert.equal(record.scoreTotal,undefined);}
 assert.deepEqual(study.records[2].receipt,records[2].receipt);assert.equal(study.records[2].scoreTotal,scoreLine(ledger).total);
 assert.equal(study.records[2].sentenceResult,null);assert.equal(study.records[0].build,'15e7508');assert.equal(study.records[0].intent.relation.attemptId,'previous:1');assert.equal(study.records[0].setup.charge,.4);
 assert.match(intentStudyCSV(study),/"scoreTotal"/);assert.match(intentStudyCSV(study),/"keep"/);
 assert.throws(()=>intentMeta('other'),/Unknown/);assert.throws(()=>intentMeta('sentence','nonexistent'),/Unknown/);
});

test('three sentences are physically achievable with target-free incumbent Open Line and unchanged qualified authority',async()=>{
 const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
 // QA fixtures, never imported by the player-facing module or UI.
 const fixtures=[['banks','gate',{railIndex:0,yaw:-1,elevation:25,charge:.93},'banks'],['treads','lumber',{railIndex:1,yaw:0,elevation:30,charge:(22+21*.05-6)/37},'treads'],['reverse','lumber',{railIndex:2,yaw:3,elevation:33,charge:.98},'banks-reverse']];
 for(const [id,station,setup,claim]of fixtures){const card=selectOpenLineStation(station);assert.equal(card.target,null);const h=diverterHarness(havok,'A',true,card,{scoreLab:true});try{
  const first=h.shoot(setup),matched=matchIntentSentence(id,first.ledger);assert.equal(matched.complete,true,id);assert.ok(scoreLine(first.ledger).claimIds.includes(claim));
  h.action('retry');const second=h.shoot(setup);assert.deepEqual(second.ledger,first.ledger);assert.deepEqual(matchIntentSentence(id,second.ledger),matched);
  const meta=ticket('score','trial:1'),record=makeSurveyRecord(meta,first.ledger);const study=exportIntentStudy({records:[record],exportedAt:'now'},[]);assert.deepEqual(study.records[0].receipt,record.receipt);
 }finally{h.dispose();}}
});
