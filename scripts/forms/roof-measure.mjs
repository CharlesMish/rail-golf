import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {NullEngine,Scene,FreeCamera,DirectionalLight,ShadowGenerator,Vector3} from '@babylonjs/core';
import {architectureHarness} from '../playgrounds/architecture-harness.mjs';
import {EXCHANGE_CASES} from '../places/architecture-measure.mjs';
import {FREIGHT_CASES} from '../refinement/spatial-cases.mjs';
import {buildExchangeYard,PLACES_ARCHITECTURE,PLACES_ARCHITECTURE_REFINED,EXCHANGE_REFINED_STATIONS,EXCHANGE_REFINED_LAYOUT,EXCHANGE_SOLIDS} from '../../lib/places-architecture.js';
import {configureExchangeShadows,EXCHANGE_ROOF_VARIANTS,applyRoofDiagnostic} from '../../lib/exchange-roof-presentation.js';

const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function roofMeasurement(){
 const records=[],meshChecks=[],engine=new NullEngine(),scene=new Scene(engine),camera=new FreeCamera('audit',new Vector3(51,32,39),scene),sun=new DirectionalLight('sun',new Vector3(-.5,-1,.4),scene);camera.minZ=.1;camera.maxZ=650;
 const shadowProfiles=EXCHANGE_ROOF_VARIANTS.map(({id})=>{const shadows=new ShadowGenerator(1024,sun);configureExchangeShadows(shadows,id);const result={id,filter:shadows.filter,bias:shadows.bias,normalBias:shadows.normalBias,mapSize:shadows.getShadowMap().getRenderSize(),pcf:shadows.usePercentageCloserFiltering,poissonFallback:shadows.usePoissonSampling};shadows.dispose();return result;});scene.dispose();engine.dispose();
 for(const [config,cases,stations,layout]of [[PLACES_ARCHITECTURE,EXCHANGE_CASES,undefined,undefined],[PLACES_ARCHITECTURE_REFINED,FREIGHT_CASES,EXCHANGE_REFINED_STATIONS,EXCHANGE_REFINED_LAYOUT]]){
  const make=roofPresentation=>architectureHarness({...config,buildWorld:(scene,root,materials,shadows)=>buildExchangeYard(scene,root,materials,Object.assign(shadows,{getShadowMap:()=>null}),{roofPresentation,...(stations?{stations,layout}:{})})});
  const old=make('incumbent'),candidate=make('candidate');
  try{
   for(const r of EXCHANGE_SOLIDS.filter(s=>s.shape==='gable')){const a=old.world.meshes.find(m=>m.name==='exchange-'+r.id),b=candidate.world.meshes.find(m=>m.name===a.name);meshChecks.push({layout:config.playground.layout,id:r.id,positionBufferEqual:hash(a.getVerticesData('position'))===hash(b.getVerticesData('position')),indicesEqual:hash(a.getIndices())===hash(b.getIndices()),normalsEqual:hash(a.getVerticesData('normal'))===hash(b.getVerticesData('normal')),cast:candidate.casters.has(b),receive:b.receiveShadows,culling:b.material.backFaceCulling});}
   for(const [id,setup]of Object.entries(cases)){const a=old.shoot(setup,{fullPath:true}),b=candidate.shoot(setup,{fullPath:true});records.push({layout:config.playground.layout,id,setup,equal:hash(a)===hash(b),oldHash:hash(a),candidateHash:hash(b),reason:b.record.reason,elapsed:b.record.elapsed,physicsSteps:b.steps,contacts:b.record.contacts.map(c=>c.body)});}
  }finally{old.dispose();candidate.dispose();}
 }
 const diagnostics=[];
 for(const {id}of EXCHANGE_ROOF_VARIANTS){const h=architectureHarness(PLACES_ARCHITECTURE);try{const before=h.resources(),p=hash(h.world.meshes.map(m=>m.getVerticesData('position'))),material=h.world.bodies.map(b=>({...b.shape.material}));applyRoofDiagnostic(h.world,id);diagnostics.push({id,positionsUnchanged:p===hash(h.world.meshes.map(m=>m.getVerticesData('position'))),physicsMaterialsUnchanged:hash(material)===hash(h.world.bodies.map(b=>({...b.shape.material}))),bodies:h.resources().staticBodies,baselineTriangles:before.triangles,diagnosticTriangles:h.resources().triangles,cleanup:h.disposeWorld()});}finally{h.scene.dispose();h.engine.dispose();}}
 return {source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),environment:'NullEngine + actual Havok; no WebGL pixels or rendered performance',confirmed:{inwardRoofFaces:false,roofBuildingCoplanarBases:[{roof:'west-store-roof',base:13,buildingTop:13},{roof:'station-roof',base:13,buildingTop:13},{roof:'signal-roof',base:7,buildingTop:7}],incumbentNormalBias:0,incumbentDepthBias:.00005,cameraNear:.1,cameraFar:650},meshChecks,shadowProfiles,records,diagnostics};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const result=roofMeasurement();await mkdir('docs/experiments/forms-ensemble',{recursive:true});await writeFile('docs/experiments/forms-ensemble/roof-evidence.json',JSON.stringify(result)+'\n');console.log(JSON.stringify({cases:result.records.length,allEqual:result.records.every(x=>x.equal),meshChecks:result.meshChecks.length,diagnosticVariants:result.diagnostics.length}));}
