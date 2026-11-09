// Construction lane measurement for The Carry.
// One locked shot. The ramp moves. Direct aims are a separate free-launcher preset.
// The seed is provenance. It is not applied to the solver.
//
//   node scripts/foundry/construction-sweep.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Havok from '@babylonjs/havok';
import { validateWorldcraftShot } from '../../lib/worldcraft-model.js';
import { adaptRangePreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { runRange, rangeGitSha } from '../range/run.mjs';

const SEED = 20261109;
const LAUNCH = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.45 };
const CIRCLE = { x: 0, z: 53, r: 5 };
const outPath = resolve(import.meta.dirname, '../../docs/experiments/foundry/lanes/construction/sweep-summary.json');

function series(from, to, step) {
  const count = Math.round((to - from) / step);
  return Array.from({ length: count + 1 }, (_, index) => Math.round((from + index * step) * 1e6) / 1e6);
}
function tidy(value) {
  return Math.round(value * 1e6) / 1e6;
}
function dist(position, circle = CIRCLE) {
  return Math.hypot(position[0] - circle.x, position[2] - circle.z);
}
function preset(objects, launcher) {
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
      fixed: objects.filter(object => object.locked).map(object => object.id),
      allowance: { ramp: 1, block: 1, bank: 1 },
      goal: { kind: 'first-ground-zone', ...CIRCLE },
    },
  });
}
function rampPreset(pose) {
  try {
    return preset([{ id: 'ramp-yours', kind: 'ramp', x: pose.x, z: pose.z, yaw: pose.yaw }], {
      fixed: true, yaw: LAUNCH.yaw, elevation: LAUNCH.elevation, charge: LAUNCH.charge,
    });
  } catch {
    return null;
  }
}
function piecePreset(kind, pose) {
  const object = { id: 'yours', kind, x: pose.x, z: pose.z, yaw: pose.yaw };
  try {
    return preset([object], { fixed: true, yaw: LAUNCH.yaw, elevation: LAUNCH.elevation, charge: LAUNCH.charge });
  } catch {
    return null;
  }
}

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const gitSha = rangeGitSha();

async function fire(base, items) {
  const shots = [];
  const batchSize = 400;
  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    const started = Date.now();
    const { lines } = await runRange({
      preset: base,
      setups: batch.map(item => item.setup),
      seed: SEED,
      gitSha,
      havok,
      omitPoints: true,
      documentAt: batch.some(item => item.preset) ? (_setup, index) => batch[index].preset ?? base : null,
      labels: batch.map(item => item.label),
    });
    const rows = lines.filter(line => line.type === 'shot' || line.type === 'rejected');
    if (rows.length !== batch.length) throw new Error(`Row mismatch ${rows.length} != ${batch.length}`);
    rows.forEach((row, index) => {
      const item = batch[index];
      if (row.type !== 'shot') {
        shots.push({ ...item.meta, label: item.label, rejected: row.error ?? 'rejected' });
        return;
      }
      const bodies = (row.contacts ?? []).map(contact => contact.body).filter(body => String(body).startsWith('worldcraft-object-'));
      shots.push({
        ...item.meta,
        label: item.label,
        elapsed: row.terminal.elapsed,
        position: row.terminal.position,
        reason: row.terminal.reason,
        distance: dist(row.terminal.position),
        contacted: bodies.length > 0,
        bodies,
        scored: row.outcome?.scored === true,
      });
    });
    process.stderr.write(`${batch[0].label.split(':')[0]} ${offset + batch.length}/${items.length} ${Date.now() - started}ms\n`);
  }
  return shots;
}

function inside(shot, radius) {
  return shot.position && shot.distance <= radius + 1e-9;
}

function familyOf(shots, radius) {
  const clears = shots.filter(shot => shot.contacted && inside(shot, radius) && !shot.rejected);
  const keys = new Map(clears.map(shot => [`${shot.x}:${shot.z}:${shot.yaw}`, shot]));
  const seen = new Set();
  let best = [];
  for (const start of clears) {
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
      for (const [dx, dz, dyaw] of [[0.5, 0, 0], [-0.5, 0, 0], [0, 0.5, 0], [0, -0.5, 0], [0, 0, 5], [0, 0, -5]]) {
        const next = keys.get(`${tidy(cell.x + dx)}:${tidy(cell.z + dz)}:${tidy(cell.yaw + dyaw)}`);
        if (next) stack.push(next);
      }
    }
    if (group.length > best.length) best = group;
  }
  const values = key => [...new Set(best.map(shot => shot[key]))].sort((a, b) => a - b);
  return {
    count: best.length,
    x: values('x'),
    z: values('z'),
    yaw: values('yaw'),
    nearest: best.reduce((bestShot, shot) => shot.distance < bestShot.distance ? shot : bestShot, best[0] ?? null),
    farthest: best.reduce((bestShot, shot) => shot.distance > bestShot.distance ? shot : bestShot, best[0] ?? null),
  };
}

