// One harness, one definition set, for the Chime Terraces comparison.
// Worlds: Chime Terraces, Chime Fan, Chime Garden, Descending Resonance, Ricochet Loop.
//
//   node docs/experiments/chime-terraces/measure.mjs
//
// The seed is provenance. It is not applied to the solver.
// Dynamics are face speed (normal-speed), the presentation value on all five worlds.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../../lib/rail-golf-v02.js';
import { applyFoundryLayout, foundryContactBodies, foundryContactsMatch, foundryPresentation, foundryRecord } from '../../../lib/worldcraft-foundry.js';
import { WORLDCRAFT_PHYSICS_CONTRACT } from '../../../lib/worldcraft-model.js';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../../lib/worldcraft-runtime.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'raw');
const SEED = 20261114;
const CHORD_GAP = 0.15;
const WORLDS = [
  'chime-terraces',
  'chime-fan',
  'chime-garden',
  'descending-resonance',
  'ricochet-garden-loop',
];

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

const DEFINITIONS = {
  seed: SEED,
  seedAppliedToSolver: false,
  dynamics: 'normal-speed',
  dynamicsReason: 'Every measured manifest sets presentation.dynamics to normal-speed. The live ear uses that. The harness default is total-speed, so this run sets face speed explicitly.',
  grid: {
    yaw: { from: -24, to: 24, step: 2, values: YAWS },
    elevation: ELEVS,
    charge: CHARGES,
    shots: 875,
    railIndex: 1,
    originX: 0,
    source: 'docs/experiments/foundry/ricochet-garden-loop/sweep.json broadGrid. That file records seed 20261110, also not applied to the solver.',
  },
  noteSequence: 'Ordered sounding notes. A sounding note is a resonance impact with gain > 0. Written piece:pitch in onset order, joined by >.',
  audibleEvent: 'Sounding notes in onset order. A note joins the current event when its onset is at most 150 ms after the previous note. Otherwise it starts a new event. A chord is one event.',
  phraseLength: 'Raw length is the sounding-note count. Audible length is the event count. Bins are 0, 1-2, 3-5, and 6+ for both.',
  phraseFamily: 'Collapse immediate repeats of the same sounding piece, then take the first three distinct pieces in order of appearance. Fewer than three distinct pieces is a short family, written short: then those pieces joined by >. No sounding notes is (silent).',
  nudge: 'One slider step: yaw ±0.5°, elevation ±0.5°, charge ±0.01. Both directions. Reported for shots that already have 3+ raw notes, and again for shots that already have 3+ audible events. Per direction is the share of those individual steps. Both directions means the shot only counts when each way meets the condition. All six means every step meets it. Same family but different sequence means the phrase family matches and the note sequence does not.',
  breadth: 'Distinct sounding pieces on a 3+ shot. The two-piece share and the busiest-piece share are of every sounding note on the grid. Ping-pong is, per 3+ shot, the share of that shot’s notes from its own two most-hit pieces.',
  regions: 'Left is yaw ≤ -8, centre is -6 through 6, right is yaw ≥ 8. Low elevation is 8, 12, and 16. High is 20, 24, 30, and 40. Six regions.',
  contactOrder: 'Every contact in ledger order. The worldcraft-object- prefix is stripped. Ground stays as ground and the tee stays as tee. Silent pieces stay. Repeats stay.',
  pitchSequence: 'After the 150 ms merge, each event is its pitches in onset order joined by +. Events are joined by >.',
};

