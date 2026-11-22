import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger,PhysicsMotionType} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {createSpatialSession} from '../../lib/spatial-lab-session.js';
Logger.LogLevels=0;
export const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
export function architectureHarness(config,{width=1440,height=900}={}){
 const engine=new NullEngine({renderWidth:width,renderHeight:height,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const material=new StandardMaterial('fixture',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material]));
 const casters=new Set(),root=new TransformNode('architecture',scene),started=performance.now();
 const world=config.buildWorld(scene,root,materials,{addShadowCaster:m=>casters.add(m),removeShadowCaster:m=>casters.delete(m)}),buildMs=performance.now()-started;
 const session=createSpatialSession(scene,world,config);let before=null,touching=[],impacts=[],path=[],steps=0;
 const resources=()=>{const bodies=physics.getBodies();return {staticBodies:bodies.filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length,dynamicBodies:bodies.filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length,animatedBodies:bodies.filter(b=>b.getMotionType()===PhysicsMotionType.ANIMATED).length,meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length,geometries:scene.geometries.length,casters:casters.size,vertices:scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),triangles:scene.meshes.filter(m=>m.getClassName()!=='LinesMesh').reduce((n,m)=>n+m.getTotalIndices()/3,0),subMeshes:scene.meshes.reduce((n,m)=>n+(m.subMeshes?.length??0),0)};};
 return {engine,scene,world,session,root,casters,buildMs,resources,
 step(){before=session.flight?.aggregate.body.getLinearVelocity().asArray();touching=[];session.beforeStep();physics._step(1/120);const outgoing=session.flight?.aggregate.body.getLinearVelocity().asArray();for(const c of touching)impacts.push({...c,incoming:before,outgoing});session.afterStep();if(session.flight)path.push([session.flight.elapsed,...session.flight.mesh.position.asArray(),...outgoing]);steps++;},
 shoot(setup,{fullPath=false}={}){session.action('retry');impacts=[];path=[];steps=0;if(!session.fire(setup))throw Error('Invalid fixture');session.flight.aggregate.body.getCollisionObservable().add(e=>{const own=session.flight.aggregate.body,other=e.collider===own?e.collidedAgainst:e.collider;touching.push({body:other.transformNode.name,time:session.flight.elapsed,point:e.point?.asArray(),normal:e.normal?.asArray()});});for(let i=0;i<7300&&!session.flight.ended;i++)this.step();if(!session.last)throw Error('Unresolved shot');return {record:structuredClone(session.last),impacts:structuredClone(impacts),path:structuredClone(fullPath?path:path.filter((_,i)=>i%12===0||i===path.length-1)),steps};},
 disposeWorld(){session.dispose();world.dispose();root.dispose();material.dispose();return resources();},
 dispose(){session.dispose();world.dispose();root.dispose();material.dispose();scene.dispose();engine.dispose();},
 };
}
