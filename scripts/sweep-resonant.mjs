// Headless Havok sweep for resonant Worldcraft pieces.
// Shot authority is the incumbent Worldcraft runtime. This file only places
// the ramp, the bank, and the plate, and reads the acoustic contact log.
//
// Usage:
//   node scripts/sweep-resonant.mjs
//
// Writes docs/experiments/wc-exp-20261024-resonant-sweep.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { createOrcStaticWorld, validateWorld, worldcraftFixedSetup } from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const SEED = 20261024;
const JOINT_DRAWS = 220;

const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createOrcStaticWorld();
const setup = worldcraftFixedSetup(base);
const shield = base.objects.find(object => object.id === 'shield');
const ramp0 = base.objects.find(object => object.id === 'ramp-yours');
const bank0 = base.objects.find(object => object.id === 'bank-yours');
const plate0 = base.objects.find(object => object.id === 'plate-yours');
const EARLY_RAMP = { x: -8, z: 40, yaw: 0 };
const EARLY_BANK = { x: 0, z: 16, yaw: 80 };
const LATE_RAMP = { x: -1, z: 42, yaw: 20 };
const LATE_BANK = { x: -6, z: 68, yaw: 20 };
const CO_PLATE = { x: -24, z: 64, yaw: 0 };

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function placed(object, pose, voice) {
  return { ...object, x: pose.x, z: pose.z, yaw: pose.yaw, ...(voice ? { voice: { ...object.voice, ...voice } } : {}) };
}
function layout(ramp, bank, plate) {
  return validateWorld({ ...base, objects: [placed(ramp0, ramp, ramp.voice), placed(bank0, bank, bank.voice), placed(plate0, plate, plate.voice), shield] });
}
function tryLayout(ramp, bank, plate) {
  try { return layout(ramp, bank, plate); } catch { return null; }
}
function poseKey(ramp, bank, plate) {
  const part = (item, baseObject) => `${item.x},${item.z},${item.yaw},${item.voice?.material ?? baseObject.voice.material},${item.voice?.degree ?? baseObject.voice.degree}`;
  return `${part(ramp, ramp0)}|${part(bank, bank0)}|${part(plate, plate0)}`;
}
function recordShot(kind, ramp, bank, plate, last) {
  const impacts = last.resonance.impacts;
  const tuned = impacts.filter(impact => impact.material !== 'thunk');
  const sequence = impacts.map(impact => impact.note).join('>');
  return {
    kind,
    ramp: { x: ramp.x, z: ramp.z, yaw: ramp.yaw, material: ramp.voice?.material ?? ramp0.voice.material, degree: ramp.voice?.degree ?? ramp0.voice.degree },
    bank: { x: bank.x, z: bank.z, yaw: bank.yaw, material: bank.voice?.material ?? bank0.voice.material, degree: bank.voice?.degree ?? bank0.voice.degree },
    plate: { x: plate.x, z: plate.z, yaw: plate.yaw, material: plate.voice?.material ?? plate0.voice.material, degree: plate.voice?.degree ?? plate0.voice.degree },
    hit: last.targetResult?.status === 'hit',
    reason: last.reason,
    terminal: last.position.map(value => Math.round(value * 1000) / 1000),
    sounds: last.resonance.sounds,
    resonantCallbacks: last.resonance.resonantCallbacks,
    collapsed: last.resonance.collapsed,
    maxCallbacks: last.resonance.maxCallbacks,
    tunedPieces: new Set(tuned.map(impact => impact.piece)).size,
    sequence,
    notes: impacts.map(impact => ({
      piece: impact.piece, time: impact.time, speed: impact.speed, note: impact.note,
      material: impact.material, hz: impact.hz, gain: impact.gain, callbacks: impact.callbacks,
    })),
  };
}

function harness() {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world: base, build: 'resonant-sweep' });
  return {
    runtime,
    shoot(world) {
      if (runtime.mode !== 'build') runtime.setMode('build');
      if (runtime.world !== world) {
        const replaced = runtime.replaceWorld(world, { intent: 'edit' });
        if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
      }
      runtime.setMode('play');
      if (!runtime.launch(setup)) throw new Error(runtime.error || 'launch failed');
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) {
        runtime.beforeStep();
        physics._step(1 / 120);
        runtime.afterStep();
      }
      const last = runtime.last;
      if (!last) throw new Error('shot did not resolve');
      runtime.setMode('build');
      return last;
    },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}

