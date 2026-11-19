import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {HORIZONS_SWING_GATE,buildSwingGate,SWING_GATE} from '../../lib/horizons-swing-gate.js';
import {createSpatialSession} from '../../lib/spatial-lab-session.js';
Logger.LogLevels=0;
export const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
export function gateHarness({control='moving'}={}){
 const engine=new NullEngine({renderWidth:1440,renderHeight:900,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const material=new StandardMaterial('fixture',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material]));
 const casters=new Set(),root=new TransformNode('gate-world',scene),started=performance.now();
 const world=buildSwingGate(scene,root,materials,{addShadowCaster(m){casters.add(m);},removeShadowCaster(m){casters.delete(m);}},{control});
 const buildMs=performance.now()-started,events=[],session=createSpatialSession(scene,world,HORIZONS_SWING_GATE,e=>events.push(e));
 let before=null,touching=[],contacts=[],path=[];
 return {engine,scene,world,session,events,root,casters,buildMs,
  step(){before=session.flight?.aggregate.body.getLinearVelocity().asArray();touching=[];session.beforeStep();physics._step(1/120);const out=session.flight?.aggregate.body.getLinearVelocity().asArray();for(const c of touching)contacts.push({...c,incoming:before,outgoing:out});session.afterStep();if(session.flight)path.push([session.flight.elapsed,...session.flight.mesh.position.asArray()]);},
  fire(setup,tick=0){session.action('retry');world.environment.restore({layout:SWING_GATE.id,gateMode:'LIVE',gateTick:String(tick)});events.length=0;contacts=[];path=[];if(!session.fire(setup))throw Error('Invalid fixture');session.flight.aggregate.body.getCollisionObservable().add(e=>{const own=session.flight.aggregate.body,other=e.collider===own?e.collidedAgainst:e.collider;touching.push({body:other.transformNode.name,time:session.flight.elapsed,point:e.point?.asArray(),normal:e.normal?.asArray()});});},
  shoot(setup,tick=0){this.fire(setup,tick);for(let i=0;i<7300&&!session.flight.ended;i++)this.step();return {record:structuredClone(session.last),impacts:structuredClone(contacts),path:structuredClone(path)};},
  dispose(){session.dispose();world.dispose();root.dispose();scene.dispose();engine.dispose();},
 };
}
