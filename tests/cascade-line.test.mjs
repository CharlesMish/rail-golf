import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {scoreLine,cascadeAssembly,PLACEHOLDER_RULES,normalizeLineEvidence} from '../lib/line-score.js';
import {createRedirectTracker,REDIRECT_GATES} from '../lib/line-recognition.js';
import {createRunTracker,RUN_RULE} from '../lib/line-run.js';
import {CASCADE_STEPS} from '../lib/lumber-cascade.js';
import {COURTYARD_HOLES} from '../lib/courtyard.js';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const vin={x:0,y:-12,z:-10},vout={x:0,y:10,z:-8};
function redirect(tracker,step,side=false,t=0,support=false){
 const id=support?`${step.id}-stack:${step.x}:${step.z}`:step.id;
 const f={id,kind:side?'lumber':step.id,label:side?'TREAD SIDE REJECT':'TREAD KICK',assembly:`lumber:${step.x}:${step.z}`};
 const p={x:step.x,y:side?step.top-.5:step.top,z:step.z};
 tracker.beginStep(vin,t);tracker.contact(f,id,p);tracker.endStep(p,vout,t+1/120);
 tracker.beginStep(vout,t+.15);return tracker.endStep({x:p.x,y:p.y+2,z:p.z-2},vout,t+.16);
}
test('CASCADE LINE requires distinct qualified assemblies in order; raw/chatter/wrong-order cannot qualify',()=>{
 const tracker=createRedirectTracker(),events=CASCADE_STEPS.map((s,i)=>redirect(tracker,s,i===1,i));
 const r=scoreLine(events);assert.equal(r.awards.find(a=>a.id==='cascade-line').points,400);assert.ok(!r.claimIds.includes('treads'));
 assert.equal(r.awards.filter(a=>a.tier==='COMMON').length,3);assert.equal(r.secondary,150);
 assert.equal(scoreLine([...events,...events,...events]).total,r.total);
 assert.ok(!scoreLine([events[0],events[2],events[1]]).claimIds.includes('cascade-line'));
 assert.ok(!scoreLine([events[1],events[0],events[1],events[2]]).claimIds.includes('cascade-line'));
 assert.ok(!scoreLine(events.map(e=>({...e,kind:'contact',count:1000}))).claimIds.includes('cascade-line'));
 assert.ok(!scoreLine(events.map(e=>({...e,kind:'rejected'}))).claimIds.includes('cascade-line'));
 assert.equal(scoreLine(normalizeLineEvidence(events)).total,r.total);
 const support=redirect(createRedirectTracker(),CASCADE_STEPS[1],true,0,true);assert.equal(cascadeAssembly(support),'step-b');
 const sameAssembly=[events[0],support,events[1]];assert.ok(!scoreLine(sameAssembly).claimIds.includes('cascade-line'));
 const chatter=createRedirectTracker(),s=CASCADE_STEPS[1],p={x:s.x,y:s.top,z:s.z};
 for(let i=0;i<120;i++){chatter.beginStep(vin,i/120);chatter.contact({id:s.id,kind:'lumber',label:'TREAD SIDE REJECT'},s.id,p);chatter.endStep(p,vout,(i+1)/120);}
 chatter.beginStep(vout,1.2);assert.equal(chatter.endStep({x:p.x,y:p.y+3,z:p.z-3},vout,1.21),null);
 assert.ok(chatter.drainDiagnostics().some(e=>e.reason==='contact-too-long'));
 assert.equal(REDIRECT_GATES.minTurnDegrees,25);assert.equal(REDIRECT_GATES.maxContactSeconds,.12);
});
test('strict TREAD RUN stays 600 and supersedes the broader 400-point caption for the same top/top/top traverse',()=>{
 const t=createRedirectTracker(),events=CASCADE_STEPS.map((s,i)=>redirect(t,s,false,i));const r=scoreLine(events);
 assert.equal(r.awards.find(a=>a.id==='treads').points,600);assert.ok(!r.claimIds.includes('cascade-line'));assert.equal(r.secondary,150);
 const supports=CASCADE_STEPS.map((s,i)=>redirect(createRedirectTracker(),s,true,i,true));
 const separateTraversals=scoreLine([...supports,...events]);assert.ok(separateTraversals.claimIds.includes('cascade-line')&&separateTraversals.claimIds.includes('treads')); // Different actual departures, not double payment for one traverse.
 const custom=PLACEHOLDER_RULES.map(r=>r.id==='cascade-line'?{...r,points:375}:r);
 const side=[events[0],{...events[1],surface:'lumber'},events[2]];assert.equal(scoreLine(side,custom).awards.find(a=>a.id==='cascade-line').points,375);
});
test('267 m after a genuine qualified departure reaches RUN 250; it caps at 200 eligible metres with no initial arc or time reward',()=>{
 const e=redirect(createRedirectTracker(),CASCADE_STEPS[0]),t=createRunTracker(),hasClaim=scoreLine([e]).awards.some(a=>a.tier!=='FINISH');
 t.beginStep();t.step({x:0,y:20,z:0},vout,0,false);
 t.beginStep();t.step({x:0,y:20,z:1000},vout,1,false);assert.equal(t.snapshot(),null);
 t.beginStep();t.step({x:0,y:20,z:1000},vout,2,hasClaim);
 for(const distance of [19.99,20,199.99,200,267,300]){t.beginStep();t.step({x:0,y:20,z:1000+distance},vout,2+distance/10,true);assert.equal(scoreLine([e,t.snapshot()]).run,Math.min(250,Math.floor(distance/20)*25));}
 t.beginStep();t.step({x:0,y:20,z:1300},vout,10000,true);assert.equal(t.snapshot().distance,300);
 assert.equal(RUN_RULE.cap,250);assert.equal(RUN_RULE.metresPerStep,20);
});
test('real full-power empty lob banks no RUN; strict physical Cascade fixture retains its production stamp and 600 claim',()=>{
 const open=diverterHarness(hv,'A',true,selectOpenLineStation('gate'),{scoreLab:true});try{
  const lob=open.shoot({railIndex:1,yaw:0,elevation:85,charge:1});assert.equal(scoreLine(lob.ledger).run,0);assert.equal(scoreLine(lob.ledger).awards.length,0);
 }finally{open.dispose();}
 const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[2],{scoreLab:true});try{
  const shot={railIndex:1,yaw:0,elevation:30,charge:(22+21*.05-6)/37};const r=h.shoot(shot);
  assert.equal(r.outcome,'double');assert.deepEqual(r.tags.filter(t=>t.startsWith('step-')),['step-a','step-b','step-c']);
  assert.equal(scoreLine(r.ledger).awards.find(a=>a.id==='treads').points,600);assert.ok(!scoreLine(r.ledger).claimIds.includes('cascade-line'));
 }finally{h.dispose();}
});
test('real Lumber Walk top→side→top departures earn CASCADE LINE once, with COMMON components and no false strict TREAD RUN',()=>{
 const h=diverterHarness(hv,'A',true,selectOpenLineStation('lumber'),{scoreLab:true});try{
  const shot={railIndex:1,yaw:0,elevation:34.5,charge:.3775};
  const first=h.shoot(shot),departures=first.ledger.filter(e=>cascadeAssembly(e)).slice(0,3);
  assert.deepEqual(departures.map(e=>cascadeAssembly(e)),['step-a','step-b','step-c']);
  assert.deepEqual(departures.map(e=>e.surface),['step-a','lumber','step-c']);
  assert.equal(departures[1].label,'TREAD SIDE REJECT');
  for(const e of departures){assert.ok(e.turn>=REDIRECT_GATES.minTurnDegrees&&e.freeSeconds>=REDIRECT_GATES.freeSeconds&&e.separation>=REDIRECT_GATES.minSeparation);assert.ok(first.ledger.some(raw=>raw.kind==='contact'&&raw.body===e.body));}
  const receipt=scoreLine(first.ledger);assert.equal(receipt.awards.filter(a=>a.id==='cascade-line').length,1);assert.equal(receipt.awards.find(a=>a.id==='cascade-line').points,400);assert.ok(!receipt.claimIds.includes('treads'));
  for(const e of departures)assert.ok(receipt.claimIds.includes('common:'+e.feature));
  h.action('retry');assert.deepEqual(h.shoot(shot).ledger,first.ledger);
 }finally{h.dispose();}
});
