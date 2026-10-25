// Musical Workshop order search. Real Havok. The seed is recorded and is not
// applied to the solver. Piece steps are the editor steps (0.5 m, 5°). Aim
// steps are the play controls (0.5° yaw and elevation, 0.01 charge, 0.5 m origin).
//
//   node scripts/range/music-search.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { adaptRangePreset, createMusicalWorkshopPreset, bindRangeShot, exportRangePreset, sha256Hex, validateRangePreset } from '../../lib/worldcraft-range.js';
import { validateWorldcraftShot } from '../../lib/worldcraft-model.js';
import { describeImpactSequence } from '../../lib/worldcraft-resonance.js';
import { createRangeHarness, rangeGitSha } from './run.mjs';

Logger.LogLevels = 0;

const seed = 20261025;
const openingSetup = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };
const preset = createMusicalWorkshopPreset();

function product(parts) {
  return parts.reduce((rows, part) => rows.flatMap(row => part.map(value => [...row, value])), [[]]);
}
const voice = (material, degree) => ({ material, degree });
const piece = (id, kind, pose, note) => ({ id, kind, x: pose[0], z: pose[1], yaw: pose[2], voice: note });
const ramp = pose => piece('ramp-yours', 'ramp', pose, voice('metal', 1));
const bank = pose => piece('bank-yours', 'bank', pose, voice('timber', 0));
const plate = pose => piece('plate-yours', 'plate', pose, voice('metal', 2));
const layout = (id, source, rampPose, bankPose, platePose, setup = openingSetup) => ({
  id, source, setup, objects: [ramp(rampPose), bank(bankPose), plate(platePose)],
});

const known = [
  layout('opening', 'opening', [0, 42, 0], [14, 28, 0], [0, 68, 0]),
  layout('early-cooccur', 'known-phrase-geometry', [-8, 40, 0], [0, 16, 80], [-24, 64, 0]),
  layout('late-plate', 'known-phrase-geometry', [-1, 42, 20], [-6, 68, 20], [-28, 58, 90]),
  layout('early-plate-clear', 'known-phrase-geometry', [-8, 40, 0], [0, 16, 80], [0, 68, 0]),
  layout('late-plate-out', 'known-phrase-geometry', [-1, 42, 20], [-6, 68, 20], [-24, 58, 0]),
  layout('plate-lead-center', 'plate-lead', [0, 52, 0], [16, 40, 0], [0, 24, 0]),
  layout('plate-lead-yaw90', 'plate-lead', [0, 56, 0], [-16, 44, 80], [0, 24, 90]),
  layout('ramp-aside', 'plate-lead', [18, 40, 0], [0, 64, 0], [0, 36, 0]),
  layout('ramp-aside-bank', 'plate-lead', [18, 48, 0], [-8, 48, 80], [0, 28, 90]),
  layout('bank-on-line', 'bank-lead', [0, 48, 0], [0, 20, 0], [0, 70, 0]),
  layout('bank-faced', 'bank-lead', [8, 52, 0], [0, 22, 80], [-12, 64, 0]),
];

const aimOnOpening = product([
  [-4, 0, 4],
  [-24, -8, 0, 8, 24],
  [12, 18, 32],
  [0.4, 0.55, 0.75],
]).map(([originX, yaw, elevation, charge], index) => layout(
  `opening-aim-${index}`,
  'opening-aim',
  [0, 42, 0],
  [14, 28, 0],
  [0, 68, 0],
  { railIndex: 1, originX, yaw, elevation, charge },
));

const lobs = product([
  [-12, 0, 12],
  [45, 62],
  [0.5, 0.8],
]).map(([yaw, elevation, charge], index) => layout(
  `lob-${index}`,
  'lob',
  [0, 42, 0],
  [14, 28, 0],
  [0, 68, 0],
  { railIndex: 1, originX: 0, yaw, elevation, charge },
));

const plateForward = product([
  [[-8, 24, 0], [0, 24, 0], [8, 24, 90], [0, 32, 0]],
  [[0, 52, 0], [12, 56, 0], [-12, 48, 0]],
  [[0, 64, 0], [16, 44, 80], [-16, 60, -80]],
]).map(([platePose, rampPose, bankPose], index) => layout(
  `forward-${index}`,
  'plate-forward',
  rampPose,
  bankPose,
  platePose,
));

