import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {createRedirectTracker} from '../lib/line-recognition.js';import {scoreLine,normalizeLineEvidence} from '../lib/line-score.js';
import {createLineLifecycle} from '../lib/line-lifecycle.js';import {COURTYARD_HOLES} from '../lib/courtyard.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const setup={railIndex:1,yaw:0,elevation:42,charge:.93};
const point={x:0,y:5,z:0},vin={x:12,y:-3,z:0},vout={x:-10,y:4,z:0};
const chassis={id:'saw-carriage',kind:'carriage',label:'SAW CARRIAGE REJECT',assembly:'saw'},blade={id:'saw-blade',kind:'saw',label:'SAW BLADE REJECT',assembly:'saw'};
function hit(t,f,time=0){t.beginStep(vin,time);t.contact(f,f.id,point);t.endStep(point,vout,time+.008);}
function separate(t,time=.2){t.beginStep(vout,time);return t.endStep({x:-2,y:6,z:0},vout,time+.008);}

test('line safety separates spatial OOB, long moving flight, settling and timeout; claims survive termination',()=>{
 const life=createLineLifecycle();assert.equal(life.step({x:20,y:70,z:100},{x:0,y:-20,z:0},13.1),null);
 assert.equal(life.step({x:20,y:60,z:100},{x:0,y:-20,z:0},25),null);
 assert.equal(life.step({x:20,y:60,z:100},{x:0,y:-20,z:0},60),'safety-timeout');
 for(const p of [{x:51,y:10,z:100},{x:0,y:10,z:199},{x:0,y:-9,z:100}])assert.equal(createLineLifecycle().step(p,vin,2),'oob');
 const dead=createLineLifecycle();assert.equal(dead.step(point,{x:0,y:0,z:0},5),null);assert.equal(dead.step(point,{x:0,y:0,z:0},8),'dead-ball');
 const apex=createLineLifecycle();assert.equal(apex.step(point,{x:0,y:0,z:0},6),null);assert.equal(apex.step(point,{x:0,y:-3,z:0},7),null);
 const ledger=[{kind:'token',surface:'sky'},{kind:'termination',reason:'safety-timeout'}];assert.equal(scoreLine(ledger).total,250);assert.equal(scoreLine(ledger).awards.some(a=>a.id==='seat'),false);
});

test('coupled saw contacts earn one assembly claim; independent legs earn one per part without changing generic gates',()=>{
 const coupled=createRedirectTracker();hit(coupled,chassis);hit(coupled,blade,.03);const e=separate(coupled);assert.equal(e.feature,'saw-assembly');assert.equal(scoreLine([e]).total,100);
 hit(coupled,blade,1);assert.equal(separate(coupled,1.2),null);assert.ok(coupled.drainDiagnostics().some(e=>e.reason==='feature-already-scored'));
 const distinct=createRedirectTracker();hit(distinct,chassis);const a=separate(distinct);hit(distinct,blade,1);const b=separate(distinct,1.2);assert.equal(scoreLine([a,b,a,b]).total,200);
 const rattle=createRedirectTracker();for(let i=0;i<120;i++)hit(rattle,i%2?blade:chassis,i/120);assert.equal(separate(rattle,1.2),null);assert.ok(rattle.drainDiagnostics().some(e=>e.reason==='contact-too-long'));
 const unrelated=createRedirectTracker();hit(unrelated,{...chassis,assembly:undefined});hit(unrelated,{...blade,assembly:undefined},.03);assert.ok(unrelated.drainDiagnostics().some(e=>e.reason==='interrupted-before-free-flight'));
});

test('failed COMMON candidates retain reason codes and measurements without scoring',()=>{
 for(const [reason,incoming,outgoing]of [['incoming-speed-low',{x:1,y:0,z:0},vout],['outgoing-speed-low',vin,{x:-1,y:0,z:0}],['turn-too-small',vin,vin]]){
  const t=createRedirectTracker();t.beginStep(incoming,0);t.contact(chassis,chassis.id,point);t.endStep(point,outgoing,.008);t.beginStep(outgoing,.2);assert.equal(t.endStep({x:2,y:6,z:0},outgoing,.208),null);
  const diag=t.drainDiagnostics();assert.equal(diag[0].reason,reason);assert.equal(scoreLine(diag).total,0);assert.deepEqual(normalizeLineEvidence(diag)[0].incoming,incoming);
 }
 const t=createRedirectTracker();hit(t,chassis);t.beginStep(vout,.7);t.endStep(point,vout,.708);assert.equal(t.drainDiagnostics()[0].reason,'insufficient-separation');
 const ended=createRedirectTracker();hit(ended,chassis);ended.finish();assert.equal(ended.drainDiagnostics()[0].reason,'shot-ended-before-free-flight');
});

