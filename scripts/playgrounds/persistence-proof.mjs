import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,Quaternion,HavokPlugin,MeshBuilder,PhysicsAggregate,PhysicsShapeType,Physics6DoFConstraint,PhysicsConstraintAxis as Axis,Logger} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {createSpatialSession} from '../../lib/spatial-lab-session.js';
Logger.LogLevels=0;
const hv=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const config={station:()=>({id:'proof',x:0,z:0,yaw:0}),bounds:{minX:-60,maxX:60,minZ:-30,maxZ:100,minY:-10}};
function run(kind,shot){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,hv));scene.getPhysicsEngine().setTimeStep(1/120);
 const ground=MeshBuilder.CreateBox('ground',{width:100,height:1,depth:120},scene);ground.position.set(0,-.5,40);ground.metadata={rangeGround:true};const ga=new PhysicsAggregate(ground,PhysicsShapeType.BOX,{mass:0,friction:.8,restitution:.1},scene);
 const prop=kind==='stone'?MeshBuilder.CreateCylinder('stone',{height:4,diameter:7,tessellation:8},scene):MeshBuilder.CreateBox('carriage',{width:8,height:5,depth:2},scene);
 prop.position.set(0,kind==='stone'?2:2.75,24);prop.rotationQuaternion=Quaternion.RotationYawPitchRoll(kind==='stone'?Math.PI/8:Math.PI/4,0,0);
 const pa=new PhysicsAggregate(prop,kind==='stone'?PhysicsShapeType.CONVEX_HULL:PhysicsShapeType.BOX,{mass:12,friction:kind==='stone'?.55:.18,restitution:kind==='stone'?.1:.86},scene);pa.body.setLinearDamping(kind==='stone'?.5:.3);pa.body.setAngularDamping(2);
 let c=null;if(kind==='carriage'){
  c=new Physics6DoFConstraint({pivotA:new Vector3(0,3.25,-16),pivotB:Vector3.Zero(),axisA:Vector3.Right(),axisB:new Vector3(Math.SQRT1_2,0,Math.SQRT1_2),perpAxisA:Vector3.Up(),perpAxisB:Vector3.Up()},[...Array.from({length:6},(_,axis)=>({axis,minLimit:axis===Axis.LINEAR_X?-10:0,maxLimit:axis===Axis.LINEAR_X?10:0}))],scene);ga.body.addConstraint(pa.body,c);c.setAxisFriction(Axis.LINEAR_X,3);
 }
 const world={environment:{snapshot:()=>({pose:JSON.stringify([...prop.position.asArray(),...prop.rotationQuaternion.asArray()])}),restore(){},reset(){}},flush(){},onResolve(f){f.aggregate.shape.filterMembershipMask=0;f.aggregate.shape.filterCollideMask=0;}};
 const session=createSpatialSession(scene,world,config);for(let i=0;i<120;i++)scene.getPhysicsEngine()._step(1/120);const start=prop.position.asArray();session.fire(shot);let endedAt=null,settledAt=null,max=0;
 for(let i=0;i<2400;i++){session.beforeStep();scene.getPhysicsEngine()._step(1/120);session.afterStep();max=Math.max(max,pa.body.getLinearVelocity().length());if(session.flight.ended&&endedAt===null)endedAt=i/120;if(endedAt!==null&&i/120>endedAt+.5&&pa.body.getLinearVelocity().length()<.025&&pa.body.getAngularVelocity().length()<.025){settledAt=i/120;break;}}
 const out={kind,shot,start,end:prop.position.asArray(),rotation:prop.rotationQuaternion.asArray(),velocity:pa.body.getLinearVelocity().asArray(),endedAt,settledAt,max,contacts:session.last?.contacts,terminal:session.last?.position};
 session.dispose();c?.dispose();pa.dispose();ga.dispose();scene.dispose();engine.dispose();return out;
}
for(const kind of ['stone','carriage'])for(const shot of [{railIndex:1,yaw:0,elevation:5,charge:.55},{railIndex:1,yaw:-5,elevation:5,charge:.55},{railIndex:1,yaw:5,elevation:5,charge:.55},{railIndex:1,yaw:0,elevation:5,charge:1}])console.log(JSON.stringify(run(kind,shot)));
