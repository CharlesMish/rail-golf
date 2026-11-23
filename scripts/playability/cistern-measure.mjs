import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Ray,Vector3} from '@babylonjs/core';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {ARCHITECTURE_SHOTS,architectureNeighbours,matchesFamily} from '../playgrounds/architecture-fixtures.mjs';
import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS,RINGWELL_GROUND,buildArchitectureSolids} from '../../lib/playgrounds-architecture.js';
import {PLAYABILITY_CISTERN,cisternFlightFrame,cisternFollowOffsets,cisternBoxSegment,cisternTerminalLabel} from '../../lib/playability-cistern.js';
import {spatialCameraFrame,spatialLaunch} from '../../lib/spatial-lab-session.js';
import {followHeading,advanceFlightCamera,projectileScreen} from '../../lib/flight-framing.js';
const v=a=>({x:a[0],y:a[1],z:a[2]}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const h=architectureHarness(PLAYABILITY_CISTERN),control=architectureHarness(PLAYGROUNDS_ARCHITECTURE);
for(const mesh of h.world.meshes)mesh.computeWorldMatrix(true);
function blocked(position,ball){const from=new Vector3(position.x,position.y,position.z),to=new Vector3(ball.x,ball.y,ball.z),delta=to.subtract(from),distance=delta.length(),ray=new Ray(from,delta.normalize(),distance-.44);return h.world.meshes.filter(m=>{const r=ray.intersectsMesh(m,false);return r.hit&&r.distance<distance-.44;}).map(m=>m.name);}
function cameraAudit(result,width,height,hz){
 const initial=spatialCameraFrame(PLAYABILITY_CISTERN,result.record.setup,width,height),horizontal=initial.horizontal,aspect=width/height;
 let frame={position:v(initial.position),target:v(initial.target),fov:initial.fov},heading={x:Math.sin(result.record.setup.yaw*Math.PI/180),y:0,z:Math.cos(result.record.setup.yaw*Math.PI/180)},previous=null,old=frame.position;
 const rows=[],dt=1/hz;let pathIndex=0;
 for(let time=dt;time<=result.record.elapsed;time+=dt){while(pathIndex+1<result.path.length&&result.path[pathIndex+1][0]<=time)pathIndex++;const row=result.path[pathIndex],ball=v(row.slice(1,4)),velocity=v(row.slice(4,7));heading=followHeading(heading,velocity,dt);const ordinary=advanceFlightCamera(frame,ball,previous,cisternFollowOffsets(ball),dt,aspect,horizontal,horizontal?.92:.69);frame=cisternFlightFrame(ordinary,ball);previous=ball;const screen=projectileScreen(frame,ball,aspect,horizontal);rows.push({time,row:row[0],distance:dist(frame.position,ball),raised:frame.raised,jump:dist(old,frame.position),blocked:blocked(frame.position,ball),cameraSegmentCrossing:[RINGWELL_GROUND,...RINGWELL_SOLIDS].filter(s=>cisternBoxSegment(old,frame.position,s,.1)!==null).map(s=>s.id),screen});old=frame.position;}
 const jumps=rows.map(r=>r.jump).sort((a,b)=>a-b);return {width,height,hz,samples:rows.length,blocked:rows.filter(r=>r.blocked.length).length,cameraSegmentsThroughStone:rows.filter(r=>r.cameraSegmentCrossing.length).length,outsideFrustum:rows.filter(r=>Math.abs(r.screen.x)>1||Math.abs(r.screen.y)>1||r.screen.depth<.1).length,minBallDistance:Math.min(...rows.map(r=>r.distance)),maxBallDistance:Math.max(...rows.map(r=>r.distance)),raisedSamples:rows.filter(r=>r.raised).length,maxCameraStep:Math.max(...jumps),maxCameraStepAfterHalfSecond:Math.max(...rows.filter(r=>r.time>.5).map(r=>r.jump)),p95CameraStep:jumps[Math.floor(jumps.length*.95)],worstSteps:rows.filter(r=>r.jump>3).slice(0,8)};
}
const cases={};for(const [name,setup]of Object.entries(ARCHITECTURE_SHOTS)){
 const result=h.shoot(setup,{fullPath:true}),old=control.shoot(setup,{fullPath:true});
 cases[name]={record:result.record,path10Hz:result.path.filter((_,i)=>i%12===0||i===result.path.length-1),impacts:result.impacts.filter((r,i)=>result.impacts.length<100||i<20||i%120===0||i===result.impacts.length-1),rawImpactCount:result.impacts.length,identicalPhysics:JSON.stringify(result)===JSON.stringify(old),caption:cisternTerminalLabel(result.record),camera:[cameraAudit(result,1440,900,60),cameraAudit(result,390,844,60),cameraAudit(result,844,390,30)]};
}
const launch=[];for(const railIndex of [0,1,2])for(let yaw=-70;yaw<=70;yaw+=5)for(const [width,height]of [[1440,900],[390,844],[844,390]]){const setup={...PLAYABILITY_CISTERN.defaultSetup,railIndex,yaw},f=spatialCameraFrame(PLAYABILITY_CISTERN,setup,width,height),ball=spatialLaunch(PLAYABILITY_CISTERN,setup).muzzle;launch.push({railIndex,yaw,width,height,blocked:blocked(v(f.position),ball),screen:projectileScreen({position:v(f.position),target:v(f.target),fov:f.fov},ball,width/height,f.horizontal)});}
const neighbours={};for(const id of ['low-return','high-circuit','ear-return','cross-galleries'])neighbours[id]=architectureNeighbours(ARCHITECTURE_SHOTS[id]).map(n=>{const r=h.shoot(n.setup);return {...n,retains:matchesFamily(id,r),reason:r.record.reason,elapsed:r.record.elapsed,position:r.record.position};});
// Re-run the same coarse control grid; record escapes and conservative centre-line
// crossing tests through boxes shrunk by 5 cm. These checks do not prove universal CCD.
const escapes=[],penetrations=[],durations=[];for(const yaw of [-60,-45,-30,-15,0,15,30,45,60])for(const elevation of [5,15,25,35,45])for(const charge of [.2,.3,.4,.5,.6,.75]){
 const setup={railIndex:1,yaw,elevation,charge},r=h.shoot(setup,{fullPath:true});durations.push({setup,reason:r.record.reason,elapsed:r.record.elapsed});
 for(let i=1;i<r.path.length;i++){const start=v(r.path[i-1].slice(1,4)),end=v(r.path[i].slice(1,4));for(const solid of [RINGWELL_GROUND,...RINGWELL_SOLIDS])if(cisternBoxSegment(start,end,solid,-.05)!==null){penetrations.push({setup,time:r.path[i][0],solid:solid.id,start,end});break;}}
 if(r.record.reason==='out-of-bounds'){
  const far=r.path.find(p=>p[3]>70&&Math.abs(p[1])<29),east=r.path.find(p=>p[1]>29&&p[3]>=15&&p[3]<=70),west=r.path.find((p,i)=>i>0&&r.path[i-1][1]>=-29&&p[1]<-29&&p[3]>=15&&p[3]<=70&&(p[3]<35||p[3]>49)),earFar=r.path.find((p,i)=>i>0&&r.path[i-1][3]<=49&&p[1]<-29&&p[3]>49),entry=r.path.find(p=>p[3]<13);
  const crossing=[entry&&{side:'lower entry wall',point:entry},earFar&&{side:'side chamber far wall',point:earFar},far&&{side:'far wall',point:far},east&&{side:'east wall',point:east},west&&{side:'west main wall',point:west}].filter(Boolean).sort((a,b)=>a.point[0]-b.point[0])[0]??null;
  escapes.push({setup,elapsed:r.record.elapsed,position:r.record.position,contacts:r.record.contacts,firstExteriorCrossing:crossing,path10Hz:r.path.filter((_,i)=>i%12===0||i===r.path.length-1)});
 }
}
// Reproduce seam-removal control without material/ball tuning. It costs one less
// body but preserves the long rolling top; therefore no geometry change ships.
const mergedSolids=RINGWELL_SOLIDS.filter(s=>!['ear-floor','west-gallery'].includes(s.id));mergedSolids.push({id:'joined-floor',x:-29,y:5,z:43,w:32,h:10,d:30,zone:'west'});
const merged=architectureHarness({...PLAYGROUNDS_ARCHITECTURE,buildWorld:(...a)=>buildArchitectureSolids(...a,{solids:mergedSolids})});
const mergedSlow=merged.shoot(ARCHITECTURE_SHOTS['slow-pocket']);merged.dispose();
const interrupted=[];for(const seconds of [5,20,30]){h.session.action('retry');h.session.fire(ARCHITECTURE_SHOTS['slow-pocket']);for(let i=0;i<seconds*120;i++)h.step();h.session.action('stop');interrupted.push({requestedSeconds:seconds,record:structuredClone(h.session.last),flightCleared:h.session.flight===null});}
const cycles=[];for(const [variant,config]of [['revised',PLAYABILITY_CISTERN],['original',PLAYGROUNDS_ARCHITECTURE]])for(let i=0;i<8;i++){const q=architectureHarness(config),before=q.resources();q.shoot(ARCHITECTURE_SHOTS['ear-return']);q.session.action('reset');const after=q.resources(),cleanup=q.disposeWorld();cycles.push({variant,buildMs:q.buildMs,before,after,cleanup});q.scene.dispose();q.engine.dispose();}
const slow=h.shoot(ARCHITECTURE_SHOTS['slow-pocket'],{fullPath:true});const slowCheckpoints=Array.from({length:9},(_,i)=>{const p=slow.path.find(p=>p[0]>=i*5)??slow.path.at(-1);return {time:p[0],position:p.slice(1,4),velocity:p.slice(4),contactsInNext5Seconds:slow.impacts.filter(c=>c.time>=i*5&&c.time<(i+1)*5).length};});
const result={format:'rail-golf-playability-cistern-v1',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseSha:'a90785ac2a03f3f0f00a4dbd758b05f6f49a3054',authority:'Actual Havok at120Hz. Camera visibility is geometric ray/frustum analysis, not rendered browser inspection.',cases,launch,neighbours,escapeSummary:{total:escapes.length,centreSegmentsInsideShrunkSolid:penetrations.length,penetrations},escapes,durations,slowCheckpoints,mergedControl:{record:mergedSlow.record,geometry:mergedSolids},interrupted,cycles};
await writeFile('docs/experiments/playability/cistern-evidence.json',JSON.stringify(result)+'\n');
console.log(JSON.stringify({identical:Object.values(cases).every(c=>c.identicalPhysics),camera:Object.fromEntries(Object.entries(cases).map(([k,c])=>[k,c.camera])),launchBlocked:launch.filter(x=>x.blocked.length).length,launchOutOfFrustum:launch.filter(x=>Math.abs(x.screen.x)>1||Math.abs(x.screen.y)>1||x.screen.depth<.1).length,escapeSummary:result.escapeSummary,over15:durations.filter(x=>x.elapsed>15).length,maxSeconds:Math.max(...durations.map(x=>x.elapsed)),mergedSlow:mergedSlow.record.elapsed,slowCheckpoints,cycles},null,2));h.dispose();control.dispose();