function round(value, places = 4) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
function share(count, total) {
  return total ? round(count / total, 4) : 0;
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function binOf(count) {
  if (count <= 0) return '0';
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  return '6+';
}
function regionOf(yaw, elevation) {
  const side = yaw <= -8 ? 'left' : yaw >= 8 ? 'right' : 'centre';
  const band = elevation <= 16 ? 'low' : 'high';
  return `${side}-${band}`;
}
function nudgeAims(aim) {
  const places = { yaw: 1, elevation: 1, charge: 2 };
  const step = (axis, delta) => {
    const next = { yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge };
    next[axis] = round(aim[axis] + delta, places[axis]);
    return { axis, ...next };
  };
  return [
    step('yaw', -0.5), step('yaw', 0.5),
    step('elevation', -0.5), step('elevation', 0.5),
    step('charge', -0.01), step('charge', 0.01),
  ];
}
function contactOrder(contacts) {
  const ids = [];
  for (const row of contacts ?? []) {
    if (!row || typeof row.body !== 'string') continue;
    if (row.body.startsWith('worldcraft-object-')) ids.push(row.body.slice('worldcraft-object-'.length));
    else if (row.body === 'worldcraft-ground') ids.push('ground');
    else if (row.body === 'worldcraft-tee') ids.push('tee');
    else ids.push(row.body);
  }
  return ids.join('>') || '(none)';
}
function familyOf(notes) {
  const collapsed = [];
  for (const note of notes) if (collapsed.at(-1) !== note.piece) collapsed.push(note.piece);
  const distinct = [];
  for (const piece of collapsed) if (!distinct.includes(piece)) distinct.push(piece);
  if (!distinct.length) return '(silent)';
  if (distinct.length < 3) return `short:${distinct.join('>')}`;
  return distinct.slice(0, 3).join('>');
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
function pitchSequence(events) {
  if (!events.length) return '(silent)';
  return events.map(event => event.notes.map(note => note.pitch).join('+')).join('>');
}
function noteSequence(notes) {
  if (!notes.length) return '(silent)';
  return notes.map(note => `${note.piece}:${note.pitch}`).join('>');
}
function reduceShot(last) {
  const impacts = last.resonance?.impacts ?? [];
  let silentImpacts = 0;
  const notes = [];
  for (const impact of impacts) {
    if (!(impact?.gain > 0) || typeof impact.piece !== 'string') {
      silentImpacts += 1;
      continue;
    }
    notes.push({
      piece: impact.piece,
      pitch: impact.note,
      time: impact.time,
      gain: impact.gain,
      material: impact.material,
    });
  }
  const events = audibleEvents(notes);
  const counts = new Map();
  for (const note of notes) counts.set(note.piece, (counts.get(note.piece) ?? 0) + 1);
  const ranked = [...counts.values()].sort((a, b) => b - a);
  const ping = notes.length ? ((ranked[0] ?? 0) + (ranked[1] ?? 0)) / notes.length : null;
  return {
    notes,
    events,
    raw: notes.length,
    audible: events.length,
    distinct: counts.size,
    ping,
    family: familyOf(notes),
    sequence: noteSequence(notes),
    pitches: pitchSequence(events),
    order: contactOrder(last.contacts),
    silentImpacts,
    terminal: last.terminal,
    contacts: foundryContactBodies(last.contacts),
  };
}

function topEntries(map, limit, total) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, share: share(count, total) }));
}

function binsOf(rows, key) {
  const bins = { '0': 0, '1-2': 0, '3-5': 0, '6+': 0 };
  for (const row of rows) bins[binOf(row[key])] += 1;
  const total = rows.length;
  return Object.fromEntries(Object.entries(bins).map(([name, count]) => [name, { count, share: share(count, total) }]));
}

