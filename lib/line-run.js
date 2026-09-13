// NON-CANONICAL seasoning, sampled at the unchanged physical step.
export const RUN_RULE=Object.freeze({metresPerStep:25,pointsPerStep:25,cap:150,minSpeed:3,freeSeconds:.1});
export function createRunTracker(rules=RUN_RULE){
 let armed=false,touched=false,lastContact=-Infinity,previous=null,metres=0,milestone=0;
 return {
  beginStep(){touched=false;},contact(){touched=true;},
  step(position,velocity,seconds,hasClaim){
   const p={x:position.x,y:position.y,z:position.z};
   if(touched)lastContact=seconds;
   if(!armed){previous=p;if(hasClaim)armed=true;return null;}
   const length=previous?Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z):0;previous=p;
   if(touched||seconds-lastContact<rules.freeSeconds||Math.hypot(velocity.x,velocity.y,velocity.z)<rules.minSpeed||!Number.isFinite(length))return null;
   metres+=length;
   const next=Math.min(rules.cap/rules.pointsPerStep,Math.floor(metres/rules.metresPerStep));
   if(next<=milestone)return null;milestone=next;
   return {kind:'run',distance:metres};
  },
  snapshot(){return armed?{kind:'run',distance:metres}:null;}
 };
}
