// Headless Havok measurement for Chime Terraces and the two musical baselines.
// The seed is provenance. It is not applied to the solver.
//
//   node docs/experiments/chime-terraces/a-terraces/measure.mjs
//
// Grid is Ricochet Loop's 875-shot broad grid, unchanged.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { foundryPreset } from '../../../../lib/worldcraft-foundry.js';
import { adaptRangePreset, parseRangePreset } from '../../../../lib/worldcraft-range.js';
import { createRangeHarness } from '../../../../scripts/range/run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED = 20261114;

function series(from, to, step) {
  const values = [];
  const n = Math.round((to - from) / step);
  for (let i = 0; i <= n; i += 1) values.push(Math.round((from + i * step) * 1000) / 1000);
  return values;
}

const grid = {
  yaw: series(-24, 24, 2),
  elevation: [8, 12, 16, 20, 24, 30, 40],
  charge: [0.35, 0.45, 0.55, 0.65, 0.8],
};
const aims = [];
for (const yaw of grid.yaw) for (const elevation of grid.elevation) for (const charge of grid.charge) aims.push({ yaw, elevation, charge });
if (aims.length !== 875) throw new Error(`Expected 875 aims, got ${aims.length}`);

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function share(count, total) {
  return total ? round(count / total, 4) : 0;
}

function familyOf(pieces) {
  const collapsed = [];
  for (const piece of pieces) if (collapsed.at(-1) !== piece) collapsed.push(piece);
  const distinct = [];
  for (const piece of collapsed) if (!distinct.includes(piece)) distinct.push(piece);
  if (!pieces.length) return '(silent)';
  if (distinct.length < 3) return `short:${collapsed.join('>')}`;
  return distinct.slice(0, 3).join('>');
}
function regionOf(aim) {
  const side = aim.yaw <= -8 ? 'left' : aim.yaw >= 8 ? 'right' : 'centre';
  const band = aim.elevation >= 24 ? 'high' : 'low';
  return `${side}-${band}`;
}
function bucket(count) {
  if (count <= 0) return '0';
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  return '6+';
}

function nudgeAims(aim) {
  return [
    { axis: 'yaw', direction: -1, yaw: round(aim.yaw - 0.5, 1), elevation: aim.elevation, charge: aim.charge },
    { axis: 'yaw', direction: 1, yaw: round(aim.yaw + 0.5, 1), elevation: aim.elevation, charge: aim.charge },
    { axis: 'elevation', direction: -1, yaw: aim.yaw, elevation: round(aim.elevation - 0.5, 1), charge: aim.charge },
    { axis: 'elevation', direction: 1, yaw: aim.yaw, elevation: round(aim.elevation + 0.5, 1), charge: aim.charge },
    { axis: 'power', direction: -1, yaw: aim.yaw, elevation: aim.elevation, charge: round(aim.charge - 0.01, 2) },
    { axis: 'power', direction: 1, yaw: aim.yaw, elevation: aim.elevation, charge: round(aim.charge + 0.01, 2) },
  ];
}

function shoot(harness, world, aim) {
  const last = harness.shoot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge });
  const notes = (last.resonance?.impacts ?? []).map(impact => ({
    piece: impact.piece,
    note: impact.note,
    material: impact.material,
    degree: impact.degree,
    hz: impact.hz,
    gain: impact.gain,
    time: impact.time,
    role: impact.role,
  }));
  const contacts = (last.contacts ?? []).map(row => row.body);
  return { notes, contacts, terminal: last.terminal, pieces: notes.map(note => note.piece) };
}

