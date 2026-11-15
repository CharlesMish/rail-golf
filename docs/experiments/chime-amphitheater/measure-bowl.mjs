// Phase 2 grid. Same 875 aims, fresh runtime, 150 ms merge, as the terrace comparison.
//
//   node docs/experiments/chime-amphitheater/measure-bowl.mjs
//   node docs/experiments/chime-amphitheater/measure-bowl.mjs --only chime-bowl-aisle --max 40 --no-nudges
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { foundryRecord } from '../../../lib/worldcraft-foundry.js';
import { WORLDCRAFT_PHYSICS_CONTRACT } from '../../../lib/worldcraft-model.js';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'raw');
const SEED = 20261114;
const CHORD_GAP = 0.15;
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
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}
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
function reduceShot(last) {
  const notes = [];
  for (const impact of last.resonance?.impacts ?? []) {
    if (!(impact?.gain > 0) || typeof impact.piece !== 'string') continue;
    notes.push({ piece: impact.piece, pitch: impact.note, time: impact.time, gain: impact.gain });
  }
  const events = audibleEvents(notes);
  const gaps = [];
  for (let index = 1; index < notes.length; index += 1) gaps.push(round(notes[index].time - notes[index - 1].time, 4));
  const distinct = new Set(notes.map(note => note.piece));
  const collapsed = [];
  for (const note of notes) if (collapsed.at(-1) !== note.piece) collapsed.push(note.piece);
  const familyPieces = [];
  for (const piece of collapsed) if (!familyPieces.includes(piece)) familyPieces.push(piece);
  const family = !familyPieces.length ? '(silent)' : familyPieces.length < 3 ? `short:${familyPieces.join('>')}` : familyPieces.slice(0, 3).join('>');
  const indexes = notes.map(note => Number(note.piece.replace('step-', ''))).filter(Number.isFinite);
  let descending = indexes.length >= 2;
  let ascending = indexes.length >= 2;
  for (let index = 1; index < indexes.length; index += 1) {
    if (!(indexes[index] < indexes[index - 1])) descending = false;
    if (!(indexes[index] > indexes[index - 1])) ascending = false;
  }
  const bodies = (last.contacts ?? []).map(row => row?.body).filter(Boolean);
  return {
    notes, gaps, raw: notes.length, audible: events.length, distinct: distinct.size, family,
    sequence: notes.length ? notes.map(note => `${note.piece}:${note.pitch}`).join('>') : '(silent)',
    pitches: events.length ? events.map(event => event.notes.map(note => note.pitch).join('+')).join('>') : '(silent)',
    descending: descending && indexes.length >= 2, ascending: ascending && indexes.length >= 2,
    terminal: last.terminal?.reason ?? null,
    tee: bodies.includes('worldcraft-tee'),
    ground: bodies.includes('worldcraft-ground'),
  };
}

