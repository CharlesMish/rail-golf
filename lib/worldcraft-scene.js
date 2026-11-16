import { Color3, Mesh, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Quaternion, StandardMaterial, TransformNode, Vector3, VertexData } from '@babylonjs/core';
import { WORLDCRAFT_BELL, WORLDCRAFT_CATALOG, WORLDCRAFT_ORC, validateWorld, worldcraftBellPose, worldcraftBellTarget, worldcraftBox, worldcraftElevated, worldcraftFootprint, worldcraftPose, worldcraftTargetBody } from './worldcraft-model.js';
import { terraceMeshBuffers, worldcraftTerraceFacets } from './worldcraft-terrace.js';
import { RAIL_RULES } from './rail-golf-v02.js';

export const WORLDCRAFT_GROUND = Object.freeze({ minX: -32, maxX: 32, minZ: -8, maxZ: 108, minY: -8 });
export const WORLDCRAFT_CONTACTS = Object.freeze({
  ...Object.fromEntries(Object.keys(WORLDCRAFT_CATALOG).map(kind => [kind, Object.freeze({ mass: 0, restitution: WORLDCRAFT_CATALOG[kind].restitution, friction: WORLDCRAFT_CATALOG[kind].friction })])),
  ground: Object.freeze({ mass: 0, restitution: .1, friction: .8 }),
});

/** Shared for this runtime's lifetime, never allocated once per edited object. */
export function createWorldcraftMaterials(scene) {
  const colors = { ground: [.30,.27,.20], machine: [.085,.13,.135], bank: [.63,.40,.23], ramp: [.78,.62,.40], block: [.25,.13,.07], metal: [.74,.78,.81], timber: [.62,.39,.22] };
  const materials = Object.fromEntries(Object.entries(colors).map(([key, rgb]) => {
    const material = new StandardMaterial(`worldcraft-${key}`, scene);
    material.diffuseColor = Color3.FromArray(rgb); material.specularColor = new Color3(.07,.07,.07);
    if (key === 'metal') { material.specularColor = new Color3(.62,.66,.68); material.specularPower = 64; }
    if (key === 'timber') { material.specularColor = new Color3(.06,.04,.03); material.specularPower = 8; }
    return [key, material];
  }));
  return { materials, dispose() { for (const material of Object.values(materials)) material.dispose(false, false); } };
}

