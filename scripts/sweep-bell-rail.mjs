// Headless Havok sweep for the Bell Rail challenge.
// The projectile, gravity, and 120 Hz step are the Worldcraft runtime's.
// This file only places the two movable pieces and the launch delay.
//
//   node scripts/sweep-bell-rail.mjs
//
// Writes docs/experiments/wc-exp-20261024-bell-rail-sweep.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  WORLDCRAFT_BELL, WORLDCRAFT_DELAY, createBellRailWorld, validateWorld, worldcraftBellPose,
  worldcraftFixedSetup, worldcraftTargetBody,
} from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const SEED = 20261024;
const TARGET = worldcraftTargetBody('bell');
const DELAYS = Array.from({ length: 21 }, (_, index) => index / 2);
const LINK_DX = 4, LINK_DZ = 4, LINK_DYAW = 15, MIN_CLUSTER = 3;

const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createBellRailWorld();
const shield = base.objects.find(object => object.id === 'shield');
const target = base.rules.target;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function poseKey(ramp, bank) {
  return `${ramp.x},${ramp.z},${ramp.yaw}|${bank.x},${bank.z},${bank.yaw}`;
}
function layout(ramp, bank, delay) {
  return validateWorld({
    ...base,
    objects: [
      { id: 'ramp-yours', kind: 'ramp', x: ramp.x, z: ramp.z, yaw: ramp.yaw },
      { id: 'bank-yours', kind: 'bank', x: bank.x, z: bank.z, yaw: bank.yaw },
      shield,
    ],
    timing: { delay },
  });
}
function tryLayout(ramp, bank, delay = 0) {
  try { return layout(ramp, bank, delay); } catch { return null; }
}
function signature(contacts) {
  const names = [];
  for (const contact of contacts) {
    let kind = null;
    if (contact.body === TARGET) kind = 'bell';
    else if (contact.body === 'worldcraft-object-ramp-yours') kind = 'ramp';
    else if (contact.body === 'worldcraft-object-bank-yours') kind = 'bank';
    else if (contact.body === 'worldcraft-object-shield') kind = 'shield';
    else continue;
    if (names.at(-1) !== kind) names.push(kind);
  }
  const at = names.indexOf('bell');
  return (at < 0 ? names : names.slice(0, at + 1)).join('>');
}
function klass(text) {
  if (!text.includes('bell')) return 'miss';
  const parts = new Set(text.split('>').filter(part => part !== 'bell'));
  const ramp = parts.has('ramp'), bank = parts.has('bank');
  if (ramp && bank) return 'both';
  if (ramp && !bank) return 'ramp-only';
  if (bank && !ramp) return 'bank-only';
  return 'other';
}
function linked(a, b) {
  return a.signature === b.signature
    && Math.abs(a.ramp.x - b.ramp.x) <= LINK_DX && Math.abs(a.ramp.z - b.ramp.z) <= LINK_DZ && Math.abs(a.ramp.yaw - b.ramp.yaw) <= LINK_DYAW
    && Math.abs(a.bank.x - b.bank.x) <= LINK_DX && Math.abs(a.bank.z - b.bank.z) <= LINK_DZ && Math.abs(a.bank.yaw - b.bank.yaw) <= LINK_DYAW;
}
function normDistance(a, b) {
  const piece = (left, right) => Math.abs(left.x - right.x) / LINK_DX + Math.abs(left.z - right.z) / LINK_DZ + Math.abs(left.yaw - right.yaw) / LINK_DYAW;
  return piece(a.ramp, b.ramp) + piece(a.bank, b.bank);
}
function round3(value) { return Math.round(value * 1000) / 1000; }

