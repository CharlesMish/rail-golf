import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {NullEngine,Scene,Vector3,HavokPlugin,TransformNode,StandardMaterial,PhysicsMotionType} from '@babylonjs/core';
import {gateHarness,havok} from './gate-harness.mjs';
import {buildSwingGate} from '../../lib/horizons-swing-gate.js';
import {buildMechanismVocabulary} from '../../lib/mechanism-vocabulary-scene.js';
import {vocabularyHarness} from '../../tests/helpers/mechanism-vocabulary-physics.mjs';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
const setup={railIndex:2,yaw:0,elevation:18,charge:.55};
const summarise=r=>({record:r.record,impacts:r.impacts,path:r.path.filter((_,i)=>i%12===0)});
const h=gateHarness(),absent=gateHarness({control:'absent'}),staticGate=gateHarness({control:'static'});
const cases={};
for(const [name,shot,tick]of [['left-return',setup,0],['passage',setup,240],['near-return',setup,600],['faster-return',setup,1320],['far-face',{...setup,charge:.75},240],['return-through-gate',{...setup,elevation:20,charge:1},360],['outbound-interception',{...setup,elevation:20,charge:1},840]])cases[name]={setup:shot,releaseTick:tick,...summarise(h.shoot(shot,tick))};
cases['no-gate-control']={setup,releaseTick:240,...summarise(absent.shoot(setup,240))};
cases['stationary-control']={setup,releaseTick:600,...summarise(staticGate.shoot(setup,600))};
const neighbours=[];
for(const tick of [240,600])for(const delta of [-6,0,6])for(const patch of [{},{yaw:-.5},{yaw:.5},{elevation:17.5},{elevation:18.5},{charge:.54},{charge:.56}]){
 const s={...setup,...patch},a=h.shoot(s,tick+delta),b=h.shoot(s,tick+delta);neighbours.push({setup:s,tick:tick+delta,order:a.record.contacts.map(c=>c.body),terminal:{reason:a.record.reason,elapsed:a.record.elapsed,position:a.record.position},repeat:JSON.stringify(a)===JSON.stringify(b)});
}
const returnNeighbours=[];
for(const patch of [{},{yaw:-.5},{yaw:.5},{elevation:19.5},{elevation:20.5},{charge:.99}]){const s={...setup,elevation:20,charge:1,...patch},r=h.shoot(s,360);returnNeighbours.push({setup:s,tick:360,order:r.record.contacts.map(c=>c.body),terminal:{reason:r.record.reason,elapsed:r.record.elapsed,position:r.record.position}});}
const phaseSurvey=[];
for(let tick=0;tick<1440;tick+=30){const r=h.shoot(setup,tick);phaseSurvey.push({tick,order:r.record.contacts.map(c=>c.body),position:r.record.position,maxSpeed:Math.max(...r.impacts.flatMap(c=>[Math.hypot(...c.incoming),Math.hypot(...c.outgoing)]))});}
const sameOrientation={toward:cases['faster-return'],away:cases['near-return']};
const resource=[];
for(const [name,builder]of [['swing-gate',buildSwingGate],['fan-paddle-control',buildMechanismVocabulary]]){
 const samples=[];let counts,cleanup;
 for(let i=0;i<13;i++){
  const engine=new NullEngine({renderWidth:1440,renderHeight:900}),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
  const root=new TransformNode('bench',scene),material=new StandardMaterial('fixture',scene),materials=Object.fromEntries(['sand','steel','cyan','bark','timber','amber','violet','machine'].map(k=>[k,material])),casters=new Set();
  const started=performance.now(),world=builder(scene,root,materials,{addShadowCaster:m=>casters.add(m),removeShadowCaster:m=>casters.delete(m)});samples.push(performance.now()-started);
  const b=scene.getPhysicsEngine().getBodies();counts={static:b.filter(x=>x.getMotionType()===PhysicsMotionType.STATIC).length,animated:b.filter(x=>x.getMotionType()===PhysicsMotionType.ANIMATED).length,dynamic:b.filter(x=>x.getMotionType()===PhysicsMotionType.DYNAMIC).length,meshes:scene.meshes.length,submeshes:scene.meshes.reduce((n,m)=>n+(m.subMeshes?.length??0),0),shadowCasters:casters.size,vertices:scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),triangles:scene.meshes.filter(m=>m.getClassName()!=='LinesMesh').reduce((n,m)=>n+m.getTotalIndices()/3,0),lineSegments:scene.meshes.filter(m=>m.getClassName()==='LinesMesh').reduce((n,m)=>n+m.getTotalIndices()/2,0)};
  world.dispose();root.dispose();cleanup={bodies:scene.getPhysicsEngine().getBodies().length,meshes:scene.meshes.length};scene.dispose();engine.dispose();
 }
 const warm=samples.slice(1).sort((a,b)=>a-b);resource.push({name,counts,buildMs:{cold:samples[0],median:(warm[5]+warm[6])/2,min:warm[0],max:warm.at(-1),samples},cleanup});
}
const resetSamples=[];for(let i=0;i<100;i++){const start=performance.now();h.session.action('reset');resetSamples.push(performance.now()-start);}resetSamples.sort((a,b)=>a-b);
const windH=vocabularyHarness(havok),wind={};
for(const state of ['OFF','LEFT','RIGHT']){windH.world.environment.restore({wind:state,paddleMode:'SYNC',paddleTick:'0'});const r=windH.shoot({railIndex:1,yaw:-16,elevation:25,charge:.55});wind[state]={position:r.position,elapsed:r.elapsed,reason:r.reason,evidence:r.evidence,repeat:JSON.stringify(r)===JSON.stringify(windH.shoot(r.setup))};}
windH.dispose();h.dispose();absent.dispose();staticGate.dispose();
const out={format:'rail-golf-horizons-gate-evidence-v1',testedSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineSha:'0b151c5c94849b78ccda6c41a1755b66471e3fa2',authority:'Babylon NullEngine + actual Havok at 120 Hz; no rendered frame or phone performance claim',cases,neighbours,returnNeighbours,phaseSurvey,sameOrientationNote:'The 5 s and 11 s release cases encounter nearly broadside faces moving oppositely; actual solver surface velocity contributes, rather than scripted redirection.',sameOrientation: {towardPosition:sameOrientation.toward.record.position,awayPosition:sameOrientation.away.record.position},resource,resetMs:{median:resetSamples[50],max:resetSamples.at(-1),samples:100},wind};
await writeFile('docs/experiments/horizons/gate-evidence.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({testedSha:out.testedSha,cases:Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,{order:v.record.contacts.map(c=>c.body),position:v.record.position}])),neighbours:neighbours.length,allRepeat:neighbours.every(n=>n.repeat),resource,resetMs:out.resetMs,wind},null,2));
