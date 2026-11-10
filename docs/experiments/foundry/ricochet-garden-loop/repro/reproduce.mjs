// Independent reproduction of the Ricochet Garden — Loop evidence.
// One fresh Havok instance in this process. The seed is provenance only.
//
//   node docs/experiments/foundry/ricochet-garden-loop/repro/reproduce.mjs
//   node docs/experiments/foundry/ricochet-garden-loop/repro/reproduce.mjs --only families
//
// Field preset bytes are read from commit 308bdb9 (PR #69). They are not
// copied into worlds/. This file does not change physics or geometry.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { applyFoundryLayout } from '../../../../../lib/worldcraft-foundry.js';
import { WORLDCRAFT_CATALOG } from '../../../../../lib/worldcraft-model.js';
import { parseRangePreset } from '../../../../../lib/worldcraft-range.js';
import { runRange } from '../../../../../scripts/range/run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FIELD_SHA = '308bdb9c5007d0bf71048ea4024051b7e55781f3';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : 'all';

const FAMILIES = [
  { id: 'return', yaw: -1, elevation: 16, charge: 0.55, expected: ['bank-back', 'plate-hook'] },
  { id: 'loop', yaw: 5.5, elevation: 16, charge: 0.57, expected: ['bank-back', 'plate-corner-e', 'bank-back'] },
  { id: 'plates', yaw: 6, elevation: 14, charge: 0.55, expected: ['plate-hook', 'plate-side-e', 'plate-corner-e'] },
  { id: 'flank', yaw: -22, elevation: 16, charge: 0.55, expected: ['bank-flank', 'plate-side-w'] },
  { id: 'mouth', yaw: -12, elevation: 12, charge: 0.55, expected: ['plate-mouth-w'] },
  {
    id: 'bank-turned',
    yaw: -4,
    elevation: 16,
    charge: 0.55,
    layout: { objects: [{ id: 'bank-back', x: 0, z: 34, yaw: -30 }] },
    expected: ['bank-back', 'plate-hook', 'bank-back'],
  },
];

const OPENING = {
  id: 'opening',
  yaw: 0,
  elevation: 18,
  charge: 0.55,
  expected: ['bank-back', 'plate-hook', 'plate-side-w'],
  droppedAt: [
    { axis: 'yaw', value: -0.5 },
    { axis: 'elevation', value: 17.5 },
    { axis: 'charge', value: 0.54 },
  ],
};

function series(from, to, step) {
  const values = [];
  const n = Math.round((to - from) / step);
  for (let i = 0; i <= n; i += 1) values.push(Math.round((from + i * step) * 1000) / 1000);
  return values;
}

function setupOf(aim) {
  return { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge };
}

function neighboursOf(aim) {
  return [
    { axis: 'yaw', value: Math.round((aim.yaw - 0.5) * 10) / 10 },
    { axis: 'yaw', value: Math.round((aim.yaw + 0.5) * 10) / 10 },
    { axis: 'elevation', value: Math.round((aim.elevation - 0.5) * 10) / 10 },
    { axis: 'elevation', value: Math.round((aim.elevation + 0.5) * 10) / 10 },
    { axis: 'charge', value: Math.round((aim.charge - 0.01) * 100) / 100 },
    { axis: 'charge', value: Math.round((aim.charge + 0.01) * 100) / 100 },
  ].map(step => ({ ...aim, [step.axis]: step.value, axis: step.axis, value: step.value }));
}

function pieceOrder(contacts) {
  const ids = [];
  const points = [];
  for (const row of contacts ?? []) {
    if (!row || typeof row.body !== 'string' || !row.body.startsWith('worldcraft-object-')) continue;
    ids.push(row.body.slice('worldcraft-object-'.length));
    points.push(row.point);
  }
  return { ids, points, order: ids.length ? ids.join(' > ') : '(no piece)' };
}

