import {Camera,FreeCamera,Matrix,MeshBuilder,NullEngine,Ray,Scene,Vector3} from '@babylonjs/core';
import {YARD_STATIONS,stationRailPosition} from '../../lib/stations.js';

// Test-only projection of the exact incumbent settled FAMILIAR address camera.
// A conservative solid-box silhouette; no assertion about rendered material quality.
export function receiverProjection(geometry,{station='lumber',railIndex=1,yaw=-65,width=1440,height=900}={}){
 const engine=new NullEngine({renderWidth:width,renderHeight:height}),scene=new Scene(engine);
 const rail=stationRailPosition(railIndex,YARD_STATIONS[station]),angle=(yaw+YARD_STATIONS[station].yaw)*Math.PI/180;
 const direction=new Vector3(Math.sin(angle),0,Math.cos(angle)),origin=new Vector3(rail.x,.4,rail.z);
 const camera=new FreeCamera('familiar-address',origin.subtract(direction.scale(15)).add(new Vector3(0,7.4,0)),scene);
 camera.setTarget(origin.add(direction.scale(34)).add(new Vector3(0,3.2,0)));
 camera.fovMode=width<height?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.fov=width<height?.92:.69;
 const wall=MeshBuilder.CreateBox('receiver-projection',{width:geometry.width,height:geometry.height,depth:geometry.depth},scene);
 wall.position.set(geometry.x,geometry.y,geometry.z);wall.rotation.y=geometry.yaw*Math.PI/180;wall.computeWorldMatrix(true);
 const transform=camera.getViewMatrix().multiply(camera.getProjectionMatrix()),viewport=camera.viewport.toGlobal(width,height);
 const project=p=>Vector3.Project(p,Matrix.Identity(),transform,viewport);
 const projected=wall.getBoundingInfo().boundingBox.vectorsWorld.map(project);
 let polygon=hull(projected.map(p=>[p.x/width,p.y/height]));
 for(const[axis,edge,sign]of[[0,0,1],[0,1,-1],[1,0,1],[1,1,-1]])polygon=clip(polygon,axis,edge,sign);
 const area=Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
 const span={width:(Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)))/width,height:(Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)))/height};
 const markers={farLumber:new Vector3(41,4,126),middleTread:new Vector3(28,5,108),highTreadEdge:new Vector3(28,8,128)};
 const context=Object.fromEntries(Object.entries(markers).map(([name,point])=>{const p=project(point),rayVector=point.subtract(camera.position),ray=new Ray(camera.position,rayVector.normalizeToNew(),rayVector.length());return [name,{x:p.x/width,y:p.y/height,occludedByReceiver:ray.intersectsMesh(wall).hit,inFrame:p.z>0&&p.z<1&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height}];}));
 const result={area,span,context};scene.dispose();engine.dispose();return result;
}
function hull(points){
 const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=list=>{const out=[];for(const p of list){while(out.length>=2&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 return [...half(sorted).slice(0,-1),...half(sorted.reverse()).slice(0,-1)];
}
function clip(polygon,axis,edge,sign){
 const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],aIn=sign*(a[axis]-edge)>=0,bIn=sign*(b[axis]-edge)>=0;if(aIn)out.push(a);if(aIn!==bIn){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;
}
