import test from 'node:test';
import assert from 'node:assert/strict';
import { launchCharge, interruptedRecord, rememberAttempt, landingEdgeGap, landingReceipt } from '../lib/shot-tools.js';
import { COURTYARD_HOLES } from '../lib/courtyard.js';
import { HOLES, isAceLanding, mergeHoleRecord, RAIL_RULES } from '../lib/rail-golf-v02.js';

test('set power is independent of hold duration; timed hold retains its original curve', () => {
  for (const ms of [0, 20, 775, 1550, 3000]) assert.equal(launchCharge('set', .735, ms), .735);
  assert.equal(launchCharge('hold', .99, 775), .5);
  assert.equal(launchCharge('hold', .99, 0), 0);
  assert.equal(launchCharge('hold', .1, 3000), 1);
  assert.equal(launchCharge('set', 2, 0), 1);
  assert.equal(launchCharge('set', NaN, 0), 0);
});

test('abandoning a flight counts an attempt without granting or destroying achievements', () => {
  const empty = interruptedRecord(undefined);
  assert.equal(empty.attempts, 1); assert.equal(empty.cleared, false); assert.equal(empty.bestOutcome, null);
  const perfect = mergeHoleRecord(undefined, 'double');
  assert.deepEqual(interruptedRecord(perfect), { ...perfect, attempts: perfect.attempts + 1 });
  assert.equal(perfect.attempts, 1);
});

test('history stays bounded, keeps interrupted attempts, and replaces duplicates', () => {
  let history = [];
  for (let projectileId = 1; projectileId <= 5; projectileId++) history = rememberAttempt(history, { projectileId, receipt: 'Interrupted' });
  assert.deepEqual(history.map(item => item.projectileId), [5,4,3]);
  const recalled = rememberAttempt(history, { projectileId: 4, receipt: 'complete' });
  assert.deepEqual(recalled.map(item => item.projectileId), [4,5,3]);
  assert.equal(history[1].receipt, 'Interrupted');
});

test('edge readout agrees with scoring around every target, in every direction', () => {
  for (const hole of [...HOLES, ...COURTYARD_HOLES]) {
    for (const angle of [0, .4, 1.2, 2.6, 4.1, 5.9]) {
      for (const offset of [-.45, -.001, .001, .45, 1.7]) {
        const radius = hole.target.radius + RAIL_RULES.projectileRadius + offset;
        const point = { x: hole.target.x + radius * Math.cos(angle), y: RAIL_RULES.landingHeight, z: hole.target.z + radius * Math.sin(angle) };
        assert.equal(isAceLanding(hole, point), landingEdgeGap(hole, point) <= 0);
        assert.match(landingReceipt(hole, point), offset > 0 ? /outside/ : /inside/);
      }
    }
  }
});
