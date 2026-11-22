import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,Quaternion,Vector3,Color3} from '@babylonjs/core';
import {createSpatialSession} from './spatial-lab-session.js';

export const GUEST_STONE=Object.freeze({id:'playgrounds-guest-stone-v1',mass:12,diameter:7,height:4,friction:.55,restitution:.1,linearDamping:.5,angularDamping:2,quietTicks:60,settleLimitTicks:1200,linearQuiet:.025,angularQuiet:.025,home:[0,2,24,0,Math.sin(Math.PI/16),0,Math.cos(Math.PI/16)]});
export function validGuestSetup(s){return s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).sort().join(',')==='charge,elevation,railIndex,yaw'&&Number.isInteger(s.railIndex)&&s.railIndex>=0&&s.railIndex<=2&&Number.isFinite(s.yaw)&&Math.abs(s.yaw)<=70&&Number.isFinite(s.elevation)&&s.elevation>=5&&s.elevation<=85&&Number.isFinite(s.charge)&&s.charge>=0&&s.charge<=1;}
const finitePose=p=>Array.isArray(p)&&p.length===7&&p.every(Number.isFinite)&&Math.abs(p[0])<=30&&p[1]>=1.5&&p[1]<=8&&p[2]>=8&&p[2]<=62&&Math.abs(Math.hypot(...p.slice(3))-1)<.001;
function readGuestEnvironment(state,layout){
 if(!state||Object.keys(state).sort().join(',')!=='layout,pose'||state.layout!==layout||typeof state.pose!=='string'||state.pose.length>512)throw Error('This is not a Guest Stone starting state.');
 let p;try{p=JSON.parse(state.pose);}catch{throw Error('Invalid Guest Stone pose.');}if(!finitePose(p))throw Error('Invalid Guest Stone pose.');return p;
}
export function guestPose(state){return readGuestEnvironment(state,GUEST_STONE.id);}
export function guestEnvironment(pose){if(!finitePose(pose))throw Error('Invalid Guest Stone pose.');return {layout:GUEST_STONE.id,pose:JSON.stringify(pose)};}

