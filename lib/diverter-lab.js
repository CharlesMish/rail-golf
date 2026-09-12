import { YARD_STATIONS } from './stations.js';
export const DEFAULT_FLOOR = 'A';
export const isFloorState = value => value === 'A' || value === 'B';
export const FLOOR_STATES = Object.freeze({
  A:Object.freeze({label:'LEVEL',pitch:0,material:'amber'}),
  B:Object.freeze({label:'RISE',pitch:-12,material:'violet'}),
});
export const DIVERTER_FLOOR = Object.freeze({x:0,y:3,z:36,width:18,depth:16,height:.8});
export const DIVERTER_SWITCH = Object.freeze({x:12,y:3.5,z:16,width:4,height:5,depth:.7});
export const DIVERTER_TARGET = Object.freeze({id:'dispatch-bay',label:'Dispatch Bay',x:0,z:78,radius:7,material:'cyan',beaconHeight:9});
export const DIVERTER_HOLE = Object.freeze({
  id:'diverter-floor',number:'LAB',shortName:'DIVERTER',name:'Diverter Floor',kicker:'MILL EXPERIMENT',
  parLabel:'ONE CLEAN LANDING',perfectAvailable:false,station:YARD_STATIONS.gate,
  instruction:'Land on the cyan Dispatch Bay. Shoot the switch to change the timber floor: A is level, B raises its far edge. Both are live bounce surfaces.',
  courseLength:100,courseWidth:64,banks:[],requiredTags:[],breach:null,breachRecoveryY:null,water:null,
  wind:{id:'diverter-calm',x:0,z:0,label:'Still air',speedLabel:'CALM'},fairwayCenters:[],
  target:DIVERTER_TARGET,defaultShot:{railIndex:1,yaw:0,elevation:32},
  survey:{x:37,y:47,z:5,targetX:0,targetY:2,targetZ:43},
});
export const DIVERTER_HOLES = Object.freeze([DIVERTER_HOLE]);
export const DIVERTER_TARGETS = Object.freeze([DIVERTER_TARGET]);
export function floorForAction(current,action,saved) {
  if(!isFloorState(current)) throw new Error('Invalid floor state');
  if(action==='retry') return current;
  if(action==='reset'||action==='enter') return DEFAULT_FLOOR;
  if(action==='recall'&&isFloorState(saved?.floor)) return saved.floor;
  throw new Error('A recalled lab line needs its floor state');
}
