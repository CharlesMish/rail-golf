import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import HavokPhysics from "@babylonjs/havok";
import {
  HavokPlugin,
  MeshBuilder,
  NullEngine,
  PhysicsAggregate,
  PhysicsShapeType,
  Quaternion,
  Scene,
  Vector3,
} from "@babylonjs/core";

import {
  HOLES,
  RANGE_MECHANISMS,
  RAIL_RULES,
  REFERENCE_SHOTS,
  chargeToSpeed,
  classifyChallengeRuling,
  directionFromAim,
  isAceLanding,
  landingIntersection,
  muzzleFromShot,
  pointOnSegment,
  segmentSphereAabbIntersection,
  verticalRecoveryImpulse,
} from "../lib/rail-golf-v02.js";

const PHYSICS_STEP = 1 / 120;

test("all four REFERENCE_SHOTS remain reachable and clear their intended cards in Havok", async () => {
  const wasmBinary = await readFile(
    new URL("../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url),
  );
  const havok = await HavokPhysics({ wasmBinary });
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(
    new Vector3(0, -RAIL_RULES.gravity, 0),
    new HavokPlugin(true, havok),
  );
  const physics = scene.getPhysicsEngine();
  assert.ok(physics);
  physics.setTimeStep(PHYSICS_STEP);
  physics.setSubTimeStep(1000 / 120);

  const bank = RANGE_MECHANISMS.bank;
  const bankMesh = MeshBuilder.CreateBox(
    "verified-bank",
    {
      width: bank.halfWidth * 2,
      height: bank.maxY - bank.minY,
      depth: bank.halfDepth * 2,
    },
    scene,
  );
  bankMesh.position.set(
    bank.x,
    bank.minY + (bank.maxY - bank.minY) / 2,
    bank.z,
  );
  const bankAggregate = new PhysicsAggregate(
    bankMesh,
    PhysicsShapeType.BOX,
    { mass: 0, friction: 0.18, restitution: 0.86 },
    scene,
  );

  // Match the live breach gate's dynamic brick grid, so Ruckus is tested
  // against physical colliders rather than only the trigger-volume tag.
  const breach = RANGE_MECHANISMS.breach;
  const brickAggregates = [];
  for (let row = 0; row < 4; row += 1) {
    const count = row === 3 ? 3 : 4;
    for (let column = 0; column < count; column += 1) {
      const brick = MeshBuilder.CreateBox(
        `verified-brick-${row}-${column}`,
        { width: 1.04, height: 1.02, depth: 1.35 },
        scene,
      );
      const rowShift = row % 2 === 0 ? 0 : 0.48;
      const initialPosition = new Vector3(
        breach.x - 1.65 + column * 1.08 + rowShift,
        0.54 + row * 1.04,
        breach.z,
      );
      brick.position.copyFrom(initialPosition);
      brick.rotationQuaternion = Quaternion.Identity();
      const aggregate = new PhysicsAggregate(
        brick,
        PhysicsShapeType.BOX,
        { mass: 0.78, friction: 0.64, restitution: 0.14 },
        scene,
      );
      brickAggregates.push({ aggregate, mesh: brick, initialPosition });
    }
  }

  const resetBricks = () => {
    for (const item of brickAggregates) {
      item.mesh.position.copyFrom(item.initialPosition);
      item.mesh.rotationQuaternion = Quaternion.Identity();
      item.aggregate.body.setLinearVelocity(Vector3.Zero());
      item.aggregate.body.setAngularVelocity(Vector3.Zero());
    }
  };

  const runReference = (hole) => {
    const shot = REFERENCE_SHOTS[hole.id];
    const direction = directionFromAim(shot.yaw, shot.elevation);
    const muzzle = muzzleFromShot(shot);
    const projectile = MeshBuilder.CreateSphere(
      `verified-${hole.id}`,
      { diameter: RAIL_RULES.projectileRadius * 2, segments: 12 },
      scene,
    );
    projectile.position.set(muzzle.x, muzzle.y, muzzle.z);
    const aggregate = new PhysicsAggregate(
      projectile,
      PhysicsShapeType.SPHERE,
      {
        mass: RAIL_RULES.projectileMass,
        friction: 0.28,
        restitution: 0.38,
      },
      scene,
    );
    aggregate.body.applyImpulse(
      new Vector3(direction.x, direction.y, direction.z).scale(
        chargeToSpeed(shot.charge) * RAIL_RULES.projectileMass,
      ),
      projectile.position,
    );

    const tags = [];
    let previous = projectile.position.clone();
    try {
      for (let step = 0; step < 13 * 120; step += 1) {
        // The public scene accumulator uses a strict boundary; direct fixed stepping
        // keeps the regression deterministic and matches the game's 120 Hz clock.
        physics._step(PHYSICS_STEP);

        const current = projectile.position.clone();
        const start = { x: previous.x, y: previous.y, z: previous.z };
        const end = { x: current.x, y: current.y, z: current.z };
        let boostedThisStep = false;

        if (
          !tags.includes("bank") &&
          segmentSphereAabbIntersection(start, end, RANGE_MECHANISMS.bank) !== null
        ) {
          tags.push("bank");
        }

        if (!tags.includes("boost")) {
          const amount = segmentSphereAabbIntersection(
            start,
            end,
            RANGE_MECHANISMS.boost,
          );
          const velocity = aggregate.body.getLinearVelocity();
          if (amount !== null && velocity.y < 0) {
            tags.push("boost");
            aggregate.body.applyImpulse(
              new Vector3(
                0,
                Math.max(0, 15 - velocity.y) * RAIL_RULES.projectileMass,
                4.8 * RAIL_RULES.projectileMass,
              ),
              projectile.position,
            );
            boostedThisStep = true;
          }
        }

        if (!tags.includes("breach") && hole.breach) {
          const amount = segmentSphereAabbIntersection(start, end, hole.breach);
          if (amount !== null) {
            tags.push("breach");
            const point = pointOnSegment(start, end, amount);
            if (hole.breachRecoveryY !== null) {
              const velocity = aggregate.body.getLinearVelocity();
              const verticalImpulse = verticalRecoveryImpulse(velocity.y, hole.breachRecoveryY);
              if (verticalImpulse > 0) {
                aggregate.body.applyImpulse(new Vector3(0, verticalImpulse, 0), projectile.position);
                boostedThisStep = true;
              }
            }
            for (const item of brickAggregates) {
              const away = item.mesh.position.subtract(new Vector3(point.x, point.y, point.z));
              away.y = Math.max(0.45, away.y + 0.9);
              if (away.lengthSquared() < 0.04) away.set(0.2, 1, 0.1);
              away.normalize();
              item.aggregate.body.applyImpulse(away.scale(1.6), item.mesh.absolutePosition);
            }
          }
        }

        if (!boostedThisStep) {
          const landing = landingIntersection(start, end);
          if (landing) {
            return {
              outcome: classifyChallengeRuling({
                hole,
                targetHit: isAceLanding(hole, landing),
                tags,
              }),
              tags,
              landing,
            };
          }
        }
        previous = current;
      }
      throw new Error(`${hole.id} did not land within the authored flight clock`);
    } finally {
      aggregate.dispose();
      projectile.dispose();
    }
  };

  try {
    const openSeatResult = runReference(HOLES[0]);
    assert.equal(openSeatResult.outcome, "ace");
    assert.deepEqual(openSeatResult.tags, []);
    resetBricks();

    const bankResult = runReference(HOLES[1]);
    assert.equal(bankResult.outcome, "double");
    assert.deepEqual(bankResult.tags, ["bank"]);
    resetBricks();

    const skipResult = runReference(HOLES[2]);
    assert.equal(skipResult.outcome, "double");
    assert.deepEqual(skipResult.tags, ["boost"]);
    resetBricks();

    const ruckusResult = runReference(HOLES[3]);
    assert.equal(ruckusResult.outcome, "double");
    assert.deepEqual(ruckusResult.tags, ["breach"]);
  } finally {
    bankAggregate.dispose();
    bankMesh.dispose();
    for (const item of brickAggregates) {
      item.aggregate.dispose();
      item.mesh.dispose();
    }
    scene.dispose();
    engine.dispose();
  }
});
