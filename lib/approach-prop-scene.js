import {
  NullEngine, Scene, Vector3, Quaternion, MeshBuilder, HavokPlugin, PhysicsAggregate,
  PhysicsShapeType, PhysicsMotionType, HingeConstraint, TransformNode, StandardMaterial,
  PhysicsConstraintAxis, PhysicsConstraintAxisLimitMode, DynamicTexture,
} from '@babylonjs/core';
import { buildCourtyard } from './courtyard-scene.js';
import { COURTYARD_TARGETS } from './courtyard.js';
import { cascadeContactTag } from './lumber-cascade.js';
import { stationMuzzle, stationAim } from './stations.js';
import { RAIL_RULES, chargeToSpeed } from './rail-golf-v02.js';
import { collectDeliveryStepEvents, padImpulse } from './delivery-routes.js';
import { APPROACH_PROP as PROP, HINGE_LIMIT } from './approach-prop.js';

const DT = 1 / 120;

export function leanDir(deg) {
  const r = deg * Math.PI / 180;
  return { x: 0, y: Math.cos(r), z: -Math.sin(r) };
}

function propCenter(dir) {
  return new Vector3(
    PROP.hinge.x + dir.x * PROP.length / 2,
    PROP.hinge.y + dir.y * PROP.length / 2,
    PROP.hinge.z + dir.z * PROP.length / 2,
  );
}

function quatAlignY(dir) {
  const q = new Quaternion();
  Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(dir.x, dir.y, dir.z).normalize(), q);
  return q;
}

export function propLeanDeg(mesh) {
  mesh.computeWorldMatrix(true);
  const up = mesh.getDirection(Vector3.Up());
  return Math.atan2(-up.z, up.y) * 180 / Math.PI;
}

export function readPropPose(mesh) {
  if (!mesh) return null;
  mesh.computeWorldMatrix(true);
  const q = mesh.rotationQuaternion ?? Quaternion.Identity();
  return {
    lean: propLeanDeg(mesh),
    x: mesh.position.x,
    y: mesh.position.y,
    z: mesh.position.z,
    qx: q.x,
    qy: q.y,
    qz: q.z,
    qw: q.w,
  };
}

export function standingPose() {
  const dir = leanDir(PROP.uprightLeanDeg);
  const center = propCenter(dir);
  const q = quatAlignY(dir);
  return { lean: PROP.uprightLeanDeg, x: center.x, y: center.y, z: center.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w };
}

export function poseFromLean(deg) {
  const dir = leanDir(deg);
  const center = propCenter(dir);
  const q = quatAlignY(dir);
  return { lean: deg, x: center.x, y: center.y, z: center.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w };
}

function applyHingeLimit(hinge, scene) {
  const axis = PhysicsConstraintAxis[HINGE_LIMIT.axis];
  const mode = PhysicsConstraintAxisLimitMode.LIMITED;
  if (typeof hinge.setAxisMode === 'function') {
    hinge.setAxisMode(axis, mode);
    hinge.setAxisMinLimit(axis, HINGE_LIMIT.min);
    hinge.setAxisMaxLimit(axis, HINGE_LIMIT.max);
    return;
  }
  const plugin = scene.getPhysicsEngine().getPhysicsPlugin();
  plugin.setAxisMode(hinge, axis, mode);
  plugin.setAxisMinLimit(hinge, axis, HINGE_LIMIT.min);
  plugin.setAxisMaxLimit(hinge, axis, HINGE_LIMIT.max);
}

