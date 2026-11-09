// Short probe: which locked shot puts a ramp carry in the mid-yard.
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { validateRangePreset } from '../../lib/worldcraft-range.js';
import { runRange } from '../range/run.mjs';

const SEED = 20261109;
function preset(objects, launch) {
  return validateRangePreset({
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id: 'construction-probe',
    name: 'Construction probe',
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher: { x: 0 },
    objects,
    rules: {
      launcher: { fixed: true, yaw: launch.yaw, elevation: launch.elevation, charge: launch.charge },
      fixed: [],
      allowance: { ramp: 1 },
      goal: { kind: 'none' },
    },
  });
}
const launches = [
  { yaw: 0, elevation: 18, charge: 0.55 },
  { yaw: 0, elevation: 18, charge: 0.45 },
  { yaw: 0, elevation: 18, charge: 0.4 },
  { yaw: 0, elevation: 14, charge: 0.55 },
  { yaw: 0, elevation: 22, charge: 0.5 },
  { yaw: 0, elevation: 16, charge: 0.5 },
];
const poses = [];
for (const z of [28, 32, 36, 40]) {
  for (const yaw of [-10, 0, 10]) poses.push({ x: 0, z, yaw });
}
poses.push({ x: -4, z: 36, yaw: 0 }, { x: 4, z: 36, yaw: 0 });

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
for (const launch of launches) {
  const setup = { railIndex: 1, originX: 0, ...launch };
  const items = [{ label: 'empty', preset: preset([], launch) }, ...poses.map(pose => ({
    label: `x${pose.x}-z${pose.z}-y${pose.yaw}`,
    preset: preset([{ id: 'yours', kind: 'ramp', ...pose }], launch),
  }))];
  const { lines } = await runRange({
    preset: items[0].preset,
    setups: items.map(() => setup),
    seed: SEED,
    havok,
    omitPoints: true,
    documentAt: (_setup, index) => items[index].preset,
    labels: items.map(item => item.label),
  });
  const rows = lines.filter(line => line.type === 'shot');
  process.stdout.write(`\nlaunch e${launch.elevation} c${launch.charge}\n`);
  rows.forEach((row, index) => {
    const p = row.terminal.position;
    const hit = (row.contacts ?? []).some(contact => String(contact.body).startsWith('worldcraft-object-'));
    process.stdout.write(`${items[index].label} ${hit ? 'HIT' : '---'} (${p[0].toFixed(2)}, ${p[2].toFixed(2)})\n`);
  });
}