function axisWidth(shots, field, representative, step, radius) {
  const samples = shots
    .filter(shot => shot[field] !== undefined)
    .map(shot => ({ value: shot[field], clear: Boolean(shot.contacted && inside(shot, radius)) }))
    .sort((a, b) => a.value - b.value);
  const index = samples.findIndex(sample => Math.abs(sample.value - representative) < 1e-6);
  if (index < 0) return { error: 'representative missing' };
  if (!samples[index].clear) return { clear: false, value: representative };
  let low = index;
  let high = index;
  const adjacent = (a, b) => Math.abs(Math.abs(b - a) - step) <= Math.abs(step) * 1e-6;
  while (low > 0 && samples[low - 1].clear && adjacent(samples[low - 1].value, samples[low].value, step)) low -= 1;
  while (high < samples.length - 1 && samples[high + 1].clear && adjacent(samples[high].value, samples[high + 1].value, step)) high += 1;
  return {
    first: samples[low].value,
    last: samples[high].value,
    count: high - low + 1,
    width: tidy((high - low) * step),
    step,
    bracketLow: low > 0 && !samples[low - 1].clear ? samples[low - 1].value : null,
    bracketHigh: high < samples.length - 1 && !samples[high + 1].clear ? samples[high + 1].value : null,
    censoredLow: low === 0,
    censoredHigh: high === samples.length - 1,
  };
}

const fixedLauncher = { fixed: true, yaw: LAUNCH.yaw, elevation: LAUNCH.elevation, charge: LAUNCH.charge };
const emptyPreset = preset([], fixedLauncher);
const rampPoses = [];
for (const x of series(-6, 6, 0.5)) {
  for (const z of series(16, 46, 0.5)) {
    for (const yaw of series(-25, 25, 5)) rampPoses.push({ x, z, yaw });
  }
}
const rampItems = [];
let rampIllegal = 0;
for (const pose of rampPoses) {
  const document = rampPreset(pose);
  if (!document) { rampIllegal += 1; continue; }
  rampItems.push({
    setup: LAUNCH,
    preset: document,
    label: `ramp:${pose.x}:${pose.z}:${pose.yaw}`,
    meta: { kind: 'ramp', ...pose },
  });
}
const rampShots = await fire(rampItems[0].preset, rampItems);

const extraYaw = [];
for (const x of series(-6, 6, 2)) {
  for (const z of series(20, 46, 2)) {
    for (const yaw of [-90, -60, -45, -30, 30, 45, 60, 90]) {
      const document = rampPreset({ x, z, yaw });
      if (!document) continue;
      extraYaw.push({ setup: LAUNCH, preset: document, label: `extra:${x}:${z}:${yaw}`, meta: { kind: 'ramp-extra', x, z, yaw } });
    }
  }
}
const extraShots = await fire(extraYaw[0].preset, extraYaw);

const blockItems = [];
for (const x of series(-4, 4, 2)) {
  for (const z of series(20, 50, 2)) {
    for (const yaw of series(-30, 30, 15)) {
      const document = piecePreset('block', { x, z, yaw });
      if (!document) continue;
      blockItems.push({ setup: LAUNCH, preset: document, label: `block:${x}:${z}:${yaw}`, meta: { kind: 'block', x, z, yaw } });
    }
  }
}
const blockShots = await fire(blockItems[0].preset, blockItems);

const bankItems = [];
for (const x of series(-8, 8, 4)) {
  for (const z of series(16, 40, 4)) {
    for (const yaw of series(-60, 60, 15)) {
      const document = piecePreset('bank', { x, z, yaw });
      if (!document) continue;
      bankItems.push({ setup: LAUNCH, preset: document, label: `bank:${x}:${z}:${yaw}`, meta: { kind: 'bank', x, z, yaw } });
    }
  }
}
const bankShots = await fire(bankItems[0].preset, bankItems);

const emptyShot = (await fire(emptyPreset, [{ setup: LAUNCH, preset: emptyPreset, label: 'empty', meta: { kind: 'empty' } }]))[0];

