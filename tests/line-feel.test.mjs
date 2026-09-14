import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {createRunTracker,RUN_RULE} from '../lib/line-run.js';
import {scoreLine,normalizeLineEvidence,recordLineReceipt,normalizeLineReceipt} from '../lib/line-score.js';
import {createRedirectTracker,REDIRECT_GATES} from '../lib/line-recognition.js';
import {LINE_CARDS,LINE_STATIONS,OPEN_LINE,selectOpenLineStation,SAW_BAY_OPEN_LINE} from '../lib/line-lab.js';
import {YARD_STATIONS,stationMuzzle} from '../lib/stations.js';
import {COURTYARD_HOLES} from '../lib/courtyard.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
import {maxLatchAfter,launchCharge} from '../lib/shot-tools.js';
import {chargeToSpeed} from '../lib/rail-golf-v02.js';
import {followHeading,followOffsets,advanceFlightCamera,projectileScreen} from '../lib/flight-framing.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const claim={kind:'redirect',feature:'test-bank',surface:'bank-a',label:'BANK A REJECT'};
const v={x:30,y:10,z:0};
function step(t,x,time,{claim=false,contact=false,velocity=v}={}){t.beginStep();if(contact)t.contact();return t.step({x,y:8,z:0},velocity,time,claim);}
test('RUN starts at confirmed non-finish evidence, never launch distance or airtime; milestones and cap are exact',()=>{
 const t=createRunTracker();for(let i=0;i<100;i++)assert.equal(step(t,i*10,i),null);assert.equal(t.snapshot(),null);
 step(t,1000,100,{claim:true});assert.equal(t.snapshot().distance,0);
 assert.equal(step(t,1019.9,101),null);assert.equal(step(t,1020,102).distance,20);
 step(t,1040,103);assert.equal(scoreLine([claim,t.snapshot()]).run,50);
 for(let i=1;i<=20;i++)step(t,1040+i*20,103+i);
 assert.equal(scoreLine([claim,t.snapshot()]).run,250);assert.deepEqual(RUN_RULE,{metresPerStep:20,pointsPerStep:25,cap:250,minSpeed:3,freeSeconds:.1});
 assert.equal(scoreLine([t.snapshot()]).run,0);assert.equal(scoreLine([t.snapshot(),claim]).run,0);
 const finishOnly=[{kind:'contact',body:'ground'},{kind:'ruling',targetHit:true},t.snapshot()];assert.equal(scoreLine(finishOnly).run,0);
 const receipt=recordLineReceipt([claim,t.snapshot()]);assert.equal(normalizeLineReceipt(receipt).run,250);assert.equal(scoreLine(normalizeLineEvidence([claim,t.snapshot()])).run,250);
});
test('RUN excludes continuous manifolds, callback chatter, contact grace and settling motion',()=>{
 const t=createRunTracker();step(t,0,0,{claim:true});
 for(let i=1;i<=500;i++){t.beginStep();for(let j=0;j<50;j++)t.contact();t.step({x:i,y:8,z:0},v,i/120,true);}
 assert.equal(t.snapshot().distance,0);
 step(t,501,500/120+.05);assert.equal(t.snapshot().distance,0);
 step(t,502,5,{velocity:{x:.1,y:0,z:0}});assert.equal(t.snapshot().distance,0);
 step(t,527,6);assert.equal(t.snapshot().distance,25);assert.equal(scoreLine([claim,t.snapshot()]).run,25);
});
test('FINISH does not inflate VARIETY and duplicate claims cannot inflate either secondary',()=>{
 const events=[claim,{kind:'token',surface:'sky'}];assert.equal(scoreLine(events).secondary,50);
 assert.equal(scoreLine([...events,{kind:'ruling',targetHit:true}]).secondary,50);
 const ledger=[...events,{kind:'run',distance:300}];assert.equal(scoreLine([...ledger,...ledger]).total,scoreLine(ledger).total);
 assert.equal(scoreLine([{kind:'ruling',targetHit:true}]).total,750);
});
const roof={id:'roof',kind:'mill',label:'MILL ROOF REBOUND',assembly:'mill',assemblyLabel:'MILL REBOUND'},wall={...roof,id:'wall'},point={x:0,y:4,z:0};
const input={x:12,y:-4,z:0},out={x:-8,y:5,z:0};
function touch(t,feature,time,vin=input,vout=out){t.beginStep(vin,time);for(let i=0;i<8;i++)t.contact(feature,feature.id,point);t.endStep(point,vout,time+.008);}
function depart(t,time){t.beginStep(out,time);return t.endStep({x:-2,y:5,z:0},out,time+.008);}
test('same mill assembly contact episode earns one departure, no chatter; prolonged rattles remain rejected',()=>{
 const t=createRedirectTracker();touch(t,roof,0);touch(t,wall,.025,out);const event=depart(t,.15);
 assert.equal(event.feature,'mill-assembly');assert.equal(event.label,'MILL REBOUND');assert.deepEqual(event.members,['roof','wall']);assert.equal(scoreLine([event]).awards.filter(a=>a.tier==='COMMON').length,1);
 touch(t,roof,.4);assert.equal(depart(t,.55),null);assert.ok(t.drainDiagnostics().some(e=>e.reason==='feature-already-scored'));
 const chatter=createRedirectTracker();for(let i=0;i<100;i++)touch(chatter,i%2?wall:roof,i/120);assert.equal(depart(chatter,1),null);assert.ok(chatter.drainDiagnostics().some(e=>e.reason==='contact-too-long'));
 assert.equal(REDIRECT_GATES.minTurnDegrees,25);assert.equal(REDIRECT_GATES.maxContactSeconds,.12);
});
test('distinct visible mill departures can score their distinct parts when real free flight separates them',()=>{
 const t=createRedirectTracker();touch(t,roof,0);const a=depart(t,.12);touch(t,wall,.35);const b=depart(t,.5);
 assert.equal(a.feature,'roof');assert.equal(b.feature,'wall');assert.equal(scoreLine([a,b]).awards.filter(a=>a.tier==='COMMON').length,2);
});
test('Open Line is target-free at both production stations; Saw Bay remains explicit-only; shared setups preserve station and physical outcome',()=>{
 assert.equal(LINE_STATIONS,YARD_STATIONS);assert.deepEqual(LINE_CARDS.slice(0,3),COURTYARD_HOLES);assert.deepEqual(OPEN_LINE.allowedStations,['gate','lumber']);
 assert.throws(()=>selectOpenLineStation('saw'));assert.equal(selectOpenLineStation('saw',{allowParked:true}),SAW_BAY_OPEN_LINE);
 const muzzles=[];
 for(const id of ['gate','lumber']){
  const card=selectOpenLineStation(id);assert.equal(card.target,null);assert.equal(card.station,YARD_STATIONS[id]);
  const shot={...card.defaultShot,charge:.3};muzzles.push(stationMuzzle(shot,card.station));
  const shared={v:1,build:'d9aabe42',world:'timber-courtyard',route:'/lab/lines',card:'open-line',station:id,rail:shot.railIndex,yaw:shot.yaw,elevation:shot.elevation,speed:chargeToSpeed(shot.charge),environment:{floor:'A'}};
  const restore=restoreShareLine(decodeShareLine(encodeShareLine(shared)),shared.build);assert.equal(restore.autoFire,false);assert.equal(restore.station,id);
  const h=diverterHarness(hv,'A',true,card,{scoreLab:true});try{
   const first=h.shoot(shot);h.action('retry');const second=h.shoot(restore.setup);assert.deepEqual(second.ledger,first.ledger);assert.ok(first.ledger.some(e=>e.kind==='termination'));assert.ok(!scoreLine(first.ledger).claimIds.includes('seat'));assert.ok(!h.scene.meshes.some(m=>m.name.includes('saw-bay')));
  }finally{h.dispose();}
 }
 assert.notDeepEqual(muzzles[0],muzzles[1]);
});
test('loading platform is a physical named COMMON and a real Havok rebound qualifies',()=>{
 const h=diverterHarness(hv,'A',true,selectOpenLineStation('gate'),{scoreLab:true});try{
  const platform=h.scene.meshes.find(m=>m.name.includes('loading-platform'));assert.ok(platform.physicsBody);assert.equal(platform.metadata.lineFeature.label,'LOADING PLATFORM REBOUND');
  const r=h.shoot({...OPEN_LINE.defaultShot,charge:.5},{launch:{position:[-28,10,63],velocity:[8,-16,0]}});
  const award=scoreLine(r.ledger).awards.find(a=>a.label==='LOADING PLATFORM REBOUND');assert.ok(award,JSON.stringify(r.ledger));assert.equal(award.points,100);
 }finally{h.dispose();}
});
test('MAX uses exactly existing manual full-charge speed in both modes; exact power path remains unchanged',()=>{
 for(const mode of ['hold','set'])for(const ms of [0,5,500,3000])assert.equal(chargeToSpeed(launchCharge(mode,.22,ms,true)),chargeToSpeed(launchCharge('hold',0,3000)));
 assert.equal(launchCharge('set',.22,0,false),.22);assert.equal(launchCharge('hold',0,0,false),0);
});
test('follow rig keeps extreme ascent/descent and a reverse flight inside a generous safe region without snap translation',()=>{
 for(const [aspect,horizontal,base] of [[844/390,false,.69],[390/844,true,.92]]){
  let ball={x:0,y:10,z:0},previous=ball,velocity={x:0,y:75,z:8},direction={x:0,y:0,z:1};
  let frame={...followOffsets(ball,velocity,direction),fov:base};
  for(let i=0;i<1800;i++){
   const t=i/120;velocity={x:0,y:75-12*t,z:t<7?8:-8};direction={x:0,y:0,z:t<7?1:-1};ball={x:0,y:10+75*t-6*t*t,z:t<7?8*t:112-8*t};
   const before=frame;frame=advanceFlightCamera(frame,ball,previous,followOffsets(ball,velocity,direction),1/120,aspect,horizontal,base);
   const screen=projectileScreen(frame,ball,aspect,horizontal);assert.ok(screen.depth>0&&Math.abs(screen.x)<.85&&Math.abs(screen.y)<.85,JSON.stringify({t,screen}));
   assert.ok(Math.abs(frame.fov-before.fov)<.025);previous=ball;
  }
 }
});

