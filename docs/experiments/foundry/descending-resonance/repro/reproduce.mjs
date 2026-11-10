// Reproduction of the Descending Resonance evidence. One fresh Havok instance,
// the incumbent runtime and step loop, and the preset files in worlds/foundry.
// The seed is provenance only. It is not applied to the solver.
//
//   node docs/experiments/foundry/descending-resonance/repro/reproduce.mjs
//   node docs/experiments/foundry/descending-resonance/repro/reproduce.mjs --only families
//
// Five arrangements are fired at the same three aim sets:
//   elevated   worlds/foundry/descending-resonance            (lift and tilt)
//   flat       worlds/foundry/descending-resonance-flat       (v1 pieces only, strongest flat layout found)
//   loop       worlds/foundry/ricochet-garden-loop            (PR #68, unchanged)
//   lift-only  the elevated preset with every tilt set to 0   (derived here, not registered)
//   no-tiers   the elevated preset without its six plates     (derived here, not registered)
//
// Counts are sampled setups. They are not a probability that a person finds a phrase.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRangePreset, validateRangePreset } from '../../../../../lib/worldcraft-range.js';
import { MIX_LIMIT, MUSICAL_WORKSHOP_SOUND, RESONANCE_VOICES, impactAcoustics, voiceImpact } from '../../../../../lib/worldcraft-resonance.js';
import { BEAT_WINDOW, SLIDER_STEPS, gridAims, loadHavok, neighbourhood, series, summarize, sweep } from '../../../../../scripts/foundry/contact-sweep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : 'all';
const SEED = 20261110;

// The three aim sets. None of them was chosen from a world's results.
const AIMS = {
  // The Ricochet Garden — Loop broad grid, unchanged, so its published counts can be checked.
  broad: gridAims({ yaws: series(-24, 24, 2), elevations: [8, 12, 16, 20, 24, 30, 40], charges: [0.35, 0.45, 0.55, 0.65, 0.8] }),
  // Every slider detent in a block around the opening aim all three worlds share (yaw 0°, elevation 18°, charge 0.55).
  lattice: gridAims({ yaws: series(-6, 6, SLIDER_STEPS.yaw), elevations: series(10, 26, SLIDER_STEPS.elevation), charges: series(0.45, 0.65, SLIDER_STEPS.charge) }),
};
// A wider reach: five carriage stops, yaw to ±30°, lobs to 50°, charge 0.30 to 0.90.
AIMS.wide = [-8, -4, 0, 4, 8].flatMap(originX => gridAims({ originX, yaws: series(-30, 30, 5), elevations: [10, 15, 20, 25, 30, 40, 50], charges: [0.3, 0.45, 0.6, 0.75, 0.9] }));

// Tested shots. The manifest stores the same setups. Each is fired with its six slider neighbours.
const FAMILIES = {
  elevated: [
    { id: 'opening', yaw: 0, elevation: 18, charge: 0.55 },
    { id: 'descent', yaw: -1, elevation: 24, charge: 0.56 },
    { id: 'west-descent', yaw: -5, elevation: 24, charge: 0.56 },
    { id: 'skip-to-crown', yaw: -1, elevation: 11.5, charge: 0.57 },
    { id: 'west-crown', yaw: -5, elevation: 12, charge: 0.56 },
    { id: 'wall-and-ramp', yaw: -2.5, elevation: 15, charge: 0.55 },
    { id: 'four', yaw: -2.5, elevation: 18.5, charge: 0.46 },
  ],
  flat: [
    { id: 'opening', yaw: 0, elevation: 18, charge: 0.55 },
    { id: 'wall-and-row', yaw: 4, elevation: 17, charge: 0.52 },
    { id: 'four', yaw: -2, elevation: 14, charge: 0.63 },
  ],
};

const sha = text => createHash('sha256').update(text).digest('hex');
const round = (value, places = 4) => Math.round(value * 10 ** places) / 10 ** places;

