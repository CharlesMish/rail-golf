import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {buildGuestStone,createGuestSession} from '../../lib/playgrounds-persistence.js';
Logger.LogLevels=0;
export const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
export function persistenceHarness(options={}){
 const engine=new NullEngine({renderWidth:1440,renderHeight:900}),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const root=new TransformNode('guest-root',scene),mat=new StandardMaterial('fixture',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine','stone'].map(k=>[k,mat])),casters=new Set(),start=performance.now();
 const world=buildGuestStone(scene,root,materials,{addShadowCaster:m=>casters.add(m),removeShadowCaster:m=>casters.delete(m)},options),buildMs=performance.now()-start,events=[],session=createGuestSession(scene,world,e=>events.push(e));
 return {engine,scene,physics,world,root,casters,session,events,buildMs,step(){session.beforeStep();physics._step(1/120);session.afterStep();},shoot(setup,{reset=true}={}){if(reset)session.reset();else session.next();if(!session.fire(setup))throw Error('Cannot fire');for(let i=0;i<9000&&(!session.last?.settledEnvironment)&&world.status!=='blocked';i++)this.step();return structuredClone(session.last);},dispose(){session.dispose();world.dispose();root.dispose();mat.dispose();scene.dispose();engine.dispose();}};
}