function nudgeBlock(bases) {
  const axes = ['yaw', 'elevation', 'charge'];
  const per = { yaw: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 }, elevation: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 }, charge: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 } };
  const both = { yaw: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 }, elevation: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 }, charge: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 } };
  const all = { n: bases.length, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0, rejected: 0 };
  for (const base of bases) {
    const byAxis = { yaw: [], elevation: [], charge: [] };
    for (const step of base.steps) {
      per[step.axis].n += 1;
      if (step.rejected) all.rejected += 1;
      else {
        if (step.stays3) per[step.axis].stays3 += 1;
        if (step.sameFamily) per[step.axis].sameFamily += 1;
        if (step.sameFamily && step.differentSequence) per[step.axis].sameFamilyDifferentSequence += 1;
      }
      byAxis[step.axis].push(step);
    }
    let allStay = true;
    let allFamily = true;
    let anyDifferent = false;
    for (const axis of axes) {
      const steps = byAxis[axis];
      both[axis].n += 1;
      const launched = steps.length === 2 && steps.every(step => !step.rejected);
      if (launched && steps.every(step => step.stays3)) both[axis].stays3 += 1;
      else allStay = false;
      if (launched && steps.every(step => step.sameFamily)) both[axis].sameFamily += 1;
      else allFamily = false;
      if (launched && steps.every(step => step.sameFamily) && steps.some(step => step.differentSequence)) both[axis].sameFamilyDifferentSequence += 1;
      if (launched && steps.some(step => step.differentSequence)) anyDifferent = true;
    }
    if (allStay) all.stays3 += 1;
    if (allFamily) all.sameFamily += 1;
    if (allFamily && anyDifferent) all.sameFamilyDifferentSequence += 1;
  }
  const pack = row => ({
    steps: row.n,
    stays3: share(row.stays3, row.n),
    sameFamily: share(row.sameFamily, row.n),
    sameFamilyDifferentSequence: share(row.sameFamilyDifferentSequence, row.n),
  });
  return {
    shots: bases.length,
    perDirection: {
      yaw: pack(per.yaw),
      elevation: pack(per.elevation),
      power: pack(per.charge),
    },
    bothDirections: {
      yaw: pack(both.yaw),
      elevation: pack(both.elevation),
      power: pack(both.charge),
    },
    allSix: {
      stays3: share(all.stays3, all.n),
      sameFamily: share(all.sameFamily, all.n),
      sameFamilyDifferentSequence: share(all.sameFamilyDifferentSequence, all.n),
      rejectedSteps: all.rejected,
    },
  };
}

function openingChord(notes) {
  if (notes.length < 3) return false;
  return audibleEvents(notes.slice(0, 3)).length < 3;
}
function distinctOnsetCluster(notes) {
  const first = new Map();
  for (const note of notes) if (!first.has(note.piece)) first.set(note.piece, note.time);
  const times = [...first.values()];
  if (times.length < 3) return false;
  return times[2] - times[0] < CHORD_GAP;
}