function summarize(rows, nudges) {
  const families = new Map();
  const orders = new Set();
  const pieceOrders = new Set();
  const sequences = new Set();
  const bins = { '0': 0, '1-2': 0, '3-5': 0, '6+': 0 };
  const pieceNotes = new Map();
  const reached = new Set();
  const regions = {};
  const distinctValues = [];
  const pingValues = [];
  let notesTotal = 0;
  for (const row of rows) {
    const key = familyOf(row.pieces);
    const bucketName = bucket(row.pieces.length);
    bins[bucketName] += 1;
    families.set(key, (families.get(key) ?? 0) + 1);
    orders.add(row.contacts.join('>') || '(none)');
    const pieceOrder = row.contacts.filter(body => body.startsWith('worldcraft-object-')).join('>') || '(no piece)';
    pieceOrders.add(pieceOrder);
    sequences.add(row.pieces.map((piece, index) => `${piece}:${row.notes[index].note}`).join('>') || '(silent)');
    for (const piece of row.pieces) {
      pieceNotes.set(piece, (pieceNotes.get(piece) ?? 0) + 1);
      notesTotal += 1;
    }
    const region = regionOf(row);
    regions[region] ??= { shots: 0, families: new Map() };
    regions[region].shots += 1;
    if (row.pieces.length >= 3) {
      const ids = new Set(row.pieces);
      distinctValues.push(ids.size);
      for (const id of ids) reached.add(id);
      const counts = new Map();
      for (const piece of row.pieces) counts.set(piece, (counts.get(piece) ?? 0) + 1);
      const top2 = [...counts.values()].sort((a, b) => b - a).slice(0, 2).reduce((sum, n) => sum + n, 0);
      pingValues.push(top2 / row.pieces.length);
      const long = regions[region].families;
      long.set(key, (long.get(key) ?? 0) + 1);
    }
  }
  const ranked = [...pieceNotes.entries()].sort((a, b) => b[1] - a[1]);
  const topFamilies = [...families.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12)
    .map(([family, count]) => ({ family, count, share: share(count, rows.length) }));
  const axis = { yaw: { nudges: 0, still3: 0, sameFamily: 0 }, elevation: { nudges: 0, still3: 0, sameFamily: 0 }, power: { nudges: 0, still3: 0, sameFamily: 0 } };
  let allSixStill = 0;
  let allSixFamily = 0;
  let longShots = distinctValues.length;
  for (const nudge of nudges) {
    let still = 0;
    let same = 0;
    for (const step of nudge.steps) {
      axis[step.axis].nudges += 1;
      if (step.notes >= 3) { axis[step.axis].still3 += 1; still += 1; }
      if (step.family === nudge.family) { axis[step.axis].sameFamily += 1; same += 1; }
    }
    if (still === 6) allSixStill += 1;
    if (same === 6) allSixFamily += 1;
  }
  const longRows = rows.filter(row => row.pieces.length >= 3);
  const gaps = [];
  let sequential = 0;
  let clustered = 0;
  for (const row of longRows) {
    const onset = new Map();
    for (const note of row.notes) if (!onset.has(note.piece)) onset.set(note.piece, note.time);
    const times = [...onset.values()].slice(0, 3);
    if (times.length >= 3 && times[2] - times[0] >= 0.15) sequential += 1;
    else clustered += 1;
    for (let index = 1; index < row.notes.length; index += 1) gaps.push(row.notes[index].time - row.notes[index - 1].time);
  }
  gaps.sort((a, b) => a - b);
  const axisReport = Object.fromEntries(Object.entries(axis).map(([name, row]) => [name, {
    still3: share(row.still3, row.nudges),
    sameFamily: share(row.sameFamily, row.nudges),
    nudges: row.nudges,
  }]));
  return {
    shots: rows.length,
    distinctContactOrders: orders.size,
    distinctPieceOrders: pieceOrders.size,
    distinctNoteSequences: sequences.size,
    phraseFamilies: families.size,
    topFamilies,
    noteBins: Object.fromEntries(Object.entries(bins).map(([name, count]) => [name, { count, share: share(count, rows.length) }])),
    nudge: {
      longShots,
      perAxis: axisReport,
      allSixStill3: share(allSixStill, longShots),
      allSixSameFamily: share(allSixFamily, longShots),
    },
    breadth: {
      medianDistinctPieces: median(distinctValues),
      meanDistinctPieces: distinctValues.length ? round(distinctValues.reduce((s, n) => s + n, 0) / distinctValues.length, 3) : null,
      distinctDistribution: distinctValues.reduce((map, n) => { map[n] = (map[n] ?? 0) + 1; return map; }, {}),
      topTwoPiecesNoteShare: share(ranked.slice(0, 2).reduce((s, entry) => s + entry[1], 0), notesTotal),
      topPieces: ranked.slice(0, 6).map(([piece, count]) => ({ piece, notes: count, share: share(count, notesTotal) })),
      medianPingPong: median(pingValues) === null ? null : round(median(pingValues), 4),
      meanPingPong: pingValues.length ? round(pingValues.reduce((s, n) => s + n, 0) / pingValues.length, 4) : null,
    },
    regions: Object.fromEntries(Object.entries(regions).map(([name, region]) => [name, {
      shots: region.shots,
      topFamilies: [...region.families.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([family, count]) => ({ family, count, shareOfRegion: share(count, region.shots) })),
    }])),
    pieceCoverage: { reachedByLongShots: reached.size, reached: [...reached].sort() },
    hearing: {
      sequentialFirstThree: sequential,
      clusteredFirstThree: clustered,
      sequentialShare: longRows.length ? round(sequential / longRows.length) : 0,
      medianConsecutiveGap: gaps.length ? round(gaps[Math.floor(gaps.length / 2)]) : null,
      consecutiveGapsUnder50ms: gaps.filter(gap => gap < 0.05).length,
      consecutiveGaps: gaps.length,
    },
    notesTotal,
  };
}

