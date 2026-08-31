import assert from "node:assert/strict";
import test from "node:test";

import {
  HOLES,
  RANGE_MECHANISMS,
  RANGE_TARGETS,
  RAIL_RULES,
  REFERENCE_SHOTS,
  addressCameraFrame,
  classifyChallengeRuling,
  landingIntersection,
  mergeHoleRecord,
  normalizeHoleRecord,
  segmentAabbIntersection,
  segmentSphereAabbIntersection,
  simulateShot,
  stableUnitInterval,
  tagsMeetChallenge,
  verticalRecoveryImpulse,
} from "../lib/rail-golf-v02.js";

test("the product is one mechanism range with four visible target cards", () => {
  assert.deepEqual(HOLES.map((hole) => hole.id), ["open-seat", "timber-bank", "hot-skip", "ruckus-line"]);
  assert.equal(RANGE_TARGETS.length, 4);
  assert.ok(HOLES.every((hole) => hole.courseLength === 132));
  assert.ok(HOLES.every((hole) => hole.breach === RANGE_MECHANISMS.breach));
});

test("AMBER ROOST stays in the readable portrait address frame from every rail", () => {
  const target = RANGE_TARGETS.find((item) => item.id === "amber");
  assert.ok(target);

  const aspect = 390 / 844;
  const horizontalFov = 0.92;
  const horizontalScale = Math.tan(horizontalFov / 2);
  const verticalScale = horizontalScale / aspect;
  const failures = [];

  for (const railX of RAIL_RULES.railPositions) {
    const frame = addressCameraFrame({
      railX,
      yawDegrees: -14.7,
      target,
      portrait: true,
    });
    const camera = frame.position;
    const lookAt = frame.target;
    const forward = {
      x: lookAt.x - camera.x,
      y: lookAt.y - camera.y,
      z: lookAt.z - camera.z,
    };
    const forwardLength = Math.hypot(forward.x, forward.y, forward.z);
    forward.x /= forwardLength;
    forward.y /= forwardLength;
    forward.z /= forwardLength;
    const right = { x: forward.z, z: -forward.x };
    const rightLength = Math.hypot(right.x, right.z);
    right.x /= rightLength;
    right.z /= rightLength;
    const up = {
      x: -right.z * forward.y,
      y: right.z * forward.x - right.x * forward.z,
      z: right.x * forward.y,
    };
    const offset = { x: target.x - camera.x, y: 0.36 - camera.y, z: target.z - camera.z };
    const depth = offset.x * forward.x + offset.y * forward.y + offset.z * forward.z;
    const screenX = 0.5 + (offset.x * right.x + offset.z * right.z) / (depth * horizontalScale) / 2;
    const screenY = 0.5 - (offset.x * up.x + offset.y * up.y + offset.z * up.z) / (depth * verticalScale) / 2;

    if (!(screenX >= 0.38 && screenX <= 0.62 && screenY >= 0.2 && screenY <= 0.8)) {
      failures.push(
        `rail ${railX}: (${screenX.toFixed(3)}, ${screenY.toFixed(3)})`,
      );
    }
  }

  assert.deepEqual(
    failures,
    [],
    `AMBER ROOST is outside the portrait center frame from these rails: ${failures.join("; ")}`,
  );
});

test("each authored trick asks for a distinct readable mechanism", () => {
  assert.deepEqual(HOLES[0].requiredTags, []);
  assert.deepEqual(HOLES[1].requiredTags, ["bank"]);
  assert.deepEqual(HOLES[2].requiredTags, ["boost"]);
  assert.deepEqual(HOLES[3].requiredTags, ["breach"]);
  assert.equal(HOLES[3].breachRecoveryY, 8);
  assert.equal(tagsMeetChallenge(HOLES[1], ["bank"]), true);
  assert.equal(tagsMeetChallenge(HOLES[1], ["boost"]), false);
});

test("swept AABB detection catches thin mechanisms between physics samples", () => {
  const box = { x: 0, z: 10, halfWidth: 2, halfDepth: 0.4, minY: 0, maxY: 5 };
  assert.notEqual(segmentAabbIntersection({ x: 0, y: 2, z: 9 }, { x: 0, y: 2, z: 11 }, box), null);
  assert.equal(segmentAabbIntersection({ x: 3, y: 2, z: 9 }, { x: 3, y: 2, z: 11 }, box), null);
});

