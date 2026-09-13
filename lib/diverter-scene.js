import { MeshBuilder,PhysicsAggregate,PhysicsShapeType,Vector3 } from '@babylonjs/core';
import { DEFAULT_FLOOR,FLOOR_STATES,DIVERTER_FLOOR as DEFAULT_FLOOR_GEOMETRY,DIVERTER_SWITCH as DEFAULT_SWITCH_GEOMETRY,DIVERTER_TARGET as DEFAULT_TARGET,isFloorState } from './diverter-lab.js';

// Shared geometry and body-contact authority for browser and HEADLESS fixtures.
// Floor changes replace a static body after the step, never inside a Havok callback.
export function buildDiverterLab(scene,root,materials,shadows,initial=DEFAULT_FLOOR,options={}) {
  const FLOOR=options.floor ?? DEFAULT_FLOOR_GEOMETRY, SWITCH=options.switch ?? DEFAULT_SWITCH_GEOMETRY, TARGET=options.target ?? DEFAULT_TARGET;
  const states=options.states ?? FLOOR_STATES;
  const bodies=new Set();
  const box=(name,w,h,d,x,y,z,material,parent=root)=>{
    const mesh=MeshBuilder.CreateBox('diverter-'+name,{width:w,height:h,depth:d},scene);
    mesh.parent=parent;mesh.position.set(x,y,z);mesh.material=materials[material];
    mesh.receiveShadows=true;shadows.addShadowCaster(mesh);return mesh;
  };
  const body=(mesh,shape=PhysicsShapeType.BOX,restitution=.1,friction=.8)=>{
    const aggregate=new PhysicsAggregate(mesh,shape,{mass:0,restitution,friction},scene);
    bodies.add(aggregate);return aggregate;
  };
  let groundBody=null,teeBody=null,targetBody=null;
  if(!options.overlay){
  groundBody=body(box('ground',64,1,132,0,-.5,48,'sand'));
  teeBody=body(box('tee',13,.34,7.5,0,.16,-.5,'steel'));
  for(const x of [-4,0,4]) box('rail-'+x,.16,.08,6,x,.61,0,'cyan');
  const apron=MeshBuilder.CreateCylinder('diverter-apron',{height:.12,diameter:TARGET.radius*2+4,tessellation:48},scene);
  apron.parent=root;apron.position.set(TARGET.x,.07,TARGET.z);apron.material=materials.bark;
  const target=MeshBuilder.CreateCylinder('diverter-target',{height:.22,diameter:TARGET.radius*2,tessellation:64},scene);
  target.parent=root;target.position.set(TARGET.x,.2,TARGET.z);target.material=materials.cyan;
  targetBody=body(target,PhysicsShapeType.CYLINDER,.12,.74);
  const ring=MeshBuilder.CreateTorus('diverter-target-rim',{diameter:TARGET.radius*2,thickness:.12,tessellation:48},scene);
  ring.parent=root;ring.position.set(TARGET.x,.35,TARGET.z);ring.material=materials.cyan;
  box('target-pin',.18,9,.18,0,4.5,TARGET.z,'cyan');
  box('target-flag',2,.9,.06,1,8.3,TARGET.z,'cyan');
  }
  if(options.supports !== false) for(const x of [FLOOR.x-FLOOR.width/2-1.5,FLOOR.x+FLOOR.width/2+1.5]) body(box('floor-support-'+x,1.2,1.5,FLOOR.depth+4,x,.75,FLOOR.z,'timber'));
  if(!options.overlay) for(const x of [-26,26]) body(box('boundary-'+x,.6,.8,96,x,.4,47,'timber'));
  const switchMesh=box('switch',SWITCH.width,SWITCH.height,SWITCH.depth,SWITCH.x,SWITCH.y,SWITCH.z,'amber');
  const switchBody=body(switchMesh,PhysicsShapeType.BOX,.25,.5);
  body(box('switch-foot',4.8,1,2,SWITCH.x,.5,SWITCH.z,'machine'));
  box('cable-out',.10,.08,Math.abs(FLOOR.z-SWITCH.z),SWITCH.x,.12,(SWITCH.z+FLOOR.z)/2,'steel');
  box('cable-in',Math.abs(FLOOR.x-SWITCH.x),.08,.10,(FLOOR.x+SWITCH.x)/2,.12,FLOOR.z,'steel');
  let floor=null,floorBody=null,state=initial,pending=null,switchShot=null;
  const setState=next=>{
    if(!isFloorState(next)) throw new Error('Invalid floor state');
    pending=null;
    if(floor&&next===state) return;
    if(floorBody){bodies.delete(floorBody);floorBody.dispose();}
    if(floor){for(const mesh of [floor,...floor.getChildMeshes()]) shadows.removeShadowCaster?.(mesh);floor.dispose();}
    state=next;
    floor=box('bounce-floor',FLOOR.width,FLOOR.height,FLOOR.depth,FLOOR.x,FLOOR.y+(states[state].yOffset ?? 0),FLOOR.z,'timber');
    floor.metadata={lineFeature:{id:'loading-dock',kind:'dock',label:'LOADING DOCK REBOUND'}};
    floor.rotation.x=states[state].pitch*Math.PI/180;
    floor.rotation.z=(states[state].roll ?? 0)*Math.PI/180;
    floorBody=body(floor,PhysicsShapeType.BOX,.86,.18);
    for(const x of options.overlay ? [-.4,-.2,0,.2,.4].map(t=>t*FLOOR.width) : [-7,-3.5,0,3.5,7]) box('floor-stripe-'+x,.30,.045,FLOOR.depth-.3,x,FLOOR.height/2+.03,0,states[state].material,floor);
    switchMesh.material=materials[states[state].material];
  };
  setState(initial);
  return {
    get state(){return state;},get floor(){return floor;},get floorBody(){return floorBody.body;},
    switchBody:switchBody.body,targetBody:targetBody?.body ?? null,groundBody:groundBody?.body ?? null,setState,
    // 'other' and 'point' must come from the projectile's real collision callback.
    contact(other,point,shotId){
      if(!point) return null;
      if(other===switchBody.body&&switchShot!==shotId){
        switchShot=shotId;pending=state==='A'?'B':'A';
        return {kind:'switch-'+pending.toLowerCase(),point:point.clone()};
      }
      if(other===floorBody.body){
        const local=Vector3.TransformCoordinates(point,floor.computeWorldMatrix(true).clone().invert());
        if(Math.abs(local.y-FLOOR.height/2)<.16) return {kind:'floor-'+state.toLowerCase(),point:point.clone()};
      }
      if(other===groundBody?.body||other===teeBody?.body||other===targetBody?.body|| (options.overlay && other.transformNode?.metadata?.yardLanding))
        return {kind:'landing',point:point.clone(),targetHit:(other===targetBody?.body || (options.overlay && other.transformNode?.metadata?.yardLanding === TARGET.id))&&point.y>=.26};
      return null;
    },
    flush(){if(pending){const next=pending;setState(next);return state;}return null;},
    dispose(){for(const aggregate of bodies) aggregate.dispose();bodies.clear();},
  };
}

// Real first-contact authority for the score yard, without any diverter machinery.
// State here is legacy share provenance only; it has no physical effect in this route.
export function buildYardLandingAuthority(target,initial='A'){
 let state=initial;
 return {get state(){return state;},setState(next){if(!isFloorState(next))throw Error('Invalid floor state');state=next;},
  contact(other,point){if(point&&other.transformNode?.metadata?.yardLanding)return {kind:'landing',point:point.clone(),targetHit:other.transformNode.metadata.yardLanding===target?.id&&point.y>=.26};return null;},
  flush(){return null;},dispose(){}};
}
