// Player-step map of the right-angle corner at (22, 28).
// Real Havok. Writes a concise summary, not every sample.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset, adaptRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from '../range/run.mjs';

const objects = [
  { id: 'back-face', kind: 'bank', x: 16, z: 28.5, yaw: 0 },
  { id: 'side-face', kind: 'bank', x: 22.5, z: 22, yaw: 90 },
];

function presetFor() {
  return validateRangePreset({
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id: 'right-angle-search',
    name: 'Right Angle search',
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher: { x: 0 },
    objects,
    rules: {
      launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 },
      fixed: objects.map(object => object.id),
      allowance: {},
      goal: { kind: 'none' },
    },
  });
}

function hitsOf(contacts) {
  const hits = [];
  for (const contact of contacts ?? []) {
    const body = contact?.body ?? '';
    if (!body.startsWith('worldcraft-object-')) continue;
    hits.push({ id: body.slice('worldcraft-object-'.length), z: contact.point.z, y: contact.point.y, t: contact.first });
  }
  return hits;
}

const yaws = [];
for (let yaw = 20; yaw <= 60; yaw += 0.5) yaws.push(Math.round(yaw * 10) / 10);
const elevations = [];
for (let elevation = 10; elevation <= 30; elevation += 1) elevations.push(elevation);
const charges = [];
for (let charge = 0.45; charge <= 0.95; charge += 0.02) charges.push(Math.round(charge * 100) / 100);

const outPath = process.argv[2] ?? 'docs/experiments/foundry/lanes/discovery/sweep-corner.json';
const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const world = adaptRangePreset(presetFor()).world;
const session = createRangeHarness(havok, world, 'discovery-corner');
const twoHome = [];
const twoBack = [];
const oneHome = [];
let shots = 0;
try {
  for (const yaw of yaws) {
    for (const elevation of elevations) {
      for (const charge of charges) {
        const last = session.shoot(world, { railIndex: 1, originX: 0, yaw, elevation, charge });
        shots += 1;
        const hits = hitsOf(last.contacts);
        const ids = [...new Set(hits.map(hit => hit.id))];
        const x = last.terminal.position[0];
        const z = last.terminal.position[2];
        const home = Math.hypot(x, z);
        const contactZ = hits.length ? Math.min(...hits.map(hit => hit.z)) : null;
        const row = {
          yaw, elevation, charge,
          x: Math.round(x * 10) / 10,
          z: Math.round(z * 10) / 10,
          home: Math.round(home * 10) / 10,
          order: hits.map(hit => hit.id),
        };
        if (ids.length >= 2 && contactZ !== null && z < contactZ - 5) twoBack.push(row);
        if (ids.length >= 2 && home < 16) twoHome.push(row);
        else if (ids.length === 1 && home < 16) oneHome.push({ ...row, id: ids[0] });
      }
    }
  }
} finally { session.dispose(); }

function span(rows) {
  if (!rows.length) return null;
  const of = key => [Math.min(...rows.map(row => row[key])), Math.max(...rows.map(row => row[key]))];
  return { count: rows.length, yaw: of('yaw'), elevation: of('elevation'), charge: of('charge') };
}

const byKey = new Set(twoHome.map(row => `${row.yaw}|${row.elevation}|${row.charge}`));
let interior = 0;
for (const row of twoHome) {
  const yawNeighbors = [row.yaw - 0.5, row.yaw + 0.5].filter(yaw => yaw >= 20 && yaw <= 60);
  const held = yawNeighbors.every(yaw => byKey.has(`${Math.round(yaw * 10) / 10}|${row.elevation}|${row.charge}`));
  if (held) interior += 1;
}

const summary = {
  seed: 20261109,
  objects,
  shots,
  grid: { yaw: [20, 60, 0.5], elevation: [10, 30, 1], charge: [0.45, 0.95, 0.02], originX: 0 },
  twoBack: span(twoBack),
  twoHome: span(twoHome),
  oneHome: { count: oneHome.length, examples: oneHome.sort((a, b) => a.home - b.home).slice(0, 6) },
  yawInterior: { count: interior, of: twoHome.length },
  closest: twoHome.sort((a, b) => a.home - b.home).slice(0, 8),
  mild: twoHome.filter(row => row.elevation >= 16 && row.elevation <= 22 && row.charge >= 0.6 && row.charge <= 0.8).sort((a, b) => a.home - b.home).slice(0, 8),
};
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ shots, twoBack: summary.twoBack, twoHome: summary.twoHome, oneHome: summary.oneHome.count, yawInterior: summary.yawInterior, closest: summary.closest[0], mild: summary.mild[0] }, null, 2)}\n`);