async function loadPresets() {
  const read = async id => parseRangePreset(await readFile(resolve(root, `worlds/foundry/${id}/preset.json`), 'utf8'));
  const elevated = await read('descending-resonance');
  const flat = await read('descending-resonance-flat');
  const loop = await read('ricochet-garden-loop');
  const derive = (id, objects) => validateRangePreset({ ...elevated, id, name: id, objects, rules: { ...elevated.rules, fixed: objects.map(object => object.id) } });
  // Tilt 0 keeps the lift. The tiers then stand directly above the far wall, so they share its z.
  const liftOnly = derive('descending-resonance-lift-only', elevated.objects.map(object => (Object.hasOwn(object, 'tilt') ? { ...object, z: 33, tilt: 0 } : object)));
  const noTiers = derive('descending-resonance-no-tiers', elevated.objects.filter(object => !Object.hasOwn(object, 'lift')));
  return { elevated, flat, loop, 'lift-only': liftOnly, 'no-tiers': noTiers };
}

/**
 * Upper bound on the summed level entering the mix limiter, with every partial
 * taken in phase. The live path cannot exceed the limiter ceiling; this says
 * how often a phrase would lean on it.
 */
function mixBound(notes) {
  const voiced = notes.map(note => {
    const impact = voiceImpact({ ...note, role: note.role, material: note.material, hz: 1 }, MUSICAL_WORKSHOP_SOUND);
    const acoustics = impactAcoustics(impact), voice = acoustics.voice ?? RESONANCE_VOICES[note.material];
    const level = impact.gain * 0.42 * (voice.level ?? 1) * acoustics.trim;
    return { time: note.time, partials: voice.partials.map(partial => ({ peak: Math.max(0.0002, level * partial.gain), decay: partial.decay })) };
  });
  let worst = 0;
  for (const at of voiced) {
    let sum = 0;
    for (const other of voiced) {
      const elapsed = at.time - other.time;
      if (elapsed < 0) continue;
      for (const partial of other.partials) if (elapsed <= partial.decay) sum += partial.peak * (0.0001 / partial.peak) ** (elapsed / partial.decay);
    }
    worst = Math.max(worst, sum);
  }
  return worst;
}

function audioLoad(rows, preset) {
  const kinds = new Map(preset.objects.map(object => [object.id, object]));
  let engaged = 0, worst = 0;
  const bounds = [];
  for (const row of rows) {
    if (row.rejected || !row.notes.length) continue;
    const bound = mixBound(row.notes.map(note => ({ time: note.time, normalSpeed: note.normalSpeed ?? note.speed, gain: note.gain, role: kinds.get(note.piece).kind, material: kinds.get(note.piece).voice.material })));
    bounds.push(bound);
    worst = Math.max(worst, bound);
    if (bound > MIX_LIMIT.knee) engaged += 1;
  }
  bounds.sort((a, b) => a - b);
  return { soundingShots: bounds.length, limiterKnee: MIX_LIMIT.knee, limiterCeilingDb: MIX_LIMIT.ceilingDb, medianBound: round(bounds[bounds.length >> 1] ?? 0, 3), p99Bound: round(bounds[Math.floor(bounds.length * 0.99)] ?? 0, 3), worstBound: round(worst, 3), shotsOverKnee: engaged };
}

function compactRow(row) {
  return [row.originX, row.yaw, row.elevation, row.charge, row.order, row.phrase, row.terminal.reason, round(row.terminal.elapsed, 4), row.terminal.position.map(value => round(value, 3))];
}

function neighboursOf(aim) {
  const next = (axis, delta) => ({ ...aim, [axis]: round(aim[axis] + delta, 3), axis, value: round(aim[axis] + delta, 3) });
  return [next('yaw', -SLIDER_STEPS.yaw), next('yaw', SLIDER_STEPS.yaw), next('elevation', -SLIDER_STEPS.elevation), next('elevation', SLIDER_STEPS.elevation), next('charge', -SLIDER_STEPS.charge), next('charge', SLIDER_STEPS.charge)];
}

/** Contiguous slider steps along one axis that keep the centre's phrase, centre included. Capped at 20 each way. */
async function widthAlong(preset, family, phrase, axis, havok) {
  const walk = [];
  for (const direction of [-1, 1]) for (let step = 1; step <= 20; step += 1) walk.push({ originX: 0, yaw: family.yaw, elevation: family.elevation, charge: family.charge, [axis]: round(family[axis] + direction * step * SLIDER_STEPS[axis], 3) });
  const { rows } = await sweep({ preset, aims: walk, havok });
  let width = 1;
  for (const half of [rows.slice(0, 20), rows.slice(20)]) for (const row of half) { if (row.rejected || row.phrase !== phrase) break; width += 1; }
  return width;
}

