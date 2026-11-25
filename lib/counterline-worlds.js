// A bounded bridge into the registered Foundry. These are the original world
// documents, not Counterline copies or a new authoring format.
import {foundryRecord} from './worldcraft-foundry.js';
import {rangeOpeningSetup,adaptRangePreset,createMusicalWorkshopPreset} from './worldcraft-range.js';
import {validateWorld,validateWorldcraftShot,worldcraftIdentity,worldcraftFixedSetup} from './worldcraft-model.js';
import {resultFraming} from './worldcraft-play-copy.js';
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

// Reuse the authored Foundry side-result orbit for the taller musical worlds.
// Camera presentation never changes the physical world or the recorded line.
export function counterlineCameraFrame(world,setup,view,width,height,foundryId=null,record=null){
 const horizontal=width<height,radians=setup.yaw*Math.PI/180;
 if(view==='overview'){
  const orbit=resultFraming(world,record,foundryId);
  if(orbit)return {position:{x:orbit.x+Math.sin(orbit.angle)*orbit.radius*Math.cos(orbit.elevation),y:orbit.radius*Math.sin(orbit.elevation),z:orbit.z-Math.cos(orbit.angle)*orbit.radius*Math.cos(orbit.elevation)},target:{x:orbit.x,y:1,z:orbit.z},fov:horizontal?1.02:.78,horizontal};
  return {position:{x:48,y:75,z:-25},target:{x:0,y:1,z:40},fov:horizontal?1.02:.82,horizontal};
 }
 return {position:{x:setup.originX-Math.sin(radians)*15,y:7.8,z:-Math.cos(radians)*15},target:{x:setup.originX+Math.sin(radians)*34,y:3.6,z:Math.cos(radians)*34},fov:foundryId==='chime-terraces'?(horizontal?1.12:.86):(horizontal?.96:.69),horizontal};
}
