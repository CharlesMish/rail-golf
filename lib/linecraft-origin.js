import {RAIL_RULES,clamp} from './rail-golf-v02.js';

// Linecraft alone: a stopped launch-origin carriage. Legacy positions map
// exactly; the research lab's stops, free mode and TOUR do not enter play.
export const LINECRAFT_ORIGIN=Object.freeze({gate:Object.freeze({min:-10,max:10,step:.5}),lumber:Object.freeze({min:-10,max:10,step:.5})});
export function linecraftOrigin(setup){
 return Number.isFinite(setup.originX)?setup.originX:RAIL_RULES.railPositions[setup.railIndex];
}
export function validLinecraftOrigin(setup,station){
 const range=LINECRAFT_ORIGIN[station];
 if(!range||!Number.isFinite(setup.originX)||setup.originX<range.min||setup.originX>range.max)return false;
 return Math.abs(setup.originX/range.step-Math.round(setup.originX/range.step))<1e-8;
}
export function selectLinecraftOrigin(setup,station,requested){
 const range=LINECRAFT_ORIGIN[station];if(!range)throw Error('Unknown launch station');
 const originX=Math.round(clamp(requested,range.min,range.max)/range.step)*range.step;
 const railIndex=RAIL_RULES.railPositions.reduce((best,x,index)=>Math.abs(x-originX)<Math.abs(RAIL_RULES.railPositions[best]-originX)?index:best,0);
 return {...setup,railIndex,originX};
}
export function shiftLinecraftOrigin(setup,station,direction){
 return selectLinecraftOrigin(setup,station,linecraftOrigin(setup)+Math.sign(direction)*LINECRAFT_ORIGIN[station].step);
}