/** Why some lattice shots run long, and which kind of piece sounds twice in a row. Read from the notes, not inferred from the layout. */
function longAndRepeated(rows, preset) {
  const kind = new Map(preset.objects.map(object => [object.id, object.kind]));
  const long = { shots: 0, bouncingOnAWallTop: 0, ramps: 0, other: 0 };
  const twice = { ramp: 0, bank: 0, plate: 0 };
  for (const row of rows) {
    if (row.rejected) continue;
    const runs = [];
    for (const note of row.notes) { const open = runs.at(-1); if (open && open.piece === note.piece) open.notes.push(note); else runs.push({ piece: note.piece, notes: [note] }); }
    const seen = new Set();
    for (const run of runs) if (run.notes.length > 1 && run.notes.at(-1).time - run.notes[0].time >= 0.08 && !seen.has(kind.get(run.piece))) { seen.add(kind.get(run.piece)); twice[kind.get(run.piece)] += 1; }
    if (row.beats.length < 8) continue;
    long.shots += 1;
    // A bank is 7 m tall. Three or more notes in a row on one bank, all within 0.3 m of its top, is a ball bouncing on the top face.
    if (runs.some(run => kind.get(run.piece) === 'bank' && run.notes.length >= 3 && run.notes.every(note => note.y !== null && Math.abs(note.y - 7) < 0.3))) long.bouncingOnAWallTop += 1;
    else if (row.notes.filter(note => kind.get(note.piece) === 'ramp').length >= 3) long.ramps += 1;
    else long.other += 1;
  }
  return { eightOrMoreBeats: long, samePieceTwiceInARowByKind: twice };
}

async function families(preset, list, havok) {
  const aims = list.flatMap(family => [{ originX: 0, ...family }, ...neighboursOf({ originX: 0, ...family })]);
  const { rows } = await sweep({ preset, aims, havok });
  const widths = [];
  for (const [index, family] of list.entries()) {
    const phrase = rows[index * 7].phrase;
    widths.push({ yaw: await widthAlong(preset, family, phrase, 'yaw', havok), elevation: await widthAlong(preset, family, phrase, 'elevation', havok), charge: await widthAlong(preset, family, phrase, 'charge', havok) });
  }
  return list.map((family, index) => {
    const block = rows.slice(index * 7, index * 7 + 7), centre = block[0];
    return {
      id: family.id,
      setup: { railIndex: 1, originX: 0, yaw: family.yaw, elevation: family.elevation, charge: family.charge },
      phrase: centre.phrase,
      ledger: centre.ledger,
      notes: centre.notes.map(note => ({ piece: note.piece, note: note.note, time: note.time })),
      terminal: centre.terminal,
      neighbours: block.slice(1).map((row, step) => ({ axis: aims[index * 7 + 1 + step].axis, value: aims[index * 7 + 1 + step].value, phrase: row.phrase, exact: row.phrase === centre.phrase })),
      exactNeighbours: block.slice(1).filter(row => row.phrase === centre.phrase).length,
      widthInSliderSteps: widths[index],
    };
  });
}