function toLocal(piece, point) {
  const spec = WORLDCRAFT_CATALOG[piece.kind];
  const rotation = Quaternion.RotationYawPitchRoll(piece.yaw * Math.PI / 180, (spec.pitch ?? 0) * Math.PI / 180, 0);
  const inverse = Quaternion.Inverse(rotation);
  const local = new Vector3(point.x - piece.x, point.y - spec.centerY, point.z - piece.z);
  local.rotateByQuaternionToRef(inverse, local);
  return { spec, local };
}

/** Distance to a width face, a depth face, and the top, in the piece frame. */
function clearances(piece, point) {
  const { spec, local } = toLocal(piece, point);
  return {
    width: spec.width / 2 - Math.abs(local.x),
    depth: spec.depth / 2 - Math.abs(local.z),
    top: spec.height / 2 - local.y,
  };
}

function flagsOf(ids, points, pieces) {
  let edge = false;
  let edgeDepth = false;
  const byId = new Map(pieces.map(piece => [piece.id, piece]));
  for (let i = 0; i < ids.length; i += 1) {
    const piece = byId.get(ids[i]);
    const point = points[i];
    if (!piece || !point) continue;
    const gap = clearances(piece, point);
    if (gap.width <= 0.7 || gap.top <= 0.55) edge = true;
    if (gap.width <= 0.7 || gap.depth <= 0.7 || gap.top <= 0.55) edgeDepth = true;
  }
  let repeat = false;
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) repeat = true;
    seen.add(id);
  }
  let uprange = false;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i - 1] && points[i] && points[i - 1].z - points[i].z > 1.5) uprange = true;
  }
  let loop = false;
  for (let i = 0; i < ids.length - 2; i += 1) {
    if (ids[i] === ids[i + 2] && ids[i] !== ids[i + 1]) loop = true;
  }
  const rebound = ids.length >= 2;
  const ret = repeat || uprange;
  return {
    edge,
    edgeDepth,
    rebound,
    return: ret,
    repeat,
    uprange,
    loop,
    chaotic: ids.length >= 7,
    interesting: edge || rebound || ret,
    contacts: ids.length,
  };
}

function share(count, shots) {
  return Math.round((count / shots) * 10000) / 10000;
}

function summarize(rows) {
  const orders = new Map();
  const histogram = {};
  const pieceHits = {};
  const totals = { edge: 0, edgeDepth: 0, rebound: 0, return: 0, repeat: 0, uprange: 0, loop: 0, chaotic: 0, interesting: 0, multi: 0 };
  for (const row of rows) {
    const bucket = orders.get(row.order) ?? { order: row.order, count: 0, loops: 0, returns: 0, edges: 0, yaw: [row.yaw, row.yaw], elevation: [row.elevation, row.elevation], charge: [row.charge, row.charge] };
    bucket.count += 1;
    if (row.flags.loop) bucket.loops += 1;
    if (row.flags.return) bucket.returns += 1;
    if (row.flags.edge) bucket.edges += 1;
    bucket.yaw = [Math.min(bucket.yaw[0], row.yaw), Math.max(bucket.yaw[1], row.yaw)];
    bucket.elevation = [Math.min(bucket.elevation[0], row.elevation), Math.max(bucket.elevation[1], row.elevation)];
    bucket.charge = [Math.min(bucket.charge[0], row.charge), Math.max(bucket.charge[1], row.charge)];
    orders.set(row.order, bucket);
    histogram[row.flags.contacts] = (histogram[row.flags.contacts] ?? 0) + 1;
    for (const id of new Set(row.ids)) pieceHits[id] = (pieceHits[id] ?? 0) + 1;
    if (row.flags.contacts >= 2) totals.multi += 1;
    for (const key of ['edge', 'edgeDepth', 'rebound', 'return', 'repeat', 'uprange', 'loop', 'chaotic', 'interesting']) {
      if (row.flags[key]) totals[key] += 1;
    }
  }
  const shots = rows.length;
  const families = [...orders.values()].sort((a, b) => b.count - a.count || (a.order < b.order ? -1 : 1));
  return {
    shots,
    distinctOrders: orders.size,
    multi: totals.multi,
    multiShare: share(totals.multi, shots),
    return: totals.return,
    returnShare: share(totals.return, shots),
    repeat: totals.repeat,
    uprange: totals.uprange,
    loop: totals.loop,
    edge: totals.edge,
    edgeShare: share(totals.edge, shots),
    edgeIfDepthFacesCount: totals.edgeDepth,
    rebound: totals.rebound,
    interesting: totals.interesting,
    interestingShare: share(totals.interesting, shots),
    chaotic: totals.chaotic,
    histogram,
    pieceHits,
    families: families.filter(family => family.count >= 6).map(family => ({
      order: family.order,
      count: family.count,
      loops: family.loops,
      returns: family.returns,
      edges: family.edges,
      yaw: family.yaw,
      elevation: family.elevation,
      charge: family.charge,
    })),
  };
}

