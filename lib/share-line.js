import {RAIL_RULES,speedToCharge} from './rail-golf-v02.js';
export const SHARE_WORLD='timber-courtyard';
const cards={'/lab/lines':{'mill-delivery':'gate','switchback-gallery':'gate','lumber-cascade':'lumber','open-line':['gate','lumber','saw']},'/lab/courtyard-diverter':{'courtyard-diverter':'gate'}};
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
export function validateShareLine(value){
 if(!exactKeys(value,['v','build','world','route','card','station','rail','yaw','elevation','speed','environment']))throw Error('Invalid ShareLineV1 fields');
 if(value.v!==1||value.world!==SHARE_WORLD||!Object.hasOwn(cards,value.route)||!Object.hasOwn(cards[value.route],value.card)||![cards[value.route][value.card]].flat().includes(value.station))throw Error('Unsupported line world, route, card or station');
 if(typeof value.build!=='string'||!(/^[a-f0-9]{7,40}(-dirty)?$/.test(value.build)||value.build==='unknown'))throw Error('Invalid build identity');
 if(!Number.isInteger(value.rail)||value.rail<0||value.rail>=RAIL_RULES.railPositions.length)throw Error('Invalid rail');
 for(const [key,min,max]of [['yaw',RAIL_RULES.minYaw,RAIL_RULES.maxYaw],['elevation',RAIL_RULES.minElevation,RAIL_RULES.maxElevation],['speed',RAIL_RULES.minSpeed,RAIL_RULES.maxSpeed]]){
  if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('Invalid '+key);
 }
 if(!exactKeys(value.environment,['floor'])||!['A','B'].includes(value.environment.floor))throw Error('Invalid starting environment');
 return {...value,environment:{floor:value.environment.floor}};
}
export function encodeShareLine(value){return btoa(JSON.stringify(validateShareLine(value))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function decodeShareLine(encoded){
 if(typeof encoded!=='string'||encoded.length>2048||!(/^[A-Za-z0-9_-]+$/.test(encoded)))throw Error('Invalid line link');
 try{const value=validateShareLine(JSON.parse(atob(encoded.replaceAll('-','+').replaceAll('_','/'))));if(encodeShareLine(value)!==encoded)throw Error();return value;}catch{throw Error('Invalid or unsupported ShareLineV1');}
}
export function restoreShareLine(value,currentBuild){
 const line=validateShareLine(value);
 return {route:line.route,card:line.card,station:line.station,setup:{railIndex:line.rail,yaw:line.yaw,elevation:line.elevation,charge:speedToCharge(line.speed)},environment:{...line.environment},powerMode:'set',autoFire:false,
 warning:line.build==='unknown'||currentBuild==='unknown'||line.build!==currentBuild?`Recorded on build ${line.build}; current build ${currentBuild}. Exact physical replay is not guaranteed.`:''};
}
