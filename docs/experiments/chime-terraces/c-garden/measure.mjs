// Chime Terraces lane C measurement. Real Havok through createRangeHarness.
// The seed is provenance only. It is not applied to the solver.
//
//   node docs/experiments/chime-terraces/c-garden/measure.mjs
//
// Grid is the Ricochet Loop 875-shot grid: yaw -24..24 step 2, the seven
// elevations, the five charges. One-step nudges are 0.5° and 0.01 charge.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../../../lib/rail-golf-v02.js';
import { validateWorldcraftShot } from '../../../../lib/worldcraft-model.js';
import { adaptRangePreset, validateRangePreset } from '../../../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../../../lib/worldcraft-runtime.js';
import { createRangeHarness, rangeGitSha } from '../../../../scripts/range/run.mjs';

Logger.LogLevels = 0;

const here = dirname(fileURLToPath(import.meta.url));
const PREFIX = 'worldcraft-object-';

function series(from, to, step) {
  const values = [];
  const count = Math.round((to - from) / step);
  for (let i = 0; i <= count; i += 1) values.push(Math.round((from + i * step) * 1000) / 1000);
  return values;
}

const YAWS = series(-24, 24, 2);
const ELEVS = [8, 12, 16, 20, 24, 30, 40];
const CHARGES = [0.35, 0.45, 0.55, 0.65, 0.8];
const AIMS = [];
for (const yaw of YAWS) for (const elevation of ELEVS) for (const charge of CHARGES) AIMS.push({ yaw, elevation, charge });

function round(value, places = 4) {
  return Math.round(value * 10 ** places) / 10 ** places;
}
function share(count, total) {
  return total ? round(count / total, 4) : 0;
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

/** First three distinct sounding pieces after immediate repeats collapse. Shorter shots keep the short key. */
export function phraseFamily(notes) {
  const collapsed = [];
  for (const note of notes) {
    if (collapsed.at(-1)?.piece === note.piece) continue;
    collapsed.push(note);
  }
  const distinct = [];
  for (const note of collapsed) {
    if (distinct.some(item => item.piece === note.piece)) continue;
    distinct.push(note);
    if (distinct.length === 3) break;
  }
  return distinct.length ? distinct.map(note => note.piece).join(' > ') : '(silent)';
}

function reduceShot(last) {
  const ledger = [];
  for (const row of last.contacts ?? []) {
    if (typeof row?.body === 'string' && row.body.startsWith(PREFIX)) ledger.push(row.body.slice(PREFIX.length));
  }
  const notes = (last.resonance?.impacts ?? []).filter(impact => typeof impact.piece === 'string').map(impact => ({
    piece: impact.piece,
    degree: impact.degree,
    note: impact.note,
  }));
  const counts = new Map();
  for (const note of notes) counts.set(note.piece, (counts.get(note.piece) ?? 0) + 1);
  const ranked = [...counts.values()].sort((a, b) => b - a);
  const top2 = (ranked[0] ?? 0) + (ranked[1] ?? 0);
  return {
    order: ledger.length ? ledger.join(' > ') : '(no piece)',
    sequence: notes.length ? notes.map(note => `${note.piece}:${note.note}`).join(' > ') : '(silent)',
    family: phraseFamily(notes),
    noteCount: notes.length,
    distinct: new Set(notes.map(note => note.piece)).size,
    ping: notes.length ? top2 / notes.length : null,
    pieces: notes.map(note => note.piece),
    terminal: last.terminal,
    contacts: (last.contacts ?? []).filter(row => row?.body && row.body !== 'worldcraft-ground').map(row => row.body),
  };
}

function nudgeOf(aim) {
  const base = { yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge };
  const step = (axis, delta, places) => {
    const next = { ...base, [axis]: round(base[axis] + delta, places) };
    return { axis, aim: next };
  };
  return [
    step('yaw', -0.5, 1), step('yaw', 0.5, 1),
    step('elevation', -0.5, 1), step('elevation', 0.5, 1),
    step('charge', -0.01, 2), step('charge', 0.01, 2),
  ];
}

function regionOf(aim) {
  const yaw = aim.yaw < -8 ? 'left' : aim.yaw > 8 ? 'right' : 'centre';
  const elev = aim.elevation <= 16 ? 'low' : 'high';
  return `${yaw}-${elev}`;
}

async function timeWorld(havok, world, gitSha) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const started = performance.now();
  const runtime = createWorldcraftRuntime(scene, { world, build: gitSha });
  const rebuildMs = performance.now() - started;
  const setup = validateWorldcraftShot(world, { railIndex: 1, originX: 0, yaw: 0, elevation: 16, charge: 0.55 });
  runtime.setMode('play');
  if (!runtime.launch(setup)) throw new Error(runtime.error || 'timing launch failed');
  const steps = [];
  while (runtime.flight && !runtime.flight.ended && steps.length < 7300) {
    const t0 = performance.now();
    runtime.beforeStep();
    physics._step(1 / 120);
    runtime.afterStep();
    steps.push(performance.now() - t0);
  }
  runtime.dispose();
  scene.dispose();
  engine.dispose();
  return {
    rebuildMs: round(rebuildMs, 2),
    stepMs: { n: steps.length, median: round(median(steps) ?? 0, 4), p95: round(percentile(steps, 0.95) ?? 0, 4) },
  };
}

