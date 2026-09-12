import { COURTYARD_HOLES, COURTYARD_TARGETS } from './courtyard.js';
export const YARD_DIVERTER_FLOOR=Object.freeze({x:-28,y:.55,z:63,width:15,depth:17,height:1.1});
export const YARD_DIVERTER_SWITCH=Object.freeze({x:13,y:3.5,z:20,width:4,height:5,depth:.7});
export const YARD_DISPATCH=COURTYARD_TARGETS[0];
export const COURTYARD_DIVERTER=Object.freeze({
 ...COURTYARD_HOLES[0],id:'courtyard-diverter',number:'LAB',shortName:'DOCK',name:'Mill Loading Dock',
 kicker:'TIMBER COURTYARD · EXPERIMENT',instruction:'The loading dock can be switched. Explore a line to the Mill Bell.',
 target:YARD_DISPATCH,defaultShot:{railIndex:1,yaw:0,elevation:32},
});
export const COURTYARD_DIVERTER_HOLES=Object.freeze([COURTYARD_DIVERTER]);
export const COURTYARD_DIVERTER_TARGETS=COURTYARD_TARGETS;
export const YARD_DIVERTER_OPTIONS=Object.freeze({overlay:true,supports:false,states:{A:{pitch:0,roll:0,material:'amber'},B:{pitch:0,roll:8,yOffset:7.5*Math.sin(8*Math.PI/180)+.55*Math.cos(8*Math.PI/180)-.55,material:'violet'}},floor:YARD_DIVERTER_FLOOR,switch:YARD_DIVERTER_SWITCH,target:YARD_DISPATCH});