const EXEMPLAR_FAMILIES = [
  { role: 'centre-climb', family: 'ramp-c>high-2>high-3' },
  { role: 'centre-drop', family: 'mid-2>mid-3>low-3' },
  { role: 'west-climb', family: 'ramp-c>high-0>mid-0' },
  { role: 'east-climb', family: 'ramp-c>high-4>mid-4' },
  { role: 'east-walk', family: 'mid-3>mid-4>low-4' },
];

function pickExemplars(rows, nudges) {
  const nudgeByKey = new Map(nudges.map(nudge => [nudge.key, nudge]));
  const chosen = [];
  for (const wanted of EXEMPLAR_FAMILIES) {
    const list = rows.filter(row => familyOf(row.pieces) === wanted.family);
    if (!list.length) continue;
    const scored = list.map(row => {
      const nudge = nudgeByKey.get(`${row.yaw}|${row.elevation}|${row.charge}`);
      const still = nudge ? nudge.steps.filter(step => step.notes >= 3).length : 0;
      const same = nudge ? nudge.steps.filter(step => step.family === wanted.family).length : 0;
      return { row, still, same };
    }).sort((a, b) => b.same - a.same || b.still - a.still || a.row.pieces.length - b.row.pieces.length);
    const best = scored[0];
    chosen.push({
      role: wanted.role,
      family: wanted.family,
      familyShots: list.length,
      aim: { yaw: best.row.yaw, elevation: best.row.elevation, charge: best.row.charge },
      notes: best.row.pieces.map((piece, index) => `${piece}:${best.row.notes[index].note}`),
      nudgesStill3: best.still,
      nudgesSameFamily: best.same,
      impacts: best.row.impacts,
      terminal: best.row.terminal,
      contacts: best.row.contacts,
    });
  }
  const misses = rows.filter(row => row.pieces.length === 1 && row.pieces[0] === 'ramp-w');
  const miss = misses.find(row => row.yaw === -16 && row.elevation === 12) ?? misses.find(row => row.elevation === 12) ?? misses[0];
  if (miss) {
    chosen.push({
      role: 'near-miss',
      family: familyOf(miss.pieces),
      familyShots: misses.length,
      aim: { yaw: miss.yaw, elevation: miss.elevation, charge: miss.charge },
      notes: miss.pieces.map((piece, index) => `${piece}:${miss.notes[index].note}`),
      impacts: miss.impacts,
      terminal: miss.terminal,
      contacts: miss.contacts,
    });
  }
  return chosen;
}

