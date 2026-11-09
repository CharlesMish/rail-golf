// Player-step map of one return-fold layout. Real Havok. Concise JSON only.
//
//   node scripts/foundry/discovery-family.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset, adaptRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from '../range/run.mjs';

const snap = value => Math.round(value * 2) / 2;

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

function pieceHits(contacts) {
  const hits = [];
  for (const contact of contacts ?? []) {
    const body = contact?.body ?? '';
    if (!body.startsWith('worldcraft-object-')) continue;
    hits.push({
      id: body.slice('worldcraft-object-'.length),
      t: contact.first,
      z: contact.point.z,
    });
  }
  return hits;
}

function classify(last) {
  const hits = pieceHits(last.contacts);
  const [x, , z] = last.terminal.position;
  const ids = [...new Set(hits.map(hit => hit.id))];
  const contactZ = hits.length ? Math.min(...hits.map(hit => hit.z)) : null;
  const cameBack = ids.length >= 2 && contactZ !== null && z < contactZ - 3;
  return {
    reason: last.terminal.reason,
    elapsed: last.terminal.elapsed,
    x: Math.round(x * 100) / 100,
    z: Math.round(z * 100) / 100,
    home: Math.round(Math.hypot(x, z) * 100) / 100,
    ids,
    order: hits.map(hit => hit.id),
    cameBack,
    oneBack: ids.length === 1 && contactZ !== null && z < contactZ - 3,
  };
}

const studies = [
  { id: 'fold-12-30-r7.5', objects: fold(12, 30, 7.5) },
  { id: 'fold-14-32-r8.5', objects: fold(14, 32, 8.5) },
  { id: 'ell-16-32', objects: ell(16, 32) },
];

const yaws = [];
for (let yaw = 0; yaw <= 40; yaw += 0.5) yaws.push(Math.round(yaw * 10) / 10);
const elevations = [];
for (let elevation = 10; elevation <= 34; elevation += 2) elevations.push(elevation);
const charges = [];
for (let charge = 0.45; charge <= 0.95; charge += 0.05) charges.push(Math.round(charge * 100) / 100);

const outPath = process.argv[2] ?? 'docs/experiments/foundry/lanes/discovery/sweep-family.json';
const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const session = createRangeHarness(havok, adaptRangePreset(presetFor(studies[0].objects)).world, 'discovery-family');
const reports = [];
try {
  for (const study of studies) {
    let preset;
    try { preset = presetFor(study.objects); }
    catch (error) {
      reports.push({ id: study.id, error: error.message });
      process.stderr.write(`${study.id} invalid: ${error.message}\n`);
      continue;
    }
    const world = adaptRangePreset(preset).world;
    const opening = classify(session.shoot(world, { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 }));
    const returns = [];
    const oneBack = [];
    let shots = 0;
    let doubles = 0;
    for (const yaw of yaws) {
      for (const elevation of elevations) {
        for (const charge of charges) {
          const last = session.shoot(world, { railIndex: 1, originX: 0, yaw, elevation, charge });
          shots += 1;
          const row = classify(last);
          if (row.ids.length >= 2) doubles += 1;
          if (row.cameBack) returns.push({ yaw, elevation, charge, x: row.x, z: row.z, home: row.home, order: row.order });
          else if (row.oneBack) oneBack.push({ yaw, elevation, charge, x: row.x, z: row.z, home: row.home, id: row.ids[0] });
        }
      }
    }
    const homes = returns.filter(row => row.home < 18);
    const span = rows => {
      if (!rows.length) return null;
      const pick = key => [Math.min(...rows.map(row => row[key])), Math.max(...rows.map(row => row[key]))];
      return { yaw: pick('yaw'), elevation: pick('elevation'), charge: pick('charge'), count: rows.length };
    };
    reports.push({
      id: study.id,
      objects: study.objects,
      shots,
      opening,
      doubles,
      returns: returns.length,
      oneBankReturns: oneBack.length,
      returnSpan: span(returns),
      homeSpan: span(homes),
      homeExamples: homes.sort((a, b) => a.home - b.home).slice(0, 6),
      oneBackExamples: oneBack.sort((a, b) => a.home - b.home).slice(0, 4),
    });
    process.stderr.write(`${study.id} shots=${shots} doubles=${doubles} returns=${returns.length} home<18=${homes.length} oneBack=${oneBack.length} opening=${opening.ids.join('+') || 'miss'} z=${opening.z}\n`);
  }
} finally { session.dispose(); }

const summary = { seed: 20261109, grid: { yaws: [yaws[0], yaws.at(-1), 0.5], elevations, charges, originX: 0 }, reports };
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary.reports.map(report => ({ id: report.id, error: report.error, opening: report.opening, returns: report.returns, homeSpan: report.homeSpan, oneBankReturns: report.oneBankReturns })), null, 2)}\n`);
