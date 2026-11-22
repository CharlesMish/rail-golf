import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,MeshBuilder,PhysicsAggregate,PhysicsShapeType,StandardMaterial,Quaternion} from '@babylonjs/core';
import {RAIL_RULES} from './rail-golf-v02.js';
import {createSpatialSession} from './spatial-lab-session.js';

export const THEATRE_LAYOUT='two-shadow-theatre-v1';
export const THEATRE_HZ=120;
export const THEATRE_STATION=Object.freeze({id:'theatre-veranda',label:'Theatre veranda',x:0,y:0,z:0,yaw:0});
export const THEATRE_BOUNDS=Object.freeze({minX:-48,maxX:48,minZ:-16,maxZ:100,minY:-4,maxY:90});
export const THEATRE_VIEWS=Object.freeze({front:{horizontal:[-48,48],vertical:[0,90],axis:'x'},wing:{horizontal:[-16,100],vertical:[0,90],axis:'z'},plan:{horizontal:[-48,48],vertical:[-16,100],axis:'x'}});
export const THEATRE_PARTS=Object.freeze([
 Object.freeze({id:'flat',label:'Upright flat',center:[11,8,35],size:[1.4,16,26],pitch:0,material:'bank'}),
 Object.freeze({id:'rostrum',label:'Sloping rostrum',center:[-13,4,45],size:[18,1.5,18],pitch:-15,material:'ramp'}),
]);
export const THEATRE_CONFIG=Object.freeze({id:THEATRE_LAYOUT,defaultSetup:{railIndex:1,yaw:0,elevation:30,charge:.5},station:()=>THEATRE_STATION,bounds:THEATRE_BOUNDS});
export function theatreCorners(part){
 const rotation=Quaternion.RotationYawPitchRoll(0,part.pitch*Math.PI/180,0);
 return [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>{const v=new Vector3(x*part.size[0]/2,y*part.size[1]/2,z*part.size[2]/2);v.rotateByQuaternionToRef(rotation,v);return [v.x+part.center[0],v.y+part.center[1],v.z+part.center[2]];})));
}
export function theatreProject(point,view){
 if(view==='front')return [point[0],point[1]];
 if(view==='wing')return [point[2],point[1]];
 if(view==='plan')return [point[0],point[2]];
 throw Error('Unknown theatre view');
}
// Scrubbing selects recorded samples, never an invented or predicted point.
export function theatreSampleAt(path,time){
 if(!path?.length)return null;
 let low=0,high=path.length-1;
 while(low<high){const middle=Math.ceil((low+high)/2);if(path[middle][0]<=time)low=middle;else high=middle-1;}
 return path[low];
}
export function theatreHull(points){
 const sorted=points.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of sorted.toReversed()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function buildTheatreWorld(scene,root,{control='full'}={}){
 if(!['full','open','no-rostrum','no-flat'].includes(control))throw Error('Unknown theatre control');
 const meshes=[],bodies=[],materials=[];
 const material=new StandardMaterial('theatre-neutral',scene);materials.push(material);
 const add=(name,center,size,pitch,ground=false)=>{
  const mesh=MeshBuilder.CreateBox(`theatre-${name}`,{width:size[0],height:size[1],depth:size[2]},scene);mesh.position.fromArray(center);mesh.rotationQuaternion=Quaternion.RotationYawPitchRoll(0,pitch*Math.PI/180,0);mesh.parent=root;mesh.material=material;
  mesh.metadata=ground?{rangeGround:true}:{lineFeature:{id:`theatre-${name}`,kind:'range-timber',label:name==='flat'?'FLAT':'ROSTRUM'}};
  meshes.push(mesh);bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:ground?.1:.86,friction:ground?.8:.18},scene));
 };
 add('ground',[0,-.5,42],[96,1,116],0,true);
 for(const part of THEATRE_PARTS)if(control!=='open'&&control!==`no-${part.id}`)add(part.id,part.center,part.size,part.pitch);
 const layout=control==='full'?THEATRE_LAYOUT:`${THEATRE_LAYOUT}-control-${control}`;
 const snapshot=()=>({layout});
 return {environment:{snapshot,restore(value){if(!value||Object.keys(value).join(',')!=='layout'||value.layout!==layout)throw Error('Foreign theatre layout');},reset(){}},
  diagnostics:()=>({staticBodies:bodies.length,dynamicBodies:0,meshes:meshes.length,materials:materials.length,shadowCasters:0}),
  dispose(){for(const body of bodies)body.dispose();for(const mesh of meshes)mesh.dispose();for(const m of materials)m.dispose();}};
}

// This is an intentional schematic instrument: Babylon NullEngine builds the
// same 3D bodies and Havok solver; SVG shows orthographic views of actual output.
// It does not require WebGL and never performs a ballistic pre-simulation.
export function createTheatreRuntime(havok,{control='full',onEnd=()=>{},onContact=()=>{}}={}){
 const engine=new NullEngine({renderWidth:800,renderHeight:600,textureSize:64,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/THEATRE_HZ);physics.setSubTimeStep(1000/THEATRE_HZ);
 const root=new TransformNode('theatre-root',scene),started=performance.now(),world=buildTheatreWorld(scene,root,{control}),buildMs=performance.now()-started;
 let samples=[],impacts=[],touching=[],before=null,record=null,ticks=0,disposed=false;
 const session=createSpatialSession(scene,world,THEATRE_CONFIG,event=>{
  if(event.kind!=='end')return;
  const end=event.last;const final=[end.elapsed,...end.position];if(samples.at(-1)?.[0]!==end.elapsed)samples.push(final);
  record={...structuredClone(end),path:structuredClone(samples),impacts:structuredClone(impacts)};onEnd(structuredClone(record));
 });
 const run={scene,world,session,engine,root,buildMs,
  get samples(){return samples;},get record(){return record;},get active(){return Boolean(session.flight&&!session.flight.ended);},
  fire(setup){if(disposed||this.active)return false;session.action('retry');samples=[];impacts=[];record=null;ticks=0;
   if(!session.fire(setup))return false;
   samples.push([0,...session.flight.mesh.position.asArray()]);
   const body=session.flight.aggregate.body;
   body.getCollisionObservable().add(event=>{const other=event.collider===body?event.collidedAgainst:event.collider;if(!event.point)return;touching.push({body:other.transformNode.name,ground:Boolean(other.transformNode.metadata?.rangeGround),time:session.flight.elapsed,point:event.point.asArray(),normal:event.normal?.asArray()??null});});return true;
  },
  step(){if(disposed||!this.active)return false;before=session.flight.aggregate.body.getLinearVelocity().asArray();touching=[];session.beforeStep();physics._step(1/THEATRE_HZ);
   const after=session.flight.aggregate.body.getLinearVelocity().asArray();for(const impact of touching){const item={...impact,incoming:[...before],outgoing:[...after]};if(impacts.length<500)impacts.push(item);onContact(item);}
   session.afterStep();ticks++;if(this.active&&ticks%2===0)samples.push([session.flight.elapsed,...session.flight.mesh.position.asArray()]);return true;
  },
  clear(){if(this.active)return false;session.action('retry');return true;},
  metrics(){return {...world.diagnostics(),activeProjectile:session.flight?1:0,sceneMeshes:scene.meshes.length,sceneMaterials:scene.materials.length,buildMs};},
  dispose(){if(disposed)return;disposed=true;session.dispose();world.dispose();root.dispose();const remaining={meshes:scene.meshes.length,materials:scene.materials.length,geometries:scene.geometries.length,transformNodes:scene.transformNodes.length};scene.dispose();engine.dispose();return remaining;},
 };return run;
}