const line = rampShots.filter(shot => shot.x === 0 && shot.yaw === 0 && shot.position).sort((a, b) => a.z - b.z);
const firstHit = line.find(shot => shot.contacted);
const yaw0Clears = rampShots.filter(shot => shot.x === 0 && shot.yaw === 0 && shot.contacted && shot.distance <= 5);
const bandZ = yaw0Clears.map(shot => shot.z).sort((a, b) => a - b);

const radii = [2.5, 3, 3.5, 4, 4.5, 5];
const families = Object.fromEntries(radii.map(radius => {
  const family = familyOf(rampShots, radius);
  const untouched = rampShots.filter(shot => !shot.contacted && inside(shot, radius));
  return [String(radius), {
    family: family.count,
    x: family.x.length ? [family.x[0], family.x.at(-1), family.x.length] : null,
    z: family.z.length ? [family.z[0], family.z.at(-1), family.z.length] : null,
    yaw: family.yaw,
    nearest: family.nearest ? { x: family.nearest.x, z: family.nearest.z, yaw: family.nearest.yaw, distance: tidy(family.nearest.distance), position: family.nearest.position } : null,
    farthest: family.farthest ? { distance: tidy(family.farthest.distance), x: family.farthest.x, z: family.farthest.z, yaw: family.farthest.yaw } : null,
    untouchedClears: untouched.length,
  }];
}));

const rep = rampShots.find(shot => shot.x === 0 && shot.yaw === 0 && shot.z === 36) ?? yaw0Clears[Math.floor(yaw0Clears.length / 2)];
const axisItems = [];
if (rep) {
  for (const x of series(-8, 8, 0.5)) axisItems.push({ field: 'x', pose: { x, z: rep.z, yaw: rep.yaw } });
  for (const z of series(16, 50, 0.5)) axisItems.push({ field: 'z', pose: { x: rep.x, z, yaw: rep.yaw } });
  for (const yaw of series(-40, 40, 5)) axisItems.push({ field: 'yaw', pose: { x: rep.x, z: rep.z, yaw } });
}
const axisShots = [];
const axisLegal = [];
for (const item of axisItems) {
  const document = rampPreset(item.pose);
  if (!document) continue;
  axisLegal.push({ setup: LAUNCH, preset: document, label: `axis-${item.field}`, meta: { field: item.field, ...item.pose } });
}
const axisFired = await fire(axisLegal[0].preset, axisLegal);
for (const shot of axisFired) axisShots.push(shot);

const widths = {};
for (const radius of radii) {
  widths[String(radius)] = {
    x: axisWidth(axisShots.filter(shot => shot.field === 'x'), 'x', rep.x, 0.5, radius),
    z: axisWidth(axisShots.filter(shot => shot.field === 'z'), 'z', rep.z, 0.5, radius),
    yaw: axisWidth(axisShots.filter(shot => shot.field === 'yaw'), 'yaw', rep.yaw, 5, radius),
  };
}

const freePreset = preset([], { fixed: false, yaw: 0, elevation: 18, charge: 0.45 });
const coarse = [];
for (const yaw of series(-12, 12, 2)) {
  for (const elevation of series(8, 40, 2)) {
    for (const charge of series(0.3, 0.9, 0.05)) {
      coarse.push({ setup: { railIndex: 1, originX: 0, yaw, elevation, charge }, label: 'direct-coarse', meta: { kind: 'direct', yaw, elevation, charge } });
    }
  }
}
const coarseShots = await fire(freePreset, coarse.map(item => ({ ...item, preset: freePreset })));
const coarseClears = coarseShots.filter(shot => shot.scored);
const refineKeys = new Set();
const refine = [];
for (const hit of coarseClears) {
  for (const yaw of series(hit.yaw - 2, hit.yaw + 2, 0.5)) {
    for (const elevation of series(hit.elevation - 2, hit.elevation + 2, 0.5)) {
      for (const charge of series(tidy(hit.charge - 0.04), tidy(hit.charge + 0.04), 0.01)) {
        if (yaw < -70 || yaw > 70 || elevation < 5 || elevation > 85 || charge < 0 || charge > 1) continue;
        const key = `${yaw}:${elevation}:${charge}`;
        if (refineKeys.has(key)) continue;
        refineKeys.add(key);
        refine.push({ setup: { railIndex: 1, originX: 0, yaw, elevation, charge }, preset: freePreset, label: 'direct-fine', meta: { kind: 'direct', yaw, elevation, charge } });
      }
    }
  }
}
const fineShots = refine.length ? await fire(freePreset, refine) : [];
const directClears = fineShots.filter(shot => shot.scored);

