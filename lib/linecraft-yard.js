import {collectShotStepEvents} from './rail-golf-v02.js';
import {collectLineStepEvents} from './line-recognition.js';
import {buildTimberReceiver,TIMBER_RECEIVER} from './timber-receiver.js';

// Opt-in physical additions. The two pads share an impulse, not a new rule:
// either one may activate the incumbent one-boost-per-shot vocabulary.
export const LINECRAFT_SECOND_PAD=Object.freeze({x:-15,z:84,halfWidth:6,halfDepth:6,minY:.2,maxY:.5,verticalSpeed:10.5,forwardKick:0});
export const LINECRAFT_CROSS_FACE=Object.freeze({x:-11,y:4,z:120,width:1.2,height:8,depth:12,yaw:28});

export function buildLinecraftReflectors(scene,root,materials,shadows,register){
 return {
  right:buildTimberReceiver(scene,root,materials,shadows,register,TIMBER_RECEIVER),
  cross:buildTimberReceiver(scene,root,materials,shadows,register,LINECRAFT_CROSS_FACE,{id:'linecraft-cross-face',label:'CROSS FACE RETURN'}),
 };
}

// Preserve existing event ordering and first-ground semantics. The extra pad
// supplies only a second candidate boost at its true swept contact position.
export function collectLinecraftStepEvents(start,end,hole,tags=[],routes=[]){
 const incumbent=collectLineStepEvents(start,end,hole,tags,routes,false);
 if(tags.includes('boost')||end.y>=start.y)return incumbent;
 const extra=collectShotStepEvents(start,end,{...hole,boost:LINECRAFT_SECOND_PAD},tags)
  .filter(event=>event.kind==='boost').map(event=>({...event,pad:'side'}));
 return [...incumbent,...extra].sort((a,b)=>a.amount-b.amount||Number(a.kind==='first-kiss')-Number(b.kind==='first-kiss'));
}
