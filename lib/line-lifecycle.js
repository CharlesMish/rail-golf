// Score-lab safety is separate from semantic spatial OOB. Production timing is untouched.
export const LINE_SAFETY=Object.freeze({hardCapSeconds:60,settledSpeed:.6,settledSeconds:3,settledAfter:5});
export function createLineLifecycle(rules=LINE_SAFETY){
 let slowSince=null;
 return {step(point,velocity,elapsed){
  if(![point.x,point.y,point.z,velocity.x,velocity.y,velocity.z].every(Number.isFinite))return 'invalid-physics';
  if(Math.abs(point.x)>50||point.z>198||point.z< -15||point.y< -8)return 'oob';
  if(elapsed>=rules.hardCapSeconds)return 'safety-timeout';
  if(Math.hypot(velocity.x,velocity.y,velocity.z)<rules.settledSpeed){slowSince??=elapsed;
   if(elapsed>=rules.settledAfter&&elapsed-slowSince>=rules.settledSeconds)return 'dead-ball';
  }else slowSince=null;
  return null;
 }};
}
