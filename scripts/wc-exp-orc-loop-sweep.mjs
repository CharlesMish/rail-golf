// Deterministic Havok sweep for the Orc Loop lab. No RNG.
// Usage: node scripts/wc-exp-orc-loop-sweep.mjs [output.json]
import { readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import {
  WORLDCRAFT_DELAY, WORLDCRAFT_TARGET_BODY, createOrcLoopWorld, validateWorld, worldcraftFixedSetup, worldcraftTargetBodyName, worldcraftTargetPose,
} from '../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const outPath = process.argv[2] ?? '';
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createOrcLoopWorld();
const setup = worldcraftFixedSetup(base);
const orcName = worldcraftTargetBodyName(base.rules.target);
const round = value => Math.round(value * 1e6) / 1e6;
const delays = [];
for (let delay = WORLDCRAFT_DELAY.min; delay <= WORLDCRAFT_DELAY.max + 1e-9; delay += WORLDCRAFT_DELAY.step) delays.push(round(delay));

const rampGrid = { x: [-4, -2, 0, 2, 4], z: [38, 40, 42, 44, 46], yaw: [-20, -15, -10, -5, 0, 5, 10, 15] };
const bankGrid = { x: [-10, -6, -2, 2, 8, 16], z: [56, 62, 66, 70], yaw: [-40, -25, 0, 25] };
const parkedBank = { x: 16, z: 56, yaw: 0 };
const defaultRamp = { x: 0, z: 42, yaw: 0 };

function harness() {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world: base, build: 'orc-loop-sweep' });
  return {
    runtime,
    shoot(world) {
      runtime.setMode('build');
      const replaced = runtime.replaceWorld(world, { intent: 'load' });
      if (!replaced.ok) return { invalid: true, error: replaced.error };
      runtime.setMode('play');
      runtime.clearShot();
      if (!runtime.launch(worldcraftFixedSetup(world))) return { invalid: true, error: runtime.error };
      for (let i = 0; i < 1400 && !runtime.flight.ended; i++) {
        runtime.beforeStep();
        physics._step(1 / 120);
        runtime.afterStep();
      }
      const flight = runtime.flight;
      let pose = null;
      if (flight && runtime.targetMesh) {
        runtime.targetMesh.computeWorldMatrix(true);
        const abs = runtime.targetMesh.absolutePosition;
        const law = worldcraftTargetPose(world.rules.target, world.timing.delay + flight.elapsed);
        pose = {
          elapsed: round(flight.elapsed),
          mesh: [round(abs.x), round(abs.y), round(abs.z)],
          law: [round(law.x), round(law.y), round(law.z)],
          errorMeters: round(Math.hypot(abs.x - law.x, abs.y - law.y, abs.z - law.z)),
        };
      }
      if (flight && !flight.ended) runtime.clearShot();
      return { invalid: false, record: runtime.last, pose };
    },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}

function layout(ramp, bank, delay) {
  return validateWorld({
    ...base,
    objects: [
      { ...base.objects.find(object => object.id === 'ramp-yours'), ...ramp },
      { ...base.objects.find(object => object.id === 'bank-yours'), ...bank },
    ],
    timing: { delay },
  });
}
const piece = (world, id) => {
  const object = world.objects.find(item => item.id === id);
  return { x: object.x, z: object.z, yaw: object.yaw };
};
const keyOf = (ramp, bank) => `${ramp.x},${ramp.z},${ramp.yaw}|${bank.x},${bank.z},${bank.yaw}`;
function familyOf(contacts) {
  const prefix = [];
  for (const contact of contacts) {
    if (contact.body === orcName) break;
    if (!contact.body.startsWith('worldcraft-object-')) continue;
    const id = contact.body.slice('worldcraft-object-'.length);
    if (!prefix.includes(id)) prefix.push(id);
  }
  return prefix.join('>') || 'direct';
}
function summarize(world, shot) {
  const ramp = piece(world, 'ramp-yours'), bank = piece(world, 'bank-yours'), delay = world.timing.delay;
  if (shot.invalid) return { invalid: true, ramp, bank, delay, error: shot.error };
  const record = shot.record;
  const contacts = record.contacts.map(contact => ({ body: contact.body, count: contact.count, first: round(contact.first), last: round(contact.last), point: { x: round(contact.point.x), y: round(contact.point.y), z: round(contact.point.z) } }));
  let closest = Infinity;
  for (const sample of record.samples) {
    const pose = worldcraftTargetPose(world.rules.target, delay + sample.t);
    closest = Math.min(closest, Math.hypot(sample.x - pose.x, sample.y - pose.y, sample.z - pose.z));
  }
  return {
    invalid: false, ramp, bank, delay,
    status: record.pinResult?.status ?? null,
    reason: record.reason,
    elapsed: round(record.elapsed),
    position: record.position.map(round),
    contacts,
    family: record.pinResult?.status === 'clear' ? familyOf(record.contacts) : null,
    closest: round(closest),
    contactTime: record.pinResult?.contactTime == null ? null : round(record.pinResult.contactTime),
  };
}
const outcome = row => JSON.stringify({
  status: row.status, reason: row.reason, position: row.position.map(value => Math.round(value * 1e4) / 1e4),
  contacts: row.contacts.map(contact => ({ body: contact.body, count: contact.count, first: Math.round(contact.first * 1e4) / 1e4, last: Math.round(contact.last * 1e4) / 1e4 })),
});
const pointDelta = (left, right) => {
  const a = left.contacts.find(contact => contact.body === orcName);
  const b = right.contacts.find(contact => contact.body === orcName);
  if (!a || !b) return a || b ? null : 0;
  return Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y, a.point.z - b.point.z);
};

