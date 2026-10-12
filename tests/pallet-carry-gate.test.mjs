import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {scoreLine} from '../lib/line-score.js';
import {sequenceLine} from '../lib/yard-place.js';
import {orderedContacts} from '../lib/pallet-carry.js';

const hv = await Havok({wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))});

const SETUPS = {
  switchGate: {railIndex: 1, yaw: -48.1, elevation: 20, charge: 0.67, originX: 0},
  palletGate: {railIndex: 1, yaw: -38, elevation: 24, charge: 0.5, originX: 0},
  palletLumber: {railIndex: 1, yaw: 23, elevation: 20, charge: 0.75, originX: 0},
  straight: {railIndex: 1, yaw: 0, elevation: 28, charge: 0.55, originX: 0},
};
// Auxiliary probes. They are not replacements for the frozen setups above.
const ONCE = {railIndex: 1, yaw: -46, elevation: 22, charge: 0.55, originX: 1};
const SCRAPE = {railIndex: 1, yaw: -42, elevation: 16, charge: 0.7, originX: 0};

function digest(result) {
  const receipt = scoreLine(result.ledger);
  return {
    outcome: result.outcome,
    end: result.end,
    point: result.point ?? null,
    contactKinds: result.contacts.map(contact => contact.kind),
    contactPoints: result.contacts.map(contact => ({kind: contact.kind, x: contact.point?.x ?? null, z: contact.point?.z ?? null})),
    rejected: result.ledger.filter(event => event.kind === 'rejected').map(event => event.reason),
    ordered: orderedContacts(result.ledger),
    sequence: sequenceLine(result.ledger),
    labels: result.ledger.filter(event => event.kind === 'redirect').map(event => event.label),
    claims: receipt.claimIds,
    total: receipt.total,
    switchUse: result.ledger.filter(event => event.kind === 'switch-use').length,
    floorContactsOnLaunchBody: result.floorContactsOnLaunchBody ?? null,
    carry: result.carry ?? null,
  };
}

function horiz(a, b) {
  if (!a?.point || !b?.point) return Infinity;
  return Math.hypot(a.point[0] - b.point[0], a.point[2] - b.point[2]);
}

function spread(rows) {
  return rows.slice(1).reduce((max, row) => Math.max(max, horiz(rows[0], row)), 0);
}

function sameShot(left, right) {
  assert.equal(left.outcome, right.outcome);
  assert.deepEqual(left.contactKinds, right.contactKinds);
  assert.deepEqual(left.ordered, right.ordered);
  assert.equal(left.sequence, right.sequence);
  assert.deepEqual(left.labels, right.labels);
  assert.deepEqual(left.claims, right.claims);
  assert.equal(left.switchUse, right.switchUse);
  assert.equal(left.total, right.total);
  assert.ok(horiz(left, right) <= 0.01, `horizontal ${horiz(left, right)}`);
}

function series(station, state, shot, times, options) {
  const harness = diverterHarness(hv, state, true, selectOpenLineStation(station), {scoreLab: true, linecraft: true});
  try {
    const rows = [];
    for (let i = 0; i < times; i++) {
      harness.action('recall', {floor: state});
      rows.push(digest(harness.shoot(shot, options)));
    }
    return rows;
  } finally {
    harness.dispose();
  }
}

function round(point) {
  return point ? [Number(point[0].toFixed(2)), Number(point[2].toFixed(2))] : null;
}

