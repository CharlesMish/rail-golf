import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Ray,Vector3} from '@babylonjs/core';
import {FREIGHT_CASES} from './spatial-cases.mjs';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {PLACES_ARCHITECTURE_REFINED as REFINED_ARCHITECTURE,EXCHANGE_REFINED_STATIONS as EXCHANGE_STATIONS,exchangeFlightFrame,exchangeFollowOffsets,exchangeSegment,EXCHANGE_SOLIDS,EXCHANGE_GROUND} from '../../lib/places-architecture.js';
import {spatialCameraFrame,spatialLaunch} from '../../lib/spatial-lab-session.js';
import {advanceFlightCamera,projectileScreen} from '../../lib/flight-framing.js';
const originalFollow=process.argv.includes('--original-follow');
const PLACES_ARCHITECTURE=originalFollow?{...REFINED_ARCHITECTURE,flightPresentation:{...REFINED_ARCHITECTURE.flightPresentation,launchFrame:undefined,desired:exchangeFollowOffsets}}:REFINED_ARCHITECTURE;
const v=a=>({x:a[0],y:a[1],z:a[2]}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),h=architectureHarness(PLACES_ARCHITECTURE);
for(const mesh of h.world.meshes)mesh.computeWorldMatrix(true);
function blocked(position,ball){const from=new Vector3(position.x,position.y,position.z),to=new Vector3(ball.x,ball.y,ball.z),delta=to.subtract(from),distance=delta.length();if(distance<.45)return [];const ray=new Ray(from,delta.normalize(),distance-.44);return h.world.meshes.filter(m=>{const r=ray.intersectsMesh(m,false);return r.hit&&r.distance<distance-.44;}).map(m=>m.name);}
const fixtures={...FREIGHT_CASES,forecourtUnder:{carriageMode:'forecourt',yaw:0,elevation:15,charge:.85},forecourtRoof:{carriageMode:'forecourt',yaw:20,elevation:35,charge:.7}};
const cases={};
for(const [id,shot]of Object.entries(fixtures)){
 const setup={railIndex:1,...shot},result=h.shoot(setup,{fullPath:true}),audits=[];
 for(const [width,height,hz]of [[1100,900,60],[940,600,60],[739,480,60],[390,379.8,60],[559,390,30]]){
  const initial=spatialCameraFrame(PLACES_ARCHITECTURE,setup,width,height);let frame={position:v(initial.position),target:v(initial.target),fov:initial.fov},previous=null,old=frame.position,index=0;const rows=[];
  for(let time=1/hz;time<result.record.elapsed;time+=1/hz){while(index+1<result.path.length&&result.path[index+1][0]<=time)index++;const row=result.path[index],ball=v(row.slice(1,4));const ordinary=advanceFlightCamera(frame,ball,previous,PLACES_ARCHITECTURE.flightPresentation.desired(ball,null,null,setup),1/hz,width/height,initial.horizontal,initial.horizontal?.92:.69);frame=exchangeFlightFrame(ordinary,ball);previous=ball;
   const screen=projectileScreen(frame,ball,width/height,initial.horizontal);rows.push({time,jump:dist(old,frame.position),distance:dist(frame.position,ball),blocked:blocked(frame.position,ball),inside:[EXCHANGE_GROUND,...EXCHANGE_SOLIDS].filter(s=>exchangeSegment(frame.position,frame.position,s,0)!==null).map(s=>s.id),cameraSegment:[EXCHANGE_GROUND,...EXCHANGE_SOLIDS].flatMap(s=>{const enter=exchangeSegment(old,frame.position,s,0);return enter===null?[]:[{id:s.id,insideDistance:Math.max(0,1-exchangeSegment(frame.position,old,s,0)-enter)*dist(old,frame.position)}];}),outside:Math.abs(screen.x)>1||Math.abs(screen.y)>1||screen.depth<.1});old=frame.position;
  }
  audits.push({width,height,hz,samples:rows.length,blocked:rows.filter(r=>r.blocked.length).length,cameraInsideSolid:rows.filter(r=>r.inside.length).length,cameraSegmentsThroughSolid:rows.filter(r=>r.cameraSegment.length).length,outsideFrustum:rows.filter(r=>r.outside).length,minBallDistance:Math.min(...rows.map(r=>r.distance)),maxBallDistance:Math.max(...rows.map(r=>r.distance)),maxStep:Math.max(...rows.map(r=>r.jump)),maxStepAfterHalfSecond:Math.max(...rows.filter(r=>r.time>.5).map(r=>r.jump)),worstSteps:rows.filter(r=>r.jump>3).sort((a,b)=>b.jump-a.jump).slice(0,6),cornerCuts:rows.filter(r=>r.cameraSegment.length)});
 }
 cases[id]={setup,record:result.record,audits};
}
const launch=[];
for(const station of EXCHANGE_STATIONS)for(const railIndex of [0,1,2])for(let yaw=-70;yaw<=70;yaw+=5)for(const [width,height]of [[1100,900],[940,600],[739,480],[390,379.8],[559,390]]){const setup={...PLACES_ARCHITECTURE.defaultSetup,carriageMode:station.id,railIndex,yaw},frame=spatialCameraFrame(PLACES_ARCHITECTURE,setup,width,height),ball=spatialLaunch(PLACES_ARCHITECTURE,setup).muzzle;launch.push({station:station.id,railIndex,yaw,width,height,blocked:blocked(v(frame.position),ball),screen:projectileScreen({position:v(frame.position),target:v(frame.target),fov:frame.fov},ball,width/height,frame.horizontal)});}
const result={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),originalFollow,authority:'Actual120HzHavok paths; presentation ray/frustum/segment audit only, not rendered comfort certification.',cases,launch:{samples:launch.length,blocked:launch.filter(r=>r.blocked.length),outside:launch.filter(r=>Math.abs(r.screen.x)>1||Math.abs(r.screen.y)>1||r.screen.depth<.1)}};
await writeFile(originalFollow?'docs/experiments/refinement/spatial-camera-original-follow.json':'docs/experiments/refinement/spatial-camera.json',JSON.stringify(result)+'\n');console.log(JSON.stringify({launch:result.launch,cases:Object.fromEntries(Object.entries(cases).map(([id,c])=>[id,c.audits.map(a=>({width:a.width,height:a.height,hz:a.hz,samples:a.samples,blocked:a.blocked,inside:a.cameraInsideSolid,cuts:a.cameraSegmentsThroughSolid,outside:a.outsideFrustum,maxStep:a.maxStepAfterHalfSecond}))]))}));h.dispose();
