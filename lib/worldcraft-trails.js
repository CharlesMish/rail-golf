// Split the actual sampled polyline at a continuous dash phase. Babylon's
// CreateDashedLines drops short segments when samples are denser than a dash.
// Every visible fragment stays on a supplied segment; no simulation or smoothing.
export function worldcraftTrailDashes(points,dash=1,gap=.6){
 if(!(dash>0&&gap>0&&Number.isFinite(dash)&&Number.isFinite(gap)))throw Error('Invalid dash length');
 const lines=[];let visible=true,remaining=dash;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
  if(!Number.isFinite(length))throw Error('Invalid trail point');
  let used=0;
  const point=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  while(length-used>1e-9){
   const take=Math.min(remaining,length-used);
   if(visible)lines.push([point(used/length),point((used+take)/length)]);
   used+=take;remaining-=take;
   if(remaining<1e-9){visible=!visible;remaining=visible?dash:gap;}
  }
 }
 return lines;
}
