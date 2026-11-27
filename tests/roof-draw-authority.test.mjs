import test from 'node:test';
import assert from 'node:assert/strict';
import {roofDrawMeasurement} from '../scripts/instrument-foundry/roof-draw-measure.mjs';

test('gabled roofs submit their corrected triangles to both main and shadow passes without changing any physical record',async()=>{
 const result=await roofDrawMeasurement();
 for(const g of result.geometry){
  assert.equal(g.after.outward,true,g.id);assert.equal(g.after.normalsAgree,true,g.id);
  if(g.before){assert.equal(g.buffersEqual,true,g.id);assert.equal(g.culling,true);assert.equal(g.receives,true);assert.equal(g.casts,true);
   const gable=g.id.endsWith('-roof');assert.equal(g.before.outward,!gable,g.id);assert.equal(g.before.normalsAgree,!gable,g.id);assert.equal(g.after.isUnIndexed,!gable,g.id);
  }
 }
 for(const pass of result.renderDispatch){
  for(const phase of ['main','shadow'])for(const id of ['west-store-roof','station-roof','signal-roof','maintenance-canopy']){
   const draw=pass.calls.find(c=>c.name==='exchange-'+id&&c.phase===phase);assert.ok(draw,`${phase} ${id} actually dispatched`);
   assert.equal(draw.method,!id.endsWith('-roof')||pass.legacyRoofDraw?'drawArraysType':'drawElementsType',`${phase} ${id}`);
  }
 }
 assert.equal(result.records.length,32);for(const r of result.records)assert.equal(r.equal,true,`${r.layout} ${r.id}`);
 for(const c of result.costs){assert.equal(c.allBufferEquality,true);assert.deepEqual(c.before,c.after);for(const cleanup of [c.oldCleanup,c.fixedCleanup])for(const k of ['staticBodies','dynamicBodies','animatedBodies','meshes','materials','textures','geometries','casters','subMeshes'])assert.equal(cleanup[k],0,k);}
 for(const variant of result.variants)for(const r of variant.roofDraws)assert.equal(r.isUnIndexed,!variant.corrected,variant.id);
 const twoSided=result.variants.find(v=>v.id==='two-sided');assert.ok(twoSided.roofDraws.every(r=>r.backFaceCulling===false));
});
