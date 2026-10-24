// Resonant Run layout search. Reuses scripts/range/run.mjs. The seed is recorded
// and is not applied to the solver. Uniform-grid cells and targeted poses are
// separate lists and are not mixed in the summary.
//
//   node scripts/range/resonant-search.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { WORLDCRAFT_CATALOG } from '../../lib/worldcraft-model.js';
import { createResonantRunPhrasePreset, exportRangePreset, sha256Hex } from '../../lib/worldcraft-range.js';
import { buildWorldcraftScene, createWorldcraftMaterials, WORLDCRAFT_CONTACTS } from '../../lib/worldcraft-scene.js';
import { runLayoutShots, rangeGitSha } from './run.mjs';

Logger.LogLevels = 0;

const voice = (material, degree) => ({ material, degree });
const piece = (id, kind, pose, note) => ({ id, kind, x: pose.x, z: pose.z, yaw: pose.yaw, voice: note });
const bank = (pose, note = voice('timber', 0)) => piece('bank-yours', 'bank', pose, note);
const ramp = (pose, note = voice('metal', 1)) => piece('ramp-yours', 'ramp', pose, note);
const plate = (pose, note = voice('metal', 2)) => piece('plate-yours', 'plate', pose, note);

function product(parts) {
  return parts.reduce((rows, part) => rows.flatMap(row => part.map(value => [...row, value])), [[]]);
}
function poses(xs, zs, yaws) {
  return product([xs, zs, yaws]).map(([x, z, yaw]) => ({ x, z, yaw }));
}
function orderKey(outcome) {
  return outcome?.heard?.join('>') ?? '';
}

const uniformRamps = poses([-8, 0, 8], [36, 48], [0]);
const uniformBanks = poses([-8, 0, 8], [20, 36], [-80, 0, 80]);
const uniformPlates = poses([-8, 0, 8], [60, 72], [0]);
const uniform = product([uniformRamps, uniformBanks, uniformPlates]).map(([rampPose, bankPose, platePose], index) => ({
  id: `uniform-${index}`,
  source: 'uniform-grid',
  objects: [ramp(rampPose), bank(bankPose), plate(platePose)],
}));

// Poses taken from the earlier orc resonant sweep, re-fired here without the
// shield. They are not cells of the uniform grid above.
const targetedFamilies = [
  { id: 'early-plate-clear', ramp: { x: -8, z: 40, yaw: 0 }, bank: { x: 0, z: 16, yaw: 80 }, plate: { x: 0, z: 68, yaw: 0 } },
  { id: 'early-cooccur', ramp: { x: -8, z: 40, yaw: 0 }, bank: { x: 0, z: 16, yaw: 80 }, plate: { x: -24, z: 64, yaw: 0 } },
  { id: 'late-plate-clear', ramp: { x: -1, z: 42, yaw: 20 }, bank: { x: -6, z: 68, yaw: 20 }, plate: { x: 0, z: 68, yaw: 0 } },
  { id: 'late-plate-out', ramp: { x: -1, z: 42, yaw: 20 }, bank: { x: -6, z: 68, yaw: 20 }, plate: { x: -24, z: 58, yaw: 0 } },
];
const targeted = targetedFamilies.map(family => ({
  id: family.id,
  source: 'targeted',
  objects: [ramp(family.ramp), bank(family.bank), plate(family.plate)],
}));

// The late-family plate lattice from the earlier resonant sweep. Separate from
// the four poses above and from the uniform grid.
const latePlate = product([
  poses([-1], [42], [20]),
  poses([-6], [68], [20]),
  poses([-28, -24, -20, -16], [56, 58, 60], [0, 90]),
]).map(([rampPose, bankPose, platePose], index) => ({
  id: `late-plate-${index}`,
  source: 'targeted-late-plate',
  objects: [ramp(rampPose), bank(bankPose), plate(platePose)],
}));

const opening = [{
  id: 'opening',
  source: 'opening',
  objects: [ramp({ x: 0, z: 42, yaw: 0 }), bank({ x: 14, z: 28, yaw: 0 }), plate({ x: 0, z: 68, yaw: 0 })],
}];

// A separate targeted look for plate-before-ramp. Not part of the uniform grid.
const reversal = product([
  poses([0], [48, 56], [0]),
  poses([14], [28], [0]),
  poses([0, -4, 4], [18, 24, 30], [0, 90]),
]).map(([rampPose, bankPose, platePose], index) => ({
  id: `reversal-${index}`,
  source: 'targeted-reversal',
  objects: [ramp(rampPose), bank(bankPose), plate(platePose)],
}));

