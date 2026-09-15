import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import Havok from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';import {selectOpenLineStation} from '../lib/line-lab.js';import {COURTYARD_HOLES} from '../lib/courtyard.js';import {scoreLine} from '../lib/line-score.js';import {REDIRECT_GATES} from '../lib/line-recognition.js';import {chargeToSpeed} from '../lib/rail-golf-v02.js';import {KICKER_PALLET} from '../lib/kicker-pallet.js';import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
// QA references only; no known solutions in normal game copy.
export const SURVEY_REFERENCES={
 bankZero:{railIndex:0,yaw:3,elevation:30.5,charge:1},
 skip:{railIndex:1,yaw:0,elevation:20,charge:(22+21*.65-6)/37},
 strict:{railIndex:1,yaw:0,elevation:30,charge:(22+21*.05-6)/37},
 treadNegative:{railIndex:1,yaw:-.5,elevation:30,charge:.655},
 cascade:{railIndex:1,yaw:0,elevation:34.5,charge:.3775},
 // Supplied rounded candidate retained, NOT claimed to reproduce Charlie's 1350 line.
 gateCandidate:{railIndex:0,yaw:23.6,elevation:21.2,charge:1},
 switchGate:{railIndex:1,yaw:-48.1,elevation:20,charge:.67},
 palletGate:{railIndex:1,yaw:-38,elevation:24,charge:.5},
 palletLumber:{railIndex:1,yaw:23,elevation:20,charge:.75},
};
test('Lumber bank-zero is a real shallow top-edge glance, not bookkeeping loss: unchanged 25-degree gate',()=>{
 const h=diverterHarness(hv,'A',true,selectOpenLineStation('lumber'),{scoreLab:true});try{for(let i=0;i<3;i++){
  const r=h.shoot(SURVEY_REFERENCES.bankZero),reject=r.ledger.find(e=>e.kind==='rejected'&&e.feature==='bank-b');assert.equal(scoreLine(r.ledger).total,0);
  assert.ok(r.ledger.some(e=>e.kind==='contact'&&e.feature==='bank-b'));assert.equal(reject.reason,'turn-too-small');assert.ok(reject.turn>8&&reject.turn<8.3);assert.ok(reject.separation>4);assert.ok(reject.freeSeconds>=REDIRECT_GATES.freeSeconds);
 }}finally{h.dispose();}
});
test('shared real Havok calibrates Skip, strict TREAD positive, broader CASCADE, and negative tread probe without changing baseline receipts',()=>{
 for(const [name,hole,claim,outcome] of [['skip',COURTYARD_HOLES[0],'skip','ace'],['strict',COURTYARD_HOLES[2],'treads','double'],['cascade',selectOpenLineStation('lumber'),'cascade-line','line-ended'],['treadNegative',COURTYARD_HOLES[2],'seat','ace']]){
  let baseline;
  for(const kicker of [false,true]){const h=diverterHarness(hv,'A',true,hole,{scoreLab:true,kicker});try{const r=h.shoot(SURVEY_REFERENCES[name]),receipt=scoreLine(r.ledger);assert.ok(receipt.claimIds.includes(claim));assert.equal(r.outcome,outcome);if(baseline)assert.deepEqual(receipt,baseline);else baseline=receipt;
   if(name==='treadNegative'){assert.ok(!receipt.claimIds.includes('treads'));assert.ok(r.ledger.some(e=>e.kind==='redirect'&&e.label==='TREAD SIDE REJECT'));}
   if(name==='strict')assert.equal(receipt.awards.find(a=>a.id==='treads').points,600);
   if(name==='cascade'){assert.ok(!receipt.claimIds.includes('treads'));assert.equal(receipt.awards.find(a=>a.id==='cascade-line').points,400);}
  }finally{h.dispose();}}
 }
});
test('rounded Gate candidate stays unchanged by the pallet overlay; no false assertion that 1350 was reproduced',()=>{
 const results=[];for(const kicker of [false,true]){const h=diverterHarness(hv,'A',true,selectOpenLineStation('gate'),{scoreLab:true,kicker});try{results.push(h.shoot(SURVEY_REFERENCES.gateCandidate));}finally{h.dispose();}}
 assert.deepEqual(results[0],results[1]);assert.equal(scoreLine(results[1].ledger).total,150);assert.ok(!scoreLine(results[1].ledger).claimIds.includes('sky'));
});
test('pallet is one real two-state static body; actual switch A↔B contact, retry/card/station persistence, reset and share restoration',()=>{
 const h=diverterHarness(hv,'A',true,selectOpenLineStation('gate'),{scoreLab:true});try{
  const firstBody=h.world.floorBody;assert.equal(h.world.floor.rotation.z,0);assert.equal(h.world.floor.position.x,KICKER_PALLET.x);
  for(const state of ['B','A']){const r=h.shoot(SURVEY_REFERENCES.switchGate,{stopOnSwitch:true});assert.equal(r.end,state);assert.ok(r.contacts.some(c=>c.kind==='switch-'+state.toLowerCase()&&c.body==='kicker-switch'));assert.equal(r.ledger.filter(e=>e.kind==='switch-use').length,1);}
  assert.notEqual(h.world.floorBody,firstBody);
  h.action('recall',{floor:'B'});assert.ok(Math.abs(h.world.floor.rotationQuaternion.toEulerAngles().z+Math.PI/10)<1e-6);assert.equal(h.world.floor.position.y,KICKER_PALLET.y+1.53);
  for(const action of ['retry','card','station']){const body=h.world.floorBody;h.action(action);assert.equal(h.world.state,'B');assert.equal(h.world.floorBody,body);}
  const payload={v:1,build:'5d6a715',world:'timber-courtyard',route:'/lab/lines',card:'open-line',station:'lumber',rail:1,yaw:23,elevation:20,speed:chargeToSpeed(.75),environment:{floor:'B'}};
  h.action('reset');assert.equal(h.world.state,'A');const restored=restoreShareLine(decodeShareLine(encodeShareLine(payload)),'abcdef0');h.action('recall',restored.environment);assert.equal(h.world.state,'B');assert.equal(restored.autoFire,false);assert.ok(restored.warning);
  assert.equal(h.scene.meshes.filter(m=>m.name==='kicker-bounce-floor').length,1);assert.equal(h.world.targetBody,null);
 }finally{h.dispose();}
});
test('pallet qualifies from BOTH established stations in BOTH states; angle changes real departure, COMMON pays once, original Skip remains shared',()=>{
 for(const station of ['gate','lumber']){const h=diverterHarness(hv,'A',true,selectOpenLineStation(station),{scoreLab:true});try{const departures=[];
  for(const state of ['A','B']){h.action('recall',{floor:state});const shot=station==='gate'?SURVEY_REFERENCES.palletGate:SURVEY_REFERENCES.palletLumber;const r=h.shoot(shot),receipt=scoreLine(r.ledger),e=r.ledger.find(e=>e.kind==='redirect'&&e.feature==='kicker-pallet');
   assert.ok(e);assert.ok(r.ledger.some(raw=>raw.kind==='contact'&&raw.body===e.body));assert.equal(receipt.awards.filter(a=>a.id==='common:kicker-pallet').length,1);assert.equal(receipt.awards.find(a=>a.id==='common:kicker-pallet').points,100);departures.push(e.outgoing);
   if(station==='lumber')assert.equal(receipt.awards.filter(a=>a.id==='skip').length,1);
   h.action('retry');assert.deepEqual(h.shoot(shot).ledger,r.ledger);
  }assert.notDeepEqual(departures[0],departures[1]);
 }finally{h.dispose();}}
});
