import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,PhysicsMotionType,Quaternion,Vector3,Color3,TransformNode} from '@babylonjs/core';
import {RAIL_RULES} from './rail-golf-v02.js';
import {WIND_VOLUME,WIND_STATES,PADDLE,PADDLE_MODES,PADDLE_HZ,VOCABULARY_ENVIRONMENT,paddleTick,paddleYaw,windAcceleration} from './mechanism-vocabulary.js';

// A new proving yard. No mutations of the accepted Mechanism Range builder.
export function buildMechanismVocabulary(scene,root,materials,shadows){
  const bodies=[],features=new Map(),streamers=[],fanRotors=[];
  let wind=VOCABULARY_ENVIRONMENT.wind,mode='SYNC',tick=0,launchTick=0,ready=true,recallHeld=false,visualSeconds=0,windSeen=false,insideWind=false;
  const cycleTicks=PADDLE.periodSeconds*PADDLE_HZ;
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
    const rotor=new TransformNode('mv-fan-rotor',scene);rotor.parent=housing;rotor.position.y=-.86;fanRotors.push(rotor);
    for(const angle of [0,Math.PI/3,Math.PI*2/3]){const vane=box('fan-blade',0,0,0,4,.12,.45,'amber');vane.parent=rotor;vane.rotation.y=angle;}
    box('fan-stand',-29,1.4,z,1.5,2.8,1.5,'timber',true);
    for(const y of [5,14,23]){
      const ribbon=box('flow-ribbon',-14,y,z,4,.12,.25,'cyan');
      const arrow=MeshBuilder.CreateCylinder('mv-flow-vane',{diameterTop:0,diameterBottom:.85,height:1.2,tessellation:3},scene);arrow.parent=ribbon;arrow.material=materials.cyan;
      streamers.push({ribbon,arrow});
    }
  }
  // Directional strips visibly travel across the ACTUAL authored force volume.
  // They are a flow field cue, not a projectile path or predicted trajectory.
  const updateWind=()=>{for(const [i,{ribbon,arrow}]of streamers.entries()){
    const direction=wind==='LEFT'?-1:wind==='RIGHT'?1:0;
    const phase=(visualSeconds*3+i*6.7)%18;
    ribbon.scaling.x=direction?1:.16;
    ribbon.rotation.z=direction?Math.sin(visualSeconds*3+i)*.045:Math.PI/2;
    ribbon.position.x=direction?(direction>0?-23+phase:-5-phase):-14;
    ribbon.material=materials[direction?'cyan':'steel'];
    ribbon.position.y=[5,14,23][i%3]+(direction?Math.sin(visualSeconds*2+i)*.18:0);
    arrow.setEnabled(Boolean(direction));arrow.position.x=direction*2.3;arrow.rotation.z=-direction*Math.PI/2;
  }};
  // A conventional timber face beyond the local wind volume makes left/right displacement readable.
  const returned=box('fan-return',-15,8,82,32,16,1.4,'timber',true,{id:'fan-return',kind:'range-timber',label:'FAN BAY RETURN'});
  for(const y of [-5,0,5]){const band=box('fan-return-band',0,y,-.73,32,.12,.06,'bark');band.parent=returned;}
  // Proper Havok ANIMATED body: target transforms produce physical contact velocity.
  const paddle=box('paddle',PADDLE.x,PADDLE.y,PADDLE.z,PADDLE.width,PADDLE.height,PADDLE.depth,'timber',false,{id:'moving-paddle',kind:'range-timber',label:'PADDLE REBOUND'});
  paddle.rotationQuaternion=Quaternion.Identity();
  let paddleBody;
  for(const x of [-PADDLE.width/2+.3,PADDLE.width/2-.3])for(const side of [-1,1]){const band=box('paddle-band',x,0,side*(PADDLE.depth/2+.035),.6,PADDLE.height,.06,'amber');band.parent=paddle;}
  for(const side of [-1,1]){const stripe=box('paddle-motion-stripe',0,0,side*(PADDLE.depth/2+.045),PADDLE.width,.7,.08,'amber');stripe.parent=paddle;}
  box('paddle-pivot-base',PADDLE.x,.5,PADDLE.z,4,1,4,'machine',true);
  // Discrete slatted axle marks show pivot motion without another mechanical system.
  const axle=MeshBuilder.CreateCylinder('mv-paddle-axle',{diameter:.6,height:PADDLE.height+1,tessellation:12},scene);axle.parent=paddle;axle.material=materials.steel;
  // Exposed axle collars make the vertical pivot visible above/below the face.
  for(const y of [-PADDLE.height/2-.2,PADDLE.height/2+.2]){
    const collar=MeshBuilder.CreateCylinder('mv-paddle-pivot-collar',{diameter:1.35,height:.4,tessellation:12},scene);collar.parent=paddle;collar.position.y=y;collar.material=materials.amber;
  }
  const phaseQuaternion=at=>Quaternion.RotationYawPitchRoll(paddleYaw(at/PADDLE_HZ),0,0);
  const resetPaddle=(at=0)=>{
    paddleBody?.dispose();tick=paddleTick(at);
    paddle.position.set(PADDLE.x,PADDLE.y,PADDLE.z);paddle.rotationQuaternion.copyFrom(phaseQuaternion(tick));paddle.computeWorldMatrix(true);
    // Teleport ONLY while there is no live round, or at the launch boundary.
    // Actual moving contact always uses the animated Havok target transform.
    paddleBody=new PhysicsAggregate(paddle,PhysicsShapeType.BOX,{mass:0,restitution:.86,friction:.18},scene);
    paddleBody.body.setMotionType(PhysicsMotionType.ANIMATED);
  };
  const movePaddle=next=>{
    tick=next%cycleTicks;
    paddleBody.body.setTargetTransform(new Vector3(PADDLE.x,PADDLE.y,PADDLE.z),phaseQuaternion(tick));
  };
  const stopPaddle=()=>{paddleBody.body.setAngularVelocity(Vector3.Zero());paddleBody.body.setLinearVelocity(Vector3.Zero());};
  const snapshot=()=>({wind,paddleMode:mode,paddleTick:String(mode==='SYNC'?0:tick)});
  const restore=state=>{
    if(!state||!WIND_STATES.includes(state.wind))throw Error('Invalid wind environment');
    const nextMode=state.paddleMode??'SYNC';if(!PADDLE_MODES.includes(nextMode))throw Error('Invalid paddle mode');
    const nextTick=paddleTick(state.paddleTick??0);
    wind=state.wind;mode=nextMode;recallHeld=mode==='LIVE';ready=true;
    resetPaddle(mode==='SYNC'?0:nextTick);updateWind();
  };
  updateWind();resetPaddle();
  return {
    ground,features,paddle,streamers,fanRotors,get paddleBody(){return paddleBody;},
    environment:{snapshot,restore,reset(){wind=VOCABULARY_ENVIRONMENT.wind;mode='SYNC';ready=true;recallHeld=false;resetPaddle();updateWind();},
      setControl(id,value){
        if(id==='wind'){if(!WIND_STATES.includes(value))throw Error('Invalid wind environment');wind=value;updateWind();return;}
        if(id==='paddleMode'){if(!PADDLE_MODES.includes(value))throw Error('Invalid paddle mode');mode=value;recallHeld=false;ready=true;return;}
        throw Error('Unknown mechanism control');
      },
    },
    // Called before the accepted session snapshots starting environment.
    prepareLaunch(){launchTick=mode==='SYNC'?0:tick;resetPaddle(launchTick);},
    onLaunch(){windSeen=false;insideWind=false;ready=false;recallHeld=false;},
    onResolve(){ready=false;stopPaddle();},
    onAction(action){ready=true;if(action!=='recall'){recallHeld=false;if(mode==='SYNC')resetPaddle();else stopPaddle();}},
    // Both modes show the real slow body while preparing. SYNC resets only at fire;
    // LIVE records the phase being seen. A recalled LIVE phase is held for replay.
    beforeIdleStep(){if(ready&&!recallHeld)movePaddle((tick+1)%cycleTicks);},
    updatePresentation(_setup,dt=0){
      visualSeconds+=Math.max(0,Math.min(.1,dt));updateWind();
      if(wind!=='OFF')for(const rotor of fanRotors)rotor.rotation.y+=dt*(wind==='LEFT'?-3:3);
    },
    diagnostics(){return {wind,paddleMode:mode,paddleTick:String(tick),phaseSeconds:(tick/PADDLE_HZ).toFixed(3),recallHeld:recallHeld?'RECALLED PHASE HELD — press LIVE to resume':'',windApplied:windSeen?'yes':'no'};},
    beforeStep(flight,dt){
      if(!flight||flight.ended)return;
      movePaddle((launchTick+Math.round((flight.elapsed+dt)*PADDLE_HZ))%cycleTicks);
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