function addPlacard(mesh, scene) {
  const texture = new DynamicTexture('approach-prop-label', { width: 512, height: 128 }, scene, false);
  texture.hasAlpha = true;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(7,16,20,0.72)';
  ctx.fillRect(16, 16, 480, 96);
  ctx.fillStyle = '#f3d7a2';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PROP', 256, 48);
  ctx.font = '28px sans-serif';
  ctx.fillText('Staged piece', 256, 92);
  texture.update();
  const material = new StandardMaterial('approach-prop-label', scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  material.disableLighting = true;
  for (const flip of [0, Math.PI]) {
    const plane = MeshBuilder.CreatePlane('approach-prop-placard', { width: 3.4, height: 0.85 }, scene);
    plane.parent = mesh;
    plane.position.z = (flip === 0 ? 1 : -1) * (PROP.thickness / 2 + 0.04);
    plane.rotation.y = flip;
    plane.material = material;
    plane.isPickable = false;
  }
}

function addLip(scene, add) {
  const lip = PROP.lip;
  const mesh = MeshBuilder.CreateBox('approach-prop-lip', { width: lip.w, height: lip.h, depth: lip.d }, scene);
  mesh.position.set(lip.x, lip.y, lip.z);
  mesh.isVisible = false;
  return add(mesh, PhysicsShapeType.BOX, { mass: 0, restitution: lip.restitution, friction: lip.friction });
}

function addProp(scene, add, pose, { dynamic = true, placard = false, material = null, mass = PROP.mass } = {}) {
  const mesh = MeshBuilder.CreateBox('approach-prop', { width: PROP.width, height: PROP.length, depth: PROP.thickness }, scene);
  mesh.position.set(pose.x, pose.y, pose.z);
  mesh.rotationQuaternion = new Quaternion(pose.qx, pose.qy, pose.qz, pose.qw);
  mesh.computeWorldMatrix(true);
  if (material) mesh.material = material;
  const aggregate = add(mesh, PhysicsShapeType.BOX, {
    mass: dynamic ? mass : 0,
    restitution: PROP.restitution,
    friction: PROP.friction,
  });
  let hinge = null;
  let anchor = null;
  let anchorMesh = null;
  if (dynamic) {
    anchorMesh = MeshBuilder.CreateBox('approach-prop-anchor', { width: 0.4, height: 0.4, depth: 0.4 }, scene);
    anchorMesh.position.set(PROP.hinge.x, PROP.hinge.y, PROP.hinge.z);
    anchorMesh.isVisible = false;
    anchor = add(anchorMesh, PhysicsShapeType.BOX, { mass: 0, restitution: 0.05, friction: 0.9 });
    hinge = new HingeConstraint(
      new Vector3(0, 0, 0),
      new Vector3(0, -PROP.length / 2, 0),
      new Vector3(1, 0, 0),
      new Vector3(1, 0, 0),
      scene,
    );
    anchor.body.addConstraint(aggregate.body, hinge);
    aggregate.body.setAngularDamping(PROP.angularDamping);
    aggregate.body.setLinearDamping(PROP.linearDamping);
    applyHingeLimit(hinge, scene);
  } else {
    aggregate.body.setMotionType(PhysicsMotionType.STATIC);
  }
  if (placard) addPlacard(mesh, scene);
  const handle = {
    mesh,
    aggregate,
    hinge,
    anchor,
    anchorMesh,
    homePos: mesh.position.clone(),
    homeRot: mesh.rotationQuaternion.clone(),
    dynamic,
    hit: false,
  };
  return handle;
}

export function holdApproachProp(prop) {
  if (!prop || !prop.dynamic || prop.hit) return;
  prop.aggregate.body.setLinearVelocity(Vector3.Zero());
  prop.aggregate.body.setAngularVelocity(Vector3.Zero());
  prop.aggregate.body.setTargetTransform(prop.homePos, prop.homeRot);
}

function adoptProp(prop) {
  if (!prop) return null;
  prop.mesh.computeWorldMatrix(true);
  prop.homePos = prop.mesh.position.clone();
  prop.homeRot = (prop.mesh.rotationQuaternion ?? Quaternion.Identity()).clone();
  prop.hit = false;
  prop.aggregate.body.setLinearVelocity(Vector3.Zero());
  prop.aggregate.body.setAngularVelocity(Vector3.Zero());
  prop.aggregate.body.setTargetTransform(prop.homePos, prop.homeRot);
  return readPropPose(prop.mesh);
}

export function createContactBook() {
  const contacts = [];
  const seen = new Set();
  const book = {
    contacts,
    propHit: false,
    lipHit: false,
    firstGround: null,
    kicked: false,
    tags: [],
    routes: [],
    reset() {
      contacts.length = 0;
      seen.clear();
      book.propHit = false;
      book.lipHit = false;
      book.firstGround = null;
      book.kicked = false;
      book.tags = [];
      book.routes = [];
    },
    observe(event, ballBody, prop) {
      const other = event.collider === ballBody ? event.collidedAgainst : event.collider;
      const node = other?.transformNode;
      const name = node?.name ?? '';
      if (name === 'approach-prop') {
        book.propHit = true;
        if (prop) prop.hit = true;
      }
      if (name === 'approach-prop-lip') book.lipHit = true;
      const step = cascadeContactTag(node?.metadata?.cascadeStep, event.point);
      const key = step ?? (name === 'approach-prop' ? 'prop' : name === 'approach-prop-lip' ? 'lip' : null);
      if (key && !seen.has(key)) {
        seen.add(key);
        contacts.push(key);
        if (step) book.tags.push(step);
      }
    },
  };
  return book;
}

export function launchApproachBall(scene, hole, shot, onCollide) {
  const muzzle = stationMuzzle(shot, hole.station);
  const aim = stationAim(shot, hole.station);
  const mesh = MeshBuilder.CreateSphere('round', { diameter: RAIL_RULES.projectileRadius * 2, segments: 12 }, scene);
  mesh.position.set(muzzle.x, muzzle.y, muzzle.z);
  const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, {
    mass: RAIL_RULES.projectileMass,
    friction: 0.28,
    restitution: 0.38,
  }, scene);
  aggregate.body.setCollisionCallbackEnabled(true);
  const observer = aggregate.body.getCollisionObservable().add(event => onCollide(event, aggregate.body));
  const impulse = new Vector3(aim.x, aim.y, aim.z).scale(chargeToSpeed(shot.charge) * RAIL_RULES.projectileMass);
  aggregate.body.applyImpulse(impulse, mesh.position);
  return {
    mesh,
    aggregate,
    observer,
    dispose() {
      aggregate.body.getCollisionObservable().remove(observer);
      aggregate.dispose();
      mesh.dispose();
    },
  };
}

