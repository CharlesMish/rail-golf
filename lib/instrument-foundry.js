// A bounded authoring envelope around the existing Worldcraft range preset.
// It contributes data and presentation, never another physics/audio runtime.
import {adaptRangePreset,rangeOpeningSetup,validateRangePreset} from './worldcraft-range.js';
import {validateWorldcraftShot} from './worldcraft-model.js';
import {validateCounterlineProfile} from './counterline-recording.js';
import descending from '../worlds/instruments/descending-resonance/instrument.json' with {type:'json'};
import terraces from '../worlds/instruments/chime-terraces/instrument.json' with {type:'json'};

export const INSTRUMENT_FORMAT='rail-golf-counterline-instrument';
export const INSTRUMENT_VERSION=1;
export const INSTRUMENT_MAX_BYTES=49152;
export const INSTRUMENT_IMPORT_LIMIT=6;
const BANNED=new Set(['script','scripts','src','url','href','asset','assetUrl','remote','eval','__proto__','constructor','prototype']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const bytes=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).length;
const clone=structuredClone;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
function exact(value,keys,label){if(!plain(value)||Object.keys(value).sort().join(',')!==keys.slice().sort().join(','))throw Error(`${label}: unsupported or missing fields.`);}
function safe(value){if(Array.isArray(value)){value.forEach(safe);return;}if(plain(value)){for(const [key,item] of Object.entries(value)){if(BANNED.has(key))throw Error('Instrument files cannot contain scripts or remote assets.');safe(item);}return;}if(typeof value==='string'&&(/\w+:\/\//.test(value)||value.includes('//')))throw Error('Instrument files cannot contain remote addresses.');}
function finite(value,min,max,label){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`${label}: outside the supported range.`);return value;}
function detent(value,step,label){if(Math.abs(value/step-Math.round(value/step))>1e-8)throw Error(`${label}: use ordinary player control detents.`);}
function ordinarySetup(world,input,label){
 exact(input,['railIndex','originX','yaw','elevation','charge'],label);
 const value=validateWorldcraftShot(world,input);
 for(const [key,step] of [['originX',.5],['yaw',.5],['elevation',.5],['charge',.01]])detent(value[key],step,`${label} ${key}`);
 return value;
}
export function validateInstrumentCamera(input){
 if(input===null)return null;
 exact(input,['target','radius','yaw','elevation'],'Instrument camera');exact(input.target,['x','y','z'],'Camera target');
 return {target:{x:finite(input.target.x,-30,30,'Camera target x'),y:finite(input.target.y,0,30,'Camera target y'),z:finite(input.target.z,0,96,'Camera target z')},radius:finite(input.radius,12,160,'Camera radius'),yaw:finite(input.yaw,-180,180,'Camera yaw'),elevation:finite(input.elevation,10,80,'Camera elevation')};
}
export function validateInstrument(input){
 if(bytes(input)>INSTRUMENT_MAX_BYTES)throw Error('An instrument must be at most 48 KiB.');
 exact(input,['format','version','preset','profile','invitation','sourceBuild','opening','camera'],'Instrument');safe(input);
 if(input.format!==INSTRUMENT_FORMAT||input.version!==INSTRUMENT_VERSION)throw Error('Unsupported instrument format or version.');
 if(bytes(input.preset)>32768)throw Error('An instrument preset must be at most 32 KiB.');
 const preset=validateRangePreset(input.preset),world=adaptRangePreset(preset).world;
 if(preset.rules.launcher.fixed||preset.rules.goal.kind!=='none')throw Error('Instrument v1 needs an adjustable launcher and no challenge goal.');
 if(preset.objects.some(piece=>!['bank','ramp','block','plate'].includes(piece.kind)))throw Error('Instrument v1 supports static bank, ramp, block and plate pieces only.');
 if(!preset.objects.some(piece=>piece.voice))throw Error('An instrument needs at least one voiced physical surface.');
 if(preset.rules.fixed.length!==preset.objects.length||preset.objects.some(piece=>!preset.rules.fixed.includes(piece.id))||Object.values(preset.rules.allowance).some(value=>value!==0))throw Error('Instrument v1 fixes its authored pieces and has no build allowance.');
 const original=rangeOpeningSetup(preset);ordinarySetup(world,original,'Original opening');
 const window=preset.rules.launcher.window;
 if(window)for(const [key,value] of Object.entries(window))detent(value,key.startsWith('charge')?.01:.5,`Launcher window ${key}`);
 const invitation=input.invitation;
 if(typeof invitation!=='string'||!invitation.length||invitation.length>600||invitation.trim()!==invitation||/[\u0000-\u001f\u007f]/.test(invitation))throw Error('Invitation: use 1–600 plain-text characters.');
 if(typeof input.sourceBuild!=='string'||!(/^[a-f0-9]{40}$/).test(input.sourceBuild))throw Error('Instrument sourceBuild must be a full lowercase commit SHA.');
 return freeze({format:INSTRUMENT_FORMAT,version:1,preset:clone(preset),profile:validateCounterlineProfile(input.profile),invitation,sourceBuild:input.sourceBuild,opening:ordinarySetup(world,input.opening,'Instrument opening'),camera:validateInstrumentCamera(input.camera)});
}
export function importInstrument(text){if(typeof text!=='string'||bytes(text)>INSTRUMENT_MAX_BYTES)throw Error('Choose an instrument JSON file no larger than 48 KiB.');return validateInstrument(JSON.parse(text));}
export function exportInstrument(value){return JSON.stringify(validateInstrument(value),null,2);}
const REFERENCES=[descending,terraces].map(validateInstrument);
export function instrumentReferences(){return REFERENCES.map(value=>validateInstrument(value));}
export function instrumentWorld(input){
 const value=validateInstrument(input),reference=REFERENCES.find(item=>JSON.stringify(item)===JSON.stringify(value));
 return {id:value.preset.id,label:value.preset.name,world:adaptRangePreset(value.preset).world,opening:clone(value.opening),originalOpening:rangeOpeningSetup(value.preset),entryLabel:'Instrument starting setup',invitation:value.invitation,profile:clone(value.profile),foundryId:reference?value.preset.id:null};
}
export function instrumentWorlds(){return instrumentReferences().map(instrumentWorld);}
export function appendInstrument(current,input){
 if(!Array.isArray(current)||current.length>REFERENCES.length+INSTRUMENT_IMPORT_LIMIT)throw Error('The instrument audition list is invalid.');
 const list=current.map(validateInstrument),value=validateInstrument(input),existing=list.find(item=>item.preset.id===value.preset.id);
 if(existing){if(JSON.stringify(existing)!==JSON.stringify(value))throw Error('That instrument id already has different content. Give each revised instrument a new preset id.');return list;}
 // Reference ids are reserved even if a caller omits them from its own list.
 const reserved=REFERENCES.find(item=>item.preset.id===value.preset.id);
 if(reserved&&JSON.stringify(reserved)!==JSON.stringify(value))throw Error('Reference instrument ids cannot be overwritten. Use a new preset id.');
 const imported=list.filter(item=>!REFERENCES.some(ref=>ref.preset.id===item.preset.id)).length;
 if(!reserved&&imported>=INSTRUMENT_IMPORT_LIMIT)throw Error('This audition supports six additional instruments. Registered instruments occupy slots; reload clears only this visit’s imports. Saved performances remain separate.');
 return [...list,value];
}
export function instrumentCameraFrame(input,width,height){
 const camera=validateInstrumentCamera(input);if(!camera)return null;
 const horizontal=width<height,yaw=camera.yaw*Math.PI/180,elevation=camera.elevation*Math.PI/180;
 return {position:{x:camera.target.x+Math.sin(yaw)*camera.radius*Math.cos(elevation),y:camera.target.y+camera.radius*Math.sin(elevation),z:camera.target.z-Math.cos(yaw)*camera.radius*Math.cos(elevation)},target:clone(camera.target),fov:horizontal?1.02:.78,horizontal};
}
