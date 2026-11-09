// Follow-up for The Carry at circle (0, 53) radius 2.5.
// Confirms block and bank bypasses, direct-aim widths, and exact terminals.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateRangePreset } from '../../lib/worldcraft-range.js';
import { runRange, rangeGitSha } from '../range/run.mjs';

const SEED = 20261109;
const LAUNCH = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.45 };
const CIRCLE = { x: 0, z: 53, r: 2.5 };
const outPath = resolve(import.meta.dirname, '../../docs/experiments/foundry/lanes/construction/followup-summary.json');

function series(from, to, step) {
  const count = Math.round((to - from) / step);
  return Array.from({ length: count + 1 }, (_, index) => Math.round((from + index * step) * 1e6) / 1e6);
}
function tidy(value) { return Math.round(value * 1e6) / 1e6; }
function dist(position) { return Math.hypot(position[0] - CIRCLE.x, position[2] - CIRCLE.z); }

function document(objects, launcher) {
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
      allowance: { ramp: 1, block: 1, bank: 1 },
      goal: { kind: 'first-ground-zone', ...CIRCLE },
    },
  });
}
const fixed = { fixed: true, yaw: 0, elevation: 18, charge: 0.45 };
const free = { fixed: false, yaw: 0, elevation: 18, charge: 0.45 };

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const gitSha = rangeGitSha();

async function fire(items) {
  const base = items[0].preset;
  const { lines } = await runRange({
    preset: base,
    setups: items.map(item => item.setup),
    seed: SEED,
    gitSha,
    havok,
    omitPoints: true,
    documentAt: (_setup, index) => items[index].preset,
    labels: items.map(item => item.label),
  });
  const rows = lines.filter(line => line.type === 'shot' || line.type === 'rejected');
  if (rows.length !== items.length) throw new Error(`row mismatch ${rows.length} != ${items.length}`);
  return rows.map((row, index) => {
    const item = items[index];
    if (row.type !== 'shot') return { label: item.label, meta: item.meta, rejected: row.error ?? 'rejected' };
    const bodies = (row.contacts ?? []).filter(contact => String(contact.body).startsWith('worldcraft-object-')).map(contact => contact.body);
    return {
      label: item.label,
      meta: item.meta,
      reason: row.terminal.reason,
      elapsed: row.terminal.elapsed,
      position: row.terminal.position,
      distance: dist(row.terminal.position),
      scored: row.outcome?.scored === true && row.outcome?.status === 'clear',
      status: row.outcome?.status ?? null,
      contacted: bodies.length > 0,
      bodies,
    };
  });
}

function ramp(pose) {
  return document([{ id: 'ramp-yours', kind: 'ramp', x: pose.x, z: pose.z, yaw: pose.yaw }], fixed);
}
function block(pose) {
  return document([{ id: 'stop', kind: 'block', x: pose.x, z: pose.z, yaw: pose.yaw }], fixed);
}
function bank(pose) {
  return document([{ id: 'cheek', kind: 'bank', x: pose.x, z: pose.z, yaw: pose.yaw }], fixed);
}

const named = [
  { label: 'opening', pose: { x: 0, z: 18, yaw: 0 } },
  { label: 'isolated', pose: { x: 0, z: 20, yaw: 0 } },
  { label: 'gap', pose: { x: 0, z: 20.5, yaw: 0 } },
  { label: 'band-near', pose: { x: 0, z: 24, yaw: 0 } },
  { label: 'band-mid', pose: { x: 0, z: 32, yaw: 0 } },
  { label: 'band-far', pose: { x: 0, z: 40, yaw: 0 } },
  { label: 'offset-x', pose: { x: 4, z: 32, yaw: 0 } },
  { label: 'turned', pose: { x: 0, z: 32, yaw: 5 } },
  { label: 'turned-out', pose: { x: 0, z: 32, yaw: 10 } },
  { label: 'x-edge', pose: { x: 4.5, z: 32, yaw: 0 } },
  { label: 'x-miss', pose: { x: 5, z: 32, yaw: 0 } },
  { label: 'empty', pose: null },
];
const namedItems = named.map(item => ({
  label: item.label,
  setup: LAUNCH,
  preset: item.pose ? ramp(item.pose) : document([], fixed),
  meta: { pose: item.pose },
}));
const namedShots = await fire(namedItems);

const blockItems = [];
for (const x of series(-3, 3, 0.5)) {
  for (const z of series(24, 36, 0.5)) {
    for (const yaw of series(-15, 15, 5)) {
      let preset;
      try { preset = block({ x, z, yaw }); } catch { continue; }
      blockItems.push({ label: 'block', setup: LAUNCH, preset, meta: { x, z, yaw } });
    }
  }
}
process.stderr.write(`blocks ${blockItems.length}\n`);
const blockShots = await fire(blockItems);
const blockHits = blockShots.filter(shot => shot.scored);
const blockNearest = blockShots.filter(shot => shot.position).sort((a, b) => a.distance - b.distance)[0];

const bankItems = [];
for (const x of series(-4, 4, 2)) {
  for (const z of series(18, 40, 2)) {
    for (const yaw of [-45, -30, -15, 0, 15, 30, 45]) {
      let preset;
      try { preset = bank({ x, z, yaw }); } catch { continue; }
      bankItems.push({ label: 'bank', setup: LAUNCH, preset, meta: { x, z, yaw } });
    }
  }
}
process.stderr.write(`banks ${bankItems.length}\n`);
const bankShots = await fire(bankItems);
const bankContacted = bankShots.filter(shot => shot.contacted).sort((a, b) => a.distance - b.distance);

