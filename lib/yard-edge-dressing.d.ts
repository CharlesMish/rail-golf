import type { GlowLayer, Mesh, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';

type Footprint = Readonly<{id:string;minX:number;maxX:number;minZ:number;maxZ:number}>;
export const YARD_EDGE_DRESSING: Readonly<{
  seed:string;
  floorMaxY:number;
  fence:Readonly<{x:number;south:number;north:number;gate:number;postHeight:number}>;
  perimeterTolerance:number;
  lamps:ReadonlyArray<Readonly<{x:number;z:number;armX:number;armZ:number}>>;
  keepClear:ReadonlyArray<Footprint>;
}>;
export function createYardEdgeDressing(scene:Scene,options?:{
  glow?:GlowLayer|null;
  seed?:string;
}):{
  root:TransformNode;
  meshes:Mesh[];
  materials:StandardMaterial[];
  stats:Readonly<{meshes:number;materials:number;vertices:number;triangles:number;textureBytes:number;lights:number;shadowCasters:number}>;
  dispose():void;
};
