import {buildKickerPallet} from '../../lib/kicker-pallet.js';
import {createRunTracker} from '../../lib/line-run.js';
import {createLineLifecycle} from '../../lib/line-lifecycle.js';
import {createSawMillTracker,createRedirectTracker,collectLineStepEvents,redirectFeature} from '../../lib/line-recognition.js';
import {scoreLine,appendLineEvidence,recordLineContact} from '../../lib/line-score.js';
import {buildCourtyard} from '../../lib/courtyard-scene.js';
import {COURTYARD_DIVERTER,COURTYARD_DIVERTER_TARGETS,YARD_DIVERTER_OPTIONS} from '../../lib/courtyard-diverter.js';
import {padImpulse} from '../../lib/delivery-routes.js';
import {cascadeContactTag} from '../../lib/lumber-cascade.js';
import {NullEngine,Scene,Vector3,MeshBuilder,HavokPlugin,PhysicsAggregate,PhysicsShapeType,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {buildDiverterLab,buildYardLandingAuthority} from '../../lib/diverter-scene.js';
import {DIVERTER_HOLE,floorForAction} from '../../lib/diverter-lab.js';
import {stationMuzzle,stationAim} from '../../lib/stations.js';
import {RAIL_RULES,chargeToSpeed,classifyChallengeRuling} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
export function diverterHarness(havok,initial='A',integrated=false,selectedHole=null,{scoreLab=false,kicker=true}={}){
 const hole=selectedHole ?? (integrated?COURTYARD_DIVERTER:DIVERTER_HOLE);
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
   const active=target.id===hole.target?.id,mesh=MeshBuilder.CreateCylinder(target.id,{height:active?.22:.16,diameter:target.radius*2,tessellation:64},scene);
   mesh.parent=root;mesh.position.set(target.x,active?.2:.16,target.z);mesh.metadata={yardLanding:target.id};
   add(mesh,PhysicsShapeType.CYLINDER,{mass:0,restitution:.12,friction:.74});
  }
  buildCourtyard(scene,root,materials,{addShadowCaster(){}},b=>yardBodies.push(b),hole,{loadingPlatformOverlay:!scoreLab,lineLab:scoreLab});
 }
 const world=scoreLab?(kicker?buildKickerPallet(scene,root,materials,{addShadowCaster(){},removeShadowCaster(){}},initial,hole.target):buildYardLandingAuthority(hole.target,initial)):buildDiverterLab(scene,root,materials,{addShadowCaster(){},removeShadowCaster(){}},initial,integrated?{...YARD_DIVERTER_OPTIONS,target:hole.target}:{});
 let id=0;
 return {
  world,scene,
  action(action,saved){world.setState(floorForAction(world.state,action,saved));},
  shoot(shot,{stopOnSwitch=false,station=hole.station,launch=null,onStep=null}={}){
   const start=world.state,shotId=++id,muzzle=stationMuzzle(shot,station),aim=stationAim(shot,station);
   const ball=MeshBuilder.CreateSphere('test-round',{diameter:RAIL_RULES.projectileRadius*2},scene);
   ball.position.set(...(launch?launch.position:[muzzle.x,muzzle.y,muzzle.z]));
   const aggregate=new PhysicsAggregate(ball,PhysicsShapeType.SPHERE,{mass:1.5,restitution:.38,friction:.28},scene);
   let landing=null;const contacts=[],tags=[],ledger=[],routes=[],run=createRunTracker(),tracker=createRedirectTracker(),sawMill=createSawMillTracker(),lifecycle=createLineLifecycle();
   let previous=ball.position.clone();
   aggregate.body.setCollisionCallbackEnabled(true);
   aggregate.body.getCollisionObservable().add(event=>{
    if(landing)return;
    if(scoreLab)run.contact();
    const other=event.collider===aggregate.body?event.collidedAgainst:event.collider;
    const contact=world.contact(other,event.point,shotId);
    if(integrated){recordLineContact(ledger,other.transformNode,event.point,contact);if(event.point){tracker.contact(redirectFeature(other.transformNode,event.point),other.transformNode.name,event.point);sawMill.contact(redirectFeature(other.transformNode,event.point),other.transformNode.name,event.point);}}
    if(integrated && event.point){
     const kind=other.transformNode.metadata?.yardBank ?? cascadeContactTag(other.transformNode.metadata?.cascadeStep,event.point) ?? (other.transformNode.metadata?.deliveryRoute==='mill'?'mill':null);
     if(kind&&!tags.includes(kind)){tags.push(kind);contacts.push({kind,point:event.point.clone(),body:other.transformNode.name});}
    }
    if(!contact)return;
    if(contact.kind==='landing')landing=contact;
    else if(!tags.includes(contact.kind)){tags.push(contact.kind);contacts.push({...contact,body:other.transformNode.name});}
   });
   aggregate.body.applyImpulse((launch?new Vector3(...launch.velocity):new Vector3(aim.x,aim.y,aim.z).scale(chargeToSpeed(shot.charge))).scale(1.5),ball.position);
   try{
    for(let i=0;i<(scoreLab?7300:1560);i++){
     run.beginStep();tracker.beginStep(aggregate.body.getLinearVelocity(),i/120);sawMill.beginStep(aggregate.body.getLinearVelocity(),i/120);
     physics._step(1/120);world.flush();
     const redirect=tracker.endStep(ball.position,aggregate.body.getLinearVelocity(),(i+1)/120);if(integrated&&redirect)appendLineEvidence(ledger,redirect);
     const relationship=sawMill.endStep(ball.position,aggregate.body.getLinearVelocity(),(i+1)/120);if(relationship)appendLineEvidence(ledger,relationship);
     for(const diagnostic of tracker.drainDiagnostics())appendLineEvidence(ledger,diagnostic);
     onStep?.(ball.position,aggregate.body.getLinearVelocity(),i/120);
     if(integrated&&!landing){
      for(const e of collectLineStepEvents(previous,ball.position,hole,tags,routes)){
       if(e.kind==='sky'){routes.push('sky');appendLineEvidence(ledger,{kind:'token',surface:'sky',point:{...e.point}});}
       if(e.kind==='boost'&&aggregate.body.getLinearVelocity().y<0){
        appendLineEvidence(ledger,{kind:'pad-activation',surface:'skip-pad',point:{...e.point}});
        tags.push('boost');contacts.push({kind:'boost',point:new Vector3(e.point.x,e.point.y,e.point.z),body:'powered-pad-swept-surface'});
        const kick=padImpulse(aggregate.body.getLinearVelocity(),hole);aggregate.body.applyImpulse(new Vector3(kick.x,kick.y,kick.z),ball.position);break;
       }
      }
     }
     if(scoreLab&&!landing){const milestone=run.step(ball.position,aggregate.body.getLinearVelocity(),(i+1)/120,scoreLine(ledger).awards.some(a=>a.tier!=='FINISH'));if(milestone)appendLineEvidence(ledger,milestone);}
     previous.copyFrom(ball.position);
     if(landing){if(scoreLab&&run.snapshot())appendLineEvidence(ledger,run.snapshot());appendLineEvidence(ledger,{kind:'termination',reason:'ground-contact'});tracker.finish();for(const diagnostic of tracker.drainDiagnostics())appendLineEvidence(ledger,diagnostic);appendLineEvidence(ledger,{kind:'ruling',targetHit:landing.targetHit===true,surface:hole.target?.id ?? 'ground',label:hole.target?.label.toUpperCase() ?? 'LINE ENDED'});return {start,end:world.state,outcome:hole.target?classifyChallengeRuling({hole,targetHit:landing.targetHit===true,tags}):'line-ended',point:landing.point.asArray(),tags,contacts,ledger};}
     if(stopOnSwitch&&tags.some(t=>t.startsWith('switch-')))return {start,end:world.state,outcome:'interrupted',tags,contacts,ledger};
     if(scoreLab){const end=lifecycle.step(ball.position,aggregate.body.getLinearVelocity(),(i+1)/120);if(end){if(run.snapshot())appendLineEvidence(ledger,run.snapshot());tracker.finish();for(const diagnostic of tracker.drainDiagnostics())appendLineEvidence(ledger,diagnostic);appendLineEvidence(ledger,{kind:'termination',reason:end});return {start,end:world.state,outcome:end,point:ball.position.asArray(),tags,contacts,ledger,elapsed:(i+1)/120};}}
     if(!scoreLab&&(Math.abs(ball.position.x)>(integrated?50:32)||ball.position.z>(integrated?198:124)||ball.position.z< -15||ball.position.y< -8))break;
    }
    return {start,end:world.state,outcome:'oob',point:ball.position.asArray(),tags,contacts,ledger};
   }finally{aggregate.dispose();ball.dispose();}
  },
  dispose(){world.dispose();for(const b of yardBodies)b.dispose();scene.dispose();engine.dispose();}
 };
}

