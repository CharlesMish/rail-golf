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
  RANGE_TARGETS,
  RAIL_RULES,
  REFERENCE_SHOTS,
  chargeToSpeed,
  legacyChargeToCurrent,
  classifyChallengeRuling,
  collectShotStepEvents,
  directionFromAim,
  isAceLanding,
  muzzleFromShot,
  stableUnitInterval,
  verticalRecoveryImpulse,
} from "../lib/rail-golf-v02.js";

const PHYSICS_STEP = 1 / 120;

test("authored reference shots clear the grounded Havok range", async (t) => {
  const wasmBinary = await readFile(
    new URL("../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url),
  );
  const havok = await HavokPhysics({ wasmBinary });
  const fixtures = [
    ...HOLES.map((hole) => ({ hole, addressSeconds: 0 })),
    { hole: HOLES[3], addressSeconds: 5 },
    // A neighborhood of side-face banks, not a single lucky top-edge collision.
    ...[-16, -15.5, -15].flatMap((yaw) => [0.70, 0.72, 0.73].map((charge) => ({
      hole: HOLES[1], addressSeconds: 0,
      shotOverride: { railIndex: 0, yaw, elevation: 20, charge: legacyChargeToCurrent(charge) },
    }))),
  ];

  for (const { hole, addressSeconds, shotOverride } of fixtures) {
    await t.test(`${hole.id}, ${addressSeconds}s at address${shotOverride ? `, yaw ${shotOverride.yaw}, charge ${shotOverride.charge}` : ""}`, () => {
      // Fresh worlds avoid carrying contact caches or debris transforms between
      // attempts. Updating a mesh alone does not teleport its Havok body.
      const engine = new NullEngine();
      const scene = new Scene(engine);
      const aggregates = [];
      const bricks = [];
      try {
        scene.enablePhysics(
          new Vector3(0, -RAIL_RULES.gravity, 0),
          new HavokPlugin(true, havok),
        );
        const physics = scene.getPhysicsEngine();
        assert.ok(physics);
        physics.setTimeStep(PHYSICS_STEP);
        physics.setSubTimeStep(1000 / 120);

        const addAggregate = (mesh, shape, options) => {
          const aggregate = new PhysicsAggregate(mesh, shape, options, scene);
          aggregates.push(aggregate);
          return aggregate;
        };

        // Include live support and target colliders. Without the rough ground,
        // dynamic gate bricks fall away before the projectile reaches them.
        const rough = MeshBuilder.CreateBox(
          `${hole.id}-rough`,
          { width: 64, height: 1, depth: hole.courseLength + 42 },
          scene,
        );
        rough.position.set(0, -0.5, (hole.courseLength + 8) / 2);
        addAggregate(rough, PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0.1 });

        const tee = MeshBuilder.CreateBox(
          `${hole.id}-tee`,
          { width: 13, height: 0.34, depth: 7.5 },
          scene,
        );
        tee.position.set(0, 0.16, -0.5);
        addAggregate(tee, PhysicsShapeType.BOX, { mass: 0, friction: 0.9, restitution: 0.06 });

        for (const rangeTarget of RANGE_TARGETS) {
          const active = rangeTarget.id === hole.target.id;
          const target = MeshBuilder.CreateCylinder(
            `${hole.id}-${rangeTarget.id}-target`,
            { height: active ? 0.22 : 0.16, diameter: rangeTarget.radius * 2, tessellation: 64 },
            scene,
          );
          target.position.set(rangeTarget.x, active ? 0.2 : 0.16, rangeTarget.z);
          addAggregate(target, PhysicsShapeType.CYLINDER, { mass: 0, friction: 0.74, restitution: 0.12 });
        }

        const bank = RANGE_MECHANISMS.bank;
        const bankMesh = MeshBuilder.CreateBox(
          `${hole.id}-bank-wall`,
          { width: bank.halfWidth * 2, height: bank.maxY - bank.minY, depth: bank.halfDepth * 2 },
          scene,
        );
        bankMesh.position.set(bank.x, (bank.minY + bank.maxY) / 2, bank.z);
        addAggregate(bankMesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.18, restitution: 0.86 });

        if (hole.breach) {
          for (let row = 0; row < 4; row += 1) {
            const count = row === 3 ? 3 : 4;
            for (let column = 0; column < count; column += 1) {
              const brick = MeshBuilder.CreateBox(
                `${hole.id}-brick-${row}-${column}`,
                { width: 1.04, height: 1.02, depth: 1.35 },
                scene,
              );
              const rowShift = row % 2 === 0 ? 0 : 0.48;
              brick.position.set(
                hole.breach.x - 1.65 + column * 1.08 + rowShift,
                0.54 + row * 1.04,
                hole.breach.z,
              );
              brick.rotationQuaternion = Quaternion.Identity();
              const aggregate = addAggregate(
                brick,
                PhysicsShapeType.BOX,
                { mass: 0.78, friction: 0.64, restitution: 0.14 },
              );
              bricks.push({ aggregate, mesh: brick });
            }
          }
        }

        // Match time spent adjusting aim: the gate continues settling at address.
        for (let step = 0; step < addressSeconds / PHYSICS_STEP; step += 1) {
          physics._step(PHYSICS_STEP);
        }

        const shot = shotOverride ?? REFERENCE_SHOTS[hole.id];
        const aim = directionFromAim(shot.yaw, shot.elevation);
        const muzzle = muzzleFromShot(shot);
        const projectile = MeshBuilder.CreateSphere(
          `${hole.id}-projectile`,
          { diameter: RAIL_RULES.projectileRadius * 2, segments: 12 },
          scene,
        );
        projectile.position.set(muzzle.x, muzzle.y, muzzle.z);
        const aggregate = addAggregate(
          projectile,
          PhysicsShapeType.SPHERE,
          { mass: RAIL_RULES.projectileMass, friction: 0.28, restitution: 0.38 },
        );
        const collisions = new Set();
        aggregate.body.setCollisionCallbackEnabled(true);
        aggregate.body.getCollisionObservable().add((event) => {
          const other = event.collider === aggregate.body ? event.collidedAgainst : event.collider;
          collisions.add(other.transformNode.name);
        });
        aggregate.body.applyImpulse(
          new Vector3(aim.x, aim.y, aim.z).scale(chargeToSpeed(shot.charge) * RAIL_RULES.projectileMass),
          projectile.position,
        );

        const tags = [];
        let previous = projectile.position.clone();
        let result = null;
        let supportedGateAtBreach = false;
        let bankContact = null;
        for (let step = 0; step < 13 / PHYSICS_STEP && !result; step += 1) {
          if (hole.wind.x !== 0 || hole.wind.z !== 0) {
            aggregate.body.applyForce(
              new Vector3(hole.wind.x * RAIL_RULES.projectileMass, 0, hole.wind.z * RAIL_RULES.projectileMass),
              projectile.position,
            );
          }
          // Direct fixed steps match the live 120 Hz clock without depending on
          // the scene accumulator's strict greater-than boundary.
          physics._step(PHYSICS_STEP);
          const current = projectile.position.clone();
          const events = collectShotStepEvents(previous, current, hole, tags);
          for (const event of events) {
            const point = new Vector3(event.point.x, event.point.y, event.point.z);
            if (event.kind === "wet") {
              result = { outcome: "wet", landing: event.point };
              break;
            }
            if (event.kind === "first-kiss") {
              result = {
                outcome: classifyChallengeRuling({ hole, targetHit: isAceLanding(hole, event.point), tags }),
                landing: event.point,
              };
              break;
            }
            if (event.kind === "bank") {
              bankContact = event.point;
              tags.push("bank");
            } else if (event.kind === "boost") {
              const velocity = aggregate.body.getLinearVelocity();
              if (velocity.y < 0) {
                tags.push("boost");
                aggregate.body.applyImpulse(
                  new Vector3(0, verticalRecoveryImpulse(velocity.y, 15), 4.8 * RAIL_RULES.projectileMass),
                  projectile.position,
                );
                break;
              }
            } else if (event.kind === "breach") {
              tags.push("breach");
              supportedGateAtBreach = bricks.length === 15 && bricks.every(({ mesh }) => mesh.position.y > 0.25);
              let verticalImpulse = 0;
              if (hole.breachRecoveryY !== null) {
                verticalImpulse = verticalRecoveryImpulse(aggregate.body.getLinearVelocity().y, hole.breachRecoveryY);
                if (verticalImpulse > 0) {
                  aggregate.body.applyImpulse(new Vector3(0, verticalImpulse, 0), projectile.position);
                }
              }
              for (const item of bricks) {
                const away = item.mesh.position.subtract(point);
                away.y = Math.max(0.45, away.y + 0.9);
                if (away.lengthSquared() < 0.04) away.set(0.2, 1, 0.1);
                away.normalize();
                const impulse = away.scale(1.6 + stableUnitInterval(item.mesh.name) * 1.7);
                item.aggregate.body.applyImpulse(impulse, item.mesh.absolutePosition);
              }
              if (verticalImpulse > 0) break;
            }
          }
          previous = current;
        }

        assert.ok(result, "the reference must land inside the 13-second flight clock");
        assert.equal(result.outcome, hole.requiredTags.length ? "double" : "ace", JSON.stringify(result));
        assert.deepEqual(tags, [...hole.requiredTags]);
        if (hole.id === "timber-bank") {
          assert.ok(collisions.has(`${hole.id}-bank-wall`), "the bank tag must include an actual wall collision");
          assert.ok(bankContact.y < bank.maxY - RAIL_RULES.projectileRadius,
            "the bank must strike below the top edge");
          assert.ok(bankContact.z < 44 - RAIL_RULES.projectileRadius,
            "the new line must use the wall extension toward the tee");
        }
        if (hole.id === "ruckus-line") {
          assert.ok(supportedGateAtBreach, "the full gate must still stand on the ground at breach");
          assert.ok(
            [...collisions].some((name) => name.startsWith(`${hole.id}-brick-`)),
            "Ruckus must be verified against physical crate contact, not only its trigger volume",
          );
        }
      } finally {
        for (const aggregate of aggregates) aggregate.dispose();
        scene.dispose();
        engine.dispose();
      }
    });
  }
});
