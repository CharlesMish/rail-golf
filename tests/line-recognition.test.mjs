import test from 'node:test';import assert from 'node:assert/strict';
import {createRedirectTracker,REDIRECT_GATES,redirectFeature,collectLineStepEvents} from '../lib/line-recognition.js';
import {scoreLine,PLACEHOLDER_RULES,appendLineEvidence,normalizeLineEvidence} from '../lib/line-score.js';
import {COURTYARD_HOLES} from '../lib/courtyard.js';
const feature={id:'bank-a',kind:'bank-a',label:'BANK A REJECT'};
const p={x:0,y:5,z:0},incoming={x:12,y:-3,z:0},outgoing={x:-10,y:4,z:0};
function rebound(tracker=createRedirectTracker(),f=feature,t=0){
 tracker.beginStep(incoming,t);tracker.contact(f,f.id,p);tracker.endStep(p,outgoing,t+1/120);
 tracker.beginStep(outgoing,t+.15);return tracker.endStep({x:-2,y:6,z:0},outgoing,t+.16);
}
test('a real redirect candidate needs speed, turn and a new contact-free leg; one feature pays once',()=>{
 const tracker=createRedirectTracker(),e=rebound(tracker);assert.equal(e.kind,'redirect');assert.equal(scoreLine([e]).total,100);
 assert.equal(rebound(tracker,feature,1),null);assert.equal(scoreLine([e,e,e]).total,100);
 assert.deepEqual(normalizeLineEvidence([e])[0].incoming,incoming);
 assert.equal(rebound(createRedirectTracker({...REDIRECT_GATES,minIncomingSpeed:100})),null);
 assert.equal(rebound(createRedirectTracker({...REDIRECT_GATES,minTurnDegrees:180})),null);
 assert.equal(rebound(createRedirectTracker({...REDIRECT_GATES,minSeparation:10})),null);
});
test('three seconds of roof/wall chatter, tangential separation and settling rattle earn no redirects',()=>{
 for(const f of [{id:'roof',kind:'mill',label:'MILL ROOF REBOUND'},{id:'wall',kind:'mill',label:'MILL WALL REJECT'}]){
  const tracker=createRedirectTracker(),ledger=[];
  for(let i=0;i<360;i++){
   tracker.beginStep(incoming,i/120);tracker.contact(f,f.id,p);
   appendLineEvidence(ledger,{kind:'contact',body:f.id,surface:'mill'});
   assert.equal(tracker.endStep(p,outgoing,(i+1)/120),null);
  }
  tracker.beginStep(outgoing,3.2);assert.equal(tracker.endStep({x:-3,y:6,z:0},outgoing,3.21),null);
  assert.equal(ledger[0].count,360);assert.equal(scoreLine(ledger).total,0);
 }
 const tangent=createRedirectTracker();tangent.beginStep(incoming,0);tangent.contact(feature,'bank-a',p);tangent.endStep(p,incoming,.01);tangent.beginStep(incoming,.2);assert.equal(tangent.endStep({x:4,y:5,z:0},incoming,.21),null);
 const slow=createRedirectTracker();slow.beginStep({x:1,y:-.3,z:0},0);slow.contact(feature,'bank-a',p);slow.endStep(p,{x:-1,y:.3,z:0},.01);slow.beginStep(outgoing,.2);assert.equal(slow.endStep({x:-2,y:6,z:0},outgoing,.21),null);
});
test('unrecognized contact interrupts separation and remains unscored; side hits cannot forge tread signatures',()=>{
 const t=createRedirectTracker();t.beginStep(incoming,0);t.contact(feature,'bank-a',p);t.endStep(p,outgoing,.01);
 t.beginStep(outgoing,.05);t.contact(undefined,'anonymous',p);assert.equal(t.endStep({x:-3,y:6,z:0},outgoing,.2),null);
 assert.equal(scoreLine([{kind:'contact',body:'anonymous',surface:'other-solid'}]).ignored.length,1);
 const side=redirectFeature({metadata:{cascadeStep:'step-a',lineFeature:{id:'step-a',kind:'step-a',label:'TREAD 1 KICK'}}},{x:22,y:7,z:122});assert.equal(side.kind,'lumber');
});
test('single banks and components coexist with ordered sequences without callback farming',()=>{
 const a=rebound(),b=rebound(createRedirectTracker(),{...feature,id:'bank-b',kind:'bank-b'});
 assert.deepEqual(scoreLine([a]).awards.map(a=>a.id),['common:bank-a']);
 assert.ok(scoreLine([a,b]).awards.some(a=>a.id==='banks'));
 assert.ok(!scoreLine([b,a]).awards.some(a=>a.id==='banks'));
 const steps=['step-a','step-b','step-c'].map(kind=>rebound(createRedirectTracker(),{id:kind,kind,label:'TREAD KICK'}));
 assert.ok(scoreLine(steps).awards.some(a=>a.id==='treads'));
 assert.equal(scoreLine([...steps,...steps]).total,scoreLine(steps).total);
 assert.equal(scoreLine([a,b],PLACEHOLDER_RULES.map(r=>({...r,points:1})),{pointsPerAdditionalClaim:0,cap:0}).total,3);
});
test('Sky and Skip are named once, miss claims cash out, and provisional qualitative inequalities hold',()=>{
 const sky={kind:'token',surface:'sky'},skip={kind:'pad-activation'};
 assert.equal(scoreLine([sky,sky,sky]).total,250);assert.equal(scoreLine([skip,skip,skip]).total,250);
 assert.equal(scoreLine([{kind:'contact',surface:'skip-pad'}]).total,0);
 const direct=[{kind:'ruling',targetHit:true}];
 const interesting=['bank-a','bank-b','step-a','step-b','step-c'].map(kind=>rebound(createRedirectTracker(),{id:kind,kind,label:kind}));
 assert.ok(scoreLine(direct).total>scoreLine([]).total);
 assert.ok(scoreLine(interesting).total>scoreLine(direct).total);
 assert.ok(scoreLine([...interesting,...direct]).total>scoreLine(interesting).total);
 assert.equal(scoreLine([{kind:'contact',body:'roof',count:10000}]).total,0);
});
test('Sky swept volume works backwards and forwards from every lab objective without adding tokens',()=>{
 for(const hole of COURTYARD_HOLES)for(const [start,end]of [[{x:0,y:40,z:100},{x:0,y:40,z:120}],[{x:0,y:40,z:120},{x:0,y:40,z:100}]]){
  assert.equal(collectLineStepEvents(start,end,hole).filter(e=>e.kind==='sky').length,1);
  assert.equal(collectLineStepEvents(start,end,hole,[],['sky']).filter(e=>e.kind==='sky').length,0);
 }
});

test('Mill Return requires a genuine horizontal reversal; Mill Route requires a later finish',()=>{
 const mill=rebound(createRedirectTracker(),{id:'mill-wall',kind:'mill',label:'MILL WALL REJECT'});
 assert.ok(scoreLine([mill]).awards.some(a=>a.id==='return'));
 assert.ok(!scoreLine([mill]).awards.some(a=>a.id==='mill'));
 assert.ok(scoreLine([mill,{kind:'ruling',targetHit:true}]).awards.some(a=>a.id==='mill'));
 assert.equal(scoreLine([mill,mill]).total,scoreLine([mill]).total);
 const side={...mill,outgoing:{x:0,y:4,z:10}};
 assert.ok(!scoreLine([side]).awards.some(a=>a.id==='return'));
 assert.equal(scoreLine([{kind:'contact',surface:'mill'}]).total,0);
});
