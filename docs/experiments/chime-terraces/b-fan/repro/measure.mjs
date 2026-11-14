// Chime Fan, and the two baselines, on the Ricochet Loop broad grid.
// One Havok instance. The seed is provenance only. It is not applied to the solver.
// Dynamics follow each world's presentation (normal-speed). Physics is the range harness.
//
//   node docs/experiments/chime-terraces/b-fan/repro/measure.mjs
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { adaptRangePreset, parseRangePreset } from '../../../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../../../scripts/range/run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const outDir = resolve(here, '../raw');

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

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function share(count, total) {
  return total ? round4(count / total) : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function contactOrder(contacts) {
  const ids = [];
  for (const row of contacts ?? []) {
    if (!row || row.body === 'worldcraft-ground' || typeof row.body !== 'string') continue;
    if (row.body === 'worldcraft-tee') continue;
    ids.push(row.body.startsWith('worldcraft-object-') ? row.body.slice('worldcraft-object-'.length) : row.body);
  }
  return ids.join(' > ') || '(none)';
}

function sounding(resonance) {
  return (resonance?.impacts ?? []).filter(impact => impact && impact.gain > 0 && impact.piece);
}

function familyOf(notes) {
  const collapsed = [];
  for (const note of notes) if (collapsed.at(-1) !== note.piece) collapsed.push(note.piece);
  const distinct = [];
  for (const piece of collapsed) if (!distinct.includes(piece)) distinct.push(piece);
  if (distinct.length >= 3) return distinct.slice(0, 3).join(' > ');
  return distinct.length ? `short:${distinct.join(' > ')}` : 'short:(none)';
}

function classify(last, aim) {
  const notes = sounding(last.resonance);
  const sequence = notes.map(impact => `${impact.piece}:${impact.note}`).join(' > ') || '(none)';
  const counts = new Map();
  for (const impact of notes) counts.set(impact.piece, (counts.get(impact.piece) ?? 0) + 1);
  const ranked = [...counts.values()].sort((a, b) => b - a);
  const ping = notes.length ? ((ranked[0] ?? 0) + (ranked[1] ?? 0)) / notes.length : null;
  return {
    y: aim.yaw,
    e: aim.elevation,
    c: aim.charge,
    n: notes.length,
    u: counts.size,
    f: familyOf(notes),
    s: sequence,
    o: contactOrder(last.contacts),
    ping,
    reason: last.terminal?.reason ?? null,
  };
}

function regionKey(row) {
  const yaw = row.y <= -8 ? 'left' : row.y >= 8 ? 'right' : 'centre';
  const elev = row.e <= 16 ? 'low' : 'high';
  return `${yaw}-${elev}`;
}

function topEntries(map, limit, total) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, share: share(count, total) }));
}

function histogram(rows, key) {
  const bins = {};
  for (const row of rows) {
    const value = String(row[key]);
    bins[value] = (bins[value] ?? 0) + 1;
  }
  return bins;
}

function nudgeAims(row) {
  return [
    { axis: 'yaw', yaw: round4(row.y - 0.5), elevation: row.e, charge: row.c },
    { axis: 'yaw', yaw: round4(row.y + 0.5), elevation: row.e, charge: row.c },
    { axis: 'elevation', yaw: row.y, elevation: round4(row.e - 0.5), charge: row.c },
    { axis: 'elevation', yaw: row.y, elevation: round4(row.e + 0.5), charge: row.c },
    { axis: 'charge', yaw: row.y, elevation: row.e, charge: round4(row.c - 0.01) },
    { axis: 'charge', yaw: row.y, elevation: row.e, charge: round4(row.c + 0.01) },
  ];
}

