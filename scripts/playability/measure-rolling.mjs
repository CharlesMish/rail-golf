import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PhysicsMotionType} from '@babylonjs/core';
import {rollingHarness} from './rolling-harness.mjs';
import {ROLLING_PROPS} from '../../lib/playability-rolling.js';
const baseline='a90785ac2a03f3f0f00a4dbd758b05f6f49a3054',opening={railIndex:1,yaw:0,elevation:8,charge:.55};
const pose=e=>e?JSON.parse(e.pose):null;
const summary=r=>({setup:r.setup,contacts:r.contacts.map(c=>c.body),reason:r.reason,ballSeconds:r.elapsed,readySeconds:r.settleElapsed,postBallSeconds:r.settleElapsed===null?null:r.settleElapsed-r.elapsed,before:pose(r.environment),after:pose(r.settledEnvironment)});
function measure(h,setup,{reset=true,damping=null}={}){
 if(reset)h.session.reset();if(!h.session.fire(setup))throw Error('Cannot fire');
 if(damping!==null)h.world.propAggregate.body.setAngularDamping(damping); // Explicit proof-only matched parameter comparison.
 const propContacts=[],velocitySamples=[];let callbacks=[],ticks=0,preV=null,preW=null,maxLinear=0,maxAngular=0,totalRotation=0,totalTravel=0,previous=pose(h.world.environment.snapshot());
 const body=h.world.propAggregate.body;body.setCollisionCallbackEnabled(true);body.getCollisionObservable().add(e=>{const other=e.collider===body?e.collidedAgainst:e.collider;if(!['rolling-pavement','rolling-veranda'].includes(other.transformNode.name))callbacks.push({body:other.transformNode.name,point:e.point?.asArray(),normal:e.normal?.asArray()});});
 while(ticks<9000&&!h.session.last?.settledEnvironment&&h.world.status!=='blocked'){
  preV=h.world.propAggregate.body.getLinearVelocity().asArray();preW=h.world.propAggregate.body.getAngularVelocity().asArray();callbacks=[];h.step();ticks++;
  const v=h.world.propAggregate.body.getLinearVelocity().asArray(),w=h.world.propAggregate.body.getAngularVelocity().asArray(),current=pose(h.world.environment.snapshot());
  maxLinear=Math.max(maxLinear,Math.hypot(...v));maxAngular=Math.max(maxAngular,Math.hypot(...w));
  const dot=current.slice(3).reduce((n,x,i)=>n+x*previous[i+3],0)/(Math.hypot(...current.slice(3))*Math.hypot(...previous.slice(3)));
  totalRotation+=2*Math.acos(Math.min(1,Math.abs(dot)));totalTravel+=Math.hypot(current[0]-previous[0],current[2]-previous[2]);previous=current;
  for(const c of callbacks)if(propContacts.length<100)propContacts.push({time:ticks/120,...c,incomingVelocity:preV,outgoingVelocity:v,incomingAngular:preW,outgoingAngular:w});
  if(ticks%12===0)velocitySamples.push([ticks/120,...v,...w]);
 }
 const record=structuredClone(h.session.last);
 return {record,propMotion:{maxLinear,maxAngular,totalRotation,totalPlanarTravel:totalTravel,rotationDistance:totalRotation*3.5,propContacts,velocitySamples},status:h.world.status,proofAngularDamping:damping};
}
const sphere=rollingHarness(),stone=rollingHarness({shape:'stone'}),bare=rollingHarness({context:false});
const definitions={central:opening,'left-flank':{...opening,yaw:-5},'right-flank':{...opening,yaw:5},'strong-central':{...opening,charge:.75},'low-elevation-strong':{...opening,elevation:5,charge:1},'bank-access':{railIndex:1,yaw:-50,elevation:10,charge:.85},'far-return':{railIndex:1,yaw:0,elevation:20,charge:.85},'clean-miss':{...opening,yaw:25},'low-power-miss':{...opening,charge:.15},'high-flight':{...opening,elevation:55,charge:.75}};
const cases={};for(const [name,setup]of Object.entries(definitions))cases[name]={sphere:measure(sphere,setup),stone:measure(stone,setup)};
cases['bank-absent']={sphere:measure(bare,definitions['bank-access'])};
const dampingComparison=[];for(const damping of [.5,1,2])for(const name of ['central','left-flank','bank-access','low-elevation-strong']){const r=measure(sphere,definitions[name],{damping});dampingComparison.push({damping,name,...summary(r.record),propMotion:r.propMotion});}
const neighbors=[];for(const name of ['central','left-flank','right-flank','bank-access','far-return']){const s=definitions[name];for(const patch of [{yaw:s.yaw-.5},{yaw:s.yaw+.5},{elevation:s.elevation-.5},{elevation:s.elevation+.5},{charge:s.charge-.01},{charge:s.charge+.01}]){const a=sphere.shoot({...s,...patch}),b=sphere.shoot({...s,...patch});neighbors.push({family:name,...summary(a),exactRepeat:JSON.stringify(a)===JSON.stringify(b)});}}
const north=[];for(let i=0;i<5;i++)north.push(measure(sphere,definitions['low-elevation-strong'],{reset:i===0}));
const stoneNorth=[];for(let i=0;i<8;i++)stoneNorth.push(measure(stone,definitions['low-elevation-strong'],{reset:i===0}));
const east=[];for(let i=0;i<5;i++)east.push(measure(sphere,definitions['bank-access'],{reset:i===0}));const staleEast=measure(sphere,definitions['bank-access'],{reset:false});sphere.session.undo();
for(const yaw of [-51,-51,-52])east.push(measure(sphere,{...definitions['bank-access'],yaw,charge:1},{reset:false}));
const resources=[];
for(const shape of ['sphere','stone']){const builds=[],resets=[],fires=[];let counts,cleanup;
 for(let i=0;i<11;i++){const h=rollingHarness({shape});builds.push(h.buildMs);counts={readyStaticBodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,shadowCasters:h.casters.size,submeshes:h.scene.meshes.reduce((n,m)=>n+(m.subMeshes?.length??0),0),triangles:h.scene.meshes.filter(m=>m.getClassName()!=='LinesMesh').reduce((n,m)=>n+m.getTotalIndices()/3,0),vertices:h.scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0)};let t=performance.now();h.session.reset();resets.push(performance.now()-t);t=performance.now();h.session.fire(opening);fires.push(performance.now()-t);counts.activeStaticBodies=h.physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.STATIC).length;counts.activeDynamicBodies=h.physics.getBodies().filter(b=>b.getMotionType()===PhysicsMotionType.DYNAMIC).length;h.session.dispose();h.world.dispose();cleanup={bodies:h.physics.getBodies().length,meshes:h.scene.meshes.length,casters:h.casters.size};h.dispose();}
 const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length%2?b[Math.floor(b.length/2)]:(b[b.length/2-1]+b[b.length/2])/2;};resources.push({shape,counts,cleanup,buildMs:{medianWarm:median(builds.slice(1)),samples:builds},resetMs:{median:median(resets),samples:resets},fireMs:{median:median(fires),samples:fires}});
}
const out={format:'rail-golf-playability-rolling-evidence-v1',baseline,testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),authority:'Actual Babylon/Havok, fixed 120Hz, NullEngine. CPU build and owned-resource counts only; no rendered GPU draw-call, frame-time, audio-listening, memory-residency or physical-phone claim.',presets:ROLLING_PROPS,geometry:'Analytic radius3.5 sphere; rendered diameter7 sphere segments24. Painted rings are nonphysical. Same garden collider geometry and all numeric mass/friction/restitution/damping/settling values as original Guest Stone. Sphere center y3.5 rather than stone2 keeps both resting on same pavement. New identities and shelves only.',cases,dampingComparison,neighbors,north,stoneNorth,east,staleEast,resources};
await writeFile('docs/experiments/playability/rolling-evidence.json',JSON.stringify(out)+'\n');
console.log(JSON.stringify({testedCommit:out.testedCommit,cases:Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([shape,d])=>[shape,{...summary(d.record),maxAngular:d.propMotion.maxAngular,rotation:d.propMotion.totalRotation,propContacts:[...new Set(d.propMotion.propContacts.map(c=>c.body))]}]))])),neighbors:neighbors.length,allExact:neighbors.every(n=>n.exactRepeat),farReturnNeighbors:neighbors.filter(n=>n.family==='far-return').map(n=>({setup:n.setup,contacts:n.contacts,after:n.after})),northEnd:summary(north.at(-1).record),northPropContacts:[...new Set(north.flatMap(x=>x.propMotion.propContacts.map(c=>c.body)))],eastEnd:summary(east.at(-1).record),eastPropContacts:[...new Set(east.flatMap(x=>x.propMotion.propContacts.map(c=>c.body)))],staleEast:summary(staleEast.record),resources},null,2));sphere.dispose();stone.dispose();bare.dispose();
