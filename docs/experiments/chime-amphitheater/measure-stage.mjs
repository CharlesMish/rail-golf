// Phase 3 grid. Same 875 aims, fresh runtime, 150 ms merge, as the bowl comparison.
//
//   node docs/experiments/chime-amphitheater/measure-stage.mjs
//   node docs/experiments/chime-amphitheater/measure-stage.mjs --only chime-bowl-centre --max 40 --no-nudges
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { foundryRecord } from '../../../lib/worldcraft-foundry.js';
import { WORLDCRAFT_PHYSICS_CONTRACT } from '../../../lib/worldcraft-model.js';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { worldcraftTerraceFacets } from '../../../lib/worldcraft-terrace.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'raw');
const SEED = 20261114;
const CHORD_GAP = 0.15;
const STAGE = { x: 0, z: 32 };
const INWARD_M = 0.25;
const args = process.argv.slice(2);
const flag = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const only = flag('--only')?.split(',').filter(Boolean) ?? null;
const maxShots = flag('--max') ? Number(flag('--max')) : null;
const skipNudges = args.includes('--no-nudges');
const writeFiles = maxShots === null && !only;

function series(from, to, step) {
  const values = [];
  const n = Math.round((to - from) / step);
  for (let i = 0; i <= n; i += 1) values.push(Math.round((from + i * step) * 1000) / 1000);
  return values;
}
const YAWS = series(-24, 24, 2);
const ELEVS = [8, 12, 16, 20, 24, 30, 40];
const CHARGES = [0.35, 0.45, 0.55, 0.65, 0.8];
const AIMS = [];
for (const yaw of YAWS) for (const elevation of ELEVS) for (const charge of CHARGES) AIMS.push({ yaw, elevation, charge });
if (AIMS.length !== 875) throw new Error(`Expected 875 aims, got ${AIMS.length}`);
const GRID = maxShots ? AIMS.slice(0, maxShots) : AIMS;
const round = (value, places = 4) => Math.round(value * 10 ** places) / 10 ** places;
const share = (count, total) => (total ? round(count / total, 4) : 0);
function splitBin(count) {
  if (count <= 0) return '0';
  if (count === 1) return '1';
  if (count === 2) return '2';
  if (count <= 5) return '3-5';
  return '6+';
}
function audibleEvents(notes) {
  const events = [];
  for (const note of notes) {
    const previous = events.at(-1);
    const last = previous?.notes.at(-1);
    if (previous && note.time - last.time <= CHORD_GAP) previous.notes.push(note);
    else events.push({ notes: [note] });
  }
  return events;
}
function horiz(x, z) { return Math.hypot(x - STAGE.x, z - STAGE.z); }
function stepIndex(body) {
  const match = /^worldcraft-object-step-(\d+)$/.exec(body ?? '');
  return match ? Number(match[1]) : null;
}
function faceKind(ny) {
  if (!Number.isFinite(ny)) return 'unknown';
  const abs = Math.abs(ny);
  if (abs >= 0.7) return 'tread';
  if (abs <= 0.35) return 'riser';
  return 'oblique';
}

