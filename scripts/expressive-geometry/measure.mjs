import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {Vector3} from '@babylonjs/core';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {EXPRESSIVE_CROWN,EXPRESSIVE_CROWN_FLAT,CROWN_SOLID,crownViewClear,crownFlightFrame} from '../../lib/expressive-crown.js';
import {barrelPlanes} from '../../lib/architectural-forms.js';
import {advanceFlightCamera,projectileScreen} from '../../lib/flight-framing.js';
import {spatialCameraFrame} from '../../lib/spatial-lab-session.js';

const setup=(yaw,elevation,charge)=>({railIndex:1,yaw,elevation,charge});
export const CROWN_CASES={
 'repeat-crown':setup(0,15,.4),
 'near-return':setup(0,22,.23),
 'low-carry':setup(0,8,.58),
 'high-carry':setup(0,60,.4),
 'delayed-carry':setup(0,35,.3),
 'fragile-return':setup(0,25,.2),
 'long-receiver-repetition':setup(0,10,.39),
 'low-miss':setup(0,5,.05),
 'open-sky-exit':setup(0,30,1),
};
export const crownNeighbors=s=>[
 ['yaw-minus',{...s,yaw:s.yaw-.5}],['yaw-plus',{...s,yaw:s.yaw+.5}],
 ['elevation-minus',{...s,elevation:s.elevation-.5}],['elevation-plus',{...s,elevation:s.elevation+.5}],
 ['power-minus',{...s,charge:+(s.charge-.01).toFixed(2)}],['power-plus',{...s,charge:+(s.charge+.01).toFixed(2)}],
].map(([id,setup])=>({id,setup})).filter(n=>n.setup.elevation>=5&&n.setup.elevation<=85&&n.setup.charge>=0&&n.setup.charge<=1);
const onsetIds=r=>r.resonance.impacts.map(i=>i.piece);
export function retainsCrownFamily(id,result){
 const ids=onsetIds(result),hasAfter=target=>ids[0]==='crown'&&ids.includes(target);
 if(id==='repeat-crown')return ids[0]==='crown'&&ids[1]==='crown';
 if(id==='near-return'||id==='fragile-return')return hasAfter('near-deck');
 if(id==='low-carry'||id==='high-carry')return hasAfter('far-deck');
 if(id==='delayed-carry')return ids[0]==='crown'&&ids[1]==='crown'&&ids.includes('far-deck');
 return false;
}
export function crownShot(h,s,fullPath=false){const result=h.shoot(s,{fullPath});return {...result,resonance:structuredClone(h.world.resonance())};}
const compact=r=>({record:r.record,resonance:r.resonance,rawCallbacks:r.impacts,path10Hz:r.path.filter((_,i)=>i%12===0||i===r.path.length-1)});
const concise=r=>({onsets:r.resonance.impacts.map(i=>({piece:i.piece,time:i.time,gap:i.time-(r.resonance.impacts[r.resonance.impacts.indexOf(i)-1]?.time??0),normalSpeed:i.normalSpeed,gain:i.gain,callbacks:i.callbacks})),qualifiedRedirects:r.record.evidence.filter(e=>e.kind==='redirect').length,reason:r.record.reason,elapsed:r.record.elapsed,position:r.record.position});
function cameraAudit(config,r,s,flat){
 const rows=[];
 for(const [width,height]of[[730,390],[572,330],[349,397],[803,290]])for(const hz of[30,60]){
  const start=spatialCameraFrame(config,s,width,height),v=a=>({x:a[0],y:a[1],z:a[2]}),stride=120/hz;
  let frame={position:v(start.position),target:v(start.target),fov:start.fov},previous=null,blocked=0,outside=0,maxJump=0,maxJumpAfterHalfSecond=0,frames=0;
  for(let i=0;i<r.path.length;i+=stride){const p=r.path[i],ball={x:p[1],y:p[2],z:p[3]},before=frame.position,desired=config.flightPresentation.desired(ball);
   frame=crownFlightFrame(advanceFlightCamera(frame,ball,previous,desired,1/hz,width/height,start.horizontal),ball,flat);
   if(!crownViewClear(ball,frame.position,flat))blocked++;
   const screen=projectileScreen(frame,ball,width/height,start.horizontal);if(Math.abs(screen.x)>1||Math.abs(screen.y)>1||screen.depth<=0)outside++;
   if(previous){const jump=Math.hypot(frame.position.x-before.x,frame.position.y-before.y,frame.position.z-before.z);maxJump=Math.max(maxJump,jump);if(p[0]>=.5)maxJumpAfterHalfSecond=Math.max(maxJumpAfterHalfSecond,jump);}previous=ball;frames++;
  }
  rows.push({width,height,hz,frames,blocked,outside,maxJump,maxJumpAfterHalfSecond});
 }
 return rows;
}
async function main(){
 const h=architectureHarness(EXPRESSIVE_CROWN),f=architectureHarness(EXPRESSIVE_CROWN_FLAT),cases={},atlas={crown:[],flat:[]},seams=[],camera=[];
 try{
  for(const[id,s]of Object.entries(CROWN_CASES)){
   const result=crownShot(h,s,true),control=crownShot(f,s,true);
   const neighbors=crownNeighbors(s).map(n=>{const shot=crownShot(h,n.setup);return {...n,retains:retainsCrownFamily(id,shot),...concise(shot)};});
   cases[id]={setup:s,result:compact(result),control:compact(control),retains:retainsCrownFamily(id,result),neighbors};
   if(!['long-receiver-repetition','open-sky-exit'].includes(id))for(const[variant,config,shot,flat]of[['crown',EXPRESSIVE_CROWN,result,false],['flat',EXPRESSIVE_CROWN_FLAT,control,true]])camera.push({id,variant,rows:cameraAudit(config,shot,s,flat)});
  }
  for(const[variant,harness]of[['crown',h],['flat',f]])for(const yaw of[-20,-10,0,10,20])for(const elevation of[5,10,15,25,35,50,65])for(const charge of[.2,.3,.4,.55,.7,.85]){const s=setup(yaw,elevation,charge),r=crownShot(harness,s);atlas[variant].push({setup:s,...concise(r)});}
  const crown=h.scene.getMeshByName('worldcraft-object-crown'),matrix=crown.computeWorldMatrix(true),normals=barrelPlanes(CROWN_SOLID).map(p=>Vector3.TransformNormal(new Vector3(...p.slice(0,3)),matrix).normalize().asArray());
  const sweeps=[...Array.from({length:51},(_,i)=>({id:'elevation',setup:setup(0,10+i*.5,.4)})),...Array.from({length:101},(_,i)=>({id:'yaw',setup:setup(-25+i*.5,15,.4)}))];
  for(const item of sweeps){const r=crownShot(h,item.setup),callbacks=r.impacts.filter(c=>c.body==='worldcraft-object-crown').map(c=>{const n=c.normal,l=Math.hypot(...n);return {...c,faceAlignment:Math.max(...normals.map(f=>Math.abs(f.reduce((sum,a,i)=>sum+a*n[i],0)/l)))};});seams.push({...item,...concise(r),callbacks});}
 }finally{h.dispose();f.dispose();}
 const summary=Object.fromEntries(Object.entries(atlas).map(([variant,rows])=>[variant,{shots:rows.length,silent:rows.filter(r=>!r.onsets.length).length,crown:rows.filter(r=>r.onsets.some(i=>i.piece==='crown')).length,repeatedCrown:rows.filter(r=>r.onsets.filter(i=>i.piece==='crown').length>1).length,nearAfterCrown:rows.filter(r=>r.onsets[0]?.piece==='crown'&&r.onsets.some(i=>i.piece==='near-deck')).length,farAfterCrown:rows.filter(r=>r.onsets[0]?.piece==='crown'&&r.onsets.some(i=>i.piece==='far-deck')).length,over15:rows.filter(r=>r.elapsed>15).length,settled:rows.filter(r=>r.reason==='settled').length,exits:rows.filter(r=>r.reason==='out-of-bounds').length,maxSeconds:Math.max(...rows.map(r=>r.elapsed))} ]));
 const cycles=[];for(const[variant,config]of[['crown',EXPRESSIVE_CROWN],['flat',EXPRESSIVE_CROWN_FLAT]])for(let i=0;i<7;i++){const harness=architectureHarness(config),before=harness.resources();crownShot(harness,CROWN_CASES['repeat-crown']);harness.session.action('retry');crownShot(harness,CROWN_CASES['near-return']);harness.session.action('reset');const after=harness.resources(),cleanup=harness.disposeWorld();cycles.push({variant,i,buildMs:harness.buildMs,before,after,cleanup});harness.scene.dispose();harness.engine.dispose();}
 const sourceFiles=['lib/expressive-crown.js','lib/architectural-forms.js','scripts/expressive-geometry/measure.mjs'],hashes={};for(const file of sourceFiles)hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 const evidence={base:'10b09baafc9d85eef0d87a630b55600d623dcde0',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles:hashes,authority:'Actual Havok at 120 Hz using unchanged SpatialLab session, projectile and first-ground rules. Crown sound-onset analysis uses the existing resonance ear separately from sport redirects. The study has ordinary impact audio, not Counterline recording compatibility. Raw callback velocities bracket the whole solver step, not one isolated impulse. NullEngine is not rendered performance.',cases,summary,atlas,seams,camera,cycles};
 await writeFile('docs/experiments/instrument-foundry/geometry-evidence.json',JSON.stringify(evidence)+'\n');
 console.log(JSON.stringify({summary,cases:Object.fromEntries(Object.entries(cases).map(([id,c])=>[id,{...concise(c.result),retains:c.retains,neighbors:c.neighbors.filter(n=>n.retains).length,flat:concise(c.control)}])),seamCallbacks:seams.reduce((n,s)=>n+s.callbacks.length,0),seamNonFace:seams.flatMap(s=>s.callbacks).filter(c=>c.faceAlignment<.999).length,cameraBlocked:camera.flatMap(c=>c.rows).reduce((n,r)=>n+r.blocked,0),cameraOutside:camera.flatMap(c=>c.rows).reduce((n,r)=>n+r.outside,0),cameraMaxJump:Math.max(...camera.flatMap(c=>c.rows).map(r=>r.maxJump))},null,2));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
