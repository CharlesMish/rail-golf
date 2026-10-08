import {linecraftStudyCSV} from './linecraft-lab.js';
import {SHOT_LIBRARY_KEY} from './shot-library.js';

// Isolated Linecraft experiment namespace. Physics, rulings and production keys
// stay with their existing owners. Arm codes are opaque to the player.
const ARMS=Object.freeze({
 a7:Object.freeze({arm:'a7',drawPreviousTrail:true,shelfTrailButtons:true}),
 // Same shelf, captions and controls as a7. Only the historical-trail mesh differs.
 k5:Object.freeze({arm:'k5',drawPreviousTrail:true,shelfTrailButtons:true}),
 c3:Object.freeze({arm:'c3',drawPreviousTrail:false,shelfTrailButtons:false}),
});
// Recorded-path presentation only. a7 is the revision-1 tube and must stay at these
// numbers. k5 is the slimmer candidate: a readable amber history, not a prediction.
export const LINECRAFT_E1_TRAILS=Object.freeze({
 a7:Object.freeze({
  radius:.46,diffuse:Object.freeze([1,.7,.35]),emissive:Object.freeze([1,.62,.22]),
  roughness:.2,alpha:1,pinHeight:2.4,pinDiameter:.34,pinLift:1.2,headDiameter:1.45,headLift:2.35,
  excludeGlow:false,
 }),
 k5:Object.freeze({
  radius:.12,diffuse:Object.freeze([.62,.34,.1]),emissive:Object.freeze([.24,.11,.03]),
  roughness:.72,alpha:.92,emissiveIntensity:.22,
  pinHeight:.72,pinDiameter:.12,pinLift:.36,headDiameter:.36,headLift:.86,
  excludeGlow:false,
 }),
});
const STATIONS=new Set(['gate','lumber']);
export const LINECRAFT_E1_PROGRESS_KEY='rail-golf-linecraft-e1-v1';
export const LINECRAFT_E1_LIBRARY_SUFFIX='-linecraft-e1-v1';
export const LINECRAFT_E1_SURVEY_DATABASE='rail-golf-linecraft-e1-survey';
export const LINECRAFT_E1_SURVEY_VERSION=1;
export const LINECRAFT_E1_MESSAGE='This link is not a valid lab session.';
// One shelf sentence for every arm. It must not name controls that only one arm renders.
export const LINECRAFT_E1_SHELF_CONTRACT='A line ends at first ground contact. Restore puts that setup back. You still fire the shot yourself.';
export const LINECRAFT_E1_SHELF_LINKS='Setup links restore a launch setup. They never fire on their own.';

export function linecraftE1LibraryKey(){
 return SHOT_LIBRARY_KEY+LINECRAFT_E1_LIBRARY_SUFFIX;
}
export function linecraftE1DrawsPreviousTrail(arm){
 return ARMS[arm]?.drawPreviousTrail===true;
}
export function linecraftE1Trail(arm){
 return LINECRAFT_E1_TRAILS[arm]??null;
}
// Every arm drops the previous shot's captions at address. Live flight and the result card keep them.
export function linecraftE1HidesShotText(phase){
 return phase==='ready'||phase==='charging';
}
export function linecraftE1Prefix(arm){
 if(!ARMS[arm])throw Error('Unknown arm');
 return `rail-golf:linecraft-e1:${arm}:`;
}

export function parseLinecraftE1Query(arm,station){
 const code=typeof arm==='string'?arm:'';
 const place=typeof station==='string'?station:'';
 const spec=ARMS[code];
 if(!spec||!STATIONS.has(place))return {ok:false,message:LINECRAFT_E1_MESSAGE};
 return {ok:true,mode:{arm:spec.arm,station:place,drawPreviousTrail:spec.drawPreviousTrail,shelfTrailButtons:spec.shelfTrailButtons}};
}

// Same shape as linecraftStorage, with the arm inside the prefix so shelf,
// keep observations, survey journal and action traces cannot cross arms.
export function linecraftE1Storage(storage,arm){
 const prefix=linecraftE1Prefix(arm);
 const keys=()=>Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(key=>key?.startsWith(prefix));
 return {get length(){return keys().length;},key:index=>keys()[index]?.slice(prefix.length)??null,
  getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key),
  clear(){for(const key of keys())if(!key.includes('-quarantine-'))storage.removeItem(key);}};
}

const EXACT_FOREIGN_KEYS=Object.freeze([
 'rail-golf-timber-courtyard-v01','rail-golf-mechanism-range-v03',
 'rail-golf-delivery-routes-v1','rail-golf-delivery-routes-v2',
 'rail-golf-shot-library-v1-yard','rail-golf-shot-library-v1-range','rail-golf-shot-library-v1-line-lab-v1',
 'rail-golf-shot-library-v1-linecraft-v1','rail-golf-shot-library-v1-intent-v1','rail-golf-shot-library-v1-timber-receiver-v1',
 'rail-golf-shot-library-v1-courtyard-diverter-v2','rail-golf-shot-library-v1-diverter',
 'rail-golf-line-lab-v1','rail-golf-linecraft-v1','rail-golf-intent-v1','rail-golf-timber-receiver-v1',
 'rail-golf-courtyard-diverter-v2','rail-golf-diverter-lab-v1','rail-golf:linecraft:keep-hint-v1',
 'rail-golf-line-survey','rail-golf-linecraft-survey','rail-golf-intent-survey','rail-golf-timber-receiver-survey',
]);
const FOREIGN_PREFIXES=Object.freeze([
 'rail-golf:linecraft:','rail-golf:intent:','rail-golf:timber-receiver:','rail-golf:line-survey:pending:','rail-golf:line-actions:','rail-golf:line-tab-id:',
]);

export function linecraftE1OwnsKey(key){
 if(typeof key!=='string'||!key)return false;
 if(key===LINECRAFT_E1_PROGRESS_KEY||key===linecraftE1LibraryKey())return true;
 return Object.keys(ARMS).some(arm=>key.startsWith(`rail-golf:linecraft-e1:${arm}:`));
}
export function linecraftE1KeyCollides(key){
 if(typeof key!=='string'||!key)return false;
 if(EXACT_FOREIGN_KEYS.includes(key))return true;
 if(key.startsWith('rail-golf:linecraft:')&&!key.startsWith('rail-golf:linecraft-e1:'))return true;
 return FOREIGN_PREFIXES.some(prefix=>prefix!=='rail-golf:linecraft:'&&key.startsWith(prefix));
}

export function stampLinecraftE1Export(study,arm){
 if(!ARMS[arm])throw Error('Unknown arm');
 const records=study.records.filter(record=>record.arm===arm).map(record=>({...record,arm}));
 return {...study,version:1,study:LINECRAFT_E1_PROGRESS_KEY,arm,records};
}
export function linecraftE1StudyCSV(study){
 const lines=linecraftStudyCSV(study).split('\r\n');
 return lines.map((line,index)=>index===0?`"arm",${line}`:`"${study.arm}",${line}`).join('\r\n');
}
