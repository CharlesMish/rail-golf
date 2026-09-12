import { COURTYARD_HOLES, COURTYARD_TARGETS } from './courtyard.js';
export const YARD_DIVERTER_FLOOR=Object.freeze({x:-4,y:3,z:60,width:14,depth:14,height:.8});
export const YARD_DIVERTER_SWITCH=Object.freeze({x:13,y:3.5,z:20,width:4,height:5,depth:.7});
export const YARD_DISPATCH=Object.freeze({id:'yard-dispatch',label:'Dispatch Bay',x:-9,z:112,radius:7,material:'cyan',beaconHeight:12});
export const COURTYARD_DIVERTER=Object.freeze({
 ...COURTYARD_HOLES[0],id:'courtyard-diverter',number:'LAB',shortName:'DISPATCH',name:'Mill Diverter',
 kicker:'TIMBER COURTYARD · EXPERIMENT',instruction:'The mill diverter can be switched. Land on Dispatch Bay.',
 target:YARD_DISPATCH,defaultShot:{railIndex:1,yaw:0,elevation:32},
});
export const COURTYARD_DIVERTER_HOLES=Object.freeze([COURTYARD_DIVERTER]);
export const COURTYARD_DIVERTER_TARGETS=Object.freeze([...COURTYARD_TARGETS,YARD_DISPATCH]);
export const YARD_DIVERTER_OPTIONS=Object.freeze({overlay:true,states:{A:{pitch:0,roll:0,material:'amber'},B:{pitch:0,roll:8,material:'violet'}},floor:YARD_DIVERTER_FLOOR,switch:YARD_DIVERTER_SWITCH,target:YARD_DISPATCH});