function summarize(rows) {
  const families = new Map();
  const orders = new Set();
  const sequences = new Set();
  const pitches = new Set();
  const pieceNotes = new Map();
  const reachedRaw = new Set();
  const reachedAudible = new Set();
  const regions = {};
  const distinctRaw = [];
  const distinctAudible = [];
  const pingRaw = [];
  const pingAudible = [];
  let notesTotal = 0;
  let silentImpacts = 0;
  const rawLong = [];
  const audibleLong = [];
  for (const row of rows) {
    silentImpacts += row.silentImpacts;
    families.set(row.family, (families.get(row.family) ?? 0) + 1);
    orders.add(row.order);
    sequences.add(row.sequence);
    pitches.add(row.pitches);
    for (const note of row.notes) {
      pieceNotes.set(note.piece, (pieceNotes.get(note.piece) ?? 0) + 1);
      notesTotal += 1;
    }
    const regionName = regionOf(row.yaw, row.elevation);
    const region = regions[regionName] ?? (regions[regionName] = { shots: 0, families: new Map(), long: 0, longFamilies: new Map() });
    region.shots += 1;
    region.families.set(row.family, (region.families.get(row.family) ?? 0) + 1);
    if (row.raw >= 3) {
      rawLong.push(row);
      distinctRaw.push(row.distinct);
      pingRaw.push(row.ping);
      for (const piece of new Set(row.notes.map(note => note.piece))) reachedRaw.add(piece);
      region.long += 1;
      region.longFamilies.set(row.family, (region.longFamilies.get(row.family) ?? 0) + 1);
    }
    if (row.audible >= 3) {
      audibleLong.push(row);
      distinctAudible.push(row.distinct);
      pingAudible.push(row.ping);
      for (const piece of new Set(row.notes.map(note => note.piece))) reachedAudible.add(piece);
    }
  }
  const ranked = [...pieceNotes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const hist = values => values.reduce((map, value) => { map[value] = (map[value] ?? 0) + 1; return map; }, {});
  const audibleBinsOfRawLong = { '0': 0, '1-2': 0, '3-5': 0, '6+': 0 };
  let chords = 0;
  let openingChords = 0;
  let onsetClusters = 0;
  const openingEvents = { 1: 0, 2: 0, 3: 0 };
  for (const row of rawLong) {
    audibleBinsOfRawLong[binOf(row.audible)] += 1;
    if (row.audible < row.raw) chords += 1;
    if (openingChord(row.notes)) openingChords += 1;
    if (distinctOnsetCluster(row.notes)) onsetClusters += 1;
    if (row.notes.length >= 3) {
      const count = audibleEvents(row.notes.slice(0, 3)).length;
      openingEvents[count] = (openingEvents[count] ?? 0) + 1;
    }
  }
  const regionNames = ['left-low', 'left-high', 'centre-low', 'centre-high', 'right-low', 'right-high'];
  return {
    shots: rows.length,
    distinctContactOrders: orders.size,
    distinctNoteSequences: sequences.size,
    distinctPitchSequences: pitches.size,
    phraseFamilies: families.size,
    longFamilies: [...families.keys()].filter(name => !name.startsWith('short:') && name !== '(silent)').length,
    topFamilies: topEntries(families, 8, rows.length),
    noteBins: { raw: binsOf(rows, 'raw'), audible: binsOf(rows, 'audible') },
    raw3: rawLong.length,
    audible3: audibleLong.length,
    breadth: {
      raw3: {
        medianDistinctPieces: median(distinctRaw),
        distribution: hist(distinctRaw),
        medianPingPong: round(median(pingRaw), 4),
      },
      audible3: {
        medianDistinctPieces: median(distinctAudible),
        distribution: hist(distinctAudible),
        medianPingPong: round(median(pingAudible), 4),
      },
      topTwoNoteShare: share((ranked[0]?.[1] ?? 0) + (ranked[1]?.[1] ?? 0), notesTotal),
      busiestPieceShare: share(ranked[0]?.[1] ?? 0, notesTotal),
      topPieces: ranked.slice(0, 6).map(([piece, count]) => ({ piece, notes: count, share: share(count, notesTotal) })),
    },
    regions: Object.fromEntries(regionNames.map(name => {
      const region = regions[name] ?? { shots: 0, families: new Map(), long: 0, longFamilies: new Map() };
      const top = topEntries(region.families, 4, region.shots);
      const longTop = topEntries(region.longFamilies, 4, region.long);
      return [name, {
        shots: region.shots,
        families: region.families.size,
        topFamily: top[0]?.name ?? null,
        topFamilyShare: top[0]?.share ?? 0,
        topFamilies: top,
        raw3Shots: region.long,
        raw3Families: region.longFamilies.size,
        raw3TopFamily: longTop[0]?.name ?? null,
        raw3TopFamilyShare: longTop[0]?.share ?? 0,
        raw3TopFamilies: longTop,
      }];
    })),
    coverage: {
      reachedByRaw3: reachedRaw.size,
      reachedByAudible3: reachedAudible.size,
      reachedRaw: [...reachedRaw].sort(),
      reachedAudible: [...reachedAudible].sort(),
    },
    inflation: {
      raw3Shots: rawLong.length,
      raw3WithAChord: chords,
      raw3WithAChordShare: share(chords, rawLong.length),
      raw3OpeningIsAChord: openingChords,
      raw3OpeningIsAChordShare: share(openingChords, rawLong.length),
      raw3FirstThreeNoteEvents: openingEvents,
      raw3DistinctOnsetsInside150ms: onsetClusters,
      raw3DistinctOnsetsInside150msShare: share(onsetClusters, rawLong.length),
      raw3ByAudibleBin: Object.fromEntries(Object.entries(audibleBinsOfRawLong).map(([name, count]) => [name, { count, share: share(count, rawLong.length) }])),
    },
    notesTotal,
    silentImpacts,
  };
}

function sameTerminal(actual, expected) {
  return actual?.reason === expected.reason
    && Object.is(actual?.elapsed, expected.elapsed)
    && Array.isArray(actual?.position)
    && actual.position.length === expected.position.length
    && actual.position.every((value, index) => Object.is(value, expected.position[index]));
}

function relatedScore(base, neighbour) {
  if (neighbour.rejected || neighbour.family !== base.family || !neighbour.differentSequence) return -1;
  let score = 0;
  if (neighbour.pitches !== base.pitches) score += 5;
  if (neighbour.audible !== base.audible) score += 2;
  const head = value => value.split('>').slice(0, 3).join('>');
  if (head(neighbour.sequence) !== head(base.sequence)) score += 3;
  if (neighbour.sequence.startsWith(base.sequence) || base.sequence.startsWith(neighbour.sequence)) score -= 1;
  return score;
}

function stepOnce(runtime, physics) {
  const started = performance.now();
  runtime.beforeStep();
  physics._step(1 / 120);
  runtime.afterStep();
  return performance.now() - started;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

function timeWorld(havok, world, setup, gitSha) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const started = performance.now();
  const runtime = createWorldcraftRuntime(scene, { world, build: gitSha });
  const coldMs = performance.now() - started;
  runtime.setDynamics('normal-speed');
  const rebuilds = [];
  for (let index = 0; index < 8; index += 1) {
    runtime.setMode('build');
    const t0 = performance.now();
    const replaced = runtime.replaceWorld(world, { intent: 'load' });
    if (!replaced.ok) throw new Error(replaced.error ?? 'rebuild failed');
    rebuilds.push(performance.now() - t0);
  }
  runtime.setMode('play');
  const idle = [];
  for (let index = 0; index < 200; index += 1) idle.push(stepOnce(runtime, physics));
  runtime.setMode('build');
  runtime.setMode('play');
  if (!runtime.launch(setup)) throw new Error(runtime.error || 'cost launch failed');
  const flight = [];
  while (runtime.flight && !runtime.flight.ended && flight.length < 7300) flight.push(stepOnce(runtime, physics));
  const diagnostics = runtime.diagnostics();
  runtime.dispose();
  scene.dispose();
  engine.dispose();
  const idleBody = idle.slice(30);
  return {
    coldConstructMs: round(coldMs, 3),
    warmRebuildMedianMs: round(median(rebuilds.slice(1)), 3),
    idleStepMedianMs: round(median(idleBody), 4),
    idleStepP95Ms: round(percentile(idleBody, 0.95), 4),
    flightStepMedianMs: round(median(flight), 4),
    flightStepP95Ms: round(percentile(flight, 0.95), 4),
    flightSteps: flight.length,
    staticBodies: diagnostics.staticBodies,
    meshes: diagnostics.meshes,
    materials: diagnostics.materials,
    note: 'NullEngine. No shadows. These are not browser frame times.',
  };
}

const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const gitSha = rangeGitSha();
const loaded = WORLDS.map(id => {
  const record = foundryRecord(id);
  const presentation = foundryPresentation(id);
  if (presentation?.dynamics !== 'normal-speed') throw new Error(`${id} is not face-speed`);
  const adapted = adaptRangePreset(record.preset);
  return { id, record, presentation, world: adapted.world, preset: adapted.preset };
});
const harness = createRangeHarness(havok, loaded[0].world, gitSha);
if (!harness.runtime.setDynamics('normal-speed')) throw new Error('face speed was rejected');

function fire(world, aim) {
  const last = harness.shoot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge });
  return reduceShot(last);
}

