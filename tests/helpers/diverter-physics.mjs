import {buildCourtyard} from '../../lib/courtyard-scene.js';
import {COURTYARD_DIVERTER,COURTYARD_DIVERTER_TARGETS,YARD_DIVERTER_OPTIONS} from '../../lib/courtyard-diverter.js';
import {collectDeliveryStepEvents,padImpulse} from '../../lib/delivery-routes.js';
import {cascadeContactTag} from '../../lib/lumber-cascade.js';
import {NullEngine,Scene,Vector3,MeshBuilder,HavokPlugin,PhysicsAggregate,PhysicsShapeType,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {buildDiverterLab} from '../../lib/diverter-scene.js';
import {DIVERTER_HOLE,floorForAction} from '../../lib/diverter-lab.js';
import {stationMuzzle,stationAim} from '../../lib/stations.js';
import {RAIL_RULES,chargeToSpeed,classifyChallengeRuling} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
export function diverterHarness(havok,initial='A',integrated=false){
 const hole=integrated?COURTYARD_DIVERTER:DIVERTER_HOLE;
 const engine=new NullEngine({renderWidth:844,renderHeight:390,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const root=new TransformNode('lab',scene),material=new StandardMaterial('fixture',scene);
 const materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine','brick','boost'].map(k=>[k,material]));
 const yardBodies=[];
 const add=(mesh,shape,options)=>{const b=new PhysicsAggregate(mesh,shape,options,scene);yardBodies.push(b);return b;};
 if(integrated){
  const ground=MeshBuilder.CreateBox('yard-ground',{width:hole.courseWidth,height:1,depth:hole.courseLength+42},scene);
  ground.parent=root;ground.position.set(0,-.5,(hole.courseLength+8)/2);ground.metadata={yardLanding:'ground'};
  add(ground,PhysicsShapeType.BOX,{mass:0,restitution:.1,friction:.8});
  const tee=MeshBuilder.CreateBox('yard-tee',{width:13,height:.34,depth:7.5},scene);
  tee.parent=root;tee.position.set(0,.16,-.5);tee.metadata={yardLanding:'tee'};
  add(tee,PhysicsShapeType.BOX,{mass:0,restitution:.06,friction:.9});
  for(const target of COURTYARD_DIVERTER_TARGETS){
   const active=target.id===hole.target.id,mesh=MeshBuilder.CreateCylinder(target.id,{height:active?.22:.16,diameter:target.radius*2,tessellation:64},scene);
   mesh.parent=root;mesh.position.set(target.x,active?.2:.16,target.z);mesh.metadata={yardLanding:target.id};
   add(mesh,PhysicsShapeType.CYLINDER,{mass:0,restitution:.12,friction:.74});
  }
  buildCourtyard(scene,root,materials,{addShadowCaster(){}},b=>yardBodies.push(b),hole);
 }
 const world=buildDiverterLab(scene,root,materials,{addShadowCaster(){},removeShadowCaster(){}},initial,integrated?YARD_DIVERTER_OPTIONS:{});
 let id=0;
 return {
  world,
  action(action,saved){world.setState(floorForAction(world.state,action,saved));},
  shoot(shot,{stopOnSwitch=false}={}){
   const start=world.state,shotId=++id,muzzle=stationMuzzle(shot,hole.station),aim=stationAim(shot,hole.station);
   const ball=MeshBuilder.CreateSphere('test-round',{diameter:RAIL_RULES.projectileRadius*2},scene);
   ball.position.set(muzzle.x,muzzle.y,muzzle.z);
   const aggregate=new PhysicsAggregate(ball,PhysicsShapeType.SPHERE,{mass:1.5,restitution:.38,friction:.28},scene);
   let landing=null;const contacts=[],tags=[];
   let previous=ball.position.clone();
   aggregate.body.setCollisionCallbackEnabled(true);
   aggregate.body.getCollisionObservable().add(event=>{
    if(landing)return;
    const other=event.collider===aggregate.body?event.collidedAgainst:event.collider;
    const contact=world.contact(other,event.point,shotId);
    if(integrated && event.point){
     const kind=other.transformNode.metadata?.yardBank ?? cascadeContactTag(other.transformNode.metadata?.cascadeStep,event.point) ?? (other.transformNode.metadata?.deliveryRoute==='mill'?'mill':null);
     if(kind&&!tags.includes(kind)){tags.push(kind);contacts.push({kind,point:event.point.clone(),body:other.transformNode.name});}
    }
    if(!contact)return;
    if(contact.kind==='landing')landing=contact;
    else if(!tags.includes(contact.kind)){tags.push(contact.kind);contacts.push({...contact,body:other.transformNode.name});}
   });
   aggregate.body.applyImpulse(new Vector3(aim.x,aim.y,aim.z).scale(chargeToSpeed(shot.charge)*1.5),ball.position);
   try{
    for(let i=0;i<1560;i++){
     physics._step(1/120);world.flush();
     if(integrated&&!landing){
      for(const e of collectDeliveryStepEvents(previous,ball.position,hole,tags,[])){
       if(e.kind==='boost'&&aggregate.body.getLinearVelocity().y<0){
        tags.push('boost');contacts.push({kind:'boost',point:new Vector3(e.point.x,e.point.y,e.point.z),body:'powered-pad-swept-surface'});
        const kick=padImpulse(aggregate.body.getLinearVelocity(),hole);aggregate.body.applyImpulse(new Vector3(kick.x,kick.y,kick.z),ball.position);break;
       }
      }
     }
     previous.copyFrom(ball.position);
     if(landing)return {start,end:world.state,outcome:classifyChallengeRuling({hole,targetHit:landing.targetHit===true,tags}),point:landing.point.asArray(),tags,contacts};
     if(stopOnSwitch&&tags.some(t=>t.startsWith('switch-')))return {start,end:world.state,outcome:'interrupted',tags,contacts};
     if(Math.abs(ball.position.x)>(integrated?50:32)||ball.position.z>(integrated?198:124)||ball.position.z< -15||ball.position.y< -8)break;
    }
    return {start,end:world.state,outcome:'oob',point:ball.position.asArray(),tags,contacts};
   }finally{aggregate.dispose();ball.dispose();}
  },
  dispose(){world.dispose();for(const b of yardBodies)b.dispose();scene.dispose();engine.dispose();}
 };
}