test('MAX remains latched through repeated Retry and explicit recalled/imported Set Power takes authority',()=>{
 let enabled=maxLatchAfter(false,'toggle');assert.equal(enabled,true);
 for(let i=0;i<10;i++){enabled=maxLatchAfter(enabled,'retry');assert.equal(launchCharge('hold',.2,0,enabled),1);}
 for(const action of ['recall','import','set']){const exact=maxLatchAfter(enabled,action);assert.equal(exact,false);assert.equal(launchCharge('set',.37,0,exact),.37);}
 assert.equal(maxLatchAfter(enabled,'toggle'),false);
});

test('real mill column→panel episode qualifies one assembly departure; post-roof flight earns modest RUN',()=>{
 const h=diverterHarness(hv,'A',true,selectOpenLineStation('gate'),{scoreLab:true});try{
  const r=h.shoot({...OPEN_LINE.defaultShot,charge:1},{launch:{position:[-18,7,79.3],velocity:[-25,3,1]}});
  const event=r.ledger.find(e=>e.kind==='redirect'&&e.feature==='mill-assembly');assert.ok(event);assert.equal(event.members.length,2);assert.equal(scoreLine(r.ledger).awards.filter(a=>a.tier==='COMMON').length,1);
  const roof=h.shoot({railIndex:1,yaw:-14,elevation:65,charge:1});const receipt=scoreLine(roof.ledger);assert.equal(receipt.run,50);assert.ok(receipt.runDistance>=40&&receipt.runDistance<60);assert.ok(!receipt.claimIds.includes('seat'));
 }finally{h.dispose();}
});
test('camera heading smoothly turns through a true 180-degree return instead of normalizing back to the old heading',()=>{
 let direction={x:0,y:0,z:1};for(let i=0;i<120;i++){const next=followHeading(direction,{x:0,y:1,z:-20},1/120);assert.ok(Math.hypot(next.x-direction.x,next.z-direction.z)<.14);direction=next;}assert.ok(direction.z<-.99);
});
