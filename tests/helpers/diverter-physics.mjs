import {NullEngine,Scene,Vector3,MeshBuilder,HavokPlugin,PhysicsAggregate,PhysicsShapeType,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {buildDiverterLab} from '../../lib/diverter-scene.js';
import {DIVERTER_HOLE,floorForAction} from '../../lib/diverter-lab.js';
import {stationMuzzle,stationAim} from '../../lib/stations.js';
import {RAIL_RULES,chargeToSpeed,classifyChallengeRuling} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
export function diverterHarness(havok,initial='A'){
 const engine=new NullEngine({renderWidth:844,renderHeight:390,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const root=new TransformNode('lab',scene),material=new StandardMaterial('fixture',scene);
 const materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material]));
 const world=buildDiverterLab(scene,root,materials,{addShadowCaster(){},removeShadowCaster(){}},initial);
 let id=0;
 return {
  world,
  action(action,saved){world.setState(floorForAction(world.state,action,saved));},
  shoot(shot,{stopOnSwitch=false}={}){
   const start=world.state,shotId=++id,muzzle=stationMuzzle(shot),aim=stationAim(shot);
   const ball=MeshBuilder.CreateSphere('test-round',{diameter:RAIL_RULES.projectileRadius*2},scene);
   ball.position.set(muzzle.x,muzzle.y,muzzle.z);
   const aggregate=new PhysicsAggregate(ball,PhysicsShapeType.SPHERE,{mass:1.5,restitution:.38,friction:.28},scene);
   let landing=null;const contacts=[],tags=[];
   aggregate.body.setCollisionCallbackEnabled(true);
   aggregate.body.getCollisionObservable().add(event=>{
    if(landing)return;
    const other=event.collider===aggregate.body?event.collidedAgainst:event.collider;
    const contact=world.contact(other,event.point,shotId);
    if(!contact)return;
    if(contact.kind==='landing')landing=contact;
    else if(!tags.includes(contact.kind)){tags.push(contact.kind);contacts.push({...contact,body:other.transformNode.name});}
   });
   aggregate.body.applyImpulse(new Vector3(aim.x,aim.y,aim.z).scale(chargeToSpeed(shot.charge)*1.5),ball.position);
   try{
    for(let i=0;i<1560;i++){
     physics._step(1/120);world.flush();
     if(landing)return {start,end:world.state,outcome:classifyChallengeRuling({hole:DIVERTER_HOLE,targetHit:landing.targetHit===true,tags}),point:landing.point.asArray(),tags,contacts};
     if(stopOnSwitch&&tags.some(t=>t.startsWith('switch-')))return {start,end:world.state,outcome:'interrupted',tags,contacts};
     if(Math.abs(ball.position.x)>32||ball.position.z>124||ball.position.z< -15||ball.position.y< -8)break;
    }
    return {start,end:world.state,outcome:'oob',point:ball.position.asArray(),tags,contacts};
   }finally{aggregate.dispose();ball.dispose();}
  },
  dispose(){world.dispose();scene.dispose();engine.dispose();}
 };
}

