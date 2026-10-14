import test from 'node:test';
import assert from 'node:assert/strict';
import { Color3, FreeCamera, GlowLayer, HemisphericLight, MeshBuilder, NullEngine, Scene, StandardMaterial, Vector3, VertexBuffer } from '@babylonjs/core';
import { createYardEnvironment, YARD_ENVIRONMENT } from '../lib/yard-environment.js';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  const camera = new FreeCamera('existing-camera',new Vector3(0,8,-15),scene);
  camera.maxZ = 280; scene.activeCamera = camera;
  scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 105; scene.fogEnd = 230;
  scene.fogColor = new Color3(.075,.115,.135);
  return {engine,scene,camera,dispose(){scene.dispose();engine.dispose();}};
}

const geometry = mesh => ({positions:mesh.getVerticesData(VertexBuffer.PositionKind),indices:mesh.getIndices(),colors:mesh.getVerticesData(VertexBuffer.ColorKind)});

test('surroundings are deterministic, bounded combined geometry with no gameplay authority',()=>{
  const a=fixture(),b=fixture();
  try {
    const first=createYardEnvironment(a.scene),second=createYardEnvironment(b.scene);
    assert.deepEqual(first.meshes.map(geometry),second.meshes.map(geometry));
    assert.ok(first.stats.meshes<=10); assert.ok(first.stats.materials<=10);
    assert.ok(first.stats.triangles<=9000,`triangles ${first.stats.triangles}`);
    assert.equal(first.stats.opaqueDraws,first.meshes.length);
    assert.equal(first.stats.textureBytes,0); assert.equal(a.scene.textures.length,0);
    assert.equal(a.scene.lights.length,0); assert.equal(a.scene.getPhysicsEngine(),null);
    for(const mesh of first.meshes){
      assert.equal(mesh.isPickable,false); assert.equal(mesh.checkCollisions,false);
      assert.equal(mesh.receiveShadows,false); assert.equal(mesh.physicsBody,undefined);
      assert.equal(mesh.metadata,null); assert.equal(mesh.subMeshes.length,1);
      if(mesh.name.endsWith('-sky'))continue;
      assert.equal(mesh.infiniteDistance,false);
      const vertices=mesh.getVerticesData(VertexBuffer.PositionKind);
      for(let i=0;i<vertices.length;i+=3){
        const [x,y,z]=vertices.slice(i,i+3);
        assert.ok(y<-.6||x<-62||x>62||z<-29||z>211,`${mesh.name} enters playable field: ${x},${y},${z}`);
      }
    }
  }finally{a.dispose();b.dispose();}
});

test('setting preserves scene atmosphere and existing scene objects and excludes all scenery from glow',()=>{
  const f=fixture();
  try{
    const light=new HemisphericLight('existing-light',Vector3.Up(),f.scene);
    const glow=new GlowLayer('existing-glow',f.scene);
    const existing=MeshBuilder.CreateBox('existing-play-surface',{},f.scene);
    const material=new StandardMaterial('existing-material',f.scene);existing.material=material;
    existing.metadata={cascadeStep:'step-a'};
    const before=geometry(existing),lights=[...f.scene.lights],callbacks=f.scene.onBeforeRenderObservable.observers.length;
    const environment=createYardEnvironment(f.scene,{camera:f.camera,glow});
    assert.deepEqual(geometry(existing),before);assert.deepEqual(existing.metadata,{cascadeStep:'step-a'});
    assert.deepEqual(f.scene.lights,lights);assert.equal(light.intensity,1);
    assert.equal(f.scene.fogStart,105);assert.equal(f.scene.fogEnd,230);
    assert.deepEqual(f.scene.fogColor.asArray(),[.075,.115,.135]);
    assert.equal(f.scene.onBeforeRenderObservable.observers.length,callbacks);
    assert.equal(f.camera.maxZ,YARD_ENVIRONMENT.cameraFar);
    for(const mesh of environment.meshes)assert.equal(glow.hasMesh(mesh),false);
    const sky=environment.meshes.find(mesh=>mesh.name.endsWith('-sky'));
    assert.equal(sky.infiniteDistance,true);assert.equal(sky.material.disableDepthWrite,true);
    assert.equal(sky.material.fogEnabled,false);
    for(const name of ['kiln-walls','kiln-roofs','service-siding'])assert.equal(environment.meshes.find(mesh=>mesh.name.endsWith(name)).material.fogEnabled,true);
    environment.dispose();environment.dispose();
    assert.equal(f.camera.maxZ,280);assert.ok(f.scene.meshes.includes(existing));
    assert.ok(f.scene.materials.includes(material));assert.ok(f.scene.lights.includes(light));
  }finally{f.dispose();}
});

test('apron overlaps beneath every slab edge and closes its all-around seam',()=>{
  const f=fixture();
  try{
    const environment=createYardEnvironment(f.scene);
    const apron=environment.meshes.find(mesh=>mesh.name.endsWith('ground-apron'));
    const vertices=apron.getVerticesData(VertexBuffer.PositionKind);
    const inner=Array.from({length:97},(_,i)=>vertices.slice(i*9,i*9+3));
    assert.ok(inner.every(([,y])=>y<-.6),'all inner terrain remains beneath the physical surface');
    for(const [axis,sign,boundary] of [[0,1,50],[0,-1,-50],[2,1,199],[2,-1,-17]]){
      const edge=inner.reduce((best,p)=>sign*p[axis]>sign*best[axis]?p:best);
      assert.ok(sign*(boundary-edge[axis])>=1.99,'apron starts two metres underneath the existing slab');
    }
    for(let ring=0;ring<3;ring++){
      const first=vertices.slice(ring*3,ring*3+3),last=vertices.slice((96*3+ring)*3,(96*3+ring)*3+3);
      first.forEach((value,index)=>assert.ok(Math.abs(value-last[index])<1e-8,'closed all-around apron'));
    }
    environment.dispose();
  }finally{f.dispose();}
});

test('repeated creation and disposal leaves no owned meshes, materials or roots behind',()=>{
  const f=fixture();
  try{
    const baseline={meshes:f.scene.meshes.length,materials:f.scene.materials.length,roots:f.scene.transformNodes.length,textures:f.scene.textures.length};
    for(let i=0;i<4;i++){
      const environment=createYardEnvironment(f.scene,{seed:'stable-test'});
      assert.equal(environment.meshes.length,environment.stats.meshes);
      environment.dispose();
      assert.deepEqual({meshes:f.scene.meshes.length,materials:f.scene.materials.length,roots:f.scene.transformNodes.length,textures:f.scene.textures.length},baseline);
    }
    const environment=createYardEnvironment(f.scene);f.camera.maxZ=900;
    environment.dispose();assert.equal(f.camera.maxZ,900,'a later camera owner is not undone');
  }finally{f.dispose();}
});
