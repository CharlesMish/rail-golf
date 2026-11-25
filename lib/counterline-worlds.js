// A bounded bridge into the registered Foundry. These are the original world
// documents, not Counterline copies or a new authoring format.
import {foundryRecord} from './worldcraft-foundry.js';
import {rangeOpeningSetup,adaptRangePreset,createMusicalWorkshopPreset} from './worldcraft-range.js';
import {validateWorld,validateWorldcraftShot,worldcraftIdentity,worldcraftFixedSetup} from './worldcraft-model.js';
import {RAIL_RULES} from './rail-golf-v02.js';
const copy=value=>structuredClone(value);
export function counterlineWorlds(earlyPlate){
 const authored=['descending-resonance','chime-terraces'].map(id=>{
  const record=foundryRecord(id),presentation=record.manifest.presentation;
  const originalOpening=rangeOpeningSetup(record.preset),entry=record.manifest.testedShots.find(shot=>shot.id===(id==='descending-resonance'?'descent':'centre-climb'));
  return {id,label:record.manifest.name,world:copy(record.world),opening:entry?validateWorldcraftShot(record.world,entry.setup):originalOpening,originalOpening,entryLabel:entry?(id==='descending-resonance'?'Falling phrase · curated starting setup':'Rising chimes · curated starting setup'):'Original opening',invitation:record.manifest.invitation,profile:{version:1,dynamics:presentation?.dynamics??'total-speed',bankVoice:presentation?.bankVoice?'tuned-even':null},foundryId:id};
 });
 const preset=createMusicalWorkshopPreset(),opening=rangeOpeningSetup(preset);
 return [...authored,{id:'early-plate',label:'Musical Workshop · early plate study',world:validateWorld(earlyPlate),opening,originalOpening:opening,entryLabel:'Original opening',invitation:'A compact three-surface study. Listen for a short phrase, then try a nearby answer.',profile:{version:1,dynamics:'normal-speed',bankVoice:null},foundryId:null},{id:'workshop',label:'Musical Workshop · original arrangement',world:adaptRangePreset(preset).world,opening,originalOpening:opening,entryLabel:'Original opening',invitation:'The smaller original arrangement, retained as a solo and companion control.',profile:{version:1,dynamics:'normal-speed',bankVoice:null},foundryId:null}];
}
export function counterlineControls(world){
 const fixed=worldcraftFixedSetup(world),window=world.rules?.aimWindow;
 return {originX:fixed||world.rules?.originFixed?[world.launcher.x,world.launcher.x]:[-10,10],yaw:fixed?[fixed.yaw,fixed.yaw]:[window?.yawMin??RAIL_RULES.minYaw,window?.yawMax??RAIL_RULES.maxYaw],elevation:fixed?[fixed.elevation,fixed.elevation]:[window?.elevationMin??RAIL_RULES.minElevation,window?.elevationMax??RAIL_RULES.maxElevation],charge:fixed?[fixed.charge,fixed.charge]:[window?.chargeMin??0,window?.chargeMax??1]};
}
export function counterlineSetup(world,current,patch){
 const limits=counterlineControls(world),next={...current,...patch,railIndex:1};
 for(const key of ['originX','yaw','elevation','charge']){if(!Number.isFinite(next[key]))throw Error('Use a finite launch setting.');next[key]=Math.max(limits[key][0],Math.min(limits[key][1],next[key]));}
 next.originX=Math.round(next.originX*2)/2;
 return validateWorldcraftShot(world,next);
}
export function counterlineWorldMatch(worlds,world){const identity=worldcraftIdentity(world);return worlds.find(entry=>worldcraftIdentity(entry.world)===identity)??null;}
