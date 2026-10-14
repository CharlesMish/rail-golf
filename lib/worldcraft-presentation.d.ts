import type { Mesh, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';
export const WORLDCRAFT_PRESENTATION: Readonly<{
  bounds: Readonly<{ minX:number; maxX:number; minZ:number; maxZ:number }>;
  cameraFar: number;
  skyRadius: number;
}>;
export type WorldcraftMaterials = Record<'bank'|'ramp'|'block'|'ground'|'steel'|'machine'|'cyan'|'amber'|'environment', StandardMaterial>;
export function createWorldcraftPresentation(scene: Scene): {
  root: TransformNode;
  meshes: Mesh[];
  materials: WorldcraftMaterials;
  stats: Readonly<{ materials:number; meshes:number; vertices:number; triangles:number; opaqueDraws:number; textureBytes:number; lights:number; shadowCasters:number; colliders:number }>;
  dispose(): void;
};
