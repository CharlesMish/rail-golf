import { Color3, MultiMaterial, StandardMaterial, SubMesh } from '@babylonjs/core';

/** Restrained, scene-owned materials for the production courtyard only. */
export function createYardPresentationMaterials(scene, materials) {
  const yardTreadTop = new StandardMaterial('yard-tread-top', scene);
  yardTreadTop.diffuseTexture = materials.timber.diffuseTexture;
  yardTreadTop.diffuseColor = new Color3(.78, .57, .34);
  yardTreadTop.emissiveColor = new Color3(.018, .012, .005);
  yardTreadTop.specularColor = new Color3(.08, .08, .08);

  const yardSupportGrain = new StandardMaterial('yard-support-grain', scene);
  yardSupportGrain.diffuseTexture = materials.timber.diffuseTexture;
  yardSupportGrain.diffuseColor = new Color3(.40, .27, .16);
  yardSupportGrain.emissiveColor = Color3.Black();
  yardSupportGrain.specularColor = new Color3(.035, .035, .035);

  const yardTreadMark = new StandardMaterial('yard-tread-mark', scene);
  yardTreadMark.diffuseColor = new Color3(.88, .78, .58);
  yardTreadMark.emissiveColor = new Color3(.015, .012, .006);
  yardTreadMark.specularColor = new Color3(.04, .04, .04);
  return { yardTreadTop, yardSupportGrain, yardTreadMark };
}

/** Paint the existing box's upward face; geometry and physical body stay intact. */
export function applyTreadTopMaterial(mesh, topMaterial) {
  const material = new MultiMaterial(`${mesh.name}-faces`, mesh.getScene());
  material.subMaterials = [mesh.material, topMaterial];
  mesh.material = material;
  mesh.releaseSubMeshes();
  // Babylon CreateBox face order: front, back, right, left, top, bottom.
  // Separate draw ranges preserve the original 24 vertices and 36 indices.
  new SubMesh(0, 0, 24, 0, 24, mesh);
  new SubMesh(1, 0, 24, 24, 6, mesh);
  new SubMesh(0, 0, 24, 30, 6, mesh);
  // Course switches dispose each box, while the shared scene materials persist.
  mesh.onDisposeObservable.add(() => material.dispose(false, false));
}
