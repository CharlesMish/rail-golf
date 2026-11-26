import test from 'node:test';
import assert from 'node:assert/strict';
import {roofMeasurement} from '../scripts/forms/roof-measure.mjs';

test('roof shadow candidate preserves full Havok histories and all original roof buffers while diagnostics clean up',()=>{
 const result=roofMeasurement();assert.equal(result.records.length,23);
 for(const r of result.records)assert.equal(r.equal,true,`${r.layout} ${r.id}`);
 for(const m of result.meshChecks)for(const k of ['positionBufferEqual','indicesEqual','normalsEqual','cast','receive','culling'])assert.equal(m[k],true,`${m.id} ${k}`);
 for(const d of result.diagnostics){assert.equal(d.positionsUnchanged,true);assert.equal(d.physicsMaterialsUnchanged,true);assert.equal(d.bodies,21);for(const k of ['staticBodies','dynamicBodies','animatedBodies','meshes','materials','textures','geometries','casters','subMeshes'])assert.equal(d.cleanup[k],0,`${d.id} ${k}`);}
 const profiles=Object.fromEntries(result.shadowProfiles.map(p=>[p.id,p]));assert.equal(profiles.incumbent.normalBias,0);assert.equal(profiles.candidate.normalBias,.03);assert.equal(profiles.candidate.bias,.001);assert.equal(profiles['bias-only'].filter,profiles.incumbent.filter);assert.notEqual(profiles['pcf-only'].filter,profiles.incumbent.filter);assert.equal(profiles.candidate.mapSize,1024);
 const caps=result.diagnostics.find(d=>d.id==='no-building-top');assert.equal(caps.baselineTriangles-caps.diagnosticTriangles,6);
});