const engine = new NullEngine(), scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
const physics = scene.getPhysicsEngine();
physics.setTimeStep(1 / 120); physics.setSubTimeStep(1000 / 120);
const runtime = createWorldcraftRuntime(scene, { world: base, build: 'bell-rail-sweep' });
let shots = 0;
let compiledKey = '';
function shoot(world, { closest = false } = {}) {
  const ramp = world.objects.find(object => object.id === 'ramp-yours');
  const bank = world.objects.find(object => object.id === 'bank-yours');
  const key = `${poseKey(ramp, bank)}|${JSON.stringify(world.rules.rail)}`;
  if (runtime.mode !== 'build') runtime.setMode('build');
  if (key !== compiledKey) {
    const replaced = runtime.replaceWorld(world, { intent: 'load' });
    if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
    compiledKey = key;
  } else if (runtime.world.timing?.delay !== world.timing.delay) {
    const updated = runtime.setLaunchDelay(world.timing.delay);
    if (!updated.ok) throw new Error(updated.error ?? 'delay failed');
  }
  runtime.setMode('play');
  if (!runtime.launch(worldcraftFixedSetup(world))) throw new Error(runtime.error || 'launch failed');
  let nearest = Infinity;
  const delay = world.timing.delay;
  for (let i = 0; i < 7300 && !runtime.flight.ended; i++) {
    runtime.beforeStep();
    physics._step(1 / 120);
    runtime.afterStep();
    if (closest && runtime.flight) {
      const p = runtime.flight.mesh.position;
      const pose = worldcraftBellPose(target, delay + runtime.flight.elapsed);
      nearest = Math.min(nearest, Math.hypot(p.x - pose.x, p.y - pose.y, p.z - pose.z));
    }
  }
  const last = runtime.last;
  if (!last) throw new Error('shot did not resolve');
  shots++;
  if (shots % 1000 === 0) console.log(`shots ${shots}`);
  runtime.setMode('build');
  return { last, nearest };
}
function withAim(ramp, bank, delay, railPatch) {
  const world = layout(ramp, bank, delay);
  return validateWorld({ ...world, rules: { ...world.rules, rail: { ...world.rules.rail, ...railPatch } } });
}

const slices = [];
function addSlice(name, ramps, banks) {
  const layouts = [];
  for (const ramp of ramps) for (const bank of banks) layouts.push({ ramp, bank });
  slices.push({ name, layouts });
}
function grid(axes) {
  const poses = [{}];
  for (const [key, values] of Object.entries(axes)) {
    const next = [];
    for (const pose of poses) for (const value of values) next.push({ ...pose, [key]: value });
    poses.splice(0, poses.length, ...next);
  }
  return poses;
}
addSlice('default', [{ x: 0, z: 42, yaw: 0 }], [{ x: 14, z: 28, yaw: 0 }]);
addSlice('clear', [{ x: -22, z: 86, yaw: 0 }], [{ x: 22, z: 86, yaw: 90 }]);
addSlice('ramp', grid({ x: [-8, -4, -2, 0, 2, 4, 8], z: [36, 40, 44, 48], yaw: [-60, -40, -20, -10, 0, 10, 20, 40, 60] }), [{ x: 14, z: 28, yaw: 0 }]);
addSlice('early-ramp', grid({ x: [-14, -12, -10, -8, -6, -4, -2], z: [38, 40, 42], yaw: [-5, 0, 5] }), [{ x: 0, z: 16, yaw: 80 }]);
addSlice('early-bank', [{ x: -8, z: 40, yaw: 0 }], grid({ x: [-1, 0, 1], z: [15, 16, 17], yaw: [75, 80, 85] }));
addSlice('late-ramp', grid({ x: [-2, -1, 0], z: [40.5, 41, 41.5, 42, 42.5, 43], yaw: [15, 20, 25] }), [{ x: -6, z: 68, yaw: 20 }]);
addSlice('late-bank', [{ x: -1, z: 42, yaw: 20 }], grid({ x: [-7, -6, -5], z: [67, 68, 69], yaw: [15, 20, 25] }));

const rand = mulberry32(SEED);
const joint = [];
const seen = new Set(slices.flatMap(slice => slice.layouts.map(item => poseKey(item.ramp, item.bank))));
let jointAttempts = 0;
while (joint.length < 100 && jointAttempts < 4000) {
  jointAttempts++;
  const ramp = {
    x: (-16 * 2 + Math.floor(rand() * (16 * 2 - -16 * 2 + 1))) / 2,
    z: (20 * 2 + Math.floor(rand() * (78 * 2 - 20 * 2 + 1))) / 2,
    yaw: -60 + Math.floor(rand() * 25) * 5,
  };
  const bank = {
    x: (-20 * 2 + Math.floor(rand() * (22 * 2 - -20 * 2 + 1))) / 2,
    z: (14 * 2 + Math.floor(rand() * (80 * 2 - 14 * 2 + 1))) / 2,
    yaw: -90 + Math.floor(rand() * 37) * 5,
  };
  const key = poseKey(ramp, bank);
  if (seen.has(key) || !tryLayout(ramp, bank)) continue;
  seen.add(key);
  joint.push({ ramp, bank });
}
slices.push({ name: 'joint', layouts: joint });

