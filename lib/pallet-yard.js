import {MeshBuilder,Vector3} from '@babylonjs/core';
import {buildDiverterLab} from './diverter-scene.js';
import {KICKER_STATES} from './kicker-pallet.js';
import {scoreLine} from './line-score.js';

// Lab-only placement. Shared KICKER_PALLET / KICKER_SWITCH stay on the other labs.
// Candidate 1 R40P47: pallet down-range of the banks, lever off the central line.
export const PALLET_YARD_PALLET=Object.freeze({x:0,y:.5,z:47,width:10,height:.8,depth:8});
export const PALLET_YARD_LEVER=Object.freeze({x:24,y:2.2,z:40,width:4,height:3.4,depth:.7});
export const PALLET_YARD_FEATURE=Object.freeze({id:'pallet-yard-pallet',kind:'pallet',label:'PALLET'});
export const PALLET_EVIDENCE_CONTRACT='pallet-evidence-v1';
export const PALLET_YARD_STORAGE_PREFIX='rail-golf:pallet-yard:';
export const PALLET_YARD_RELATIONS=Object.freeze(['fresh','adjust','retry','recall','current-yard']);
export const PALLET_YARD_SURVEY_DB='rail-golf-pallet-yard-survey';

const KEYS=new Set(['v8','n2']);
const speed=v=>v?Math.hypot(v.x??0,v.y??0,v.z??0):0;
const round3=n=>Math.round(n*1000)/1000;
const point3=p=>p?{x:round3(p.x),y:round3(p.y),z:round3(p.z)}:null;

export function parsePalletYardKey(value){
 return KEYS.has(value)?value:null;
}
// n2 keeps A's collider in both letters. v8 uses the rolled ramp in B.
export function palletYardFlatB(key){
 if(!parsePalletYardKey(key))throw Error('Unknown pallet yard key');
 return key==='n2';
}
export function parsePalletYardStart(value){
 if(value==='a')return 'A';
 if(value==='b')return 'B';
 return null;
}
export function palletYardSlot(flatB){
 return flatB?'1':'0';
}
export function palletYardPrefix(flatB){
 return PALLET_YARD_STORAGE_PREFIX+palletYardSlot(flatB)+':';
}
export function palletYardStorage(storage,flatB){
 const prefix=palletYardPrefix(flatB);
 const keys=()=>Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(key=>key?.startsWith(prefix));
 return {get length(){return keys().length;},key:index=>keys()[index]?.slice(prefix.length)??null,
  getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key),
  clear(){for(const key of keys())storage.removeItem(key);}};
}
export function readPalletCarry(sessionStorage,flatB){
 try{const value=sessionStorage.getItem(palletYardPrefix(flatB)+'state');return value==='A'||value==='B'?value:null;}
 catch{return null;}
}
export function writePalletCarry(sessionStorage,flatB,state){
 sessionStorage.setItem(palletYardPrefix(flatB)+'state',state==='B'?'B':'A');
}

// Adjust and Restore put the recorded launch state back. Current-yard is a different action.
export function palletYardCurrentYardAvailable(current,sourceState){
 return (current==='A'||current==='B')&&(sourceState==='A'||sourceState==='B')&&current!==sourceState;
}

// Face in slab-local coordinates. `edge` is within 0.16 m of two face planes.
export function classifyPalletFace(local,floor=PALLET_YARD_PALLET){
 const hx=floor.width/2,hy=floor.height/2,hz=floor.depth/2;
 const planes=[['top',Math.abs(local.y-hy)],['underside',Math.abs(local.y+hy)],['end-x-',Math.abs(local.x+hx)],['end-x+',Math.abs(local.x-hx)],['near',Math.abs(local.z+hz)],['far',Math.abs(local.z-hz)]];
 const close=planes.filter(([,distance])=>distance<.16);
 if(close.length>=2)return 'edge';
 planes.sort((a,b)=>a[1]-b[1]);
 return planes[0][0];
}
export function legacyDeckContact(local,floor=PALLET_YARD_PALLET){
 return Math.abs(local.y-floor.height/2)<.16;
}

