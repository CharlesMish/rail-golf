import { Color3, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Quaternion, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';

// Clockwork Gallery figure. A turntable circle, not the travelling bell's shuttle.
// The collider is a kinematic box: Havok ANIMATED plus setTargetTransform, the same
// driver as the bell. Collider yaw stays constant (the catalog uses 0). Position is
// a pure function of release phase plus flight seconds. The head's outward turn,
// the wobble, and the hearts are meshes with no aggregate. They never write
// friction, restitution, velocity, or the target transform.

export const WORLDCRAFT_CLOCKWORK = Object.freeze({
  width: 0.9,
  depth: 0.7,
  height: 2.2,
  centerY: 1.35,
});

const fail = message => { throw Error(message); };
const own = (value, key) => Object.hasOwn(value, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function exact(value, keys, label) {
  if (!plain(value)) fail(`${label}: unsupported or missing fields`);
  const names = Object.keys(value);
  if (!keys.every(key => own(value, key)) || names.some(key => !keys.includes(key))) fail(`${label}: unsupported or missing fields`);
}
function finite(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) fail(`${label}: expected ${min} to ${max}`);
  return Object.is(value, -0) ? 0 : value;
}
function step(value, unit, label) {
  if (Math.abs(value / unit - Math.round(value / unit)) > 1e-8) fail(`${label}: use ${unit} increments`);
  return Object.is(value, -0) ? 0 : value;
}
function identifier(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) fail(`${label}: invalid identifier`);
  return value;
}

export function worldcraftClockworkTarget(world) {
  const target = world?.rules?.target;
  return target?.motion?.kind === 'turntable' ? target : null;
}

/**
 * Turntable. phaseReference near-point: t = 0 sits on the point closest to the tee
 * (center, minus radius on Z). Constant arc speed, one revolution per period,
 * counterclockwise when seen from above. The collider yaw is the stored offset,
 * not the travel heading. Idle time is not included; the caller passes launch
 * phase plus flight seconds.
 */
export function worldcraftClockworkPose(target, seconds) {
  const motion = target.motion;
  const period = motion.period;
  let u = seconds % period;
  if (u < 0) u += period;
  if (Object.is(u, -0) || u === period) u = 0;
  const theta = (u / period) * Math.PI * 2;
  const x = motion.center.x + motion.radius * Math.sin(theta);
  const z = motion.center.z - motion.radius * Math.cos(theta);
  const arcSpeed = 2 * Math.PI * motion.radius / period;
  let heading = 'coming back, from the left';
  if (u <= 1e-9 || period - u <= 1e-9) heading = 'near point, face toward the tee';
  else if (Math.abs(u - period / 2) <= 1e-9) heading = 'far point, face away from the tee';
  else if (u < period / 2) heading = 'going out, to the right';
  // Outward facing for the head ornament only. atan2(-sin θ, cos θ) points local -Z away from the center.
  const facing = Math.atan2(-Math.sin(theta), Math.cos(theta)) * 180 / Math.PI;
  return {
    x, y: motion.collider.centerY, z, yaw: target.yaw, facing, theta, period, u,
    radius: motion.radius, arcSpeed, around: u * arcSpeed, degrees: theta * 180 / Math.PI,
    heading, direction: 1,
  };
}