// Return toward the stage centre (0, 32), the terrace centre on every bowl.
// inward: after the first tier contact, some later sample is at least 0.25 m
// closer to that centre than the contact point was.
// lower: a later contact is on a smaller step index.
// stage: a later ground or tee contact lands inside the 8 m inner radius.
function returnsOf(last) {
  const tiers = (last.contacts ?? []).filter(row => stepIndex(row.body) !== null);
  if (!tiers.length) return { inward: false, lower: false, stage: false, tiers: 0 };
  const first = tiers[0];
  const firstDist = horiz(first.point.x, first.point.z);
  let minLater = Infinity;
  for (const sample of last.samples ?? []) {
    if (sample.t <= first.first) continue;
    minLater = Math.min(minLater, horiz(sample.x, sample.z));
  }
  const inward = minLater <= firstDist - INWARD_M;
  const firstIndex = stepIndex(first.body);
  const lower = tiers.slice(1).some(row => stepIndex(row.body) < firstIndex);
  const stage = (last.contacts ?? []).some(row => (row.body === 'worldcraft-ground' || row.body === 'worldcraft-tee') && row.first >= first.first && horiz(row.point.x, row.point.z) < 8);
  return { inward, lower, stage, tiers: new Set(tiers.map(row => row.body)).size };
}
function facesOf(strikes) {
  const counts = { tread: 0, riser: 0, oblique: 0, unknown: 0 };
  for (const strike of strikes ?? []) {
    if (stepIndex(strike.body) === null) continue;
    counts[faceKind(strike.ny)] += 1;
  }
  const total = counts.tread + counts.riser + counts.oblique + counts.unknown;
  let shot = 'none';
  if (total) {
    const kinds = ['tread', 'riser', 'oblique'].filter(kind => counts[kind] > 0);
    shot = kinds.length === 1 ? kinds[0] : 'mixed';
  }
  return { counts, total, shot };
}
function reduceShot(last) {
  const notes = [];
  for (const impact of last.resonance?.impacts ?? []) {
    if (!(impact?.gain > 0) || typeof impact.piece !== 'string') continue;
    notes.push({ piece: impact.piece, pitch: impact.note, time: impact.time, gain: impact.gain });
  }
  const events = audibleEvents(notes);
  const distinct = new Set(notes.map(note => note.piece));
  const collapsed = [];
  for (const note of notes) if (collapsed.at(-1) !== note.piece) collapsed.push(note.piece);
  const familyPieces = [];
  for (const piece of collapsed) if (!familyPieces.includes(piece)) familyPieces.push(piece);
  const family = !familyPieces.length ? '(silent)' : familyPieces.length < 3 ? `short:${familyPieces.join('>')}` : familyPieces.slice(0, 3).join('>');
  const back = returnsOf(last);
  const faces = facesOf(last.strikes);
  const bodies = (last.contacts ?? []).map(row => row?.body).filter(Boolean);
  return {
    notes, raw: notes.length, audible: events.length, distinct: distinct.size, family,
    sequence: notes.length ? notes.map(note => `${note.piece}:${note.pitch}`).join('>') : '(silent)',
    tiers: back.tiers, inward: back.inward, lower: back.lower, stage: back.stage,
    face: faces.shot, faceCounts: faces.counts,
    terminal: last.terminal?.reason ?? null,
    tee: bodies.includes('worldcraft-tee'),
    ground: bodies.includes('worldcraft-ground'),
    station: last.launch?.station ? { x: last.launch.station.x, z: last.launch.station.z, yaw: last.launch.station.yaw } : null,
  };
}

const loaded = [
  { id: 'chime-terraces', kind: 'control', world: adaptRangePreset(foundryRecord('chime-terraces').preset).world },
  { id: 'descending-resonance', kind: 'control', world: adaptRangePreset(foundryRecord('descending-resonance').preset).world },
];
for (const id of ['chime-bowl-aisle', 'chime-bowl-stage']) {
  const preset = JSON.parse(await readFile(resolve(here, 'bowl', `${id}.json`), 'utf8'));
  loaded.push({ id, kind: 'control', world: adaptRangePreset(preset).world });
}
loaded.push({ id: 'chime-bowl-centre', kind: 'stage', world: adaptRangePreset(foundryRecord('chime-bowl-centre').preset).world });
loaded.push({ id: 'chime-bowl-shallow', kind: 'variant', world: adaptRangePreset(JSON.parse(await readFile(resolve(here, 'variants/chime-bowl-shallow.json'), 'utf8'))).world });
const selected = only ? loaded.filter(entry => only.includes(entry.id)) : loaded;
const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const gitSha = rangeGitSha();
let harness = null;
function beginWorld(world) {
  if (harness) harness.dispose();
  harness = createRangeHarness(havok, world, gitSha);
  if (!harness.runtime.setDynamics('normal-speed')) throw new Error('face speed was rejected');
}

const report = {
  seed: SEED, seedAppliedToSolver: false, dynamics: 'normal-speed', gitSha, physics: WORLDCRAFT_PHYSICS_CONTRACT,
  grid: { shots: GRID.length, fullGrid: AIMS.length, yaw: [-24, 24, 2], elevation: ELEVS, charge: CHARGES, originX: 0, railIndex: 1 },
  chordGapSeconds: CHORD_GAP,
  return: {
    centre: STAGE,
    inward: `after the first tier contact, a later sample is at least ${INWARD_M} m closer to the terrace centre`,
    lower: 'a later contact is on a smaller step index',
    stage: 'a later ground or tee contact is inside the 8 m inner radius',
  },
  face: { tread: '|normal y| >= 0.7', riser: '|normal y| <= 0.35', oblique: 'between those' },
  harness: 'fresh Havok runtime per world',
  worlds: {},
};

