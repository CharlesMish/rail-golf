import type { Camera, GlowLayer, Mesh, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';

export const YARD_ENVIRONMENT: Readonly<{
  seed:string;
  center:Readonly<{x:number;z:number}>;
  ground:Readonly<{minX:number;maxX:number;minZ:number;maxZ:number;y:number}>;
  siding:Readonly<{x:number;minZ:number;maxZ:number;gauge:number}>;
  kiln:Readonly<{x:number;z:number;width:number;depth:number;height:number}>;
  skyRadius:number;
  cameraFar:number;
}>;
export function createYardEnvironment(scene:Scene,options?:{
  camera?:Camera|null;
  glow?:GlowLayer|null;
  seed?:string;
}):{
  root:TransformNode;
  meshes:Mesh[];
  materials:StandardMaterial[];
  stats:Readonly<{meshes:number;materials:number;vertices:number;triangles:number;opaqueDraws:number;textureBytes:number;lights:number;shadowCasters:number}>;
  dispose():void;
};
