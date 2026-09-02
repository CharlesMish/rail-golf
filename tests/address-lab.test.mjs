import assert from "node:assert/strict";
import test from "node:test";

import {
  ADDRESS_LAB_ADDRESSES,
  ADDRESS_LAB_HOLE_ID,
  ADDRESS_LAB_MODES,
  ADDRESS_LAB_QUERY_KEY,
  HOLES,
  REFERENCE_SHOTS,
  addressLabChipLabel,
  parseAddressLabMode,
  resolveAddressLabFromSearch,
  resolveOpeningAddress,
  resolveSessionStartHoleIndex,
  simulateShot,
} from "../lib/rail-golf-v02.js";

const TIMBER_BANK = HOLES.find((hole) => hole.id === ADDRESS_LAB_HOLE_ID);
if (!TIMBER_BANK) throw new Error("expected timber-bank in HOLES");

function snapshotCourseTruth() {
  return {
    holes: structuredClone(HOLES),
    defaults: HOLES.map((hole) => structuredClone(hole.defaultShot)),
    references: structuredClone(REFERENCE_SHOTS),
  };
}

test("address lab query key and modes are the bounded opt-in table", () => {
  assert.equal(ADDRESS_LAB_QUERY_KEY, "addressLab");
  assert.equal(ADDRESS_LAB_HOLE_ID, "timber-bank");
  assert.deepEqual([...ADDRESS_LAB_MODES], ["gifted", "near", "neutral"]);
  assert.ok(TIMBER_BANK);
});

test("absent and invalid queries fail closed and preserve existing openings", () => {
  for (const search of [
    null,
    undefined,
    "",
    "?",
    "?foo=bar",
    "?addressLab",
    "?addressLab=",
    "?addressLab=GIFTED",
    "?addressLab=gifted ",
    "?addressLab= gifted",
    "?addressLab=gifted-extra",
    "?addressLab=nearer",
    "?addressLab=neutral%20",
    "?AddressLab=gifted",
    "?addressLab=gifted&addressLab=near",
    { addressLab: "NEAR" },
    { addressLab: 0 },
  ]) {
    assert.equal(resolveAddressLabFromSearch(search), null, `expected fail-closed for ${String(search)}`);
    assert.equal(parseAddressLabMode(search), null);
    assert.equal(addressLabChipLabel(search), null);
  }

  const resumeIndex = 2;
  assert.equal(resolveSessionStartHoleIndex(null, resumeIndex), resumeIndex);
  assert.equal(resolveSessionStartHoleIndex("invalid", resumeIndex), resumeIndex);

  for (const hole of HOLES) {
    assert.equal(resolveOpeningAddress(hole, null), hole.defaultShot);
    assert.equal(resolveOpeningAddress(hole, "GIFTED"), hole.defaultShot);
    assert.equal(resolveOpeningAddress(hole, "gifted-extra"), hole.defaultShot);
  }
});

test("valid queries resolve only the three published modes", () => {
  assert.equal(resolveAddressLabFromSearch("?addressLab=gifted"), "gifted");
  assert.equal(resolveAddressLabFromSearch("addressLab=near"), "near");
  assert.equal(resolveAddressLabFromSearch(new URLSearchParams("addressLab=neutral")), "neutral");
  assert.equal(resolveAddressLabFromSearch({ addressLab: "near" }), "near");
  assert.equal(resolveAddressLabFromSearch("http://localhost:3000/?addressLab=gifted&x=1"), "gifted");
  assert.equal(parseAddressLabMode("gifted"), "gifted");
  assert.equal(parseAddressLabMode("near"), "near");
  assert.equal(parseAddressLabMode("neutral"), "neutral");
});

test("only Timber Bank is affected by a valid lab mode", () => {
  for (const mode of ADDRESS_LAB_MODES) {
    for (const hole of HOLES) {
      const resolved = resolveOpeningAddress(hole, mode);
      if (hole.id === ADDRESS_LAB_HOLE_ID) {
        assert.deepEqual(resolved, ADDRESS_LAB_ADDRESSES[mode]);
      } else {
        assert.equal(resolved, hole.defaultShot);
      }
    }
  }
});