export function validateTurntableMotion(value, block) {
  exact(value, ['kind', 'phaseReference', 'center', 'radius', 'period', 'collider', 'hit'], 'Turntable');
  if (value.kind !== 'turntable') fail('Turntable kind must be turntable');
  if (value.phaseReference !== 'near-point') fail('Turntable phase reference must be near-point');
  if (value.hit !== 'any-contact-before-ledger-close') fail('Turntable hit must be any-contact-before-ledger-close');
  exact(value.center, ['x', 'z'], 'Turntable center');
  const center = {
    x: step(finite(value.center.x, -30, 30, 'Turntable center x'), .5, 'Turntable center x'),
    z: step(finite(value.center.z, 10, 96, 'Turntable center z'), .5, 'Turntable center z'),
  };
  const radius = step(finite(value.radius, 1.5, 4, 'Turntable radius'), .5, 'Turntable radius');
  const period = step(finite(value.period, 4, 12, 'Turntable period'), .5, 'Turntable period');
  const arcSpeed = 2 * Math.PI * radius / period;
  if (arcSpeed < .25 || arcSpeed > 2) fail('Turntable arc speed must be 0.25–2 m/s');
  exact(value.collider, ['shape', 'width', 'depth', 'height', 'centerY', 'friction', 'restitution'], 'Turntable collider');
  const collider = value.collider;
  if (collider.shape !== 'box') fail('The clockwork figure collider is the fixed box');
  const expected = {
    shape: 'box',
    width: WORLDCRAFT_CLOCKWORK.width,
    depth: WORLDCRAFT_CLOCKWORK.depth,
    height: WORLDCRAFT_CLOCKWORK.height,
    centerY: WORLDCRAFT_CLOCKWORK.centerY,
    friction: block.friction,
    restitution: block.restitution,
  };
  for (const key of Object.keys(expected)) if (collider[key] !== expected[key]) fail('The clockwork figure collider is the fixed box');
  return { kind: 'turntable', phaseReference: 'near-point', center, radius, period, collider: { ...expected }, hit: 'any-contact-before-ledger-close' };
}

export function validateClockworkTarget(value, objects, block) {
  exact(value, ['id', 'yaw', 'motion'], 'Clockwork figure');
  const id = identifier(value.id, 'Figure id');
  if (id !== 'figure') fail('Clockwork figure id must be figure');
  if (objects.some(object => object.id === id)) fail('Target id collides with a piece id');
  const yaw = step(finite(value.yaw, -180, 175, 'Figure yaw'), 5, 'Figure yaw');
  return { id, yaw, motion: validateTurntableMotion(value.motion, block) };
}

const HEART_LIFE = 1.8;

