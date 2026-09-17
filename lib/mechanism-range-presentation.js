import {MeshBuilder,TransformNode,StandardMaterial,Color3} from '@babylonjs/core';
import {RAIL_RULES} from './rail-golf-v02.js';

// Incumbent MannersGame mesh dimensions/material roles, mirrored here to leave the
// frozen production component untouched. These meshes never receive physics bodies.
export function buildRangePresentationMaterials(scene){
 const result={};
 for(const [name,diffuse,emissive,roughness] of [
  ['steel',[.29,.35,.34],[.02,.025,.024],.24],['machine',[.085,.13,.135],[.006,.01,.01],.35],
  ['cyan',[.025,.4,.44],[.045,.82,.92],.18],['amber',[.46,.17,.035],[1,.27,.025],.2],
 ]){const m=new StandardMaterial('mr-presentation-'+name,scene);m.diffuseColor=Color3.FromArray(diffuse);m.emissiveColor=Color3.FromArray(emissive);m.specularColor=new Color3(1-roughness,1-roughness,1-roughness);result[name]=m;}
 return result;
}
export function buildRangeLauncher(scene,materials,shadows){
 const launcher=new TransformNode('mr-launcher',scene),yaw=new TransformNode('mr-yaw',scene),loft=new TransformNode('mr-loft',scene);
 yaw.parent=launcher;yaw.position.y=1.55;loft.parent=yaw;
 const box=(name,options,parent,position,material)=>{const mesh=MeshBuilder.CreateBox(name,options,scene);mesh.parent=parent;mesh.position.copyFromFloats(...position);mesh.material=materials[material];shadows.addShadowCaster(mesh);return mesh;};
 box('mr-carriage',{width:2.7,height:1.05,depth:2.5},launcher,[0,1.02,0],'machine');
 box('mr-trim',{width:2.1,height:.09,depth:2.58},launcher,[0,1.49,0],'cyan');
 box('mr-barrel',{width:.68,height:.56,depth:5.7},loft,[0,0,2.45],'machine');
 for(const x of [-.43,.43])box('mr-coil',{width:.08,height:.1,depth:5.05},loft,[x,.27,2.42],'cyan');
 const ring=MeshBuilder.CreateTorus('mr-muzzle',{diameter:1.08,thickness:.12,tessellation:28},scene);ring.parent=loft;ring.position.z=RAIL_RULES.muzzleLength;ring.rotation.x=Math.PI/2;ring.material=materials.cyan;
 return {launcher,yaw,loft};
}
export function buildRangeProjectile(scene,body,materials,shadows,initial='round'){
 body.isVisible=false;
 const root=new TransformNode('mr-projectile-presentation',scene),round=new TransformNode('mr-rail-round',scene);round.parent=root;
 const shell=MeshBuilder.CreateCylinder('mr-round-shell',{height:1.7,diameter:.63,tessellation:18},scene);shell.parent=round;shell.rotation.x=Math.PI/2;shell.material=materials.steel;
 const nose=MeshBuilder.CreateCylinder('mr-round-nose',{height:.58,diameterTop:0,diameterBottom:.63,tessellation:18},scene);nose.parent=round;nose.position.z=1.12;nose.rotation.x=Math.PI/2;nose.material=materials.amber;
 const band=MeshBuilder.CreateTorus('mr-round-band',{diameter:.69,thickness:.08,tessellation:22},scene);band.parent=round;band.position.z=-.56;band.rotation.x=Math.PI/2;band.material=materials.cyan;
 const ball=MeshBuilder.CreateSphere('mr-ball-presentation',{diameter:RAIL_RULES.projectileRadius*2,segments:16},scene);ball.parent=root;ball.material=materials.cyan;
 shadows.addShadowCaster(shell);shadows.addShadowCaster(ball);
 const select=mode=>{if(!['round','ball'].includes(mode))throw Error('Invalid projectile presentation');round.setEnabled(mode==='round');ball.setEnabled(mode==='ball');};select(initial);
 return {root,round,ball,select,
  sync(velocity){root.position.copyFrom(body.position);if(velocity.lengthSquared()>.05){const horizontal=Math.hypot(velocity.x,velocity.z);root.rotation.y=Math.atan2(velocity.x,velocity.z);root.rotation.x=-Math.atan2(velocity.y,horizontal);}},
  dispose(){shadows.removeShadowCaster?.(shell);shadows.removeShadowCaster?.(ball);root.dispose();},
 };
}
