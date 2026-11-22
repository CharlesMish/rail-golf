// Pure Babylon projection and solid-ray evidence. No rendered visibility claim.
import {readFile,writeFile} from 'node:fs/promises';
import {Camera,FreeCamera,Matrix,Vector3,Viewport,Ray} from '@babylonjs/core';
import {architectureHarness} from './architecture-harness.mjs';
import {PLAYGROUNDS_ARCHITECTURE} from '../../lib/playgrounds-architecture.js';
const evidence=JSON.parse(await readFile('docs/experiments/playgrounds/architecture-evidence.json'));
const rows=[];
for(const [width,height]of [[1440,900],[390,844],[844,390]]){
 const h=architectureHarness(PLAYGROUNDS_ARCHITECTURE,{width,height});const camera=new FreeCamera('audit',Vector3.FromArray(PLAYGROUNDS_ARCHITECTURE.survey.position),h.scene);camera.minZ=.1;camera.maxZ=650;camera.fov=width<height?.92:.86;camera.fovMode=width<height?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.setTarget(Vector3.FromArray(PLAYGROUNDS_ARCHITECTURE.survey.target));
 const matrix=camera.getViewMatrix().multiply(camera.getProjectionMatrix()),viewport=new Viewport(0,0,width,height),project=p=>Vector3.Project(p,Matrix.Identity(),matrix,viewport),points=[];
 for(const [id,mesh]of h.world.features){if(id==='ground')continue;mesh.computeWorldMatrix(true);for(const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld)points.push(project(corner));}
 const bounds=values=>[Math.min(...values),Math.max(...values)];const bodyBounds={x:bounds(points.map(p=>p.x)),y:bounds(points.map(p=>p.y)),depth:bounds(points.map(p=>p.z))};
 const paths={};for(const [id,shot]of Object.entries(evidence.cases)){
  const projection=shot.path.map(p=>project(Vector3.FromArray(p.slice(1,4))));paths[id]={x:bounds(projection.map(p=>p.x)),y:bounds(projection.map(p=>p.y)),outside:projection.filter(p=>p.x<0||p.x>width||p.y<0||p.y>height||p.z<0||p.z>1).length,samples:projection.length};
 }
 rows.push({width,height,renderWidth:h.engine.getRenderWidth(),renderHeight:h.engine.getRenderHeight(),bodyBounds,paths});h.dispose();
}
const h=architectureHarness(PLAYGROUNDS_ARCHITECTURE),camera=Vector3.FromArray(PLAYGROUNDS_ARCHITECTURE.survey.position),occlusion={};
for(const [id,shot]of Object.entries(evidence.cases)){
 let visible=0,total=0;const blockers={};for(const pt of shot.path){const target=Vector3.FromArray(pt.slice(1,4)),delta=target.subtract(camera),distance=delta.length(),ray=new Ray(camera,delta.normalize(),distance-.44);let nearest=null;
  for(const mesh of h.world.meshes){mesh.computeWorldMatrix(true);const hit=ray.intersectsMesh(mesh,false);if(hit.hit&&hit.distance<distance-.44&&(!nearest||hit.distance<nearest.distance))nearest={mesh:mesh.name,distance:hit.distance};}total++;if(nearest)blockers[nearest.mesh]=(blockers[nearest.mesh]??0)+1;else visible++;
 }occlusion[id]={visible,total,blocked:total-visible,blockers};
}
h.dispose();const out={authority:'Pure Babylon camera projection and line-of-sight rays against actual visible solid meshes; not rendering, UI overlap, contrast or phone validation.',position:PLAYGROUNDS_ARCHITECTURE.survey.position,target:PLAYGROUNDS_ARCHITECTURE.survey.target,viewports:rows,occlusion};
await writeFile('docs/experiments/playgrounds/architecture-camera.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({viewports:rows.map(r=>({width:r.width,height:r.height,bodyBounds:r.bodyBounds})),occlusion},null,2));