export function buildGuestStone(scene,root,materials,shadows,{context=true,stone=true}={}){
 const meshes=[],bodies=[],casters=[],features=new Map(),layout=`${GUEST_STONE.id}${context?'':'-bare'}${stone?'':'-no-stone'}`;
 const environmentFor=p=>({...guestEnvironment(p),layout});
 const box=(name,x,y,z,w,h,d,material='timber',{ground=false,physical=true,reflect=false,shadow=true}={})=>{
  const m=MeshBuilder.CreateBox(`guest-${name}`,{width:w,height:h,depth:d},scene);m.parent=root;m.position.set(x,y,z);m.material=materials[material];m.receiveShadows=true;meshes.push(m);
  m.metadata=ground?{rangeGround:true}:{lineFeature:{id:name,kind:'range-timber',label:name.replaceAll('-',' ').toUpperCase()}};
  if(physical)bodies.push(new PhysicsAggregate(m,PhysicsShapeType.BOX,{mass:0,friction:reflect?.18:.8,restitution:reflect?.86:.1},scene));
  if(shadow){shadows.addShadowCaster(m);casters.push(m);}features.set(name,m);return m;
 };
 const ground=box('pavement',0,-.5,28,56,1,76,'sand',{ground:true,shadow:false});
 box('veranda',0,-.05,-1,16,.1,9,'machine',{ground:true});
 if(context){
  box('west-bank',-16,5,28,1,10,40,'timber',{reflect:true});
  box('far-bank',0,5,53,33,10,1,'timber',{reflect:true});
  box('cradle-back',0,1.5,44.5,11,3,1,'machine');
  box('cradle-left',-5.5,1.5,42,1,3,6,'machine');
  box('cradle-right',5.5,1.5,42,1,3,6,'machine');
  box('alcove-back',20,2.5,28,1,5,18,'machine');
  box('alcove-near',16,1.5,19.5,9,3,1,'machine');
  box('alcove-far',16,1.5,36.5,9,3,1,'machine');
 }
 // Scoring in the paving is a visual displacement reference, never a collider or score.
 for(let z=14;z<=44;z+=2){const l=MeshBuilder.CreateLines('guest-paving-score',{points:[new Vector3(-12,.015,z),new Vector3(12,.015,z)]},scene);l.parent=root;l.color=new Color3(.28,.34,.33);meshes.push(l);}
 for(const x of [-4,0,4])box('rail',x,.035,-1,.1,.06,7,'cyan',{physical:false,shadow:false});
 const prop=MeshBuilder.CreateCylinder('guest-stone',{height:4,diameter:7,tessellation:8},scene);prop.parent=root;prop.material=materials.stone??materials.machine;prop.receiveShadows=true;prop.metadata={lineFeature:{id:'guest-stone',kind:'range-timber',label:'GUEST STONE'}};meshes.push(prop);features.set('guest-stone',prop);shadows.addShadowCaster(prop);casters.push(prop);
 let aggregate=null,status='ready',held=[...GUEST_STONE.home],quiet=0,settleTicks=0,hasMoved=false;
 const pose=()=>[...prop.position.asArray(),...prop.rotationQuaternion.asArray()];
 const rebuild=(p,dynamic)=>{
  aggregate?.dispose();aggregate=null;prop.position.copyFromFloats(...p.slice(0,3));prop.rotationQuaternion=Quaternion.FromArray(p,3);prop.computeWorldMatrix(true);prop.setEnabled(stone);
  if(stone){aggregate=new PhysicsAggregate(prop,PhysicsShapeType.CONVEX_HULL,{mass:dynamic?GUEST_STONE.mass:0,friction:GUEST_STONE.friction,restitution:GUEST_STONE.restitution},scene);if(dynamic){aggregate.body.setLinearDamping(GUEST_STONE.linearDamping);aggregate.body.setAngularDamping(GUEST_STONE.angularDamping);}}
 };
 rebuild(held,false);
 const snapshot=()=>environmentFor(status==='ready'?held:pose());
 const restore=state=>{const p=readGuestEnvironment(state,layout);held=[...p];rebuild(held,false);status='ready';quiet=0;settleTicks=0;hasMoved=false;};
 return {ground,features,prop,get propAggregate(){return aggregate;},get status(){return status;},
  environment:{snapshot,restore,reset(){restore(environmentFor(GUEST_STONE.home));}},
  prepareLaunch(){if(status!=='ready')throw Error('Wait for the stone to settle, or undo the attempt.');rebuild(held,true);quiet=0;settleTicks=0;hasMoved=false;},
  onLaunch(){status='flight';},
  onResolve(flight){status='settling';settleTicks=0;quiet=0;flight.aggregate.shape.filterMembershipMask=0;flight.aggregate.shape.filterCollideMask=0;},
  afterPhysics(){
   if(status==='ready'||status==='blocked')return;if(!aggregate){if(status==='settling')status='ready';return;}
   if(aggregate.body.getLinearVelocity().length()>.05||aggregate.body.getAngularVelocity().length()>.05)hasMoved=true;
   if(status!=='settling')return;
   settleTicks++;
   const v=aggregate.body.getLinearVelocity().length(),w=aggregate.body.getAngularVelocity().length();
   quiet=v<=GUEST_STONE.linearQuiet&&w<=GUEST_STONE.angularQuiet?quiet+1:0;
   if(quiet>=GUEST_STONE.quietTicks){held=pose();if(!finitePose(held)){status='blocked';return;}rebuild(held,false);status='ready';}
   else if(settleTicks>=GUEST_STONE.settleLimitTicks)status='blocked';
  },
  diagnostics(){return {status,quietTicks:quiet,settleTicks,settleSeconds:settleTicks/120,hasMoved,position:prop.position.asArray(),linearSpeed:aggregate?.body.getLinearVelocity().length()??0,angularSpeed:aggregate?.body.getAngularVelocity().length()??0,staticBodies:bodies.length+(status==='ready'&&stone?1:0),dynamicBodies:status!=='ready'&&stone?1:0,meshes:meshes.length,shadowCasters:casters.length};},
  dispose(){aggregate?.dispose();aggregate=null;for(const b of bodies)b.dispose();for(const m of casters)shadows.removeShadowCaster(m);for(const m of meshes)m.dispose();},
 };
}
export const PLAYGROUNDS_GUEST_STONE=Object.freeze({
 id:'playgrounds-guest-stone',title:'Guest Stone',subtitle:'An unfinished delivery',
 brief:'The stone stays where your shot leaves it. Nudge it toward either recess, turn it, or make a new bank. The pavement ends the ball’s flight; the stone gets time to settle.',
 defaultSetup:{railIndex:1,yaw:0,elevation:8,charge:.55},defaultPowerMode:'set',
 station:()=>({id:'guest-veranda',label:'Veranda',x:0,z:0,yaw:0}),bounds:{minX:-28,maxX:28,minZ:-10,maxZ:66,minY:-8},
 survey:{position:[39,45,-13],target:[1,1,27]},buildWorld:buildGuestStone,
});