/** Visible boxes and Havok shapes are built from the same validated records. */
export function buildWorldcraftScene(scene, input, { materials, shadows = null } = {}) {
  const world = validateWorld(input), root = new TransformNode('worldcraft-layout', scene);
  const meshes = [], bodies = [], objectMeshes = new Map(), casters = [];
  let disposed = false, bellBody = null, ownedMaterials = [];
  const dropBell = () => { const body = bellBody; bellBody = null; body?.dispose(); };
  const dispose = () => {
    if (disposed) return; disposed = true;
    dropBell();
    for (const body of bodies) body.dispose();
    for (const mesh of casters) shadows?.removeShadowCaster(mesh);
    for (const material of ownedMaterials) material.dispose(false, false);
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
    const palette = {
      metal: materials.metal ?? materials.steel ?? materials.ramp,
      timber: materials.timber ?? materials.bank,
    };
    const paint = record => record.voice ? palette[record.voice.material] ?? materials[record.kind] : materials[record.kind];
    const ground = box('worldcraft-ground', { width: 64, height: 1, depth: 116 }, [0,-.5,50], materials.ground, WORLDCRAFT_CONTACTS.ground, { rangeGround: true }, 0, 0, false);
    const amphitheater = world.environment.preset === 'amphitheater-place-v1';
    // This opt-in environment has no old apron, including its physical collider.
    const tee = amphitheater ? null : box('worldcraft-tee', { width: 24, height: .3, depth: 8 }, [0,.15,-1], materials.machine, WORLDCRAFT_CONTACTS.ground, { rangeGround: true });
    let stone = null;
    if (amphitheater) {
      stone = new StandardMaterial('worldcraft-amphitheater-stone', scene);
      stone.diffuseColor = new Color3(.48,.48,.43); stone.specularColor = new Color3(.025,.025,.02);
      ownedMaterials.push(stone);
    }
    // Canonical ID order keeps shape insertion and contact evidence stable after JSON reload.
    for (const record of [...world.objects].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
      if (record.kind === 'terrace') {
        // Same friction and restitution as a resonant plate. Voice does not change either number.
        const contact = { mass: 0, restitution: WORLDCRAFT_CATALOG.plate.restitution, friction: WORLDCRAFT_CATALOG.plate.friction };
        const facets = worldcraftTerraceFacets(record);
        if (amphitheater) {
          // One rendered course, exactly the same faceted surfaces as the colliders.
          const visible = new Mesh(`worldcraft-surface-${record.id}`, scene), positions = [], indices = [];
          for (const facet of facets) {
            const data = terraceMeshBuffers(facet), offset = positions.length / 3;
            positions.push(...data.positions); indices.push(...data.indices.map(index => index + offset));
          }
          const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = [];
          VertexData.ComputeNormals(positions, indices, data.normals); data.applyToMesh(visible);
          visible.parent = root; visible.material = stone; visible.receiveShadows = true; visible.isPickable = true;
          visible.metadata = { worldcraftId: record.id, worldcraftVisualOnly: true }; meshes.push(visible); objectMeshes.set(record.id, visible);
          if (shadows) { shadows.addShadowCaster(visible); casters.push(visible); }
        }
        for (const facet of facets) {
          const mesh = new Mesh(`worldcraft-object-${record.id}`, scene);
          meshes.push(mesh);
          mesh.parent = root;
          const buffers = terraceMeshBuffers(facet);
          const vertexData = new VertexData();
          vertexData.positions = buffers.positions;
          vertexData.indices = buffers.indices;
          vertexData.normals = [];
          VertexData.ComputeNormals(buffers.positions, buffers.indices, vertexData.normals);
          vertexData.applyToMesh(mesh);
          mesh.material = paint(record);
          mesh.receiveShadows = true;
          mesh.isPickable = true;
          mesh.metadata = {
            worldcraftId: record.id,
            facet: facet.index,
            ...(amphitheater ? { convexClearance: true } : {}),
            lineFeature: { id: record.id, kind: 'worldcraft-terrace', label: 'TERRACE REBOUND' },
          };
          bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.CONVEX_HULL, contact, scene));
          if (amphitheater) { mesh.isVisible = false; mesh.isPickable = false; }
          else if (shadows) { shadows.addShadowCaster(mesh); casters.push(mesh); }
          if (!objectMeshes.has(record.id)) objectMeshes.set(record.id, mesh);
        }
        continue;
      }
      const prefab = WORLDCRAFT_CATALOG[record.kind];
      // A standing piece resolves to its catalog centre and pitch. An elevated plate adds its lift and tilt.
      const pose = worldcraftPose(record);
      const mesh = box(`worldcraft-object-${record.id}`, { width: prefab.width, height: prefab.height, depth: prefab.depth }, [record.x,pose.centerY,record.z], paint(record), WORLDCRAFT_CONTACTS[record.kind], {
        worldcraftId: record.id,
        lineFeature: { id: record.id, kind: `worldcraft-${record.kind}`, label: `${record.kind.toUpperCase()} REBOUND` },
      }, pose.pitch, record.yaw);
      if (worldcraftElevated(record)) {
        // Height guide: lines only, no body and no collider. The ground outline is the plate's
        // plan footprint, and the drop line runs from that outline's centre to the plate's lowest point.
        const foot = worldcraftFootprint(record), solid = worldcraftBox(record);
        const outline = [...foot.corners, foot.corners[0]].map(corner => new Vector3(corner.x, .05, corner.z));
        const guide = MeshBuilder.CreateLineSystem(`worldcraft-height-guide-${record.id}`, { lines: [outline, [new Vector3(record.x, .05, record.z), new Vector3(record.x, Math.max(.05, solid.minY), record.z)]] }, scene);
        guide.parent = root; guide.color = new Color3(.56, .66, .68); guide.alpha = .55; guide.isPickable = false;
        guide.metadata = { worldcraftHeightGuide: record.id };
      }
      const movable = !(world.rules?.locked ?? []).includes(record.id);
      mesh.metadata.worldcraftMovable = movable;
      // A tint on the existing mesh. No extra body, material, or collider.
      // Fixed pieces stay on their catalog color so a spare bank is not another slab of the screen.
      mesh.renderOverlay = movable;
      if (movable) {
        mesh.overlayColor = new Color3(0.22, 0.86, 0.88);
        mesh.overlayAlpha = 0.46;
      }
      objectMeshes.set(record.id, mesh);
    }
    let target = null;
    const bellRecord = worldcraftBellTarget(world);
    const motion = {};
    if (world.rules?.pin) {
      const {x,z,r}=world.rules.pin;
      const ring=Array.from({length:65},(_,i)=>new Vector3(x+Math.cos(i*Math.PI/32)*r,.06,z+Math.sin(i*Math.PI/32)*r));
      const marker=MeshBuilder.CreateLineSystem('worldcraft-fixed-pin',{lines:[ring,[new Vector3(x,.06,z),new Vector3(x,3,z),new Vector3(x+1.5,2.5,z),new Vector3(x,2,z)]]},scene);
      marker.parent=root; marker.color=new Color3(1,.78,.27); marker.isPickable=false;
      marker.metadata={worldcraftPin:true};
    }
    if (bellRecord) {
      const brass = new StandardMaterial('worldcraft-bell-brass', scene);
      const phaseMat = new StandardMaterial('worldcraft-bell-phase-material', scene);
      ownedMaterials.push(brass, phaseMat);
      brass.diffuseColor = new Color3(.78, .58, .22);
      brass.specularColor = new Color3(.55, .42, .18);
      brass.specularPower = 48;
      phaseMat.diffuseColor = new Color3(1, .72, .28);
      phaseMat.emissiveColor = new Color3(.45, .28, .05);
      phaseMat.specularColor = new Color3(.2, .16, .08);
      const h = WORLDCRAFT_BELL.height, r = WORLDCRAFT_BELL.skirtRadius;
      const profile = [
        new Vector3(.08, h * .50, 0), new Vector3(.18, h * .40, 0), new Vector3(.24, h * .26, 0),
        new Vector3(.16, h * .08, 0), new Vector3(.32, -h * .06, 0), new Vector3(.58, -h * .30, 0),
        new Vector3(r, -h * .46, 0), new Vector3(r * .84, -h * .50, 0),
      ];
      target = MeshBuilder.CreateLathe(worldcraftTargetBody(bellRecord.id), { shape: profile, tessellation: 16, sideOrientation: 2 }, scene);
      target.parent = root; target.material = brass; target.receiveShadows = true; target.isPickable = false;
      target.metadata = { worldcraftTarget: bellRecord.id, lineFeature: { id: bellRecord.id, kind: 'worldcraft-target', label: 'BELL' } };
      meshes.push(target);
      if (shadows) { shadows.addShadowCaster(target); casters.push(target); }
      const ornament = (name, diameter, local, material) => {
        const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 8 }, scene);
        mesh.parent = target; mesh.position.copyFromFloats(...local);
        mesh.material = material; mesh.isPickable = false;
        mesh.metadata = { worldcraftBellOrnament: bellRecord.id };
        meshes.push(mesh);
      };
      ornament(`${target.name}-crown`, .22, [0, h * .50, 0], brass);
      ornament(`${target.name}-clapper`, .16, [0, -h * .18, 0], materials.machine);
      const a = bellRecord.motion.endpoints[0], b = bellRecord.motion.endpoints[1];
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const railYaw = Math.atan2(dx, dz);
      const railY = WORLDCRAFT_BELL.centerY + h / 2 + .16;
      const rail = MeshBuilder.CreateBox('worldcraft-bell-rail', { width: .14, height: .1, depth: length + .55 }, scene);
      rail.parent = root; rail.position.set((a.x + b.x) / 2, railY, (a.z + b.z) / 2); rail.rotation.y = railYaw;
      rail.material = materials.machine; rail.isPickable = false; rail.receiveShadows = true;
      rail.metadata = { worldcraftBellRail: true };
      meshes.push(rail);
      for (const [end, point] of [['a', a], ['b', b]]) {
        const cap = MeshBuilder.CreateBox(`worldcraft-bell-stop-${end}`, { width: .22, height: .28, depth: .22 }, scene);
        cap.parent = root; cap.position.set(point.x, railY + .12, point.z); cap.rotation.y = railYaw;
        cap.material = materials.machine; cap.isPickable = false; cap.metadata = { worldcraftBellRail: true };
        meshes.push(cap);
      }
      const tickCount = Math.round(length);
      for (let meters = 0; meters <= tickCount; meters++) {
        const f = length === 0 ? 0 : meters / length;
        const tick = MeshBuilder.CreateBox(`worldcraft-bell-tick-${meters}`, { width: .16, height: .22, depth: .16 }, scene);
        tick.parent = root; tick.position.set(a.x + dx * f, railY + .22, a.z + dz * f);
        tick.material = materials.machine; tick.isPickable = false; tick.metadata = { worldcraftBellTick: meters };
        meshes.push(tick);
      }
      const marker = MeshBuilder.CreateBox('worldcraft-bell-phase', { width: .14, height: 2.8, depth: .14 }, scene);
      marker.parent = root; marker.material = phaseMat; marker.isPickable = false;
      marker.metadata = { worldcraftPhaseMarker: true };
      meshes.push(marker);
      const arrow = MeshBuilder.CreateBox('worldcraft-bell-phase-direction', { width: .1, height: .1, depth: .7 }, scene);
      arrow.parent = root; arrow.material = phaseMat; arrow.isPickable = false;
      arrow.metadata = { worldcraftPhaseMarker: true };
      meshes.push(arrow);
      const placeMarker = pose => {
        marker.position.set(pose.x, 1.5, pose.z);
        const dirX = dx * pose.direction, dirZ = dz * pose.direction;
        const span = Math.hypot(dirX, dirZ) || 1;
        arrow.position.set(pose.x + dirX / span * .55, railY, pose.z + dirZ / span * .55);
        arrow.rotation.y = Math.atan2(dirX, dirZ);
      };
      const place = seconds => {
        dropBell();
        const pose = worldcraftBellPose(bellRecord, seconds);
        target.position.set(pose.x, pose.y, pose.z);
        target.rotationQuaternion = Quaternion.RotationYawPitchRoll(pose.yaw * Math.PI / 180, 0, 0);
        target.computeWorldMatrix(true);
        bellBody = new PhysicsAggregate(target, PhysicsShapeType.CONVEX_HULL, { mass: 0, restitution: WORLDCRAFT_BELL.restitution, friction: WORLDCRAFT_BELL.friction }, scene);
        bellBody.body.setMotionType(PhysicsMotionType.ANIMATED);
        bellBody.body.setLinearVelocity(Vector3.Zero());
        bellBody.body.setAngularVelocity(Vector3.Zero());
        placeMarker(pose);
      };
      const move = seconds => {
        const pose = worldcraftBellPose(bellRecord, seconds);
        bellBody.body.setTargetTransform(new Vector3(pose.x, pose.y, pose.z), Quaternion.RotationYawPitchRoll(pose.yaw * Math.PI / 180, 0, 0));
      };
      const clock = { seconds: 0 };
      place(0);
      motion.onLaunch = () => place(clock.seconds);
      motion.beforeStep = (flight, dt) => { if (flight && !flight.ended) move(clock.seconds + flight.elapsed + dt); };
      motion.onResolve = flight => {
        if (!bellBody) return;
        move(clock.seconds + flight.elapsed);
        bellBody.body.setLinearVelocity(Vector3.Zero());
        bellBody.body.setAngularVelocity(Vector3.Zero());
      };
      motion.onAction = () => place(clock.seconds);
      motion.setLaunchPhase = seconds => { clock.seconds = seconds; place(seconds); };
      motion.bellPose = () => worldcraftBellPose(bellRecord, clock.seconds);
    } else if (world.rules?.target) {
      const record = world.rules.target;
      const physics = { mass: 0, restitution: WORLDCRAFT_ORC.restitution, friction: WORLDCRAFT_ORC.friction };
      target = box(worldcraftTargetBody(record.id), { width: WORLDCRAFT_ORC.width, height: WORLDCRAFT_ORC.height, depth: WORLDCRAFT_ORC.depth }, [record.x, WORLDCRAFT_ORC.centerY, record.z], materials.block, physics, {
        worldcraftTarget: record.id,
        lineFeature: { id: record.id, kind: 'worldcraft-target', label: 'ORC' },
      }, 0, record.yaw);
      target.isPickable = false;
      // Face features are visual only. They sit on the -Z face and add no collider.
      const face = (name, size, local) => {
        const mesh = MeshBuilder.CreateBox(name, size, scene);
        mesh.parent = target; mesh.position.copyFromFloats(...local);
        mesh.material = materials.machine; mesh.isPickable = false;
        mesh.metadata = { worldcraftFace: record.id };
        meshes.push(mesh);
        return mesh;
      };
      const front = -WORLDCRAFT_ORC.depth / 2;
      face(`${target.name}-eye-l`, { width: .16, height: .16, depth: .06 }, [-.22, .48, front]);
      face(`${target.name}-eye-r`, { width: .16, height: .16, depth: .06 }, [.22, .48, front]);
      face(`${target.name}-mouth`, { width: .42, height: .1, depth: .06 }, [0, .12, front]);
    }
    return { root, meshes, bodies, objectMeshes, ground, tee, target, dispose, ...motion };
  } catch (error) { dispose(); throw error; }
}

