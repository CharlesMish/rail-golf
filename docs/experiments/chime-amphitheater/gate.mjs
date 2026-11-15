// Step 0. Does a landing on a piece count as first ground?
// A plate at tilt 90 is a horizontal slab on the yard. The shot is the existing solver.
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { validateWorld } from '../../../lib/worldcraft-model.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const world = validateWorld({
  format: 'rail-golf-worldcraft', version: 1, id: 'ground-gate', name: 'Ground gate',
  environment: { preset: 'forest-clearing-v1', seed: 1 },
  launcher: { x: 0 },
  objects: [{ id: 'slab', kind: 'plate', x: 0, z: 18, yaw: 0, lift: 0.5, tilt: 90, voice: { material: 'timber', degree: 0 } }],
  rules: { pin: null, locked: ['slab'], allowance: {}, rail: null, goal: { kind: 'none' } },
});
const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const harness = createRangeHarness(havok, world, rangeGitSha());
const aims = [
  { yaw: 0, elevation: 8, charge: 0.35 },
  { yaw: 0, elevation: 8, charge: 0.45 },
  { yaw: 0, elevation: 12, charge: 0.35 },
  { yaw: 0, elevation: 16, charge: 0.45 },
  { yaw: 0, elevation: 18, charge: 0.55 },
];
try {
  for (const aim of aims) {
    const last = harness.shoot(world, { railIndex: 1, originX: 0, ...aim });
    const contacts = (last.contacts ?? []).map(row => row.body);
    const piece = contacts.filter(body => body.startsWith('worldcraft-object-'));
    const groundIndex = contacts.indexOf('worldcraft-ground');
    const pieceBeforeGround = piece.length > 0 && (groundIndex === -1 || contacts.indexOf(piece[0]) < groundIndex);
    process.stdout.write(`${JSON.stringify({
      aim,
      reason: last.terminal.reason,
      elapsed: last.terminal.elapsed,
      contacts,
      pieceBeforeGround,
      endedOnPiece: last.terminal.reason === 'first-ground-contact' && groundIndex === -1 && piece.length > 0,
    })}\n`);
  }
} finally {
  harness.dispose();
}
