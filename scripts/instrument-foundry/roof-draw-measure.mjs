import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {FreeCamera,Vector3,DirectionalLight,ShadowGenerator,Material} from '@babylonjs/core';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {EXCHANGE_CASES} from '../places/architecture-measure.mjs';
import {FREIGHT_CASES} from '../refinement/spatial-cases.mjs';
import {FORM_CASES} from '../forms/architecture-measure.mjs';
import * as yard from '../../lib/places-architecture.js';
import {EXCHANGE_ROOF_VARIANTS,applyRoofDiagnostic,configureExchangeShadows,usesCorrectedRoofDraw} from '../../lib/exchange-roof-presentation.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const buffers=mesh=>({positions:Array.from(mesh.getVerticesData('position')),normals:Array.from(mesh.getVerticesData('normal')),indices:Array.from(mesh.getIndices())});
function configFor(config,solids,stations,legacyRoofDraw,extra={}){
 return {...config,buildWorld:(...args)=>yard.buildExchangeYard(...args,{solids,stations,layout:config.playground.layout,legacyRoofDraw,...extra})};
}
export function faceAuthority(mesh,solid){
 const p=mesh.getVerticesData('position'),n=mesh.getVerticesData('normal');
 // This is the order Babylon _draw submits for triangle fill, not an assumed
 // relationship between an available index buffer and the selected draw call.
 const order=mesh.isUnIndexed?Array.from({length:mesh.getTotalVertices()},(_,i)=>i):Array.from(mesh.getIndices());
 const result=[];
 for(let k=0;k<order.length;k+=3){
  const a=order[k]*3,b=order[k+1]*3,c=order[k+2]*3,u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],v=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
  const normal=[-(u[1]*v[2]-u[2]*v[1]),-(u[2]*v[0]-u[0]*v[2]),-(u[0]*v[1]-u[1]*v[0])],length=Math.hypot(...normal);
  const centre=[(p[a]+p[b]+p[c])/3,(p[a+1]+p[b+1]+p[c+1])/3-(solid.shape==='box'?0:solid.h/3),(p[a+2]+p[b+2]+p[c+2])/3];
  const outwardDot=normal.reduce((sum,x,i)=>sum+x*centre[i],0)/length;
  const normalAlignment=normal.reduce((sum,x,i)=>sum+x*n[a+i],0)/length;
  result.push({triangle:k/3,order:order.slice(k,k+3),outwardDot,normalAlignment});
 }
 return {name:mesh.name,isUnIndexed:mesh.isUnIndexed,triangles:result,outward:result.every(t=>t.outwardDot>0),normalsAgree:result.every(t=>t.normalAlignment>.9999)};
}
async function renderDispatch(legacyRoofDraw){
 const h=architectureHarness(configFor(yard.PLACES_ARCHITECTURE_FORMS,yard.EXCHANGE_FORMS_SOLIDS,yard.EXCHANGE_REFINED_STATIONS,legacyRoofDraw,{details:false}));
 const camera=new FreeCamera('draw-probe',new Vector3(80,70,-40),h.scene);camera.fov=1.2;camera.maxZ=650;camera.setTarget(new Vector3(0,8,45));
 const light=new DirectionalLight('draw-sun',new Vector3(-.5,-1,.4),h.scene);light.position.set(35,70,-35);
 const shadows=new ShadowGenerator(1024,light);configureExchangeShadows(shadows,'candidate');for(const mesh of h.world.meshes)if(mesh!==h.world.meshes[0])shadows.addShadowCaster(mesh);
 let name='',phase='main';const calls=[];
 shadows.onBeforeShadowMapRenderMeshObservable.add(mesh=>{phase='shadow';name=mesh.name;});
 shadows.onAfterShadowMapRenderMeshObservable.add(()=>{phase='main';});
 for(const mesh of h.scene.meshes)mesh.onBeforeDrawObservable.add(()=>{name=mesh.name;});
 for(const method of ['drawArraysType','drawElementsType'])h.engine[method]=(fillMode,start,count)=>{
  if(fillMode===Material.TriangleFillMode&&(name.endsWith('-roof')||name.endsWith('-canopy')))calls.push({method,name,phase,fillMode,start,count});
 };
 try{
  // Exercise Babylon Scene.render and ShadowGenerator's actual shared draw
  // path. NullEngine runs the dispatch but supplies no pixels or GPU timing.
  for(let frame=0;frame<4;frame++){h.scene.render();await new Promise(setImmediate);}
  return {legacyRoofDraw,authority:'Actual Babylon Scene.render and ShadowGenerator dispatch under NullEngine; no WebGL pixels',calls:[...new Map(calls.map(c=>[JSON.stringify(c),c])).values()]};
 }finally{shadows.dispose();h.dispose();}
}
export async function roofDrawMeasurement(){
 const baselines=[
  [yard.PLACES_ARCHITECTURE,yard.EXCHANGE_SOLIDS,yard.EXCHANGE_STATIONS,EXCHANGE_CASES],
  [yard.PLACES_ARCHITECTURE_REFINED,yard.EXCHANGE_SOLIDS,yard.EXCHANGE_REFINED_STATIONS,FREIGHT_CASES],
  [yard.PLACES_ARCHITECTURE_FORMS,yard.EXCHANGE_FORMS_SOLIDS,yard.EXCHANGE_REFINED_STATIONS,FORM_CASES],
 ],records=[],geometry=[],costs=[];
 for(const [config,solids,stations,cases]of baselines){
  const old=architectureHarness(configFor(config,solids,stations,true)),fixed=architectureHarness(configFor(config,solids,stations,false));
  try{
   const allBufferEquality=old.world.meshes.every((mesh,i)=>hash(buffers(mesh))===hash(buffers(fixed.world.meshes[i])));
   for(const solid of solids.filter(s=>['gable','barrel'].includes(s.shape))){const a=old.world.meshes.find(m=>m.name==='exchange-'+solid.id),b=fixed.world.meshes.find(m=>m.name===a.name);geometry.push({layout:config.playground.layout,id:solid.id,buffersEqual:hash(buffers(a))===hash(buffers(b)),before:faceAuthority(a,solid),after:faceAuthority(b,solid),culling:b.material.backFaceCulling,receives:b.receiveShadows,casts:fixed.casters.has(b)});}
   // Stock Babylon box supplies an independently constructed orientation control.
   if(config===yard.PLACES_ARCHITECTURE){const s=solids.find(s=>s.id==='station-hall');geometry.push({id:'stock-box-control',after:faceAuthority(fixed.world.meshes.find(m=>m.name==='exchange-'+s.id),s)});}
   for(const [id,setup]of Object.entries(cases)){const a=old.shoot(setup,{fullPath:true}),b=fixed.shoot(setup,{fullPath:true});records.push({layout:config.playground.layout,id,setup,equal:hash(a)===hash(b),before:hash(a),after:hash(b),reason:b.record.reason,elapsed:b.record.elapsed,steps:b.steps,contacts:b.record.contacts.map(c=>c.body)});}
   old.session.action('reset');fixed.session.action('reset');costs.push({layout:config.playground.layout,allBufferEquality,before:old.resources(),after:fixed.resources(),oldCleanup:old.disposeWorld(),fixedCleanup:fixed.disposeWorld()});
  }finally{old.scene.dispose();old.engine.dispose();fixed.scene.dispose();fixed.engine.dispose();}
 }
 const variants=[];
 for(const {id}of EXCHANGE_ROOF_VARIANTS){const h=architectureHarness(configFor(yard.PLACES_ARCHITECTURE,yard.EXCHANGE_SOLIDS,yard.EXCHANGE_STATIONS,!usesCorrectedRoofDraw(id),{roofPresentation:id,details:false}));try{applyRoofDiagnostic(h.world,id);variants.push({id,corrected:usesCorrectedRoofDraw(id),roofDraws:h.world.meshes.filter(m=>m.name.endsWith('-roof')).map(m=>({id:m.name,isUnIndexed:m.isUnIndexed,backFaceCulling:m.material.backFaceCulling})),cleanup:h.disposeWorld()});}finally{h.scene.dispose();h.engine.dispose();}}
 const files=['lib/places-architecture.js','lib/exchange-roof-presentation.js','app/lab/roof-comparison/page.tsx','scripts/instrument-foundry/roof-draw-measure.mjs'];
 return {base:'10b09baafc9d85eef0d87a630b55600d623dcde0',source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),authority:'Real Havok at120Hz; Babylon draw-path instrumentation under NullEngine. No rendered image or GPU measurement.',geometry,records,costs,variants,renderDispatch:[await renderDispatch(true),await renderDispatch(false)]};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const result=await roofDrawMeasurement();await mkdir('docs/experiments/instrument-foundry',{recursive:true});await writeFile('docs/experiments/instrument-foundry/roof-draw-evidence.json',JSON.stringify(result)+'\n');console.log(JSON.stringify({records:result.records.length,allEqual:result.records.every(r=>r.equal),allBuffersEqual:result.costs.every(c=>c.allBufferEquality),geometry:result.geometry.map(g=>({id:g.id,before:g.before?.outward,after:g.after.outward})),renderDispatch:result.renderDispatch,variants:result.variants.length},null,2));}