const measured = {};
for (const [name, station] of [['palletGate', 'gate'], ['palletLumber', 'lumber']]) {
  measured[name] = {};
  for (const state of ['A', 'B']) {
    const off = series(station, state, SETUPS[name], 3, {traceFloor: true});
    const on = series(station, state, SETUPS[name], 3, {carryLock: true});
    measured[name][state] = {
      off: off.map(row => ({outcome: row.outcome, point: round(row.point), contacts: row.contactKinds, labels: row.labels, claims: row.claims, total: row.total, end: row.end})),
      onEnd: on.map(row => row.end),
      onPath: on.map(row => row.carry?.path ?? null),
      spreadOff: spread(off),
      spreadOn: spread(on),
      causeGap: horiz(off[0], on[0]),
      stateGap: null,
      rows: {off, on},
    };
  }
  measured[name].consequence = horiz(measured[name].A.rows.off[0], measured[name].B.rows.off[0]);
}
measured.straight = {};
for (const state of ['A', 'B']) measured.straight[state] = series('gate', state, SETUPS.straight, 3, {traceFloor: true});
measured.switch = {};
for (const state of ['A', 'B']) {
  measured.switch[state] = series('gate', state, SETUPS.switchGate, 3, {stopOnSwitch: true, traceFloor: true});
  measured.switch[state + 'Cause'] = series('gate', state, SETUPS.switchGate, 1, {stopOnSwitch: true, carryLock: true});
}
measured.once = series('gate', 'A', ONCE, 1, {carryLock: true})[0];
measured.scrape = series('gate', 'A', SCRAPE, 1, {carryLock: true})[0];

const report = {
  palletGate: {A: measured.palletGate.A.off[0], B: measured.palletGate.B.off[0], consequence: measured.palletGate.consequence, causeGapA: measured.palletGate.A.causeGap, causeGapB: measured.palletGate.B.causeGap},
  palletLumber: {A: measured.palletLumber.A.off[0], B: measured.palletLumber.B.off[0], consequence: measured.palletLumber.consequence, causeGapA: measured.palletLumber.A.causeGap, causeGapB: measured.palletLumber.B.causeGap},
  straight: {A: {outcome: measured.straight.A[0].outcome, point: round(measured.straight.A[0].point), contacts: measured.straight.A[0].contactKinds}, B: {outcome: measured.straight.B[0].outcome, point: round(measured.straight.B[0].point), contacts: measured.straight.B[0].contactKinds}, gap: horiz(measured.straight.A[0], measured.straight.B[0])},
  switch: {A: {end: measured.switch.A[0].end, contacts: measured.switch.A[0].contactKinds, claims: measured.switch.A[0].claims}, B: {end: measured.switch.B[0].end, contacts: measured.switch.B[0].contactKinds, claims: measured.switch.B[0].claims}},
  once: {end: measured.once.end, path: measured.once.carry?.path, contacts: measured.once.contactKinds, labels: measured.once.labels, rejected: measured.once.rejected, applied: measured.once.carry?.flipEvents?.filter(event => event.applied).length ?? 0, switchUse: measured.once.switchUse},
  scrape: {end: measured.scrape.end, path: measured.scrape.carry?.path, contacts: measured.scrape.contactKinds, rejected: measured.scrape.rejected, labels: measured.scrape.labels},
};
mkdirSync('/opt/cursor/artifacts', {recursive: true});
writeFileSync('/opt/cursor/artifacts/e7-gate-numbers.json', JSON.stringify(report, null, 2));

test('causing shots match with the rebound cause on and off, in A and in B', () => {
  for (const name of ['palletGate', 'palletLumber']) {
    for (const state of ['A', 'B']) {
      const {off, on} = measured[name][state].rows;
      const hitSwitch = off.some(row => row.switchUse > 0 || row.contactKinds.some(kind => kind.startsWith('switch-')) || row.ordered.some(contact => contact.body === 'kicker-switch'));
      assert.equal(hitSwitch, false, `${name} launched in ${state} hits the switch plate. The frozen setup was not replaced. Rats are not launched.`);
      for (const row of [...off, ...on]) {
        assert.deepEqual(row.labels, off[0].labels);
        assert.equal(row.outcome, off[0].outcome);
        assert.equal(row.switchUse, 0);
        assert.equal(row.claims.includes('switch'), false);
        assert.equal(row.floorContactsOnLaunchBody, true);
        for (const kind of row.contactKinds) if (kind.startsWith('floor-')) assert.equal(kind, 'floor-' + state.toLowerCase());
      }
      for (const row of on) sameShot(off[0], row);
      for (const row of off) sameShot(off[0], row);
      assert.ok(measured[name][state].spreadOff <= 0.01);
      assert.ok(measured[name][state].spreadOn <= 0.01);
      assert.ok(on.every(row => row.end === (state === 'A' ? 'B' : 'A')));
      assert.ok(on.every(row => row.carry.path === 'pallet' && row.carry.flipEvents.filter(event => event.applied).length === 1));
      assert.ok(off.every(row => row.end === state));
    }
  }
});