test("swept sphere contact registers at a solid face before its center enters", () => {
  const bank = RANGE_MECHANISMS.bank;
  const face = bank.x + bank.halfWidth;
  const stoppedCenter = face + RAIL_RULES.projectileRadius;
  assert.equal(
    segmentAabbIntersection(
      { x: stoppedCenter + 0.1, y: 2, z: bank.z },
      { x: stoppedCenter, y: 2, z: bank.z },
      bank,
    ),
    null,
  );
  assert.notEqual(
    segmentSphereAabbIntersection(
      { x: stoppedCenter + 0.1, y: 2, z: bank.z },
      { x: stoppedCenter, y: 2, z: bank.z },
      bank,
    ),
    null,
  );
});

test("swept sphere contact does not promote an expanded-box corner near miss", () => {
  const box = { x: 0, z: 0, halfWidth: 1, halfDepth: 1, minY: 0, maxY: 2 };
  const radius = 0.5;
  assert.equal(
    segmentSphereAabbIntersection(
      { x: 2, y: 1, z: 2 },
      { x: 1 + radius, y: 1, z: 1 + radius },
      box,
      radius,
    ),
    null,
  );
});

test("theatre impulses have stable per-prop magnitudes", () => {
  const first = stableUnitInterval("ruckus-line-brick-2-1");
  assert.equal(first, stableUnitInterval("ruckus-line-brick-2-1"));
  assert.notEqual(first, stableUnitInterval("ruckus-line-brick-2-2"));
  assert.ok(first >= 0 && first <= 1);
});

test("the Ruckus gate restores vertical velocity without accelerating an already-rising rail", () => {
  assert.equal(verticalRecoveryImpulse(-10, 8), 27);
  assert.equal(verticalRecoveryImpulse(9, 8), 0);
});

test("the authored direct and Ruckus reference lines retain their rulings", () => {
  assert.equal(simulateShot(HOLES[0], REFERENCE_SHOTS["open-seat"], 1 / 120).outcome, "ace");
  const ruckus = simulateShot(HOLES[3], REFERENCE_SHOTS["ruckus-line"], 1 / 120);
  assert.equal(ruckus.breached, true);
  assert.equal(ruckus.outcome, "double");
});

test("every mechanism card defaults to its verified reference aim", () => {
  for (const hole of HOLES) {
    const reference = REFERENCE_SHOTS[hole.id];
    assert.ok(reference);
    assert.deepEqual(hole.defaultShot, {
      railIndex: reference.railIndex,
      yaw: reference.yaw,
      elevation: reference.elevation,
    });
  }
});

test("landing authority remains a descending first-contact crossing", () => {
  assert.equal(landingIntersection({ x: 0, y: 4, z: 40 }, { x: 0, y: 3, z: 50 }), null);
  const landing = landingIntersection({ x: 0, y: 1.2, z: 47 }, { x: 0, y: 0.7, z: 49 });
  assert.ok(landing);
  assert.equal(landing.y, RAIL_RULES.landingHeight);
});

test("a target alone is recorded, while target plus required mechanism earns the stamp", () => {
  const bank = HOLES[1];
  assert.equal(classifyChallengeRuling({ hole: bank, targetHit: true, tags: [] }), "ace");
  assert.equal(classifyChallengeRuling({ hole: bank, targetHit: true, tags: ["bank"] }), "double");
  assert.equal(classifyChallengeRuling({ hole: bank, targetHit: false, tags: ["bank"] }), "breach");
});

test("stamps are single-shot results rather than collected mechanism and target flags", () => {
  let record = mergeHoleRecord(undefined, "ace");
  record = mergeHoleRecord(record, "breach");
  assert.equal(record.perfect, false);
  record = mergeHoleRecord(record, "double");
  assert.equal(record.perfect, true);
  assert.equal(record.bestOutcome, "double");
});

test("mechanism-only shots remain useful evidence without clearing the target", () => {
  let record = mergeHoleRecord(undefined, "breach");
  assert.equal(record.hasBreach, true);
  assert.equal(record.cleared, false);
  assert.equal(record.bestOutcome, "breach");

  record = mergeHoleRecord(record, "ace");
  assert.equal(record.cleared, true);
  assert.equal(record.bestOutcome, "ace");
});

test("stored progress is normalized into a consistent single-stroke record", () => {
  assert.equal(normalizeHoleRecord(null), null);
  assert.deepEqual(
    normalizeHoleRecord({
      attempts: 3.8,
      bestOutcome: "breach",
      hasAce: false,
      hasBreach: true,
      perfect: false,
      cleared: true,
    }),
    {
      attempts: 3,
      bestOutcome: "breach",
      hasAce: false,
      hasBreach: true,
      perfect: false,
      cleared: false,
    },
  );
});