const jobs = [];
const seen = new Set();
function pushJob(kind, ramp, bank, plate) {
  const key = poseKey(ramp, bank, plate);
  if (seen.has(key)) return false;
  const world = tryLayout(ramp, bank, plate);
  if (!world) return false;
  seen.add(key);
  jobs.push({ kind, ramp, bank, plate, world });
  return true;
}
function enumerate(lattice) {
  const poses = [];
  for (const x of lattice.x) for (const z of lattice.z) for (const yaw of lattice.yaw) poses.push({ x, z, yaw });
  return poses;
}

const earlyPlate = { x: [-26, -24, -22, -20], z: [60, 62, 64, 66], yaw: [0, 90] };
const landingPlate = { x: [-4, -2, 0, 2, 4], z: [66, 68, 70], yaw: [0, 90] };
const latePlate = { x: [-28, -24, -20, -16], z: [56, 58, 60], yaw: [0, 90] };
const jointRamps = [];
for (const x of [-12, -8, -4, 0, 4]) for (const z of [38, 42, 46]) for (const yaw of [-20, 0, 20]) jointRamps.push({ x, z, yaw });
const jointBanks = [];
for (const x of [-8, -4, 0, 8, 14]) for (const z of [16, 28, 48]) for (const yaw of [0, 40, 80]) jointBanks.push({ x, z, yaw });
const jointPlates = [];
for (const x of [-24, -12, 0, 12]) for (const z of [56, 64, 72]) for (const yaw of [0, 90]) jointPlates.push({ x, z, yaw });

pushJob('default', ramp0, bank0, plate0);
pushJob('early-exemplar', EARLY_RAMP, EARLY_BANK, plate0);
pushJob('late-exemplar', LATE_RAMP, LATE_BANK, plate0);
pushJob('co-occur', EARLY_RAMP, EARLY_BANK, CO_PLATE);
for (const plate of enumerate(earlyPlate)) pushJob('early-plate', EARLY_RAMP, EARLY_BANK, plate);
for (const plate of enumerate(landingPlate)) pushJob('landing-plate', ramp0, bank0, plate);
for (const plate of enumerate(latePlate)) pushJob('late-plate', LATE_RAMP, LATE_BANK, plate);
for (const degree of [0, 1, 2, 3, 4]) pushJob('pitch', { ...EARLY_RAMP, voice: { degree } }, EARLY_BANK, CO_PLATE);
const random = mulberry32(SEED);
let draws = 0, guard = 0;
while (draws < JOINT_DRAWS && guard < 8000) {
  guard += 1;
  const ramp = jointRamps[Math.floor(random() * jointRamps.length)];
  const bank = jointBanks[Math.floor(random() * jointBanks.length)];
  const plate = jointPlates[Math.floor(random() * jointPlates.length)];
  if (pushJob('joint', ramp, bank, plate)) draws += 1;
}

const h = harness();
const shots = [];
const started = performance.now();
try {
  console.log(JSON.stringify({ jobs: jobs.length, jointDraws: draws, seed: SEED, staticBodies: h.runtime.diagnostics().staticBodies }));
  for (const job of jobs) {
    const last = h.shoot(job.world);
    const row = recordShot(job.kind, job.ramp, job.bank, job.plate, last);
    shots.push(row);
    if (row.tunedPieces >= 2 || shots.length % 40 === 0) {
      console.log(`${shots.length}/${jobs.length} ${row.hit ? 'ORC' : 'miss'} ${row.kind} ${row.sequence || '-'} pieces ${row.tunedPieces} cb ${row.resonantCallbacks}->${row.sounds}`);
    }
  }
} finally { h.dispose(); }