test('pallet state B moves both stations by at least the 2.5 m place band, and a straight shot does not leak', () => {
  assert.ok(measured.palletGate.consequence >= 2.5, `palletGate ${measured.palletGate.consequence}`);
  assert.ok(measured.palletLumber.consequence >= 2.5, `palletLumber ${measured.palletLumber.consequence}`);
  for (const row of [...measured.straight.A, ...measured.straight.B]) {
    assert.equal(row.switchUse, 0);
    assert.equal(row.labels.some(label => /kicker pallet/i.test(label)), false);
  }
  for (const row of measured.straight.B) sameShot(measured.straight.A[0], row);
  assert.ok(spread(measured.straight.A) <= 0.01);
  assert.ok(spread(measured.straight.B) <= 0.01);
});

test('the switch plate still flips once, and a qualifying plate hit does not flip twice', () => {
  for (const state of ['A', 'B']) {
    const opposite = state === 'A' ? 'B' : 'A';
    for (const row of measured.switch[state]) {
      assert.equal(row.end, opposite);
      assert.equal(row.switchUse, 1);
      assert.equal(row.claims.filter(id => id === 'switch').length, 1);
      assert.equal(row.labels.some(label => /kicker pallet/i.test(label)), false);
      assert.ok(row.contactKinds.includes('switch-' + opposite.toLowerCase()));
    }
    const caused = measured.switch[state + 'Cause'][0];
    assert.equal(caused.end, opposite);
    assert.equal(caused.carry.path, 'switch');
    assert.equal(caused.carry.flipEvents.filter(event => event.applied).length, 1);
    assert.equal(caused.switchUse, 1);
  }
  const aHit = measured.switch.A[0].contactPoints.find(contact => contact.kind.startsWith('switch-'));
  const bHit = measured.switch.B[0].contactPoints.find(contact => contact.kind.startsWith('switch-'));
  assert.ok(aHit && bHit);
  assert.ok(Math.hypot(aHit.x - bHit.x, aHit.z - bHit.z) <= 0.01, `switch contact ${aHit.x},${aHit.z} vs ${bHit.x},${bHit.z}`);
});

test('a qualified rebound that also hits the plate changes the pallet once, and a scrape does not', () => {
  assert.ok(measured.once.labels.some(label => /kicker pallet/i.test(label)), JSON.stringify(measured.once.labels));
  assert.ok(measured.once.contactKinds.some(kind => kind.startsWith('switch-')), JSON.stringify(measured.once.contactKinds));
  assert.equal(measured.once.carry.path, 'both');
  assert.equal(measured.once.end, 'B');
  assert.equal(measured.once.carry.flipEvents.filter(event => event.applied).length, 1);
  assert.equal(measured.once.switchUse, 1);
  assert.equal(measured.scrape.end, 'A');
  assert.equal(measured.scrape.carry.path, 'none');
  assert.equal(measured.scrape.carry.flipEvents.length, 0);
  assert.equal(measured.scrape.labels.some(label => /kicker pallet/i.test(label)), false);
  assert.ok(measured.scrape.rejected.includes('turn-too-small'), JSON.stringify(measured.scrape.rejected));
  assert.ok(measured.scrape.contactKinds.some(kind => kind.startsWith('floor-')));
});
