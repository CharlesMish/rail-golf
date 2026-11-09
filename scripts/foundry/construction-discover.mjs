// Construction lane discovery. One locked shot, many piece poses.
// The seed is recorded provenance. It is not applied to the solver.
// Writes a compact summary. It does not write sample trails.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset } from '../../lib/worldcraft-range.js';
import { runRange } from '../range/run.mjs';

const SEED = 20261109;
const LAUNCH = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };
const outPath = resolve(import.meta.dirname, '../../docs/experiments/foundry/lanes/construction/discover-summary.json');

function series(from, to, step) {
  const count = Math.round((to - from) / step);
  return Array.from({ length: count + 1 }, (_, index) => Math.round((from + index * step) * 1e6) / 1e6);
}

function piece(kind, x, z, yaw) {
  const object = { id: 'yours', kind, x, z, yaw };
  if (kind === 'plate') object.voice = { material: 'timber', degree: 0 };
  return object;
}

function presetFor(objects, launcher = { fixed: true, yaw: LAUNCH.yaw, elevation: LAUNCH.elevation, charge: LAUNCH.charge }) {
  return validateRangePreset({
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id: 'construction-probe',
    name: 'Construction probe',
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher: { x: 0 },
    objects,
    rules: {
      launcher,
      fixed: [],
      allowance: { bank: 1, block: 1, ramp: 1, plate: 1 },
      goal: { kind: 'none' },
    },
  });
}

function tryPreset(objects) {
  try { return presetFor(objects); } catch { return null; }
}

function layouts() {
  const rows = [];
  const push = (kind, x, z, yaw) => {
    const objects = [piece(kind, x, z, yaw)];
    const preset = tryPreset(objects);
    rows.push({ kind, x, z, yaw, preset, illegal: !preset });
  };
  for (const x of series(-8, 8, 4)) {
    for (const z of series(26, 50, 4)) {
      for (const yaw of [-40, -20, 0, 20, 40]) push('block', x, z, yaw);
    }
  }
  for (const x of series(-16, 16, 4)) {
    for (const z of series(16, 40, 4)) {
      for (const yaw of [-60, -30, 0, 30, 60]) push('bank', x, z, yaw);
    }
  }
  for (const x of series(-8, 8, 4)) {
    for (const z of series(20, 44, 4)) {
      for (const yaw of [-60, -30, 0, 30, 60, 90, -90]) push('ramp', x, z, yaw);
    }
  }
  return rows;
}

function compact(row, item) {
  if (row.type !== 'shot') {
    return { kind: item.kind, x: item.x, z: item.z, yaw: item.yaw, rejected: row.error ?? 'rejected' };
  }
  const bodies = (row.contacts ?? []).map(contact => contact.body).filter(body => body.startsWith('worldcraft-object-'));
  return {
    kind: item.kind,
    x: item.x,
    z: item.z,
    yaw: item.yaw,
    elapsed: row.terminal.elapsed,
    position: row.terminal.position,
    contacted: bodies.length > 0,
    bodies,
  };
}

function hypot2(position, x, z) {
  return Math.hypot(position[0] - x, position[2] - z);
}