async function main() {
  const started = performance.now();
  const presets = await loadPresets();
  const havok = await loadHavok();
  const report = {
    seed: SEED,
    seedAppliedToSolver: false,
    definitions: {
      note: 'One impact the resonance ear kept. It is what the player hears and what the note timeline draws.',
      beat: `Notes that begin within ${BEAT_WINDOW * 1000} ms of each other. A ball on the seam between two pieces sounds two notes in one beat. Counts and phrases are in beats.`,
      phrase: 'The pieces of each beat, in order. A seam beat is written a+b.',
      ledgerOrder: 'Piece rows of the contact ledger, in order. Consecutive callbacks on one body are one row, so two bounces on one piece are one row and two beats.',
      neighbour: `One slider step: ${SLIDER_STEPS.yaw}° yaw, ${SLIDER_STEPS.elevation}° elevation, or ${SLIDER_STEPS.charge} charge.`,
      neighbourhood: 'For each lattice cell with at least `floor` beats and all six neighbours on the lattice: same is an identical phrase; variation is a different phrase that still has at least `floor` beats; thinner has fewer but is not silent; silent has none.',
      mixBound: 'Summed level entering the mix limiter with every partial in phase, on the tuned-even bank voice. An upper bound, not a measured peak.',
    },
    aimSets: {
      broad: { shots: AIMS.broad.length, yaw: '-24..24 step 2', elevation: [8, 12, 16, 20, 24, 30, 40], charge: [0.35, 0.45, 0.55, 0.65, 0.8], originX: 0 },
      lattice: { shots: AIMS.lattice.length, yaw: '-6..6 step 0.5', elevation: '10..26 step 0.5', charge: '0.45..0.65 step 0.01', originX: 0 },
      wide: { shots: AIMS.wide.length, originX: [-8, -4, 0, 4, 8], yaw: '-30..30 step 5', elevation: [10, 15, 20, 25, 30, 40, 50], charge: [0.3, 0.45, 0.6, 0.75, 0.9] },
    },
    worlds: {},
  };
  const broadShots = {};

  if (only === 'all' || only === 'families') {
    report.families = {
      elevated: await families(presets.elevated, FAMILIES.elevated, havok),
      flat: await families(presets.flat, FAMILIES.flat, havok),
    };
  }

  if (only === 'all' || only === 'grids') {
    for (const [name, preset] of Object.entries(presets)) {
      const pieces = preset.objects.map(object => object.id);
      const entry = { pieces: pieces.length, elevatedPieces: preset.objects.filter(object => Object.hasOwn(object, 'lift')).length, sets: {} };
      for (const [set, aims] of Object.entries(AIMS)) {
        const result = await sweep({ preset, aims, havok });
        entry.identity = result.identity;
        const summary = summarize(result.rows, pieces);
        const block = { summary, rowsSha256: sha(JSON.stringify(result.rows)) };
        if (set === 'lattice') {
          block.neighbourhoodFloor3 = neighbourhood(result.rows, SLIDER_STEPS, 3);
          block.neighbourhoodFloor2 = neighbourhood(result.rows, SLIDER_STEPS, 2);
          block.audio = audioLoad(result.rows, preset);
          block.longAndRepeated = longAndRepeated(result.rows, preset);
        }
        if (set === 'broad') broadShots[name] = result.rows.map(compactRow);
        if (set === 'wide') block.unusedPieces = pieces.filter(id => !summary.pieceShots[id]);
        entry.sets[set] = block;
        // Every body the sweep made is gone once its harness is disposed. sweep() disposes in a finally block.
        entry.diagnosticsBeforeDispose = { staticBodies: result.diagnostics.staticBodies, meshes: result.diagnostics.meshes, physicsBodies: result.diagnostics.physicsBodies };
      }
      report.worlds[name] = entry;
      process.stderr.write(`${name} done\n`);
    }
  }

  report.seconds = round((performance.now() - started) / 1000, 1);
  if (only === 'all') {
    await writeFile(resolve(here, 'results.json'), `${JSON.stringify(report, null, 1)}\n`);
    await writeFile(resolve(here, 'shots-broad.json'), `${JSON.stringify({ columns: ['originX', 'yaw', 'elevation', 'charge', 'ledgerOrder', 'phrase', 'terminalReason', 'elapsed', 'position'], worlds: broadShots })}\n`);
  }
  const line = (name, set) => {
    const s = report.worlds[name]?.sets[set]?.summary;
    return s ? { silent: s.silent, one: s.one, twoPlus: s.twoPlus, threeToFive: s.threeToFive, sixPlus: s.sixPlus, phrases3: s.distinctThreePlusPhrases } : null;
  };
  process.stdout.write(`${JSON.stringify({
    families: report.families ? Object.fromEntries(Object.entries(report.families).map(([world, list]) => [world, list.map(item => `${item.id}: ${item.phrase} (${item.exactNeighbours}/6, widths ${item.widthInSliderSteps.yaw}/${item.widthInSliderSteps.elevation}/${item.widthInSliderSteps.charge})`)])) : null,
    broad: Object.fromEntries(Object.keys(report.worlds).map(name => [name, line(name, 'broad')])),
    lattice: Object.fromEntries(Object.keys(report.worlds).map(name => [name, line(name, 'lattice')])),
    wide: Object.fromEntries(Object.keys(report.worlds).map(name => [name, line(name, 'wide')])),
    seconds: report.seconds,
  }, null, 2)}\n`);
}

main().catch(error => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