function classifyShot(shot, aim) {
  const pieces = shot.worldSnapshot?.world?.objects ?? [];
  const { ids, points, order } = pieceOrder(shot.contacts);
  return {
    yaw: aim.yaw,
    elevation: aim.elevation,
    charge: aim.charge,
    ids,
    order,
    points,
    flags: flagsOf(ids, points, pieces),
    terminal: shot.terminal,
  };
}

async function fire(preset, aims, seed, havok) {
  const { lines, rejected } = await runRange({
    preset,
    setups: aims.map(setupOf),
    seed,
    havok,
    omitPoints: true,
    documentAt: (_setup, index) => (aims[index].layout ? applyFoundryLayout(preset, aims[index].layout).preset : preset),
  });
  const shots = lines.filter(line => line.type === 'shot');
  if (shots.length !== aims.length) throw new Error(`Expected ${aims.length} shots, got ${shots.length} (${rejected} rejected)`);
  return { rows: shots.map((shot, index) => classifyShot(shot, aims[index])), rejected, provenance: lines[0] };
}

function sameTerminal(actual, expected) {
  if (!actual || !expected) return false;
  return actual.reason === expected.reason
    && Object.is(actual.elapsed, expected.elapsed)
    && actual.position.length === expected.position.length
    && actual.position.every((item, index) => Object.is(item, expected.position[index]));
}

function familyReport(spec, rows, aims) {
  const center = rows[0];
  const steps = rows.slice(1);
  const stepAims = aims.slice(1);
  const expectedOrder = spec.expected.join(' > ');
  return {
    id: spec.id,
    aim: { yaw: spec.yaw, elevation: spec.elevation, charge: spec.charge, layout: spec.layout ?? null },
    expectedOrder,
    order: center.order,
    orderMatches: center.order === expectedOrder,
    terminal: center.terminal,
    neighbours: steps.map((step, index) => ({
      axis: stepAims[index].axis,
      value: stepAims[index].value,
      order: step.order,
      exact: step.order === center.order,
    })),
    exactNeighbours: steps.filter(step => step.order === center.order).length,
  };
}

async function loadFieldPreset() {
  const text = execFileSync('git', ['show', `${FIELD_SHA}:worlds/foundry/ricochet-garden-field/preset.json`], { encoding: 'utf8' });
  return { text, preset: parseRangePreset(text) };
}