/** Actual launch sphere against each compiled oriented box; no trajectory prediction. */
// Minimum distance from a point to a triangle (including edges and vertices).
function pointTriangleDistanceSquared(p, a, b, c) {
  const ab = b.subtract(a), ac = c.subtract(a), ap = p.subtract(a);
  const d1 = Vector3.Dot(ab, ap), d2 = Vector3.Dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return ap.lengthSquared();
  const bp = p.subtract(b), d3 = Vector3.Dot(ab, bp), d4 = Vector3.Dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return bp.lengthSquared();
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return p.subtract(a.add(ab.scale(d1 / (d1 - d3)))).lengthSquared();
  const cp = p.subtract(c), d5 = Vector3.Dot(ab, cp), d6 = Vector3.Dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return cp.lengthSquared();
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return p.subtract(a.add(ac.scale(d2 / (d2 - d6)))).lengthSquared();
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return p.subtract(b.add(c.subtract(b).scale((d4 - d3) / ((d4 - d3) + (d5 - d6))))).lengthSquared();
  const denom = 1 / (va + vb + vc), closest = a.add(ab.scale(vb * denom)).add(ac.scale(vc * denom));
  return p.subtract(closest).lengthSquared();
}

// A narrow phase for the experimental terrace prism. The rendered facets use
// their exact eight vertices, so the triangular shell is the collision hull.
// Unlike its AABB this checks faces, edges, vertices, and a point inside.
export function sphereIntersectsConvexMesh(mesh, point, radius) {
  const positions = mesh.getVerticesData('position'), indices = mesh.getIndices();
  if (!positions || !indices || positions.length < 12 || !indices.length) throw new Error('Convex clearance needs a closed mesh');
  const vertices = [];
  for (let i = 0; i < positions.length; i += 3) vertices.push(new Vector3(positions[i], positions[i + 1], positions[i + 2]));
  const centre = vertices.reduce((sum, v) => sum.addInPlace(v), Vector3.Zero()).scale(1 / vertices.length);
  let inside = true, minDistance = Infinity;
  for (let i = 0; i < indices.length; i += 3) {
    const a = vertices[indices[i]], b = vertices[indices[i + 1]], c = vertices[indices[i + 2]];
    const normal = Vector3.Cross(b.subtract(a), c.subtract(a));
    const inner = Vector3.Dot(normal, centre.subtract(a));
    const side = Vector3.Dot(normal, point.subtract(a));
    if (inner * side < -1e-9) inside = false;
    minDistance = Math.min(minDistance, pointTriangleDistanceSquared(point, a, b, c));
  }
  return inside || minDistance <= radius * radius;
}