// The phrase preset's three-note layouts miss the plate once the stand-in collider
// is gone. These grids put the plate on the landing each of those shots actually flew.
const plateOnEarly = product([
  [-28, -24, -20, -16, -12],
  [46, 50, 54, 58],
  [0, 90],
]).map(([x, z, yaw], index) => layout('early-plate-' + index, 'early-plate', [-8, 40, 0], [0, 16, 80], [x, z, yaw]));

const plateOnLate = product([
  [-28, -26, -24, -22, -20],
  [52, 56, 58, 62],
  [0, 90],
]).map(([x, z, yaw], index) => layout('late-catch-' + index, 'late-catch', [-1, 42, 20], [-6, 68, 20], [x, z, yaw]));

const bankBetween = product([
  [-4, 0, 4],
  [50, 54, 58],
  [70, 80, 90],
]).map(([x, z, yaw], index) => layout('between-' + index, 'bank-between', [0, 42, 0], [x, z, yaw], [0, 68, 0]));

const sidePlate = product([
  [[12, 30, 0], [-12, 30, 0], [16, 36, 90]],
  [[0, 8, 18, 0.55], [4, 16, 22, 0.6], [-4, -16, 22, 0.6]],
]).map(([platePose, aim], index) => layout(
  `side-${index}`,
  'side-plate',
  [0, 42, 0],
  [14, 56, 0],
  platePose,
  { railIndex: 1, originX: aim[0], yaw: aim[1], elevation: aim[2], charge: aim[3] },
));

const jobs = [...known, ...aimOnOpening, ...lobs, ...plateForward, ...sidePlate, ...plateOnEarly, ...plateOnLate, ...bankBetween];

function orderOf(impacts) {
  return impacts.map(impact => impact.note).join('>');
}

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const gitSha = rangeGitSha();
const openingWorld = adaptRangePreset(preset).world;
const session = createRangeHarness(havok, openingWorld, gitSha);
const orders = new Map();
let fired = 0;
let rejected = 0;
const catalogPresetHash = await sha256Hex(exportRangePreset(preset));

try {
  for (const job of jobs) {
    let document;
    let world;
    let setup;
    try {
      document = validateRangePreset({ ...preset, objects: job.objects });
      world = adaptRangePreset(document).world;
      setup = validateWorldcraftShot(world, job.setup);
    } catch {
      rejected += 1;
      continue;
    }
    const last = session.shoot(world, setup);
    fired += 1;
    const shot = await bindRangeShot({
      preset: document,
      world,
      setup,
      build: gitSha,
      launch: last.launch,
      points: last.samples,
      events: last.evidence,
      contacts: last.contacts,
      terminal: last.terminal,
    });
    const pieceImpacts = (last.resonance?.impacts ?? []).filter(impact => ['ramp', 'bank', 'plate', 'block'].includes(impact.role));
    const described = describeImpactSequence(world, last.contacts, last.resonance);
    const key = orderOf(pieceImpacts) || '(none)';
    const row = orders.get(key) ?? { order: key, headline: described.headline, noteCount: described.noteCount, count: 0, sources: {}, example: null };
    row.count += 1;
    row.sources[job.source] = (row.sources[job.source] ?? 0) + 1;
    if (!row.example) {
      const pointHash = await sha256Hex(JSON.stringify(shot.points));
      row.example = {
        id: job.id,
        source: job.source,
        objects: document.objects,
        setup,
        headline: described.headline,
        explanation: described.explanation,
        order: pieceImpacts.map(impact => impact.note),
        impacts: pieceImpacts.map(impact => ({
          piece: impact.piece,
          role: impact.role,
          time: impact.time,
          material: impact.material,
          degree: impact.degree,
          note: impact.note,
          hz: impact.hz,
          gain: impact.gain,
          callbacks: impact.callbacks,
        })),
        contacts: shot.contacts.map(contact => ({
          body: contact.body,
          count: contact.count,
          first: contact.first,
          last: contact.last,
          point: contact.point,
        })),
        terminal: shot.terminal,
        bindingHash: shot.bindingHash,
        presetHash: shot.presetHash,
        worldIdentity: shot.worldSnapshot.worldIdentity,
        pointHash,
        pointCount: shot.points.length,
      };
    }
    orders.set(key, row);
    if (fired % 40 === 0) console.error(`fired ${fired} rejected ${rejected} orders ${orders.size}`);
  }
} finally {
  session.dispose();
}