const unique = new Set();
const queue = [];
const sliceCounts = {};
for (const slice of slices) {
  sliceCounts[slice.name] = { candidates: slice.layouts.length, invalid: 0, firedLayouts: 0, firedShots: 0, hits: 0, both: 0, rampOnly: 0, bankOnly: 0, other: 0 };
  for (const item of slice.layouts) {
    const key = poseKey(item.ramp, item.bank);
    if (unique.has(key)) continue;
    if (!tryLayout(item.ramp, item.bank)) { sliceCounts[slice.name].invalid++; continue; }
    unique.add(key);
    sliceCounts[slice.name].firedLayouts++;
    queue.push({ ...item, slice: slice.name });
  }
}

const started = performance.now();
const trials = [];
const hits = [];
const defaults = [];
const signatures = [];
function sigIndex(text) {
  let index = signatures.indexOf(text);
  if (index < 0) { index = signatures.length; signatures.push(text); }
  return index;
}
for (const item of queue) {
  for (const delay of DELAYS) {
    const world = layout(item.ramp, item.bank, delay);
    const tracked = item.slice === 'default';
    const { last, nearest } = shoot(world, { closest: tracked });
    const text = signature(last.contacts);
    const kind = klass(text);
    const bell = last.contacts.find(contact => contact.body === TARGET) ?? null;
    sliceCounts[item.slice].firedShots++;
    if (kind !== 'miss') {
      sliceCounts[item.slice].hits++;
      sliceCounts[item.slice][kind === 'ramp-only' ? 'rampOnly' : kind === 'bank-only' ? 'bankOnly' : kind === 'both' ? 'both' : 'other']++;
      hits.push({
        slice: item.slice,
        ramp: item.ramp, bank: item.bank, delay,
        signature: text, class: kind,
        bellFirst: bell.first,
        bellPoint: [bell.point.x, bell.point.y, bell.point.z],
        reason: last.reason,
        terminal: last.position.map(round3),
        shield: last.contacts.some(contact => contact.body === 'worldcraft-object-shield'),
      });
    }
    if (tracked) defaults.push({ delay, hit: kind !== 'miss', nearest: nearest === Infinity ? null : nearest, terminal: last.position.map(round3), reason: last.reason, signature: text });
    trials.push([item.slice, item.ramp.x, item.ramp.z, item.ramp.yaw, item.bank.x, item.bank.z, item.bank.yaw, delay, kind === 'miss' ? 0 : 1, sigIndex(text)]);
  }
}

const nudge = {
  yaw: { applicable: 0, survived: 0, invalid: 0, sameClass: 0, byClass: {} },
  delay: { applicable: 0, survived: 0, invalid: 0, sameClass: 0, notApplicable: 0, byClass: {} },
};
function bump(bucket, hitClass, field) {
  bucket.byClass[hitClass] ??= { applicable: 0, survived: 0, invalid: 0 };
  bucket.byClass[hitClass][field]++;
}
for (const hit of hits) {
  const yaws = [
    { ramp: { ...hit.ramp, yaw: hit.ramp.yaw + 5 }, bank: hit.bank },
    { ramp: { ...hit.ramp, yaw: hit.ramp.yaw - 5 }, bank: hit.bank },
    { ramp: hit.ramp, bank: { ...hit.bank, yaw: hit.bank.yaw + 5 } },
    { ramp: hit.ramp, bank: { ...hit.bank, yaw: hit.bank.yaw - 5 } },
  ];
  for (const pose of yaws) {
    nudge.yaw.applicable++;
    bump(nudge.yaw, hit.class, 'applicable');
    const world = tryLayout(pose.ramp, pose.bank, hit.delay);
    if (!world) { nudge.yaw.invalid++; bump(nudge.yaw, hit.class, 'invalid'); continue; }
    const { last } = shoot(world);
    const kind = klass(signature(last.contacts));
    if (kind !== 'miss') { nudge.yaw.survived++; bump(nudge.yaw, hit.class, 'survived'); if (kind === hit.class) nudge.yaw.sameClass++; }
  }
  for (const delta of [0.5, -0.5]) {
    const delay = hit.delay + delta;
    if (delay < WORLDCRAFT_DELAY.min || delay > WORLDCRAFT_DELAY.max) { nudge.delay.notApplicable++; continue; }
    nudge.delay.applicable++;
    bump(nudge.delay, hit.class, 'applicable');
    const world = tryLayout(hit.ramp, hit.bank, delay);
    if (!world) { nudge.delay.invalid++; bump(nudge.delay, hit.class, 'invalid'); continue; }
    const { last } = shoot(world);
    const kind = klass(signature(last.contacts));
    if (kind !== 'miss') { nudge.delay.survived++; bump(nudge.delay, hit.class, 'survived'); if (kind === hit.class) nudge.delay.sameClass++; }
  }
}

