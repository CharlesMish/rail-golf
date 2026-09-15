import test from 'node:test';import assert from 'node:assert/strict';import {IDBFactory} from 'fake-indexeddb';
import {createSurveyArchive,createSurveyLog,makeSurveyRecord,surveyCSV,SURVEY_LIMITS} from '../lib/survey-ledger.js';
import {scoreLine} from '../lib/line-score.js';
const memoryStorage=()=>{const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const meta={build:'abc123',card:'open-line',station:'gate',setup:{railIndex:0,yaw:3,elevation:30.5,charge:1},launchSpeed:43,environment:{floor:'B'}};
const ledger=[{kind:'token',surface:'sky'},{kind:'run',distance:267},{kind:'termination',reason:'retry-interrupted'}];
test('immutable journal precedes UI mutation; hundreds of cards/stations/retries survive reload, JSON and CSV totals agree',async()=>{
 const storage=memoryStorage(),archive=createSurveyArchive(new IDBFactory()),log=createSurveyLog({storage,archive,session:'first'});await log.ready();
 const events=structuredClone(ledger),ticket=log.begin(meta);log.append(ticket,events);assert.equal(storage.length,1);
 events[0].surface='none';ticket.setup.charge=0;log.append(ticket,events); // same launch cannot be banked twice
 for(let i=0;i<450;i++){const t=log.begin({...meta,card:i%2?'lumber-cascade':'open-line',station:i%3?'gate':'lumber'});log.append(t,ledger);}
 const result=await log.export();assert.equal(result.records.length,451);assert.equal(storage.length,0);assert.equal(result.records[0].setup.charge,1);
 assert.equal(result.records[0].receipt.total,scoreLine(ledger).total);assert.equal(result.records[0].ending,'retry-interrupted');
 assert.deepEqual(result.records.map(r=>r.sequence),Array.from({length:451},(_,i)=>i+1));
 const csv=surveyCSV(result.records);assert.equal(csv.split('\r\n').length,452);assert.ok(csv.includes('"500","sky","0","250","267"'));
 const reloaded=createSurveyLog({storage,archive,session:'second'});assert.deepEqual((await reloaded.export()).records,result.records);
 const t=reloaded.begin(meta);reloaded.append(t,ledger);assert.equal((await reloaded.export()).records.at(-1).sequence,1);
 await reloaded.clear();assert.equal((await reloaded.export()).records.length,0);assert.equal(storage.length,0);
});
test('crash/failed archive leaves recoverable journal; commit-then-crash recovery is idempotent',async()=>{
 const storage=memoryStorage(),archive=createSurveyArchive(new IDBFactory());const failed={...archive,append:async()=>{throw Error('offline archive');}};
 const log=createSurveyLog({storage,archive:failed,session:'crash'});const t=log.begin(meta);log.append(t,ledger);await log.ready();assert.equal(storage.length,1);assert.ok((await log.export()).warning);
 const record=JSON.parse(storage.getItem(storage.key(0)));await archive.append(record); // crash between commit and journal removal
 const recovered=createSurveyLog({storage,archive,session:'recovered'});const data=await recovered.export();assert.equal(data.records.length,1);assert.equal(storage.length,0);assert.equal(data.records[0].id,t.id);
});
test('archive bounds both count and bytes, reports oldest eviction, preserves immutable first write',async()=>{
 for(const limits of [{...SURVEY_LIMITS,attempts:3},{...SURVEY_LIMITS,bytes:2500}]){
  const archive=createSurveyArchive(new IDBFactory(),limits);
  for(let i=0;i<10;i++)await archive.append(makeSurveyRecord({...meta,id:'a'+i,session:'s',sequence:i,startedAt:'now'},ledger));
  const result=await archive.read();assert.ok(result.records.length<=3);assert.ok(result.evicted>=7);assert.equal(result.records.at(-1).id,'a9');
  const original=result.records.at(-1);await archive.append({...original,ending:'changed'});assert.equal((await archive.read()).records.at(-1).ending,original.ending);
 }
});
test('collision compaction keeps counts/source indices and all score accounting; oversized evidence truncation is explicit',()=>{
 const raw=Array.from({length:10000},(_,i)=>({kind:'contact',body:'roof',surface:'mill',point:{x:i%5,y:12,z:100}}));
 const r=makeSurveyRecord({...meta,id:'c',session:'c',sequence:1,startedAt:'now'},raw);assert.equal(r.contacts.length,1);assert.equal(r.contacts[0].count,10000);assert.equal(r.contacts[0].lastIndex,9999);assert.equal(r.receipt.total,0);assert.equal(r.rawContactCount,10000);
 const huge=makeSurveyRecord({...meta,id:'h',session:'h',sequence:1,startedAt:'now'},Array.from({length:1000},(_,i)=>({kind:'rejected',reason:'turn-too-small',feature:'feature-'+i,point:{x:1,y:2,z:3}})));
 assert.ok(huge.omittedEvidence>0);assert.ok(new TextEncoder().encode(JSON.stringify(huge)).length<=SURVEY_LIMITS.recordBytes);
});
test('long assembly evidence retains every member and physical velocities in the survey',()=>{
 const event={kind:'redirect',feature:'mill-assembly',surface:'mill',members:['roof-a','roof-b','post-a','post-b','wall'],incoming:{x:10,y:-2,z:4},outgoing:{x:-6,y:3,z:7},point:{x:-30,y:15,z:80}};
 const record=makeSurveyRecord({...meta,id:'assembly',session:'s',sequence:1,startedAt:'now'},[event]);
 assert.deepEqual(record.evidence[0].members,event.members);assert.deepEqual(record.evidence[0].outgoing,event.outgoing);assert.equal(record.receipt.total,100);
});
test('blocked journal is visible and archive/export still preserve attempts',async()=>{
 const storage={get length(){throw Error('blocked');},removeItem(){throw Error('blocked');}};const log=createSurveyLog({storage,archive:createSurveyArchive(new IDBFactory()),session:'blocked'});
 log.append(log.begin(meta),ledger);const data=await log.export();assert.equal(data.records.length,1);assert.ok(data.warning.includes('blocked'));
});