function componentSize(cells) {
  const keys = new Map(cells.map(cell => [`${cell.x}:${cell.z}:${cell.yaw}`, cell]));
  const seen = new Set();
  let largest = 0;
  let largestCells = [];
  for (const start of cells) {
    const startKey = `${start.x}:${start.z}:${start.yaw}`;
    if (seen.has(startKey)) continue;
    const stack = [start];
    const group = [];
    while (stack.length) {
      const cell = stack.pop();
      const key = `${cell.x}:${cell.z}:${cell.yaw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      group.push(cell);
      for (const other of cells) {
        const same = other.x === cell.x && other.z === cell.z && other.yaw === cell.yaw;
        if (same) continue;
        const dx = Math.abs(other.x - cell.x);
        const dz = Math.abs(other.z - cell.z);
        const dyaw = Math.abs(other.yaw - cell.yaw);
        const neighbours = (dx === 0 || dx === 4) && (dz === 0 || dz === 4) && (dyaw === 0 || dyaw === 20 || dyaw === 30);
        const changed = (dx > 0) + (dz > 0) + (dyaw > 0);
        if (neighbours && changed === 1 && keys.has(`${other.x}:${other.z}:${other.yaw}`)) stack.push(other);
      }
    }
    if (group.length > largest) {
      largest = group.length;
      largestCells = group;
    }
  }
  return { count: largest, cells: largestCells };
}

function span(cells, key) {
  const values = [...new Set(cells.map(cell => cell[key]))].sort((a, b) => a - b);
  return { min: values[0], max: values.at(-1), distinct: values.length, values };
}

function rank(shots, direct) {
  const ranked = [];
  for (const kind of ['block', 'bank', 'ramp']) {
    const poses = shots.filter(shot => shot.kind === kind && shot.position && shot.contacted);
    for (const radius of [3, 4, 5]) {
      for (let x = -20; x <= 20; x += 2) {
        for (let z = 18; z <= 78; z += 2) {
          const directDistance = hypot2(direct.position, x, z);
          if (directDistance <= radius + 6) continue;
          const inside = poses.filter(shot => hypot2(shot.position, x, z) <= radius);
          if (inside.length < 6) continue;
          const family = componentSize(inside);
          if (family.count < 6) continue;
          const xs = span(family.cells, 'x');
          const zs = span(family.cells, 'z');
          const yaws = span(family.cells, 'yaw');
          const axes = (xs.distinct > 1 ? 1 : 0) + (zs.distinct > 1 ? 1 : 0) + (yaws.distinct > 1 ? 1 : 0);
          if (axes < 2) continue;
          ranked.push({
            kind,
            circle: { x, z, r: radius },
            directDistance: Math.round(directDistance * 1000) / 1000,
            hits: inside.length,
            family: family.count,
            axes,
            x: xs,
            z: zs,
            yaw: yaws,
          });
        }
      }
    }
  }
  ranked.sort((a, b) => b.family - a.family || b.hits - a.hits || b.directDistance - a.directDistance);
  return ranked.slice(0, 25);
}

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const empty = presetFor([]);
const directRun = await runRange({
  preset: empty,
  setups: [LAUNCH],
  seed: SEED,
  havok,
  omitPoints: true,
  label: 'direct-empty',
});
const directRow = directRun.lines.find(line => line.type === 'shot');
if (!directRow) throw new Error('Direct shot did not resolve');
const direct = {
  elapsed: directRow.terminal.elapsed,
  position: directRow.terminal.position,
  reason: directRow.terminal.reason,
};

const planned = layouts();
const legal = planned.filter(item => item.preset);
const illegal = planned.length - legal.length;
process.stderr.write(`direct ${JSON.stringify(direct.position)} legal ${legal.length} illegal ${illegal}\n`);

const shots = [];
const batchSize = 80;
for (let offset = 0; offset < legal.length; offset += batchSize) {
  const batch = legal.slice(offset, offset + batchSize);
  const started = Date.now();
  const { lines, rejected } = await runRange({
    preset: batch[0].preset,
    setups: batch.map(() => LAUNCH),
    seed: SEED,
    havok,
    omitPoints: true,
    documentAt: (_setup, index) => batch[index].preset,
    labels: batch.map(item => `${item.kind}:${item.x}:${item.z}:${item.yaw}`),
  });
  const rows = lines.filter(line => line.type === 'shot' || line.type === 'rejected');
  if (rows.length !== batch.length) throw new Error(`Batch row mismatch ${rows.length} != ${batch.length}`);
  rows.forEach((row, index) => shots.push(compact(row, batch[index])));
  process.stderr.write(`batch ${offset + rows.length}/${legal.length} rejected ${rejected} ${Date.now() - started}ms\n`);
}

const contacted = shots.filter(shot => shot.contacted).length;
const summary = {
  seed: SEED,
  launch: LAUNCH,
  direct,
  planned: planned.length,
  illegal,
  fired: shots.length,
  contacted,
  top: rank(shots, direct),
  landings: shots.map(shot => ({
    kind: shot.kind,
    x: shot.x,
    z: shot.z,
    yaw: shot.yaw,
    contacted: Boolean(shot.contacted),
    position: shot.position ?? null,
    rejected: shot.rejected ?? null,
  })),
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary)}\n`);
process.stderr.write(`wrote ${outPath} top ${summary.top.length}\n`);
if (summary.top[0]) process.stderr.write(`${JSON.stringify(summary.top.slice(0, 8), null, 2)}\n`);