// This adapter extends only the object lifecycle, never the ball's physical shot.
// endEnvironment is the instant the ball ends; settledEnvironment is captured later.
export function createGuestSession(scene,world,emit=()=>{}){
 let last=null,path=[],stonePath=[],ticks=0,preVelocity=null,contactsThisStep=[],impacts=[],seenEnd=false;
 const impactTimes=new Map();
 const accepted=createSpatialSession(scene,world,PLAYGROUNDS_GUEST_STONE,event=>{
  if(event.kind==='end'){seenEnd=true;last={...structuredClone(event.last),path:structuredClone(path),stonePath:structuredClone(stonePath),impacts:structuredClone(impacts),settledEnvironment:null,settleElapsed:null};emit({kind:'ball-ended',record:last});}
  else emit(event);
 });
 return {
  get flight(){return accepted.flight;},get last(){return last;},get path(){return path;},get status(){return world.status;},
  fire(setup){if(!validGuestSetup(setup)||world.status!=='ready'||(accepted.flight&&!accepted.flight.ended))return false;path=[];stonePath=[];ticks=0;impacts=[];impactTimes.clear();seenEnd=false;last=null;
   if(!accepted.fire(setup))return false;
   path.push([0,...accepted.flight.mesh.position.asArray()]);stonePath.push([0,...world.prop.position.asArray(),...world.prop.rotationQuaternion.asArray()]);
   accepted.flight.aggregate.body.getCollisionObservable().add(e=>{const f=accepted.flight;if(!f||f.ended)return;const own=f.aggregate.body,other=e.collider===own?e.collidedAgainst:e.collider;contactsThisStep.push({body:other.transformNode.name,time:f.elapsed,point:e.point?.asArray(),normal:e.normal?.asArray()});});return true;
  },
  beforeStep(){preVelocity=accepted.flight&&!accepted.flight.ended?accepted.flight.aggregate.body.getLinearVelocity().asArray():null;contactsThisStep=[];accepted.beforeStep();},
  afterStep(){
   const f=accepted.flight;
   if(f&&!f.ended){const outgoing=f.aggregate.body.getLinearVelocity().asArray();for(const impact of contactsThisStep)if(impacts.length<100){impacts.push({...impact,incoming:preVelocity,outgoing});const speed=Math.abs(preVelocity.reduce((sum,v,i)=>sum+v*(impact.normal?.[i]??0),0));if(impact.time-(impactTimes.get(impact.body)??-1)>.06){impactTimes.set(impact.body,impact.time);emit({kind:'impact',speed,ground:impact.body==='guest-pavement'||impact.body==='guest-veranda'});}}if(ticks%6===0)path.push([f.elapsed+1/120,...f.mesh.position.asArray()]);}
   accepted.afterStep();
   if(accepted.flight){ticks++;if(ticks%6===0&&stonePath.length<1400)stonePath.push([ticks/120,...world.prop.position.asArray(),...world.prop.rotationQuaternion.asArray()]);}
   world.afterPhysics();
   if(seenEnd&&last&&!last.settledEnvironment&&world.status==='ready'){
    const f=accepted.flight;const finalPoint=[f.elapsed,...f.mesh.position.asArray()];if(path.at(-1)?.[0]!==f.elapsed)path.push(finalPoint);
    if(stonePath.at(-1)?.[0]!==ticks/120)stonePath.push([ticks/120,...world.prop.position.asArray(),...world.prop.rotationQuaternion.asArray()]);
    last.path=structuredClone(path);last.stonePath=structuredClone(stonePath);last.impacts=structuredClone(impacts);last.settledEnvironment=world.environment.snapshot();last.settleElapsed=ticks/120;emit({kind:'settled',record:structuredClone(last)});
   }
   if(seenEnd&&world.status==='blocked')emit({kind:'settle-blocked'});
  },
  next(){if(world.status!=='ready')return null;return accepted.action('retry');},
  undo(){if(!last)return null;accepted.action('retry');world.environment.restore(last.environment);emit({kind:'restored'});return {...last.setup};},
  reset(){accepted.action('reset');last=null;seenEnd=false;emit({kind:'reset'});},
  restore(record){const state=guestPose(record.environment);if(!validGuestSetup(record.setup))throw Error('Invalid Guest Stone launch setup.');accepted.action('retry');world.environment.restore(guestEnvironment(state));last=null;seenEnd=false;emit({kind:'restored'});return {...record.setup};},
  dispose(){accepted.dispose();},
 };
}
