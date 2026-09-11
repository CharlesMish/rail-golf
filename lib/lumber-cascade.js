export const CASCADE_STEPS = Object.freeze([
  Object.freeze({id:'step-a',x:22,z:122,width:12,depth:12,top:8}),
  Object.freeze({id:'step-b',x:22,z:100,width:12,depth:16,top:5}),
  Object.freeze({id:'step-c',x:22,z:73,width:12,depth:16,top:2.5}),
]);
// Call only for a real Havok contact; side/underside strikes are not tread stamps.
export function cascadeContactTag(id, point) {
  const step = CASCADE_STEPS.find(item => item.id === id);
  if (!step || !point || Math.abs(point.y-step.top) > .15 || Math.abs(point.x-step.x) > step.width/2+.05 || Math.abs(point.z-step.z)>step.depth/2+.05) return null;
  return step.id;
}
