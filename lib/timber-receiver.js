import {MeshBuilder,PhysicsAggregate,PhysicsShapeType} from '@babylonjs/core';

// Experimental overlay only. The original yard, launch stations and OOB volume stay intact.
export const TIMBER_RECEIVER=Object.freeze({x:43,y:7,z:148,width:1.2,height:14,depth:26,yaw:-25});
export function buildTimberReceiver(scene,root,materials,shadows,register,geometry=TIMBER_RECEIVER){
 const g=geometry;
 const wall=MeshBuilder.CreateBox('timber-receiver',{width:g.width,height:g.height,depth:g.depth},scene);
 wall.parent=root;wall.position.set(g.x,g.y,g.z);wall.rotation.y=g.yaw*Math.PI/180;
 wall.material=materials.timber;wall.receiveShadows=true;shadows.addShadowCaster(wall);
 wall.metadata={lineFeature:{id:'timber-receiver',kind:'receiver',label:'TIMBER RETURN'}};
 const body=new PhysicsAggregate(wall,PhysicsShapeType.BOX,{mass:0,friction:.18,restitution:.86},scene);register(body);
 // Board seams and steel straps are visual children inside the physical silhouette.
 const trim=(name,x,y,z,width,height,depth,material)=>{
  const mesh=MeshBuilder.CreateBox(name,{width,height,depth},scene);mesh.parent=wall;mesh.position.set(x,y,z);mesh.material=materials[material];mesh.isPickable=false;return mesh;
 };
 for(let i=0;i<7;i++)trim('receiver-board',-g.width/2-.015,-g.height/2+(i+.5)*g.height/7,0,.025,g.height/7-.10,g.depth-.15,i%3?'timber':'brick');
 for(const z of [-g.depth/2+.5,0,g.depth/2-.5])trim('receiver-strap',-g.width/2-.035,0,z,.045,g.height-.2,.28,'machine');
 trim('receiver-cap',0,g.height/2-.09,0,g.width+.08,.18,g.depth+.08,'machine');
 return {wall,body};
}
