import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {DynamicTexture,HemisphericLight,StandardMaterial,Vector3} from '@babylonjs/core';
import {applyLinecraftPresentation} from '../lib/linecraft-presentation.js';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {diverterHarness} from './helpers/diverter-physics.mjs';

const hv=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});

// Supply only the Canvas2D drawing surface to NullEngine. This exercises real
// Babylon texture/mesh setup and physics; it does not verify rendered appearance.
function canvas(width,height){
 const value={width,height};
 const context={canvas:value,fillRect(){},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){},
  createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};
 value.getContext=()=>context;return value;
}

test('Linecraft visual port has no aim/collision authority and retains bank, tread and Open shot traces',()=>{
 for(const [station,setup] of [
  ['gate',{railIndex:0,yaw:-1,elevation:25,charge:.93}],
  ['lumber',{railIndex:1,yaw:0,elevation:30,charge:(22+21*.05-6)/37}],
  ['gate',{railIndex:1,yaw:0,elevation:42,charge:.93}],
 ]){
  const h=diverterHarness(hv,'A',true,selectOpenLineStation(station),{scoreLab:true,linecraft:true});
  try{
   const before=h.shoot(setup);h.action('retry');
   const physicalMeshes=h.scene.meshes.filter(mesh=>mesh.physicsBody);
   h.scene.getEngine().createCanvas=canvas;
   const sky=new HemisphericLight('test-sky',new Vector3(0,1,0),h.scene);
   const materials=Object.fromEntries(['timber','brick','rough','fairwayA','fairwayB'].map(key=>[key,new StandardMaterial(key,h.scene)]));
   applyLinecraftPresentation(h.scene,sky,materials);
   assert.deepEqual(h.scene.meshes.filter(mesh=>mesh.physicsBody),physicalMeshes);
   const dome=h.scene.getMeshByName('linecraft-sky-dome');
   assert.equal(dome.isPickable,false);assert.equal(dome.infiniteDistance,true);
   assert.equal(h.scene.getMeshByName('yard-outer-apron'),null);
   assert.equal(h.scene.imageProcessingConfiguration.vignetteEnabled,false);
   const dirt=materials.rough.diffuseTexture,stripe=materials.fairwayA.diffuseTexture;
   assert.notEqual(dirt,stripe);assert.equal(dirt.getContext().canvas,stripe.getContext().canvas,'both GPU textures use the drawn dirt tile');
   assert.equal(materials.fairwayB.diffuseTexture,stripe);
   for(const texture of [dirt,stripe]){
    assert.equal(texture.wrapU,DynamicTexture.WRAP_ADDRESSMODE);assert.equal(texture.wrapV,DynamicTexture.WRAP_ADDRESSMODE);
    assert.equal(texture.getInternalTexture().generateMipMaps,true);
   }
   assert.equal(materials.timber.diffuseTexture.getInternalTexture().generateMipMaps,true);
   assert.deepEqual(h.shoot(setup),before,station+' complete physical result remains exact');
  }finally{h.dispose();}
 }
});
