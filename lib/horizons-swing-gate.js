import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,Quaternion,Vector3,Color3} from '@babylonjs/core';
import {RAIL_RULES} from './rail-golf-v02.js';
import {createPeriodicReflector} from './periodic-reflector.js';

export const SWING_GATE=Object.freeze({id:'horizons-swing-gate-v1',hz:120,periodTicks:1440,amplitude:78,x:0,y:7,z:32,width:14,height:12,depth:1.4});
export function swingGateTick(value){
  const tick=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;
  if(!Number.isSafeInteger(tick)||tick<0||tick>=SWING_GATE.periodTicks)throw Error('Invalid gate phase');
  return tick;
}
export function swingGatePose(tick){
  return {position:new Vector3(SWING_GATE.x,SWING_GATE.y,SWING_GATE.z),rotation:Quaternion.RotationYawPitchRoll(SWING_GATE.amplitude*Math.PI/180*Math.sin(tick/SWING_GATE.periodTicks*Math.PI*2),0,0)};
}

// The optional control is only for the reproducible ablation harness. It is not
// an import field or a player-selectable physics coefficient.
export function buildSwingGate(scene,root,materials,shadows,{control='moving'}={}){
  if(!['moving','absent','static'].includes(control))throw Error('Unknown gate control');
  const bodies=[],meshes=[],casters=[],features=new Map();
  let tick=0,launchTick=0,mode='LIVE',ready=true,held=false;
  const box=(name,x,y,z,w,h,d,material,{physical=true,feature=null,ground=false,shadow=true}={})=>{
    const mesh=MeshBuilder.CreateBox(`hg-${name}`,{width:w,height:h,depth:d},scene);mesh.parent=root;mesh.position.set(x,y,z);mesh.material=materials[material];mesh.receiveShadows=true;meshes.push(mesh);
    if(shadow){shadows.addShadowCaster(mesh);casters.push(mesh);}
    if(feature){mesh.metadata={lineFeature:{id:feature,kind:'range-timber',label:feature==='swing-gate'?'GATE RETURN':'FAR FACE'}};features.set(feature,mesh);}
    if(ground)mesh.metadata={rangeGround:true};
    if(physical)bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:feature?.startsWith('far')?.86:.1,friction:feature?.startsWith('far')?.18:.8},scene));
    return mesh;
  };
  const ground=box('ground',0,-.5,40,96,1,110,'sand',{ground:true,shadow:false});
  box('tee',0,.15,-1,14,.3,8,'machine',{ground:true});
  for(const x of RAIL_RULES.railPositions)box('rail',x,.34,-1,.12,.06,7,'cyan',{physical:false,shadow:false});
  for(const x of [-10,10])box('portal-post',x,7,32,1,14,2,'steel');
  box('portal-beam',0,14.5,32,21,1,2,'steel');
  // Honest broad receiver beyond the gate: passage can become a return through
  // the same moving aperture rather than merely a longer empty-ground flight.
  box('far-face',0,6,68,24,12,1.4,'timber',{feature:'far-face'});
  const line=MeshBuilder.CreateLines('hg-sweep-footprint',{points:Array.from({length:49},(_,i)=>new Vector3(Math.sin(i/48*Math.PI*2)*7.1,.04,32+Math.cos(i/48*Math.PI*2)*7.1))},scene);line.parent=root;line.color=new Color3(.68,.49,.25);meshes.push(line);
  let reflector=null,paddle=null;
  if(control!=='absent'){
    paddle=box('gate',0,7,32,14,12,1.4,'timber',{physical:false,feature:'swing-gate'});paddle.rotationQuaternion=Quaternion.Identity();
    reflector=createPeriodicReflector(scene,paddle,swingGatePose);
    for(const x of [-6.65,6.65])for(const side of [-1,1]){const stripe=box('edge-stripe',x,0,side*.735,.45,12,.06,'amber',{physical:false,shadow:false});stripe.parent=paddle;}
    for(const side of [-1,1]){const band=box('face-stripe',0,0,side*.74,14,.55,.08,'amber',{physical:false,shadow:false});band.parent=paddle;}
    // Narrow axle is inside the same rectangular collision envelope.
    const hub=box('pivot-mark',0,0,-.77,.5,11,.06,'steel',{physical:false,shadow:false});hub.parent=paddle;
  }
  const reset=at=>{tick=swingGateTick(at);reflector?.reset(tick);};
  const move=at=>{tick=at%SWING_GATE.periodTicks;if(control==='moving')reflector?.move(tick);};
  const snapshot=()=>({layout:SWING_GATE.id,gateMode:mode,gateTick:String(tick)});
  const restore=state=>{
    if(!state||Object.keys(state).sort().join(',')!=='gateMode,gateTick,layout'||state.layout!==SWING_GATE.id||!['LIVE','PAUSED'].includes(state.gateMode))throw Error('Invalid swing-gate environment');
    const at=swingGateTick(state.gateTick);mode=state.gateMode;held=true;ready=true;reset(at);
  };
  reset(0);
  return {
    ground,features,paddle,get paddleBody(){return reflector?.aggregate;},
    environment:{snapshot,restore,reset(){mode='LIVE';ready=true;held=false;reset(0);},setControl(id,value){if(id!=='gateMode'||!['LIVE','PAUSED'].includes(value))throw Error('Unknown gate control');mode=value;held=value==='PAUSED';ready=true;reflector?.stop();}},
    prepareLaunch(){launchTick=tick;reset(launchTick);},
    onLaunch(){ready=false;held=false;},onResolve(){ready=false;reflector?.stop();},
    onAction(action){ready=true;if(action!=='recall'){held=mode==='PAUSED';reflector?.stop();}},
    beforeIdleStep(){if(ready&&!held&&mode==='LIVE')move(tick+1);},
    beforeStep(flight,dt){if(!flight||flight.ended)return;move(launchTick+Math.round((flight.elapsed+dt)*SWING_GATE.hz));},
    diagnostics(){return {gateMode:mode,gateTick:String(tick),phaseSeconds:(tick/SWING_GATE.hz).toFixed(2),recallHeld:held?'PHASE HELD':'',periodSeconds:SWING_GATE.periodTicks/SWING_GATE.hz,staticBodies:bodies.length,animatedBodies:reflector?1:0,meshes:meshes.length,shadowCasters:casters.length};},
    dispose(){reflector?.dispose();for(const body of bodies)body.dispose();for(const mesh of casters)shadows.removeShadowCaster(mesh);for(const mesh of meshes)mesh.dispose();},
  };
}

export const HORIZONS_SWING_GATE=Object.freeze({
  id:'horizons-swing-gate',title:'Swing Gate',subtitle:'Worldcraft Horizons · periodic mechanism study',
  brief:'A wide timber gate slowly opens and closes the route. Slip past it, borrow its face, or see what changes on the way back. No required target.',
  defaultSetup:{railIndex:2,yaw:0,elevation:18,charge:.55},defaultPowerMode:'set',shelf:{id:SWING_GATE.id,limit:4},
  station:()=>({id:'swing-gate-apron',label:'Gate Apron',x:0,z:0,yaw:0}),
  bounds:{minX:-48,maxX:48,minZ:-15,maxZ:95,minY:-8},survey:{position:[48,55,-12],target:[0,4,39]},buildWorld:buildSwingGate,
  controls:[{id:'gateMode',label:'Before release',options:['LIVE','PAUSED'],placement:'primary'}],
  controlHint:'LIVE lets you choose when to fire. PAUSED holds a release phase while you aim; the gate always moves after firing. Restore holds the saved phase. Choose LIVE to resume.',
});
