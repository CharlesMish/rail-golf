import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {IDBFactory} from 'fake-indexeddb';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {buildTimberReceiver,TIMBER_RECEIVER} from '../lib/timber-receiver.js';
import {receiverStorage} from '../lib/timber-receiver-storage.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
import {createSurveyArchive,createSurveyLog} from '../lib/survey-ledger.js';
import {scoreLine} from '../lib/line-score.js';
const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
function harness(station='gate',enabled=true,state='A'){
 const h=diverterHarness(hv,state,true,selectOpenLineStation(station),{scoreLab:true}),extra=[];
 const overlay=enabled?buildTimberReceiver(h.scene,h.scene.getTransformNodeByName('lab'),Object.fromEntries(['timber','brick','machine'].map(k=>[k,h.scene.getMaterialByName('fixture')])),{addShadowCaster(){}},b=>extra.push(b)):null;
 return {...h,overlay,dispose(){for(const body of extra)body.dispose();h.dispose();}};
}
const features=r=>r.ledger.filter(e=>e.kind==='redirect').map(e=>e.feature);
const shot=(railIndex,yaw,elevation,charge)=>({railIndex,yaw,elevation,charge});

test('one ordinary static timber segment is the entire receiver physical overlay',()=>{
 const h=harness();try{
  assert.deepEqual(TIMBER_RECEIVER,{x:43,y:7,z:148,width:1.2,height:14,depth:26,yaw:-25});
  assert.equal(h.scene.meshes.filter(m=>m.name==='timber-receiver').length,1);
  assert.equal(h.overlay.body.body.getMassProperties().mass,0);
  assert.equal(h.overlay.body.shape.material.restitution,.86);
  assert.equal(h.overlay.body.shape.material.friction,.18);
  assert.equal(h.scene.meshes.filter(m=>m.name.startsWith('receiver-')&&m.physicsBody).length,0);
  const bounds=h.overlay.wall.getBoundingInfo().boundingBox;h.overlay.wall.computeWorldMatrix(true);
  assert.ok(bounds.minimumWorld.x>36&&bounds.maximumWorld.x<50);
  assert.ok(bounds.minimumWorld.z>135&&bounds.maximumWorld.z<161);
 }finally{h.dispose();}
});

test('Gate tread and lumber departures that were OOB return to the existing yard through real receiver contacts',()=>{
 for(const setup of [shot(0,17.5,20,1),shot(0,20,40,.8),shot(1,17.5,60,1)]){
  const old=harness('gate',false),next=harness('gate');
  try{
   const a=old.shoot(setup),b=next.shoot(setup);assert.equal(a.outcome,'oob');assert.equal(b.outcome,'line-ended');
   const claims=features(b);assert.ok(claims.indexOf('timber-receiver')>0);assert.ok(b.point[0]<40&&b.point[2]>135&&b.point[2]<170);
   const event=b.ledger.find(e=>e.kind==='redirect'&&e.feature==='timber-receiver');
   assert.equal(event.body,'timber-receiver');assert.ok(event.turn>=25&&event.freeSeconds>=.1&&event.separation>=1);
   const awarded=scoreLine(b.ledger).awards.filter(a=>a.id==='common:timber-receiver');assert.equal(awarded.length,1);assert.equal(awarded[0].points,100);
   assert.equal(scoreLine([...b.ledger,...b.ledger]).total,scoreLine(b.ledger).total);
  }finally{old.dispose();next.dispose();}
 }
});

test('Walk receiver departures reach distinct existing tread/lumber regions across rails and power',()=>{
 for(const [railIndex,charge]of [[0,.8],[1,.8],[2,.8],[1,1]]){
  const old=harness('lumber',false),next=harness('lumber');
  try{
   const setup=shot(railIndex,-65,25,charge),a=old.shoot(setup),b=next.shoot(setup);assert.equal(a.outcome,'oob');assert.equal(b.outcome,'line-ended');
   const list=features(b);assert.equal(list[0],'timber-receiver');assert.ok(list.length>1);assert.ok(b.point[2]<115);
  }finally{old.dispose();next.dispose();}
 }
});

test('receiver is repeatable, independent of pallet state, and leaves OOB gaps and unchanged non-contact shots',()=>{
 const setup=shot(1,-65,25,.8),a=harness('lumber',true,'A'),b=harness('lumber',true,'B');
 try{const one=a.shoot(setup),two=b.shoot(setup);assert.deepEqual(features(one),features(two));assert.deepEqual(one.point,two.point);}finally{a.dispose();b.dispose();}
 for(const setup of [shot(1,70,35,1),shot(0,23.6,21.2,1),shot(1,0,42,.93)]){
  const old=harness('gate',false),next=harness('gate');
  try{const a=old.shoot(setup),b=next.shoot(setup);assert.deepEqual(b,a);assert.ok(!features(b).includes('timber-receiver'));}finally{old.dispose();next.dispose();}
 }
});

function memoryStorage(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),clear:()=>map.clear()};}
test('receiver journal, archive and trace keyspace cannot overwrite or clear baseline evidence',async()=>{
 const storage=memoryStorage(),variant=receiverStorage(storage),db=new IDBFactory();
 storage.setItem('rail-golf:line-actions:baseline','preserve');variant.setItem('rail-golf:line-actions:variant','isolate');
 assert.equal(variant.length,1);assert.equal(variant.getItem('rail-golf:line-actions:baseline'),null);variant.clear();assert.equal(storage.getItem('rail-golf:line-actions:baseline'),'preserve');
 const baseline=createSurveyLog({storage,archive:createSurveyArchive(db),session:'baseline'});
 const experiment=createSurveyLog({storage:variant,archive:createSurveyArchive(db,undefined,'rail-golf-timber-receiver-survey'),session:'receiver'});
 const meta={build:'354c408',card:'open-line',station:'gate',setup:shot(1,0,42,.8),launchSpeed:35.6,environment:{floor:'A'}};
 const ledger=[{kind:'termination',reason:'ground-contact'}];baseline.append(baseline.begin(meta),ledger);experiment.append(experiment.begin(meta),ledger);
 await baseline.ready();await experiment.ready();assert.equal((await baseline.export()).records.length,1);assert.equal((await experiment.export()).records.length,1);
 await experiment.clear();assert.equal((await experiment.export()).records.length,0);assert.equal((await baseline.export()).records.length,1);
});

test('receiver share links stay in the physical variant with exact setup and no automatic fire',()=>{
 const payload={v:1,build:'354c408',world:'timber-courtyard',route:'/lab/timber-receiver',card:'open-line',station:'lumber',rail:2,yaw:-42,elevation:35,speed:43,environment:{floor:'B'}};
 assert.deepEqual(decodeShareLine(encodeShareLine(payload)),payload);const restored=restoreShareLine(payload,'354c408');
 assert.equal(restored.route,'/lab/timber-receiver');assert.equal(restored.autoFire,false);assert.equal(restored.environment.floor,'B');assert.equal(restored.setup.charge,1);
});

test('courtyard receiver is opt-in and defaults to unchanged incumbent Open Line equipment',async()=>{
 const app=await readFile(new URL('../app/manners-game.tsx',import.meta.url),'utf8');
 assert.match(app,/timberReceiver = false/);assert.match(app,/if\(timberReceiver\)buildTimberReceiver/);assert.match(app,/timberReceiver \? 3 : resolveSessionStartHoleIndex/);
 assert.equal(await readFile(new URL('../app/lab/lines/page.tsx',import.meta.url),'utf8'),'import {MannersGame} from "../../manners-game";\nexport default function LineLabPage(){return <MannersGame lineLab />;}\n');
});