// One list for the live caption, the banner, the settled card and the world labels.
// PALLET is a qualified redirect. LEVER is the flip. Nothing else reuses those words.
export function palletYardEventList(ledger){
 const seen=new Set(),events=[];
 (ledger??[]).forEach((event,index)=>{
  let text=null;
  if(event?.kind==='switch-use')text='LEVER';
  else if(event?.kind==='redirect'&&event.feature===PALLET_YARD_FEATURE.id)text='PALLET';
  else if(event?.kind==='redirect'&&typeof event.label==='string')text=event.label;
  else if(event?.kind==='pad-activation')text='SKIP';
  else if(event?.kind==='relationship'&&typeof event.label==='string')text=event.label;
  else if(event?.kind==='token'&&event.surface==='sky')text='SKY TOKEN';
  if(!text||seen.has(text))return;
  seen.add(text);
  events.push({text,atStep:Number.isFinite(event.atStep)?event.atStep:null,sourceIndex:index});
 });
 return events;
}
export function palletYardEndingWord(reason){
 if(!reason||reason==='ground-contact'||reason==='first-kiss')return 'GROUND';
 if(reason==='oob')return 'OUT OF BOUNDS';
 if(reason==='dead-ball')return 'DEAD BALL';
 if(reason==='retry-interrupted')return 'INTERRUPTED';
 return String(reason).replaceAll('-',' ').toUpperCase();
}
export function palletYardSettledText(events,reason){
 const words=[...(events??[]).map(event=>event.text),palletYardEndingWord(reason)].filter(Boolean);
 return words.join(' → ');
}
export function palletYardContactLabel(kind,events){
 const texts=(events??[]).map(event=>event.text);
 if(typeof kind==='string'&&kind.startsWith('floor-'))return texts.includes('PALLET')?'PALLET':null;
 if(typeof kind==='string'&&kind.startsWith('switch-'))return texts.includes('LEVER')?'LEVER':null;
 if(kind==='boost')return texts.includes('SKIP')?'SKIP':null;
 if(kind==='bank-a')return texts.find(text=>text.startsWith('BANK A'))??null;
 if(kind==='bank-b')return texts.find(text=>text.startsWith('BANK B'))??null;
 if(typeof kind==='string'&&kind.startsWith('step-'))return texts.find(text=>text.includes('TREAD'))??null;
 return null;
}

export function groupPalletContacts(samples,floor=PALLET_YARD_PALLET){
 const groups=[];
 for(const sample of samples??[]){
  const face=sample.face??classifyPalletFace(sample.local,floor);
  const last=groups.at(-1);
  const contiguous=last&&last.face===face&&last.stateAtContact===sample.stateAtContact&&sample.step<=last.lastStep+2;
  if(!contiguous)groups.push({firstStep:sample.step,lastStep:sample.step,count:1,face,localPoint:point3(sample.local),worldPoint:point3(sample.world),stateAtContact:sample.stateAtContact});
  else {last.lastStep=sample.step;last.count+=1;}
 }
 return groups;
}

export function buildPalletEvidence({stateAtLaunch,stateAtEnd,flips=[],rawSamples=[],ledger=[],displaySettled,displayLive=[],addressChip,setupRelation,parentId=null,sourceStateAtLaunch=null,setup,build,floor=PALLET_YARD_PALLET}){
 if(stateAtLaunch!=='A'&&stateAtLaunch!=='B')throw Error('Invalid pallet state');
 if(stateAtEnd!=='A'&&stateAtEnd!=='B')throw Error('Invalid pallet state');
 if(!PALLET_YARD_RELATIONS.includes(setupRelation))throw Error('Unknown setup relation');
 if(addressChip!=='PALLET A'&&addressChip!=='PALLET B')throw Error('Invalid address chip');
 const rawContacts=groupPalletContacts(rawSamples,floor);
 const redirectEvent=(ledger??[]).find(event=>event?.kind==='redirect'&&event.feature===PALLET_YARD_FEATURE.id)??null;
 const nearest=redirectEvent?.point?rawSamples.reduce((best,sample)=>{
  const distance=Math.hypot(sample.world.x-redirectEvent.point.x,sample.world.y-redirectEvent.point.y,sample.world.z-redirectEvent.point.z);
  return !best||distance<best.distance?{sample,distance}:best;
 },null):null;
 const claimIds=scoreLine(ledger??[]).claimIds;
 const claimId=claimIds.find(id=>id.endsWith(':'+PALLET_YARD_FEATURE.id))??null;
 const redirect=redirectEvent?{
  turn:round3(redirectEvent.turn??0),
  incomingSpeed:round3(speed(redirectEvent.incoming)),
  outgoingSpeed:round3(speed(redirectEvent.outgoing)),
  freeSeconds:round3(redirectEvent.freeSeconds??0),
  separation:round3(redirectEvent.separation??0),
  face:nearest?.sample.face??null,
  stateAtContact:nearest?.sample.stateAtContact??stateAtLaunch,
  claimId,
 }:null;
 const rejected=(ledger??[]).filter(event=>event?.kind==='rejected'&&(event.feature===PALLET_YARD_FEATURE.id||event.label==='PALLET')).map(event=>{
  const match=event.point?rawSamples.reduce((best,sample)=>{
   const distance=Math.hypot((sample.world?.x??0)-(event.point?.x??0),(sample.world?.y??0)-(event.point?.y??0),(sample.world?.z??0)-(event.point?.z??0));
   return !best||distance<best.distance?{sample,distance}:best;
  },null):null;
  return {reason:event.reason??'rejected',face:match?.sample.face??null,...(Number.isFinite(event.turn)?{turn:round3(event.turn)}:{})};
 });
 const leverBody=event=>event?.kind==='contact'&&typeof event.body==='string'&&event.body.endsWith('-switch');
 return {
  evidenceContract:PALLET_EVIDENCE_CONTRACT,
  pallet:{
   stateAtLaunch,stateAtEnd,
   flips:flips.map(flip=>({atStep:flip.atStep,from:flip.from,to:flip.to,cause:'lever'})),
   rawContacts,touched:rawContacts.length>0,
   deckContact:rawSamples.some(sample=>legacyDeckContact(sample.local,floor)),
   redirect,rejected,
  },
  lever:{
   touched:(ledger??[]).some(leverBody)||flips.length>0,
   flipped:flips.length>0||(ledger??[]).some(event=>event?.kind==='switch-use'),
  },
  display:{settled:displaySettled,live:displayLive.map(item=>({text:item.text,atStep:item.atStep})),addressChip},
  setupRelation,parentId,sourceStateAtLaunch,
  replayKey:{setup,stateAtLaunch,build},
  environment:{floor:stateAtLaunch},
  environmentAfter:{floor:stateAtEnd},
 };
}