const layouts = [];
const seen = new Set();
const add = (ramp, bank) => {
  const key = keyOf(ramp, bank);
  if (seen.has(key)) return;
  seen.add(key);
  layouts.push({ ramp, bank });
};
for (const x of rampGrid.x) for (const z of rampGrid.z) for (const yaw of rampGrid.yaw) add({ x, z, yaw }, parkedBank);
for (const x of bankGrid.x) for (const z of bankGrid.z) for (const yaw of bankGrid.yaw) add(defaultRamp, { x, z, yaw });
for (const yaw of [-10, -5]) for (const x of [-6, 16]) for (const z of [66, 56]) for (const by of [-25, 0]) add({ x: 0, z: 42, yaw }, { x, z, yaw: by });

const h = harness();
const started = Date.now();
const hits = [];
const defaultRows = [];
let valid = 0, rejected = 0, shots = 0;
const families = new Map();
try {
  for (const item of layouts) {
    let sample;
    try { sample = layout(item.ramp, item.bank, 0); }
    catch { rejected++; continue; }
    valid++;
    for (const delay of delays) {
      const world = layout(item.ramp, item.bank, delay);
      const row = summarize(world, h.shoot(world));
      shots++;
      if (item.ramp.x === 0 && item.ramp.z === 42 && item.ramp.yaw === 0 && item.bank.x === 16 && item.bank.z === 56 && item.bank.yaw === 0) {
        defaultRows.push({ delay, status: row.status, reason: row.reason, closest: row.closest, position: row.position, contacts: row.contacts.map(contact => contact.body) });
      }
      if (row.status === 'clear') {
        hits.push(row);
        families.set(row.family, (families.get(row.family) ?? 0) + 1);
      }
    }
  }

  const perturb = (hit, patch) => {
    const ramp = { ...hit.ramp, ...patch.ramp };
    const bank = { ...hit.bank, ...patch.bank };
    const delay = patch.delay ?? hit.delay;
    if (delay < WORLDCRAFT_DELAY.min - 1e-9 || delay > WORLDCRAFT_DELAY.max + 1e-9) return { applicable: false };
    let world;
    try { world = layout(ramp, bank, round(delay)); }
    catch { return { applicable: true, survived: false, invalid: true }; }
    const row = summarize(world, h.shoot(world));
    shots++;
    return { applicable: true, survived: row.status === 'clear', invalid: false };
  };
  const classes = {
    angle: hit => [perturb(hit, { ramp: { yaw: hit.ramp.yaw - 5 } }), perturb(hit, { ramp: { yaw: hit.ramp.yaw + 5 } }), perturb(hit, { bank: { yaw: hit.bank.yaw - 5 } }), perturb(hit, { bank: { yaw: hit.bank.yaw + 5 } })],
    position: hit => [
      perturb(hit, { ramp: { x: hit.ramp.x - .5 } }), perturb(hit, { ramp: { x: hit.ramp.x + .5 } }),
      perturb(hit, { ramp: { z: hit.ramp.z - .5 } }), perturb(hit, { ramp: { z: hit.ramp.z + .5 } }),
      perturb(hit, { bank: { x: hit.bank.x - .5 } }), perturb(hit, { bank: { x: hit.bank.x + .5 } }),
      perturb(hit, { bank: { z: hit.bank.z - .5 } }), perturb(hit, { bank: { z: hit.bank.z + .5 } }),
    ],
    delay: hit => [perturb(hit, { delay: hit.delay - WORLDCRAFT_DELAY.step }), perturb(hit, { delay: hit.delay + WORLDCRAFT_DELAY.step })],
  };
  const fragility = {};
  for (const [name, expand] of Object.entries(classes)) {
    let applicable = 0, survived = 0, invalid = 0;
    const byFamily = {};
    for (const hit of hits) {
      for (const result of expand(hit)) {
        if (!result.applicable) continue;
        applicable++;
        if (result.survived) survived++;
        if (result.invalid) invalid++;
        const bucket = byFamily[hit.family] ??= { applicable: 0, survived: 0 };
        bucket.applicable++;
        if (result.survived) bucket.survived++;
      }
    }
    fragility[name] = { applicable, survived, invalid, fraction: applicable ? survived / applicable : null, byFamily };
  }

  const firePair = world => {
    const firstShot = h.shoot(world);
    const secondShot = h.shoot(world);
    return { first: summarize(world, firstShot), second: summarize(world, secondShot), firstPose: firstShot.pose, secondPose: secondShot.pose };
  };
  const fresh = harness();
  const determinism = [];
  const samples = [
    ['default', base],
    ['ramp-steer', hits.find(hit => hit.family === 'ramp-yours')],
    ['bank-redirect', hits.find(hit => hit.family === 'ramp-yours>bank-yours')],
  ];
  for (const [name, hit] of samples) {
    if (!hit) { determinism.push({ name, missing: true }); continue; }
    const world = hit === base ? base : layout(hit.ramp, hit.bank, hit.delay);
    const pair = firePair(world);
    const otherShot = fresh.shoot(world);
    const other = summarize(world, otherShot);
    const landing = Math.hypot(...pair.first.position.map((value, index) => value - pair.second.position[index]));
    determinism.push({
      name, ramp: pair.first.ramp, bank: pair.first.bank, delay: pair.first.delay, status: pair.first.status,
      outcome: 'status, reason, landing rounded to 0.1 mm, contact body/count/first/last rounded to 0.1 ms. The orc manifold point is reported separately.',
      repeatOutcomeIdentical: outcome(pair.first) === outcome(pair.second),
      freshRuntimeOutcomeIdentical: outcome(pair.first) === outcome(other),
      repeatLandingDeltaMeters: round(landing),
      repeatOrcPointDeltaMeters: round(pointDelta(pair.first, pair.second) ?? NaN),
      freshOrcPointDeltaMeters: round(pointDelta(pair.first, other) ?? NaN),
      pose: { first: pair.firstPose, second: pair.secondPose, fresh: otherShot.pose },
    });
  }
  fresh.dispose();

  let refireStatusMismatch = 0, refireSequenceMismatch = 0, refireTimeMismatch = 0, refirePointMismatch = 0, refireMaxPoint = 0, refireMaxLanding = 0;
  for (const hit of hits) {
    const world = layout(hit.ramp, hit.bank, hit.delay);
    const first = summarize(world, h.shoot(world));
    const second = summarize(world, h.shoot(world));
    if (first.status !== second.status || first.status !== 'clear') refireStatusMismatch++;
    if (first.contacts.map(contact => contact.body).join('>') !== second.contacts.map(contact => contact.body).join('>')) refireSequenceMismatch++;
    if (outcome(first) !== outcome(second)) refireTimeMismatch++;
    const delta = pointDelta(first, second) ?? 0;
    if (delta > 1e-6) refirePointMismatch++;
    if (delta > refireMaxPoint) refireMaxPoint = delta;
    const landing = Math.hypot(...first.position.map((value, index) => value - second.position[index]));
    if (landing > refireMaxLanding) refireMaxLanding = landing;
  }
  const hitRefire = { hits: hits.length, statusMismatch: refireStatusMismatch, sequenceMismatch: refireSequenceMismatch, outcomeMismatch: refireTimeMismatch, pointMismatch: refirePointMismatch, maxOrcPointDeltaMeters: round(refireMaxPoint), maxLandingDeltaMeters: round(refireMaxLanding) };

  const representatives = {};
  for (const hit of hits) representatives[hit.family] ??= { ramp: hit.ramp, bank: hit.bank, delay: hit.delay, contactTime: hit.contactTime, contacts: hit.contacts.map(contact => contact.body) };
  const result = {
    question: 'What kind of goal makes players want to revise a multi-piece layout?',
    hypothesis: 'A slowly moving opponent adds a timing layer. Risk: the result becomes luck.',
    rng: 'none',
    body: WORLDCRAFT_TARGET_BODY,
    motion: 'theta = phase + (speed/radius) * (launchDelay + flightSeconds); position = center + radius * (cos theta, sin theta); yaw = -theta. Phase is re-snapped at each fire from the authored delay. Physics step is 1/120 s.',
    target: base.rules.target,
    rail: base.rules.rail,
    launcher: base.launcher,
    defaultPieces: base.objects,
    delays,
    grids: { rampWithParkedBank: rampGrid, parkedBank, bankWithDefaultRamp: bankGrid, defaultRamp, cross: 'ramp yaw -10 and -5 at (0,42) with bank x -6 or 16, z 66 or 56, yaw -25 or 0' },
    counts: { candidateLayouts: layouts.length, validLayouts: valid, rejectedLayouts: rejected, delays: delays.length, shots, hits: hits.length, hitFraction: valid * delays.length ? hits.length / (valid * delays.length) : 0 },
    families: Object.fromEntries(families),
    representatives,
    defaultRows,
    defaultDelayZeroMisses: defaultRows.find(row => row.delay === 0)?.status === 'miss',
    fragility,
    determinism,
    hitRefire,
    seconds: Math.round((Date.now() - started) / 100) / 10,
    hits: hits.map(hit => ({ ramp: hit.ramp, bank: hit.bank, delay: hit.delay, family: hit.family, contactTime: hit.contactTime, closest: hit.closest, contacts: hit.contacts.map(contact => contact.body) })),
  };
  console.log(JSON.stringify({ ...result, hits: result.hits.length, defaultRows: result.defaultRows }, null, 2));
  if (outPath) await writeFile(outPath, JSON.stringify(result, null, 2) + '\n');
} finally { h.dispose(); }
