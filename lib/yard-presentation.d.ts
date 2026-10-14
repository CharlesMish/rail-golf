import type { Scene, Mesh, StandardMaterial } from '@babylonjs/core';

export function createYardPresentationMaterials(scene: Scene, materials: {
  timber: StandardMaterial;
  sand: StandardMaterial;
}, options?: { surfaceDetail?: boolean }): {
  yardTreadTop: StandardMaterial;
  yardSupportGrain: StandardMaterial;
  yardTreadMark: StandardMaterial;
};
export function applyTreadTopMaterial(mesh: Mesh, topMaterial: StandardMaterial): void;
