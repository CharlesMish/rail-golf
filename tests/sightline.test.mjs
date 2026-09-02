import assert from "node:assert/strict";
import test from "node:test";

import {
  HOLES,
  RANGE_MECHANISMS,
  RAIL_RULES,
  segmentAabbIntersection,
} from "../lib/rail-golf-v02.js";

// Mirrors the address-camera pose in app/manners-game.tsx without importing
// rendering code. Address visibility must follow the production defaults,
// while REFERENCE_SHOTS remain physics-only QA fixtures.
const CAMERA_BACK_DISTANCE = 15;
const CAMERA_HEIGHT_OFFSET = 7.4;
const LAUNCHER_HEIGHT = 0.4;

function horizontalAimFromYaw(yawDegrees) {
  const yaw = (yawDegrees * Math.PI) / 180;
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

function addressCameraPosition(railX, yawDegrees) {
  const aim = horizontalAimFromYaw(yawDegrees);
  return {
    x: railX - aim.x * CAMERA_BACK_DISTANCE,
    y: LAUNCHER_HEIGHT + CAMERA_HEIGHT_OFFSET,
    z: -aim.z * CAMERA_BACK_DISTANCE,
  };
}

function targetDiskCenter(target) {
  return { x: target.x, y: 0.2, z: target.z };
}

// Mirrors the active destination beacon in app/manners-game.tsx:
// destinationScale = max(1, z / 80); pinHeight = 6.4 * destinationScale;
// beacon sits at the landing disk's own z, not behind it.
function activeDestinationBeacon(target) {
  const destinationScale = Math.max(1, target.z / 80);
  const pinHeight = 6.4 * destinationScale;
  return { x: target.x, y: pinHeight, z: target.z };
}

function firstOcclusion(camera, point) {
  for (const [label, box] of Object.entries(RANGE_MECHANISMS)) {
    const t = segmentAabbIntersection(camera, point, box);
    if (t !== null) return { label, t };
  }
  return null;
}

function failuresForAddress(hole, railX) {
  const camera = addressCameraPosition(railX, hole.defaultShot.yaw);
  const failures = [];
  for (const [part, point] of [
    ["disk", targetDiskCenter(hole.target)],
    ["beacon", activeDestinationBeacon(hole.target)],
  ]) {
    const hit = firstOcclusion(camera, point);
    if (hit) {
      failures.push(
        `${hole.target.label} ${part} is blocked by ${hit.label} (t=${hit.t.toFixed(3)}) ` +
          `from rail x=${railX} at default yaw ${hole.defaultShot.yaw} (hole ${hole.id})`,
      );
    }
  }
  return failures;
}

test("every hole's default opening address has an unobstructed destination", () => {
  const failures = HOLES.flatMap((hole) =>
    failuresForAddress(hole, RAIL_RULES.railPositions[hole.defaultShot.railIndex]),
  );
  assert.deepEqual(failures, []);
});

test("every rail can see each active destination at its production default yaw", () => {
  const failures = HOLES.flatMap((hole) =>
    RAIL_RULES.railPositions.flatMap((railX) => failuresForAddress(hole, railX)),
  );
  assert.deepEqual(failures, []);
});
