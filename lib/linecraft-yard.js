import {collectShotStepEvents} from './rail-golf-v02.js';
import {collectLineStepEvents} from './line-recognition.js';
import {buildTimberReceiver,TIMBER_RECEIVER} from './timber-receiver.js';
import {MeshBuilder,PhysicsAggregate,PhysicsShapeType} from '@babylonjs/core';

// The two added pads share the incumbent impulse and one-boost-per-shot rule.
export const LINECRAFT_SECOND_PAD=Object.freeze({x:-15,z:84,halfWidth:6,halfDepth:6,minY:.2,maxY:.5,verticalSpeed:10.5,forwardKick:0});
export const LINECRAFT_THIRD_PAD=Object.freeze({x:0,z:62,halfWidth:6,halfDepth:6,minY:.2,maxY:.5,verticalSpeed:10.5,forwardKick:0});
export const LINECRAFT_EXTRA_PADS=Object.freeze([LINECRAFT_SECOND_PAD,LINECRAFT_THIRD_PAD]);
export const LINECRAFT_LOW_STACK=Object.freeze({x:-11,y:1.8,z:120,width:5.8,height:3.6,depth:12,yaw:28});

function buildLowStack(scene,root,materials,shadows,register){
 const g=LINECRAFT_LOW_STACK;
 const stack=MeshBuilder.CreateBox('linecraft-low-stack',{width:g.width,height:g.height,depth:g.depth},scene);
 stack.parent=root;stack.position.set(g.x,g.y,g.z);stack.rotation.y=g.yaw*Math.PI/180;
 stack.material=materials.timber;stack.receiveShadows=true;shadows.addShadowCaster(stack);
 stack.metadata={lineFeature:{id:'linecraft-low-stack',kind:'lumber',label:'LUMBER REBOUND',assembly:'lumber:linecraft-low-stack',assemblyLabel:'LUMBER REBOUND'}};
 const body=new PhysicsAggregate(stack,PhysicsShapeType.BOX,{mass:0,friction:.18,restitution:.86},scene);register(body);
 // End grain, layer seams, and bands hug the single physical silhouette.
 const trim=(name,x,y,z,width,height,depth,material)=>{
  const mesh=MeshBuilder.CreateBox(name,{width,height,depth},scene);
  mesh.parent=stack;mesh.position.set(x,y,z);mesh.material=materials[material];mesh.isPickable=false;
 };
 for(let layer=0;layer<5;layer++){
  const y=-g.height/2+(layer+.5)*g.height/5;
  trim('linecraft-stack-seam',0,y-g.height/10,-g.depth/2-.025,g.width-.08,.045,.03,'bark');
  for(let plank=0;plank<5;plank++)trim('linecraft-stack-grain',-g.width/2+(plank+.5)*g.width/5,y,-g.depth/2-.025,g.width/5-.09,g.height/5-.12,.035,(plank+layer)%3?'brick':'sand');
 }
 for(const z of [-g.depth/3,g.depth/3])trim('linecraft-stack-band',0,g.height/2-.025,z,g.width-.04,.045,.2,'machine');
 return {stack,body};
}

export function buildLinecraftReflectors(scene,root,materials,shadows,register){
 return {
  right:buildTimberReceiver(scene,root,materials,shadows,register,TIMBER_RECEIVER),
  cross:buildLowStack(scene,root,materials,shadows,register),
 };
}

// Preserve existing event ordering and first-ground semantics. Extra pads
// supply candidates at their true swept contact positions, never a new rule.
export function collectLinecraftStepEvents(start,end,hole,tags=[],routes=[]){
 const incumbent=collectLineStepEvents(start,end,hole,tags,routes,false);
 if(tags.includes('boost')||end.y>=start.y)return incumbent;
 const extra=LINECRAFT_EXTRA_PADS.flatMap((pad,index)=>collectShotStepEvents(start,end,{...hole,boost:pad},tags)
  .filter(event=>event.kind==='boost').map(event=>({...event,pad:index===0?'side':'center'})));
 return [...incumbent,...extra].sort((a,b)=>a.amount-b.amount||Number(a.kind==='first-kiss')-Number(b.kind==='first-kiss'));
}
