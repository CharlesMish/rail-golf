// Search corners whose bisector points near the carriage.
// A single face should deflect. Both faces should send the ball home.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset, adaptRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from '../range/run.mjs';

const snap = value => Math.round(value * 2) / 2;

function wrapYaw(yaw) {
  let value = Math.round(yaw / 5) * 5;
  while (value > 175) value -= 360;
  while (value < -180) value += 360;
  if (value === 180) value = -180;
  return value;
}

function rotatedFold(apexX, apexZ, reach, turn) {
  return [135, 45].map((base, index) => {
    const yaw = wrapYaw(base + turn);
    const rad = yaw * Math.PI / 180;
    return {
      id: index === 0 ? 'left-face' : 'right-face',
      kind: 'bank',
      x: snap(apexX + reach * Math.cos(rad)),
      z: snap(apexZ - reach * Math.sin(rad)),
      yaw,
    };
  });
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

function hitsOf(contacts) {
  const hits = [];
  for (const contact of contacts ?? []) {
    const body = contact?.body ?? '';
    if (!body.startsWith('worldcraft-object-')) continue;
    hits.push({ id: body.slice('worldcraft-object-'.length), z: contact.point.z });
  }
  return hits;
}

const layouts = [];
for (const cornerX of [16, 18, 20, 22, 24, 26]) {
  for (const cornerZ of [24, 28, 32, 36]) layouts.push({ id: `ell-${cornerX}-${cornerZ}`, objects: ell(cornerX, cornerZ) });
}
for (const turn of [15, 20, 25, 30, 35, 40]) {
  for (const apexZ of [30, 36, 42]) {
    const apexX = snap(apexZ * Math.tan(turn * Math.PI / 180));
    layouts.push({ id: `fold-t${turn}-${apexX}-${apexZ}`, objects: rotatedFold(apexX, apexZ, 8, turn) });
  }
}

const yaws = [];
for (let yaw = 0; yaw <= 55; yaw += 2.5) yaws.push(yaw);
const elevations = [12, 16, 20, 24, 28];
const charges = [0.5, 0.65, 0.8, 0.9];

const outPath = process.argv[2] ?? 'docs/experiments/foundry/lanes/discovery/sweep-bisector.json';
const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const seedLayout = layouts.find(layout => {
  try { presetFor(layout.objects); return true; } catch { return false; }
});
const session = createRangeHarness(havok, adaptRangePreset(presetFor(seedLayout.objects)).world, 'discovery-bisector');
const reports = [];
try {
  for (const layout of layouts) {
    let world;
    try { world = adaptRangePreset(presetFor(layout.objects)).world; }
    catch (error) {
      reports.push({ id: layout.id, error: error.message });
      continue;
    }
    const openingLast = session.shoot(world, { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 });
    const openingHits = hitsOf(openingLast.contacts);
    const opening = {
      x: Math.round(openingLast.terminal.position[0] * 10) / 10,
      z: Math.round(openingLast.terminal.position[2] * 10) / 10,
      ids: [...new Set(openingHits.map(hit => hit.id))],
    };
    const twoHome = [];
    const oneHome = [];
    let twoBack = 0;
    for (const yaw of yaws) {
      for (const elevation of elevations) {
        for (const charge of charges) {
          const last = session.shoot(world, { railIndex: 1, originX: 0, yaw, elevation, charge });
          const hits = hitsOf(last.contacts);
          const ids = [...new Set(hits.map(hit => hit.id))];
          const x = last.terminal.position[0];
          const z = last.terminal.position[2];
          const home = Math.hypot(x, z);
          const contactZ = hits.length ? Math.min(...hits.map(hit => hit.z)) : null;
          if (ids.length >= 2 && contactZ !== null && z < contactZ - 5) twoBack += 1;
          if (home < 16 && ids.length >= 2) twoHome.push({ yaw, elevation, charge, home: Math.round(home * 10) / 10, z: Math.round(z * 10) / 10, x: Math.round(x * 10) / 10, order: hits.map(hit => hit.id) });
          else if (home < 16 && ids.length === 1) oneHome.push({ yaw, elevation, charge, home: Math.round(home * 10) / 10, id: ids[0] });
        }
      }
    }
    const yawSpan = twoHome.length ? [Math.min(...twoHome.map(row => row.yaw)), Math.max(...twoHome.map(row => row.yaw))] : null;
    reports.push({
      id: layout.id,
      objects: layout.objects,
      opening,
      twoBack,
      twoHome: twoHome.length,
      oneHome: oneHome.length,
      yawSpan,
      closest: twoHome.sort((a, b) => a.home - b.home).slice(0, 3),
      oneExample: oneHome.sort((a, b) => a.home - b.home)[0] ?? null,
    });
    process.stderr.write(`${layout.id} open=${opening.ids.join('+') || 'clear'} z=${opening.z} twoHome=${twoHome.length} oneHome=${oneHome.length} twoBack=${twoBack} yaw=${yawSpan}\n`);
  }
} finally { session.dispose(); }

const score = report => (report.error ? -1 : (report.opening?.ids.length === 0 ? 1000 : 0) + (report.twoHome ?? 0) * 3 - (report.oneHome ?? 0) * 5);
reports.sort((a, b) => score(b) - score(a));
const summary = { seed: 20261109, grid: { yaws: [0, 55, 2.5], elevations, charges }, reports };
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
const best = reports.filter(report => !report.error && report.opening.ids.length === 0).slice(0, 8);
process.stdout.write(`${JSON.stringify(best.map(report => ({ id: report.id, twoHome: report.twoHome, oneHome: report.oneHome, twoBack: report.twoBack, yawSpan: report.yawSpan, opening: report.opening, closest: report.closest?.[0] ?? null })), null, 2)}\n`);
