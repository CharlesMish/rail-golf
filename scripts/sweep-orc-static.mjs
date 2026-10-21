// Headless Havok sweep for the Orc Stand-in challenge.
// Physics authority is the Worldcraft runtime: incumbent projectile, 120 Hz Havok,
// first-ground termination. This file only places the two movable pieces.
//
// Usage:
//   node scripts/sweep-orc-static.mjs probe
//   node scripts/sweep-orc-static.mjs
//
// The full run writes docs/experiments/wc-exp-20261020-orc-static-sweep.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { createOrcStaticWorld, validateWorld, worldcraftFixedSetup, worldcraftTargetBody, WORLDCRAFT_ORC } from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const SEED = 20261020;
const TARGET_BODY = worldcraftTargetBody('stand-in-orc');
const LINK_DX = 4;
const LINK_DZ = 4;
const LINK_DYAW = 15;
const MIN_CLUSTER = 3;

const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createOrcStaticWorld();
const setup = worldcraftFixedSetup(base);
const shield = base.objects.find(object => object.id === 'shield');
const defaultRamp = base.objects.find(object => object.id === 'ramp-yours');
const defaultBank = base.objects.find(object => object.id === 'bank-yours');

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
function layout(ramp, bank) {
  return validateWorld({ ...base, objects: [
    { id: 'ramp-yours', kind: 'ramp', x: ramp.x, z: ramp.z, yaw: ramp.yaw },
    { id: 'bank-yours', kind: 'bank', x: bank.x, z: bank.z, yaw: bank.yaw },
    shield,
  ] });
}
function tryLayout(ramp, bank) {
  try { return layout(ramp, bank); } catch { return null; }
}
function signature(contacts) {
  const names = [];
  for (const contact of contacts) {
    let kind = contact.body;
    if (contact.body === TARGET_BODY) kind = 'orc';
    else if (contact.body === 'worldcraft-ground' || contact.body === 'worldcraft-tee') kind = 'ground';
    else if (contact.body === 'worldcraft-object-shield') kind = 'shield';
    else if (contact.body === 'worldcraft-object-ramp-yours') kind = 'ramp';
    else if (contact.body === 'worldcraft-object-bank-yours') kind = 'bank';
    if (kind === 'ground') continue;
    if (names.at(-1) !== kind) names.push(kind);
  }
  const orcAt = names.indexOf('orc');
  return (orcAt < 0 ? names : names.slice(0, orcAt + 1)).join('>');
}
function linked(a, b) {
  // Same contact order is required. Pose distance alone must not fuse a bank-then-ramp
  // hit with a ramp-then-bank hit. Thresholds were fixed before the confirmatory run.
  return a.signature === b.signature
    && Math.abs(a.ramp.x - b.ramp.x) <= LINK_DX && Math.abs(a.ramp.z - b.ramp.z) <= LINK_DZ && Math.abs(a.ramp.yaw - b.ramp.yaw) <= LINK_DYAW
    && Math.abs(a.bank.x - b.bank.x) <= LINK_DX && Math.abs(a.bank.z - b.bank.z) <= LINK_DZ && Math.abs(a.bank.yaw - b.bank.yaw) <= LINK_DYAW;
}
function normDistance(a, b) {
  const piece = (left, right) => Math.abs(left.x - right.x) / LINK_DX + Math.abs(left.z - right.z) / LINK_DZ + Math.abs(left.yaw - right.yaw) / LINK_DYAW;
  return piece(a.ramp, b.ramp) + piece(a.bank, b.bank);
}

