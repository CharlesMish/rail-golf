// Find a player-step cell in the right-angle corner whose neighbours also return.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset, adaptRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from '../range/run.mjs';

const objects = [
  { id: 'back-face', kind: 'bank', x: 16, z: 28.5, yaw: 0, voice: { material: 'timber', degree: 0 } },
  { id: 'side-face', kind: 'bank', x: 22.5, z: 22, yaw: 90, voice: { material: 'metal', degree: 2 } },
];

const preset = validateRangePreset({
  format: 'rail-golf-worldcraft-range-preset',
  version: 1,
  id: 'right-angle-search',
  name: 'Right Angle search',
  environment: { preset: 'forest-clearing-v1', seed: 1 },
  launcher: { x: 0 },
  objects,
  rules: {
    launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 },
    fixed: ['back-face', 'side-face'],
    allowance: {},
    goal: { kind: 'none' },
  },
});

function roundStep(value, step) {
  return Math.round(value / step) * step;
}

function keyOf(yaw, elevation, charge) {
  return `${roundStep(yaw, 0.5).toFixed(1)}|${roundStep(elevation, 0.5).toFixed(1)}|${roundStep(charge, 0.01).toFixed(2)}`;
}

function describe(last) {
  const hits = [];
  for (const contact of last.contacts ?? []) {
    const body = contact?.body ?? '';
    if (!body.startsWith('worldcraft-object-')) continue;
    hits.push(body.slice('worldcraft-object-'.length));
  }
  const [x, y, z] = last.terminal.position;
  const ids = [...new Set(hits)];
  return {
    reason: last.terminal.reason,
    elapsed: last.terminal.elapsed,
    position: [x, y, z],
    x, y, z,
    home: Math.hypot(x, z),
    hits,
    ids,
    clean: ids.length === 2 && hits.length === 2 && z < 14,
    back: ids.length === 2 && z < 16,
  };
}

const yaws = [];
for (let yaw = 32; yaw <= 46; yaw += 0.5) yaws.push(roundStep(yaw, 0.5));
const elevations = [];
for (let elevation = 12; elevation <= 24; elevation += 0.5) elevations.push(roundStep(elevation, 0.5));
const charges = [];
for (let charge = 0.6; charge <= 0.9; charge += 0.01) charges.push(Math.round(charge * 100) / 100);

const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const world = adaptRangePreset(preset).world;
const session = createRangeHarness(havok, world, 'discovery-neighborhood');
const rows = new Map();
try {
  for (const yaw of yaws) {
    for (const elevation of elevations) {
      for (const charge of charges) {
        const last = session.shoot(world, { railIndex: 1, originX: 0, yaw, elevation, charge });
        rows.set(keyOf(yaw, elevation, charge), describe(last));
      }
    }
  }
  const fat = [];
  for (const yaw of yaws) {
    for (const elevation of elevations) {
      for (const charge of charges) {
        const center = rows.get(keyOf(yaw, elevation, charge));
        if (!center?.clean) continue;
        let held = 0;
        let asked = 0;
        for (const dy of [-0.5, 0, 0.5]) {
          for (const de of [-0.5, 0, 0.5]) {
            for (const dc of [-0.01, 0, 0.01]) {
              if (dy === 0 && de === 0 && dc === 0) continue;
              asked += 1;
              const neighbor = rows.get(keyOf(yaw + dy, elevation + de, charge + dc));
              if (neighbor?.back) held += 1;
            }
          }
        }
        if (held === asked) fat.push({ yaw, elevation, charge, home: Math.round(center.home * 10) / 10, z: Math.round(center.z * 10) / 10, hits: center.hits, held });
      }
    }
  }
  fat.sort((a, b) => a.home - b.home);
  const chosen = fat[0] ?? null;
  let chosenFull = null;
  let neighbors = [];
  let origins = [];
  let opening = null;
  if (chosen) {
    const last = session.shoot(world, { railIndex: 1, originX: 0, yaw: chosen.yaw, elevation: chosen.elevation, charge: chosen.charge });
    chosenFull = describe(last);
    for (const dy of [-0.5, 0.5]) {
      const shot = describe(session.shoot(world, { railIndex: 1, originX: 0, yaw: chosen.yaw + dy, elevation: chosen.elevation, charge: chosen.charge }));
      neighbors.push({ yaw: chosen.yaw + dy, elevation: chosen.elevation, charge: chosen.charge, home: Math.round(shot.home * 10) / 10, z: Math.round(shot.z * 10) / 10, hits: shot.hits, back: shot.back });
    }
    for (const de of [-0.5, 0.5]) {
      const shot = describe(session.shoot(world, { railIndex: 1, originX: 0, yaw: chosen.yaw, elevation: chosen.elevation + de, charge: chosen.charge }));
      neighbors.push({ yaw: chosen.yaw, elevation: chosen.elevation + de, charge: chosen.charge, home: Math.round(shot.home * 10) / 10, z: Math.round(shot.z * 10) / 10, hits: shot.hits, back: shot.back });
    }
    for (const dc of [-0.01, 0.01]) {
      const charge = Math.round((chosen.charge + dc) * 100) / 100;
      const shot = describe(session.shoot(world, { railIndex: 1, originX: 0, yaw: chosen.yaw, elevation: chosen.elevation, charge }));
      neighbors.push({ yaw: chosen.yaw, elevation: chosen.elevation, charge, home: Math.round(shot.home * 10) / 10, z: Math.round(shot.z * 10) / 10, hits: shot.hits, back: shot.back });
    }
    for (const originX of [-2, -1, -0.5, 0.5, 1, 2]) {
      const shot = describe(session.shoot(world, { railIndex: 1, originX, yaw: chosen.yaw, elevation: chosen.elevation, charge: chosen.charge }));
      origins.push({ originX, home: Math.round(shot.home * 10) / 10, z: Math.round(shot.z * 10) / 10, hits: shot.hits, back: shot.back, clean: shot.clean });
    }
  }
  const openingShots = [];
  for (const yaw of [-1, -0.5, 0, 0.5, 1, 5]) {
    const shot = describe(session.shoot(world, { railIndex: 1, originX: 0, yaw, elevation: 18, charge: 0.55 }));
    openingShots.push({ yaw, ids: shot.ids, z: Math.round(shot.z * 10) / 10, home: Math.round(shot.home * 10) / 10 });
  }
  opening = openingShots;
  const summary = {
    seed: 20261109,
    shots: rows.size,
    cleanCells: [...rows.values()].filter(row => row.clean).length,
    backCells: [...rows.values()].filter(row => row.back).length,
    fatClean: fat.length,
    closestFat: fat.slice(0, 5),
    chosen,
    chosenTerminal: chosenFull && {
      reason: chosenFull.reason,
      elapsed: chosenFull.elapsed,
      position: chosenFull.position,
      hits: chosenFull.hits,
    },
    neighbors,
    origins,
    opening,
  };
  const outPath = process.argv[2] ?? 'docs/experiments/foundry/lanes/discovery/sweep-neighborhood.json';
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ shots: summary.shots, cleanCells: summary.cleanCells, fatClean: summary.fatClean, chosen, neighbors, origins, opening }, null, 2)}\n`);
} finally { session.dispose(); }