const wasm = await readFile(new URL('../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const chimeText = await readFile(resolve(here, '../../../../worlds/foundry/chime-terraces/preset.json'), 'utf8');
const chime = adaptRangePreset(parseRangePreset(chimeText));
const baselines = ['descending-resonance', 'ricochet-garden-loop'].map(id => {
  const adapted = adaptRangePreset(foundryPreset(id));
  return { id, world: adapted.world, pieces: adapted.world.objects.length };
});
const harness = createRangeHarness(havok, baselines[0].world, 'chime-terraces');
const started = performance.now();

async function runWorld(id, world, pieceCount) {
  const rows = [];
  for (const aim of aims) {
    const shot = shoot(harness, world, aim);
    rows.push({ ...aim, pieces: shot.pieces, notes: shot.notes, contacts: shot.contacts, terminal: shot.terminal, impacts: shot.notes });
  }
  const nudges = [];
  for (const row of rows) {
    if (row.pieces.length < 3) continue;
    const family = familyOf(row.pieces);
    const steps = [];
    for (const aim of nudgeAims(row)) {
      const shot = shoot(harness, world, aim);
      steps.push({ axis: aim.axis, direction: aim.direction, notes: shot.pieces.length, family: familyOf(shot.pieces) });
    }
    nudges.push({ key: `${row.yaw}|${row.elevation}|${row.charge}`, family, steps });
  }
  const summary = summarize(rows, nudges);
  summary.id = id;
  summary.pieces = pieceCount;
  const exemplars = id === 'chime-terraces' ? pickExemplars(rows, nudges) : [];
  const compact = rows.map(row => ({
    y: row.yaw, e: row.elevation, c: row.charge,
    n: row.pieces.length,
    f: familyOf(row.pieces),
    s: row.pieces.map((piece, index) => `${piece}:${row.notes[index].note}`).join('>'),
  }));
  return { summary, compact, exemplars };
}

try {
  const chimeRun = await runWorld('chime-terraces', chime.world, chime.world.objects.length);
  const baseRuns = [];
  for (const baseline of baselines) baseRuns.push(await runWorld(baseline.id, baseline.world, baseline.pieces));
  const out = resolve(here, 'raw');
  await mkdir(out, { recursive: true });
  const report = {
    seed: SEED,
    seedAppliedToSolver: false,
    grid,
    shots: aims.length,
    nudge: '0.5° yaw, 0.5° elevation, 0.01 charge, both directions. One step is a slider detent.',
    regionCuts: 'left yaw <= -8°, centre -6° to 6°, right yaw >= 8°. low elevation <= 20°, high elevation >= 24°.',
    family: 'First three distinct sounding pieces after collapsing immediate repeats. Shorter shots keep the whole collapsed order and are marked short.',
    seconds: round((performance.now() - started) / 1000, 1),
    worlds: [chimeRun.summary, ...baseRuns.map(run => run.summary)],
    exemplars: chimeRun.exemplars.map(({ impacts, ...rest }) => rest),
  };
  await writeFile(resolve(out, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(out, 'shots-chime.json'), `${JSON.stringify(chimeRun.compact)}\n`);
  await writeFile(resolve(out, 'shots-descending.json'), `${JSON.stringify(baseRuns[0].compact)}\n`);
  await writeFile(resolve(out, 'shots-loop.json'), `${JSON.stringify(baseRuns[1].compact)}\n`);
  await writeFile(resolve(out, 'exemplars.json'), `${JSON.stringify(chimeRun.exemplars, null, 2)}\n`);
  const lines = report.worlds.map(world => `${world.id} long ${world.noteBins['3-5'].share + world.noteBins['6+'].share} fam ${world.phraseFamilies} ping ${world.breadth.meanPingPong} allSix ${world.nudge.allSixStill3}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  process.stdout.write(`${chimeRun.exemplars.map(item => `${item.role} ${item.aim.yaw}/${item.aim.elevation}/${item.aim.charge} ${item.notes.join(' ')} still ${item.nudgesStill3 ?? '-'} same ${item.nudgesSameFamily ?? '-'}`).join('\n')}\n`);
} finally {
  harness.dispose();
}
