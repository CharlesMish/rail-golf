import {RAIL_RULES,speedToCharge} from './rail-golf-v02.js';
import {validLinecraftOrigin} from './linecraft-origin.js';
export const SHARE_WORLD='timber-courtyard';
const cards={'/lab/lines':{'mill-delivery':'gate','switchback-gallery':'gate','lumber-cascade':'lumber','open-line':['gate','lumber','saw']},'/lab/courtyard-diverter':{'courtyard-diverter':'gate'}};
cards['/lab/timber-receiver']=cards['/lab/lines'];
cards['/lab/linecraft']={'open-line':['gate','lumber']};
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
export function validateShareLine(value){
 const originVersion=value?.v===2;
 if(!exactKeys(value,['v','build','world','route','card','station','rail','yaw','elevation','speed','environment',...(originVersion?['originX']:[])]))throw Error('Invalid line link fields');
 if((value.v!==1&&!originVersion)||(originVersion&&value.route!=='/lab/linecraft')||value.world!==SHARE_WORLD||!Object.hasOwn(cards,value.route)||!Object.hasOwn(cards[value.route],value.card)||![cards[value.route][value.card]].flat().includes(value.station))throw Error('Unsupported line world, route, card or station');
 if(typeof value.build!=='string'||!(/^[a-f0-9]{7,40}(-dirty)?$/.test(value.build)||value.build==='unknown'))throw Error('Invalid build identity');
 if(!Number.isInteger(value.rail)||value.rail<0||value.rail>=RAIL_RULES.railPositions.length)throw Error('Invalid rail');
 if(originVersion&&!validLinecraftOrigin(value,value.station))throw Error('Invalid launch origin');
 for(const [key,min,max]of [['yaw',RAIL_RULES.minYaw,RAIL_RULES.maxYaw],['elevation',RAIL_RULES.minElevation,RAIL_RULES.maxElevation],['speed',RAIL_RULES.minSpeed,RAIL_RULES.maxSpeed]]){
  if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('Invalid '+key);
 }
 if(!exactKeys(value.environment,['floor'])||!['A','B'].includes(value.environment.floor))throw Error('Invalid starting environment');
 return {...value,environment:{floor:value.environment.floor}};
}
export function encodeShareLine(value){return btoa(JSON.stringify(validateShareLine(value))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function decodeShareLine(encoded){
 if(typeof encoded!=='string'||encoded.length>2048||!(/^[A-Za-z0-9_-]+$/.test(encoded)))throw Error('Invalid line link');
 try{const value=validateShareLine(JSON.parse(atob(encoded.replaceAll('-','+').replaceAll('_','/'))));if(encodeShareLine(value)!==encoded)throw Error();return value;}catch{throw Error('Invalid or unsupported line link');}
}
export function restoreShareLine(value,currentBuild){
 const line=validateShareLine(value);
 return {route:line.route,card:line.card,station:line.station,setup:{railIndex:line.rail,...(line.route==='/lab/linecraft'?{originX:line.v===2?line.originX:RAIL_RULES.railPositions[line.rail]}:{}),yaw:line.yaw,elevation:line.elevation,charge:speedToCharge(line.speed)},environment:{...line.environment},powerMode:'set',autoFire:false,
 warning:line.build==='unknown'||currentBuild==='unknown'||line.build!==currentBuild?`Recorded on build ${line.build}; current build ${currentBuild}. Exact physical replay is not guaranteed.`:''};
}

// Explicit same-page load uses the same validation and exact-speed restoration
// as opening a link in a new document. Reading the hash never fires or navigates.
export function restoreLinecraftLinkHash(hash,currentBuild){
 const encoded=new URLSearchParams(hash.startsWith('#')?hash.slice(1):hash).get('line');
 if(!encoded)throw Error('No setup link is present in this address.');
 const restored=restoreShareLine(decodeShareLine(encoded),currentBuild);
 if(restored.route!=='/lab/linecraft')throw Error('This setup link belongs to a different lab.');
 return restored;
}
