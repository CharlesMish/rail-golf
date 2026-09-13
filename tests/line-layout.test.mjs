import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';import {Vector3,Ray} from '@babylonjs/core';
import {LINE_CARDS,LINE_STATIONS,SAW_BAY,OPEN_LINE} from '../lib/line-lab.js';
import {COURTYARD_HOLES} from '../lib/courtyard.js';import {YARD_STATIONS,stationMuzzle} from '../lib/stations.js';
import {PLACEHOLDER_RULES,VARIETY_RULE,scoreLine,recordLineReceipt} from '../lib/line-score.js';
import {createRedirectTracker,createSawMillTracker} from '../lib/line-recognition.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
import {resolveOpeningAddress,chargeToSpeed} from '../lib/rail-golf-v02.js';
import {packLine,collectLine,normalizeShotLibrary} from '../lib/shot-library.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const redirect=feature=>({kind:'redirect',feature,surface:feature,label:feature});

test('NON-CANONICAL finish 500 plus capped variety gives the intended qualitative ordering',()=>{
 assert.equal(PLACEHOLDER_RULES.find(r=>r.id==='seat').points,500);
 const dull=[{kind:'contact',terminal:true},{kind:'termination',reason:'ground-contact'},{kind:'ruling',targetHit:true}];
 const clear=scoreLine(dull);assert.equal(clear.total,800);assert.equal(clear.secondary,50);
 const interesting=['step-a','step-b','step-c'].map(redirect),miss=scoreLine(interesting);
 assert.equal(miss.total,1050);assert.ok(miss.total>clear.total);assert.ok(clear.total>scoreLine([]).total);
 assert.ok(scoreLine([...interesting,{kind:'ruling',targetHit:true}]).total>miss.total);
 assert.equal(scoreLine([{kind:'contact',body:'roof',count:1000}]).total,0);
 assert.equal(scoreLine([{kind:'rejected',reason:'contact-too-long'}]).secondary,0);
});
test('variety is distinct qualified claim IDs minus one, +50 each, capped at 200; physical duration/distance are irrelevant',()=>{
 assert.deepEqual(VARIETY_RULE,{pointsPerAdditionalClaim:50,cap:200});
 for(let n=0;n<=10;n++){
  const events=Array.from({length:n},(_,i)=>redirect('lumber-'+i));
  assert.equal(scoreLine(events).secondary,Math.min(200,Math.max(0,n-1)*50));
  assert.equal(scoreLine([...events,...events,...events]).secondary,scoreLine(events).secondary);
 }
 assert.equal(scoreLine([{kind:'contact',point:{x:0,y:999,z:190},freeSeconds:1000,separation:9999},{kind:'termination',reason:'safety-timeout'}]).total,0);
 const token={kind:'token',surface:'sky'};assert.equal(scoreLine([token,token,token]).secondary,0);
 assert.equal(scoreLine([redirect('box'),{kind:'rejected',feature:'box',reason:'feature-already-scored'}]).secondary,0);
 const custom=scoreLine([redirect('x'),redirect('y')],PLACEHOLDER_RULES.map(r=>({...r,points:1})),{pointsPerAdditionalClaim:2,cap:3});assert.equal(custom.total,4);
});
test('Saw Bay is additive, inside the existing yard, and has clear address sightlines to the saw from all rails',()=>{
 assert.equal(COURTYARD_HOLES.length,3);assert.deepEqual(Object.keys(YARD_STATIONS),['gate','lumber']);
 assert.deepEqual(LINE_CARDS.slice(0,3),COURTYARD_HOLES);assert.equal(LINE_STATIONS.gate,YARD_STATIONS.gate);assert.equal(LINE_STATIONS.lumber,YARD_STATIONS.lumber);
 assert.equal(OPEN_LINE.target,null);assert.equal(OPEN_LINE.mode,'score-only');assert.equal(OPEN_LINE.station,SAW_BAY);
 assert.equal(OPEN_LINE.courseWidth,COURTYARD_HOLES[0].courseWidth);assert.equal(OPEN_LINE.courseLength,COURTYARD_HOLES[0].courseLength);
 const h=diverterHarness(hv,'A',true,OPEN_LINE,{scoreLab:true});try{
  const saw=h.scene.getMeshByName('courtyard-saw');assert.ok(saw);
  for(const railIndex of [0,1,2]){
   const shot={...OPEN_LINE.defaultShot,railIndex,charge:.5},m=stationMuzzle(shot,SAW_BAY),v=new Vector3(m.x,m.y,m.z);
   assert.ok(Math.abs(m.x)<50&&m.z<198);assert.notDeepEqual(m,stationMuzzle(shot,YARD_STATIONS.lumber));
   const end=saw.position.clone(),direction=end.subtract(v);const hit=h.scene.pickWithRay(new Ray(v,direction.normalize(),Vector3.Distance(v,end)),mesh=>Boolean(mesh.physicsBody));
   assert.ok(hit?.hit&&(hit.pickedMesh===saw||hit.pickedMesh.name.includes('saw-carriage')),hit?.pickedMesh?.name);
   const r=h.shoot(shot);assert.equal(r.outcome,'line-ended');assert.ok(r.ledger.some(e=>e.kind==='ruling'&&!e.targetHit));
   assert.ok(!scoreLine(r.ledger).claimIds.includes('seat'));
  }
  const lively=h.shoot({railIndex:0,yaw:35,elevation:10,charge:.6});assert.ok(scoreLine(lively.ledger).total>800);assert.equal(lively.outcome,'line-ended');
  assert.equal(h.scene.meshes.filter(m=>m.name.startsWith('diverter-')).length,0);
 }finally{h.dispose();}
});
test('Open Line recalls and shares the real Saw Bay transform/exact speed without auto-fire, with forensic receipt intact',()=>{
 const shot={railIndex:0,yaw:35,elevation:5,charge:1},h=diverterHarness(hv,'A',true,OPEN_LINE,{scoreLab:true});try{
  const first=h.shoot(shot);h.action('retry');const second=h.shoot(shot);assert.deepEqual(second.ledger,first.ledger);
  const line=packLine({...shot,build:'2f22edf846',holeId:OPEN_LINE.id,stationId:'saw',windId:OPEN_LINE.wind.id,projectileId:1,outcome:null,receipt:'LINE BANKED',points:[],contacts:[],environment:{floor:'A'},environmentAfter:{floor:'A'},ledger:first.ledger,lineReceipt:recordLineReceipt(first.ledger)});
  const shelf=collectLine(undefined,line);assert.equal(shelf.wins.length,0);assert.equal(shelf.recent.length,1);
  const loaded=normalizeShotLibrary({version:1,holes:{'open-line':shelf}},LINE_CARDS,{environmentRequired:true})['open-line'].recent[0];assert.deepEqual(loaded.lineReceipt,line.lineReceipt);
  assert.equal(loaded.lineReceipt.ending,'ground-contact');assert.ok(loaded.lineReceipt.claimIds.includes('saw-mill'));assert.equal(loaded.lineReceipt.uniqueFeatureCount,2);
  const address=resolveOpeningAddress(OPEN_LINE,null,{restore:true,memory:loaded});assert.deepEqual({railIndex:address.railIndex,yaw:address.yaw,elevation:address.elevation},{railIndex:shot.railIndex,yaw:shot.yaw,elevation:shot.elevation});
  const shared={v:1,build:line.build,world:'timber-courtyard',route:'/lab/lines',card:'open-line',station:'saw',rail:shot.railIndex,yaw:shot.yaw,elevation:shot.elevation,speed:chargeToSpeed(shot.charge),environment:{floor:'A'}};
  const restored=restoreShareLine(decodeShareLine(encodeShareLine(shared)),line.build);assert.equal(restored.autoFire,false);assert.equal(restored.station,'saw');assert.equal(restored.setup.charge,shot.charge);
  assert.deepEqual(stationMuzzle(restored.setup,LINE_STATIONS[restored.station]),stationMuzzle(shot,SAW_BAY));
  assert.deepEqual(h.shoot(restored.setup).ledger,first.ledger);assert.throws(()=>encodeShareLine({...shared,station:'gate'}));
 }finally{h.dispose();}
});
test('real saw→mill lines establish a directed named relationship without altering generic redirects',()=>{
 const h=diverterHarness(hv,'A',true,OPEN_LINE,{scoreLab:true});try{
  for(const shot of [{railIndex:0,yaw:35,elevation:5,charge:1},{railIndex:0,yaw:35,elevation:20,charge:.4},{railIndex:1,yaw:25,elevation:10,charge:.8}]){
   const r=h.shoot(shot),receipt=scoreLine(r.ledger),relationship=r.ledger.find(e=>e.kind==='relationship');assert.ok(relationship,JSON.stringify(r.ledger));
   assert.equal(receipt.awards.find(a=>a.id==='saw-mill').points,250);assert.ok(relationship.members.some(x=>x.startsWith('saw-')));assert.ok(relationship.members.some(x=>x.startsWith('mill-')));
   assert.ok(relationship.freeSeconds>=.1&&relationship.separation>=1);assert.equal(scoreLine([...r.ledger,...r.ledger]).total,receipt.total);
  }
 }finally{h.dispose();}
});
test('local saw relationship requires direction, energetic contacts, short episodes, and free departure; no generic gate weakening',()=>{
 const saw={id:'saw',kind:'saw',assembly:'saw',label:'saw'},mill={id:'mill',kind:'mill',label:'mill'},p={x:0,y:5,z:0},vin={x:-12,y:-4,z:0},bounce={x:-10,y:5,z:0},out={x:8,y:4,z:0};
 function contact(t,f,time,input,output){t.beginStep(input,time);t.contact(f,f?.id??'ground',p);return t.endStep(p,output,time+.008);}
 function finish(t,time=.22){t.beginStep(out,time);return t.endStep({x:2,y:6,z:0},out,time+.008);}
 const t=createSawMillTracker(),common=createRedirectTracker();for(const tracker of [t,common]){contact(tracker,saw,0,vin,bounce);contact(tracker,mill,.06,bounce,out);}
 assert.equal(finish(t).surface,'saw-mill');assert.equal(finish(common).feature,'mill');assert.ok(common.drainDiagnostics().some(e=>e.reason==='interrupted-before-free-flight'));
 contact(t,saw,1,vin,bounce);contact(t,mill,1.06,bounce,out);assert.equal(finish(t,1.22),null);
 const reverse=createSawMillTracker();contact(reverse,mill,0,vin,bounce);contact(reverse,saw,.06,bounce,out);assert.equal(finish(reverse),null);
 const interrupted=createSawMillTracker();contact(interrupted,saw,0,vin,bounce);contact(interrupted,mill,.06,bounce,out);contact(interrupted,undefined,.1,out,out);assert.equal(finish(interrupted),null);
 const scrape=createSawMillTracker();for(let i=0;i<60;i++)contact(scrape,saw,i/120,vin,bounce);contact(scrape,mill,.51,bounce,out);assert.equal(finish(scrape,.7),null);
 const brush=createSawMillTracker();contact(brush,saw,0,vin,vin);contact(brush,mill,.06,vin,out);assert.equal(finish(brush),null);
 const noDeparture=createSawMillTracker();contact(noDeparture,saw,0,vin,bounce);contact(noDeparture,mill,.06,bounce,out);noDeparture.beginStep(out,.22);assert.equal(noDeparture.endStep(p,out,.23),null);
});
