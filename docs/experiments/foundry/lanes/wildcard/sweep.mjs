// Headless Havok search for The Other Way.
// The wall is three dull blocks. The opening aim is straight at the middle.
// A clear side or a clear carry reaches past the wall without touching a block.
// This file does not change physics. It writes a concise JSON summary.
//
//   node docs/experiments/foundry/lanes/wildcard/sweep.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { runRange } from '../../../../../scripts/range/run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED = 20261109;
const PRESET = JSON.parse(await readFile(new URL('../../../../../worlds/foundry/the-other-way/preset.json', import.meta.url), 'utf8'));
const middle = PRESET.objects.find(object => object.id === 'middle-stop');
const WALL_Z = middle.z;
const FACE_Z = WALL_Z - 2.5;
const BACK_Z = WALL_Z + 2.5;
const OPENING = {
  railIndex: 1,
  originX: PRESET.launcher.x,
  yaw: PRESET.rules.launcher.yaw,
  elevation: PRESET.rules.launcher.elevation,
  charge: PRESET.rules.launcher.charge,
};

function series(from, to, step, digits) {
  const count = Math.round((to - from) / step);
  return Array.from({ length: count + 1 }, (_, index) => Number((from + index * step).toFixed(digits)));
}

function pieceIds(contacts) {
  return [...new Set(contacts.map(contact => {
    const matched = /^worldcraft-object-(.+)$/.exec(contact.body);
    return matched ? matched[1] : null;
  }).filter(Boolean))];
}

function classify(shot) {
  const ids = pieceIds(shot.contacts);
  const [x, , z] = shot.terminal.position;
  const hit = name => ids.includes(name);
  const past = z > BACK_Z + 0.5;
  const side = x < -3 ? 'left' : x > 3 ? 'right' : 'middle';
  let kind = 'other';
  if (shot.terminal.reason !== 'first-ground-contact') kind = shot.terminal.reason;
  else if (hit('middle-stop') || hit('left-stop') || hit('right-stop')) {
    const names = ['left-stop', 'middle-stop', 'right-stop'].filter(hit);
    const which = names.length > 1 ? 'several' : names[0].replace('-stop', '');
    kind = past ? `skipped-${which}` : `met-${which}`;
  } else if (z < FACE_Z - 0.5) kind = side === 'middle' ? 'short' : `short-${side}`;
  else if (past) kind = side === 'middle' ? 'clear-over' : `clear-${side}`;
  else kind = `beside-${side}`;
  return { kind, ids, x, z, reason: shot.terminal.reason };
}

function rowOf(line) {
  if (line.type !== 'shot') return { label: line.label, rejected: line.error ?? line.type };
  const read = classify(line);
  return {
    label: line.label,
    setup: line.setup,
    kind: read.kind,
    ids: read.ids,
    x: read.x,
    z: read.z,
    elapsed: line.terminal.elapsed,
    position: line.terminal.position,
    reason: read.reason,
    outcome: { kind: line.outcome.kind, status: line.outcome.status },
    contacts: line.contacts.map(contact => ({ body: contact.body, count: contact.count, first: contact.first })),
  };
}

function countKinds(rows) {
  const counts = {};
  for (const row of rows) counts[row.kind ?? 'rejected'] = (counts[row.kind ?? 'rejected'] ?? 0) + 1;
  return counts;
}

function windows(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.kind) continue;
    const list = groups.get(row.kind) ?? [];
    list.push(row);
    groups.set(row.kind, list);
  }
  const result = {};
  for (const [kind, list] of groups) {
    const ordered = [...list].sort((a, b) => a.setup[key] - b.setup[key]);
    const spans = [];
    for (const row of ordered) {
      const value = row.setup[key];
      const last = spans.at(-1);
      const step = key === 'charge' ? 0.0101 : key === 'originX' ? 0.51 : 0.51;
      if (last && value - last.max <= step) {
        last.max = value;
        last.count += 1;
      last.zMin = Math.min(last.zMin, row.z);
      last.zMax = Math.max(last.zMax, row.z);
    } else spans.push({ min: value, max: value, count: 1, zMin: row.z, zMax: row.z, sampleX: row.x, reason: row.reason });
    }
    result[kind] = spans;
  }
  return result;
}