export function observeFlightStep(ball, book, hole, previous) {
  const current = { x: ball.mesh.position.x, y: ball.mesh.position.y, z: ball.mesh.position.z };
  const events = collectDeliveryStepEvents(previous, current, hole, book.tags, book.routes);
  let kick = null;
  for (const event of events) {
    if (event.kind === 'first-kiss' && !book.firstGround) {
      book.firstGround = { x: event.point.x, y: event.point.y, z: event.point.z };
    }
    if (event.kind === 'boost' && !book.kicked && ball.aggregate.body.getLinearVelocity().y < 0) {
      book.kicked = true;
      book.routes.push('skip');
      kick = padImpulse(ball.aggregate.body.getLinearVelocity(), hole);
    }
  }
  if (kick) ball.aggregate.body.applyImpulse(new Vector3(kick.x, kick.y, kick.z), ball.mesh.position);
  previous.x = current.x;
  previous.y = current.y;
  previous.z = current.z;
  return current;
}

export function flightSettled(ball, prop, steps, settledCount) {
  const velocity = ball.aggregate.body.getLinearVelocity().length();
  const spin = prop && prop.dynamic && prop.hit ? prop.aggregate.body.getAngularVelocity().length() : 0;
  const slow = velocity < 0.35 && spin < 0.08;
  const settled = slow ? settledCount + 1 : 0;
  return { settled, done: (steps > 180 && settled > 40) || steps >= 960 };
}

function dummyMaterials(scene) {
  const material = new StandardMaterial('fixture', scene);
  return Object.fromEntries(['timber', 'brick', 'machine', 'bark', 'sand', 'steel', 'amber', 'boost'].map(key => [key, material]));
}

