import {ShadowGenerator} from '@babylonjs/core';

// Presentation only. These alternatives do not write vertex positions, Havok
// shapes, material restitution, station definitions or physical world identity.
export const EXCHANGE_ROOF_VIEWS=Object.freeze({
 'above-slope':{label:'Above the near slope',position:[69,43,21],target:[25,15,64]},
 'near-eaves':{label:'Near the eaves',position:[47,14,55],target:[25,16,64]},
 'front-gable':{label:'Front gable',position:[25,19,25],target:[25,15,64]},
 'rear-gable':{label:'Rear gable',position:[25,22,98],target:[25,15,64]},
 'under-eaves':{label:'Under the overhang',position:[37,11,43],target:[34,13,49]},
});
export const EXCHANGE_ROOF_VARIANTS=Object.freeze([
 {id:'indexed-faces',label:'Corrected triangle draw · current shadows',description:'Uses the corrected outward triangle indices in both colour and shadow drawing. Same positions, normals, culling and PCF/bias as PR89. Owner rendering confirmation remains required.'},
 {id:'indexed-original',label:'Corrected triangle draw · original shadows',description:'Uses corrected triangle indices with the original exponential shadows. Compare with PR86 to isolate draw order from shadow filtering.'},
 {id:'incumbent',label:'PR86 · exponential shadows',description:'The reviewed roof winding and original blurred exponential shadow recipe.'},
 {id:'bias-only',label:'Bias only',description:'Same exponential filter; adds depth bias 0.001 and normal bias 0.03 m.'},
 {id:'pcf-only',label:'Filter only',description:'Depth-comparison PCF filter; keeps the original bias and zero normal bias.'},
 {id:'candidate',label:'PR89 · PCF and bias',description:'The owner-played PR89 shadow candidate, including its old unindexed triangle draw. Roof culling, receiving and casting remain enabled.'},
 {id:'no-roof-shadow',label:'Diagnostic · roof shadow reception off',description:'Original recipe, but roofs do not receive shadows. They still cast them. Not a proposed final look.'},
 {id:'two-sided',label:'Diagnostic · two-sided roof',description:'Original recipe with roof culling disabled. Tests visibility, not physics. Not a proposed final look.'},
 {id:'no-building-top',label:'Diagnostic · hidden building cap removed',description:'Original recipe with the coplanar building top removed from rendering only. Roof and physical hull are unchanged.'},
]);
export function configureExchangeShadows(shadows,mode='candidate'){
 if(!EXCHANGE_ROOF_VARIANTS.some(v=>v.id===mode))throw Error('Unknown roof presentation');
 // Headless physics harnesses supply caster collectors rather than a renderer.
 if(typeof shadows.getShadowMap!=='function')return;
 shadows.blurKernel=12;
 shadows.bias=.00005;shadows.normalBias=0;
 if(mode==='bias-only'||mode==='candidate'||mode==='indexed-faces'){shadows.bias=.001;shadows.normalBias=.03;}
 if(mode==='pcf-only'||mode==='candidate'||mode==='indexed-faces'){
  shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=ShadowGenerator.QUALITY_LOW;
 }else shadows.useBlurExponentialShadowMap=true;
}
export function usesCorrectedRoofDraw(mode){
 if(!EXCHANGE_ROOF_VARIANTS.some(v=>v.id===mode))throw Error('Unknown roof presentation');
 return mode==='indexed-faces'||mode==='indexed-original';
}
export function applyRoofDiagnostic(world,mode){
 if(!EXCHANGE_ROOF_VARIANTS.some(v=>v.id===mode))throw Error('Unknown roof diagnostic');
 for(const mesh of world.meshes){
  if(mesh.name.endsWith('-roof')){
   if(mode==='no-roof-shadow')mesh.receiveShadows=false;
   if(mode==='two-sided')mesh.material.backFaceCulling=false;
  }
  if(mode==='no-building-top'&&['exchange-station-hall','exchange-west-store','exchange-signal-house'].includes(mesh.name)){
   const indices=mesh.getIndices(),normals=mesh.getVerticesData('normal'),filtered=[];
   for(let i=0;i<indices.length;i+=3)if(normals[indices[i]*3+1]<.99)filtered.push(...indices.slice(i,i+3));
   mesh.setIndices(filtered);
  }
 }
}
