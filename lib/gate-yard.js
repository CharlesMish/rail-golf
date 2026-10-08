import {buildDiverterLab} from './diverter-scene.js';
import {KICKER_STATES} from './kicker-pallet.js';

// Lab-only placement. Shared KICKER_PALLET / KICKER_SWITCH stay on the other labs.
// Coordinates were chosen by the headless Gate grid, not by playing.
// The pallet keeps the kicker slab's geometry. No site of that slab changes 15% of the grid.
export const GATE_YARD_PALLET=Object.freeze({x:0,y:.5,z:28,width:10,height:.8,depth:8});
export const GATE_YARD_LEVER=Object.freeze({x:6,y:4.2,z:16,width:2.4,height:3.4,depth:.7});
export const GATE_YARD_ARMS=Object.freeze(['m4','t9']);
export const GATE_YARD_PROGRESS_KEY='rail-golf-gate-yard-v1';
export const GATE_YARD_LIBRARY_SUFFIX='-gate-yard-v1';
export const GATE_YARD_SURVEY_DB='rail-golf-gate-yard-survey';
export const GATE_YARD_PALLET_KEY='rail-golf:gate-yard:m4:pallet';
export const GATE_YARD_RELATIONS=Object.freeze(['fresh','adjust','retry','recall']);

export function parseGateYardArm(value){
 return value==='m4'||value==='t9'?value:null;
}
export function gateYardCarries(arm){
 return arm==='m4';
}
export function gateYardPrefix(arm){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 return `rail-golf:gate-yard:${arm}:`;
}
export function gateYardStorage(storage,arm){
 const prefix=gateYardPrefix(arm);
 const keys=()=>Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(key=>key?.startsWith(prefix));
 return {get length(){return keys().length;},key:index=>keys()[index]?.slice(prefix.length)??null,
  getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key),
  clear(){for(const key of keys())storage.removeItem(key);}};
}
export function readCarryPallet(sessionStorage){
 try{const value=sessionStorage.getItem(GATE_YARD_PALLET_KEY);return value==='B'?'B':'A';}
 catch{return 'A';}
}
export function writeCarryPallet(sessionStorage,state){
 sessionStorage.setItem(GATE_YARD_PALLET_KEY,state==='B'?'B':'A');
}
// m4 keeps the pallet it has now. t9 is A at every address. Reset restores A in both.
export function gateYardAddressState(arm,current,action){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 if(current!=='A'&&current!=='B')throw Error('Invalid pallet state');
 if(!['adjust','retry','recall','reset'].includes(action))throw Error('Unknown address action');
 if(action==='reset'||arm==='t9')return 'A';
 return current;
}
export function gateYardLoadState(arm,sessionStorage){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 return arm==='m4'?readCarryPallet(sessionStorage):'A';
}
export function gateYardContactCaption(kind){
 if(typeof kind==='string'&&kind.startsWith('floor-'))return 'PALLET';
 if(typeof kind==='string'&&kind.startsWith('switch-'))return 'LEVER';
 return null;
}
export function gateYardLiveCaptions(ledger){
 const seen=new Set(),captions=[];
 (ledger??[]).forEach((event,index)=>{
  let label=null;
  if(event?.kind==='switch-use')label='LEVER';
  else if(event?.kind==='redirect'&&(event.feature==='gate-yard-pallet'||event.label==='PALLET'))label='PALLET';
  else if(event?.kind==='pad-activation')label='SKIP';
  else if(event?.kind==='redirect'&&typeof event.label==='string')label=event.label;
  else if(event?.kind==='token'&&event.surface==='sky')label='SKY TOKEN';
  else if(event?.kind==='relationship'&&typeof event.label==='string')label=event.label;
  if(!label||seen.has(label))return;
  seen.add(label);captions.push({label,sourceIndex:index});
 });
 return captions;
}
export function gateYardShotFacts(contacts,ledger){
 const switchUse=(ledger??[]).some(event=>event?.kind==='switch-use'||(typeof event?.kind==='string'&&event.kind.startsWith('switch-')));
 const palletHit=(ledger??[]).some(event=>typeof event?.surface==='string'&&event.surface.startsWith('floor-'))
  ||(contacts??[]).some(contact=>typeof contact?.kind==='string'&&contact.kind.startsWith('floor-'));
 const leverHit=switchUse||(contacts??[]).some(contact=>typeof contact?.kind==='string'&&contact.kind.startsWith('switch-'));
 return {leverContact:leverHit,palletContact:palletHit};
}
export function annotateGateYardTicket(ticket,arm,relation,endFloor,contacts,ledger){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 if(!GATE_YARD_RELATIONS.includes(relation))throw Error('Unknown setup relation');
 if(endFloor!=='A'&&endFloor!=='B')throw Error('Invalid pallet state');
 return {...ticket,arm,setupRelation:relation,environmentAfter:{floor:endFloor},...gateYardShotFacts(contacts,ledger)};
}
export function gateYardStopRecord(arm,attempts){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 return {kind:'stop',arm,attempts:Number.isFinite(attempts)?attempts:0,stoppedAt:new Date().toISOString()};
}
export function gateYardStudyExport(arm,survey,stops=[]){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 const attempts=(survey?.records??[]).filter(record=>record?.arm===arm).map(record=>({
  ...record,arm:record.arm,
  startingPallet:record.environment?.floor??record.startingPallet??null,
  endingPallet:record.environmentAfter?.floor??record.endingPallet??null,
  leverContact:record.leverContact===true,palletContact:record.palletContact===true,
  setupRelation:record.setupRelation??null,
 }));
 return {version:1,study:'rail-golf-gate-yard-v1',arm,exportedAt:new Date().toISOString(),attempts,stops:[...stops]};
}
export function gateYardProgressSlice(stored,arm){
 const slice=stored&&typeof stored==='object'?stored.arms?.[arm]:null;
 return slice&&typeof slice==='object'?slice:{};
}
export function gateYardProgressEnvelope(stored,arm,records){
 const arms=stored&&typeof stored==='object'&&stored.arms&&typeof stored.arms==='object'?{...stored.arms}:{};
 arms[arm]=records;
 return {version:1,arms};
}
export function gateYardLibrarySlice(stored,arm){
 if(!stored||stored.version!==1||!stored.arms||typeof stored.arms!=='object'||!stored.arms[arm])return null;
 return {version:1,holes:stored.arms[arm]};
}
export function gateYardLibraryEnvelope(stored,arm,holes){
 const arms=stored&&typeof stored==='object'&&stored.arms&&typeof stored.arms==='object'?{...stored.arms}:{};
 arms[arm]=holes;
 return {version:1,arms};
}
export function filterSurveyByArm(archive,arm){
 if(!parseGateYardArm(arm))throw Error('Unknown gate yard arm');
 return {
  async append(record){
   const stats=await archive.append(record);
   const saved=await archive.read();
   const count=saved.records.filter(item=>item.arm===arm).length;
   return stats?{...stats,count}:stats;
  },
  async read(){
   const saved=await archive.read();
   return {...saved,records:saved.records.filter(item=>item.arm===arm)};
  },
  clear:()=>archive.clear(),
 };
}
// geometry is a headless placement probe only. Play never passes it.
export function buildGateYardPallet(scene,root,materials,shadows,initial='A',target=null,geometry=null){
 const floor=geometry?.floor??GATE_YARD_PALLET,lever=geometry?.switch??GATE_YARD_LEVER;
 return buildDiverterLab(scene,root,materials,shadows,initial,{overlay:true,supports:false,palletBoards:true,switchLabel:'LEVER',prefix:'gate-yard-',floor,switch:lever,states:KICKER_STATES,target,
  feature:{id:'gate-yard-pallet',kind:'pallet',label:'PALLET'}});
}
