// Headless Havok search for a return fold: two banks, one right angle.
// Prints a concise JSON summary. Does not retune physics.
//
//   node scripts/foundry/discovery-sweep.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset, adaptRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from '../range/run.mjs';

const snap = value => Math.round(value * 2) / 2;

function presetFor(objects) {
  return validateRangePreset({
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id: 'return-fold-search',
    name: 'Return Fold search',
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

function tryObjects(objects) {
  try {
    presetFor(objects);
    return null;
  } catch (error) {
    return error.message;
  }
}

function fold(apexX, apexZ, reach) {
  const along = reach * Math.SQRT1_2;
  return [
    { id: 'left-face', kind: 'bank', x: snap(apexX - along), z: snap(apexZ - along), yaw: 135 },
    { id: 'right-face', kind: 'bank', x: snap(apexX + along), z: snap(apexZ - along), yaw: 45 },
  ];
}

function ell(cornerX, cornerZ) {
  return [
    { id: 'back-face', kind: 'bank', x: snap(cornerX - 6), z: snap(cornerZ + 0.5), yaw: 0 },
    { id: 'side-face', kind: 'bank', x: snap(cornerX + 0.5), z: snap(cornerZ - 6), yaw: 90 },
  ];
}

const layouts = [];
for (const apexX of [8, 12, 16]) {
  for (const apexZ of [30, 38, 48]) {
    for (const reach of [6.5, 7.5]) {
      const objects = fold(apexX, apexZ, reach);
      const error = tryObjects(objects);
      layouts.push({ id: `fold-${apexX}-${apexZ}-r${reach}`, kind: 'fold', objects, error });
    }
  }
}
for (const cornerX of [10, 14, 18]) {
  for (const cornerZ of [28, 36, 46]) {
    const objects = ell(cornerX, cornerZ);
    const error = tryObjects(objects);
    layouts.push({ id: `ell-${cornerX}-${cornerZ}`, kind: 'ell', objects, error });
  }
}

const legal = layouts.filter(layout => !layout.error);
const yaws = [];
for (let yaw = -10; yaw <= 45; yaw += 5) yaws.push(yaw);
const elevations = [12, 18, 24, 32, 42];
const charges = [0.45, 0.6, 0.75, 0.9];

function pieceHits(contacts) {
  const hits = [];
  for (const contact of contacts ?? []) {
    const body = contact?.body ?? '';
    const id = body.startsWith('worldcraft-object-') ? body.slice('worldcraft-object-'.length) : null;
    if (!id) continue;
    hits.push({ id, t: contact.first, x: contact.point.x, y: contact.point.y, z: contact.point.z, count: contact.count });
  }
  return hits;
}

function classify(setup, last) {
  const hits = pieceHits(last.contacts);
  const [x, y, z] = last.terminal.position;
  const ids = [...new Set(hits.map(hit => hit.id))];
  const both = ids.length >= 2;
  const contactZ = hits.length ? Math.min(...hits.map(hit => hit.z)) : null;
  const cameBack = both && contactZ !== null && z < contactZ - 3;
  const home = Math.hypot(x, z);
  return {
    yaw: setup.yaw,
    elevation: setup.elevation,
    charge: setup.charge,
    reason: last.terminal.reason,
    elapsed: last.terminal.elapsed,
    x, y, z, home,
    ids,
    order: hits.map(hit => hit.id),
    hitZ: hits.map(hit => Math.round(hit.z * 10) / 10),
    cameBack,
    both,
  };
}

const outPath = process.argv[2] ?? 'docs/experiments/foundry/lanes/discovery/sweep-coarse.json';

const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const first = legal[0];
const session = createRangeHarness(havok, adaptRangePreset(presetFor(first.objects)).world, 'discovery-sweep');
const reports = [];
let fired = 0;
try {
  for (const layout of legal) {
    const preset = presetFor(layout.objects);
    const world = adaptRangePreset(preset).world;
    const returns = [];
    const doubles = [];
    let shots = 0;
    for (const yaw of yaws) {
      for (const elevation of elevations) {
        for (const charge of charges) {
          const setup = { railIndex: 1, originX: 0, yaw, elevation, charge };
          const last = session.shoot(world, setup);
          fired += 1;
          shots += 1;
          const row = classify(setup, last);
          if (row.both) doubles.push(row);
          if (row.cameBack) returns.push(row);
        }
      }
    }
    returns.sort((a, b) => a.home - b.home);
    const yawSet = [...new Set(returns.map(row => row.yaw))].sort((a, b) => a - b);
    const elevSet = [...new Set(returns.map(row => row.elevation))].sort((a, b) => a - b);
    const chargeSet = [...new Set(returns.map(row => row.charge))].sort((a, b) => a - b);
    reports.push({
      id: layout.id,
      kind: layout.kind,
      objects: layout.objects,
      shots,
      doubles: doubles.length,
      returns: returns.length,
      yawSpan: yawSet.length ? [yawSet[0], yawSet.at(-1)] : null,
      elevationSpan: elevSet.length ? [elevSet[0], elevSet.at(-1)] : null,
      chargeSpan: chargeSet.length ? [chargeSet[0], chargeSet.at(-1)] : null,
      closest: returns.slice(0, 8),
      sampleDouble: doubles.slice(0, 3),
    });
    process.stderr.write(`${layout.id} shots=${shots} doubles=${doubles.length} returns=${returns.length}\n`);
  }
} finally {
  session.dispose();
}

const summary = {
  seed: 20261109,
  fired,
  rejectedLayouts: layouts.filter(layout => layout.error).map(layout => ({ id: layout.id, error: layout.error })),
  grid: { yaws, elevations, charges, originX: 0 },
  reports: reports.sort((a, b) => b.returns - a.returns || b.doubles - a.doubles),
};
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ fired, layouts: legal.length, best: summary.reports.slice(0, 6).map(report => ({ id: report.id, doubles: report.doubles, returns: report.returns, yawSpan: report.yawSpan, closest: report.closest[0] ?? null })) }, null, 2)}\n`);