const multi = shots.filter(shot => shot.tunedPieces >= 2);
const withOrc = multi.filter(shot => shot.hit);
const countBy = (rows, key) => {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1;
  return out;
};
const sequences = countBy(shots, 'sequence');
const multiSequences = countBy(multi, 'sequence');
const coSequences = countBy(withOrc, 'sequence');
const spamShots = shots.filter(shot => shot.maxCallbacks > 1);
const overSounds = shots.filter(shot => shot.sounds > shot.resonantCallbacks);
const callbackSum = shots.reduce((sum, shot) => sum + shot.resonantCallbacks, 0);
const soundSum = shots.reduce((sum, shot) => sum + shot.sounds, 0);
const pitch = shots.filter(shot => shot.kind === 'pitch');
const audio = shots.find(shot => shot.kind === 'co-occur') ?? withOrc[0] ?? multi[0] ?? shots[0];
const exemplars = [];
const seenSequence = new Set();
for (const shot of [shots.find(shot => shot.kind === 'default'), audio, ...withOrc, ...multi]) {
  if (!shot || seenSequence.has(shot.sequence)) continue;
  seenSequence.add(shot.sequence);
  exemplars.push({
    kind: shot.kind, sequence: shot.sequence, hit: shot.hit,
    ramp: shot.ramp, bank: shot.bank, plate: shot.plate,
    sounds: shot.sounds, resonantCallbacks: shot.resonantCallbacks, maxCallbacks: shot.maxCallbacks,
  });
  if (exemplars.length >= 12) break;
}
const summary = {
  seed: SEED,
  setup,
  shots: shots.length,
  jointDraws: draws,
  jointGuard: guard,
  multiPieceShots: multi.length,
  multiPieceFraction: shots.length ? multi.length / shots.length : 0,
  orcHits: shots.filter(shot => shot.hit).length,
  sequenceAndOrc: withOrc.length,
  sequenceAndOrcFractionOfShots: shots.length ? withOrc.length / shots.length : 0,
  sequenceAndOrcFractionOfMulti: multi.length ? withOrc.length / multi.length : 0,
  distinctSequences: Object.keys(sequences).length,
  distinctMultiSequences: Object.keys(multiSequences).length,
  distinctCoSequences: Object.keys(coSequences).length,
  sequences,
  multiSequences,
  coSequences,
  spam: {
    resonantCallbacks: callbackSum,
    sounds: soundSum,
    collapsed: callbackSum - soundSum,
    shotsWithRepeatedCallbacks: spamShots.length,
    shotsWithMoreSoundsThanCallbacks: overSounds.length,
    maxCallbacks: shots.reduce((max, shot) => Math.max(max, shot.maxCallbacks), 0),
  },
  pitch: pitch.map(shot => ({ degree: shot.ramp.degree, sequence: shot.sequence, hit: shot.hit, terminal: shot.terminal })),
  exemplars,
  elapsedSeconds: Math.round((performance.now() - started) / 10) / 100,
};
console.log(JSON.stringify({ ...summary, sequences: undefined, multiSequences: undefined, coSequences: undefined, exemplars: summary.exemplars.map(item => item.sequence) }, null, 2));

await mkdir(new URL('../docs/experiments/', import.meta.url), { recursive: true });
const payload = {
  experiment: 'wc-exp-20261024-resonant',
  question: 'Do resonant tunable pieces make a layout revision play a note sequence, and does the default pentatonic tuning put those impacts on notes that can sound in order?',
  seed: SEED,
  setup,
  havok: 'node_modules/@babylonjs/havok',
  holdSeconds: 5 / 120,
  scale: ['C4', 'D4', 'E4', 'G4', 'A4'],
  defaultVoices: { bank: 'C4 timber', ramp: 'D4 metal', plate: 'E4 metal', orc: 'thunk' },
  world: base,
  win: 'any recorded projectile contact with worldcraft-target-stand-in-orc before the incumbent ledger closes',
  multiPiece: 'two or more distinct resonant pieces, not counting the orc thunk',
  lattices: { earlyPlate, landingPlate, latePlate, coPlate: CO_PLATE, earlyAnchor: { ramp: EARLY_RAMP, bank: EARLY_BANK }, lateAnchor: { ramp: LATE_RAMP, bank: LATE_BANK }, jointDraws: JOINT_DRAWS, jointSeed: SEED },
  summary,
  audioSequence: audio ? { kind: audio.kind, sequence: audio.sequence, hit: audio.hit, ramp: audio.ramp, bank: audio.bank, plate: audio.plate, notes: audio.notes } : null,
  shots,
};
await writeFile(new URL('../docs/experiments/wc-exp-20261024-resonant-sweep.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote sweep · ${shots.length} shots · multi ${multi.length} · with orc ${withOrc.length} · sequences ${Object.keys(sequences).length}`);
