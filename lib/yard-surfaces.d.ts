import type { Mesh, Scene, StandardMaterial } from '@babylonjs/core';
export type YardSurfaceKind = 'timber' | 'end-grain' | 'metal' | 'ground';
export const YARD_GROUND_BOUNDS: Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
export const YARD_SURFACE_SIZES: Readonly<Record<YardSurfaceKind, readonly [number, number]>>;
export function createYardSurfacePixels(kind: YardSurfaceKind): { width: number; height: number; data: Uint8Array };
export function applyYardSurfaceMaterials(scene: Scene, materials: Record<string, StandardMaterial>): {
  yardEndGrain: StandardMaterial;
  yardEndGrainPale: StandardMaterial;
};
export function applyYardGroundUVs(mesh: Mesh): void;