function harness() {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world: base, build: 'orc-static-sweep' });
  return {
    runtime,
    shoot(world) {
      if (runtime.world !== world) {
        if (runtime.mode !== 'build') runtime.setMode('build');
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

function recordShot(kind, ramp, bank, last) {
  const target = last.targetResult;
  const orc = last.contacts.find(contact => contact.body === TARGET_BODY) ?? null;
  return {
    kind,
    ramp: { x: ramp.x, z: ramp.z, yaw: ramp.yaw },
    bank: { x: bank.x, z: bank.z, yaw: bank.yaw },
    hit: target?.status === 'hit',
    status: target?.status ?? null,
    reason: last.reason,
    signature: signature(last.contacts),
    orcFirst: orc ? orc.first : null,
    orcPoint: orc ? [orc.point.x, orc.point.y, orc.point.z] : null,
    orcCount: orc ? orc.count : 0,
    terminal: last.position.map(value => Math.round(value * 1000) / 1000),
    contacts: last.contacts.map(contact => contact.body),
  };
}

function clustersOf(hits) {
  const parent = hits.map((_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) if (linked(hits[i], hits[j])) parent[find(j)] = find(i);
  const groups = new Map();
  hits.forEach((hit, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(hit);
  });
  return [...groups.values()].map(members => {
    const medoid = members.slice().sort((a, b) => {
      const score = item => members.reduce((sum, other) => sum + normDistance(item, other), 0);
      return score(a) - score(b) || poseKey(a.ramp, a.bank).localeCompare(poseKey(b.ramp, b.bank));
    })[0];
    return { size: members.length, signature: medoid.signature, medoid: { ramp: medoid.ramp, bank: medoid.bank, signature: medoid.signature, orcFirst: medoid.orcFirst, orcPoint: medoid.orcPoint } };
  }).sort((a, b) => b.size - a.size || poseKey(a.medoid.ramp, a.medoid.bank).localeCompare(poseKey(b.medoid.ramp, b.medoid.bank)));
}

const probe = process.argv.includes('probe');
// Anchors measured while authoring, then held fixed for this sweep.
// Early family: bank first, then the ramp, into the stand-in.
// Late family: ramp first, then the bank, into the same stand-in.
const EARLY_RAMP = { x: -8, z: 40, yaw: 0 };
const EARLY_BANK = { x: 0, z: 16, yaw: 80 };
const LATE_RAMP = { x: -1, z: 42, yaw: 20 };
const LATE_BANK = { x: -6, z: 68, yaw: 20 };
const rampLattice = {
  x: probe ? [-8, 0] : [-14, -12, -10, -8, -6, -4, -2],
  z: probe ? [40] : [38, 40, 42],
  yaw: probe ? [0] : [-5, 0, 5],
};
const bankLattice = {
  x: probe ? [0] : [-1, 0, 1],
  z: probe ? [16] : [15, 16, 17],
  yaw: probe ? [80] : [75, 80, 85],
};
const lateRampLattice = {
  x: probe ? [-1] : [-2, -1, 0],
  z: probe ? [42] : [40.5, 41, 41.5, 42, 42.5, 43],
  yaw: probe ? [20] : [15, 20, 25],
};
const lateBankLattice = {
  x: probe ? [-6] : [-7, -6, -5],
  z: probe ? [68] : [67, 68, 69],
  yaw: probe ? [20] : [15, 20, 25],
};

function enumerate(lattice) {
  const poses = [];
  for (const x of lattice.x) for (const z of lattice.z) for (const yaw of lattice.yaw) poses.push({ x, z, yaw });
  return poses;
}

const jobs = [];
const seen = new Set();
function pushJob(kind, ramp, bank) {
  const key = poseKey(ramp, bank);
  if (seen.has(key)) return;
  const world = tryLayout(ramp, bank);
  if (!world) return;
  seen.add(key);
  jobs.push({ kind, ramp, bank, world });
}

pushJob('default', defaultRamp, defaultBank);
pushJob('clear', { x: -22, z: 86, yaw: 0 }, { x: 22, z: 86, yaw: 90 });
pushJob('early-exemplar', EARLY_RAMP, EARLY_BANK);
pushJob('late-exemplar', LATE_RAMP, LATE_BANK);
for (const yaw of (probe ? [0, 20] : [-40, -20, 0, 20, 40])) pushJob('center-ramp', { x: 0, z: 42, yaw }, defaultBank);
for (const ramp of enumerate(rampLattice)) pushJob('early-ramp', ramp, EARLY_BANK);
for (const bank of enumerate(bankLattice)) pushJob('early-bank', EARLY_RAMP, bank);
for (const ramp of enumerate(lateRampLattice)) pushJob('late-ramp', ramp, LATE_BANK);
for (const bank of enumerate(lateBankLattice)) pushJob('late-bank', LATE_RAMP, bank);
if (!probe) {
  const random = mulberry32(SEED);
  const jointRamps = [];
  for (const x of [-16, -12, -8, -4, 0, 4, 8]) for (const z of [28, 36, 42, 48]) for (const yaw of [-20, 0, 20, 40]) jointRamps.push({ x, z, yaw });
  const jointBanks = [];
  for (const x of [-8, -4, 0, 4, 8, 14]) for (const z of [16, 28, 42, 68]) for (const yaw of [-20, 0, 20, 80]) jointBanks.push({ x, z, yaw });
  let draws = 0, guard = 0;
  while (draws < 180 && guard < 4000) {
    guard++;
    const ramp = jointRamps[Math.floor(random() * jointRamps.length)];
    const bank = jointBanks[Math.floor(random() * jointBanks.length)];
    const before = jobs.length;
    pushJob('joint', ramp, bank);
    if (jobs.length !== before) draws++;
  }
}

const h = harness();
const shots = [];
const started = performance.now();
try {
  const target = h.runtime.objectMeshes.size;
  const orc = h.runtime.diagnostics();
  console.log(JSON.stringify({
    pieces: target,
    staticBodies: orc.staticBodies,
    orcMotion: 'checked-after-first-compile',
    orcRestitution: WORLDCRAFT_ORC.restitution,
    jobs: jobs.length,
    probe,
    seed: SEED,
  }));
  for (const job of jobs) {
    const last = h.shoot(job.world);
    const row = recordShot(job.kind, job.ramp, job.bank, last);
    shots.push(row);
    if (row.hit || shots.length % 40 === 0) console.log(`${shots.length}/${jobs.length} ${row.hit ? 'HIT' : 'miss'} ${row.kind} ${row.signature || '-'} ramp(${row.ramp.x},${row.ramp.z},${row.ramp.yaw}) bank(${row.bank.x},${row.bank.z},${row.bank.yaw})`);
  }
} finally { h.dispose(); }

const hits = shots.filter(shot => shot.hit);
const bySignature = {};
for (const hit of hits) bySignature[hit.signature] = (bySignature[hit.signature] ?? 0) + 1;
const clusters = clustersOf(hits).filter(cluster => cluster.size >= MIN_CLUSTER);
const summary = {
  seed: SEED,
  probe,
  shots: shots.length,
  hits: hits.length,
  hitFraction: shots.length ? hits.length / shots.length : 0,
  bySignature,
  clusters,
  default: shots.find(shot => shot.kind === 'default') ?? null,
  clear: shots.find(shot => shot.kind === 'clear') ?? null,
  elapsedSeconds: Math.round((performance.now() - started) / 10) / 100,
};
console.log(JSON.stringify(summary, null, 2));
if (!probe) {
  await mkdir(new URL('../docs/experiments/', import.meta.url), { recursive: true });
  const fragility = [];
  const nudgeHarness = harness();
  try {
    for (const cluster of clusters.slice(0, 6)) {
      const nudges = [];
      for (const piece of ['ramp', 'bank']) {
        for (const [key, delta] of [['yaw', 5], ['yaw', -5], ['x', .5], ['x', -.5], ['z', .5], ['z', -.5]]) {
          const ramp = { ...cluster.medoid.ramp };
          const bank = { ...cluster.medoid.bank };
          const edited = piece === 'ramp' ? ramp : bank;
          edited[key] = Math.round((edited[key] + delta) * 2) / 2;
          const world = tryLayout(ramp, bank);
          if (!world) { nudges.push({ piece, key, delta, valid: false, hit: false }); continue; }
          const last = nudgeHarness.shoot(world);
          const row = recordShot('nudge', ramp, bank, last);
          nudges.push({ piece, key, delta, valid: true, hit: row.hit, signature: row.signature });
        }
      }
      const valid = nudges.filter(nudge => nudge.valid);
      fragility.push({
        medoid: cluster.medoid,
        clusterSize: cluster.size,
        nudges: nudges.length,
        valid: valid.length,
        stillHit: valid.filter(nudge => nudge.hit).length,
        hitFractionOfValid: valid.length ? valid.filter(nudge => nudge.hit).length / valid.length : 0,
        details: nudges,
      });
    }
  } finally { nudgeHarness.dispose(); }
  const payload = {
    experiment: 'wc-exp-20261020-orc-static',
    seed: SEED,
    setup,
    havok: 'node_modules/@babylonjs/havok',
    world: base,
    orc: WORLDCRAFT_ORC,
    win: 'any recorded projectile contact with worldcraft-target-stand-in-orc before the incumbent ledger closes',
    linkage: { dx: LINK_DX, dz: LINK_DZ, dyaw: LINK_DYAW, minCluster: MIN_CLUSTER },
    lattices: {
      earlyRamp: rampLattice, earlyBank: bankLattice, earlyAnchor: { ramp: EARLY_RAMP, bank: EARLY_BANK },
      lateRamp: lateRampLattice, lateBank: lateBankLattice, lateAnchor: { ramp: LATE_RAMP, bank: LATE_BANK },
      jointDraws: probe ? 0 : 180, jointSeed: SEED,
    },
    summary: { ...summary, fragility: fragility.map(({ details, ...rest }) => rest) },
    fragility,
    shots,
  };
  await writeFile(new URL('../docs/experiments/wc-exp-20261020-orc-static-sweep.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote sweep json · clusters ${clusters.length} · hits ${hits.length}/${shots.length}`);
}