const fixedWorld = adaptRangePreset(emptyPreset).world;
const rejectedAims = [];
for (const setup of [
  { ...LAUNCH, yaw: 0.5 },
  { ...LAUNCH, yaw: -0.5 },
  { ...LAUNCH, elevation: 18.5 },
  { ...LAUNCH, charge: 0.46 },
  ...(directClears[0] ? [{ railIndex: 1, originX: 0, yaw: directClears[0].yaw, elevation: directClears[0].elevation, charge: directClears[0].charge }] : []),
]) {
  try {
    validateWorldcraftShot(fixedWorld, setup);
    rejectedAims.push({ setup, rejected: false });
  } catch (error) {
    rejectedAims.push({ setup, rejected: true, error: error.message });
  }
}

const blockNear = blockShots.filter(shot => shot.position).sort((a, b) => a.distance - b.distance).slice(0, 5);
const bankNear = bankShots.filter(shot => shot.position).sort((a, b) => a.distance - b.distance).slice(0, 5);
const extraNear = extraShots.filter(shot => shot.position && shot.contacted).sort((a, b) => a.distance - b.distance).slice(0, 8);

function briefShot(shot) {
  if (!shot) return null;
  return {
    x: shot.x, z: shot.z, yaw: shot.yaw,
    distance: shot.distance === undefined ? null : tidy(shot.distance),
    position: shot.position ?? null,
    contacted: shot.contacted ?? null,
    elapsed: shot.elapsed ?? null,
    scored: shot.scored ?? null,
  };
}

const summary = {
  seed: SEED,
  gitSha,
  launch: LAUNCH,
  circle: CIRCLE,
  directEmpty: briefShot(emptyShot),
  ramp: {
    planned: rampPoses.length,
    illegal: rampIllegal,
    fired: rampShots.length,
    contacted: rampShots.filter(shot => shot.contacted).length,
    lineYaw0: line.map(shot => ({ z: shot.z, contacted: shot.contacted, distance: tidy(shot.distance), landZ: tidy(shot.position[2]), landX: tidy(shot.position[0]) })),
    firstContactZ: firstHit?.z ?? null,
    yaw0ClearZ: bandZ.length ? [bandZ[0], bandZ.at(-1), bandZ.length] : null,
    families,
    representative: briefShot(rep),
    widths,
  },
  extraYaw: {
    fired: extraShots.length,
    scored: extraShots.filter(shot => shot.scored).length,
    nearest: extraNear.map(briefShot),
  },
  block: {
    fired: blockShots.length,
    scored: blockShots.filter(shot => shot.scored).length,
    nearest: blockNear.map(briefShot),
  },
  bank: {
    fired: bankShots.length,
    scored: bankShots.filter(shot => shot.scored).length,
    nearest: bankNear.map(briefShot),
  },
  directBypass: {
    coarseFired: coarseShots.length,
    coarseClears: coarseClears.length,
    fineFired: fineShots.length,
    fineClears: directClears.length,
    fineNearest: briefShot(directClears.slice().sort((a, b) => a.distance - b.distance)[0]),
    yawSpan: directClears.length ? [Math.min(...directClears.map(shot => shot.yaw)), Math.max(...directClears.map(shot => shot.yaw))] : null,
    elevationSpan: directClears.length ? [Math.min(...directClears.map(shot => shot.elevation)), Math.max(...directClears.map(shot => shot.elevation))] : null,
    chargeSpan: directClears.length ? [Math.min(...directClears.map(shot => shot.charge)), Math.max(...directClears.map(shot => shot.charge))] : null,
    fixedLauncherRejects: rejectedAims,
  },
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stderr.write(`wrote ${outPath}\n`);
process.stdout.write(`${JSON.stringify({
  empty: summary.directEmpty,
  firstContactZ: summary.ramp.firstContactZ,
  yaw0ClearZ: summary.ramp.yaw0ClearZ,
  families: summary.ramp.families,
  widths: summary.ramp.widths,
  blockScored: summary.block.scored,
  bankScored: summary.bank.scored,
  extraScored: summary.extraYaw.scored,
  directFineClears: summary.directBypass.fineClears,
  directNearest: summary.directBypass.fineNearest,
  directSpans: { yaw: summary.directBypass.yawSpan, elevation: summary.directBypass.elevationSpan, charge: summary.directBypass.chargeSpan },
}, null, 2)}\n`);
