import {COURTYARD_HOLES,COURTYARD_SKIP_PAD} from './courtyard.js';
import {YARD_STATIONS} from './stations.js';
// Score-lab authoring only. No production card or station is modified.
export const SAW_BAY=Object.freeze({id:'saw',label:'Saw Bay',x:-8,z:138,yaw:-180});
export const LINE_STATIONS=YARD_STATIONS;
export const OPEN_LINE=Object.freeze({...COURTYARD_HOLES[0],id:'open-line',number:'04',shortName:'OPEN LINE',name:'Open Line',
 mode:'score-only',allowedStations:['gate','lumber'],station:YARD_STATIONS.gate,target:null,requiredTags:[],perfectAvailable:false,
 parLabel:'ONE LAUNCH · ONE LINE',instruction:'Make a line. No roost required.',boost:COURTYARD_SKIP_PAD,
 defaultShot:{railIndex:1,yaw:0,elevation:42}});
export const LINE_CARDS=Object.freeze([...COURTYARD_HOLES,OPEN_LINE]);

// Retained for source fixtures and explicit historical ShareLineV1 links, never default UI.
export const SAW_BAY_OPEN_LINE=Object.freeze({...OPEN_LINE,station:SAW_BAY,defaultShot:{railIndex:1,yaw:20,elevation:20},survey:{x:32,y:50,z:159,targetX:-8,targetY:3,targetZ:108}});
export function selectOpenLineStation(id,{allowParked=false}={}){
 if(id==='saw'&&allowParked)return SAW_BAY_OPEN_LINE;
 if(!OPEN_LINE.allowedStations.includes(id))throw Error('Unsupported Open Line station');
 const basis=id==='lumber'?COURTYARD_HOLES[2]:COURTYARD_HOLES[0];
 return {...OPEN_LINE,station:YARD_STATIONS[id],defaultShot:{...basis.defaultShot},survey:{...basis.survey}};
}
export function acceptsLineStation(card,id){
 return card.mode==='score-only' ? card.allowedStations.includes(id)||id==='saw' : id===(card.station?.id??'gate');
}
