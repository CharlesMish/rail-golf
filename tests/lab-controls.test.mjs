import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createLabControl,createLabGestureGate,captureLabLaunch,returnLabToSetup,LAB_PHASES} from '../lib/lab-controls.js';
import {createActionTrace,actionTraceCSV} from '../lib/action-trace.js';
import {createSurveyLog,createSurveyArchive,surveyCSV,SURVEY_LIMITS} from '../lib/survey-ledger.js';
import {LINE_CARDS,selectOpenLineStation} from '../lib/line-lab.js';
import {stationAim,stationMuzzle} from '../lib/stations.js';
const storage=()=>{const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const emptyLedger=[{kind:'termination',reason:'retry-interrupted'}];

test('120 launches / 40 cycles use actual dispatcher and return lifecycle: one rebuild, no disappearing handlers, correct survey station across reload',async()=>{
 const local=storage(),archive=createSurveyArchive(new IDBFactory()),log=createSurveyLog({storage:local,archive,session:'stress'}),trace=createActionTrace({storage:local,build:'test-build',session:'stress',limits:{entries:5000,bytes:8*1024*1024}});
 const cards=[...LINE_CARDS];let index=0,phase='ready',floor='B',setup={...cards[0].defaultShot,charge:1},flight=null,rebuilds=0,memory=null,max=true;
 const read=()=>({phase,card:cards[index].id,station:cards[index].station.id,floor,setup:{...setup},attempt:flight?.ticket.id});
 const save=()=>{if(!flight||flight.saved)return;log.append(flight.ticket,emptyLedger);memory={...flight.context.setup,environment:flight.context.environment,station:flight.context.station};flight.saved=true;};
 const load=restore=>{rebuilds++;if(restore&&memory?.station===cards[index].station.id)setup={...memory};else setup={...cards[index].defaultShot,charge:1};flight=null;phase='ready';};
 const back=mode=>returnLabToSetup(mode,{interrupt:save,cancel:()=>{phase='ready';},memory:()=>memory,environment:()=>floor,restoreEnvironment:f=>{floor=f;},load,exactPower:p=>{setup.charge=p;max=false;}});
 const handlers={
  selectHole:i=>{index=i;load(false);},selectStation:id=>{cards[3]=selectOpenLineStation(id);load(true);},
  reset:restore=>back(restore?'adjust':'reset'),retry:()=>back('retry'),
  beginCharge:()=>{phase='charging';},release:()=>{const context=captureLabLaunch(cards[index],setup,{floor},'test-build');flight={context,ticket:log.begin(context),saved:false};phase='flight';},
 };
 const installedReset=handlers.reset,installedRetry=handlers.retry;
 const controller=createLabControl({read,handlers:()=>handlers,record:e=>trace.append(e)});
 const run=(method,args=[])=>assert.equal(controller.run(method,args,'pointer'),true,method);
 for(let cycle=0;cycle<40;cycle++){
  run('selectHole',[3]);run('selectStation',['gate']);
  for(const station of ['gate','lumber','gate']){
   if(read().station!==station)run('selectStation',[station]);
   setup={...cards[index].defaultShot,charge:.37};max=true;floor='B';
   run('beginCharge');run('release');
   assert.equal(flight.context.card,'open-line');assert.equal(flight.ticket.station,station);assert.deepEqual(flight.context.muzzle,stationMuzzle(setup,cards[index].station));
   // World/phase changes cannot change the immutable launch ticket.
   floor='A';assert.equal(flight.ticket.environment.floor,'B');
   const identity={card:read().card,station:read().station};
   controller.transition('phase-transition',()=>{phase='theatre';save();});
   controller.transition('phase-transition',()=>{phase='result';});
   assert.deepEqual({card:read().card,station:read().station},identity);
   const before=rebuilds;run('reset',[true]);assert.equal(rebuilds,before+1);assert.equal(floor,'B');assert.equal(setup.charge,.37);assert.equal(max,false);
   const retryBefore=rebuilds;max=true;floor='B';run('retry');assert.equal(rebuilds,retryBefore+1);assert.equal(max,true);assert.equal(floor,'B');
   const resetBefore=rebuilds;run('reset',[false]);assert.equal(rebuilds,resetBefore+1);assert.equal(floor,'A');assert.equal(read().card,'open-line');
  }
  run('selectHole',[1]);run('selectHole',[2]);run('selectHole',[3]);
  assert.strictEqual(handlers.reset,installedReset);assert.strictEqual(handlers.retry,installedRetry);
 }
 const exported=await log.export();assert.equal(exported.records.length,120);assert.ok(exported.records.every(r=>r.card==='open-line'&&r.muzzle&&r.direction));
 assert.equal(exported.records.filter(r=>r.station==='lumber').length,40);
 const reloaded=createSurveyLog({storage:local,archive,session:'reloaded'});assert.deepEqual((await reloaded.export()).records,exported.records);
 assert.equal(surveyCSV(exported.records).split('\r\n').length,121);
 assert.equal(trace.export().entries.filter(e=>e.action==='adjust-last-line'&&e.accepted).length,120);
 assert.equal(trace.export().entries.filter(e=>e.action==='reset-card'&&e.accepted).length,120);
 assert.equal(trace.export().entries.filter(e=>e.action==='fire'&&e.accepted).length,120);
 assert.equal(SURVEY_LIMITS.attempts,2000);assert.equal(SURVEY_LIMITS.bytes,64*1024*1024);
});

test('Reset/Retry recover every live phase, Adjust restores saved authority, missing/guarded handlers are explicitly rejected',()=>{
 for(const initial of ['ready','charging','flight','theatre','result']){
  let phase=initial,builds=0,saves=0,floor='B';const events=[];
  const callbacks={interrupt:()=>{if(phase==='flight')saves++;},cancel:()=>{},memory:()=>({charge:.42,environment:{floor:'B'}}),environment:()=>floor,restoreEnvironment:f=>{floor=f;},load:()=>{builds++;phase='ready';},exactPower:()=>{}};
  const handlers={reset:restore=>returnLabToSetup(restore?'adjust':'reset',callbacks),retry:()=>returnLabToSetup('retry',callbacks)};
  const c=createLabControl({read:()=>({phase,card:'open-line',station:'lumber',floor}),handlers:()=>handlers,record:e=>events.push(e)});
  assert.ok(c.run('reset',[false],'keyboard'));assert.equal(builds,1);assert.equal(floor,'A');assert.equal(saves,initial==='flight'?1:0);
  phase=initial;assert.ok(c.run('reset',[true],'pointer'));assert.equal(builds,2);assert.equal(floor,'B');
  phase='flight';assert.equal(c.run('selectStation',['gate'],'pointer'),false);assert.equal(events.at(-1).reason,'phase-guard');
  phase='ready';delete handlers.reset;assert.equal(c.run('reset',[],'pointer'),false);assert.equal(events.at(-1).reason,'handler-unavailable');
  handlers.reset=()=>{throw Error('test failure');};assert.equal(c.run('reset',[],'pointer'),false);assert.match(events.at(-1).reason,/action-error/);
  handlers.reset=()=>returnLabToSetup('reset',callbacks);assert.equal(c.run('reset',[],'pointer'),true);
 }
 assert.ok(LAB_PHASES.reset.includes('result'));
});

test('interrupted launch is appended once before reset/adjust replaces it; ready and charging never invent attempts',async()=>{
 const local=storage(),log=createSurveyLog({storage:local,archive:createSurveyArchive(new IDBFactory()),session:'interrupt'});
 let phase='flight',ticket=log.begin(captureLabLaunch(selectOpenLineStation('lumber'),{railIndex:0,yaw:3,elevation:30.5,charge:1},{floor:'B'},'test'));
 const order=[];
 const back=()=>returnLabToSetup('reset',{interrupt:()=>{if(ticket){log.append(ticket,emptyLedger);order.push('save');}},cancel:()=>{order.push('cancel');},memory:()=>null,environment:()=> 'B',restoreEnvironment:()=>{},load:()=>{order.push('load');ticket=null;phase='ready';},exactPower:()=>{}});
 back();assert.deepEqual(order,['save','cancel','load']);assert.equal(phase,'ready');back();phase='charging';back();
 assert.equal((await log.export()).records.length,1);assert.equal((await log.export()).records[0].ending,'retry-interrupted');
});

test('held pointer cannot click a replacement button, survive a phase change, replay, or fire after cancellation',()=>{
 const gate=createLabGestureGate(),button={},other={};assert.equal(gate.click(button,0),'missing-pointer-down');
 gate.down(button,0,1);assert.equal(gate.click(button,0),null);assert.equal(gate.click(button,0),'duplicate-gesture');
 gate.down(button,0,1);assert.equal(gate.click(other,0),'different-control');
 gate.down(button,0,1);assert.equal(gate.click(button,1),'stale-gesture');
 gate.down(button,1,1);gate.cancel(1);assert.equal(gate.click(button,1),'cancelled-gesture');
 gate.down(button,2,2);gate.cancel(1);assert.equal(gate.click(button,2),null);
});

test('launch metadata is a detached snapshot of the same card/station/aim used by the muzzle',()=>{
 const setup={railIndex:0,yaw:3,elevation:30.5,charge:1},environment={floor:'B'};
 const gate=selectOpenLineStation('gate'),walk=selectOpenLineStation('lumber');
 const a=captureLabLaunch(gate,setup,environment,'build'),b=captureLabLaunch(walk,setup,environment,'build');
 assert.equal(a.card,b.card);assert.notDeepEqual(a.muzzle,b.muzzle);assert.notDeepEqual(a.direction,b.direction);
 assert.deepEqual(b.direction,stationAim(setup,walk.station));
 setup.yaw=69;environment.floor='A';assert.equal(b.setup.yaw,3);assert.equal(b.environment.floor,'B');
 assert.throws(()=>{b.setup.charge=0;},TypeError);
});

test('action trace survives reload, shares immutable before/after and source, exports CSV, bounds storage, leaves survey keys alone',()=>{
 const local=storage(),before={phase:'ready',card:'open-line',station:'gate',floor:'A'},after={...before,station:'lumber'};
 local.setItem('rail-golf:line-survey:pending:protected','unchanged');
 const trace=createActionTrace({storage:local,build:'build',session:'one'});
 trace.append({action:'select-station',source:'pointer',before,after,accepted:true,reason:'accepted',request:{method:'selectStation',args:['lumber']}});
 after.station='gate';const reloaded=createActionTrace({storage:local,build:'next',session:'two'});
 let data=reloaded.export();assert.equal(data.entries[0].after.station,'lumber');assert.equal(data.entries[0].before.station,'gate');assert.equal(data.entries[0].source,'pointer');assert.equal(data.entries[0].build,'build');assert.match(actionTraceCSV(data),/select-station/);
 const limited=createActionTrace({storage:local,build:'build',session:'small',limits:{entries:5,bytes:6000}});
 for(let i=0;i<20;i++)limited.append({action:'retry',source:'keyboard',before,after,accepted:true,reason:'accepted'});
 data=limited.export();assert.ok(data.entries.length<=5);assert.ok(data.retired>=16);assert.ok(local.getItem('rail-golf:line-actions:small').length*2<=6000);
 limited.clear();assert.equal(limited.export().entries.length,0);assert.equal(local.getItem('rail-golf:line-survey:pending:protected'),'unchanged');
});

test('blocked action storage is visible, bounded in memory, and never throws into a control handler',()=>{
 const blocked={get length(){throw Error('denied');},setItem(){throw Error('denied');}};
 const trace=createActionTrace({storage:blocked,build:'test',session:'blocked',limits:{entries:3,bytes:3000}});
 const state={phase:'ready',card:'open-line',station:'gate',floor:'A'};
 for(let i=0;i<20;i++)trace.append({action:'retry',source:'pointer',before:state,after:state,accepted:true,reason:'accepted'});
 assert.ok(trace.export().warning);assert.ok(trace.export().entries.length<=3);
});