try {
  for (const entry of selected) {
    const started = performance.now();
    beginWorld(entry.world);
    const rebuildMs = harness.runtime.diagnostics().rebuildMs;
    const cache = new Map();
    const shoot = aim => {
      const key = `${aim.yaw}|${aim.elevation}|${aim.charge}`;
      if (cache.has(key)) return cache.get(key);
      const last = harness.shoot(entry.world, { railIndex: 1, originX: 0, ...aim }, true);
      const row = { ...aim, ...reduceShot(last) };
      cache.set(key, row);
      return row;
    };
    const rows = GRID.map(shoot);
    const bins = { '0': 0, '1': 0, '2': 0, '3-5': 0, '6+': 0 };
    const rawBins = { '0': 0, '1': 0, '2': 0, '3-5': 0, '6+': 0 };
    let inward = 0; let lower = 0; let stage = 0; let tiers2 = 0; let tee = 0; let ground = 0; let yard = 0;
    const families = new Map();
    const pieceShots = new Map();
    const faceShots = { tread: 0, riser: 0, oblique: 0, mixed: 0, none: 0 };
    const faceStrikes = { tread: 0, riser: 0, oblique: 0, unknown: 0 };
    for (const object of entry.world.objects) pieceShots.set(object.id, 0);
    for (const row of rows) {
      bins[splitBin(row.audible)] += 1;
      rawBins[splitBin(row.raw)] += 1;
      if (row.inward) inward += 1;
      if (row.lower) lower += 1;
      if (row.stage) stage += 1;
      if (row.tiers >= 2) tiers2 += 1;
      if (row.tee) tee += 1;
      if (row.ground) ground += 1;
      if (row.terminal === 'out-of-bounds') yard += 1;
      faceShots[row.face] += 1;
      for (const [kind, count] of Object.entries(row.faceCounts)) faceStrikes[kind] += count;
      families.set(row.family, (families.get(row.family) ?? 0) + 1);
      for (const piece of new Set(row.notes.map(note => note.piece))) pieceShots.set(piece, (pieceShots.get(piece) ?? 0) + 1);
    }
    const ranked = rows
      .filter(row => row.audible >= 2 || row.tiers >= 2)
      .sort((a, b) => b.audible - a.audible || b.tiers - a.tiers || b.raw - a.raw || a.yaw - b.yaw);
    const bases = [];
    const seen = new Set();
    for (const row of ranked) {
      if (bases.length >= 36) break;
      const key = `${row.yaw}|${row.elevation}|${row.charge}`;
      if (seen.has(key)) continue;
      if (row.audible >= 2 || bases.filter(item => item.audible < 2).length < 24) {
        bases.push(row);
        seen.add(key);
      }
    }
    let nudge = null;
    if (!skipNudges && bases.length) {
      let audibleStay = 0; let familyStay = 0; let anyFamily = 0; let lone = 0;
      for (const base of bases) {
        const steps = [
          { yaw: round(base.yaw - 0.5, 2), elevation: base.elevation, charge: base.charge },
          { yaw: round(base.yaw + 0.5, 2), elevation: base.elevation, charge: base.charge },
          { yaw: base.yaw, elevation: round(base.elevation - 0.5, 2), charge: base.charge },
          { yaw: base.yaw, elevation: round(base.elevation + 0.5, 2), charge: base.charge },
          { yaw: base.yaw, elevation: base.elevation, charge: round(base.charge - 0.01, 2) },
          { yaw: base.yaw, elevation: base.elevation, charge: round(base.charge + 0.01, 2) },
        ].map(shoot);
        if (steps.every(step => step.audible >= Math.min(base.audible, 2))) audibleStay += 1;
        if (steps.every(step => step.family === base.family)) familyStay += 1;
        if (steps.some(step => step.family === base.family)) anyFamily += 1;
        if ((families.get(base.family) ?? 0) < 2 && steps.every(step => step.family !== base.family)) lone += 1;
      }
      nudge = {
        shots: bases.length,
        audible2Stay: share(audibleStay, bases.length),
        allSixSameFamily: share(familyStay, bases.length),
        anyNudgeSameFamily: share(anyFamily, bases.length),
        loneAim: lone,
      };
    }
    const opening = shoot({ yaw: 0, elevation: 18, charge: 0.55 });
    const diagnostics = harness.runtime.diagnostics();
    const disposed = harness.dispose();
    harness = null;
    const facets = entry.world.objects.filter(object => object.kind === 'terrace').reduce((sum, object) => sum + worldcraftTerraceFacets(object).length, 0);
    const familyList = [...families.entries()].filter(([name]) => name !== '(silent)').sort((a, b) => b[1] - a[1]);
    const summary = {
      id: entry.id,
      kind: entry.kind,
      launcher: entry.world.launcher,
      pieces: entry.world.objects.length,
      facets,
      shots: rows.length,
      audibleSplit: bins,
      rawSplit: rawBins,
      audible3: rows.filter(row => row.audible >= 3).length,
      raw3: rows.filter(row => row.raw >= 3).length,
      tiers2,
      inward,
      lower,
      stageLandings: stage,
      returns: rows.filter(row => row.inward || row.lower || row.stage).length,
      yard,
      tee,
      ground,
      faceShots,
      faceStrikes,
      families: familyList.filter(([, count]) => count >= 3).length,
      loneFamilies: familyList.filter(([, count]) => count === 1).length,
      topFamilies: familyList.slice(0, 8).map(([name, count]) => ({ name, count })),
      dead: [...pieceShots.entries()].filter(([, count]) => count === 0).map(([id]) => id),
      pieceShots: Object.fromEntries([...pieceShots.entries()].sort((a, b) => b[1] - a[1])),
      nudge,
      opening: { yaw: 0, elevation: 18, charge: 0.55, audible: opening.audible, raw: opening.raw, tiers: opening.tiers, sequence: opening.sequence, terminal: opening.terminal, inward: opening.inward, face: opening.face, station: opening.station },
      richest: ranked.slice(0, 8).map(row => ({
        yaw: row.yaw, elevation: row.elevation, charge: row.charge, audible: row.audible, raw: row.raw,
        tiers: row.tiers, sequence: row.sequence, terminal: row.terminal, inward: row.inward, lower: row.lower, stage: row.stage, face: row.face,
      })),
      bodies: {
        staticBodies: diagnostics.staticBodies,
        meshes: diagnostics.meshes,
        physicsBodies: diagnostics.physicsBodies,
        rebuildMs: round(rebuildMs, 1),
        disposeBefore: disposed.before,
        disposeAfterRuntime: disposed.afterRuntime,
      },
      seconds: round((performance.now() - started) / 1000, 1),
    };
    report.worlds[entry.id] = summary;
    if (writeFiles || (only && maxShots === null)) {
      await mkdir(outDir, { recursive: true });
      await writeFile(resolve(outDir, `stage-shots-${entry.id}.json`), `${JSON.stringify(rows.map(row => ({
        y: row.yaw, e: row.elevation, c: row.charge, n: row.raw, a: row.audible, k: row.tiers,
        s: row.sequence, t: row.terminal, i: row.inward ? 1 : 0, f: row.face,
      })))}\n`);
    }
    process.stdout.write(`${entry.id} audible ${bins['0']}/${bins['1']}/${bins['2']}/${bins['3-5']}/${bins['6+']} tiers2 ${tiers2} inward ${inward} lower ${lower} stage ${stage} audible3 ${summary.audible3} yard ${yard} tee ${tee} face ${JSON.stringify(faceShots)} ${summary.seconds}s\n`);
    if (entry.id === 'chime-terraces' && !maxShots && opening.sequence !== 'low-2:D4>low-3:C4') {
      throw new Error(`Terraces default drifted: ${opening.sequence}`);
    }
  }
} finally {
  harness?.dispose();
}
if (writeFiles || (only && maxShots === null)) {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  await mkdir(outDir, { recursive: true });
  const name = writeFiles ? 'stage-summary.json' : `stage-only-${selected.map(entry => entry.id).join('-')}.json`;
  await writeFile(resolve(outDir, name), body);
  process.stdout.write(`${name} ${createHash('sha256').update(body).digest('hex')}\n`);
}
