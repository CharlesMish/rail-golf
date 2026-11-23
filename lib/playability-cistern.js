import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS,RINGWELL_GROUND} from './playgrounds-architecture.js';

const vec=a=>({x:a.x,y:a.y,z:a.z});
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const solids=[RINGWELL_GROUND,...RINGWELL_SOLIDS];
// Exact local box coordinates for the shipped Cistern's yaw-only physical boxes.
// This is a presentation query, never a physics collider or a changed trajectory.
function local(p,s){const a=(s.yaw??0)*Math.PI/180,c=Math.cos(a),n=Math.sin(a),x=p.x-s.x,z=p.z-s.z;return {x:x*c-z*n,y:p.y-s.y,z:x*n+z*c};}
export function cisternBoxSegment(start,end,solid,padding=0){
 const a=local(start,solid),b=local(end,solid),half={x:solid.w/2+padding,y:solid.h/2+padding,z:solid.d/2+padding};let near=0,far=1;
 for(const axis of ['x','y','z']){const d=b[axis]-a[axis];if(Math.abs(d)<1e-10){if(Math.abs(a[axis])>half[axis])return null;continue;}let x=(-half[axis]-a[axis])/d,y=(half[axis]-a[axis])/d;if(x>y)[x,y]=[y,x];near=Math.max(near,x);far=Math.min(far,y);if(near>far)return null;}
 return near;
}
export function cisternClearFraction(ball,camera,padding=.2){let fraction=1;for(const s of solids){const hit=cisternBoxSegment(ball,camera,s,padding);if(hit!==null)fraction=Math.min(fraction,hit);}return fraction;}
// A fixed-azimuth local overhead rig follows the actual ball without swinging
// around every rebound. At a wall its short boom rises. Cistern has no ceilings:
// a vertical escape
// direction is therefore a valid presentation fallback, not transparent masonry.
export function cisternFollowOffsets(ball){return {position:{x:ball.x-3,y:ball.y+14,z:ball.z-4},target:vec(ball)};}
export function cisternFlightFrame(frame,ball){
 const wanted=vec(frame.position);let chosen=wanted,blend=0;
 const elevated={x:ball.x+.04,y:Math.max(ball.y+14,wanted.y),z:ball.z-.04};
 for(let i=0;i<=16;i++){const t=i/16,candidate=mix(wanted,elevated,t);if(cisternClearFraction(ball,candidate)>=1){let low=Math.max(0,(i-1)/16),high=t;for(let n=0;n<10&&i>0;n++){const middle=(low+high)/2;if(cisternClearFraction(ball,mix(wanted,elevated,middle))>=1)high=middle;else low=middle;}blend=high;chosen=mix(wanted,elevated,blend);break;}if(i===16){const fraction=cisternClearFraction(ball,candidate),length=distance(ball,candidate);chosen=mix(ball,candidate,Math.max(0,fraction-.05/Math.max(.01,length)));blend=1;}}
 // Looking at the actual ball avoids the old forward look point vanishing inside
 // stone after a reversal. A tiny offset prevents a singular vertical look vector.
 return {position:chosen,target:vec(ball),fov:frame.fov,raised:blend>0,blend};
}
export function cisternTerminalLabel(record){
 if(!record)return '';
 if(record.reason==='interrupted')return `Stopped by you at ${record.elapsed.toFixed(2)} s. This is an interrupted attempt, not a landing.`;
 if(record.reason==='out-of-bounds'){
  const [x,y,z]=record.position,b=PLAYGROUNDS_ARCHITECTURE.bounds;
  const side=x<b.minX?'west':x>b.maxX?'east':z<b.minZ?'entry':z>b.maxZ?'far':y>b.maxY?'upper':'lower';
  return `Left the outer study boundary on the ${side} side at ${record.elapsed.toFixed(2)} s (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)} m). The room is open above its walls; the outer boundary is beyond the architecture.`;
 }
 if(record.reason==='settled')return `Slow motion on stone ended this shot at ${record.elapsed.toFixed(2)} s under the settling rule. It did not reach the dark terminal floor.`;
 if(record.reason==='first-ground-contact'){const id=record.contacts.at(-1)?.body;return `${id==='rw-launch-pier'?'Returned to the launch pier':'Reached the dark terminal floor'} at ${record.elapsed.toFixed(2)} s. First ground contact ended the shot.`;}
 return `${record.reason.replaceAll('-',' ')} at ${record.elapsed.toFixed(2)} s.`;
}
export const PLAYABILITY_CISTERN=Object.freeze({...PLAYGROUNDS_ARCHITECTURE,
 id:'playability-cistern',title:'Gallery Cistern',subtitle:'Follow a journey through the room',
 brief:'Aim from the entry. The blue gallery is high; the ochre gallery leads to the side chamber; the green landing is low. Dark floor and launch pier end a shot. Survey shows the whole room.',
 openInSurvey:false,overviewFlight:false,
 flightPresentation:{desired:cisternFollowOffsets,constrain:cisternFlightFrame,terminalLabel:cisternTerminalLabel,indexHref:'/lab/playability'},
});