function medianRow(rows) {
  const ordered = [...rows].sort((a, b) => a.setup.yaw - b.setup.yaw);
  return ordered[Math.floor((ordered.length - 1) / 2)];
}

function brief(row) {
  if (!row || row.rejected) return row ?? null;
  return {
    label: row.label,
    setup: { originX: row.setup.originX, yaw: row.setup.yaw, elevation: row.setup.elevation, charge: row.setup.charge },
    kind: row.kind,
    ids: row.ids,
    terminal: { reason: row.reason, elapsed: row.elapsed, position: row.position },
    outcome: row.outcome,
    contacts: row.contacts,
  };
}

async function fire(havok, entries) {
  const { lines, rejected } = await runRange({
    preset: PRESET,
    setups: entries.map(entry => entry.setup),
    labels: entries.map(entry => entry.label),
    seed: SEED,
    havok,
    omitPoints: true,
    campaign: 'either-side',
  });
  return { rejected, rows: lines.filter(line => line.type !== 'provenance').map(rowOf) };
}

const wasm = await readFile(new URL('../../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });

const opening = OPENING;
const phaseOne = [
  { label: 'opening', setup: opening },
  ...series(-70, 70, 0.5, 1).map(yaw => ({ label: 'yaw', setup: { ...opening, yaw } })),
  ...series(-40, 40, 0.5, 1).map(yaw => ({ label: 'yaw-18', setup: { ...opening, yaw, elevation: 18 } })),
  ...series(-40, 40, 0.5, 1).map(yaw => ({ label: 'yaw-24', setup: { ...opening, yaw, elevation: 24 } })),
  ...series(5, 85, 0.5, 1).map(elevation => ({ label: 'elevation', setup: { ...opening, elevation } })),
  ...series(0.2, 1, 0.01, 2).map(charge => ({ label: 'charge', setup: { ...opening, charge } })),
  ...series(-10, 10, 0.5, 1).map(originX => ({ label: 'origin', setup: { ...opening, originX } })),
];
const first = await fire(havok, phaseOne);
const yawRows = first.rows.filter(row => row.label === 'yaw' && row.kind);
const clearLeft = yawRows.filter(row => row.kind === 'clear-left');
const clearRight = yawRows.filter(row => row.kind === 'clear-right');
const leftExample = medianRow(clearLeft);
const rightExample = medianRow(clearRight);

function neighbors(example, tag) {
  if (!example) return [];
  const base = example.setup;
  const entries = [];
  for (const yaw of [base.yaw - 0.5, base.yaw + 0.5]) entries.push({ label: `${tag}-yaw`, setup: { ...base, yaw: Number(yaw.toFixed(1)) } });
  for (const elevation of [base.elevation - 0.5, base.elevation + 0.5]) entries.push({ label: `${tag}-elevation`, setup: { ...base, elevation: Number(elevation.toFixed(1)) } });
  for (const charge of [Number((base.charge - 0.01).toFixed(2)), Number((base.charge + 0.01).toFixed(2))]) entries.push({ label: `${tag}-charge`, setup: { ...base, charge } });
  for (const originX of [base.originX - 0.5, base.originX + 0.5]) entries.push({ label: `${tag}-origin`, setup: { ...base, originX: Number(originX.toFixed(1)) } });
  if (tag !== 'opening') {
    for (const elevation of series(8, 40, 0.5, 1)) entries.push({ label: `${tag}-elevation-family`, setup: { ...base, elevation } });
    for (const charge of series(0.3, 0.9, 0.05, 2)) entries.push({ label: `${tag}-charge-family`, setup: { ...base, charge } });
  }
  return entries;
}

const overExample = { setup: { ...opening, elevation: 24 } };
const phaseTwo = [
  ...neighbors(first.rows.find(row => row.label === 'opening'), 'opening'),
  ...neighbors(leftExample, 'left'),
  ...neighbors(rightExample, 'right'),
  ...neighbors(overExample, 'over'),
];
const second = await fire(havok, phaseTwo);

const summary = {
  seed: SEED,
  wallZ: WALL_Z,
  shotCount: first.rows.length + second.rows.length,
  rejected: first.rejected + second.rejected,
  opening: brief(first.rows.find(row => row.label === 'opening')),
  yaw: { counts: countKinds(yawRows), windows: windows(yawRows, 'yaw') },
  yaw18: { counts: countKinds(first.rows.filter(row => row.label === 'yaw-18' && row.kind)), windows: windows(first.rows.filter(row => row.label === 'yaw-18' && row.kind), 'yaw') },
  yaw24: { counts: countKinds(first.rows.filter(row => row.label === 'yaw-24' && row.kind)), windows: windows(first.rows.filter(row => row.label === 'yaw-24' && row.kind), 'yaw') },
  elevation: { counts: countKinds(first.rows.filter(row => row.label === 'elevation' && row.kind)), windows: windows(first.rows.filter(row => row.label === 'elevation' && row.kind), 'elevation') },
  charge: { counts: countKinds(first.rows.filter(row => row.label === 'charge' && row.kind)), windows: windows(first.rows.filter(row => row.label === 'charge' && row.kind), 'charge') },
  origin: { counts: countKinds(first.rows.filter(row => row.label === 'origin' && row.kind)), windows: windows(first.rows.filter(row => row.label === 'origin' && row.kind), 'originX') },
  examples: {
    left: brief(leftExample),
    right: brief(rightExample),
    over: brief(first.rows.find(row => row.label === 'elevation' && row.setup?.elevation === 24)),
  },
  neighbors: {
    opening: second.rows.filter(row => row.label?.startsWith('opening-') && !row.label.includes('family')).map(brief),
    left: second.rows.filter(row => row.label?.startsWith('left-') && !row.label.includes('family')).map(brief),
    right: second.rows.filter(row => row.label?.startsWith('right-') && !row.label.includes('family')).map(brief),
    over: second.rows.filter(row => row.label?.startsWith('over-') && !row.label.includes('family')).map(brief),
  },
  families: {
    leftElevation: { counts: countKinds(second.rows.filter(row => row.label === 'left-elevation-family' && row.kind)), windows: windows(second.rows.filter(row => row.label === 'left-elevation-family' && row.kind), 'elevation') },
    rightElevation: { counts: countKinds(second.rows.filter(row => row.label === 'right-elevation-family' && row.kind)), windows: windows(second.rows.filter(row => row.label === 'right-elevation-family' && row.kind), 'elevation') },
    leftCharge: { counts: countKinds(second.rows.filter(row => row.label === 'left-charge-family' && row.kind)), windows: windows(second.rows.filter(row => row.label === 'left-charge-family' && row.kind), 'charge') },
    rightCharge: { counts: countKinds(second.rows.filter(row => row.label === 'right-charge-family' && row.kind)), windows: windows(second.rows.filter(row => row.label === 'right-charge-family' && row.kind), 'charge') },
  },
};

await writeFile(resolve(here, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  shotCount: summary.shotCount,
  rejected: summary.rejected,
  opening: summary.opening && { kind: summary.opening.kind, z: summary.opening.terminal.position[2], ids: summary.opening.ids },
  yaw: summary.yaw.counts,
  yawWindows: summary.yaw.windows,
  yaw18: summary.yaw18.windows,
  yaw24: summary.yaw24.windows,
  elevation: summary.elevation.counts,
  elevationWindows: summary.elevation.windows,
  charge: summary.charge.counts,
  origin: summary.origin.counts,
  examples: {
    left: summary.examples.left && { ...summary.examples.left.setup, kind: summary.examples.left.kind },
    right: summary.examples.right && { ...summary.examples.right.setup, kind: summary.examples.right.kind },
    over: summary.examples.over && { ...summary.examples.over.setup, kind: summary.examples.over.kind },
  },
  neighborKinds: Object.fromEntries(Object.entries(summary.neighbors).map(([key, rows]) => [key, rows.map(row => ({ ...row.setup, kind: row.kind }))])),
}, null, 2)}\n`);