test("the three Timber Bank lab poses match the authored table exactly", () => {
  assert.deepEqual(resolveOpeningAddress(TIMBER_BANK, "gifted"), { railIndex: 2, yaw: -14.7, elevation: 36 });
  assert.deepEqual(resolveOpeningAddress(TIMBER_BANK, "near"), { railIndex: 2, yaw: -10, elevation: 32 });
  assert.deepEqual(resolveOpeningAddress(TIMBER_BANK, "neutral"), { railIndex: 1, yaw: 0, elevation: 28 });
  assert.deepEqual(ADDRESS_LAB_ADDRESSES.gifted, { railIndex: 2, yaw: -14.7, elevation: 36 });
  assert.deepEqual(ADDRESS_LAB_ADDRESSES.near, { railIndex: 2, yaw: -10, elevation: 32 });
  assert.deepEqual(ADDRESS_LAB_ADDRESSES.neutral, { railIndex: 1, yaw: 0, elevation: 28 });
});

test("a valid lab session starts on Timber Bank without using saved resume", () => {
  assert.equal(resolveSessionStartHoleIndex("gifted", 0), 1);
  assert.equal(resolveSessionStartHoleIndex("near", 3), 1);
  assert.equal(resolveSessionStartHoleIndex("neutral", 2), 1);
  assert.equal(HOLES[resolveSessionStartHoleIndex("near", 0)].id, "timber-bank");
});

test("lab chips are diagnostic labels and absent when the query is invalid", () => {
  assert.equal(addressLabChipLabel("gifted"), "ADDRESS LAB · GIFTED");
  assert.equal(addressLabChipLabel("near"), "ADDRESS LAB · NEAR");
  assert.equal(addressLabChipLabel("neutral"), "ADDRESS LAB · NEUTRAL");
  assert.equal(addressLabChipLabel(null), null);
  assert.equal(addressLabChipLabel("Lodge Face"), null);
});

test("restore-memory precedence remains intact over the lab pose", () => {
  const memory = Object.freeze({ railIndex: 0, yaw: 5, elevation: 40 });
  assert.deepEqual(
    resolveOpeningAddress(TIMBER_BANK, "near", { restore: true, memory }),
    memory,
  );
  assert.deepEqual(
    resolveOpeningAddress(TIMBER_BANK, "near", { restore: false, memory }),
    ADDRESS_LAB_ADDRESSES.near,
  );
  assert.deepEqual(
    resolveOpeningAddress(TIMBER_BANK, "near", { restore: true, memory: null }),
    ADDRESS_LAB_ADDRESSES.near,
  );
  assert.equal(
    resolveOpeningAddress(HOLES[0], "near", { restore: true, memory }),
    memory,
  );
  assert.equal(
    resolveOpeningAddress(HOLES[0], "near", { restore: false, memory }),
    HOLES[0].defaultShot,
  );
});

test("lab resolution does not mutate frozen hole or reference data", () => {
  const before = snapshotCourseTruth();
  resolveAddressLabFromSearch("?addressLab=neutral");
  resolveOpeningAddress(TIMBER_BANK, "neutral");
  resolveOpeningAddress(HOLES[0], "gifted");
  resolveSessionStartHoleIndex("near", 3);
  addressLabChipLabel("gifted");
  const after = snapshotCourseTruth();

  assert.deepEqual(after, before);
  assert.ok(Object.isFrozen(HOLES));
  assert.ok(Object.isFrozen(TIMBER_BANK.defaultShot));
  assert.ok(Object.isFrozen(REFERENCE_SHOTS));
  assert.ok(Object.isFrozen(REFERENCE_SHOTS["timber-bank"]));
  assert.deepEqual(TIMBER_BANK.defaultShot, { railIndex: 2, yaw: -14.7, elevation: 36 });
  assert.throws(() => {
    TIMBER_BANK.defaultShot.yaw = 0;
  });
  assert.throws(() => {
    REFERENCE_SHOTS["timber-bank"].charge = 1;
  });
});

test("existing QA reference shots still pass after the lab resolver is present", () => {
  assert.equal(simulateShot(HOLES[0], REFERENCE_SHOTS["open-seat"], 1 / 120).outcome, "ace");
  const ruckus = simulateShot(HOLES[3], REFERENCE_SHOTS["ruckus-line"], 1 / 120);
  assert.equal(ruckus.breached, true);
  assert.equal(ruckus.outcome, "double");
  assert.equal(REFERENCE_SHOTS["timber-bank"].railIndex, 2);
  assert.equal(REFERENCE_SHOTS["hot-skip"].elevation, 64);
});