const words=text=>String(text??'').split(/[^A-Za-z0-9+]+/).filter(Boolean);
export function palletEvidenceConsistent(record){
 const errors=[];
 const settled=record?.display?.settled??'';
 const live=record?.display?.live??[];
 const settledWords=new Set(words(settled));
 if(settled.includes('PALLET')!==(record?.pallet?.redirect!=null))errors.push('settled-PALLET');
 if(settled.includes('LEVER')!==(record?.lever?.flipped===true))errors.push('settled-LEVER');
 for(const item of live)for(const word of words(item?.text))if(!settledWords.has(word))errors.push('live-word:'+word);
 if(record?.evidenceContract!==PALLET_EVIDENCE_CONTRACT)errors.push('contract');
 return errors;
}

export function palletYardStudyExport(attempts,extras={}){
 return {version:1,study:'rail-golf-pallet-yard',evidenceContract:PALLET_EVIDENCE_CONTRACT,exportedAt:new Date().toISOString(),stateB:extras.stateB==='flat'?'flat':'rolled',attempts:[...attempts],stops:[...(extras.stops??[])]};
}

const FLAT_STATES=Object.freeze({
 A:Object.freeze({pitch:0,roll:0,material:'amber'}),
 B:Object.freeze({pitch:0,roll:0,material:'violet'}),
});

// Visual cues only. Neither the flag nor the mast receives a physics body.
export function buildPalletYard(scene,root,materials,shadows,initial='A',target=null,options={}){
 const floor=options.geometry?.floor??PALLET_YARD_PALLET;
 const lever=options.geometry?.switch??PALLET_YARD_LEVER;
 const states=options.flatB?FLAT_STATES:KICKER_STATES;
 const lab=buildDiverterLab(scene,root,materials,shadows,initial,{overlay:true,supports:false,palletBoards:true,switchLabel:'LEVER',prefix:'pallet-yard-',floor,switch:lever,states,target,feature:PALLET_YARD_FEATURE});
 let flag=null,cloth=null;
 const mast=MeshBuilder.CreateBox('pallet-yard-lever-mast',{width:.18,height:4,depth:.18},scene);
 mast.parent=root;
 mast.position.set(lever.x,lever.y+lever.height/2+2.1,lever.z);
 mast.material=materials.amber??materials.steel;
 mast.isPickable=false;
 mast.receiveShadows=false;
 const placeFlag=()=>{
  flag?.dispose();cloth?.dispose();
  const mesh=lab.floor;
  if(!mesh)return;
  const corner=Vector3.TransformCoordinates(new Vector3(-floor.width/2,floor.height/2,0),mesh.computeWorldMatrix(true));
  flag=MeshBuilder.CreateBox('pallet-yard-state-flag',{width:.12,height:3.2,depth:.12},scene);
  flag.parent=root;
  flag.position.set(corner.x,corner.y+1.6,corner.z);
  flag.material=materials[states[lab.state].material]??materials.amber;
  flag.isPickable=false;
  flag.receiveShadows=false;
  cloth=MeshBuilder.CreateBox('pallet-yard-state-flag-cloth',{width:.85,height:.55,depth:.04},scene);
  cloth.parent=flag;
  cloth.position.set(.48,1.15,0);
  cloth.material=flag.material;
  cloth.isPickable=false;
 };
 placeFlag();
 const notePallet=point=>{
  if(!point||!lab.floor)return null;
  const local=Vector3.TransformCoordinates(point,lab.floor.computeWorldMatrix(true).clone().invert());
  return {face:classifyPalletFace(local,floor),local:{x:local.x,y:local.y,z:local.z},world:{x:point.x,y:point.y,z:point.z},deck:legacyDeckContact(local,floor)};
 };
 return {
  get state(){return lab.state;},get floor(){return lab.floor;},get floorBody(){return lab.floorBody;},
  switchBody:lab.switchBody,targetBody:lab.targetBody,groundBody:lab.groundBody,
  setState(next){lab.setState(next);placeFlag();},
  contact:(other,point,shotId)=>lab.contact(other,point,shotId),
  flush(){const next=lab.flush();if(next)placeFlag();return next;},
  dispose(){flag?.dispose();cloth?.dispose();mast.dispose();lab.dispose();},
  notePallet,syncCue:placeFlag,
  cueMeshes:()=>[flag,cloth,mast].filter(Boolean),
 };
}
