// Phase 1 Havok grid for the amphitheater sketches, on the Chime Terraces harness.
//
//   node docs/experiments/chime-amphitheater/measure.mjs
//   node docs/experiments/chime-amphitheater/measure.mjs --only chime-arc --max 40 --no-nudges
//
// Seed 20261114 is recorded and not applied. Dynamics are face speed.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { foundryContactsMatch, foundryRecord } from '../../../lib/worldcraft-foundry.js';
import { WORLDCRAFT_PHYSICS_CONTRACT } from '../../../lib/worldcraft-model.js';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'raw');
const SEED = 20261114;
const CHORD_GAP = 0.15;
const CONTROLS = ['chime-terraces', 'descending-resonance'];

const args = process.argv.slice(2);
function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
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
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}
function binOf(count) {
  if (count <= 0) return '0';
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  return '6+';
}
function splitBin(count) {
  if (count <= 0) return '0';
  if (count === 1) return '1';
  if (count === 2) return '2';
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
    });
  }
  const events = audibleEvents(notes);
  const counts = new Map();
  for (const note of notes) counts.set(note.piece, (counts.get(note.piece) ?? 0) + 1);
  const ranked = [...counts.values()].sort((a, b) => b - a);
  const ping = notes.length ? ((ranked[0] ?? 0) + (ranked[1] ?? 0)) / notes.length : null;
  const gaps = [];
  for (let index = 1; index < notes.length; index += 1) gaps.push(round(notes[index].time - notes[index - 1].time, 4));
  let immediateRepeats = 0;
  let laterRepeats = 0;
  const seen = new Set();
  for (const note of notes) {
    if (seen.has(note.piece)) laterRepeats += 1;
    seen.add(note.piece);
  }
  for (let index = 1; index < notes.length; index += 1) {
    if (notes[index].piece === notes[index - 1].piece) immediateRepeats += 1;
  }
  return {
    notes,
    events,
    gaps,
    raw: notes.length,
    audible: events.length,
    distinct: counts.size,
    ping,
    immediateRepeats,
    laterRepeats,
    family: familyOf(notes),
    sequence: noteSequence(notes),
    pitches: pitchSequence(events),
    order: contactOrder(last.contacts),
    silentImpacts,
    terminal: last.terminal,
    contactBodies: (last.contacts ?? []).map(row => row?.body).filter(Boolean),
  };
}

function openingChord(notes) {
  if (notes.length < 3) return false;
  return audibleEvents(notes.slice(0, 3)).length < 3;
}

function binsOf(rows, key, bin) {
  const names = bin === splitBin ? ['0', '1', '2', '3-5', '6+'] : ['0', '1-2', '3-5', '6+'];
  const bins = Object.fromEntries(names.map(name => [name, 0]));
  for (const row of rows) bins[bin(row[key])] += 1;
  return Object.fromEntries(Object.entries(bins).map(([name, count]) => [name, { count, share: share(count, rows.length) }]));
}

function topEntries(map, limit, total) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, share: share(count, total) }));
}

function nudgeBlock(bases) {
  const axes = ['yaw', 'elevation', 'charge'];
  const both = { yaw: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 }, elevation: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 }, charge: { n: 0, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 } };
  const all = { n: bases.length, stays3: 0, sameFamily: 0, sameFamilyDifferentSequence: 0 };
  for (const base of bases) {
    const byAxis = { yaw: [], elevation: [], charge: [] };
    for (const step of base.steps) byAxis[step.axis].push(step);
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
    shots: row.n,
    stays3: share(row.stays3, row.n),
    sameFamily: share(row.sameFamily, row.n),
    sameFamilyDifferentSequence: share(row.sameFamilyDifferentSequence, row.n),
  });
  return {
    shots: bases.length,
    bothDirections: { yaw: pack(both.yaw), elevation: pack(both.elevation), power: pack(both.charge) },
    allSix: {
      stays3: share(all.stays3, all.n),
      sameFamily: share(all.sameFamily, all.n),
      sameFamilyDifferentSequence: share(all.sameFamilyDifferentSequence, all.n),
    },
  };
}

