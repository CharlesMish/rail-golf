import assert from "node:assert/strict";
import test from "node:test";
import { HOLES, RAIL_RULES, chargeFromHold, collectShotStepEvents } from "../lib/rail-golf-v02.js";

test("release power uses the input timestamp even between display frames", () => {
  const releasedAt = 325.5;
  assert.equal(chargeFromHold(releasedAt), 0.21);
  for (const hz of [30, 60, 144]) {
    const lastFrame = Math.floor(releasedAt / (1000 / hz)) * (1000 / hz);
    assert.ok(chargeFromHold(lastFrame) < chargeFromHold(releasedAt));
  }
  assert.equal(chargeFromHold(-1), 0);
  assert.equal(chargeFromHold(RAIL_RULES.chargeSeconds * 1000 + 100), 1);
});

test("first kiss before the pad cannot be rescued by a later boost in the same step", () => {
  const events = collectShotStepEvents(
    { x: -3.8, y: 1, z: 56.75 },
    { x: -3.8, y: 0.8, z: 56.95 }, HOLES[2],
  );
  assert.deepEqual(events.map((event) => event.kind), ["first-kiss", "boost"]);
  assert.ok(Math.abs(events[0].amount - 0.4) < 1e-10);
});

test("a pad reached before ground offers a relaunch before the old segment's landing", () => {
  const events = collectShotStepEvents(
    { x: -3.8, y: 2, z: 62 }, { x: -3.8, y: 0.7, z: 62.3 }, HOLES[2],
  );
  assert.deepEqual(events.map((event) => event.kind), ["boost", "first-kiss"]);
  assert.deepEqual(collectShotStepEvents(
    { x: -3.8, y: 2, z: 62 }, { x: -3.8, y: 0.7, z: 62.3 }, HOLES[2], ["boost"],
  ).map((event) => event.kind), ["first-kiss"]);
});

test("ascending pad flyovers do not boost; water beats a later mechanism", () => {
  assert.deepEqual(collectShotStepEvents(
    { x: -3.8, y: 1, z: 62 }, { x: -3.8, y: 2, z: 62.2 }, HOLES[2],
  ), []);
  const hole = { ...HOLES[2], water: { x: -3.8, z: 54, halfWidth: 5, halfDepth: 1, minY: 0, maxY: 3 } };
  const events = collectShotStepEvents({ x: -3.8, y: 2, z: 52 }, { x: -3.8, y: 1, z: 62 }, hole);
  assert.equal(events[0].kind, "wet");
  assert.ok(events.some((event) => event.kind === "boost"));
});
