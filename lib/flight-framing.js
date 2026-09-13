// Presentation only: transport the follow rig with the projectile, then ease its offsets.
// No physics clocks, bodies, trajectories or score samples are touched here.
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const scale=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=a=>scale(a,1/(Math.hypot(a.x,a.y,a.z)||1));
const mix=(a,b,t)=>add(scale(a,1-t),scale(b,t));
export function followOffsets(ball,velocity,direction){
 const height=Math.min(1,Math.max(0,ball.y-12)/70),vertical=Math.min(1,Math.abs(velocity.y)/65);
 return {position:add(sub(ball,scale(direction,12+height*10+vertical*4)),{x:0,y:5.5+height*6,z:0}),
 target:add(add(ball,scale(direction,4-height*2)),{x:0,y:1.2+Math.max(-2,Math.min(3,velocity.y*.05)),z:0})};
}
export function projectileScreen(frame,ball,aspect,horizontal=false){
 const forward=norm(sub(frame.target,frame.position)),right=norm({x:forward.z,y:0,z:-forward.x});
 const up={x:forward.y*right.z,y:forward.z*right.x-forward.x*right.z,z:-forward.y*right.x};
 const d=sub(ball,frame.position),depth=dot(d,forward),tan=Math.tan(frame.fov/2);
 const tx=horizontal?tan:tan*aspect,ty=horizontal?tan/aspect:tan;
 return {x:dot(d,right)/(depth*tx),y:dot(d,up)/(depth*ty),depth};
}
export function advanceFlightCamera(frame,ball,previousBall,desired,dt,aspect,horizontal=false,baseFov=.69){
 const shift=previousBall?sub(ball,previousBall):{x:0,y:0,z:0},ease=1-Math.exp(-7*dt);
 const result={position:mix(add(frame.position,shift),desired.position,ease),target:mix(add(frame.target,shift),desired.target,ease),fov:frame.fov};
 const screen=projectileScreen(result,ball,aspect,horizontal);
 const demand=Math.max(Math.abs(screen.x),Math.abs(screen.y))/.65;
 const needed=2*Math.atan(Math.tan(frame.fov/2)*Math.max(1,demand));
 const goal=Math.max(baseFov,Math.min(1.25,needed));
 result.fov=frame.fov+(goal-frame.fov)*(1-Math.exp(-dt*(goal>frame.fov?12:2)));
 // Ease back to the normal lens when there is ample room. No sudden zoom reset on descent.
 if(demand<.8)result.fov+=(baseFov-result.fov)*(1-Math.exp(-2*dt));
 return result;
}

export function followHeading(direction,velocity,dt){
 if(Math.hypot(velocity.x,velocity.z)<.1)return {...direction};
 const current=Math.atan2(direction.x,direction.z),desired=Math.atan2(velocity.x,velocity.z);
 const difference=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
 const angle=current+difference*(1-Math.exp(-5*dt));
 return {x:Math.sin(angle),y:0,z:Math.cos(angle)};
}