function groupsOf(world) {
  const inner = world.objects.filter(object => object.id.startsWith('in-')).map(object => object.id);
  const outer = world.objects.filter(object => object.id.startsWith('out-')).map(object => object.id);
  const west = world.objects.filter(object => object.yaw < 0).map(object => object.id);
  const east = world.objects.filter(object => object.yaw > 0).map(object => object.id);
  const back = world.objects.filter(object => object.yaw === 0).map(object => object.id);
  return { inner, outer, west, east, back };
}

function travelOf(row, groups) {
  const pieces = row.notes.map(note => note.piece);
  const has = set => pieces.some(piece => set.includes(piece));
  const firstTime = set => {
    const note = row.notes.find(item => set.includes(item.piece));
    return note ? note.time : null;
  };
  const tier = groups.inner.length && groups.outer.length && has(groups.inner) && has(groups.outer);
  let tierOrder = null;
  if (tier) {
    const innerTime = firstTime(groups.inner);
    const outerTime = firstTime(groups.outer);
    tierOrder = innerTime < outerTime ? 'inner-then-outer' : outerTime < innerTime ? 'outer-then-inner' : 'same-onset';
  }
  const cross = groups.west.length && groups.east.length && has(groups.west) && has(groups.east);
  return { tier, tierOrder, cross };
}

function gapStats(gaps) {
  return {
    n: gaps.length,
    median: round(median(gaps), 4),
    p90: round(percentile(gaps, 0.9), 4),
    under50ms: gaps.filter(gap => gap < 0.05).length,
    under150ms: gaps.filter(gap => gap <= CHORD_GAP).length,
    over400ms: gaps.filter(gap => gap > 0.4).length,
  };
}

