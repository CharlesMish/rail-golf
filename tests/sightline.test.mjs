import assert from "node:assert/strict";
import test from "node:test";

import {
  HOLES,
  RANGE_MECHANISMS,
  RAIL_RULES,
  REFERENCE_SHOTS,
  segmentAabbIntersection,
} from "../lib/rail-golf-v02.js";

// Mirrors the address-camera pose computed in app/manners-game.tsx so this
// test exercises the exact geometry a player sees, without importing any
// camera/rendering code. Camera is not the variable under test here: the
// position/lookAt formula below must stay byte-for-byte identical to the
// game's `addressPosition` / `addressTarget` derivation. See the comment
// beside `desiredCameraPosition` in app/manners-game.tsx.
const CAMERA_BACK_DISTANCE = 15;
const CAMERA_HEIGHT_OFFSET = 7.4;
const LAUNCHER_HEIGHT = 0.4;

function horizontalAimFromYaw(yawDegrees) {
  const yaw = (yawDegrees * Math.PI) / 180;
  return { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
}

function addressCameraPosition(railX, yawDegrees) {
  const aim = horizontalAimFromYaw(yawDegrees);
  return {
    x: railX - aim.x * CAMERA_BACK_DISTANCE,
    y: LAUNCHER_HEIGHT + CAMERA_HEIGHT_OFFSET,
    z: 0 - aim.z * CAMERA_BACK_DISTANCE,
  };
}

// The rendered card for a hole's own (active) target: a low ground disk plus
// a tall pin/beacon a couple of meters behind it. Both are authored in
// app/manners-game.tsx's `RANGE_TARGETS` render loop; a card is only really
// "visible" if both the footprint and the flag read clearly.
function targetDiskCenter(target) {
  return { x: target.x, y: 0.2, z: target.z };
}

function targetPinBeacon(target) {
  return { x: target.x, y: 6.45, z: target.z + 1.25 };
}

function occluders() {
  return Object.entries(RANGE_MECHANISMS);
}

function firstOcclusion(camera, point) {
  for (const [label, box] of occluders()) {
    const t = segmentAabbIntersection(camera, point, box);
    if (t !== null) return { label, t };
  }
  return null;
}

test("every rail has a clear sightline to every target's own reference aim", () => {
  const failures = [];

  for (const hole of HOLES) {
    const yaw = REFERENCE_SHOTS[hole.id].yaw;
    assert.equal(yaw, hole.defaultShot.yaw, `${hole.id} default yaw must match its reference shot`);

    for (const railX of RAIL_RULES.railPositions) {
      const camera = addressCameraPosition(railX, yaw);

      const diskHit = firstOcclusion(camera, targetDiskCenter(hole.target));
      if (diskHit) {
        failures.push(
          `${hole.target.label} disk is blocked by ${diskHit.label} (t=${diskHit.t.toFixed(3)}) ` +
            `from rail x=${railX} at yaw ${yaw} (hole ${hole.id})`,
        );
      }

      const pinHit = firstOcclusion(camera, targetPinBeacon(hole.target));
      if (pinHit) {
        failures.push(
          `${hole.target.label} pin/beacon is blocked by ${pinHit.label} (t=${pinHit.t.toFixed(3)}) ` +
            `from rail x=${railX} at yaw ${yaw} (hole ${hole.id})`,
        );
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("no rail's sightline to any target is blocked by any mechanism, regardless of which hole is active", () => {
  // Broader than the reference-aim check above: every target must read clearly
  // from every rail using every hole's authored yaw, not just its own. This
  // is what "rail switching is not a visual no-op" means in practice - a
  // player can flick through rails on any hole and every card stays visible.
  const failures = [];

  for (const hole of HOLES) {
    const yaw = REFERENCE_SHOTS[hole.id].yaw;
    for (const railX of RAIL_RULES.railPositions) {
      const camera = addressCameraPosition(railX, yaw);
      for (const target of HOLES.map((other) => other.target)) {
        const diskHit = firstOcclusion(camera, targetDiskCenter(target));
        if (diskHit) {
          failures.push(
            `${target.label} disk blocked by ${diskHit.label} while aiming ${hole.id}'s yaw ${yaw} from rail x=${railX}`,
          );
        }
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("the breach gate's own hole (Ruckus Line) can still see its far target through the gate footprint", () => {
  // The gate is an intentional obstacle for the ball, but the camera must
  // still see past it to FAR BELL - the "punch through, then continue"
  // read depends on the target being visible beyond the gate.
  const hole = HOLES.find((candidate) => candidate.id === "ruckus-line");
  const yaw = REFERENCE_SHOTS[hole.id].yaw;
  for (const railX of RAIL_RULES.railPositions) {
    const camera = addressCameraPosition(railX, yaw);
    assert.equal(firstOcclusion(camera, targetDiskCenter(hole.target)), null);
  }
});
