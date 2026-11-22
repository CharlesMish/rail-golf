import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {buildSaddleProof,SADDLE_CONFIG,saddleHeight,SADDLE_PROOF} from '../../lib/playgrounds-saddle.js';
import {createSpatialSession} from '../../lib/spatial-lab-session.js';
Logger.LogLevels=0;
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
export function saddleHarness(options={}){
 const engine=new NullEngine({renderWidth:1440,renderHeight:900,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const material=new StandardMaterial('fixture',scene),materials={sand:material,timber:material},root=new TransformNode('saddle-world',scene),casters=new Set();
 const started=performance.now(),world=buildSaddleProof(scene,root,materials,{addShadowCaster(m){casters.add(m);},removeShadowCaster(m){casters.delete(m);} },options),buildMs=performance.now()-started;
 const session=createSpatialSession(scene,world,SADDLE_CONFIG);let impacts=[],path=[],touching=[],before=null;
 return {engine,scene,world,session,root,casters,buildMs,
 step(){before=session.flight?.aggregate.body.getLinearVelocity().asArray();touching=[];session.beforeStep();physics._step(1/120);const out=session.flight?.aggregate.body.getLinearVelocity().asArray();for(const c of touching)impacts.push({...c,incoming:before,outgoing:out});session.afterStep();if(session.flight)path.push([session.flight.elapsed,...session.flight.mesh.position.asArray(),...out]);},
 shoot(setup){session.action('retry');impacts=[];path=[];if(!session.fire(setup))throw Error('Invalid fixture');session.flight.aggregate.body.getCollisionObservable().add(e=>{const own=session.flight.aggregate.body,other=e.collider===own?e.collidedAgainst:e.collider;touching.push({body:other.transformNode.name,time:session.flight.elapsed,point:e.point?.asArray(),normal:e.normal?.asArray()});});for(let i=0;i<7250&&!session.flight.ended;i++)this.step();
 const face=impacts.filter(c=>c.body==='vs-carrying-face'),episodes=[];for(const c of face){let p=episodes.at(-1);if(!p||c.time-p.last>1.5/120){p={first:c.time,last:c.time,count:0,firstPoint:c.point,lastPoint:c.point,incoming:c.incoming,outgoing:c.outgoing};episodes.push(p);}p.last=c.time;p.count++;p.lastPoint=c.point;p.outgoing=c.outgoing;}
 let streak=0,maxStreak=0,nearCount=0;const first=face[0]?.time??Infinity;
 for(const [t,x,y,z]of path){const inside=Math.abs(x)<SADDLE_PROOF.maxX-.5&&z>16&&z<74;const grid=options.grid??1.5,x0=SADDLE_PROOF.minX+Math.floor((x-SADDLE_PROOF.minX)/grid)*grid,h0=saddleHeight(x0,z,options.control),h1=saddleHeight(x0+grid,z,options.control),slope=(h1-h0)/grid,height=h0+(x-x0)*slope;const gap=(y-height)/Math.hypot(1,slope,SADDLE_PROOF.downSlope)-RAIL_RULES.projectileRadius;const near=t>=first&&inside&&gap>-.1&&gap<.15;if(near){nearCount++;maxStreak=Math.max(maxStreak,++streak);}else streak=0;}
 return {record:structuredClone(session.last),impacts:structuredClone(impacts),episodes,path:structuredClone(path),metrics:{faceHits:face.length,episodes:episodes.length,firstContact:first===Infinity?null:first,nearFaceSeconds:nearCount/120,maxNearFaceStreakSeconds:maxStreak/120,terminalSide:Math.sign(session.last.position[0])}};
 },dispose(){session.dispose();world.dispose();root.dispose();material.dispose();const remaining={meshes:scene.meshes.length,materials:scene.materials.length,geometries:scene.geometries.length,casters:casters.size,bodies:scene.getPhysicsEngine().getBodies().length};scene.dispose();engine.dispose();return remaining;},
 };
}