async function measure(havok, preset, gitSha) {
  const document = validateRangePreset(preset);
  const { world } = adaptRangePreset(document);
  const harness = createRangeHarness(havok, world, gitSha);
  const cache = new Map();
  const keyOf = aim => `${aim.yaw}|${aim.elevation}|${aim.charge}`;
  const fire = aim => {
    const key = keyOf(aim);
    if (cache.has(key)) return cache.get(key);
    let setup;
    try { setup = validateWorldcraftShot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge }); }
    catch (error) {
      const row = { ...aim, rejected: error.message };
      cache.set(key, row);
      return row;
    }
    const shot = reduceShot(harness.shoot(world, setup));
    const row = { ...aim, ...shot };
    cache.set(key, row);
    return row;
  };
  try {
    const rows = AIMS.map(fire);
    const fired = rows.filter(row => !row.rejected);
    const long = fired.filter(row => row.noteCount >= 3);
    const families = new Map();
    const orders = new Map();
    const sequences = new Map();
    const pieceNotes = new Map();
    const reached = new Set();
    const buckets = { zero: 0, oneTwo: 0, threeFive: 0, six: 0 };
    const distincts = [];
    const pings = [];
    const regions = {};
    for (const row of fired) {
      if (row.noteCount === 0) buckets.zero += 1;
      else if (row.noteCount <= 2) buckets.oneTwo += 1;
      else if (row.noteCount <= 5) buckets.threeFive += 1;
      else buckets.six += 1;
      families.set(row.family, (families.get(row.family) ?? 0) + 1);
      orders.set(row.order, (orders.get(row.order) ?? 0) + 1);
      sequences.set(row.sequence, (sequences.get(row.sequence) ?? 0) + 1);
      for (const piece of row.pieces) pieceNotes.set(piece, (pieceNotes.get(piece) ?? 0) + 1);
      if (row.noteCount >= 3) {
        for (const piece of new Set(row.pieces)) reached.add(piece);
        distincts.push(row.distinct);
        pings.push(row.ping);
      }
      const region = regionOf(row);
      const bag = regions[region] ?? (regions[region] = new Map());
      bag.set(row.family, (bag.get(row.family) ?? 0) + 1);
    }
    const nudgeAxes = ['yaw', 'elevation', 'charge'];
    const keepNotes = { yaw: 0, elevation: 0, charge: 0, allSix: 0 };
    const keepFamily = { yaw: 0, elevation: 0, charge: 0, allSix: 0 };
    const nudgeCounts = { yaw: 0, elevation: 0, charge: 0, all: 0 };
    const nudgeFamilyChanges = { yaw: 0, elevation: 0, charge: 0, all: 0 };
    const nudgeNoteKeeps = { yaw: 0, elevation: 0, charge: 0, all: 0 };
    let relatedDifferent = 0;
    let familyKeptNudges = 0;
    for (const row of long) {
      const steps = nudgeOf(row).map(step => ({ ...step, shot: fire(step.aim) })).filter(step => !step.shot.rejected);
      const byAxis = {};
      for (const step of steps) {
        nudgeCounts[step.axis] += 1;
        nudgeCounts.all += 1;
        const keptNotes = step.shot.noteCount >= 3;
        const keptFamily = step.shot.family === row.family;
        if (keptNotes) { nudgeNoteKeeps[step.axis] += 1; nudgeNoteKeeps.all += 1; }
        if (!keptFamily) { nudgeFamilyChanges[step.axis] += 1; nudgeFamilyChanges.all += 1; }
        else {
          familyKeptNudges += 1;
          if (step.shot.sequence !== row.sequence) relatedDifferent += 1;
        }
        const list = byAxis[step.axis] ?? (byAxis[step.axis] = []);
        list.push(step);
      }
      const axisOk = axis => (byAxis[axis] ?? []).length === 2 && byAxis[axis].every(step => step.shot.noteCount >= 3);
      const axisFamily = axis => (byAxis[axis] ?? []).length === 2 && byAxis[axis].every(step => step.shot.family === row.family);
      for (const axis of nudgeAxes) {
        if (axisOk(axis)) keepNotes[axis] += 1;
        if (axisFamily(axis)) keepFamily[axis] += 1;
      }
      if (nudgeAxes.every(axisOk)) keepNotes.allSix += 1;
      if (nudgeAxes.every(axisFamily)) keepFamily.allSix += 1;
    }
    const top = map => [...map.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const noteTotal = [...pieceNotes.values()].reduce((sum, value) => sum + value, 0);
    const topPieces = [...pieceNotes.entries()].sort((a, b) => b[1] - a[1]);
    const distinctHist = {};
    for (const value of distincts) distinctHist[value] = (distinctHist[value] ?? 0) + 1;
    const pingHigh = pings.filter(value => value >= 0.9).length;
    const cost = await timeWorld(havok, world, gitSha);
    const exemplars = [];
    for (const [family, count] of top(families)) {
      if (!family.includes(' > ') || family.split(' > ').length < 3 || count < 5) continue;
      const members = long.filter(row => row.family === family);
      let best = null;
      for (const row of members) {
        const held = nudgeOf(row).map(step => fire(step.aim)).filter(shot => !shot.rejected && shot.family === row.family).length;
        if (!best || held > best.held) best = { held, row };
      }
      if (best) {
        exemplars.push({
          family, count, share: share(count, fired.length),
          heldNudges: best.held,
          aim: { yaw: best.row.yaw, elevation: best.row.elevation, charge: best.row.charge },
          sequence: best.row.sequence,
          order: best.row.order,
          terminal: best.row.terminal,
          contacts: best.row.contacts,
        });
      }
      if (exemplars.length >= 6) break;
    }
    const near = fired.find(row => row.noteCount > 0 && row.noteCount < 3 && nudgeOf(row).some(step => {
      const shot = cache.get(keyOf(step.aim));
      return shot && !shot.rejected && shot.noteCount >= 3;
    }));
    return {
      id: document.id,
      pieces: document.objects.length,
      soundingPieces: document.objects.filter(object => object.voice).map(object => object.id),
      shots: fired.length,
      rejected: rows.length - fired.length,
      distinctContactOrders: orders.size,
      distinctNoteSequences: sequences.size,
      phraseFamilies: families.size,
      longFamilies: top(families).filter(([family]) => family.split(' > ').length >= 3).length,
      topFamilies: top(families).slice(0, 16).map(([family, count]) => ({ family, count, share: share(count, fired.length) })),
      noteShares: {
        zero: share(buckets.zero, fired.length),
        oneTwo: share(buckets.oneTwo, fired.length),
        threeFive: share(buckets.threeFive, fired.length),
        sixPlus: share(buckets.six, fired.length),
      },
      longShots: long.length,
      nudge: {
        definition: 'One slider step: yaw ±0.5°, elevation ±0.5°, charge ±0.01. Shares are of shots that already have 3 or more notes, except chaosRate which is the share of those nudges whose phrase family changed.',
        keepThreeNotes: {
          yaw: share(keepNotes.yaw, long.length),
          elevation: share(keepNotes.elevation, long.length),
          charge: share(keepNotes.charge, long.length),
          allSix: share(keepNotes.allSix, long.length),
        },
        keepFamily: {
          yaw: share(keepFamily.yaw, long.length),
          elevation: share(keepFamily.elevation, long.length),
          charge: share(keepFamily.charge, long.length),
          allSix: share(keepFamily.allSix, long.length),
        },
        nudgeKeepThree: {
          yaw: share(nudgeNoteKeeps.yaw, nudgeCounts.yaw),
          elevation: share(nudgeNoteKeeps.elevation, nudgeCounts.elevation),
          charge: share(nudgeNoteKeeps.charge, nudgeCounts.charge),
          all: share(nudgeNoteKeeps.all, nudgeCounts.all),
        },
        chaosRate: share(nudgeFamilyChanges.all, nudgeCounts.all),
        chaosByAxis: {
          yaw: share(nudgeFamilyChanges.yaw, nudgeCounts.yaw),
          elevation: share(nudgeFamilyChanges.elevation, nudgeCounts.elevation),
          charge: share(nudgeFamilyChanges.charge, nudgeCounts.charge),
        },
        relatedButDifferent: share(relatedDifferent, familyKeptNudges),
        nudges: nudgeCounts.all,
      },
      breadth: {
        distinctPieces: { median: median(distincts), histogram: distinctHist },
        topTwoNoteShare: share((topPieces[0]?.[1] ?? 0) + (topPieces[1]?.[1] ?? 0), noteTotal),
        topPieces: topPieces.slice(0, 6).map(([id, count]) => ({ id, notes: count, share: share(count, noteTotal) })),
        pingPong: {
          median: round(median(pings) ?? 0, 3),
          p90: round(percentile(pings, 0.9) ?? 0, 3),
          shareAtLeast090: share(pingHigh, pings.length),
        },
      },
      regions: Object.fromEntries(Object.entries(regions).map(([name, bag]) => {
        const total = [...bag.values()].reduce((sum, value) => sum + value, 0);
        return [name, { shots: total, families: top(bag).slice(0, 5).map(([family, count]) => ({ family, count, share: share(count, total) })) }];
      })),
      coverage: { reachedByThreeNoteShots: reached.size, soundingPieces: document.objects.filter(object => object.voice).length },
      cost,
      exemplars,
      nearMiss: near ? {
        aim: { yaw: near.yaw, elevation: near.elevation, charge: near.charge },
        family: near.family,
        sequence: near.sequence,
        terminal: near.terminal,
        contacts: near.contacts,
      } : null,
      rows: fired.map(row => ({
        yaw: row.yaw, elevation: row.elevation, charge: row.charge,
        order: row.order, sequence: row.sequence, family: row.family, notes: row.noteCount,
      })),
    };
  } finally { harness.dispose(); }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
const gitSha = rangeGitSha();
const wasm = await readFile(new URL('../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const garden = JSON.parse(await readFile(resolve(here, '../../../../worlds/foundry/chime-garden/preset.json'), 'utf8'));
const loop = JSON.parse(await readFile(resolve(here, '../../../../worlds/foundry/ricochet-garden-loop/preset.json'), 'utf8'));
const descending = JSON.parse(await readFile(resolve(here, '../../../../worlds/foundry/descending-resonance/preset.json'), 'utf8'));

const report = {
  protocol: {
    grid: { yaws: YAWS, elevations: ELEVS, charges: CHARGES, shots: AIMS.length },
    nudge: { yaw: 0.5, elevation: 0.5, charge: 0.01 },
    seedAppliedToSolver: false,
    seed: 20261114,
    gitSha,
    physics: 'rail-golf-v02-worldcraft-v1',
    node: process.version,
    phraseFamily: 'Ordered first three distinct sounding pieces after collapsing immediate repeats. Shots with fewer than three distinct sounding pieces keep that shorter key, including (silent).',
    note: 'A sounding note is one resonance impact. A contact order is the piece ledger, ground omitted, silent pieces included.',
    regions: 'left yaw < -8, centre -8..8, right yaw > 8; low elevation <= 16, high elevation >= 20.',
  },
  worlds: {},
};
for (const preset of [garden, descending, loop]) {
  const started = performance.now();
  const result = await measure(havok, preset, gitSha);
  result.seconds = round((performance.now() - started) / 1000, 2);
  const rows = result.rows;
  delete result.rows;
  report.worlds[result.id] = result;
  const rawDir = resolve(here, 'raw');
  await mkdir(rawDir, { recursive: true });
  await writeFile(resolve(rawDir, `${result.id}-shots.json`), `${JSON.stringify(rows)}\n`);
  process.stdout.write(`${result.id} families ${result.phraseFamilies} long ${result.longFamilies} 3+ ${result.noteShares.threeFive + result.noteShares.sixPlus} chaos ${result.nudge.chaosRate}\n`);
}
const rawDir = resolve(here, 'raw');
await mkdir(rawDir, { recursive: true });
await writeFile(resolve(rawDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${resolve(rawDir, 'summary.json')}\n`);
}