function summarize(rows, world) {
  const families = new Map();
  const orders = new Set();
  const sequences = new Set();
  const pitches = new Set();
  const pieceNotes = new Map();
  const pieceShots = new Map();
  const regions = {};
  const distinctRaw = [];
  const pingRaw = [];
  const pingAudible = [];
  const allGaps = [];
  const longGaps = [];
  let notesTotal = 0;
  let immediateRepeats = 0;
  let laterRepeats = 0;
  const rawLong = [];
  const groups = groupsOf(world);
  let tierShots = 0;
  let outerThenInner = 0;
  let innerThenOuter = 0;
  let crossShots = 0;
  const tierOnLong = { shots: 0, outerThenInner: 0, innerThenOuter: 0 };
  const crossOnLong = { shots: 0 };
  for (const object of world.objects) {
    pieceNotes.set(object.id, 0);
    pieceShots.set(object.id, 0);
  }
  for (const row of rows) {
    families.set(row.family, (families.get(row.family) ?? 0) + 1);
    orders.add(row.order);
    sequences.add(row.sequence);
    pitches.add(row.pitches);
    const seen = new Set();
    for (const note of row.notes) {
      pieceNotes.set(note.piece, (pieceNotes.get(note.piece) ?? 0) + 1);
      notesTotal += 1;
      seen.add(note.piece);
    }
    for (const piece of seen) pieceShots.set(piece, (pieceShots.get(piece) ?? 0) + 1);
    immediateRepeats += row.immediateRepeats;
    laterRepeats += row.laterRepeats;
    allGaps.push(...row.gaps);
    const regionName = regionOf(row.yaw, row.elevation);
    const region = regions[regionName] ?? (regions[regionName] = { shots: 0, families: new Map(), long: 0, longFamilies: new Map() });
    region.shots += 1;
    region.families.set(row.family, (region.families.get(row.family) ?? 0) + 1);
    const travel = travelOf(row, groups);
    if (travel.tier) {
      tierShots += 1;
      if (travel.tierOrder === 'outer-then-inner') outerThenInner += 1;
      if (travel.tierOrder === 'inner-then-outer') innerThenOuter += 1;
    }
    if (travel.cross) crossShots += 1;
    if (row.raw >= 3) {
      rawLong.push(row);
      distinctRaw.push(row.distinct);
      pingRaw.push(row.ping);
      longGaps.push(...row.gaps);
      region.long += 1;
      region.longFamilies.set(row.family, (region.longFamilies.get(row.family) ?? 0) + 1);
      if (travel.tier) {
        tierOnLong.shots += 1;
        if (travel.tierOrder === 'outer-then-inner') tierOnLong.outerThenInner += 1;
        if (travel.tierOrder === 'inner-then-outer') tierOnLong.innerThenOuter += 1;
      }
      if (travel.cross) crossOnLong.shots += 1;
    }
    if (row.audible >= 3) pingAudible.push(row.ping);
  }
  const reached = [...pieceShots.entries()].filter(([, count]) => count > 0).map(([id]) => id).sort();
  const dead = [...pieceShots.entries()].filter(([, count]) => count === 0).map(([id]) => id).sort();
  const ranked = [...pieceNotes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  let chords = 0;
  let openingChords = 0;
  const audibleSplitOfRaw = { '0': 0, '1': 0, '2': 0, '3-5': 0, '6+': 0 };
  for (const row of rawLong) {
    if (row.audible < row.raw) chords += 1;
    if (openingChord(row.notes)) openingChords += 1;
    audibleSplitOfRaw[splitBin(row.audible)] += 1;
  }
  const twoPieceRaw = rawLong.filter(row => row.distinct === 2).length;
  const audibleLong = rows.filter(row => row.audible >= 3);
  const audibleLongPieces = audibleLong.filter(row => row.distinct >= 3).length;
  const regionNames = ['left-low', 'left-high', 'centre-low', 'centre-high', 'right-low', 'right-high'];
  return {
    shots: rows.length,
    pieces: world.objects.length,
    distinctContactOrders: orders.size,
    distinctNoteSequences: sequences.size,
    distinctPitchSequences: pitches.size,
    phraseFamilies: families.size,
    longFamilies: [...families.keys()].filter(name => !name.startsWith('short:') && name !== '(silent)').length,
    topFamilies: topEntries(families, 8, rows.length),
    noteBins: {
      raw: binsOf(rows, 'raw', binOf),
      audible: binsOf(rows, 'audible', binOf),
      audibleSplit: binsOf(rows, 'audible', splitBin),
      rawSplit: binsOf(rows, 'raw', splitBin),
    },
    raw3: rawLong.length,
    audible3: audibleLong.length,
    audible3AndThreePieces: audibleLongPieces,
    raw3TwoPieces: twoPieceRaw,
    breadth: {
      raw3MedianDistinct: median(distinctRaw),
      raw3MedianPingPong: round(median(pingRaw), 4),
      audible3MedianPingPong: round(median(pingAudible), 4),
      topTwoNoteShare: share((ranked[0]?.[1] ?? 0) + (ranked[1]?.[1] ?? 0), notesTotal),
      busiest: ranked[0] ? { piece: ranked[0][0], notes: ranked[0][1], share: share(ranked[0][1], notesTotal) } : null,
      pieces: ranked.map(([piece, notes]) => ({ piece, notes, shots: pieceShots.get(piece) ?? 0, share: share(notes, notesTotal) })),
    },
    repeats: {
      notes: notesTotal,
      immediateRepeatNotes: immediateRepeats,
      immediateRepeatShare: share(immediateRepeats, notesTotal),
      anyRepeatNotes: laterRepeats,
      anyRepeatShare: share(laterRepeats, notesTotal),
    },
    gaps: { all: gapStats(allGaps), raw3: gapStats(longGaps) },
    inflation: {
      raw3WithAChord: chords,
      raw3WithAChordShare: share(chords, rawLong.length),
      raw3OpeningIsAChord: openingChords,
      raw3OpeningIsAChordShare: share(openingChords, rawLong.length),
      raw3ByAudibleSplit: Object.fromEntries(Object.entries(audibleSplitOfRaw).map(([name, count]) => [name, { count, share: share(count, rawLong.length) }])),
    },
    travel: {
      anyShotBothTiers: tierShots,
      anyShotOuterThenInner: outerThenInner,
      anyShotInnerThenOuter: innerThenOuter,
      raw3BothTiers: tierOnLong.shots,
      raw3OuterThenInner: tierOnLong.outerThenInner,
      raw3InnerThenOuter: tierOnLong.innerThenOuter,
      anyShotCrossBowl: crossShots,
      raw3CrossBowl: crossOnLong.shots,
    },
    coverage: { reached, dead, reachedCount: reached.length },
    regions: Object.fromEntries(regionNames.map(name => {
      const region = regions[name] ?? { shots: 0, families: new Map(), long: 0, longFamilies: new Map() };
      const top = topEntries(region.families, 3, region.shots);
      const longTop = topEntries(region.longFamilies, 3, region.long);
      return [name, {
        shots: region.shots,
        families: region.families.size,
        topFamily: top[0]?.name ?? null,
        topFamilyShare: top[0]?.share ?? 0,
        raw3: region.long,
        raw3Top: longTop[0]?.name ?? null,
        raw3TopShare: longTop[0]?.share ?? 0,
      }];
    })),
  };
}

function sameTerminal(actual, expected) {
  return actual?.reason === expected.reason
    && Object.is(actual?.elapsed, expected.elapsed)
    && Array.isArray(actual?.position)
    && actual.position.length === expected.position.length
    && actual.position.every((value, index) => Object.is(value, expected.position[index]));
}

const sketchFiles = (await readdir(resolve(here, 'sketches'))).filter(name => name.endsWith('.json')).sort();
const loaded = [];
for (const id of CONTROLS) {
  const record = foundryRecord(id);
  loaded.push({ id, kind: 'control', preset: record.preset, world: adaptRangePreset(record.preset).world, manifest: record.manifest });
}
for (const name of sketchFiles) {
  const preset = JSON.parse(await readFile(resolve(here, 'sketches', name), 'utf8'));
  const adapted = adaptRangePreset(preset);
  loaded.push({ id: preset.id, kind: 'sketch', preset: adapted.preset, world: adapted.world, manifest: null });
}
const selected = only ? loaded.filter(entry => only.includes(entry.id)) : loaded;
if (!selected.length) throw new Error(`No worlds selected (${only?.join(',')})`);

const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const gitSha = rangeGitSha();
// A fresh runtime per world. One shared runtime keeps Havok state across
// replaceWorld and changes contacts: Descending Resonance yaw -4, elevation 12,
// charge 0.8 is one note on a fresh world and two notes after Fan and Garden
// have been loaded. Terraces, run first, is unaffected.
let harness = null;
function beginWorld(world) {
  if (harness) harness.dispose();
  harness = createRangeHarness(havok, world, gitSha);
  if (!harness.runtime.setDynamics('normal-speed')) throw new Error('face speed was rejected');
}

function fire(world, aim) {
  const last = harness.shoot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge });
  return reduceShot(last);
}

