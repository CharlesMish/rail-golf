import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Logger } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { COURTYARD_HOLES } from '../lib/courtyard.js';
import { isLatch, resolveArm, runApproachRecovery, shotRecord, yardChanged, STORAGE_PREFIX } from '../lib/approach-prop.js';
import { idleLean, runApproachShot } from '../lib/approach-prop-scene.js';

Logger.LogLevels = 0;
const lumber = COURTYARD_HOLES[2];
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('latch and yard-change use the measured rest, not a drawn ramp', () => {
  assert.equal(isLatch(true, 49.997), true);
  assert.equal(isLatch(true, -22.9), false);
  assert.equal(isLatch(false, 50), false);
  assert.equal(yardChanged(-14.001), false);
  assert.equal(yardChanged(-22.9), true);
  assert.equal(yardChanged(49.997), true);
  assert.equal(resolveArm(''), 'address');
  assert.equal(resolveArm('nope'), 'address');
  assert.equal(resolveArm('q7m2c4r'), 'recording');
});

test('adjust stands the timber through the unedited return; continue does not restore', () => {
  const calls = [];
  const saved = { charge: 0.42, propAtAddress: { lean: 49.997 }, setup: { railIndex: 1, yaw: 0, elevation: 30, charge: 0.42 } };
  const deps = {
    memory: () => saved,
    livePose: () => ({ lean: 49.997, x: 22, y: 4, z: 133, qx: 0, qy: 0, qz: 0, qw: 1 }),
    interrupt() { calls.push('interrupt'); },
    cancel() { calls.push('cancel'); },
    applyPose(pose) { calls.push(['apply', pose === 'standing' ? 'standing' : 'pose']); },
    loadAim(restore) { calls.push(['load', restore]); },
    exactPower(power) { calls.push(['power', power]); },
    noteRestore(state) { calls.push(['restore', state === 'A' || state === 'B' ? state : 'pose']); },
    address() { calls.push('address'); },
    showGhost() { calls.push('ghost'); },
    loadStation(id) { calls.push(['station', id]); },
    stationId: 'gate',
  };
  runApproachRecovery('adjust', deps);
  assert.deepEqual(calls.filter(call => call[0] === 'restore'), [['restore', 'A']]);
  assert.deepEqual(calls.filter(call => call[0] === 'apply'), [['apply', 'standing']]);
  assert.equal(calls.includes('address'), false);
  calls.length = 0;
  runApproachRecovery('retry', deps);
  assert.deepEqual(calls.filter(call => call[0] === 'restore'), [['restore', 'pose']]);
  assert.deepEqual(calls.filter(call => call[0] === 'apply'), [['apply', 'pose']]);
  calls.length = 0;
  runApproachRecovery('continue', deps);
  assert.equal(calls.includes('address'), true);
  assert.equal(calls.some(call => call[0] === 'restore' || call[0] === 'apply'), false);
  calls.length = 0;
  runApproachRecovery('recall', deps);
  assert.deepEqual(calls.filter(call => call[0] === 'apply'), [['apply', 'pose']]);
  assert.equal(calls.some(call => call[0] === 'restore'), false);
  calls.length = 0;
  runApproachRecovery('ghost', deps);
  assert.deepEqual(calls, ['ghost']);
  calls.length = 0;
  runApproachRecovery('reset', deps);
  assert.deepEqual(calls.filter(call => call[0] === 'restore'), [['restore', 'A']]);
  const row = shotRecord({ build: 'abc', armCode: 'k3v8n1p', plan: 'try the piece', latched: true, continueOffered: true, continueUsed: false, treadContacts: ['step-a'], timberBefore: { lean: -14 }, timberAfter: { lean: 50 } });
  assert.equal(row.build, 'abc');
  assert.equal(row.latched, true);
  assert.deepEqual(row.treadContacts, ['step-a']);
  assert.equal(STORAGE_PREFIX, 'rail-golf:approach-prop:');
});

test('the lab does not retarget protected storage, scoring, or floor tokens', () => {
  const sources = ['../lib/approach-prop.js', '../lib/approach-prop-scene.js', '../app/approach-prop-lab.tsx', '../app/lab/approach-prop/page.tsx'].map(read).join('\n');
  for (const key of ['rail-golf-timber-courtyard-v01', 'rail-golf-line-lab-v1', 'rail-golf:linecraft:', 'rail-golf-intent-v1', 'rail-golf-delivery-routes-v2', 'rail-golf:pallet-carry:', 'floorForAction', 'line-score']) {
    assert.equal(sources.includes(key), false, key);
  }
  assert.match(read('../app/lab/approach-prop/page.tsx'), /ApproachPropLab/);
  assert.doesNotMatch(read('../app/lab/approach-prop/page.tsx'), /MannersGame/);
  assert.match(read('../lib/approach-prop.js'), /returnLabToSetup/);
  assert.match(read('../app/approach-prop-lab.tsx'), /Adjust Last Line/);
  assert.match(read('../app/approach-prop-lab.tsx'), /Continue in Changed Yard/);
  assert.match(read('../app/approach-prop-lab.tsx'), /continueOffered &&/);
});

test('sleep holds the address lean and the hinge stops the backward throw', { timeout: 120000 }, async () => {
  const havok = await HavokPhysics({ wasmBinary: readFileSync(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const held = idleLean(havok, lumber, { hold: true, steps: 360 });
  const free = idleLean(havok, lumber, { hold: false, steps: 360 });
  assert.ok(Math.abs(held + 14) < 0.05, `held ${held}`);
  assert.ok(Math.abs(free + 22.9) < 1, `free ${free}`);
  const j1 = runApproachShot(havok, lumber, { railIndex: 1, originX: 0, yaw: 0, elevation: 30, charge: 0.5 });
  assert.equal(j1.propHit, true);
  assert.ok(Math.abs(j1.leanEnd - 49.997) < 0.05, `j1 ${j1.leanEnd}`);
  assert.equal(j1.stepA || j1.stepB, false);
  const wrong = runApproachShot(havok, lumber, { railIndex: 1, originX: 0, yaw: 18, elevation: 26.5, charge: 0.79 }, { tailSteps: 720 });
  assert.equal(wrong.propHit, true);
  assert.ok(wrong.leanEnd < -18 && wrong.leanEnd > -30, `p6 ${wrong.leanEnd}`);
  assert.ok(Math.abs(wrong.leanTail - wrong.leanEnd) < 0.5);
  assert.equal(wrong.leanTail > 30, false);
  const named = { railIndex: 1, originX: 0, yaw: 0, elevation: 22, charge: 0.55 };
  const standing = runApproachShot(havok, lumber, named);
  const rested = runApproachShot(havok, lumber, named, { prop: 'static', lean: j1.leanEnd, hold: false });
  assert.equal(standing.stepA || standing.stepB, false);
  assert.equal(rested.stepA, true);
  assert.equal(rested.stepB, true);
});