export function mountApproachYard(scene, { hole, materials, shadows, prop = true, placard = false, root = null, initialPose = null } = {}) {
  const bodies = [];
  const yardRoot = root ?? new TransformNode(`approach-yard-${hole.id}`, scene);
  const add = (mesh, shape, options) => {
    if (!mesh.parent) mesh.parent = yardRoot;
    const aggregate = new PhysicsAggregate(mesh, shape, options, scene);
    bodies.push(aggregate);
    if (shadows && mesh.isVisible !== false) shadows.addShadowCaster(mesh);
    return aggregate;
  };
  const palette = materials ?? dummyMaterials(scene);
  const ground = MeshBuilder.CreateBox(`${hole.id}-rough`, { width: hole.courseWidth, height: 1, depth: hole.courseLength + 42 }, scene);
  ground.position.set(0, -0.5, (hole.courseLength + 8) / 2);
  ground.parent = yardRoot;
  if (palette.rough) ground.material = palette.rough;
  add(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0.1 });
  const tee = MeshBuilder.CreateBox(`${hole.id}-tee`, { width: 13, height: 0.34, depth: 7.5 }, scene);
  tee.position.set(0, 0.16, -0.5);
  tee.parent = yardRoot;
  if (palette.steel) tee.material = palette.steel;
  add(tee, PhysicsShapeType.BOX, { mass: 0, friction: 0.9, restitution: 0.06 });
  for (const target of COURTYARD_TARGETS) {
    const active = target.id === hole.target.id;
    const mesh = MeshBuilder.CreateCylinder(target.id, { height: active ? 0.22 : 0.16, diameter: target.radius * 2, tessellation: 24 }, scene);
    mesh.position.set(target.x, active ? 0.2 : 0.16, target.z);
    mesh.parent = yardRoot;
    add(mesh, PhysicsShapeType.CYLINDER, { mass: 0, friction: 0.74, restitution: 0.12 });
  }
  buildCourtyard(scene, yardRoot, palette, shadows ?? { addShadowCaster() {} }, body => bodies.push(body), hole);
  let handle = null;
  const lumber = hole.station?.id === 'lumber';
  const wantProp = Boolean(prop) && lumber;
  const dynamicProp = prop !== 'static';
  if (wantProp) {
    handle = addProp(scene, add, initialPose ?? standingPose(), { dynamic: dynamicProp, placard, material: palette.timber, mass: PROP.mass });
    addLip(scene, add);
  }
  const yard = {
    root: yardRoot,
    bodies,
    hole,
    get prop() { return handle; },
    holdIfSleeping() { holdApproachProp(handle); },
    pose() { return handle ? readPropPose(handle.mesh) : null; },
    lean() { return handle ? propLeanDeg(handle.mesh) : null; },
    adopt() { return adoptProp(handle); },
    preview(pose) {
      if (!handle || !pose) return;
      handle.hit = true;
      handle.mesh.position.set(pose.x, pose.y, pose.z);
      handle.mesh.rotationQuaternion = new Quaternion(pose.qx, pose.qy, pose.qz, pose.qw);
      handle.mesh.computeWorldMatrix(true);
      const pos = handle.mesh.position.clone();
      const rot = handle.mesh.rotationQuaternion.clone();
      handle.aggregate.body.setLinearVelocity(Vector3.Zero());
      handle.aggregate.body.setAngularVelocity(Vector3.Zero());
      handle.aggregate.body.setTargetTransform(pos, rot);
    },
    place(pose, { rebuild = true } = {}) {
      if (!wantProp) return null;
      const next = pose === 'standing' || !pose ? standingPose() : pose;
      if (!rebuild && handle) {
        handle.mesh.position.set(next.x, next.y, next.z);
        handle.mesh.rotationQuaternion = new Quaternion(next.qx, next.qy, next.qz, next.qw);
        handle.mesh.computeWorldMatrix(true);
        return adoptProp(handle);
      }
      if (handle) {
        handle.aggregate.dispose();
        handle.anchor?.dispose();
        handle.mesh.dispose();
        handle.anchorMesh?.dispose();
        handle = null;
      }
      handle = addProp(scene, add, next, { dynamic: true, placard, material: palette.timber, mass: PROP.mass });
      return readPropPose(handle.mesh);
    },
    dispose() {
      for (const body of bodies) {
        try { body.dispose(); } catch { /* already released */ }
      }
      bodies.length = 0;
      yardRoot.dispose(false, true);
      handle = null;
    },
  };
  return yard;
}

function enablePhysics(scene, havok) {
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(DT);
  physics.setSubTimeStep(1000 / 120);
  return physics;
}

