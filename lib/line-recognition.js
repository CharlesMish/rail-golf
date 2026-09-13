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
 const paid=new Set(),diagnostics=[],reported=new Set();
 const reject=(reason,p=pending)=>{
  if(!p)return;
  const key=reason+':'+p.feature.id+':'+p.body;
  if(reported.has(key))return;reported.add(key);
  diagnostics.push({kind:'rejected',reason,feature:p.feature.id,label:p.feature.label,body:p.body,point:p.point,
   incoming:p.incoming,outgoing:p.outgoing??undefined,freeSeconds:p.freeSeconds,separation:p.separation,contactSeconds:Math.max(0,p.last-p.first),
   ...(p.outgoing?{turn:angle(p.incoming,p.outgoing)}:{})});
 };
 return {
  beginStep(velocity,seconds){incoming=copy(velocity);time=seconds;touched=false;},
  contact(feature,body,point){
   touched=true;
   if(!feature){reject('interrupted-before-free-flight');pending=null;return;}
   if(paid.has(feature.id)){
    reject('interrupted-before-free-flight');
    reject('feature-already-scored',{feature,body,point:copy(point),incoming,first:time,last:time});pending=null;return;
   }
   if(pending?.body===body){pending.last=time;pending.point=copy(point);pending.outgoing=null;return;}
   // Only these two adjacent saw components may form one compound contact episode.
   if(pending?.feature.assembly==='saw'&&feature.assembly==='saw'&&time-pending.last<=gates.maxContactSeconds){
    pending.members.add(feature.id);pending.body=body;pending.last=time;pending.point=copy(point);pending.outgoing=null;
    if(pending.members.size>1)pending.feature={id:'saw-assembly',kind:'saw-assembly',label:'SAW ASSEMBLY REJECT',assembly:'saw'};
    return;
   }
   reject('interrupted-before-free-flight');
   pending={feature,body,point:copy(point),incoming:copy(incoming),first:time,last:time,outgoing:null,members:new Set([feature.id])};
  },
  endStep(position,velocity,seconds){
   if(!pending)return null;
   const p=pending;
   if(touched){p.outgoing=copy(velocity);return null;}
   if(p.last-p.first>gates.maxContactSeconds){reject('contact-too-long');pending=null;return null;}
   const separation=distance(position,p.point),freeSeconds=seconds-p.last;p.separation=separation;p.freeSeconds=freeSeconds;
   if(seconds-p.first>gates.maxWaitSeconds){reject(separation<gates.minSeparation?'insufficient-separation':'insufficient-free-flight');pending=null;return null;}
   if(freeSeconds<gates.freeSeconds||separation<gates.minSeparation)return null;
   pending=null;
   const turn=angle(p.incoming,p.outgoing ?? velocity);
   const reason=p.last-p.first>gates.maxContactSeconds?'contact-too-long':length(p.incoming)<gates.minIncomingSpeed?'incoming-speed-low':length(p.outgoing ?? velocity)<gates.minOutgoingSpeed?'outgoing-speed-low':turn<gates.minTurnDegrees?'turn-too-small':null;
   if(reason){reject(reason,p);return null;}
   for(const id of p.members)paid.add(id);paid.add(p.feature.id);
   return {kind:'redirect',surface:p.feature.kind,feature:p.feature.id,label:p.feature.label,body:p.body,point:p.point,members:[...p.members],
    incoming:p.incoming,outgoing:p.outgoing,turn,freeSeconds,separation};
  },
  finish(){reject(pending&&pending.last-pending.first>gates.maxContactSeconds?'contact-too-long':'shot-ended-before-free-flight');pending=null;},
  drainDiagnostics(){return diagnostics.splice(0);}
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
