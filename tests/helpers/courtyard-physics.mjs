import { NullEngine, Scene, Vector3, MeshBuilder, HavokPlugin, PhysicsAggregate, PhysicsShapeType, TransformNode, StandardMaterial } from '@babylonjs/core';
import { buildCourtyard } from '../../lib/courtyard-scene.js';
import { COURTYARD_TARGETS } from '../../lib/courtyard.js';
import { RAIL_RULES, muzzleFromShot, directionFromAim, chargeToSpeed, collectShotStepEvents, classifyChallengeRuling, isAceLanding } from '../../lib/rail-golf-v02.js';
export function courtyardShot(havok, hole, shot) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const bodies = [];
  try {
    scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
    const physics = scene.getPhysicsEngine();
    physics.setTimeStep(1 / 120);
    physics.setSubTimeStep(1000 / 120);
    const add = (mesh, shape, options) => {
      const aggregate = new PhysicsAggregate(mesh, shape, options, scene);
      bodies.push(aggregate); return aggregate;
    };
    const ground = MeshBuilder.CreateBox('ground', { width: hole.courseWidth, height: 1, depth: hole.courseLength + 42 }, scene);
    ground.position.set(0, -.5, (hole.courseLength + 8) / 2);
    add(ground, PhysicsShapeType.BOX, { mass: 0, restitution: .1, friction: .8 });
    for (const target of COURTYARD_TARGETS) {
      const active = target.id === hole.target.id;
      const mesh = MeshBuilder.CreateCylinder(target.id, { height: active ? .22 : .16, diameter: target.radius * 2, tessellation: 64 }, scene);
      mesh.position.set(target.x, active ? .2 : .16, target.z);
      add(mesh, PhysicsShapeType.CYLINDER, { mass: 0, friction: .74, restitution: .12 });
    }
    const material = new StandardMaterial('fixture', scene);
    const materials = Object.fromEntries(['timber','brick','machine','bark','sand','steel','amber'].map(k => [k, material]));
    buildCourtyard(scene, new TransformNode('yard', scene), materials, { addShadowCaster() {} }, b => bodies.push(b), hole);
    const muzzle = muzzleFromShot(shot), aim = directionFromAim(shot.yaw, shot.elevation);
    const ball = MeshBuilder.CreateSphere('round', { diameter: RAIL_RULES.projectileRadius * 2 }, scene);
    ball.position.set(muzzle.x, muzzle.y, muzzle.z);
    const body = add(ball, PhysicsShapeType.SPHERE, { mass: 1.5, friction: .28, restitution: .38 });
    const collisions = [];
    body.body.setCollisionCallbackEnabled(true);
    body.body.getCollisionObservable().add(e => {
      const other = e.collider === body.body ? e.collidedAgainst : e.collider;
      if (!collisions.includes(other.transformNode.name)) collisions.push(other.transformNode.name);
    });
    body.body.applyImpulse(new Vector3(aim.x, aim.y, aim.z).scale(chargeToSpeed(shot.charge) * 1.5), ball.position);
    let previous = ball.position.clone();
    const tags = [], contacts = [];
    for (let i = 0; i < 1560; i++) {
      physics._step(1 / 120);
      for (const e of collectShotStepEvents(previous, ball.position, hole, tags)) {
        if (e.kind === 'first-kiss') return { point: e.point, tags, contacts, collisions, outcome: classifyChallengeRuling({ hole, targetHit: isAceLanding(hole, e.point), tags }) };
        tags.push(e.kind); contacts.push(e);
      }
      previous.copyFrom(ball.position);
    }
    return { point: { ...ball.position }, tags, contacts, collisions, outcome: 'timeout' };
  } finally { for (const b of bodies) b.dispose(); scene.dispose(); engine.dispose(); }
}
