import { Color3, MeshBuilder, PhysicsAggregate, PhysicsShapeType, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { WORLDCRAFT_CATALOG, validateWorld } from './worldcraft-model.js';
import { RAIL_RULES } from './rail-golf-v02.js';

export const WORLDCRAFT_GROUND = Object.freeze({ minX: -32, maxX: 32, minZ: -8, maxZ: 108, minY: -8 });
export const WORLDCRAFT_CONTACTS = Object.freeze({
  ...Object.fromEntries(['bank','ramp','block'].map(kind => [kind, Object.freeze({ mass: 0, restitution: WORLDCRAFT_CATALOG[kind].restitution, friction: WORLDCRAFT_CATALOG[kind].friction })])),
  ground: Object.freeze({ mass: 0, restitution: .1, friction: .8 }),
});

/** Shared for this runtime's lifetime, never allocated once per edited object. */
export function createWorldcraftMaterials(scene) {
  const colors = { ground: [.30,.27,.20], machine: [.085,.13,.135], bank: [.63,.40,.23], ramp: [.78,.62,.40], block: [.25,.13,.07] };
  const materials = Object.fromEntries(Object.entries(colors).map(([key, rgb]) => {
    const material = new StandardMaterial(`worldcraft-${key}`, scene);
    material.diffuseColor = Color3.FromArray(rgb); material.specularColor = new Color3(.07,.07,.07);
    return [key, material];
  }));
  return { materials, dispose() { for (const material of Object.values(materials)) material.dispose(false, false); } };
}

/** Visible boxes and Havok shapes are built from the same validated records. */
export function buildWorldcraftScene(scene, input, { materials, shadows = null } = {}) {
  const world = validateWorld(input), root = new TransformNode('worldcraft-layout', scene);
  const meshes = [], bodies = [], objectMeshes = new Map(), casters = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    for (const body of bodies) body.dispose();
    for (const mesh of casters) shadows?.removeShadowCaster(mesh);
    root.dispose(false, false);
  };
  const box = (name, size, position, material, physics, metadata, pitch = 0, yaw = 0, shadow = true) => {
    const mesh = MeshBuilder.CreateBox(name, size, scene); meshes.push(mesh);
    mesh.parent = root; mesh.position.copyFromFloats(...position);
    mesh.rotation.set(pitch * Math.PI / 180, yaw * Math.PI / 180, 0);
    mesh.material = material; mesh.receiveShadows = true; mesh.metadata = metadata;
    mesh.isPickable = Boolean(metadata?.worldcraftId);
    // Construct after position and rotation: STATIC bodies do not follow preview drags.
    bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.BOX, physics, scene));
    if (shadow && shadows) { shadows.addShadowCaster(mesh); casters.push(mesh); }
    return mesh;
  };
  try {
    if (!materials || !['ground','machine','bank','ramp','block'].every(key => materials[key])) throw new Error('Worldcraft materials are incomplete.');
    const ground = box('worldcraft-ground', { width: 64, height: 1, depth: 116 }, [0,-.5,50], materials.ground, WORLDCRAFT_CONTACTS.ground, { rangeGround: true }, 0, 0, false);
    const tee = box('worldcraft-tee', { width: 24, height: .3, depth: 8 }, [0,.15,-1], materials.machine, WORLDCRAFT_CONTACTS.ground, { rangeGround: true });
    // Canonical ID order keeps shape insertion and contact evidence stable after JSON reload.
    for (const record of [...world.objects].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
      const prefab = WORLDCRAFT_CATALOG[record.kind];
      const mesh = box(`worldcraft-object-${record.id}`, { width: prefab.width, height: prefab.height, depth: prefab.depth }, [record.x,prefab.centerY,record.z], materials[record.kind], WORLDCRAFT_CONTACTS[record.kind], {
        worldcraftId: record.id,
        lineFeature: { id: record.id, kind: `worldcraft-${record.kind}`, label: `${record.kind.toUpperCase()} REBOUND` },
      }, prefab.pitch ?? 0, record.yaw);
      objectMeshes.set(record.id, mesh);
    }
    return { root, meshes, bodies, objectMeshes, ground, tee, dispose };
  } catch (error) { dispose(); throw error; }
}

/** Actual launch sphere against each compiled oriented box; no trajectory prediction. */
export function worldcraftMuzzleClearance(worldScene, muzzle, radius = RAIL_RULES.projectileRadius) {
  if (![muzzle?.x,muzzle?.y,muzzle?.z,radius].every(Number.isFinite) || radius <= 0) return { ok: false, reason: 'Invalid launch position.' };
  const b = WORLDCRAFT_GROUND;
  if (muzzle.x - radius < b.minX || muzzle.x + radius > b.maxX || muzzle.z - radius < b.minZ || muzzle.z + radius > b.maxZ || muzzle.y - radius < 0) return { ok: false, reason: 'The launch sphere is outside the yard.' };
  for (const mesh of worldScene.meshes) {
    const inverse = mesh.computeWorldMatrix(true).clone().invert();
    const local = Vector3.TransformCoordinates(new Vector3(muzzle.x,muzzle.y,muzzle.z), inverse);
    const bounds = mesh.getBoundingInfo().boundingBox;
    const nearest = new Vector3(
      Math.max(bounds.minimum.x, Math.min(bounds.maximum.x, local.x)),
      Math.max(bounds.minimum.y, Math.min(bounds.maximum.y, local.y)),
      Math.max(bounds.minimum.z, Math.min(bounds.maximum.z, local.z)),
    );
    if (Vector3.DistanceSquared(local, nearest) <= (radius + .01) ** 2) return { ok: false, reason: `The launch sphere overlaps ${mesh.metadata?.worldcraftId ?? 'the ground'}.` };
  }
  return { ok: true };
}