export function worldcraftMuzzleClearance(worldScene, muzzle, radius = RAIL_RULES.projectileRadius) {
  if (![muzzle?.x,muzzle?.y,muzzle?.z,radius].every(Number.isFinite) || radius <= 0) return { ok: false, reason: 'Invalid launch position.' };
  const b = WORLDCRAFT_GROUND;
  if (muzzle.x - radius < b.minX || muzzle.x + radius > b.maxX || muzzle.z - radius < b.minZ || muzzle.z + radius > b.maxZ || muzzle.y - radius < 0) return { ok: false, reason: 'The launch sphere is outside the yard.' };
  for (const mesh of worldScene.meshes) {
    if (mesh.metadata?.worldcraftVisualOnly) continue;
    const inverse = mesh.computeWorldMatrix(true).clone().invert();
    const local = Vector3.TransformCoordinates(new Vector3(muzzle.x,muzzle.y,muzzle.z), inverse);
    const bounds = mesh.getBoundingInfo().boundingBox;
    const nearest = new Vector3(
      Math.max(bounds.minimum.x, Math.min(bounds.maximum.x, local.x)),
      Math.max(bounds.minimum.y, Math.min(bounds.maximum.y, local.y)),
      Math.max(bounds.minimum.z, Math.min(bounds.maximum.z, local.z)),
    );
    if (Vector3.DistanceSquared(local, nearest) <= (radius + .01) ** 2) {
      // Only the new experiment changes narrow-phase clearance. Historical
      // worlds keep the prior AABB behavior and reproducibility.
      if (mesh.metadata?.convexClearance && !sphereIntersectsConvexMesh(mesh, local, radius + .01)) continue;
      return { ok: false, reason: `The launch sphere overlaps ${mesh.metadata?.worldcraftId ?? 'the ground'}.` };
    }
  }
  return { ok: true };
}
