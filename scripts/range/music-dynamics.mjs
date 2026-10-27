// Production-path contact grid for Musical Workshop dynamics.
// Fires the live runtime. The mapping is acoustic. This script does not write Havok.
//
//   node scripts/range/music-dynamics.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { worldcraftIdentity } from '../../lib/worldcraft-model.js';
import { adaptRangePreset, createMusicalWorkshopPreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { dynamicsGain, impactGain, WORLDCRAFT_RESONANCE_FULL_SPEED, WORLDCRAFT_RESONANCE_NORMAL_FULL } from '../../lib/worldcraft-resonance.js';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { createRangeHarness, rangeGitSha } from './run.mjs';

Logger.LogLevels = 0;

const PARENT = '6ac83e3ff73c9cf72f47f0b5009aa9036557c5e4';
const CLOCKWORK = '3aede12c35154352b444ec65d41395011b9b8b1b';
const base = createMusicalWorkshopPreset();
const opening = {
  ramp: { id: 'ramp-yours', kind: 'ramp', x: 0, z: 42, yaw: 0, voice: { material: 'metal', degree: 1 } },
  bank: { id: 'bank-yours', kind: 'bank', x: 14, z: 28, yaw: 0, voice: { material: 'timber', degree: 0 } },
  plate: { id: 'plate-yours', kind: 'plate', x: 0, z: 68, yaw: 0, voice: { material: 'metal', degree: 2 } },
};
const parked = {
  ramp: { ...opening.ramp, x: -20, z: 78, yaw: 0 },
  bank: { ...opening.bank, x: 20, z: 78, yaw: 0 },
  plate: { ...opening.plate, x: 0, z: 86, yaw: 0 },
};
const setupBase = { railIndex: 1, originX: 0, yaw: 0, elevation: 12, charge: 0.5 };

function worldFrom(objects) {
  return adaptRangePreset(validateRangePreset({ ...base, objects })).world;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function spread(values) {
  const finite = values.filter(value => Number.isFinite(value));
  if (!finite.length) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return { n: finite.length, min, median: median(finite), max, spread: max - min };
}

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return value ?? null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function sameFlight(left, right) {
  if (left.samples.length !== right.samples.length) return false;
  for (let i = 0; i < left.samples.length; i += 1) {
    const a = left.samples[i];
    const b = right.samples[i];
    if (!Object.is(a.t, b.t) || !Object.is(a.x, b.x) || !Object.is(a.y, b.y) || !Object.is(a.z, b.z)) return false;
  }
  const ap = left.terminal.position;
  const bp = right.terminal.position;
  return ap.length === bp.length && ap.every((value, index) => Object.is(value, bp[index]));
}

function pieceImpacts(last) {
  return (last.resonance?.impacts ?? []).filter(impact => impact.role === 'bank' || impact.role === 'ramp' || impact.role === 'plate').map(impact => ({
    piece: impact.piece,
    role: impact.role,
    note: impact.note,
    material: impact.material,
    time: round(impact.time, 4),
    speed: round(impact.speed, 4),
    normalSpeed: round(impact.normalSpeed, 4),
    impulse: round(impact.impulse, 4),
    point: impact.point ? { x: round(impact.point.x, 4), y: round(impact.point.y, 4), z: round(impact.point.z, 4) } : null,
    callbacks: impact.callbacks,
    gainTotal: round(impactGain(impact.speed), 4),
    gainNormal: round(dynamicsGain('normal-speed', impact), 4),
    gainImpulse: round(dynamicsGain('impulse', impact), 4),
    gainLive: round(impact.gain, 4),
    dynamics: impact.dynamics,
  }));
}

function shootTraced(session, world, setup) {
  const runtime = session.runtime;
  if (runtime.mode !== 'build') runtime.setMode('build');
  if (worldcraftIdentity(runtime.world) !== worldcraftIdentity(world)) {
    const replaced = runtime.replaceWorld(world, { intent: 'load' });
    if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
  }
  runtime.setMode('play');
  if (!runtime.launch(setup)) throw new Error(runtime.error || 'launch failed');
  const flight = runtime.flight;
  const body = flight.aggregate.body;
  const physics = flight.mesh.getScene().getPhysicsEngine();
  const callbacks = [];
  let eventKeys = null;
  const observer = body.getCollisionObservable().add(event => {
    eventKeys ??= Object.keys(event).sort();
    const incoming = flight.acousticIncoming;
    const post = body.getLinearVelocity();
    const normal = event.normal;
    const nx = normal?.x ?? 0;
    const ny = normal?.y ?? 0;
    const nz = normal?.z ?? 0;
    const normalLength = Math.hypot(nx, ny, nz);
    const other = event.collider === body ? event.collidedAgainst : event.collider;
    const otherVelocity = other?.getLinearVelocity?.();
    const preSpeed = incoming ? Math.hypot(incoming.x, incoming.y, incoming.z) : null;
    const postSpeed = post ? Math.hypot(post.x, post.y, post.z) : null;
    const signedPre = incoming && normalLength > 0 ? (incoming.x * nx + incoming.y * ny + incoming.z * nz) / normalLength : null;
    const signedPost = post && normalLength > 0 ? (post.x * nx + post.y * ny + post.z * nz) / normalLength : null;
    callbacks.push({
      time: flight.elapsed,
      type: event.type ?? null,
      body: other?.transformNode?.name ?? '',
      impulse: Number.isFinite(event.impulse) ? event.impulse : null,
      distance: Number.isFinite(event.distance) ? event.distance : null,
      normalLength,
      preSpeed,
      postSpeed,
      normalPre: signedPre === null ? null : Math.abs(signedPre),
      normalPost: signedPost === null ? null : Math.abs(signedPost),
      signedPre,
      signedPost,
      otherSpeed: otherVelocity ? Math.hypot(otherVelocity.x, otherVelocity.y, otherVelocity.z) : null,
    });
  });
  for (let i = 0; i < 7300 && !flight.ended; i += 1) {
    runtime.beforeStep();
    physics._step(1 / 120);
    runtime.afterStep();
  }
  body.getCollisionObservable().remove(observer);
  const last = runtime.last;
  if (!last) throw new Error('traced shot did not resolve');
  runtime.setMode('build');
  return { last, callbacks, eventKeys: eventKeys ?? [] };
}

function groupCallbacks(callbacks) {
  const groups = [];
  for (const callback of callbacks) {
    if (!callback.body.startsWith('worldcraft-object-')) continue;
    const prior = groups.find(group => group.body === callback.body && callback.time - group.last <= 5 / 120);
    if (prior) {
      prior.rows.push(callback);
      prior.last = callback.time;
    } else groups.push({ body: callback.body, last: callback.time, rows: [callback] });
  }
  return groups.map(group => {
    const impulses = group.rows.map(row => row.impulse).filter(Number.isFinite);
    return {
      body: group.body,
      count: group.rows.length,
      types: group.rows.map(row => row.type),
      span: round(group.rows.at(-1).time - group.rows[0].time, 4),
      firstImpulse: round(impulses[0] ?? null, 4),
      maxImpulse: round(impulses.length ? Math.max(...impulses) : null, 4),
      firstNormalPre: round(group.rows[0].normalPre, 4),
      firstSignedPre: round(group.rows[0].signedPre, 4),
      firstSignedPost: round(group.rows[0].signedPost, 4),
      lastSignedPost: round(group.rows.at(-1).signedPost, 4),
      firstPostSpeed: round(group.rows[0].postSpeed, 4),
      normalLength: round(group.rows[0].normalLength, 8),
      otherSpeed: round(Math.max(...group.rows.map(row => row.otherSpeed ?? 0)), 6),
    };
  });
}

const shots = [];
function add(id, objects, setup, role) {
  shots.push({
    id,
    role,
    objects,
    setup: { ...setupBase, ...setup },
    trace: true,
    keepCallbacks: ['bank-y0-x0', 'bank-y85-x1', 'bank-square-c0.55', 'opening', 'ramp-y0', 'plate-y0-x0', 'graze-ramp'].includes(id),
  });
}
for (const yaw of [0, 20, 40, 55, 70, 80, 85]) {
  for (const x of [0, 0.5, 1, 2, 4]) add(`bank-y${yaw}-x${x}`, [parked.ramp, { ...opening.bank, x, z: 24, yaw }, parked.plate], {}, 'bank');
}
for (const charge of [0.25, 0.4, 0.55, 0.7, 0.85]) {
  add(`bank-square-c${charge}`, [parked.ramp, { ...opening.bank, x: 0, z: 24, yaw: 0 }, parked.plate], { charge }, 'bank');
}
for (const yaw of [0, 20, 45, 70]) add(`ramp-y${yaw}`, [{ ...opening.ramp, x: 0, z: 36, yaw }, parked.bank, parked.plate], {}, 'ramp');
for (const yaw of [0, 30, 60, 80]) {
  for (const x of [0, 1, 2]) add(`plate-y${yaw}-x${x}`, [parked.ramp, parked.bank, { ...opening.plate, x, z: 28, yaw }], {}, 'plate');
}
add('opening', [opening.ramp, opening.bank, opening.plate], { elevation: 18, charge: 0.55 }, 'opening');
add('graze-ramp', [
  { ...opening.ramp, x: 0, z: 36, yaw: 0, voice: { material: 'metal', degree: 1 } },
  { ...opening.bank, x: 1, z: 22, yaw: 85, voice: { material: 'timber', degree: 0 } },
  parked.plate,
], {}, 'pair');

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const session = createRangeHarness(havok, worldFrom(shots[0].objects), 'music2');
const rows = [];
const traces = {};
let eventKeys = [];
const normalLengths = [];
const otherSpeeds = [];
const types = new Set();
let continuedRicher = 0;
let grouped = 0;
try {
  if (!session.runtime.setDynamics('normal-speed')) throw new Error('normal-speed was rejected');
  for (const item of shots) {
    const world = worldFrom(item.objects);
    const live = session.shoot(world, item.setup);
    const impacts = pieceImpacts(live);
    let groups = null;
    if (item.trace) {
      const traced = shootTraced(session, world, item.setup);
      if (!sameFlight(live, traced.last)) throw new Error(`${item.id} trace diverged from the production step loop`);
      eventKeys = traced.eventKeys;
      groups = groupCallbacks(traced.callbacks);
      for (const callback of traced.callbacks) {
        if (callback.type) types.add(callback.type);
        if (callback.body.startsWith('worldcraft-object-')) {
          normalLengths.push(callback.normalLength);
          otherSpeeds.push(callback.otherSpeed ?? 0);
        }
      }
      if (item.keepCallbacks) traces[item.id] = {
        terminal: traced.last.terminal.position.map(value => round(value, 4)),
        callbacks: traced.callbacks.filter(callback => callback.body.startsWith('worldcraft-object-')).slice(0, 8).map(callback => ({
          time: round(callback.time, 4),
          type: callback.type,
          body: callback.body,
          impulse: round(callback.impulse, 4),
          normalLength: round(callback.normalLength, 8),
          preSpeed: round(callback.preSpeed, 4),
          postSpeed: round(callback.postSpeed, 4),
          normalPre: round(callback.normalPre, 4),
          normalPost: round(callback.normalPost, 4),
          signedPre: round(callback.signedPre, 4),
          signedPost: round(callback.signedPost, 4),
          otherSpeed: round(callback.otherSpeed, 6),
        })),
        groups,
      };
    }
    rows.push({
      id: item.id,
      role: item.role,
      setup: item.setup,
      objects: item.objects.map(object => ({ id: object.id, kind: object.kind, x: object.x, z: object.z, yaw: object.yaw, material: object.voice.material, degree: object.voice.degree })),
      terminal: live.terminal.position.map(value => round(value, 4)),
      impacts,
      groups,
    });
  }
  for (const row of rows) {
    for (const group of row.groups ?? []) {
      grouped += 1;
      if (Number.isFinite(group.maxImpulse) && Number.isFinite(group.firstImpulse) && group.maxImpulse > group.firstImpulse * 1.05) continuedRicher += 1;
    }
  }

  const ab = [];
  for (const spec of [
    { id: 'graze-bank', source: 'graze-ramp' },
    { id: 'square-bank', source: 'bank-square-c0.55' },
    { id: 'opening', source: 'opening' },
  ]) {
    const item = shots.find(shot => shot.id === spec.source);
    const world = worldFrom(item.objects);
    if (!session.runtime.setDynamics('total-speed')) throw new Error('total-speed was rejected');
    const total = session.shoot(world, item.setup);
    if (!session.runtime.setDynamics('normal-speed')) throw new Error('normal-speed was rejected');
    const normal = session.shoot(world, item.setup);
    const again = session.shoot(world, item.setup);
    if (!sameFlight(total, normal) || !sameFlight(normal, again)) throw new Error(`${spec.id} mappings did not stay bit-identical`);
    ab.push({
      id: spec.id,
      source: spec.source,
      setup: item.setup,
      objects: item.objects.map(object => ({ id: object.id, kind: object.kind, x: object.x, z: object.z, yaw: object.yaw, material: object.voice.material, degree: object.voice.degree, note: ['C4', 'D4', 'E4', 'G4', 'A4'][object.voice.degree] })),
      terminal: normal.terminal.position.map(value => round(value, 4)),
      identical: true,
      total: pieceImpacts(total),
      normal: pieceImpacts(normal),
    });
  }
  if (session.runtime.flight) throw new Error('a flight was left open');

  const byRole = {};
  for (const role of ['bank', 'ramp', 'plate']) {
    const hits = rows.filter(row => row.role === role).flatMap(row => row.impacts.filter(impact => impact.role === role && impact.speed > 1));
    byRole[role] = {
      n: hits.length,
      misses: rows.filter(row => row.role === role && !row.impacts.some(impact => impact.role === role)).length,
      postSpeed: spread(hits.map(hit => hit.speed)),
      faceSpeed: spread(hits.map(hit => hit.normalSpeed)),
      impulseOverMass: spread(hits.map(hit => (Number.isFinite(hit.impulse) ? hit.impulse / RAIL_RULES.projectileMass : null))),
      gainTotal: spread(hits.map(hit => hit.gainTotal)),
      gainNormal: spread(hits.map(hit => hit.gainNormal)),
      gainImpulse: spread(hits.map(hit => hit.gainImpulse)),
      gainMaxImpulse: spread(rows.filter(row => row.role === role).flatMap(row => (row.groups ?? []).filter(group => group.body.includes(role) && group.firstPostSpeed > 1).map(group => impactGain((group.maxImpulse ?? 0) / RAIL_RULES.projectileMass, WORLDCRAFT_RESONANCE_NORMAL_FULL)))),
    };
  }

  const square = rows.find(row => row.id === 'bank-y0-x0')?.impacts.find(impact => impact.role === 'bank');
  const graze = rows.find(row => row.id === 'bank-y85-x1')?.impacts.find(impact => impact.role === 'bank');
  const report = {
    branch: 'lab/wc-range-music2-20261025',
    parent: PARENT,
    clockwork: CLOCKWORK,
    gitSha: rangeGitSha(),
    seed: 20261025,
    seedAppliedToSolver: false,
    liveMapping: 'normal-speed',
    knee: { totalSpeed: WORLDCRAFT_RESONANCE_FULL_SPEED, normalSpeed: WORLDCRAFT_RESONANCE_NORMAL_FULL, impulse: WORLDCRAFT_RESONANCE_NORMAL_FULL },
    projectileMass: RAIL_RULES.projectileMass,
    contactCallback: {
      when: 'After HP_World_Step and the plugin sync. getLinearVelocity inside the callback is the post-step velocity.',
      observable: 'Body getCollisionObservable receives COLLISION_STARTED and COLLISION_CONTINUED. COLLISION_FINISHED is not delivered on this observable.',
      fields: eventKeys,
      typesSeen: [...types].sort(),
      pointAndNormal: 'Reused Vector3 internals. The runtime copies x, y, and z during the callback.',
      impulse: 'Scalar, shared by both bodies. The first STARTED impulse often understates a resolved bounce. The larger impulse arrives on a CONTINUED callback one frame later.',
      otherBodySpeed: 'Static pieces read 0.',
      preStep: 'The runtime copies getLinearVelocity into flight.acousticIncoming at the start of beforeStep, then the contact adapter dots that copy with the callback normal.',
      liveGain: 'Fixed from the opening callback. Later callbacks inside the 5/120 s hold only increment the callback count.',
      normalLength: spread(normalLengths),
      otherSpeedMax: otherSpeeds.length ? Math.max(...otherSpeeds) : null,
      groupedPieceImpacts: grouped,
      continuedImpulseRicher: continuedRicher,
    },
    exemplars: {
      squareCharge05: square,
      grazeCharge05: graze,
      similarTotalSpeed: square && graze ? Math.abs(square.speed - graze.speed) / Math.max(square.speed, graze.speed) : null,
    },
    byRole,
    ab,
    traces,
    rows: rows.map(row => ({ id: row.id, role: row.role, setup: row.setup, terminal: row.terminal, impacts: row.impacts })),
  };
  const dir = new URL('../../docs/experiments/range/appendix/music2/', import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('contacts.json', dir), `${JSON.stringify(report, null, 2)}\n`);
  const brief = {
    shots: rows.length,
    byRole,
    exemplars: report.exemplars,
    ab: ab.map(item => ({
      id: item.id,
      terminal: item.terminal,
      total: item.total.map(impact => ({ role: impact.role, note: impact.note, speed: impact.speed, normalSpeed: impact.normalSpeed, gain: impact.gainLive })),
      normal: item.normal.map(impact => ({ role: impact.role, note: impact.note, speed: impact.speed, normalSpeed: impact.normalSpeed, gain: impact.gainLive })),
    })),
    continuedRicher,
    grouped,
    eventKeys,
    types: [...types],
  };
  console.log(JSON.stringify(brief, null, 2));
} finally {
  session.dispose();
}