function summarize(lines, source) {
  const shots = lines.filter(line => line.type === 'shot');
  const rejected = lines.filter(line => line.type === 'rejected');
  const orders = new Map();
  for (const shot of shots) {
    const key = orderKey(shot.outcome) || '(none)';
    const row = orders.get(key) ?? { order: key, shots: 0, standInHit: 0, phraseMatch: 0, example: null };
    row.shots += 1;
    if (shot.outcome.standIn?.status === 'hit') row.standInHit += 1;
    if (shot.outcome.status === 'match') row.phraseMatch += 1;
    if (!row.example) row.example = { id: shot.id, objects: shot.objects, bindingHash: shot.bindingHash, pointHash: shot.pointHash, terminal: shot.terminal, heard: shot.outcome.heard, standIn: shot.outcome.standIn?.status ?? null };
    orders.set(key, row);
  }
  const attacks = shots.reduce((sum, shot) => {
    sum.callbacks += shot.resonance.resonantCallbacks;
    sum.sounds += shot.resonance.sounds;
    sum.collapsed += shot.resonance.collapsed;
    sum.maxCallbacks = Math.max(sum.maxCallbacks, shot.resonance.maxCallbacks);
    const pieceSounds = shot.resonance.impacts.filter(impact => impact.material !== 'thunk').length;
    const thunkSounds = shot.resonance.impacts.filter(impact => impact.material === 'thunk').length;
    const standRows = shot.contacts.filter(contact => contact.body.startsWith('worldcraft-target-')).length;
    sum.rows += shot.resonantContactRows;
    sum.pieceSounds += pieceSounds;
    sum.thunkSounds += thunkSounds;
    if (pieceSounds !== shot.resonantContactRows || thunkSounds !== standRows) sum.rowMismatches += 1;
    if (shot.resonance.sounds > shot.resonance.resonantCallbacks) sum.soundAboveCallback += 1;
    return sum;
  }, { callbacks: 0, sounds: 0, collapsed: 0, maxCallbacks: 0, rows: 0, pieceSounds: 0, thunkSounds: 0, rowMismatches: 0, soundAboveCallback: 0 });
  return {
    source,
    fired: shots.length,
    rejected: rejected.length,
    orders: [...orders.values()].sort((a, b) => b.shots - a.shots || a.order.localeCompare(b.order)),
    attacks,
  };
}

function neighborLayouts(shot) {
  const axes = [
    ['x', 0.5],
    ['z', 0.5],
    ['yaw', 5],
  ];
  const layouts = [];
  for (const object of shot.objects) {
    for (const [key, step] of axes) {
      for (const sign of [-1, 1]) {
        const objects = shot.objects.map(item => item.id === object.id ? { ...item, [key]: item[key] + sign * step } : item);
        layouts.push({ id: `${shot.id}:${object.id}:${key}${sign < 0 ? '-' : '+'}`, source: 'tolerance', objects });
      }
    }
  }
  return layouts;
}

function retuneLayouts(shot) {
  const tunings = [
    { id: 'baseline', map: object => object.voice },
    { id: 'all-timber', map: object => voice('timber', object.voice.degree) },
    { id: 'all-metal', map: object => voice('metal', object.voice.degree) },
    { id: 'degrees-plus-two', map: object => voice(object.voice.material, (object.voice.degree + 2) % 5) },
    { id: 'swapped', map: object => voice(object.voice.material === 'metal' ? 'timber' : 'metal', (object.voice.degree + 3) % 5) },
    { id: 'bank-a-ramp-g-plate-c', map: object => object.kind === 'bank' ? voice('metal', 4) : object.kind === 'ramp' ? voice('timber', 3) : voice('timber', 0) },
  ];
  return tunings.map(tuning => ({
    id: `${shot.id}:tune-${tuning.id}`,
    source: 'retune',
    tuning: tuning.id,
    objects: shot.objects.map(object => ({ ...object, voice: tuning.map(object) })),
  }));
}

function shapeMaterials(havok, world) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const palette = createWorldcraftMaterials(scene);
  const built = buildWorldcraftScene(scene, world, { materials: palette.materials });
  const rows = built.bodies.map(aggregate => {
    const material = aggregate.shape?.material;
    return {
      name: aggregate.transformNode.name,
      friction: material?.friction ?? null,
      restitution: material?.restitution ?? null,
    };
  });
  built.dispose();
  palette.dispose();
  scene.dispose();
  engine.dispose();
  return rows;
}

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const gitSha = rangeGitSha();
const seed = 20261024;
const preset = createResonantRunPhrasePreset();