test('closed score-lab roof blocks the demonstrated cavity approaches; exterior routes survive',()=>{
 const approaches=[{position:[-35,16,65],velocity:[0,0,35]},{position:[-35,16,142],velocity:[0,0,-35]},
  {position:[-20,14,104],velocity:[-35,2,0]},{position:[-50,14,104],velocity:[35,2,0]}];
 const inside=p=>p.z>76&&p.z<132&&Math.abs(p.x+35)<9&&p.y>14.3&&p.y<17.4-.387*Math.abs(p.x+35);
 for(const launch of approaches){let interior=0,last=0;const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[0],{scoreLab:true});
  try{const r=h.shoot(setup,{launch,onStep(p,v,t){if(inside(p))interior++;last=t;}});assert.equal(interior,0);assert.ok(last<5);assert.ok(r.ledger.filter(e=>e.kind==='contact').reduce((n,e)=>n+e.count,0)<20);assert.ok(!scoreLine(r.ledger).awards.some(a=>a.id.includes('safety')));}finally{h.dispose();}
 }
 // Positive vulnerability control: frozen original geometry admits this approach.
 const old=diverterHarness(hv,'A',true);let entered=0;try{old.shoot(setup,{launch:approaches[0],onStep(p){if(inside(p))entered++;}});assert.ok(entered>0);}finally{old.dispose();}
 for(const yaw of [-16,-14,-12]){const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[0],{scoreLab:true});try{const r=h.shoot({...setup,yaw,elevation:65,charge:1});assert.equal(r.outcome,'ace');assert.ok(scoreLine(r.ledger).awards.some(a=>a.id==='mill'));}finally{h.dispose();}}
});

test('real blade, chassis and coupled assembly contacts are legible in the repaired yard',()=>{
 for(const [y,claim]of [[5.2,'common:saw-blade'],[1,'common:saw-carriage:-19.5:110'],[3,'common:saw-assembly']]){
  const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[0],{scoreLab:true});try{const r=h.shoot(setup,{launch:{position:[-12,y,110],velocity:[-25,0,0]}});const receipt=scoreLine(r.ledger);assert.ok(receipt.awards.some(a=>a.id===claim),JSON.stringify(receipt));assert.equal(receipt.total,100);}finally{h.dispose();}
 }
});

test('reverse Bank B→A has its own claim and survives a real Lumber Walk line; known fixtures remain',()=>{
 const fixtures=[
  [2,{railIndex:2,yaw:3,elevation:33,charge:.98},'banks-reverse'],
  [1,{railIndex:0,yaw:-1,elevation:25,charge:.93},'banks'],
  [2,{railIndex:1,yaw:0,elevation:30,charge:(22+21*.05-6)/37},'treads'],
  [0,setup,'direct'],
 ];
 for(const [card,shot,claim]of fixtures){const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[card],{scoreLab:true});try{const r=h.shoot(shot),receipt=scoreLine(r.ledger);assert.ok(receipt.awards.some(a=>a.id===claim));assert.equal(scoreLine([...r.ledger,...r.ledger]).total,receipt.total);}finally{h.dispose();}}
});

test('score yard has no diverter bodies, retains ordinary platform and high Cascade flight resolves normally',()=>{
 const h=diverterHarness(hv,'A',true,COURTYARD_HOLES[2],{scoreLab:true});let last=0;
 try{assert.equal(h.scene.meshes.some(m=>m.name.startsWith('diverter-')),false);assert.equal(h.scene.meshes.filter(m=>m.name.includes('loading-platform')).length,1);assert.equal(h.scene.getMeshByName('courtyard-roof-interior-safety').metadata.lineFeature,undefined);const r=h.shoot({...setup,elevation:85,charge:1},{onStep(p,v,t){last=t;}});assert.notEqual(r.outcome,'safety-timeout');assert.notEqual(r.outcome,'oob');assert.ok(last>5);assert.ok(!r.tags.some(t=>t.startsWith('switch')||t.startsWith('floor')));}finally{h.dispose();}
});