const report = {
  definitions: DEFINITIONS,
  gitSha,
  physics: WORLDCRAFT_PHYSICS_CONTRACT,
  node: process.version,
  worlds: {},
};
const compact = {};
const audioPairs = {};

try {
  for (const entry of loaded) {
    const started = performance.now();
    const starters = [];
    for (const shot of entry.record.manifest.testedShots) {
      const shotWorld = shot.layout ? adaptRangePreset(applyFoundryLayout(entry.record.preset, shot.layout).preset).world : entry.world;
      const last = harness.shoot(shotWorld, shot.setup);
      const row = reduceShot(last);
      const terminal = sameTerminal(row.terminal, shot.terminal);
      const contacts = foundryContactsMatch(shot.contacts, last.contacts);
      starters.push({
        id: shot.id,
        setup: shot.setup,
        terminal,
        contacts,
        raw: row.raw,
        audible: row.audible,
        family: row.family,
        sequence: row.sequence,
        pitches: row.pitches,
        order: row.order,
        contactBodies: row.contacts,
        layout: Boolean(shot.layout),
      });
      if (!terminal || !contacts) {
        const error = new Error(`${entry.id} ${shot.id} did not reproduce`);
        error.detail = { terminal, contacts, actual: row.terminal, bodies: row.contacts, expected: shot.contacts };
        throw error;
      }
    }
    const cache = new Map();
    const shoot = aim => {
      const key = `${aim.yaw}|${aim.elevation}|${aim.charge}`;
      if (cache.has(key)) return cache.get(key);
      let row;
      try {
        row = { ...fire(entry.world, aim), rejected: false };
      } catch (error) {
        row = { rejected: true, error: error.message, raw: 0, audible: 0, notes: [], family: '(silent)', sequence: '(silent)', pitches: '(silent)', distinct: 0, ping: null, order: '(none)', silentImpacts: 0 };
      }
      const stored = { ...aim, key, ...row };
      cache.set(key, stored);
      return stored;
    };
    const rows = AIMS.map(shoot);
    const nudgeByKey = new Map();
    for (const row of rows) {
      if (row.rejected || (row.raw < 3 && row.audible < 3)) continue;
      const steps = nudgeAims(row).map(aim => {
        const shot = shoot(aim);
        return {
          axis: aim.axis,
          rejected: Boolean(shot.rejected),
          stays3: shot.raw >= 3,
          staysAudible3: shot.audible >= 3,
          sameFamily: shot.family === row.family,
          differentSequence: shot.sequence !== row.sequence,
          family: shot.family,
          sequence: shot.sequence,
          pitches: shot.pitches,
          audible: shot.audible,
          raw: shot.raw,
          aim: { yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge },
        };
      });
      nudgeByKey.set(row.key, { key: row.key, family: row.family, sequence: row.sequence, pitches: row.pitches, audible: row.audible, raw: row.raw, steps });
    }
    const rawBases = rows.filter(row => row.raw >= 3).map(row => {
      const block = nudgeByKey.get(row.key);
      return { ...block, steps: block.steps.map(step => ({ ...step, stays3: step.raw >= 3 })) };
    });
    const audibleBases = rows.filter(row => row.audible >= 3).map(row => {
      const block = nudgeByKey.get(row.key);
      return { ...block, steps: block.steps.map(step => ({ ...step, stays3: step.staysAudible3 })) };
    });
    const summary = summarize(rows);
    const longFamily = base => !base.family.startsWith('short:') && base.family !== '(silent)';
    summary.nudge = {
      raw3: nudgeBlock(rawBases),
      raw3LongFamily: nudgeBlock(rawBases.filter(longFamily)),
      audible3: nudgeBlock(audibleBases),
      audible3LongFamily: nudgeBlock(audibleBases.filter(longFamily)),
    };
    const sounding = entry.world.objects.filter(object => object.voice).map(object => object.id);
    const missed = sounding.filter(id => !summary.coverage.reachedRaw.includes(id));
    summary.id = entry.id;
    summary.pieces = entry.world.objects.length;
    summary.capacity = entry.preset.capacity ?? null;
    summary.soundingPieces = sounding.length;
    summary.coverage.soundingPieces = sounding.length;
    summary.coverage.missedByRaw3 = missed;
    summary.lifted = entry.world.objects.filter(object => Number.isFinite(object.lift)).length;
    summary.tilted = entry.world.objects.filter(object => Number.isFinite(object.tilt)).length;
    summary.voices = {
      timber: entry.world.objects.filter(object => object.voice?.material === 'timber').length,
      metal: entry.world.objects.filter(object => object.voice?.material === 'metal').length,
      bankVoice: entry.presentation.bankVoice === true,
    };
    summary.starters = starters;
    const resting = starters.filter(shot => !shot.layout);
    const busiest = [...resting].sort((a, b) => b.raw - a.raw || b.contactBodies.length - a.contactBodies.length || b.audible - a.audible)[0];
    summary.busiestStarter = busiest ? { id: busiest.id, setup: busiest.setup, raw: busiest.raw, audible: busiest.audible, contacts: busiest.contactBodies.length } : null;
    const relatedCandidates = [];
    let bestPair = null;
    for (const starter of starters) {
      if (starter.layout || starter.family.startsWith('short:') || starter.family === '(silent)') continue;
      const base = shoot(starter.setup);
      const steps = nudgeAims(starter.setup).map(aim => {
        const shot = shoot(aim);
        return {
          axis: aim.axis,
          rejected: Boolean(shot.rejected),
          family: shot.family,
          sequence: shot.sequence,
          pitches: shot.pitches,
          audible: shot.audible,
          raw: shot.raw,
          differentSequence: shot.sequence !== base.sequence,
          aim: { yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge },
        };
      });
      for (const step of steps) {
        const score = relatedScore(base, step);
        if (score < 0) continue;
        relatedCandidates.push({
          score,
          starter: starter.id,
          axis: step.axis,
          baseSequence: base.sequence,
          basePitches: base.pitches,
          sequence: step.sequence,
          pitches: step.pitches,
        });
        if (!bestPair || score > bestPair.score) {
          bestPair = {
            score,
            starter: { id: starter.id, setup: starter.setup, family: base.family, sequence: base.sequence, pitches: base.pitches, raw: base.raw, audible: base.audible },
            neighbour: { axis: step.axis, setup: step.aim, family: step.family, sequence: step.sequence, pitches: step.pitches, raw: step.raw, audible: step.audible },
          };
        }
      }
    }
    summary.relatedCandidates = relatedCandidates.sort((a, b) => b.score - a.score).slice(0, 8);
    summary.relatedPair = bestPair;
    summary.cost = timeWorld(havok, entry.world, busiest?.setup ?? starters[0].setup, gitSha);
    summary.seconds = round((performance.now() - started) / 1000, 2);
    report.worlds[entry.id] = summary;
    compact[entry.id] = rows.filter(row => !row.rejected).map(row => ({
      y: row.yaw, e: row.elevation, c: row.charge,
      n: row.raw, a: row.audible, u: row.distinct,
      f: row.family, s: row.sequence, p: row.pitches, o: row.order,
    }));
    if (bestPair) audioPairs[entry.id] = bestPair;
    process.stdout.write(`${entry.id} raw3 ${summary.raw3} audible3 ${summary.audible3} families ${summary.phraseFamilies} orders ${summary.distinctContactOrders} seq ${summary.distinctNoteSequences} pitch ${summary.distinctPitchSequences} ${summary.seconds}s\n`);
  }
} finally {
  harness.dispose();
}

await mkdir(outDir, { recursive: true });
const files = {};
for (const [id, rows] of Object.entries(compact)) {
  const body = `${JSON.stringify({ id, seed: SEED, columns: 'y yaw, e elevation, c charge, n raw notes, a audible events, u distinct pieces, f family, s note sequence, p pitch sequence after 150ms merge, o contact order', rows })}\n`;
  const name = `shots-${id}.json`;
  await writeFile(resolve(outDir, name), body);
  files[name] = { bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') };
}
const summaryBody = `${JSON.stringify({ ...report, shotFiles: files, audioPairs }, null, 2)}\n`;
await writeFile(resolve(outDir, 'summary.json'), summaryBody);
files['summary.json'] = { bytes: Buffer.byteLength(summaryBody), sha256: createHash('sha256').update(summaryBody).digest('hex') };
process.stdout.write(`${Object.entries(files).map(([name, file]) => `${name} ${file.bytes}`).join('\n')}\n`);
