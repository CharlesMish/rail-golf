import {RAIL_RULES,clamp} from './rail-golf-v02.js';
import {rangeSetup} from './mechanism-range-controls.js';
import {RANGE_DEFAULT,RANGE_BOUNDS,rangeEnd} from './mechanism-range.js';

// Origin choice only: the shared session owns muzzle, launch speed, mass and gravity.
export const TEE_STOPS=Object.freeze([-20,-10,0,10,20]);
export const TEE_TRACK=Object.freeze({min:-20,max:20,step:.5});
export const TEE_TOUR=Object.freeze({speed:2,period:40});
export const TEE_MODES=Object.freeze([
 Object.freeze({id:'rails',label:'3 RAILS'}),
 Object.freeze({id:'stops',label:'5 STOPS'}),
 Object.freeze({id:'continuous',label:'FREE / STOPPED CARRIAGE'}),
 Object.freeze({id:'tour',label:'TOUR'}),
]);
export const TEE_DEFAULT=Object.freeze({...RANGE_DEFAULT,carriageMode:'stops',originX:0});
const nearest=(value,points)=>points.reduce((best,x)=>Math.abs(value-x)<Math.abs(value-best)?x:best,points[0]);
export function normalizeTeeSetup(setup){
 const base=rangeSetup(setup,{}),carriageMode=TEE_MODES.some(m=>m.id===setup.carriageMode)?setup.carriageMode:'stops';
 delete base.tourRunning;delete base.tourDirection;
 const requested=Number.isFinite(setup.originX)?setup.originX:0;
 if(carriageMode==='rails')return {...base,carriageMode,originX:RAIL_RULES.railPositions[base.railIndex]};
 const clamped=clamp(requested,TEE_TRACK.min,TEE_TRACK.max);
 if(carriageMode==='tour')return {...base,carriageMode,railIndex:1,originX:clamped,tourDirection:clamped===TEE_TRACK.min?1:clamped===TEE_TRACK.max?-1:setup.tourDirection===-1?-1:1,tourRunning:setup.tourRunning===true};
 const originX=carriageMode==='stops'?nearest(clamped,TEE_STOPS):Math.round(clamped/TEE_TRACK.step)*TEE_TRACK.step;
 return {...base,carriageMode,railIndex:1,originX};
}
export function teeOriginPoints(mode){return mode==='rails'?RAIL_RULES.railPositions:mode==='stops'?TEE_STOPS:null;}
export function selectTeeMode(setup,carriageMode){
 const x=normalizeTeeSetup(setup).originX;
 const railIndex=carriageMode==='rails'?RAIL_RULES.railPositions.indexOf(nearest(x,RAIL_RULES.railPositions)):1;
 return normalizeTeeSetup({...setup,carriageMode,railIndex,originX:x,...(carriageMode==='tour'?{tourRunning:true}: {})});
}
export function selectTeeOrigin(setup,x){
 const normalized=normalizeTeeSetup(setup);
 return normalizeTeeSetup({...normalized,originX:x,...(normalized.carriageMode==='tour'?{tourRunning:false}:{}),...(normalized.carriageMode==='rails'?{railIndex:RAIL_RULES.railPositions.indexOf(nearest(x,RAIL_RULES.railPositions))}:{})});
}
export function shiftTeeOrigin(setup,direction){
 const current=normalizeTeeSetup(setup),points=teeOriginPoints(current.carriageMode);
 if(points){const i=points.indexOf(current.originX),j=clamp(i+Math.sign(direction),0,points.length-1);return selectTeeOrigin(current,points[j]);}
 return selectTeeOrigin(current,current.originX+Math.sign(direction));
}
export function teeStation(setup){
 const s=normalizeTeeSetup(setup);
 return {id:'travelling-tee',label:'Transfer Track',x:s.carriageMode==='rails'?0:s.originX,z:0,yaw:0};
}
// Analytic reflected travel: independent of animation frame count and no platform
// velocity ever enters the launch equation. The UI advances again at release.
export function advanceTeeTour(setup,seconds,phase){
 if(setup.carriageMode!=='tour'||!setup.tourRunning||!['ready','charging'].includes(phase)||!Number.isFinite(seconds)||seconds<=0)return setup;
 const current=normalizeTeeSetup(setup),length=TEE_TRACK.max-TEE_TRACK.min,span=length*2;
 const offset=current.originX-TEE_TRACK.min,at=current.tourDirection===1?offset:span-offset;
 const next=(at+TEE_TOUR.speed*seconds)%span;
 return {...current,originX:TEE_TRACK.min+(next<=length?next:span-next),tourDirection:next<length?1:-1};
}
export function setTeeTourRunning(setup,running){
 if(setup.carriageMode!=='tour')return setup;
 return normalizeTeeSetup({...setup,tourRunning:Boolean(running)});
}
export function restoreTeeOrigin(setup,action){
 if(action==='reset')return {...TEE_DEFAULT,charge:setup.charge};
 return setTeeTourRunning(normalizeTeeSetup(setup),false);
}
// Return only the origin context. Aim, elevation, power and Transfer state remain
// the player's current choices; full Recall remains the separate exact-line action.
export function returnToTeeOrigin(setup,saved){
 if(!saved)return setup;
 const origin=normalizeTeeSetup(saved);
 return normalizeTeeSetup({...setup,carriageMode:origin.carriageMode,railIndex:origin.railIndex,originX:origin.originX,tourDirection:origin.tourDirection,tourRunning:false});
}
export const TEE_ORIGIN_CONTROL=Object.freeze({modes:TEE_MODES,modeKey:'carriageMode',positionKey:'originX',tourMode:'tour',...TEE_TRACK,stops:teeOriginPoints,normalize:normalizeTeeSetup,shift:shiftTeeOrigin,selectMode:selectTeeMode,select:selectTeeOrigin,advance:advanceTeeTour,recover:restoreTeeOrigin,setRunning:setTeeTourRunning,returnTo:returnToTeeOrigin});
export const TEE_BOUNDS=RANGE_BOUNDS;
export const teeEnd=rangeEnd;
