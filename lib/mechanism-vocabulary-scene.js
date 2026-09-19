import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,PhysicsMotionType,Quaternion,Vector3,Color3} from '@babylonjs/core';
import {RAIL_RULES} from './rail-golf-v02.js';
import {WIND_VOLUME,WIND_STATES,PADDLE,paddleYaw,windAcceleration} from './mechanism-vocabulary.js';

// A new proving yard. No mutations of the accepted Mechanism Range builder.
export function buildMechanismVocabulary(scene,root,materials,shadows){
  const bodies=[],features=new Map(),streamers=[];let wind='OFF',windSeen=false,insideWind=false;
  const box=(name,x,y,z,w,h,d,mat,physical=false,feature=null)=>{
    const mesh=MeshBuilder.CreateBox('mv-'+name,{width:w,height:h,depth:d},scene);mesh.parent=root;mesh.position.set(x,y,z);mesh.material=materials[mat];mesh.receiveShadows=true;shadows.addShadowCaster(mesh);
    if(feature){mesh.metadata={lineFeature:feature};features.set(feature.id,mesh);}
    if(physical)bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:feature?.id==='fan-return'?.86:.1,friction:feature?.id==='fan-return'?.18:.8},scene));
    return mesh;
  };
  const ground=box('ground',0,-.5,61,112,1,150,'sand',true);ground.metadata={rangeGround:true};
  const tee=box('tee',0,.15,-1,14,.3,8,'machine',true);tee.metadata={rangeGround:true};
  for(const x of RAIL_RULES.railPositions)box('rail',x,.34,-1,.12,.06,7,'cyan');
  // The wind bay is bounded by sparse industrial cues, not an invisible global force.
  // Posts only below the volume's useful flight height; airy ribbons expose its full extent.
  for(const x of [WIND_VOLUME.minX,WIND_VOLUME.maxX])for(const z of [WIND_VOLUME.minZ,WIND_VOLUME.maxZ]){
    box('fan-bay-foot',x,.5,z,1.2,1,1.2,'machine',true);
    box('fan-bay-mast',x,13,z,.12,24,.12,'steel');
  }
  const corners=[new Vector3(-26,1,24),new Vector3(-2,1,24),new Vector3(-2,1,66),new Vector3(-26,1,66),new Vector3(-26,1,24)];
  const outline=MeshBuilder.CreateLines('mv-wind-footprint',{points:corners},scene);outline.parent=root;outline.color=new Color3(.26,.55,.56);
  for(const z of [28,44,60]){
    const housing=MeshBuilder.CreateCylinder('mv-fan-housing',{diameter:5,height:1.6,tessellation:16},scene);housing.parent=root;housing.position.set(-29,5,z);housing.rotation.z=Math.PI/2;housing.material=materials.machine;
    bodies.push(new PhysicsAggregate(housing,PhysicsShapeType.CYLINDER,{mass:0,restitution:.1,friction:.8},scene));
    for(const angle of [0,Math.PI/3,Math.PI*2/3]){const vane=box('fan-blade',0,0,0,.2,4,.45,'steel');vane.parent=housing;vane.rotation.y=angle;}
    box('fan-stand',-29,1.4,z,1.5,2.8,1.5,'timber',true);
    for(const y of [5,14,23]){
      const ribbon=box('flow-ribbon',-14,y,z,4,.12,.25,'cyan');
      const arrow=MeshBuilder.CreateCylinder('mv-flow-vane',{diameterTop:0,diameterBottom:.85,height:1.2,tessellation:3},scene);arrow.parent=ribbon;arrow.material=materials.cyan;
      streamers.push({ribbon,arrow});
    }
  }
  const updateWind=()=>{for(const [i,{ribbon,arrow}]of streamers.entries()){ribbon.scaling.x=wind==='OFF'?.16:1;ribbon.rotation.z=wind==='LEFT'?.12:wind==='RIGHT'?-.12:Math.PI/2;ribbon.position.x=-14+(wind==='LEFT'?-3:wind==='RIGHT'?3:0);ribbon.material=materials[wind==='OFF'?'steel':'cyan'];ribbon.position.y=[5,14,23][i%3];arrow.setEnabled(wind!=='OFF');arrow.position.x=wind==='LEFT'?-2.3:2.3;arrow.rotation.z=wind==='LEFT'?Math.PI/2:-Math.PI/2;}};
  // A conventional timber face beyond the local wind volume makes left/right displacement readable.
  const returned=box('fan-return',-15,8,82,32,16,1.4,'timber',true,{id:'fan-return',kind:'range-timber',label:'FAN BAY RETURN'});
  for(const y of [-5,0,5]){const band=box('fan-return-band',0,y,-.73,32,.12,.06,'bark');band.parent=returned;}
  // Proper Havok ANIMATED body: target transforms produce physical contact velocity.
  const paddle=box('paddle',PADDLE.x,PADDLE.y,PADDLE.z,PADDLE.width,PADDLE.height,PADDLE.depth,'timber',false,{id:'moving-paddle',kind:'range-timber',label:'PADDLE REBOUND'});
  paddle.rotationQuaternion=Quaternion.Identity();
  let paddleBody;
  for(const x of [-PADDLE.width/2+.3,PADDLE.width/2-.3]){const band=box('paddle-band',x,0,-PADDLE.depth/2-.035,.4,PADDLE.height,.06,'amber');band.parent=paddle;}
  box('paddle-pivot-base',PADDLE.x,.5,PADDLE.z,4,1,4,'machine',true);
  // Discrete slatted axle marks show pivot motion without another mechanical system.
  const axle=MeshBuilder.CreateCylinder('mv-paddle-axle',{diameter:.6,height:PADDLE.height+1,tessellation:12},scene);axle.parent=paddle;axle.material=materials.steel;
  const resetPaddle=()=>{
    paddleBody?.dispose();
    paddle.position.set(PADDLE.x,PADDLE.y,PADDLE.z);paddle.rotationQuaternion.copyFrom(Quaternion.Identity());paddle.computeWorldMatrix(true);
    // Independent attempt: rebuild only this body at its authored phase, never sweep
    // through the yard at reset velocity. In-flight motion always uses target transforms.
    paddleBody=new PhysicsAggregate(paddle,PhysicsShapeType.BOX,{mass:0,restitution:.86,friction:.18},scene);
    paddleBody.body.setMotionType(PhysicsMotionType.ANIMATED);
  };
  updateWind();resetPaddle();
  return {
    ground,features,paddle,get paddleBody(){return paddleBody;},
    environment:{snapshot:()=>({wind}),restore(state){if(!state||!WIND_STATES.includes(state.wind))throw Error('Invalid wind environment');wind=state.wind;updateWind();resetPaddle();},reset(){wind='OFF';updateWind();resetPaddle();}},
    onLaunch(){windSeen=false;insideWind=false;resetPaddle();},
    onResolve(){paddleBody.body.setAngularVelocity(Vector3.Zero());paddleBody.body.setLinearVelocity(Vector3.Zero());},
    onAction(){resetPaddle();},
    beforeStep(flight,dt){
      if(!flight||flight.ended)return;
      const yaw=paddleYaw(flight.elapsed+dt);
      paddleBody.body.setTargetTransform(new Vector3(PADDLE.x,PADDLE.y,PADDLE.z),Quaternion.RotationYawPitchRoll(yaw,0,0));
      const acceleration=windAcceleration(flight.mesh.position,wind);
      if(Boolean(acceleration.x)!==insideWind){
        insideWind=Boolean(acceleration.x);
        if(flight.evidence.length<500)flight.evidence.push({kind:insideWind?'wind-enter':'wind-exit',state:wind,elapsed:flight.elapsed,point:{x:flight.mesh.position.x,y:flight.mesh.position.y,z:flight.mesh.position.z}});
      }
      if(acceleration.x){flight.aggregate.body.applyImpulse(new Vector3(acceleration.x*RAIL_RULES.projectileMass*dt,0,0),flight.mesh.position);windSeen=true;}
    },
    get windApplied(){return windSeen;},
    dispose(){paddleBody.dispose();for(const body of bodies)body.dispose();},
  };
}