const report = {
  seed: SEED,
  seedAppliedToSolver: false,
  dynamics: 'normal-speed',
  gitSha,
  physics: WORLDCRAFT_PHYSICS_CONTRACT,
  grid: { shots: GRID.length, fullGrid: AIMS.length, yaw: [-24, 24, 2], elevation: ELEVS, charge: CHARGES, originX: 0, railIndex: 1 },
  chordGapSeconds: CHORD_GAP,
  harness: 'fresh Havok runtime per world',
  nudges: skipNudges ? 'skipped' : 'yaw ±0.5, elevation ±0.5, charge ±0.01',
  worlds: {},
};

try {
  for (const entry of selected) {
    const started = performance.now();
    beginWorld(entry.world);
    if (entry.manifest && !maxShots) {
      for (const shot of entry.manifest.testedShots) {
        const last = harness.shoot(entry.world, shot.setup);
        const terminal = sameTerminal(last.terminal, shot.terminal);
        const contacts = shot.contacts ? foundryContactsMatch(shot.contacts, last.contacts) : true;
        if (!terminal || !contacts) {
          const error = new Error(`${entry.id} ${shot.id} did not reproduce`);
          error.detail = { terminal: last.terminal, contacts: last.contacts?.map(row => row.body) };
          throw error;
        }
      }
    }
    const cache = new Map();
    const shoot = aim => {
      const key = `${aim.yaw}|${aim.elevation}|${aim.charge}`;
      if (cache.has(key)) return cache.get(key);
      const row = { ...aim, key, ...fire(entry.world, aim), rejected: false };
      cache.set(key, row);
      return row;
    };
    const rows = GRID.map(shoot);
    const rawBases = [];
    const audibleBases = [];
    if (!skipNudges) {
      for (const row of rows) {
        if (row.raw < 3 && row.audible < 3) continue;
        const steps = nudgeAims(row).map(aim => {
          const shot = shoot(aim);
          return {
            axis: aim.axis,
            rejected: false,
            stays3: shot.raw >= 3,
            staysAudible3: shot.audible >= 3,
            sameFamily: shot.family === row.family,
            differentSequence: shot.sequence !== row.sequence,
          };
        });
        if (row.raw >= 3) rawBases.push({ steps });
        if (row.audible >= 3) audibleBases.push({ steps: steps.map(step => ({ ...step, stays3: step.staysAudible3 })) });
      }
    }
    const summary = summarize(rows, entry.world);
    summary.id = entry.id;
    summary.kind = entry.kind;
    summary.capacity = entry.preset.capacity ?? null;
    if (!skipNudges) summary.nudge = { raw3: nudgeBlock(rawBases), audible3: nudgeBlock(audibleBases) };
    const opening = shoot({ yaw: 0, elevation: 18, charge: 0.55 });
    const openingNudges = nudgeAims(opening).map(aim => {
      const shot = shoot(aim);
      return { axis: aim.axis, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge, raw: shot.raw, audible: shot.audible, family: shot.family, sequence: shot.sequence, pitches: shot.pitches };
    });
    summary.defaultShot = {
      aim: { yaw: 0, elevation: 18, charge: 0.55 },
      onGrid: false,
      raw: opening.raw,
      audible: opening.audible,
      distinct: opening.distinct,
      family: opening.family,
      sequence: opening.sequence,
      pitches: opening.pitches,
      gaps: opening.gaps,
      order: opening.order,
      terminal: opening.terminal,
      nudges: openingNudges,
    };
    const diagnostics = harness.runtime.diagnostics();
    summary.bodies = { staticBodies: diagnostics.staticBodies, meshes: diagnostics.meshes, materials: diagnostics.materials, physicsBodies: diagnostics.physicsBodies };
    summary.seconds = round((performance.now() - started) / 1000, 2);
    const rich = rows.filter(row => row.audible >= 3 && row.distinct >= 3)
      .sort((a, b) => b.audible - a.audible || b.distinct - a.distinct || b.raw - a.raw)
      .slice(0, 5)
      .map(row => ({ yaw: row.yaw, elevation: row.elevation, charge: row.charge, raw: row.raw, audible: row.audible, distinct: row.distinct, family: row.family, sequence: row.sequence, pitches: row.pitches, gaps: row.gaps }));
    summary.richest = rich;
    report.worlds[entry.id] = summary;
    if (writeFiles) {
      const body = `${JSON.stringify({
        id: entry.id,
        seed: SEED,
        columns: 'y yaw, e elevation, c charge, n raw, a audible, u distinct, f family, s sequence, p pitches, g gaps, o order',
        rows: rows.map(row => ({
          y: row.yaw, e: row.elevation, c: row.charge, n: row.raw, a: row.audible, u: row.distinct,
          f: row.family, s: row.sequence, p: row.pitches, g: row.gaps, o: row.order,
        })),
      })}\n`;
      await mkdir(outDir, { recursive: true });
      await writeFile(resolve(outDir, `shots-${entry.id}.json`), body);
    }
    const audible = summary.noteBins.audibleSplit;
    process.stdout.write(`${entry.id} pieces ${summary.pieces} audible 0/1/2/3-5/6+ ${audible['0'].count}/${audible['1'].count}/${audible['2'].count}/${audible['3-5'].count}/${audible['6+'].count} raw3 ${summary.raw3} audible3 ${summary.audible3} three-piece-events ${summary.audible3AndThreePieces} families ${summary.longFamilies} dead ${summary.coverage.dead.join(',') || '-'} tiers ${summary.travel.raw3BothTiers} cross ${summary.travel.raw3CrossBowl} default ${summary.defaultShot.sequence} ${summary.seconds}s\n`);
  }
} finally {
  harness?.dispose();
}

if (writeFiles) {
  await mkdir(outDir, { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(resolve(outDir, 'summary.json'), body);
  const hash = createHash('sha256').update(body).digest('hex');
  process.stdout.write(`summary.json ${Buffer.byteLength(body)} ${hash}\n`);
}