const directItems = [];
const freePreset = document([], free);
for (const elevation of series(14, 34, 0.5)) {
  for (const charge of series(0.5, 0.78, 0.01)) {
    directItems.push({
      label: 'direct',
      setup: { railIndex: 1, originX: 0, yaw: 0, elevation, charge },
      preset: freePreset,
      meta: { yaw: 0, elevation, charge },
    });
  }
}
process.stderr.write(`direct ${directItems.length}\n`);
const directShots = await fire(directItems);
const directClears = directShots.filter(shot => shot.scored);
const directBest = directClears.slice().sort((a, b) => a.distance - b.distance)[0];

function width(samples, representative, step) {
  const ordered = samples.slice().sort((a, b) => a.value - b.value);
  const index = ordered.findIndex(sample => Math.abs(sample.value - representative) < 1e-6);
  if (index < 0 || !ordered[index].clear) return { clear: false, representative };
  let low = index;
  let high = index;
  const adjacent = (a, b) => Math.abs(Math.abs(b - a) - step) <= Math.abs(step) * 1e-6;
  while (low > 0 && ordered[low - 1].clear && adjacent(ordered[low - 1].value, ordered[low].value, step)) low -= 1;
  while (high < ordered.length - 1 && ordered[high + 1].clear && adjacent(ordered[high].value, ordered[high + 1].value, step)) high += 1;
  return {
    first: ordered[low].value,
    last: ordered[high].value,
    count: high - low + 1,
    width: tidy((high - low) * step),
    bracketLow: low > 0 && !ordered[low - 1].clear ? ordered[low - 1].value : null,
    bracketHigh: high < ordered.length - 1 && !ordered[high + 1].clear ? ordered[high + 1].value : null,
    censoredLow: low === 0,
    censoredHigh: high === ordered.length - 1,
  };
}

let directWidths = null;
if (directBest) {
  const yawScan = series(-8, 8, 0.5).map(yaw => ({ label: 'dyaw', setup: { railIndex: 1, originX: 0, yaw, elevation: directBest.meta.elevation, charge: directBest.meta.charge }, preset: freePreset, meta: { yaw } }));
  const elevScan = series(directBest.meta.elevation - 6, directBest.meta.elevation + 6, 0.5).map(elevation => ({ label: 'delev', setup: { railIndex: 1, originX: 0, yaw: 0, elevation, charge: directBest.meta.charge }, preset: freePreset, meta: { elevation } }));
  const chargeScan = series(tidy(directBest.meta.charge - 0.08), tidy(directBest.meta.charge + 0.08), 0.01).map(charge => ({ label: 'dcharge', setup: { railIndex: 1, originX: 0, yaw: 0, elevation: directBest.meta.elevation, charge }, preset: freePreset, meta: { charge } }));
  const scanned = await fire([...yawScan, ...elevScan, ...chargeScan]);
  directWidths = {
    setup: directBest.meta,
    distance: tidy(directBest.distance),
    position: directBest.position,
    elapsed: directBest.elapsed,
    yaw: width(scanned.filter(shot => shot.label === 'dyaw').map(shot => ({ value: shot.meta.yaw, clear: shot.scored })), 0, 0.5),
    elevation: width(scanned.filter(shot => shot.label === 'delev').map(shot => ({ value: shot.meta.elevation, clear: shot.scored })), directBest.meta.elevation, 0.5),
    charge: width(scanned.filter(shot => shot.label === 'dcharge').map(shot => ({ value: shot.meta.charge, clear: shot.scored })), directBest.meta.charge, 0.01),
    yaw0GridClears: directClears.length,
    yaw0GridFired: directShots.length,
  };
}

const slices = [];
for (const z of [24, 40]) {
  for (const x of series(-6, 6, 0.5)) slices.push({ label: `slice-x-${z}`, setup: LAUNCH, preset: ramp({ x, z, yaw: 0 }), meta: { x, z, yaw: 0, axis: 'x' } });
  for (const yaw of series(-20, 20, 5)) slices.push({ label: `slice-yaw-${z}`, setup: LAUNCH, preset: ramp({ x: 0, z, yaw }), meta: { x: 0, z, yaw, axis: 'yaw' } });
}
const sliceShots = await fire(slices);
const sliceWidths = {};
for (const z of [24, 40]) {
  sliceWidths[String(z)] = {
    x: width(sliceShots.filter(shot => shot.label === `slice-x-${z}`).map(shot => ({ value: shot.meta.x, clear: shot.scored })), 0, 0.5),
    yaw: width(sliceShots.filter(shot => shot.label === `slice-yaw-${z}`).map(shot => ({ value: shot.meta.yaw, clear: shot.scored })), 0, 5),
  };
}

function pack(shot) {
  return {
    label: shot.label,
    pose: shot.meta?.pose ?? null,
    reason: shot.reason,
    elapsed: shot.elapsed,
    position: shot.position,
    distance: shot.distance === undefined ? null : tidy(shot.distance),
    status: shot.status,
    contacted: shot.contacted,
    bodies: shot.bodies,
  };
}

const summary = {
  seed: SEED,
  gitSha,
  circle: CIRCLE,
  named: namedShots.map(pack),
  block: {
    fired: blockShots.length,
    scored: blockHits.length,
    nearest: blockNearest ? { ...blockNearest.meta, distance: tidy(blockNearest.distance), position: blockNearest.position, scored: blockNearest.scored } : null,
  },
  bank: {
    fired: bankShots.length,
    contacted: bankContacted.length,
    scored: bankShots.filter(shot => shot.scored).length,
    nearestContact: bankContacted[0] ? { ...bankContacted[0].meta, distance: tidy(bankContacted[0].distance), position: bankContacted[0].position } : null,
  },
  direct: directWidths,
  slices: sliceWidths,
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ named: summary.named, block: summary.block, bank: summary.bank, direct: summary.direct, slices: summary.slices }, null, 2)}\n`);
