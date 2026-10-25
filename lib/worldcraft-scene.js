import { Color3, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Quaternion, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { attachClockworkFigure } from './worldcraft-clockwork.js';
import { WORLDCRAFT_BELL, WORLDCRAFT_CATALOG, WORLDCRAFT_ORC, validateWorld, worldcraftBellPose, worldcraftBellTarget, worldcraftClockworkTarget, worldcraftTargetBody } from './worldcraft-model.js';
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
  let disposed = false, bellBody = null, clockBody = null, ownedMaterials = [];
  const dropBell = () => { const body = bellBody; bellBody = null; body?.dispose(); };
  const setClockBody = body => {
    if (clockBody && clockBody !== body) clockBody.dispose();
    clockBody = body;
  };
  const dispose = () => {
    if (disposed) return; disposed = true;
    dropBell();
    setClockBody(null);
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
    const tee = box('worldcraft-tee', { width: 24, height: .3, depth: 8 }, [0,.15,-1], materials.machine, WORLDCRAFT_CONTACTS.ground, { rangeGround: true });
    // Canonical ID order keeps shape insertion and contact evidence stable after JSON reload.
    for (const record of [...world.objects].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
      const prefab = WORLDCRAFT_CATALOG[record.kind];
      const mesh = box(`worldcraft-object-${record.id}`, { width: prefab.width, height: prefab.height, depth: prefab.depth }, [record.x,prefab.centerY,record.z], paint(record), WORLDCRAFT_CONTACTS[record.kind], {
        worldcraftId: record.id,
        lineFeature: { id: record.id, kind: `worldcraft-${record.kind}`, label: `${record.kind.toUpperCase()} REBOUND` },
      }, prefab.pitch ?? 0, record.yaw);
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
    } else if (worldcraftClockworkTarget(world)) {
      const built = attachClockworkFigure(scene, world, {
        root, meshes, materials, shadows, casters, ownedMaterials,
        setBody: setClockBody,
        body: () => clockBody,
      });
      target = built.target;
      delete built.target;
      Object.assign(motion, built);
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
