import {COURTYARD_HOLES,COURTYARD_SKIP_PAD} from './courtyard.js';
import {YARD_STATIONS} from './stations.js';
// Score-lab authoring only. No production card or station is modified.
export const SAW_BAY=Object.freeze({id:'saw',label:'Saw Bay',x:-8,z:138,yaw:-180});
export const LINE_STATIONS=Object.freeze({...YARD_STATIONS,saw:SAW_BAY});
export const OPEN_LINE=Object.freeze({...COURTYARD_HOLES[0],id:'open-line',number:'04',shortName:'OPEN LINE',name:'Open Line',
 mode:'score-only',station:SAW_BAY,target:null,requiredTags:[],perfectAvailable:false,
 parLabel:'ONE LAUNCH · ONE LINE',instruction:'Make a line. No roost required.',boost:COURTYARD_SKIP_PAD,
 defaultShot:{railIndex:1,yaw:20,elevation:20},survey:{x:32,y:50,z:159,targetX:-8,targetY:3,targetZ:108}});
export const LINE_CARDS=Object.freeze([...COURTYARD_HOLES,OPEN_LINE]);
