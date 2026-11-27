// Independent draw-dispatch probe. NullEngine checks submitted topology and draw
// selection, not rendered pixels, shadow quality or GPU behavior.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import Havok from '@babylonjs/havok';
import {NullEngine,Scene,HavokPlugin,Vector3,TransformNode,DirectionalLight,ShadowGenerator,Material,Logger} from '@babylonjs/core';
import {buildExchangeYard,EXCHANGE_SOLIDS} from '../../lib/places-architecture.js';
import {barrelMesh} from '../../lib/architectural-forms.js';
import {RAIL_RULES} from '../../lib/rail-golf-v02.js';
Logger.LogLevels=0;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const engine=new NullEngine(),scene=new Scene(engine),root=new TransformNode('review-roof-root',scene);
scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
const sun=new DirectionalLight('review-roof-sun',new Vector3(-1,-1,1),scene),shadows=new ShadowGenerator(1024,sun);
const yard=buildExchangeYard(scene,root,null,shadows,{details:false,legacyRoofDraw:true});
function buffers(mesh){return {positions:Array.from(mesh.getVerticesData('position')),normals:Array.from(mesh.getVerticesData('normal')),indices:Array.from(mesh.getIndices())};}
function orientation(mesh,h,forceUnindexed=null){
 const {positions:p,indices}=buffers(mesh),unindexed=forceUnindexed??mesh.isUnIndexed;
 const sequence=unindexed?Array.from({length:p.length/3},(_,i)=>i):indices;
 const values=[];
 for(let i=0;i<sequence.length;i+=3){const a=sequence[i]*3,b=sequence[i+1]*3,c=sequence[i+2]*3;
  const u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],v=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
  const outward=[-(u[1]*v[2]-u[2]*v[1]),-(u[2]*v[0]-u[0]*v[2]),-(u[0]*v[1]-u[1]*v[0])];
  const fromInside=[(p[a]+p[b]+p[c])/3,(p[a+1]+p[b+1]+p[c+1])/3-h/3,(p[a+2]+p[b+2]+p[c+2])/3];
  values.push(outward.reduce((sum,x,j)=>sum+x*fromInside[j],0));
 }
 return {triangles:values.length,outward:values.filter(x=>x>1e-8).length,inward:values.filter(x=>x< -1e-8).length,degenerate:values.filter(x=>Math.abs(x)<=1e-8).length};
}
function actualDispatch(mesh){const calls=[];const a=engine.drawArraysType,b=engine.drawElementsType;try{engine.drawArraysType=(...args)=>calls.push({kind:'arrays',args});engine.drawElementsType=(...args)=>calls.push({kind:'elements',args});mesh._draw(mesh.subMeshes[0],Material.TriangleFillMode);}finally{engine.drawArraysType=a;engine.drawElementsType=b;}return calls;}
const rows=[];
for(const record of EXCHANGE_SOLIDS.filter(s=>s.shape==='gable')){
 const mesh=yard.meshes.find(m=>m.name==='exchange-'+record.id),before=buffers(mesh);
 const observed={unindexed:mesh.isUnIndexed,actualDispatch:actualDispatch(mesh),submitted:orientation(mesh,record.h),storedIndices:orientation(mesh,record.h,false)};
 mesh.isUnIndexed=false;
 const indexed={unindexed:mesh.isUnIndexed,actualDispatch:actualDispatch(mesh),submitted:orientation(mesh,record.h)};
 assert.equal(hash(buffers(mesh)),hash(before));assert.equal(indexed.submitted.outward,indexed.submitted.triangles);assert.equal(indexed.actualDispatch[0].kind,'elements');
 rows.push({id:record.id,observed,indexed,buffersUnchanged:true});
}
const barrel=barrelMesh({id:'review-barrel',w:22,h:4,d:20,segments:10},scene);
const successfulConstruction={unindexed:barrel.isUnIndexed,actualDispatch:actualDispatch(barrel),submitted:orientation(barrel,4)};
assert.equal(successfulConstruction.submitted.outward,successfulConstruction.submitted.triangles);
barrel.dispose();yard.dispose();shadows.dispose();sun.dispose();root.dispose();scene.dispose();engine.dispose();
const result={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),babylon:'9.23.0',authority:'NullEngine actual Mesh._draw dispatch plus independently computed submitted triangle orientation; no rendered pixel evidence',gables:rows,barrel:successfulConstruction,limits:['No WebGL image or shadow quality verification','This probe changes draw-mode flags only; lane physics comparisons establish replay isolation']};
await writeFile(new URL('../../docs/experiments/instrument-foundry/review-roof-dispatch.json',import.meta.url),JSON.stringify(result)+'\n');console.log(JSON.stringify(result));