function freshWorld(havok, hole, { prop = 'dynamic', lean = null, placard = false } = {}) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const physics = enablePhysics(scene, havok);
  const mode = prop === 'none' ? false : prop === 'static' ? 'static' : true;
  const initialPose = mode === 'static' && lean != null ? poseFromLean(lean) : null;
  const yard = mountApproachYard(scene, { hole, prop: mode, placard, initialPose });
  if (mode === 'static' && yard.prop) yard.prop.hit = true;
  return {
    engine, scene, physics, yard,
    dispose() {
      yard.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}

function stepLoop(world, hole, shot, { hold = true, tailSteps = 0, recordEvery = 0 } = {}) {
  const { yard, physics } = world;
  const prop = yard.prop;
  const book = createContactBook();
  if (prop) prop.hit = hold ? false : true;
  const ball = launchApproachBall(world.scene, hole, shot, (event, body) => book.observe(event, body, prop));
  let leanMin = prop ? propLeanDeg(prop.mesh) : null;
  let leanMax = leanMin;
  let settled = 0;
  let steps = 0;
  const previous = { x: ball.mesh.position.x, y: ball.mesh.position.y, z: ball.mesh.position.z };
  const samples = [];
  const sample = () => {
    if (!recordEvery || steps % recordEvery !== 0) return;
    const pose = prop ? readPropPose(prop.mesh) : null;
    samples.push({
      t: steps / 120,
      ball: [ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z],
      pose,
    });
  };
  sample();
  for (let i = 0; i < 960; i++) {
    if (hold) yard.holdIfSleeping();
    physics._step(DT);
    steps = i + 1;
    if (prop) {
      const lean = propLeanDeg(prop.mesh);
      if (lean < leanMin) leanMin = lean;
      if (lean > leanMax) leanMax = lean;
    }
    observeFlightStep(ball, book, hole, previous);
    sample();
    const state = flightSettled(ball, prop, steps, settled);
    settled = state.settled;
    if (state.done) break;
  }
  const leanAtRest = prop ? propLeanDeg(prop.mesh) : null;
  let leanTail = leanAtRest;
  for (let i = 0; i < tailSteps; i++) {
    physics._step(DT);
    if (prop) leanTail = propLeanDeg(prop.mesh);
  }
  const result = {
    terminal: { x: ball.mesh.position.x, y: ball.mesh.position.y, z: ball.mesh.position.z },
    contacts: [...book.contacts],
    propHit: book.propHit,
    lipHit: book.lipHit,
    kicked: book.kicked,
    firstGround: book.firstGround,
    leanMin, leanMax,
    leanEnd: leanAtRest,
    leanTail,
    stepA: book.contacts.includes('step-a'),
    stepB: book.contacts.includes('step-b'),
    stepC: book.contacts.includes('step-c'),
    steps,
    pose: prop ? readPropPose(prop.mesh) : null,
    samples,
  };
  ball.dispose();
  return result;
}

export function runApproachShot(havok, hole, shot, options = {}) {
  const prop = options.prop ?? 'dynamic';
  const world = freshWorld(havok, hole, { prop: prop === 'none' ? 'none' : prop === 'static' ? 'static' : 'dynamic', lean: options.lean ?? null });
  try {
    return stepLoop(world, hole, shot, {
      hold: prop === 'dynamic' && options.hold !== false,
      tailSteps: options.tailSteps ?? 0,
      recordEvery: options.recordEvery ?? 0,
    });
  } finally {
    world.dispose();
  }
}

export function runApproachPair(havok, hole, first, second, options = {}) {
  const world = freshWorld(havok, hole, { prop: 'dynamic' });
  try {
    const opening = stepLoop(world, hole, first, { hold: true, recordEvery: options.recordEvery ?? 0 });
    const follow = stepLoop(world, hole, second, { hold: false, recordEvery: options.recordEvery ?? 0 });
    return { opening, follow };
  } finally {
    world.dispose();
  }
}

export function idleLean(havok, hole, { hold = false, steps = 360 } = {}) {
  const world = freshWorld(havok, hole, { prop: 'dynamic' });
  try {
    for (let i = 0; i < steps; i++) {
      if (hold) world.yard.holdIfSleeping();
      world.physics._step(DT);
    }
    return propLeanDeg(world.yard.prop.mesh);
  } finally {
    world.dispose();
  }
}