const byLayout = new Map();
for (const hit of hits) {
  const key = `${hit.signature}|${poseKey(hit.ramp, hit.bank)}`;
  if (!byLayout.has(key)) byLayout.set(key, []);
  byLayout.get(key).push(hit);
}
const layoutHits = [...byLayout.values()].map(members => {
  const delays = members.map(member => member.delay).sort((a, b) => a - b);
  const median = delays[Math.floor((delays.length - 1) / 2)];
  return members.find(member => member.delay === median);
});
const parent = layoutHits.map((_, index) => index);
const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
for (let i = 0; i < layoutHits.length; i++) for (let j = i + 1; j < layoutHits.length; j++) if (linked(layoutHits[i], layoutHits[j])) parent[find(j)] = find(i);
const groups = new Map();
layoutHits.forEach((hit, index) => {
  const root = find(index);
  if (!groups.has(root)) groups.set(root, []);
  groups.get(root).push(hit);
});
const clusters = [...groups.values()].map(members => {
  const medoid = members.slice().sort((a, b) => {
    const score = item => members.reduce((sum, other) => sum + normDistance(item, other), 0);
    return score(a) - score(b) || poseKey(a.ramp, a.bank).localeCompare(poseKey(b.ramp, b.bank));
  })[0];
  const delays = hits.filter(hit => members.some(member => poseKey(member.ramp, member.bank) === poseKey(hit.ramp, hit.bank) && hit.signature === member.signature)).map(hit => hit.delay);
  return {
    size: members.length,
    signature: medoid.signature,
    class: medoid.class,
    kept: members.length >= MIN_CLUSTER,
    medoid: { ramp: medoid.ramp, bank: medoid.bank, delay: medoid.delay, bellFirst: medoid.bellFirst, bellPoint: medoid.bellPoint },
    delayMin: Math.min(...delays),
    delayMax: Math.max(...delays),
  };
}).sort((a, b) => b.size - a.size || a.signature.localeCompare(b.signature) || poseKey(a.medoid.ramp, a.medoid.bank).localeCompare(poseKey(b.medoid.ramp, b.medoid.bank)));

const aim = [];
for (const cluster of clusters.filter(cluster => cluster.kept)) {
  const { ramp, bank, delay } = cluster.medoid;
  const probes = [
    ['yaw+5', { yaw: 5 }], ['yaw-5', { yaw: -5 }],
    ['pitch+5', { elevation: 23 }], ['pitch-5', { elevation: 13 }],
  ];
  const row = { signature: cluster.signature, ramp, bank, delay, results: {} };
  for (const [name, patch] of probes) {
    const world = withAim(ramp, bank, delay, patch);
    const { last } = shoot(world);
    row.results[name] = { hit: klass(signature(last.contacts)) !== 'miss', signature: signature(last.contacts), reason: last.reason };
  }
  aim.push(row);
}