function summarize(rows, nudgeRows) {
  const orders = new Set(rows.map(row => row.o));
  const sequences = new Set(rows.map(row => row.s));
  const families = new Map();
  const pieceNotes = new Map();
  const reached = new Set();
  const buckets = { zero: 0, oneTwo: 0, threeFive: 0, sixPlus: 0 };
  const phrase = [];
  for (const row of rows) {
    families.set(row.f, (families.get(row.f) ?? 0) + 1);
    if (row.n === 0) buckets.zero += 1;
    else if (row.n <= 2) buckets.oneTwo += 1;
    else if (row.n <= 5) buckets.threeFive += 1;
    else buckets.sixPlus += 1;
    const pieces = row.s === '(none)' ? [] : row.s.split(' > ').map(token => token.slice(0, token.lastIndexOf(':')));
    for (const piece of pieces) pieceNotes.set(piece, (pieceNotes.get(piece) ?? 0) + 1);
    if (row.n >= 3) {
      phrase.push(row);
      for (const piece of new Set(pieces)) reached.add(piece);
    }
  }
  const noteTotal = [...pieceNotes.values()].reduce((sum, count) => sum + count, 0);
  const rankedPieces = [...pieceNotes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const regions = new Map();
  for (const row of rows) {
    const key = regionKey(row);
    const map = regions.get(key) ?? new Map();
    map.set(row.f, (map.get(row.f) ?? 0) + 1);
    regions.set(key, map);
  }
  const phraseRegions = new Map();
  for (const row of phrase) {
    const key = regionKey(row);
    const map = phraseRegions.get(key) ?? new Map();
    map.set(row.f, (map.get(row.f) ?? 0) + 1);
    phraseRegions.set(key, map);
  }
  const uniqueValues = phrase.map(row => row.u);
  const pingValues = phrase.map(row => row.ping);
  const byAxis = { yaw: [], elevation: [], charge: [] };
  let allSixNotes = 0;
  let allSixFamily = 0;
  let allSixSequence = 0;
  let relatedDifferent = 0;
  const familyKept = [];
  for (const entry of nudgeRows) {
    const grouped = { yaw: [], elevation: [], charge: [] };
    for (const step of entry.steps) grouped[step.axis].push(step);
    let notesOk = true;
    let familyOk = true;
    let sequenceOk = true;
    let differed = false;
    for (const axis of Object.keys(grouped)) {
      const bothNotes = grouped[axis].every(step => step.n >= 3);
      const bothFamily = grouped[axis].every(step => step.f === entry.f);
      byAxis[axis].push({ notes: bothNotes, family: bothFamily });
      if (!bothNotes) notesOk = false;
      if (!bothFamily) familyOk = false;
    }
    for (const step of entry.steps) {
      if (step.s !== entry.s) sequenceOk = false;
      if (step.f === entry.f && step.s !== entry.s) differed = true;
    }
    if (notesOk) allSixNotes += 1;
    if (familyOk) allSixFamily += 1;
    if (sequenceOk) allSixSequence += 1;
    if (familyOk && differed) relatedDifferent += 1;
    familyKept.push({
      ...entry,
      familyHits: entry.steps.filter(step => step.f === entry.f).length,
      noteHits: entry.steps.filter(step => step.n >= 3).length,
    });
  }
  const axisReport = {};
  for (const axis of Object.keys(byAxis)) {
    const steps = byAxis[axis];
    axisReport[axis] = {
      bothDirectionsStill3Plus: share(steps.filter(step => step.notes).length, steps.length),
      bothDirectionsSameFamily: share(steps.filter(step => step.family).length, steps.length),
    };
  }
  return {
    shots: rows.length,
    distinctContactOrders: orders.size,
    distinctNoteSequences: sequences.size,
    phraseFamilies: families.size,
    topFamilies: topEntries(families, 12, rows.length),
    noteBuckets: {
      zero: buckets.zero,
      oneTwo: buckets.oneTwo,
      threeFive: buckets.threeFive,
      sixPlus: buckets.sixPlus,
      shares: {
        zero: share(buckets.zero, rows.length),
        oneTwo: share(buckets.oneTwo, rows.length),
        threeFive: share(buckets.threeFive, rows.length),
        sixPlus: share(buckets.sixPlus, rows.length),
      },
    },
    phraseShots: phrase.length,
    nudge: {
      base: 'shots with 3 or more sounding notes',
      step: { yaw: 0.5, elevation: 0.5, charge: 0.01 },
      checks: nudgeRows.length,
      perAxis: axisReport,
      allSixStill3Plus: share(allSixNotes, nudgeRows.length),
      allSixSameFamily: share(allSixFamily, nudgeRows.length),
      allSixSameSequence: share(allSixSequence, nudgeRows.length),
      allSixSameFamilyDifferentSequence: share(relatedDifferent, nudgeRows.length),
    },
    breadth: {
      medianDistinctPieces: median(uniqueValues),
      distinctPieces: histogram(phrase, 'u'),
      topTwoPiecesShareOfAllNotes: share((rankedPieces[0]?.[1] ?? 0) + (rankedPieces[1]?.[1] ?? 0), noteTotal),
      topPieces: rankedPieces.slice(0, 6).map(([piece, count]) => ({ piece, notes: count, share: share(count, noteTotal) })),
      medianPingPong: median(pingValues.map(value => round4(value))),
      pureTwoPieceShare: share(phrase.filter(row => row.u <= 2).length, phrase.length),
    },
    regions: Object.fromEntries([...regions.entries()].sort().map(([key, map]) => [key, {
      shots: [...map.values()].reduce((sum, count) => sum + count, 0),
      topFamilies: topEntries(map, 5, [...map.values()].reduce((sum, count) => sum + count, 0)),
    }])),
    phraseRegions: Object.fromEntries([...phraseRegions.entries()].sort().map(([key, map]) => [key, {
      shots: [...map.values()].reduce((sum, count) => sum + count, 0),
      topFamilies: topEntries(map, 5, [...map.values()].reduce((sum, count) => sum + count, 0)),
    }])),
    pieceCoverage: {
      soundingPieces: rankedPieces.length,
      reachedByPhraseShots: reached.size,
      reached: [...reached].sort(),
    },
    terminals: histogram(rows, 'reason'),
    familyKept: familyKept.map(entry => ({ y: entry.y, e: entry.e, c: entry.c, f: entry.f, s: entry.s, familyHits: entry.familyHits, noteHits: entry.noteHits })),
  };
}

function svgChart(rows) {
  const slotOf = name => (name.includes('bank-w') ? 'west' : name.includes('bank-e') ? 'east' : name.includes('bank-c') ? 'centre' : 'other');
  const palette = { west: '#2f6f4e', centre: '#1d4e89', east: '#8a4b08', other: '#6b6258' };
  const cell = 18;
  const left = 48;
  const top = 36;
  const width = left + YAWS.length * cell + 20;
  const height = top + ELEVS.length * cell + 78;
  let body = '';
  YAWS.forEach((yaw, yx) => {
    ELEVS.forEach((elevation, ey) => {
      const shots = rows.filter(row => row.y === yaw && row.e === elevation);
      const counts = new Map();
      for (const shot of shots) if (!shot.f.startsWith('short:')) counts.set(slotOf(shot.f), (counts.get(slotOf(shot.f)) ?? 0) + 1);
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const fill = best ? palette[best[0]] : '#e6e1d8';
      const alpha = best ? Math.max(0.4, best[1] / CHARGES.length) : 1;
      body += `<rect x="${left + yx * cell}" y="${top + ey * cell}" width="${cell - 1}" height="${cell - 1}" fill="${fill}" fill-opacity="${alpha}"/>`;
    });
  });
  const elevLabels = ELEVS.map((elevation, index) => `<text x="${left - 8}" y="${top + index * cell + 13}" text-anchor="end" font-size="11" font-family="Palatino, serif">${elevation}</text>`).join('');
  const yawLabels = YAWS.filter((_, index) => index % 4 === 0).map(yaw => {
    const index = YAWS.indexOf(yaw);
    return `<text x="${left + index * cell}" y="${top + ELEVS.length * cell + 16}" font-size="11" font-family="Palatino, serif">${yaw}</text>`;
  }).join('');
  const legend = ['west', 'centre', 'east'].map((slot, index) => `<rect x="${left + index * 120}" y="${height - 28}" width="12" height="12" fill="${palette[slot]}"/><text x="${left + index * 120 + 18}" y="${height - 18}" font-size="12" font-family="Palatino, serif">${slot} slot</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<rect width="100%" height="100%" fill="#f7f4ef"/>\n<text x="${left}" y="22" font-size="14" font-family="Palatino, serif">Chime Fan phrase slot by yaw and elevation</text>\n${elevLabels}${yawLabels}${body}${legend}\n</svg>\n`;
}

async function loadPreset(relativePath) {
  return parseRangePreset(await readFile(resolve(root, relativePath), 'utf8'));
}

async function survey(havok, preset, seed) {
  const { world } = adaptRangePreset(preset);
  const session = createRangeHarness(havok, world, rangeGitSha());
  session.runtime.setDynamics('normal-speed');
  const fire = aim => {
    const last = session.shoot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge });
    return { row: classify(last, aim), last };
  };
  const started = performance.now();
  const fired = AIMS.map(fire);
  const rows = fired.map(item => item.row);
  const nudgeRows = [];
  for (const row of rows) {
    if (row.n < 3) continue;
    const steps = nudgeAims(row).map(aim => {
      const shot = fire(aim);
      return { axis: aim.axis, ...shot.row, y: aim.yaw, e: aim.elevation, c: aim.charge };
    });
    nudgeRows.push({ y: row.y, e: row.e, c: row.c, f: row.f, s: row.s, steps });
  }
  const summary = summarize(rows, nudgeRows);
  summary.seconds = round4((performance.now() - started) / 1000);
  summary.seed = seed;
  summary.pieces = world.objects.length;
  session.dispose();
  return { rows, summary };
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

await mkdir(outDir, { recursive: true });
const wasm = await readFile(new URL('../../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const worlds = [
  { id: 'chime-fan', file: 'worlds/foundry/chime-fan/preset.json', seed: 20261114 },
  { id: 'descending-resonance', file: 'worlds/foundry/descending-resonance/preset.json', seed: 20261110 },
  { id: 'ricochet-garden-loop', file: 'worlds/foundry/ricochet-garden-loop/preset.json', seed: 20261110 },
];
const report = {
  definitions: {
    grid: { yaw: [-24, 24, 2], elevation: ELEVS, charge: CHARGES, shots: AIMS.length, railIndex: 1, originX: 0 },
    nudge: 'One slider step: yaw ±0.5°, elevation ±0.5°, charge ±0.01. Both directions. Same definition as the Ricochet Loop neighbour walk.',
    contactOrder: 'Piece contacts in ledger order. Ground and the tee are omitted. Silent pieces would be kept. Repeats are kept.',
    noteSequence: 'Resonance impacts with gain above 0, in time order, written piece:note. Dynamics are normal-speed, the presentation value on all three worlds.',
    phraseFamily: 'Collapse immediate repeats of the same piece, then take the first three distinct pieces in order of appearance. Fewer than three distinct pieces is a short family.',
    regions: 'Left is yaw ≤ -8, centre is -8 < yaw < 8, right is yaw ≥ 8. Low elevation is 8, 12, and 16. High is 20, 24, 30, and 40.',
    seedAppliedToSolver: false,
  },
  gitSha: rangeGitSha(),
  worlds: {},
};
for (const world of worlds) {
  const preset = await loadPreset(world.file);
  const result = await survey(havok, preset, world.seed);
  const compact = result.rows.map(row => ({ y: row.y, e: row.e, c: row.c, n: row.n, u: row.u, f: row.f, s: row.s, o: row.o }));
  const body = `${JSON.stringify({ id: world.id, seed: world.seed, columns: 'y yaw, e elevation, c charge, n notes, u distinct pieces, f family, s sequence, o contact order', rows: compact })}\n`;
  const file = resolve(outDir, `${world.id}.json`);
  await writeFile(file, body);
  const { familyKept, ...metrics } = result.summary;
  report.worlds[world.id] = { ...metrics, rowsSha256: sha256(body), rowsBytes: Buffer.byteLength(body) };
  if (world.id === 'chime-fan') {
    await writeFile(resolve(here, '../aim-regions.svg'), svgChart(result.rows));
    const kept = familyKept.filter(entry => !entry.f.startsWith('short:'));
    const pick = token => {
      const matches = kept.filter(entry => entry.f.includes(token));
      const counts = new Map();
      for (const entry of matches) counts.set(entry.f, (counts.get(entry.f) ?? 0) + 1);
      return [...matches].sort((a, b) => (counts.get(b.f) - counts.get(a.f)) || (b.familyHits - a.familyHits) || (b.noteHits - a.noteHits) || (a.y - b.y))[0] ?? null;
    };
    const slim = entry => entry && ({ y: entry.y, e: entry.e, c: entry.c, f: entry.f, s: entry.s, familyHits: entry.familyHits, noteHits: entry.noteHits });
    report.starterCandidates = {
      west: slim(pick('bank-w')),
      centre: slim(pick('bank-c')),
      east: slim(pick('bank-e')),
    };
  }
  process.stdout.write(`${world.id} phrases=${result.summary.phraseShots} families=${result.summary.phraseFamilies} orders=${result.summary.distinctContactOrders} ${result.summary.seconds}s\n`);
}
await writeFile(resolve(outDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${resolve(outDir, 'summary.json')}\n`);
