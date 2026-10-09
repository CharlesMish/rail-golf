import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {KICKER_PALLET,KICKER_SWITCH,KICKER_STATES} from '../lib/kicker-pallet.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';
import {
 PALLET_YARD_PALLET,PALLET_YARD_LEVER,PALLET_EVIDENCE_CONTRACT,PALLET_YARD_STORAGE_PREFIX,
 parsePalletYardKey,palletYardFlatB,parsePalletYardStart,palletYardSlot,palletYardPrefix,palletYardStorage,
 readPalletCarry,writePalletCarry,palletYardCurrentYardAvailable,classifyPalletFace,legacyDeckContact,
 palletYardEventList,palletYardSettledText,palletYardContactLabel,buildPalletEvidence,palletEvidenceConsistent,palletYardStudyExport,
} from '../lib/pallet-yard.js';

const hv=await HavokPhysics({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const hole=selectOpenLineStation('gate');
const harness=(state='A',flatB=false,geometry=null)=>diverterHarness(hv,state,true,hole,{scoreLab:true,linecraft:true,palletYard:true,flatB,geometry});

test('assignment key and start parse without echoing an arm into storage names',()=>{
 assert.equal(parsePalletYardKey('v8'),'v8');
 assert.equal(parsePalletYardKey('n2'),'n2');
 assert.equal(parsePalletYardKey('V8'),null);
 assert.equal(parsePalletYardKey('physical'),null);
 assert.equal(parsePalletYardStart('a'),'A');
 assert.equal(parsePalletYardStart('b'),'B');
 assert.equal(parsePalletYardStart('A'),null);
 assert.equal(palletYardFlatB('n2'),true);
 assert.equal(palletYardFlatB('v8'),false);
 assert.throws(()=>palletYardFlatB('x'));
 assert.equal(palletYardSlot(false),'0');
 assert.equal(palletYardSlot(true),'1');
 assert.equal(palletYardPrefix(false),PALLET_YARD_STORAGE_PREFIX+'0:');
 assert.equal(PALLET_YARD_STORAGE_PREFIX,'rail-golf:pallet-yard:');
 assert.doesNotMatch(palletYardPrefix(true),/v8|n2|physical|cosmetic/);
 const backing=new Map();
 const storage={get length(){return backing.size;},key:index=>[...backing.keys()][index]??null,getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,String(value)),removeItem:key=>backing.delete(key)};
 const view=palletYardStorage(storage,true);
 view.setItem('library','[]');
 assert.equal(backing.get(PALLET_YARD_STORAGE_PREFIX+'1:library'),'[]');
 assert.equal(view.getItem('library'),'[]');
 writePalletCarry(storage,false,'B');
 assert.equal(readPalletCarry(storage,false),'B');
 assert.equal(readPalletCarry(storage,true),null);
});

test('face, deck flag and display contract keep PALLET for a qualified redirect only',()=>{
 assert.equal(classifyPalletFace({x:0,y:.4,z:0}),'top');
 assert.equal(classifyPalletFace({x:0,y:-.4,z:0}),'underside');
 assert.equal(classifyPalletFace({x:-5,y:0,z:0}),'end-x-');
 assert.equal(classifyPalletFace({x:4.9,y:.35,z:-3.9}),'edge');
 assert.equal(legacyDeckContact({y:.4}),true);
 assert.equal(legacyDeckContact({y:.2}),false);
 assert.equal(palletYardCurrentYardAvailable('A','B'),true);
 assert.equal(palletYardCurrentYardAvailable('A','A'),false);
 assert.equal(palletYardCurrentYardAvailable('B',null),false);
 const redirect=[{kind:'redirect',feature:'pallet-yard-pallet',label:'PALLET',turn:40,incoming:{x:0,y:-4,z:6},outgoing:{x:1,y:2,z:4},freeSeconds:.12,separation:2,point:{x:0,y:1,z:47},atStep:40}];
 const events=palletYardEventList([...redirect,{kind:'switch-use',atStep:10},{kind:'contact',label:'PALLET'}]);
 assert.deepEqual(events.map(event=>event.text),['PALLET','LEVER']);
 assert.equal(palletYardSettledText(events,'ground-contact'),'PALLET → LEVER → GROUND');
 assert.equal(palletYardContactLabel('floor-a',events),'PALLET');
 assert.equal(palletYardContactLabel('floor-a',[]),null);
 assert.equal(palletYardContactLabel('switch-a',events),'LEVER');
 const record=buildPalletEvidence({
  stateAtLaunch:'A',stateAtEnd:'B',flips:[{atStep:10,from:'A',to:'B'}],
  rawSamples:[{step:40,face:'top',local:{x:0,y:.4,z:0},world:{x:0,y:1,z:47},stateAtContact:'B'}],
  ledger:[...redirect,{kind:'switch-use'},{kind:'rejected',feature:'pallet-yard-pallet',reason:'interrupted-before-free-flight',turn:2.7,point:{x:1,y:1,z:47}}],
  displaySettled:'PALLET → LEVER → GROUND',displayLive:[{text:'LEVER',atStep:10},{text:'PALLET',atStep:40}],
  addressChip:'PALLET A',setupRelation:'current-yard',parentId:'attempt-1',sourceStateAtLaunch:'B',setup:{yaw:0},build:'abc1234',
 });
 assert.equal(record.evidenceContract,PALLET_EVIDENCE_CONTRACT);
 assert.equal(record.environment.floor,'A');
 assert.equal(record.environmentAfter.floor,'B');
 assert.equal(record.pallet.redirect.claimId,'common:pallet-yard-pallet');
 assert.deepEqual(palletEvidenceConsistent(record),[]);
 const graze=buildPalletEvidence({
  stateAtLaunch:'A',stateAtEnd:'A',rawSamples:[{step:12,local:{x:-4.9,y:.53,z:-3.9},world:{x:-4,y:1,z:44},stateAtContact:'A'}],
  ledger:[{kind:'rejected',feature:'pallet-yard-pallet',reason:'interrupted-before-free-flight',turn:2.7,point:{x:-4,y:1,z:44}},{kind:'termination',reason:'ground-contact'}],
  displaySettled:'GROUND',displayLive:[],addressChip:'PALLET A',setupRelation:'fresh',setup:{},build:'abc1234',
 });
 assert.equal(graze.pallet.deckContact,true);
 assert.equal(graze.pallet.redirect,null);
 assert.equal(graze.display.settled.includes('PALLET'),false);
 assert.deepEqual(palletEvidenceConsistent(graze),[]);
 assert.deepEqual(palletEvidenceConsistent({...graze,display:{...graze.display,settled:'PALLET → GROUND'}}),['settled-PALLET']);
 const packet=palletYardStudyExport([record],{stops:['local']});
 const again=palletYardStudyExport([record]);
 assert.equal(Object.hasOwn(packet,'stateB'),false);
 assert.deepEqual(Object.keys(packet),Object.keys(again));
 assert.deepEqual(Object.keys(packet),['version','study','evidenceContract','exportedAt','attempts','stops']);
 assert.doesNotMatch(JSON.stringify(packet),/rolled|flat|physical|cosmetic|\bv8\b|\bn2\b/);
 assert.equal(packet.study,'rail-golf-pallet-yard');
});

test('shared pallet link restores the recorded state and does not fire',()=>{
 const payload={v:2,build:'abc1234abcd',world:'timber-courtyard',route:'/lab/pallet-yard',card:'open-line',station:'gate',rail:1,originX:0,yaw:12,elevation:20,speed:40,environment:{floor:'B'}};
 const restored=restoreShareLine(decodeShareLine(encodeShareLine(payload)),payload.build);
 assert.equal(restored.autoFire,false);
 assert.equal(restored.environment.floor,'B');
 assert.equal(restored.setup.originX,0);
 assert.equal(restored.route,'/lab/pallet-yard');
});

test('kicker constants and frozen authorities stay on main',()=>{
 assert.deepEqual(KICKER_PALLET,{x:-32,y:.5,z:39,width:10,height:.8,depth:8});
 assert.deepEqual(KICKER_SWITCH,{x:-39,y:2.2,z:35,width:2.4,height:3.4,depth:.7});
 assert.equal(KICKER_STATES.B.roll,-18);
 assert.deepEqual(PALLET_YARD_PALLET,{x:0,y:.5,z:47,width:10,height:.8,depth:8});
 assert.equal(PALLET_YARD_LEVER.x,24);
 assert.equal(PALLET_YARD_LEVER.z,40);
 assert.equal(PALLET_YARD_LEVER.width,4);
 const frozen=['lib/rail-golf-v02.js','lib/delivery-routes.js','lib/line-recognition.js','lib/line-score.js','lib/line-run.js','lib/line-lifecycle.js','lib/kicker-pallet.js'];
 const base='cd9d41ddf6349b47e8d0035fd1707299ac255d55';
 let names='';
 try{
  execFileSync('git',['cat-file','-e',base+'^{commit}'],{stdio:'ignore'});
  names=execFileSync('git',['diff','--name-only',base,'--',...frozen],{encoding:'utf8'});
 }catch{/* A shallow checkout does not have the baseline object. The source gate below still applies. */}
 assert.equal(names.trim(),'');
 const rules=readFileSync(new URL('../lib/rail-golf-v02.js',import.meta.url),'utf8');
 const gates=readFileSync(new URL('../lib/line-recognition.js',import.meta.url),'utf8');
 const scoring=readFileSync(new URL('../lib/line-score.js',import.meta.url),'utf8');
 assert.match(rules,/minSpeed:\s*6/);
 assert.match(rules,/maxSpeed:\s*43/);
 assert.match(rules,/muzzleLength:\s*5\.18/);
 assert.match(gates,/minIncomingSpeed:4,minOutgoingSpeed:3,minTurnDegrees:25,maxContactSeconds:\.12,freeSeconds:\.10,minSeparation:1/);
 assert.match(scoring,/pointsPerAdditionalClaim:50,cap:200/);
 for(const file of frozen){
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/pallet-yard|palletYard|PALLET_YARD/);
 }
});

