import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,Logger} from '@babylonjs/core';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
import {VERTICAL_YARD_LAB} from '../../lib/vertical-yard-config.js';
import {createSpatialSession} from '../../lib/spatial-lab-session.js';
Logger.LogLevels=0;
export function verticalHarness(havok){
 const engine=new NullEngine({renderWidth:1440,renderHeight:900,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4}),scene=new Scene(engine);
 scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
 const physics=scene.getPhysicsEngine();physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
 const material=new StandardMaterial('fixture',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material]));
 const world=VERTICAL_YARD_LAB.buildWorld(scene,new TransformNode('vertical',scene),materials,{addShadowCaster(){},removeShadowCaster(){}});
 const session=createSpatialSession(scene,world,VERTICAL_YARD_LAB);
 return {engine,scene,world,session,
  step(){session.beforeStep();physics._step(1/120);session.afterStep();},
  shoot(setup){session.action('retry');if(!session.fire(setup))throw Error('Invalid fixture');for(let i=0;i<7300&&!session.flight.ended;i++)this.step();return session.last;},
  dispose(){session.dispose();world.dispose();scene.dispose();engine.dispose();},
 };
}
