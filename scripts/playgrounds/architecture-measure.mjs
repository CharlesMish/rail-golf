import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Vector3,Ray} from '@babylonjs/core';
import {architectureHarness} from './architecture-harness.mjs';
import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS,RINGWELL_GROUND,buildArchitectureSolids} from '../../lib/playgrounds-architecture.js';
import {ARCHITECTURE_SHOTS,architectureControl,architectureNeighbours,summary,matchesFamily} from './architecture-fixtures.mjs';
import {VERTICAL_YARD_LAB} from '../../lib/vertical-yard-config.js';
const outDir='docs/experiments/playgrounds';await mkdir(outDir,{recursive:true});
const h=architectureHarness(PLAYGROUNDS_ARCHITECTURE),cases={},neighbours={};
for(const [id,setup]of Object.entries(ARCHITECTURE_SHOTS)){
 const r=h.shoot(setup,{fullPath:true});
 cases[id]={...r,path:r.path.filter((_,i)=>i%12===0||i===r.path.length-1),summary:summary(r)};
 if(['low-return','west-reception','cross-galleries','high-circuit','ear-return'].includes(id)){
  neighbours[id]=architectureNeighbours(setup).map(n=>{const r=h.shoot(n.setup);return {...n,result:summary(r),retainsFamily:matchesFamily(id,r)};});
 }
}
// Visibility here is a geometric ray audit, not a rendered browser inspection.
const camera=Vector3.FromArray(PLAYGROUNDS_ARCHITECTURE.survey.position),occlusion={};
for(const [id,shot]of Object.entries(cases)){
 let visible=0,total=0;const blockers={};
 for(const p of shot.path){const target=Vector3.FromArray(p.slice(1,4)),delta=target.subtract(camera),distance=delta.length();if(distance<1e-6)continue;const ray=new Ray(camera,delta.normalize(),distance-.44);let nearest=null;
  for(const mesh of h.world.meshes){mesh.computeWorldMatrix(true);const hit=ray.intersectsMesh(mesh,false);if(hit.hit&&hit.distance<distance-.44&&(!nearest||hit.distance<nearest.distance))nearest={mesh:mesh.name,distance:hit.distance};}
  total++;if(nearest)blockers[nearest.mesh]=(blockers[nearest.mesh]??0)+1;else visible++;
 }
 occlusion[id]={samples:total,visible,blocked:total-visible,blockers};
}
const controls={};
for(const name of ['walls-only','receivers-only']){const c=architectureHarness(architectureControl(name));controls[name]={};for(const id of ['low-return','west-reception','cross-galleries','high-circuit','ear-return']){const r=c.shoot(ARCHITECTURE_SHOTS[id]);controls[name][id]={...r,summary:summary(r)};}c.dispose();}
const coarse=[];
for(const yaw of [-60,-45,-30,-15,0,15,30,45,60])for(const elevation of [5,15,25,35,45])for(const charge of [.2,.3,.4,.5,.6,.75])coarse.push(summary(h.shoot({railIndex:1,yaw,elevation,charge})));
const hitCounts=Object.fromEntries(RINGWELL_SOLIDS.map(s=>[s.id,coarse.filter(r=>r.order.includes('rw-'+s.id)).length]));
const coarseSummary={count:coarse.length,actualGround:coarse.filter(r=>r.reason==='first-ground-contact').length,outOfBounds:coarse.filter(r=>r.reason==='out-of-bounds').length,settled:coarse.filter(r=>r.reason==='settled').length,safetyTimeout:coarse.filter(r=>r.reason==='safety-timeout').length,noStructure:coarse.filter(r=>!r.order.some(b=>b!=='rw-ground'&&b!=='rw-launch-pier')).length,multipleRegions:coarse.filter(r=>r.regions.length>1).length,over15Seconds:coarse.filter(r=>r.elapsed>15).length,maxSeconds:Math.max(...coarse.map(r=>r.elapsed)),hitCounts};
const resource=[];
for(const [name,config]of [['full',PLAYGROUNDS_ARCHITECTURE],['walls-only',architectureControl('walls-only')],['receivers-only',architectureControl('receivers-only')],['vertical-yard-control',VERTICAL_YARD_LAB]]){
 const rows=[];
 for(let cycle=0;cycle<8;cycle++){const q=architectureHarness(config),before=q.resources();q.shoot(ARCHITECTURE_SHOTS['low-return']);q.session.action('reset');const after=q.resources();const cleanup=q.disposeWorld();rows.push({buildMs:q.buildMs,before,after,cleanup});q.scene.dispose();q.engine.dispose();}
 const times=rows.slice(1).map(r=>r.buildMs).sort((a,b)=>a-b);resource.push({name,rows,medianWarmBuildMs:times[3],stableCounts:rows.every(r=>JSON.stringify(r.before)===JSON.stringify(r.after)),cleanupZero:rows.every(r=>r.cleanup.staticBodies+r.cleanup.dynamicBodies+r.cleanup.animatedBodies+r.cleanup.meshes+r.cleanup.geometries+r.cleanup.casters===0)});
}
const repeat={};for(const id of ['low-return','cross-galleries','ear-return'])repeat[id]=JSON.stringify(h.shoot(ARCHITECTURE_SHOTS[id]))===JSON.stringify(h.shoot(ARCHITECTURE_SHOTS[id]));
const roofs={},roofBase={id:'roof-proof',station:()=>({id:'roof-proof-tee',label:'Roof proof',x:0,y:12,z:0,yaw:0}),bounds:{minX:-65,maxX:65,minZ:-25,maxZ:115,minY:-8,maxY:100}};
for(const [name,rotation]of Object.entries({flat:{pitch:0,roll:0},downhill:{pitch:15,roll:0},uphill:{pitch:-15,roll:0},crosswise:{pitch:0,roll:15}})){
 const solids=[{id:'first-roof',x:0,y:6,z:27,w:24,h:1.4,d:20,zone:'west',...rotation},{id:'second-roof',x:8,y:2,z:54,w:30,h:1.4,d:20,zone:'east'}],config={...roofBase,buildWorld:(s,r,m,sh)=>buildArchitectureSolids(s,r,m,sh,{solids})},q=architectureHarness(config),setup={railIndex:1,yaw:0,elevation:15,charge:.3};
 const r=q.shoot(setup);roofs[name]={solids,...r,summary:summary(r),neighbours:architectureNeighbours(setup).filter(n=>n.control!=='railIndex').map(n=>({control:n.control,delta:n.delta,...summary(q.shoot(n.setup))}))};q.dispose();
}
const noRoof=architectureHarness({...roofBase,buildWorld:(s,r,m,sh)=>buildArchitectureSolids(s,r,m,sh,{solids:[{id:'second-roof',x:8,y:2,z:54,w:30,h:1.4,d:20,zone:'east'}]})});roofs['no-first-roof']=noRoof.shoot({railIndex:1,yaw:0,elevation:15,charge:.3});noRoof.dispose();h.dispose();
const evidence={format:'rail-golf-next-playgrounds-architecture-v1',baseSha:'4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb',measuredHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),authority:'Actual Havok through unchanged createSpatialSession at120Hz. NullEngine, not browser/phone frame performance.',notes:['Raw callback before/post-step velocities need not be the fully separated departure; qualified redirect evidence supplies separated incoming/outgoing vectors.','Path samples contain time,x,y,z,vx,vy,vz; every sample is a recorded actual physics step.','Coarse launch counts are not owner discovery probabilities, success scores or enjoyment evidence.'],world:{station:PLAYGROUNDS_ARCHITECTURE.station(),ground:RINGWELL_GROUND,solids:RINGWELL_SOLIDS},cases,neighbours,controls,coarseSummary,coarse,occlusion,resource,repeat,roofs};
await writeFile(`${outDir}/architecture-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({coarseSummary,neighbours:Object.fromEntries(Object.entries(neighbours).map(([k,v])=>[k,{retained:v.filter(n=>n.retainsFamily).length,total:v.length}])),repeat,resources:resource.map(r=>({name:r.name,counts:r.rows[0].before,medianWarmBuildMs:r.medianWarmBuildMs,stable:r.stableCounts,clean:r.cleanupZero})),occlusion,controls:Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([name,r])=>[name,r.summary]))]))},null,2));