test('route copy refuses an unknown link and does not print an arm code',async()=>{
 const page=await readFile(new URL('../app/lab/pallet-yard/page.tsx',import.meta.url),'utf8');
 const game=await readFile(new URL('../app/manners-game.tsx',import.meta.url),'utf8');
 assert.match(page,/This link is not valid\./);
 assert.doesNotMatch(page,/physical|cosmetic|\{key\}|\{rawK\}/);
 assert.doesNotMatch(game,/physical-carry|cosmetic-carry|\bk=v8\b|\bk=n2\b|The pallet keeps its state|stateB|'flat'|'rolled'/);
 assert.match(game,/TRY THIS AIM IN CURRENT YARD/);
 assert.match(game,/RESTORED · PALLET/);
 assert.match(game,/AIM FROM #/);
 assert.match(game,/RECORDED · PALLET/);
 assert.match(game,/data-pallet-yard=\{palletYard\?'true':undefined\}/);
});

test('cosmetic B keeps A\'s collider while physical B rolls, and the cues have no body',()=>{
 const rollOf=mesh=>mesh.rotationQuaternion?2*Math.atan2(mesh.rotationQuaternion.z,mesh.rotationQuaternion.w):mesh.rotation.z;
 const cosmetic=harness('B',true);
 const physical=harness('B',false);
 const flat=harness('A',false);
 try{
  assert.ok(Math.abs(rollOf(cosmetic.world.floor))<1e-6);
  assert.equal(cosmetic.world.floor.position.y,flat.world.floor.position.y);
  assert.ok(Math.abs(rollOf(physical.world.floor)-(-18*Math.PI/180))<1e-4);
  assert.ok(Math.abs(physical.world.floor.position.y-(flat.world.floor.position.y+1.53))<1e-6);
  for(const world of [cosmetic.world,physical.world,flat.world]){
   const cues=world.cueMeshes();
   assert.ok(cues.length>=3);
   for(const mesh of cues){
    assert.equal(mesh.physicsBody??null,null);
    assert.doesNotMatch(mesh.name,/bounce-floor|switch-foot/);
   }
   assert.ok(cues.some(mesh=>mesh.name==='pallet-yard-lever-mast'));
   assert.ok(cues.some(mesh=>mesh.name==='pallet-yard-state-flag'));
  }
  cosmetic.world.setState('A');
  assert.equal(cosmetic.world.floor.rotation.z,0);
  const names=cosmetic.world.cueMeshes().map(mesh=>mesh.name);
  assert.ok(names.includes('pallet-yard-state-flag'));
 }finally{cosmetic.dispose();physical.dispose();flat.dispose();}
});

test('one integrated shot records the evidence contract from the same event list',()=>{
 const h=harness('A',false);
 try{
  const shot={railIndex:1,originX:0,yaw:0,elevation:28,charge:.7};
  const result=h.shoot(shot);
  const events=palletYardEventList(result.ledger);
  const settled=palletYardSettledText(events,result.ledger.findLast(event=>event.kind==='termination')?.reason);
  const record=buildPalletEvidence({
   stateAtLaunch:result.start,stateAtEnd:result.end,flips:result.flips,rawSamples:result.rawSamples,ledger:result.ledger,
   displaySettled:settled,displayLive:events.map(event=>({text:event.text,atStep:event.atStep??0})),
   addressChip:result.start==='B'?'PALLET B':'PALLET A',setupRelation:'fresh',setup:shot,build:'abc1234',
  });
  assert.deepEqual(palletEvidenceConsistent(record),[]);
  assert.equal(record.display.settled.includes('PALLET'),record.pallet.redirect!=null);
  assert.equal(record.display.settled.includes('LEVER'),record.lever.flipped);
 }finally{h.dispose();}
});

test('recorded fixture shots keep the evidence contract, including a rejected end face',()=>{
 const book=JSON.parse(readFileSync(new URL('./fixtures/pallet-yard-evidence.json',import.meta.url),'utf8'));
 assert.equal(book.flipThenPallet,null);
 const h=harness('A',false);
 try{
  for(const row of book.cases){
   h.world.setState(row.state);
   const result=h.shoot(row.shot);
   const face=result.rawSamples[0]?.face??null;
   const redirect=result.ledger.some(event=>event.kind==='redirect'&&event.feature==='pallet-yard-pallet');
   const rejected=result.ledger.some(event=>event.kind==='rejected'&&event.feature==='pallet-yard-pallet');
   const deck=result.rawSamples.some(sample=>Math.abs(sample.local.y-0.4)<.16);
   assert.equal(face,row.expect.face,row.id);
   assert.equal(redirect,row.expect.redirect,row.id);
   assert.equal(rejected,row.expect.rejected,row.id);
   assert.equal(deck,row.expect.deck,row.id);
   assert.equal(result.flips.length>0,row.expect.flipped,row.id);
   assert.equal(result.rawSamples.length>0,row.expect.touched,row.id);
   assert.equal(result.end,row.expect.end,row.id);
   const events=palletYardEventList(result.ledger);
   const settled=palletYardSettledText(events,result.ledger.findLast(event=>event.kind==='termination')?.reason);
   const record=buildPalletEvidence({
    stateAtLaunch:result.start,stateAtEnd:result.end,flips:result.flips,rawSamples:result.rawSamples,ledger:result.ledger,
    displaySettled:settled,displayLive:events.map(event=>({text:event.text,atStep:event.atStep??0})),
    addressChip:result.start==='B'?'PALLET B':'PALLET A',setupRelation:'fresh',setup:row.shot,build:'fixture',
   });
   assert.deepEqual(palletEvidenceConsistent(record),[],row.id);
   assert.equal(settled.includes('PALLET'),redirect,row.id);
   assert.equal(settled.includes('LEVER'),result.flips.length>0,row.id);
  }
 }finally{h.dispose();}
});