async function search(layouts) {
  const { lines, rejected } = await runLayoutShots({ preset, layouts, seed, gitSha, havok });
  return { lines, rejected };
}

const uniformRun = await search(uniform);
const targetedRun = await search(targeted);
const latePlateRun = await search(latePlate);
const reversalRun = await search(reversal);
const openingRun = await search(opening);

function shotsOf(run) {
  return run.lines.filter(line => line.type === 'shot');
}
const interesting = [...shotsOf(targetedRun), ...shotsOf(latePlateRun), ...shotsOf(reversalRun), ...shotsOf(uniformRun)]
  .filter(shot => (shot.outcome.heard?.length ?? 0) >= 2);
const prescribed = interesting.filter(shot => shot.outcome.status === 'match' && shot.outcome.standIn?.status === 'hit');
const contrastPool = interesting.filter(shot => orderKey(shot.outcome) === '1>0>2');
const reversalPool = interesting.filter(shot => orderKey(shot.outcome) === '2>1');
const bankRampReversed = shotsOf(targetedRun).filter(shot => orderKey(shot.outcome) === '1>0');

const prescribedShot = prescribed.find(shot => shot.id === 'early-cooccur') ?? prescribed[0] ?? null;
const contrastShot = contrastPool.find(shot => shot.outcome.standIn?.status === 'hit') ?? contrastPool[0] ?? bankRampReversed[0] ?? null;
const reversalShot = reversalPool[0] ?? null;
const openingShot = shotsOf(openingRun)[0] ?? null;

const toleranceTargets = [prescribedShot, contrastShot, reversalShot].filter(Boolean);
const toleranceRuns = [];
for (const shot of toleranceTargets) {
  const neighbors = neighborLayouts(shot);
  const run = await search(neighbors);
  const kept = shotsOf(run).filter(item => orderKey(item.outcome) === orderKey(shot.outcome) && item.outcome.standIn?.status === shot.outcome.standIn?.status);
  toleranceRuns.push({
    id: shot.id,
    order: orderKey(shot.outcome),
    standIn: shot.outcome.standIn?.status ?? null,
    neighborsFired: shotsOf(run).length,
    neighborsRejected: run.lines.filter(line => line.type === 'rejected').length,
    neighborsSameOrder: kept.length,
    step: { x: 0.5, z: 0.5, yaw: 5 },
    same: kept.map(item => item.id),
  });
}

let retune = null;
if (prescribedShot) {
  const layouts = retuneLayouts(prescribedShot);
  const run = await search(layouts);
  const fired = shotsOf(run);
  const hashes = [...new Set(fired.map(shot => shot.pointHash))];
  retune = {
    baseline: prescribedShot.id,
    fired: fired.length,
    pointHashes: hashes,
    identicalTrajectories: hashes.length === 1,
    terminals: [...new Set(fired.map(shot => JSON.stringify(shot.terminal.position)))],
    rows: fired.map(shot => ({ id: shot.id, pointHash: shot.pointHash, heard: shot.outcome.heard, bindingHash: shot.bindingHash, shotHash: shot.shotHash })),
    timber: fired.filter(shot => shot.id.endsWith('tune-all-timber')).map(shot => ({
      id: shot.id, shotHash: shot.shotHash, bindingHash: shot.bindingHash, pointHash: shot.pointHash, resonance: shot.resonance, heard: shot.outcome.heard,
    })),
    timberShot: fired.find(shot => shot.id.endsWith('tune-all-timber'))?.shot ? JSON.stringify(fired.find(shot => shot.id.endsWith('tune-all-timber')).shot) : null,
    catalog: {
      bank: { friction: WORLDCRAFT_CATALOG.bank.friction, restitution: WORLDCRAFT_CATALOG.bank.restitution },
      ramp: { friction: WORLDCRAFT_CATALOG.ramp.friction, restitution: WORLDCRAFT_CATALOG.ramp.restitution },
      plate: { friction: WORLDCRAFT_CATALOG.plate.friction, restitution: WORLDCRAFT_CATALOG.plate.restitution },
      contacts: WORLDCRAFT_CONTACTS,
    },
    materialProbeError: null,
    materialRows: null,
  };
  try {
    const { adaptRangePreset } = await import('../../lib/worldcraft-range.js');
    retune.materialRows = layouts.map(layout => {
      const world = adaptRangePreset({ ...preset, objects: layout.objects }).world;
      return { id: layout.tuning, bodies: shapeMaterials(havok, world) };
    });
    const first = JSON.stringify(retune.materialRows[0].bodies);
    retune.materialsIdentical = retune.materialRows.every(row => JSON.stringify(row.bodies) === first);
  } catch (error) {
    retune.materialProbeError = error.message;
  }
}

