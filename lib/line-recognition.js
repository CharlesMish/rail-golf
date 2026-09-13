import {cascadeContactTag} from './lumber-cascade.js';
import {collectDeliveryStepEvents,segmentTokenIntersection} from './delivery-routes.js';
// NON-CANONICAL PLACEHOLDERS: recognition thresholds, not physics tuning.
export const REDIRECT_GATES=Object.freeze({minIncomingSpeed:4,minOutgoingSpeed:3,minTurnDegrees:25,maxContactSeconds:.12,freeSeconds:.10,minSeparation:1,maxWaitSeconds:.65,minReturnHorizontalSpeed:3,minReturnTurnDegrees:120});
const copy=v=>({x:v.x,y:v.y,z:v.z});
const length=v=>Math.hypot(v.x,v.y,v.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y+a.z*b.z)/(length(a)*length(b)||1))))*180/Math.PI;
// One candidate contact episode. Any further solid contact interrupts free flight.
// Incoming velocity is sampled BEFORE the solver; outgoing velocity AFTER it.
export function createRedirectTracker(gates=REDIRECT_GATES){
 let incoming={x:0,y:0,z:0},pending=null,time=0,touched=false;
 const paid=new Set();
 return {
  beginStep(velocity,seconds){incoming=copy(velocity);time=seconds;touched=false;},
  contact(feature,body,point){
   touched=true;
   if(!feature||paid.has(feature.id)){pending=null;return;}
   if(pending?.body===body){pending.last=time;pending.point=copy(point);pending.outgoing=null;return;}
   pending={feature,body,point:copy(point),incoming:copy(incoming),first:time,last:time,outgoing:null};
  },
  endStep(position,velocity,seconds){
   if(!pending)return null;
   const p=pending;
   if(touched){p.outgoing=copy(velocity);return null;}
   if(seconds-p.first>gates.maxWaitSeconds){pending=null;return null;}
   if(seconds-p.last<gates.freeSeconds||distance(position,p.point)<gates.minSeparation)return null;
   pending=null;
   const turn=angle(p.incoming,p.outgoing ?? velocity);
   if(p.last-p.first>gates.maxContactSeconds||length(p.incoming)<gates.minIncomingSpeed||length(p.outgoing ?? velocity)<gates.minOutgoingSpeed||turn<gates.minTurnDegrees)return null;
   paid.add(p.feature.id);
   return {kind:'redirect',surface:p.feature.kind,feature:p.feature.id,label:p.feature.label,body:p.body,point:p.point,
    incoming:p.incoming,outgoing:p.outgoing,turn,freeSeconds:seconds-p.last,separation:distance(position,p.point)};
  }
 };
}

// Same powered pad and token authority from either station; only the lab broadens token availability.
export function collectLineStepEvents(start,end,hole,tags=[],routes=[]){
 const events=collectDeliveryStepEvents(start,end,hole,tags,routes);
 if(hole.id!=='mill-delivery'&&!routes.includes('sky')){
  const amount=segmentTokenIntersection(start,end);
  if(amount!==null)events.push({kind:'sky',amount,point:{x:start.x+(end.x-start.x)*amount,y:start.y+(end.y-start.y)*amount,z:start.z+(end.z-start.z)*amount}});
 }
 return events.sort((a,b)=>a.amount-b.amount||Number(a.kind==='sky')-Number(b.kind==='sky'));
}

export function redirectFeature(node,point){
 const feature=node.metadata?.lineFeature;
 if(node.metadata?.cascadeStep&&!cascadeContactTag(node.metadata.cascadeStep,point))return feature?{...feature,kind:'lumber',label:'TREAD SIDE REJECT'}:undefined;
 return feature;
}