function outcome(last) {
  const contacts = last.contacts.map(contact => `${contact.body}:${contact.count}:${round3(contact.first)}:${round3(contact.last)}`).join('|');
  return `${last.targetResult?.status}|${last.reason}|${last.position.map(round3).join(',')}|${contacts}`;
}
const determinism = [];
const checks = [
  { name: 'default-delay-0', ramp: { x: 0, z: 42, yaw: 0 }, bank: { x: 14, z: 28, yaw: 0 }, delay: 0 },
];
const familyReps = new Map();
for (const hit of hits) if (!familyReps.has(hit.signature)) familyReps.set(hit.signature, hit);
for (const hit of familyReps.values()) checks.push({ name: hit.signature, ramp: hit.ramp, bank: hit.bank, delay: hit.delay });
for (const check of checks) {
  const world = layout(check.ramp, check.bank, check.delay);
  const first = outcome(shoot(world).last);
  const second = outcome(shoot(world).last);
  determinism.push({ name: check.name, match: first === second });
}
const poseWorld = layout({ x: 0, z: 42, yaw: 0 }, { x: 14, z: 28, yaw: 0 }, 0);
if (runtime.mode !== 'build') runtime.setMode('build');
runtime.replaceWorld(poseWorld, { intent: 'load' });
const bellMesh = scene.getMeshByName(TARGET);
runtime.setMode('play');
runtime.launch(worldcraftFixedSetup(poseWorld));
for (let i = 0; i < 240 && !runtime.flight.ended; i++) { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
const expected = worldcraftBellPose(target, runtime.flight.elapsed);
const poseError = Math.hypot(bellMesh.position.x - expected.x, bellMesh.position.y - expected.y, bellMesh.position.z - expected.z);

const classCounts = {};
for (const hit of hits) classCounts[hit.class] = (classCounts[hit.class] ?? 0) + 1;
const familyCounts = {};
for (const hit of hits) familyCounts[hit.signature] = (familyCounts[hit.signature] ?? 0) + 1;
const layoutClass = new Map();
for (const hit of hits) {
  const key = poseKey(hit.ramp, hit.bank);
  const prior = layoutClass.get(key) ?? new Set();
  prior.add(hit.class);
  layoutClass.set(key, prior);
}
const layoutsByClass = { both: 0, 'ramp-only': 0, 'bank-only': 0, other: 0, mixed: 0 };
for (const classes of layoutClass.values()) {
  if (classes.size > 1) layoutsByClass.mixed++;
  else layoutsByClass[[...classes][0]]++;
}

const payload = {
  experiment: 'wc-exp-20261024-bell-rail',
  seed: SEED,
  rng: 'mulberry32',
  seedUsedFor: 'the 100 joint layouts only; every lattice is enumerated',
  jointAttempts,
  jointAccepted: joint.length,
  world: base,
  bell: WORLDCRAFT_BELL,
  delay: WORLDCRAFT_DELAY,
  pose: 't = launch delay + flight seconds. Distance along the segment is a triangular wave at target.speed. t = 0 is endpoints[0]. Idle time is not added.',
  win: 'any recorded projectile contact with worldcraft-target-bell before the incumbent ledger closes',
  classMeaning: {
    both: 'ramp and bank both contacted before the bell',
    'ramp-only': 'ramp contacted before the bell and the bank was not',
    'bank-only': 'bank contacted before the bell and the ramp was not',
    other: 'bell contacted without that pair',
  },
  linkage: { dx: LINK_DX, dz: LINK_DZ, dyaw: LINK_DYAW, minCluster: MIN_CLUSTER, note: 'clusters group layouts, not delays. A cluster is kept at size >= 3.' },
  nudgeDefinition: {
    yaw: 'one movable piece at a time, yaw ±5 degrees, same delay. Invalid placements count as applicable and not survived.',
    delay: 'same layout, delay ±0.5 s. A step outside 0–10 s is not applicable.',
    aim: 'kept-cluster medoids only. Launch yaw ±5° and launch elevation (pitch) ±5° from the fixed rail (0°, 18°). Not a player control on this challenge.',
  },
  seconds: (performance.now() - started) / 1000,
  shots,
  sliceCounts,
  firedLayouts: queue.length,
  firedTrials: trials.length,
  hitTrials: hits.length,
  hitFraction: trials.length ? hits.length / trials.length : 0,
  classCounts,
  familyCounts,
  layoutsByClass,
  shieldHits: hits.filter(hit => hit.shield).length,
  defaults,
  clusters,
  aim,
  nudge,
  determinism,
  poseErrorAtTwoSeconds: poseError,
  signatures,
  trialColumns: ['slice', 'rampX', 'rampZ', 'rampYaw', 'bankX', 'bankZ', 'bankYaw', 'delay', 'hit', 'signatureIndex'],
  trials,
  hits,
};
await mkdir(new URL('../docs/experiments/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/experiments/wc-exp-20261024-bell-rail-sweep.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
const summary = {
  seconds: payload.seconds, shots, firedLayouts: queue.length, firedTrials: trials.length,
  hitTrials: hits.length, hitFraction: payload.hitFraction, classCounts, familyCounts, layoutsByClass,
  sliceCounts, nudge, aim, clusters: clusters.map(cluster => ({ size: cluster.size, kept: cluster.kept, signature: cluster.signature, medoid: cluster.medoid, delayMin: cluster.delayMin, delayMax: cluster.delayMax })),
  determinism, poseError, defaults: defaults.filter(row => row.hit).length, defaultNearest: Math.min(...defaults.map(row => row.nearest)),
  jointAttempts, jointAccepted: joint.length,
};
console.log(JSON.stringify(summary, null, 2));
runtime.dispose(); scene.dispose(); engine.dispose();