/** Visual turntable, wooden figure, and a comic reaction. The box aggregate is the only new body. */
export function attachClockworkFigure(scene, world, host) {
  const record = worldcraftClockworkTarget(world);
  if (!record) return null;
  const { root, meshes, materials, shadows, casters, ownedMaterials, setBody } = host;
  const wood = new StandardMaterial('worldcraft-clockwork-wood', scene);
  const phaseMat = new StandardMaterial('worldcraft-clockwork-phase', scene);
  const heartMat = new StandardMaterial('worldcraft-clockwork-heart', scene);
  ownedMaterials.push(wood, phaseMat, heartMat);
  wood.diffuseColor = new Color3(.72, .48, .28);
  wood.specularColor = new Color3(.08, .05, .03);
  phaseMat.diffuseColor = new Color3(1, .72, .28);
  phaseMat.emissiveColor = new Color3(.45, .28, .05);
  heartMat.diffuseColor = new Color3(.86, .22, .34);
  heartMat.emissiveColor = new Color3(.42, .08, .12);
  const figure = WORLDCRAFT_CLOCKWORK;
  const target = MeshBuilder.CreateBox('worldcraft-target-figure', { width: figure.width, height: figure.height, depth: figure.depth }, scene);
  target.parent = root;
  target.material = materials.timber ?? materials.block;
  target.isPickable = false;
  target.receiveShadows = true;
  target.metadata = { worldcraftTarget: record.id, lineFeature: { id: record.id, kind: 'worldcraft-target', label: 'FIGURE' } };
  meshes.push(target);
  if (shadows) { shadows.addShadowCaster(target); casters.push(target); }
  const head = MeshBuilder.CreateSphere('worldcraft-clockwork-head', { diameter: .5, segments: 10 }, scene);
  head.parent = target;
  // Sit on the box. The collider stays the box; the head is an ornament with no body.
  head.position.set(0, figure.height / 2 + .16, 0);
  head.material = wood;
  head.isPickable = false;
  head.metadata = { worldcraftClockworkOrnament: true };
  meshes.push(head);
  const ornament = (name, size, local, material) => {
    const mesh = MeshBuilder.CreateBox(name, size, scene);
    mesh.parent = head;
    mesh.position.copyFromFloats(...local);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.metadata = { worldcraftClockworkOrnament: true };
    meshes.push(mesh);
    return mesh;
  };
  const eye = .1;
  ornament('worldcraft-clockwork-eye-l', { width: eye, height: eye, depth: .05 }, [-.12, .06, -.26], materials.machine);
  ornament('worldcraft-clockwork-eye-r', { width: eye, height: eye, depth: .05 }, [.12, .06, -.26], materials.machine);
  ornament('worldcraft-clockwork-smile', { width: .2, height: .05, depth: .05 }, [0, -.08, -.26], heartMat);
  const center = record.motion.center;
  const deckRadius = record.motion.radius + .55;
  const deck = MeshBuilder.CreateCylinder('worldcraft-clockwork-deck', { diameter: deckRadius * 2, height: .12, tessellation: 32 }, scene);
  deck.parent = root;
  deck.position.set(center.x, .08, center.z);
  deck.material = materials.machine;
  deck.isPickable = false;
  deck.metadata = { worldcraftClockworkDeck: true };
  meshes.push(deck);
  const pegs = 12;
  for (let i = 0; i < pegs; i++) {
    const angle = i / pegs * Math.PI * 2;
    const peg = MeshBuilder.CreateBox(`worldcraft-clockwork-peg-${i}`, { width: .12, height: .22, depth: .12 }, scene);
    peg.parent = root;
    peg.position.set(center.x + Math.sin(angle) * deckRadius, .22, center.z - Math.cos(angle) * deckRadius);
    peg.material = materials.block ?? materials.machine;
    peg.isPickable = false;
    peg.metadata = { worldcraftClockworkDeck: true };
    meshes.push(peg);
  }
  const marker = MeshBuilder.CreateBox('worldcraft-clockwork-phase', { width: .14, height: 2.8, depth: .14 }, scene);
  marker.parent = root;
  marker.material = phaseMat;
  marker.isPickable = false;
  marker.metadata = { worldcraftPhaseMarker: true };
  meshes.push(marker);
  const clock = { seconds: 0 };
  let wobble = 0;
  let queued = false;
  let hearts = [];
  const forgetMesh = mesh => {
    const index = meshes.indexOf(mesh);
    if (index >= 0) meshes.splice(index, 1);
  };
  const clearHearts = () => {
    const facing = head.rotation.y;
    for (const heart of hearts) {
      for (const mesh of heart.node.getChildMeshes(false)) forgetMesh(mesh);
      heart.node.parent = null;
      heart.node.dispose(false, false);
    }
    hearts = [];
    wobble = 0;
    head.rotation.set(0, facing, 0);
  };
  const poseBody = seconds => {
    const pose = worldcraftClockworkPose(record, seconds);
    target.rotationQuaternion = Quaternion.RotationYawPitchRoll(pose.yaw * Math.PI / 180, 0, 0);
    target.position.set(pose.x, pose.y, pose.z);
    target.computeWorldMatrix(true);
    head.rotation.y = pose.facing * Math.PI / 180;
    return pose;
  };
  const place = seconds => {
    clearHearts();
    setBody(null);
    const pose = poseBody(seconds);
    const body = new PhysicsAggregate(target, PhysicsShapeType.BOX, {
      mass: 0,
      restitution: record.motion.collider.restitution,
      friction: record.motion.collider.friction,
    }, scene);
    body.body.setMotionType(PhysicsMotionType.ANIMATED);
    body.body.setLinearVelocity(Vector3.Zero());
    body.body.setAngularVelocity(Vector3.Zero());
    setBody(body);
    marker.position.set(pose.x, 1.5, pose.z);
    return body;
  };
  const move = seconds => {
    const pose = worldcraftClockworkPose(record, seconds);
    const body = host.body();
    body.body.setTargetTransform(new Vector3(pose.x, pose.y, pose.z), Quaternion.RotationYawPitchRoll(pose.yaw * Math.PI / 180, 0, 0));
    head.rotation.y = pose.facing * Math.PI / 180;
  };
  const spawnHearts = () => {
    clearHearts();
    wobble = .7;
    head.computeWorldMatrix(true);
    const origin = head.getAbsolutePosition();
    for (let i = 0; i < 5; i++) {
      const node = new TransformNode(`worldcraft-clockwork-heart-${i}`, scene);
      node.parent = root;
      node.position.set(origin.x + (i - 2) * .12, origin.y + .2, origin.z);
      const left = MeshBuilder.CreateSphere(`worldcraft-clockwork-heart-${i}-l`, { diameter: .16, segments: 6 }, scene);
      const right = MeshBuilder.CreateSphere(`worldcraft-clockwork-heart-${i}-r`, { diameter: .16, segments: 6 }, scene);
      const point = MeshBuilder.CreateBox(`worldcraft-clockwork-heart-${i}-p`, { width: .16, height: .16, depth: .1 }, scene);
      for (const mesh of [left, right, point]) {
        mesh.parent = node;
        mesh.material = heartMat;
        mesh.isPickable = false;
        mesh.metadata = { worldcraftClockworkHeart: true };
        meshes.push(mesh);
      }
      left.position.set(-.06, .04, 0);
      right.position.set(.06, .04, 0);
      point.position.set(0, -.05, 0);
      point.rotation.z = Math.PI / 4;
      hearts.push({ node, age: 0, vx: (i - 2) * .45, vy: 1.5 + (i % 2) * .25, vz: (i % 2 === 0 ? -.15 : .15) });
    }
  };
  const tick = dt => {
    if (queued) { queued = false; spawnHearts(); }
    if (wobble > 0) {
      const elapsed = .7 - wobble;
      wobble = Math.max(0, wobble - dt);
      const fade = wobble / .7;
      head.rotation.z = Math.sin(elapsed * 28 + .6) * .35 * fade;
      head.rotation.x = Math.sin(elapsed * 18 + .4) * .12 * fade;
    } else if (head.rotation.z !== 0 || head.rotation.x !== 0) {
      head.rotation.z = 0;
      head.rotation.x = 0;
    }
    const live = [];
    for (const heart of hearts) {
      heart.age += dt;
      if (heart.age >= HEART_LIFE) {
        for (const mesh of heart.node.getChildMeshes(false)) forgetMesh(mesh);
        heart.node.parent = null;
        heart.node.dispose(false, false);
        continue;
      }
      heart.node.position.x += heart.vx * dt;
      heart.node.position.y += heart.vy * dt;
      heart.node.position.z += heart.vz * dt;
      heart.vy -= .4 * dt;
      const scale = .55 + .7 * (1 - heart.age / HEART_LIFE);
      heart.node.scaling.setAll(scale);
      live.push(heart);
    }
    hearts = live;
  };
  place(0);
  return {
    target,
    onLaunch() { place(clock.seconds); },
    beforeStep(flight, dt) { if (flight && !flight.ended) move(clock.seconds + flight.elapsed + dt); },
    afterStep(_flight, dt) { tick(dt); },
    beforeIdleStep(dt) { tick(dt); },
    onResolve(flight) {
      const body = host.body();
      if (!body) return;
      move(clock.seconds + flight.elapsed);
      body.body.setLinearVelocity(Vector3.Zero());
      body.body.setAngularVelocity(Vector3.Zero());
    },
    onAction() { place(clock.seconds); },
    setLaunchPhase(seconds) { clock.seconds = seconds; place(seconds); },
    queueComicHit() { queued = true; },
    clockworkPose() { return worldcraftClockworkPose(record, clock.seconds); },
  };
}