const ranked = [...orders.values()].sort((a, b) => b.noteCount - a.noteCount || b.count - a.count || a.order.localeCompare(b.order));
const byOrder = new Map(ranked.filter(row => row.example && row.order !== '(none)').map(row => [row.order, row]));
const prefer = ['D4>E4', 'D4>C4>E4', 'C4>D4>E4', 'E4', 'D4>D4', 'C4>D4', 'D4>C4', 'C4'];
const wanted = [];
for (const key of prefer) {
  const row = byOrder.get(key);
  if (!row || wanted.includes(row)) continue;
  wanted.push(row);
  if (wanted.length === 5) break;
}

const confirm = createRangeHarness(havok, openingWorld, gitSha);
const arrangements = [];
let retune = null;
try {
  for (const row of wanted) {
    const example = row.example;
    const document = validateRangePreset({ ...preset, objects: example.objects });
    const world = adaptRangePreset(document).world;
    const setup = validateWorldcraftShot(world, example.setup);
    const again = confirm.shoot(world, setup);
    const againShot = await bindRangeShot({
      preset: document,
      world,
      setup,
      build: gitSha,
      launch: again.launch,
      points: again.samples,
      events: again.evidence,
      contacts: again.contacts,
      terminal: again.terminal,
    });
    const pointHash = await sha256Hex(JSON.stringify(againShot.points));
    let samplesMatch = again.samples.length === example.pointCount;
    if (pointHash !== example.pointHash) samplesMatch = false;
    const notes = (again.resonance?.impacts ?? []).filter(impact => ['ramp', 'bank', 'plate', 'block'].includes(impact.role)).map(impact => impact.note);
    arrangements.push({
      ...example,
      confirmed: samplesMatch && notes.join('>') === example.order.join('>'),
      confirmedBindingHash: againShot.bindingHash,
      confirmedPointHash: pointHash,
    });
  }
  const first = arrangements[0];
  if (first) {
    const document = validateRangePreset({ ...preset, objects: first.objects });
    const world = adaptRangePreset(document).world;
    const retuned = validateRangePreset({
      ...preset,
      objects: first.objects.map(object => ({ ...object, voice: { material: 'timber', degree: (object.voice.degree + 1) % 5 } })),
    });
    const retunedWorld = adaptRangePreset(retuned).world;
    const before = confirm.shoot(world, first.setup);
    const after = confirm.shoot(retunedWorld, first.setup);
    let identical = before.samples.length === after.samples.length;
    for (let i = 0; identical && i < before.samples.length; i++) {
      identical = Object.is(before.samples[i].t, after.samples[i].t)
        && Object.is(before.samples[i].x, after.samples[i].x)
        && Object.is(before.samples[i].y, after.samples[i].y)
        && Object.is(before.samples[i].z, after.samples[i].z);
    }
    const beforeNotes = before.resonance.impacts.map(impact => impact.note).join('>');
    const afterNotes = after.resonance.impacts.map(impact => impact.note).join('>');
    retune = {
      id: first.id,
      identicalSamples: identical,
      identicalTerminal: JSON.stringify(before.terminal.position) === JSON.stringify(after.terminal.position),
      notesBefore: beforeNotes,
      notesAfter: afterNotes,
      notesChanged: beforeNotes !== afterNotes,
    };
  }
} finally {
  confirm.dispose();
}

const summary = {
  seed,
  gitSha,
  presetId: preset.id,
  catalogPresetHash,
  fired,
  rejected,
  jobs: jobs.length,
  orders: ranked.map(row => ({ order: row.order, headline: row.headline, noteCount: row.noteCount, count: row.count, sources: row.sources, exampleId: row.example?.id ?? null })),
  arrangements,
  retune,
};
const dir = new URL('../../docs/experiments/range/appendix/music/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('search.json', dir), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  fired,
  rejected,
  orders: summary.orders.map(row => ({ order: row.order, count: row.count, exampleId: row.exampleId, headline: row.headline })),
  chosen: arrangements.map(row => ({ id: row.id, order: row.order, confirmed: row.confirmed, headline: row.headline, bindingHash: row.bindingHash })),
  retune,
}, null, 2));