const loaded = [
  { id: 'chime-terraces', kind: 'control', world: adaptRangePreset(foundryRecord('chime-terraces').preset).world },
  { id: 'descending-resonance', kind: 'control', world: adaptRangePreset(foundryRecord('descending-resonance').preset).world },
];
for (const id of ['chime-bowl-aisle', 'chime-bowl-stage']) {
  const preset = JSON.parse(await readFile(resolve(here, 'bowl', `${id}.json`), 'utf8'));
  loaded.push({ id, kind: 'bowl', world: adaptRangePreset(preset).world });
}
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
  chordGapSeconds: CHORD_GAP, harness: 'fresh Havok runtime per world', worlds: {},
};
try {
  for (const entry of selected) {
    const started = performance.now();
    beginWorld(entry.world);
    const cache = new Map();
    const shoot = aim => {
      const key = `${aim.yaw}|${aim.elevation}|${aim.charge}`;
      if (cache.has(key)) return cache.get(key);
      const last = harness.shoot(entry.world, { railIndex: 1, originX: 0, ...aim });
      const row = { ...aim, ...reduceShot(last) };
      cache.set(key, row);
      return row;
    };
    const rows = GRID.map(shoot);
    const bins = { '0': 0, '1': 0, '2': 0, '3-5': 0, '6+': 0 };
    const rawBins = { '0': 0, '1': 0, '2': 0, '3-5': 0, '6+': 0 };
    let descending = 0; let ascending = 0; let oneThenStop = 0; let tee = 0; let ground = 0;
    const gaps = []; const families = new Map(); const pieceShots = new Map();
    for (const object of entry.world.objects) pieceShots.set(object.id, 0);
    for (const row of rows) {
      bins[splitBin(row.audible)] += 1;
      rawBins[splitBin(row.raw)] += 1;
      if (row.descending) descending += 1;
      if (row.ascending) ascending += 1;
      if (row.raw === 1) oneThenStop += 1;
      if (row.tee) tee += 1;
      if (row.ground) ground += 1;
      gaps.push(...row.gaps);
      families.set(row.family, (families.get(row.family) ?? 0) + 1);
      for (const piece of new Set(row.notes.map(note => note.piece))) pieceShots.set(piece, (pieceShots.get(piece) ?? 0) + 1);
    }
    const long = rows.filter(row => row.raw >= 3);
    const audibleLong = rows.filter(row => row.audible >= 3);
    const nudgeOf = bases => {
      if (skipNudges) return null;
      let stay = 0; let family = 0;
      for (const base of bases) {
        const steps = [
          { yaw: base.yaw - 0.5, elevation: base.elevation, charge: base.charge },
          { yaw: base.yaw + 0.5, elevation: base.elevation, charge: base.charge },
          { yaw: base.yaw, elevation: base.elevation - 0.5, charge: base.charge },
          { yaw: base.yaw, elevation: base.elevation + 0.5, charge: base.charge },
          { yaw: base.yaw, elevation: base.elevation, charge: round(base.charge - 0.01, 2) },
          { yaw: base.yaw, elevation: base.elevation, charge: round(base.charge + 0.01, 2) },
        ].map(shoot);
        if (steps.every(step => step.raw >= 3)) stay += 1;
        if (steps.every(step => step.family === base.family)) family += 1;
      }
      return { shots: bases.length, allSixStayRaw3: share(stay, bases.length), allSixSameFamily: share(family, bases.length) };
    };
    const opening = shoot({ yaw: 0, elevation: 18, charge: 0.55 });
    const diagnostics = harness.runtime.diagnostics();
    const summary = {
      id: entry.id, kind: entry.kind, pieces: entry.world.objects.length, shots: rows.length,
      audibleSplit: bins, rawSplit: rawBins,
      raw3: long.length, audible3: audibleLong.length,
      longFamilies: [...families.keys()].filter(name => !name.startsWith('short:') && name !== '(silent)').length,
      descending, ascending, oneNoteThenStop: oneThenStop, teeEndings: tee, groundEndings: ground,
      gaps: { n: gaps.length, median: round(median(gaps) ?? 0, 4), p90: round(percentile(gaps, 0.9) ?? 0, 4) },
      dead: [...pieceShots.entries()].filter(([, count]) => count === 0).map(([id]) => id),
      pieceShots: Object.fromEntries([...pieceShots.entries()].sort((a, b) => b[1] - a[1])),
      nudge: nudgeOf(long),
      defaultShot: { raw: opening.raw, audible: opening.audible, sequence: opening.sequence, terminal: opening.terminal, gaps: opening.gaps },
      richest: rows.filter(row => row.raw >= 2).sort((a, b) => b.raw - a.raw || b.audible - a.audible).slice(0, 8)
        .map(row => ({ yaw: row.yaw, elevation: row.elevation, charge: row.charge, raw: row.raw, audible: row.audible, sequence: row.sequence, gaps: row.gaps, terminal: row.terminal })),
      bodies: { staticBodies: diagnostics.staticBodies, meshes: diagnostics.meshes, physicsBodies: diagnostics.physicsBodies, rebuildMs: round(diagnostics.rebuildMs, 1) },
      seconds: round((performance.now() - started) / 1000, 1),
    };
    report.worlds[entry.id] = summary;
    if (writeFiles) {
      await mkdir(outDir, { recursive: true });
      await writeFile(resolve(outDir, `bowl-shots-${entry.id}.json`), `${JSON.stringify(rows.map(row => ({ y: row.yaw, e: row.elevation, c: row.charge, n: row.raw, a: row.audible, s: row.sequence, t: row.terminal })))}\n`);
    }
    process.stdout.write(`${entry.id} audible ${bins['0']}/${bins['1']}/${bins['2']}/${bins['3-5']}/${bins['6+']} raw3 ${summary.raw3} audible3 ${summary.audible3} families ${summary.longFamilies} descend ${descending} ascend ${ascending} one ${oneThenStop} tee ${tee} default ${opening.sequence} ${summary.seconds}s\n`);
    if (entry.id === 'chime-terraces' && !maxShots && opening.sequence !== 'low-2:D4>low-3:C4') {
      throw new Error(`Terraces default drifted: ${opening.sequence}`);
    }
  }
} finally {
  harness?.dispose();
}
if (writeFiles) {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'bowl-summary.json'), body);
  process.stdout.write(`bowl-summary ${createHash('sha256').update(body).digest('hex')}\n`);
}
