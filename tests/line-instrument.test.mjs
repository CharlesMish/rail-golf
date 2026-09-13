import test from 'node:test';import assert from 'node:assert/strict';
import {PLACEHOLDER_RULES,appendLineEvidence,scoreLine,normalizeLineEvidence} from '../lib/line-score.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
import {chargeToSpeed} from '../lib/rail-golf-v02.js';
import {floorForAction} from '../lib/diverter-lab.js';
import {packLine,normalizeShotLibrary} from '../lib/shot-library.js';
import {COURTYARD_HOLES} from '../lib/courtyard.js';
const contact=surface=>({kind:'contact',surface,body:'physical-'+surface,point:{x:1,y:2,z:3}});
const redirect=surface=>({...contact(surface),kind:'redirect',feature:surface,label:surface,incoming:{x:10,y:-5,z:0},outgoing:{x:-10,y:5,z:0},turn:180,freeSeconds:.15,separation:2});
const ledger=[contact('mill'),redirect('bank-a'),redirect('bank-b'),redirect('step-a'),redirect('step-b'),redirect('step-c'),{kind:'pad-activation'},{kind:'switch-use',state:'B'},{kind:'ruling',targetHit:true}];
const share={v:1,build:'77d4016ca4',world:'timber-courtyard',route:'/lab/lines',card:'mill-delivery',station:'gate',rail:1,yaw:-4.125,elevation:44.375,speed:33.123456789,environment:{floor:'B'}};

test('placeholder receipts are deterministic and independent of the source ledger',()=>{
 const before=JSON.stringify(ledger),a=scoreLine(ledger),b=scoreLine(JSON.parse(before));
 assert.deepEqual(a,b);assert.equal(a.total,2800);assert.equal(a.awards.length,10);assert.equal(JSON.stringify(ledger),before);
 assert.equal(a.nonCanonical,true);assert.equal(a.ignored[0].index,0);
 const changed=PLACEHOLDER_RULES.map(r=>({...r,points:1}));assert.equal(scoreLine(ledger,changed,{pointsPerAdditionalClaim:0,cap:0}).total,10);
});
test('raw roof, floor and switch touches never score; chatter and repeated qualified families cannot farm',()=>{
 const chatter=[];for(let i=0;i<1000;i++)appendLineEvidence(chatter,contact('mill'));
 assert.equal(chatter.length,1);assert.equal(chatter[0].count,1000);assert.equal(scoreLine(chatter).total,0);
 assert.equal(scoreLine([contact('floor-b'),contact('switch-b')]).total,0);
 assert.equal(scoreLine([...ledger,...ledger,...ledger]).total,2800);
 assert.equal(scoreLine([contact('bank-b'),contact('bank-a'),contact('step-c'),contact('step-b'),contact('step-a')]).total,0);
 assert.equal(scoreLine([{kind:'ruling',targetHit:false}]).total,0);
 assert.deepEqual(normalizeLineEvidence([{kind:'contact',count:Infinity}]),[]);
 assert.deepEqual(normalizeLineEvidence([{kind:'contact',point:{x:0,y:NaN,z:0}}]),[]);
});
test('ShareLineV1 round trips exact speed and setup without trajectories, score claims or auto fire',()=>{
 for(const [card,station]of [['mill-delivery','gate'],['switchback-gallery','gate'],['lumber-cascade','lumber']])for(const floor of ['A','B']){
  const value={...share,card,station,environment:{floor}},encoded=encodeShareLine(value);
  assert.ok(encoded.length<650);const decoded=decodeShareLine(encoded);assert.deepEqual(decoded,value);
  const restored=restoreShareLine(decoded,share.build);
  assert.equal(restored.autoFire,false);assert.equal(restored.powerMode,'set');assert.equal(restored.warning,'');
  assert.ok(Math.abs(chargeToSpeed(restored.setup.charge)-value.speed)<1e-12);
  assert.equal(floorForAction('A','recall',restored.environment),floor);
 }
 const dock={...share,route:'/lab/courtyard-diverter',card:'courtyard-diverter'};
 assert.deepEqual(decodeShareLine(encodeShareLine(dock)),dock);
});
test('malformed and incompatible share payloads fail closed',()=>{
 for(const change of [{v:2},{world:'another-world'},{route:'https://evil.example'},{card:'__proto__'},{station:'lumber'},{rail:3},{yaw:Infinity},{yaw:71},{elevation:4},{speed:100},{environment:{floor:'C'}},{environment:{}},{build:'<script>'},{samples:[]},{score:9999}])assert.throws(()=>encodeShareLine({...share,...change}));
 for(const encoded of ['', '***', 'a'.repeat(2049), btoa('{}'),encodeShareLine(share)+'='])assert.throws(()=>decodeShareLine(encoded));
});
test('build mismatch and unknown provenance warn without silently changing the shared setup',()=>{
 const restored=restoreShareLine(share,'different');assert.match(restored.warning,/Exact physical replay is not guaranteed/);assert.equal(restored.setup.yaw,share.yaw);
 assert.match(restoreShareLine({...share,build:'unknown'},'unknown').warning,/not guaranteed/);
 assert.match(restoreShareLine({...share,build:'77d4016ca4-dirty'},share.build).warning,/not guaranteed/);
});
test('lab saved evidence persists independently of production records and rejects missing lab environment',()=>{
 const hole=COURTYARD_HOLES[0],line=packLine({railIndex:1,yaw:0,elevation:42,charge:.9,holeId:hole.id,stationId:'gate',windId:hole.wind.id,projectileId:1,outcome:'ace',receipt:'Local line',points:[],contacts:[],build:share.build,ledger,environment:{floor:'B'},environmentAfter:{floor:'A'}});
 const data={version:1,holes:{[hole.id]:{recent:[line],wins:[line]}}};
 const lab=normalizeShotLibrary(JSON.parse(JSON.stringify(data)),COURTYARD_HOLES,{environmentRequired:true})[hole.id].wins[0];
 assert.equal(lab.environment.floor,'B');assert.equal(lab.environmentAfter.floor,'A');assert.equal(lab.build,share.build);assert.equal(scoreLine(lab.ledger).total,2800);
 const production=normalizeShotLibrary(data,COURTYARD_HOLES)[hole.id].wins[0];assert.equal(production.environment,undefined);assert.equal(production.ledger,undefined);
 data.holes[hole.id].recent[0]={...line,environment:undefined};assert.equal(normalizeShotLibrary(data,COURTYARD_HOLES,{environmentRequired:true})[hole.id].recent.length,0);
});
