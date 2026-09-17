import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,PhysicsMotionType,Vector3} from '@babylonjs/core';
import {RAIL_RULES,chargeToSpeed} from './rail-golf-v02.js';
import {stationMuzzle,stationAim} from './stations.js';
import {floorForAction} from './diverter-lab.js';
import {createRedirectTracker,redirectFeature} from './line-recognition.js';
import {RANGE_STATION,rangeEnd} from './mechanism-range.js';

// Browser and NullEngine fixtures use this same step/contact authority. No score module.
export function createMechanismSession(scene,world,emit=()=>{}){
  let flight=null,counter=0,last=null;
  const record=e=>{if(flight&&flight.evidence.length<500)flight.evidence.push(e);emit(e);};
  const finish=reason=>{
    if(!flight||flight.ended)return;
    flight.ended=reason;flight.tracker.finish();
    for(const e of flight.tracker.drainDiagnostics())record(e);
    last={setup:{...flight.setup},environment:{floor:flight.start},endEnvironment:{floor:world.mechanism.state},reason,elapsed:flight.elapsed,evidence:flight.evidence.map(e=>({...e})),contacts:flight.contacts.map(e=>({...e})),position:flight.mesh.position.asArray()};
    flight.aggregate.body.setMotionType(PhysicsMotionType.STATIC);
    emit({kind:'end',reason,last});
  };
  const clear=()=>{if(flight){flight.aggregate.dispose();flight.mesh.dispose();flight=null;}};
  return {
    get flight(){return flight;},get last(){return last;},
    fire(setup){
      if(flight&&!flight.ended)return false;
      if(!Number.isInteger(setup.railIndex)||setup.railIndex<0||setup.railIndex>=RAIL_RULES.railPositions.length||!Number.isFinite(setup.yaw)||setup.yaw<RAIL_RULES.minYaw||setup.yaw>RAIL_RULES.maxYaw||!Number.isFinite(setup.elevation)||setup.elevation<RAIL_RULES.minElevation||setup.elevation>RAIL_RULES.maxElevation||!Number.isFinite(setup.charge)||setup.charge<0||setup.charge>1)return false;
      clear();const muzzle=stationMuzzle(setup,RANGE_STATION),aim=stationAim(setup,RANGE_STATION);
      const mesh=MeshBuilder.CreateSphere('mr-round',{diameter:RAIL_RULES.projectileRadius*2,segments:16},scene);mesh.position.copyFromFloats(muzzle.x,muzzle.y,muzzle.z);
      const aggregate=new PhysicsAggregate(mesh,PhysicsShapeType.SPHERE,{mass:RAIL_RULES.projectileMass,restitution:.38,friction:.28},scene);
      flight={id:++counter,mesh,aggregate,setup:{...setup},start:world.mechanism.state,elapsed:0,slowSince:null,ended:null,ground:false,tracker:createRedirectTracker(),evidence:[],contacts:[]};
      aggregate.body.setCollisionCallbackEnabled(true);
      aggregate.body.getCollisionObservable().add(event=>{
        if(!flight||flight.ended||flight.aggregate!==aggregate||flight.ground)return;
        const other=event.collider===aggregate.body?event.collidedAgainst:event.collider;
        if(!event.point)return;
        const node=other.transformNode,point={x:event.point.x,y:event.point.y,z:event.point.z};
        const prior=flight.contacts.at(-1);
        if(prior?.body===node.name){prior.count++;prior.last=flight.elapsed;}
        else if(flight.contacts.length<500)flight.contacts.push({body:node.name,point,count:1,first:flight.elapsed,last:flight.elapsed});
        flight.tracker.contact(redirectFeature(node,event.point),node.name,event.point);
        const contact=world.mechanism.contact(other,event.point,flight.id);
        if(contact?.kind.startsWith('switch-'))record({kind:'switch',state:contact.kind.endsWith('b')?'B':'A',point});
        if(node.metadata?.rangeGround)flight.ground=true;
      });
      aggregate.body.applyImpulse(new Vector3(aim.x,aim.y,aim.z).scale(chargeToSpeed(setup.charge)*RAIL_RULES.projectileMass),mesh.position);
      emit({kind:'launch',state:flight.start});return true;
    },
    beforeStep(){if(flight&&!flight.ended)flight.tracker.beginStep(flight.aggregate.body.getLinearVelocity(),flight.elapsed);},
    afterStep(){
      if(!flight||flight.ended)return;
      flight.elapsed+=1/120;
      const state=world.mechanism.flush();if(state)emit({kind:'state',state});
      const v=flight.aggregate.body.getLinearVelocity(),p=flight.mesh.position;
      const redirect=flight.tracker.endStep(p,v,flight.elapsed);if(redirect)record(redirect);
      for(const e of flight.tracker.drainDiagnostics())record(e);
      if(flight.ground){finish('first-ground-contact');return;}
      if(v.length()<.6)flight.slowSince??=flight.elapsed;else flight.slowSince=null;
      const end=rangeEnd(p,v,flight.elapsed,flight.slowSince);if(end)finish(end);
    },
    action(action){
      if(action==='recall'&&!last)return null;
      finish('interrupted');const setup=last?.setup;
      world.mechanism.setState(floorForAction(world.mechanism.state,action,last?.environment));
      clear();emit({kind:'state',state:world.mechanism.state});return setup?{...setup}:null;
    },
    dispose(){clear();},
  };
}
