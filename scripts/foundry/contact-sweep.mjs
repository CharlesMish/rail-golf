// Contact-sequence sweeps for foundry worlds. Real Havok through the incumbent
// runtime and step loop (createRangeHarness). Nothing here predicts a flight,
// and nothing here writes a physics coefficient.
//
// A "note" is one impact the resonance ear kept, which is what the player hears
// and what the note timeline draws. The contact ledger merges consecutive
// callbacks on one body into a single row, so a ball that bounces twice on one
// plate is one ledger row and two notes. Both are recorded.
//
// A "beat" is one onset: notes that begin within 80 ms of each other. A ball
// that lands on the seam between two pieces sounds two notes in one beat.
// Counts, phrases, and neighbour comparisons below are in beats, so a seam hit
// is not scored as a two-note sequence.
//
// Grid counts are how many sampled setups produced something. They are not a
// probability that a person finds it.
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { validateWorldcraftShot, worldcraftIdentity } from '../../lib/worldcraft-model.js';
import { adaptRangePreset, exportRangePreset, sha256Hex, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../range/run.mjs';

export const SLIDER_STEPS = Object.freeze({ yaw: 0.5, elevation: 0.5, charge: 0.01 });
// Two onsets closer than this are heard as one attack. 80 ms is about ten solver frames.
export const BEAT_WINDOW = 0.08;

export async function loadHavok() {
  const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
  return Havok({ wasmBinary: wasm });
}

export function series(from, to, step) {
  const values = [];
  const count = Math.round((to - from) / step);
  for (let i = 0; i <= count; i += 1) values.push(Math.round((from + i * step) * 1000) / 1000);
  return values;
}

export function gridAims({ yaws, elevations, charges, originX = 0 }) {
  const aims = [];
  for (const yaw of yaws) for (const elevation of elevations) for (const charge of charges) aims.push({ originX, yaw, elevation, charge });
  return aims;
}

const round = (value, places = 4) => Math.round(value * 10 ** places) / 10 ** places;
const PREFIX = 'worldcraft-object-';

/** One shot reduced to what the sequence analysis reads. */
function reduce(last, aim) {
  const ledger = [];
  for (const row of last.contacts ?? []) {
    if (typeof row?.body === 'string' && row.body.startsWith(PREFIX)) ledger.push(row.body.slice(PREFIX.length));
  }
  const notes = (last.resonance?.impacts ?? []).filter(impact => typeof impact.body === 'string' && impact.body.startsWith(PREFIX)).map(impact => ({
    piece: impact.piece,
    note: impact.note,
    degree: impact.degree,
    time: round(impact.time),
    speed: round(impact.speed, 2),
    normalSpeed: impact.normalSpeed === null ? null : round(impact.normalSpeed, 2),
    gain: round(impact.gain, 3),
    y: impact.point ? round(impact.point.y, 2) : null,
  }));
  // A beat is one onset. Notes that start within BEAT_WINDOW of the beat's first note
  // belong to it: a ball on the seam between two pieces sounds both at once.
  const beats = [];
  for (const note of notes) {
    const open = beats.at(-1);
    if (open && note.time - open.time < BEAT_WINDOW) { if (!open.pieces.includes(note.piece)) open.pieces.push(note.piece); }
    else beats.push({ time: note.time, pieces: [note.piece] });
  }
  for (const beat of beats) beat.pieces.sort();
  return {
    originX: aim.originX, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge,
    ledger,
    order: ledger.length ? ledger.join(' > ') : '(no piece)',
    notes,
    beats,
    phrase: beats.length ? beats.map(beat => beat.pieces.join('+')).join(' > ') : '(silent)',
    pitches: notes.map(note => note.degree),
    terminal: { reason: last.terminal.reason, elapsed: last.terminal.elapsed, position: [...last.terminal.position] },
  };
}

/**
 * Fire every aim at one preset document. Returns reduced rows in aim order.
 * Aims the world's own shot rules reject are returned as { rejected }.
 */
export async function sweep({ preset, aims, havok, gitSha = rangeGitSha() }) {
  const document = validateRangePreset(preset);
  const { world } = adaptRangePreset(document);
  const session = createRangeHarness(havok, world, gitSha === 'unknown' ? 'unknown' : gitSha);
  const rows = [];
  try {
    for (const aim of aims) {
      let setup;
      try { setup = validateWorldcraftShot(world, { railIndex: 1, originX: aim.originX ?? 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge }); }
      catch (error) { rows.push({ ...aim, rejected: error.message }); continue; }
      rows.push(reduce(session.shoot(world, setup), { ...aim, originX: setup.originX }));
    }
    return {
      rows,
      identity: {
        presetId: document.id,
        presetHash: await sha256Hex(exportRangePreset(document)),
        worldIdentityHash: await sha256Hex(worldcraftIdentity(world)),
        pieces: document.objects.length,
        gitSha,
      },
      diagnostics: session.runtime.diagnostics(),
    };
  } finally { session.dispose(); }
}

const key = (yaw, elevation, charge) => `${yaw}|${elevation}|${charge}`;

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/** Distribution of note counts, phrases, timing, and per-piece use over fired rows. */
export function summarize(rows, pieces) {
  const fired = rows.filter(row => !row.rejected);
  const histogram = {};
  const phrases = new Map(), orders = new Map(), pitchPhrases = new Map();
  const pieceShots = Object.fromEntries(pieces.map(id => [id, 0]));
  const pieceNotes = Object.fromEntries(pieces.map(id => [id, 0]));
  const firstSound = [], gaps = [], flight = [], reasons = {};
  let repeatedPiece = 0, dribble = 0;
  let chords = 0;
  for (const row of fired) {
    const count = row.beats.length;
    if (row.beats.some(beat => beat.pieces.length > 1)) chords += 1;
    histogram[count] = (histogram[count] ?? 0) + 1;
    phrases.set(row.phrase, (phrases.get(row.phrase) ?? 0) + 1);
    orders.set(row.order, (orders.get(row.order) ?? 0) + 1);
    if (count >= 2) pitchPhrases.set(row.pitches.join(''), (pitchPhrases.get(row.pitches.join('')) ?? 0) + 1);
    for (const id of new Set(row.notes.map(note => note.piece))) pieceShots[id] = (pieceShots[id] ?? 0) + 1;
    for (const note of row.notes) pieceNotes[note.piece] = (pieceNotes[note.piece] ?? 0) + 1;
    if (count) firstSound.push(row.beats[0].time);
    let sameInARow = false;
    for (let i = 1; i < count; i += 1) {
      gaps.push(row.beats[i].time - row.beats[i - 1].time);
      if (row.beats[i].pieces.join('+') === row.beats[i - 1].pieces.join('+')) sameInARow = true;
    }
    if (new Set(row.notes.map(note => note.piece)).size < row.notes.length) repeatedPiece += 1;
    if (sameInARow) dribble += 1;
    flight.push(row.terminal.elapsed);
    reasons[row.terminal.reason] = (reasons[row.terminal.reason] ?? 0) + 1;
  }
  const shots = fired.length;
  const at = n => Object.entries(histogram).filter(([count]) => Number(count) >= n).reduce((sum, [, value]) => sum + value, 0);
  const share = value => round(value / Math.max(1, shots));
  const top = map => [...map.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const multiPhrases = top(phrases).filter(([phrase]) => phrase.includes(' > '));
  return {
    shots,
    rejected: rows.length - shots,
    beatHistogram: histogram,
    silent: histogram[0] ?? 0, silentShare: share(histogram[0] ?? 0),
    one: histogram[1] ?? 0,
    twoPlus: at(2), twoPlusShare: share(at(2)),
    threePlus: at(3), threePlusShare: share(at(3)),
    threeToFive: at(3) - at(6), threeToFiveShare: share(at(3) - at(6)),
    sixPlus: at(6), sixPlusShare: share(at(6)),
    maxNotes: Math.max(0, ...Object.keys(histogram).map(Number)),
    distinctPhrases: phrases.size,
    distinctMultiBeatPhrases: multiPhrases.length,
    distinctThreePlusPhrases: multiPhrases.filter(([phrase]) => phrase.split(' > ').length >= 3).length,
    distinctLedgerOrders: orders.size,
    distinctPitchPhrases: pitchPhrases.size,
    shotsRepeatingAPiece: repeatedPiece,
    shotsWithSamePieceTwiceInARow: dribble,
    shotsWithASeamChord: chords,
    firstSoundSeconds: { median: round(median(firstSound) ?? 0, 3), p10: round(quantile(firstSound, 0.1) ?? 0, 3), p90: round(quantile(firstSound, 0.9) ?? 0, 3) },
    gapSeconds: { count: gaps.length, median: round(median(gaps) ?? 0, 3), p10: round(quantile(gaps, 0.1) ?? 0, 3), p90: round(quantile(gaps, 0.9) ?? 0, 3), under150ms: gaps.filter(gap => gap < 0.15).length, over1s: gaps.filter(gap => gap > 1).length },
    flightSeconds: { median: round(median(flight) ?? 0, 3), p90: round(quantile(flight, 0.9) ?? 0, 3), max: round(Math.max(0, ...flight), 3) },
    terminalReasons: reasons,
    pieceShots,
    pieceNotes,
    topPhrases: top(phrases).slice(0, 16).map(([phrase, count]) => ({ phrase, count })),
  };
}

/**
 * Neighbour behaviour on a regular grid whose spacing is one slider step on
 * each axis. For every interior cell with at least `floor` beats, look at its
 * six axis neighbours and say what each one became.
 *   same      identical phrase
 *   variation a different phrase that still has at least `floor` beats
 *   thinner   fewer than `floor` beats but not silent
 *   silent    no note at all
 */
export function neighbourhood(rows, steps = SLIDER_STEPS, floor = 3) {
  const fired = rows.filter(row => !row.rejected);
  const index = new Map(fired.map(row => [key(row.yaw, row.elevation, row.charge), row]));
  const totals = { cells: 0, neighbours: 0, same: 0, variation: 0, thinner: 0, silent: 0, cellsAllSix: 0, cellsNoCollapse: 0, cellsWithVariation: 0 };
  for (const row of fired) {
    if (row.beats.length < floor) continue;
    const around = [
      [row.yaw - steps.yaw, row.elevation, row.charge], [row.yaw + steps.yaw, row.elevation, row.charge],
      [row.yaw, row.elevation - steps.elevation, row.charge], [row.yaw, row.elevation + steps.elevation, row.charge],
      [row.yaw, row.elevation, row.charge - steps.charge], [row.yaw, row.elevation, row.charge + steps.charge],
    ].map(([yaw, elevation, charge]) => index.get(key(round(yaw, 3), round(elevation, 3), round(charge, 3))));
    if (around.some(item => !item)) continue;
    totals.cells += 1;
    let same = 0, collapse = 0, variation = 0;
    for (const item of around) {
      totals.neighbours += 1;
      if (item.phrase === row.phrase) { totals.same += 1; same += 1; }
      else if (item.beats.length >= floor) { totals.variation += 1; variation += 1; }
      else if (item.beats.length === 0) { totals.silent += 1; collapse += 1; }
      else { totals.thinner += 1; collapse += 1; }
    }
    if (same === 6) totals.cellsAllSix += 1;
    if (collapse === 0) totals.cellsNoCollapse += 1;
    if (variation > 0) totals.cellsWithVariation += 1;
  }
  const share = value => round(value / Math.max(1, totals.neighbours));
  return {
    floor,
    ...totals,
    sameShare: share(totals.same),
    variationShare: share(totals.variation),
    thinnerShare: share(totals.thinner),
    silentShare: share(totals.silent),
    keptRichShare: share(totals.same + totals.variation),
    cellsNoCollapseShare: round(totals.cellsNoCollapse / Math.max(1, totals.cells)),
  };
}
