import {clampYaw,clampElevation,shiftRail,clamp} from './rail-golf-v02.js';
import {maxLatchAfter} from './shot-tools.js';
import {RANGE_DEFAULT,RANGE_CAMERA} from './mechanism-range.js';
import {Vector3} from '@babylonjs/core';

// Input adapters use the incumbent rail/clamp/power authority; no physics changes.
export function rangeSetup(setup,patch){
 const next={...setup,...patch};
 return {...next,yaw:clampYaw(next.yaw),elevation:clampElevation(next.elevation),railIndex:shiftRail(next.railIndex,0),charge:clamp(next.charge,0,1)};
}
export function rangeRail(setup,direction){return {...setup,railIndex:shiftRail(setup.railIndex,direction)};}
export function rangeDrag(setup,dx,dy,pointerType){
 const sensitivity=pointerType==='touch'?.11:.075;
 return rangeSetup(setup,{yaw:setup.yaw+dx*sensitivity,elevation:setup.elevation-dy*sensitivity});
}
export function rangeRestore(action,current,saved,mode,max){
 return {setup:action==='reset'?{...RANGE_DEFAULT,charge:current.charge}:saved?{...saved}:{...current},
  mode:action==='recall'&&saved?'set':mode,max:maxLatchAfter(max,action)};
}
// A single mode controls both the label and the rendering destination. In particular,
// RESULT -> Survey -> launch must never fall into the old result-camera hold branch.
export function createRangeView(){
 let mode='launch';const listeners=new Set();
 return {getSnapshot:()=>mode,getServerSnapshot:()=> 'launch',subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  set(next){if(!['launch','survey','flight','impact'].includes(next))throw Error('Invalid camera mode');if(mode===next)return;mode=next;for(const fn of listeners)fn();},
  toggle(phase){if(!['ready','result'].includes(phase))return false;this.set(mode==='survey'?'launch':'survey');return true;},
 };
}
export const rangeViewLabel=mode=>mode==='survey'?'Return to launch view':'Survey the space';
export function stepRangeView(camera,target,mode,railX,dt,baseFov){
 if(mode!=='launch'&&mode!=='survey')return false;
 const to=Vector3.FromArray(mode==='survey'?RANGE_CAMERA.survey:RANGE_CAMERA.address);
 if(mode==='launch')to.x+=railX*.4;
 const look=Vector3.FromArray(mode==='survey'?RANGE_CAMERA.surveyLook:RANGE_CAMERA.look),ease=1-Math.exp(-Math.max(0,dt)*4);
 Vector3.LerpToRef(camera.position,to,ease,camera.position);Vector3.LerpToRef(target,look,ease,target);
 camera.fov+=(baseFov-camera.fov)*(1-Math.exp(-Math.max(0,dt)*3));return true;
}
export const RANGE_BLIND_BRIEF='Explore the range. No target or score. First ground contact ends the line.';
export const transferFeedback=(discovered,state)=>discovered?`TRANSFER ${state} · ${state==='A'?'LEVEL':'RAISED'}`:null;