async function main() {
  const started = performance.now();
  const loopText = await readFile(resolve(here, '../../../../../worlds/foundry/ricochet-garden-loop/preset.json'), 'utf8');
  const loopManifest = JSON.parse(await readFile(resolve(here, '../../../../../worlds/foundry/ricochet-garden-loop/manifest.json'), 'utf8'));
  const loopPreset = parseRangePreset(loopText);
  const wasm = await readFile(new URL('../../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
  const havok = await Havok({ wasmBinary: wasm });

  const report = {
    seedAppliedToSolver: false,
    freshHavokProcess: true,
    definitions: {
      order: 'Piece contacts in ledger order. Ground and the tee omitted. Repeats kept.',
      edge: 'Contact point within 0.7 m of a width face (local x) or 0.55 m of the top (local y). Depth faces are counted separately and are not the published edge.',
      rebound: 'Two or more piece contacts.',
      return: 'A piece id repeats, or a later contact is more than 1.5 m uprange (smaller z) than the previous one.',
      loop: 'A consecutive triple: a piece, then a different piece, then the first piece again.',
      chaotic: 'Seven or more piece contacts.',
      interesting: 'An edge, a rebound, or a return.',
      neighbour: 'One slider step: 0.5° yaw, 0.5° elevation, or 0.01 charge. Exact means the piece order matches the centre.',
    },
  };

  if (only === 'all' || only === 'families') {
    const aims = [];
    for (const family of [OPENING, ...FAMILIES]) {
      aims.push({ ...family, axis: 'center', value: null });
      for (const step of neighboursOf(family)) aims.push({ ...family, ...step });
    }
    const fired = await fire(loopPreset, aims, loopManifest.seed, havok);
    const byId = new Map();
    let cursor = 0;
    for (const family of [OPENING, ...FAMILIES]) {
      byId.set(family.id, familyReport(family, fired.rows.slice(cursor, cursor + 7), aims.slice(cursor, cursor + 7)));
      cursor += 7;
    }
    const opening = byId.get('opening');
    const dropped = opening.neighbours.filter(step => OPENING.droppedAt.some(item => item.axis === step.axis && item.value === step.value));
    report.families = {
      rejected: fired.rejected,
      provenance: { gitSha: fired.provenance.gitSha, seed: fired.provenance.seed, physics: fired.provenance.physics, node: fired.provenance.node },
      opening: {
        ...opening,
        claimedExactNeighbours: 3,
        droppedThirdContact: dropped.map(step => ({
          axis: step.axis,
          value: step.value,
          order: step.order,
          dropped: step.order === 'bank-back > plate-hook',
        })),
      },
      starters: FAMILIES.map(family => {
        const row = byId.get(family.id);
        const manifest = loopManifest.testedShots.find(shot => shot.id === family.id);
        return { ...row, terminalMatchesManifest: sameTerminal(row.terminal, manifest.terminal) };
      }),
    };
  }

  if (only === 'all' || only === 'grid') {
    const yaws = series(-24, 24, 2);
    const elevs = [8, 12, 16, 20, 24, 30, 40];
    const charges = [0.35, 0.45, 0.55, 0.65, 0.8];
    const aims = [];
    for (const yaw of yaws) for (const elevation of elevs) for (const charge of charges) aims.push({ yaw, elevation, charge });
    const loopGrid = await fire(loopPreset, aims, loopManifest.seed, havok);
    report.loopGrid = {
      world: 'ricochet-garden-loop',
      rejected: loopGrid.rejected,
      yaws: yaws.length,
      elevs: elevs.length,
      charges: charges.length,
      summary: summarize(loopGrid.rows),
      claimed: { distinctOrders: 47, multi: 107, return: 67, loop: 16, edge: 232, rebound: 107, interesting: 263, chaotic: 0, repeat: 16, uprange: 64, misses: 480 },
    };
    const field = await loadFieldPreset();
    const fieldGrid = await fire(field.preset, aims, 20261109, havok);
    report.fieldGrid = {
      world: 'ricochet-garden-field',
      sourceSha: FIELD_SHA,
      presetBytes: new TextEncoder().encode(field.text).length,
      rejected: fieldGrid.rejected,
      summary: summarize(fieldGrid.rows),
    };
  }

  report.seconds = Math.round((performance.now() - started) / 10) / 100;
  const out = resolve(here, 'results.json');
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${out}\n${JSON.stringify({
    families: report.families?.starters?.map(row => ({ id: row.id, order: row.order, exact: row.exactNeighbours, terminal: row.terminalMatchesManifest })),
    opening: report.families?.opening ? { order: report.families.opening.order, exact: report.families.opening.exactNeighbours } : null,
    loop: report.loopGrid ? (({ distinctOrders, multi, loop, chaotic, edge, return: ret }) => ({ distinctOrders, multi, loop, chaotic, edge, return: ret }))(report.loopGrid.summary) : null,
    field: report.fieldGrid ? (({ distinctOrders, multi, loop, chaotic, edge, rebound, return: ret }) => ({ distinctOrders, multi, loop, chaotic, edge, rebound, return: ret }))(report.fieldGrid.summary) : null,
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
