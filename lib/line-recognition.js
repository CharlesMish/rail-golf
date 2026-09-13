import {cascadeContactTag} from './lumber-cascade.js';
import {collectDeliveryStepEvents,segmentTokenIntersection} from './delivery-routes.js';
// NON-CANONICAL PLACEHOLDERS: recognition thresholds, not physics tuning.
export const REDIRECT_GATES=Object.freeze({minIncomingSpeed:4,minOutgoingSpeed:3,minTurnDegrees:25,maxContactSeconds:.12,freeSeconds:.10,minSeparation:1,maxWaitSeconds:.65,minReturnHorizontalSpeed:3,minReturnTurnDegrees:120});
const copy=v=>({x:v.x,y:v.y,z:v.z});
const length=v=>Math.hypot(v.x,v.y,v.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y+a.z*b.z)/(length(a)*length(b)||1))))*180/Math.PI;
// One candidate episode across explicitly tagged contiguous bodies. Other solids interrupt.
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
   // Tagged assemblies share one continuous episode until a confirmed free-flight departure.
   if(pending?.feature.assembly&&pending.feature.assembly===feature.assembly&&time-pending.last<=gates.maxContactSeconds){
    pending.members.add(feature.id);pending.body=body;pending.last=time;pending.point=copy(point);pending.outgoing=null;
    if(pending.members.size>1){const group=feature.assembly;pending.feature={id:group==='saw'?'saw-assembly':group+'-assembly',kind:group==='saw'?'saw-assembly':group==='mill'?'mill':'lumber',label:group==='saw'?'SAW ASSEMBLY REJECT':feature.assemblyLabel??'LUMBER REBOUND',assembly:group,assemblyLabel:feature.assemblyLabel};}
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

// Local directed relationship: never substitutes for the generic COMMON tracker.
export const SAW_MILL_GATES=Object.freeze({maxTransitSeconds:1,maxEpisodeSeconds:1.5,minSawTurnDegrees:12});
export function createSawMillTracker(gates=REDIRECT_GATES,local=SAW_MILL_GATES){
 let incoming={x:0,y:0,z:0},time=0,touched=false,p=null,paid=false,blocked=false,lastContact=-Infinity;
 return {
  beginStep(v,t){incoming=copy(v);time=t;touched=false;},
  contact(feature,body,point){
   touched=true;lastContact=time;if(paid||blocked)return;
   const saw=feature?.assembly==='saw',mill=feature?.kind==='mill';
   if(!saw&&!mill){p=null;return;}
   if(saw){
    if(!p||p.phase!=='saw'||time-p.last>gates.maxContactSeconds)p={phase:'saw',first:time,firstIncoming:copy(incoming),sawFirst:time,members:new Set()};
    p.members.add(feature.id);p.last=time;p.sawDuration=time-p.sawFirst;
    if(p.sawDuration>gates.maxContactSeconds||length(p.firstIncoming)<gates.minIncomingSpeed){p=null;blocked=true;}
    return;
   }
   if(!p)return;
   if(p.phase==='saw'){
    if(time-p.last>local.maxTransitSeconds||length(incoming)<gates.minIncomingSpeed||!p.sawOutgoing||angle(p.firstIncoming,p.sawOutgoing)<local.minSawTurnDegrees){p=null;return;}
    p.phase='mill';p.millFirst=time;p.millIncoming=copy(incoming);p.body=body;
   }else if(p.body!==body){p=null;return;}
   p.members.add(feature.id);p.last=time;p.point=copy(point);p.outgoing=null;
  },
  endStep(position,velocity,seconds){
   if(blocked&&!touched&&seconds-lastContact>=gates.freeSeconds)blocked=false;
   if(!p||paid)return null;
   if(seconds-p.first>local.maxEpisodeSeconds){p=null;return null;}
   if(p.phase==='saw'){if(touched)p.sawOutgoing=copy(velocity);if(seconds-p.last>local.maxTransitSeconds)p=null;return null;}
   if(p.last-p.millFirst>gates.maxContactSeconds){p=null;return null;}
   if(touched){p.outgoing=copy(velocity);return null;}
   const freeSeconds=seconds-p.last,separation=distance(position,p.point);
   if(freeSeconds<gates.freeSeconds||separation<gates.minSeparation)return null;
   const episode=p;p=null;
   const turn=angle(episode.millIncoming,episode.outgoing??velocity);
   if(length(episode.outgoing??velocity)<gates.minOutgoingSpeed||turn<gates.minTurnDegrees)return null;
   paid=true;
   return {kind:'relationship',surface:'saw-mill',feature:'saw-mill',label:'SAW → MILL',body:episode.body,point:episode.point,members:[...episode.members],incoming:episode.firstIncoming,outgoing:episode.outgoing,turn,freeSeconds,separation};
  }
 };
}
