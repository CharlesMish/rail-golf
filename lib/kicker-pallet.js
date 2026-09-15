import {buildDiverterLab} from './diverter-scene.js';
// Sparse west apron, ahead of the loading platform and outside either bank footprint.
// One passive pallet. No destination, ground extension or altered existing collider.
export const KICKER_PALLET=Object.freeze({x:-32,y:.5,z:39,width:10,height:.8,depth:8});
export const KICKER_SWITCH=Object.freeze({x:-39,y:2.2,z:35,width:2.4,height:3.4,depth:.7});
export const KICKER_STATES=Object.freeze({A:{pitch:0,roll:0,material:'amber'},B:{pitch:0,roll:-18,yOffset:1.53,material:'violet'}});
export function buildKickerPallet(scene,root,materials,shadows,initial='A',target=null){
 return buildDiverterLab(scene,root,materials,shadows,initial,{overlay:true,supports:false,palletBoards:true,switchLabel:'PALLET SWITCH',prefix:'kicker-',floor:KICKER_PALLET,switch:KICKER_SWITCH,states:KICKER_STATES,target,
  feature:{id:'kicker-pallet',kind:'pallet',label:'KICKER PALLET REBOUND'}});
}
