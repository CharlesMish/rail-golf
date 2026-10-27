import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { adaptRangePreset, createMusicalWorkshopPreset, validateRangePreset } from '../lib/worldcraft-range.js';
import { impactGain } from '../lib/worldcraft-resonance.js';
import { createRangeHarness } from '../scripts/range/run.mjs';

Logger.LogLevels = 0;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createMusicalWorkshopPreset();
const voice = {
  ramp: { id: 'ramp-yours', kind: 'ramp', x: -20, z: 78, yaw: 0, voice: { material: 'metal', degree: 1 } },
  bank: { id: 'bank-yours', kind: 'bank', x: 0, z: 24, yaw: 0, voice: { material: 'timber', degree: 0 } },
  plate: { id: 'plate-yours', kind: 'plate', x: 0, z: 86, yaw: 0, voice: { material: 'metal', degree: 2 } },
};
const setup = { railIndex: 1, originX: 0, yaw: 0, elevation: 12, charge: 0.5 };

function world(bank) {
  return adaptRangePreset(validateRangePreset({ ...base, objects: [voice.ramp, { ...voice.bank, ...bank }, voice.plate] })).world;
}

function bankHit(last) {
  return last.resonance.impacts.find(impact => impact.role === 'bank');
}

function sameFlight(left, right) {
  assert.equal(left.samples.length, right.samples.length);
  for (let i = 0; i < left.samples.length; i += 1) {
    assert.equal(Object.is(left.samples[i].t, right.samples[i].t), true);
    assert.equal(Object.is(left.samples[i].x, right.samples[i].x), true);
    assert.equal(Object.is(left.samples[i].y, right.samples[i].y), true);
    assert.equal(Object.is(left.samples[i].z, right.samples[i].z), true);
  }
  assert.deepEqual(left.terminal.position, right.terminal.position);
}

test('a grazing bank is quieter than a square bank at similar speed, and the mapping does not move the shot', () => {
  const session = createRangeHarness(havok, world({ x: 0, z: 24, yaw: 0 }), 'dynamics');
  try {
    assert.equal(session.runtime.setDynamics('normal-speed'), true);
    const square = session.shoot(world({ x: 0, z: 24, yaw: 0 }), setup);
    const graze = session.shoot(world({ x: 1, z: 24, yaw: 85 }), setup);
    const squareAgain = session.shoot(world({ x: 0, z: 24, yaw: 0 }), setup);
    const hard = bankHit(square);
    const soft = bankHit(graze);
    assert.ok(hard && soft);
    assert.equal(hard.dynamics, 'normal-speed');
    assert.equal(soft.dynamics, 'normal-speed');
    assert.ok(hard.point && soft.point);
    const speedGap = Math.abs(hard.speed - soft.speed) / Math.max(hard.speed, soft.speed);
    assert.ok(speedGap < 0.2, `total speeds ${hard.speed} and ${soft.speed}`);
    assert.ok(soft.normalSpeed < hard.normalSpeed * 0.25, `face speeds ${soft.normalSpeed} and ${hard.normalSpeed}`);
    assert.ok(soft.gain < hard.gain * 0.5, `gains ${soft.gain} and ${hard.gain}`);
    assert.ok(impactGain(soft.speed) >= impactGain(hard.speed) * 0.95);
    sameFlight(square, squareAgain);
    assert.equal(session.runtime.setDynamics('total-speed'), true);
    const total = session.shoot(world({ x: 0, z: 24, yaw: 0 }), setup);
    sameFlight(square, total);
    assert.equal(bankHit(total).dynamics, 'total-speed');
    assert.equal(bankHit(total).gain, impactGain(bankHit(total).speed));
    assert.notEqual(bankHit(total).gain, hard.gain);
    assert.equal(session.runtime.setDynamics('normal-speed'), true);
  } finally { session.dispose(); }
});
