import {MeshBuilder,PhysicsAggregate,PhysicsShapeType} from '@babylonjs/core';
import {buildMechanismRange} from './mechanism-range-scene.js';
import {normalizeTeeSetup,TEE_STOPS} from './travelling-tee.js';

// The accepted range is the comparison ground, reused verbatim. Only the launch apron
// gains width; the benches/table/rack, their colliders and all useful voids are unchanged.
export function buildTravellingTee(scene,root,materials,shadows){
 const range=buildMechanismRange(scene,root,materials,shadows),bodies=[],extra=[];
 const box=(name,w,h,d,x,y,z,material)=>{
  const m=MeshBuilder.CreateBox('tee-'+name,{width:w,height:h,depth:d},scene);
  m.parent=root;m.position.set(x,y,z);m.material=materials[material];m.receiveShadows=true;shadows.addShadowCaster(m);extra.push(m);return m;
 };
 // Exact continuation of the existing 14 m launch apron, without overlapping bodies.
 for(const x of [-15,15]){
  const wing=box('apron',16,.3,8,x,.15,-1,'machine');wing.metadata={rangeGround:true};
  bodies.push(new PhysicsAggregate(wing,PhysicsShapeType.BOX,{mass:0,restitution:.1,friction:.8},scene));
 }
 for(const z of [-2,1])box('track',44,.075,.15,0,.36,z,'steel');
 for(const x of TEE_STOPS){
  box('stop',.13,.025,3.5,x,.4,-.5,'amber');
  box('sleeper',.8,.05,4.5,x,.33,-.5,'bark');
 }
 const carriage=box('carriage',3.8,.1,4,0,.36,-.5,'steel');carriage.isPickable=false;
 const wheelA=box('wheel',.8,.12,.35,-1.3,.38,-2.2,'machine');
 const wheelB=box('wheel',.8,.12,.35,1.3,.38,1.2,'machine');
 // Cosmetic stopped platform only. Projectile has no dynamic-platform inheritance.
 const updatePresentation=setup=>{
  const x=normalizeTeeSetup(setup).originX;carriage.position.x=x;wheelA.position.x=x-1.3;wheelB.position.x=x+1.3;
 };
 return {...range,updatePresentation,
  contact:(other,point,flight)=>range.mechanism.contact(other,point,flight.id),
  flush:()=>range.mechanism.flush(),
  environment:{snapshot:()=>({floor:range.mechanism.state}),restore:value=>range.mechanism.setState(value?.floor==='B'?'B':'A'),reset:()=>range.mechanism.setState('A')},
  dispose(){range.dispose();for(const body of bodies)body.dispose();for(const mesh of extra)mesh.dispose();},
 };
}