function exemplar(shot, role) {
  if (!shot) return null;
  return {
    role,
    id: shot.id,
    order: orderKey(shot.outcome),
    heard: shot.outcome.heard,
    status: shot.outcome.status,
    standIn: shot.outcome.standIn,
    objects: shot.objects,
    bindingHash: shot.bindingHash,
    presetHash: shot.presetHash,
    pointHash: shot.pointHash,
    shotHash: shot.shotHash,
    worldIdentity: shot.worldIdentity,
    terminal: shot.terminal,
    contacts: shot.contacts,
    resonance: shot.resonance,
    resonantContactRows: shot.resonantContactRows,
  };
}

const summary = {
  gitSha,
  seed,
  presetId: preset.id,
  presetHash: await sha256Hex(exportRangePreset(preset)),
  phrase: preset.rules.goal.notes,
  uniformLattice: {
    ramp: { x: [-8, 0, 8], z: [36, 48], yaw: [0] },
    bank: { x: [-8, 0, 8], z: [20, 36], yaw: [-80, 0, 80] },
    plate: { x: [-8, 0, 8], z: [60, 72], yaw: [0] },
    cells: uniform.length,
  },
  uniform: summarize(uniformRun.lines, 'uniform-grid'),
  targeted: summarize(targetedRun.lines, 'targeted'),
  latePlate: summarize(latePlateRun.lines, 'targeted-late-plate'),
  reversal: summarize(reversalRun.lines, 'targeted-reversal'),
  opening: summarize(openingRun.lines, 'opening'),
  tolerance: toleranceRuns,
  retune,
  exemplars: [exemplar(openingShot, 'opening'), exemplar(prescribedShot, 'prescribed'), exemplar(contrastShot, 'contrast'), exemplar(reversalShot, 'reversal')].filter(Boolean),
};

await mkdir(new URL('../../docs/experiments/range/appendix/resonant-run/', import.meta.url), { recursive: true });
await mkdir(new URL('../../docs/experiments/range/audio/records/', import.meta.url), { recursive: true });
const exemplars = summary.exemplars;
await writeFile(new URL('../../docs/experiments/range/audio/exemplars.json', import.meta.url), JSON.stringify(exemplars, null, 2));
for (const shot of [openingShot, prescribedShot, contrastShot, reversalShot].filter(Boolean)) {
  await writeFile(new URL(`../../docs/experiments/range/audio/records/${shot.id}.json`, import.meta.url), JSON.stringify(shot.shot));
}
if (retune?.timberShot) {
  await writeFile(new URL('../../docs/experiments/range/audio/records/early-cooccur-all-timber.json', import.meta.url), retune.timberShot);
  delete retune.timberShot;
}
await writeFile(new URL('../../docs/experiments/range/appendix/resonant-run/search.json', import.meta.url), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  gitSha,
  uniform: { fired: summary.uniform.fired, rejected: summary.uniform.rejected, orders: summary.uniform.orders.map(row => [row.order, row.shots, row.phraseMatch]) },
  targeted: { fired: summary.targeted.fired, rejected: summary.targeted.rejected, orders: summary.targeted.orders.map(row => [row.order, row.shots, row.standInHit, row.phraseMatch]) },
  latePlate: { fired: summary.latePlate.fired, rejected: summary.latePlate.rejected, orders: summary.latePlate.orders.map(row => [row.order, row.shots, row.standInHit, row.phraseMatch]) },
  reversal: { fired: summary.reversal.fired, rejected: summary.reversal.rejected, orders: summary.reversal.orders.map(row => [row.order, row.shots]) },
  opening: { fired: summary.opening.fired, orders: summary.opening.orders.map(row => [row.order, row.shots, row.phraseMatch]) },
  tolerance: toleranceRuns,
  retune: retune && { identicalTrajectories: retune.identicalTrajectories, pointHashes: retune.pointHashes, materialsIdentical: retune.materialsIdentical, materialProbeError: retune.materialProbeError },
  exemplars: exemplars.map(item => ({ role: item.role, id: item.id, order: item.order, standIn: item.standIn?.status, shotHash: item.shotHash })),
}, null, 2));
