// Back Pocket evidence campaign. The seed is recorded and not applied.
// Bulk shots step through createRangeHarness (the shared runner's loop).
// Spot-checks, tolerance endpoints, reproduction, and failures also go through runRange.
//
//   node scripts/range/back-pocket-measure.mjs --phase geometry
//   node scripts/range/back-pocket-measure.mjs --phase pilot
//   node scripts/range/back-pocket-measure.mjs --phase campaign
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { appendFileSync, createWriteStream, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import Havok from '@babylonjs/havok';
import { RAIL_RULES, chargeToSpeed, directionFromAim } from '../../lib/rail-golf-v02.js';
import { stationMuzzle } from '../../lib/stations.js';
import { WORLDCRAFT_CATALOG } from '../../lib/worldcraft-model.js';
import {
  adaptRangePreset, createBackPocketPreset, exportRangePreset, parseRangePreset,
  rangeOpeningSetup, sha256Hex,
} from '../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha, rangeProvenance, runRange } from './run.mjs';

const SEED = 20261024;
const PIN = { x: -8, z: 54, r: 4 };
const SCREEN = { minX: -24, maxX: 12, minY: 0, maxY: 7, minZ: 45.5, maxZ: 46.5 };
const RADIUS = RAIL_RULES.projectileRadius;
const OUT = 'docs/experiments/range/runs/back-pocket';
const APPENDIX = 'docs/experiments/range/appendix/back-pocket';
const PAD = 0.75;

const arg = name => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
};
const phase = arg('--phase') ?? 'campaign';

function series(min, max, step, digits) {
  const n = Math.round((max - min) / step);
  const scale = 10 ** digits;
  const values = [];
  for (let i = 0; i <= n; i++) values.push(Math.round((min + i * step) * scale) / scale);
  return values;
}
function launchOf(aim) {
  const setup = { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge };
  const station = { id: 'worldcraft', label: 'Worldcraft apron', x: 0, z: 0, yaw: 0 };
  const direction = directionFromAim(aim.yaw, aim.elevation);
  return { setup, station, muzzle: stationMuzzle(setup, station), direction, speed: chargeToSpeed(aim.charge) };
}
function at(launch, t) {
  const { muzzle, direction, speed } = launch;
  return {
    x: muzzle.x + direction.x * speed * t,
    y: muzzle.y + direction.y * speed * t - 0.5 * RAIL_RULES.gravity * t * t,
    z: muzzle.z + direction.z * speed * t,
  };
}
function landingTime(launch) {
  const vy = launch.direction.y * launch.speed;
  const c = RADIUS - launch.muzzle.y;
  const disc = vy * vy - 2 * RAIL_RULES.gravity * c;
  if (disc < 0) return null;
  const t = (vy + Math.sqrt(disc)) / RAIL_RULES.gravity;
  return t > 0 ? t : null;
}
function aabbDist2(p, box) {
  const dx = Math.max(box.minX - p.x, 0, p.x - box.maxX);
  const dy = Math.max(box.minY - p.y, 0, p.y - box.maxY);
  const dz = Math.max(box.minZ - p.z, 0, p.z - box.maxZ);
  return dx * dx + dy * dy + dz * dz;
}
function hitsScreen(launch, tLand) {
  const vz = launch.direction.z * launch.speed;
  if (!(vz > 0.05) || tLand == null) return false;
  const z0 = SCREEN.minZ - RADIUS;
  const z1 = SCREEN.maxZ + RADIUS;
  const t0 = (z0 - launch.muzzle.z) / vz;
  const t1 = (z1 - launch.muzzle.z) / vz;
  let t = Math.max(0, Math.min(t0, t1));
  const exit = Math.min(tLand, Math.max(t0, t1));
  if (exit < t) return false;
  const limit = RADIUS * RADIUS;
  while (t <= exit + 1e-9) {
    if (aabbDist2(at(launch, t), SCREEN) <= limit) return true;
    const vy = launch.direction.y * launch.speed - RAIL_RULES.gravity * t;
    const v = Math.hypot(launch.direction.x * launch.speed, vy, vz);
    t += 0.08 / Math.max(v, 1);
  }
  return false;
}
function pocketDistance(p) {
  return Math.hypot(p.x - PIN.x, p.z - PIN.z);
}
function traceOf(aim) {
  const launch = launchOf(aim);
  const tLand = landingTime(launch);
  if (tLand == null) return null;
  const landing = at(launch, tLand);
  const xs = [];
  const ys = [];
  const zs = [];
  for (let t = 0; t <= tLand; ) {
    const p = at(launch, t);
    xs.push(p.x); ys.push(p.y); zs.push(p.z);
    const vy = launch.direction.y * launch.speed - RAIL_RULES.gravity * t;
    const v = Math.hypot(launch.direction.x * launch.speed, vy, launch.direction.z * launch.speed);
    t += 0.25 / Math.max(v, 1);
  }
  xs.push(landing.x); ys.push(landing.y); zs.push(landing.z);
  return { launch, tLand, landing, hit: hitsScreen(launch, tLand), xs: Float64Array.from(xs), ys: Float64Array.from(ys), zs: Float64Array.from(zs), n: xs.length };
}
function meetsBank(trace, pose) {
  const yaw = pose.yaw * Math.PI / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const limit = PAD * PAD;
  for (let i = 0; i < trace.n; i++) {
    const dx = trace.xs[i] - pose.x;
    const dz = trace.zs[i] - pose.z;
    if (Math.abs(dx) > 14 || Math.abs(dz) > 14) continue;
    const dy = trace.ys[i] - WORLDCRAFT_CATALOG.bank.centerY;
    const lx = cos * dx - sin * dz;
    const lz = sin * dx + cos * dz;
    const qx = Math.max(Math.abs(lx) - WORLDCRAFT_CATALOG.bank.width / 2, 0);
    const qy = Math.max(Math.abs(dy) - WORLDCRAFT_CATALOG.bank.height / 2, 0);
    const qz = Math.max(Math.abs(lz) - WORLDCRAFT_CATALOG.bank.depth / 2, 0);
    if (qx * qx + qy * qy + qz * qz <= limit) return true;
  }
  return false;
}
function wallOnlyPreset() {
  const base = createBackPocketPreset();
  return {
    ...base,
    objects: base.objects.filter(object => object.id !== 'bank-yours'),
    rules: { ...base.rules, allowance: {} },
  };
}
function posedPreset(pose, aim = { yaw: 0, elevation: 18, charge: 0.55 }) {
  const base = createBackPocketPreset();
  return {
    ...base,
    objects: base.objects.map(object => object.id === 'bank-yours' ? { ...object, x: pose.x, z: pose.z, yaw: pose.yaw } : object),
    rules: { ...base.rules, launcher: { ...base.rules.launcher, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge } },
  };
}
function dirty() {
  try { return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0; }
  catch { return null; }
}
function jsonl(path) {
  const stream = createWriteStream(path);
  return {
    write(value) { stream.write(`${JSON.stringify(value)}\n`); },
    close() { return new Promise((resolve, reject) => { stream.on('error', reject); stream.end(resolve); }); },
  };
}
function shotLine(last, setup, extra = {}) {
  const goal = last.goalResult ?? null;
  return {
    type: 'shot',
    ...extra,
    setup: { railIndex: setup.railIndex, originX: setup.originX, yaw: setup.yaw, elevation: setup.elevation, charge: setup.charge },
    reason: last.terminal?.reason ?? last.reason ?? null,
    elapsed: last.terminal?.elapsed ?? last.elapsed ?? null,
    position: last.terminal?.position ?? last.position ?? null,
    distance: goal?.distance ?? null,
    status: goal?.status ?? null,
    scored: goal?.scored === true,
    contacts: (last.contacts ?? []).map(contact => ({ body: contact.body, first: contact.first, count: contact.count })),
  };
}
function bankContact(line) {
  return (line.contacts ?? []).find(contact => contact.body === 'worldcraft-object-bank-yours') ?? null;
}
function screenContact(line) {
  return (line.contacts ?? []).some(contact => contact.body.startsWith('worldcraft-object-screen-'));
}

const BACK_X = series(-24, 12, 4, 1);
const BACK_Z = series(56, 80, 2, 1);
const BACK_YAW = series(-45, 45, 15, 1);
const SIDE_X = [16, 20, 24];
const SIDE_Z = series(28, 52, 4, 1);
const SIDE_YAW = [45, 60, 75, 90];
const AIM_YAW = series(-60, 60, 6, 1);
const AIM_ELEV = series(8, 26, 2, 1);
const AIM_CHARGE = series(0.3, 0.9, 0.05, 2);
const DIRECT_YAW = series(-60, 60, 2, 1);
const DIRECT_ELEV = series(8, 26, 1, 1);
const DIRECT_CHARGE = series(0.3, 0.9, 0.05, 2);

function aimsOf(yaws, elevs, charges) {
  const aims = [];
  for (let iy = 0; iy < yaws.length; iy++) {
    for (let ie = 0; ie < elevs.length; ie++) {
      for (let ic = 0; ic < charges.length; ic++) aims.push({ yaw: yaws[iy], elevation: elevs[ie], charge: charges[ic], iy, ie, ic });
    }
  }
  return aims;
}
function posesOf() {
  const poses = [];
  const push = (region, xs, zs, yaws) => {
    for (let ix = 0; ix < xs.length; ix++) {
      for (let iz = 0; iz < zs.length; iz++) {
        for (let iw = 0; iw < yaws.length; iw++) poses.push({ region, x: xs[ix], z: zs[iz], yaw: yaws[iw], ix, iz, iw });
      }
    }
  };
  push('back', BACK_X, BACK_Z, BACK_YAW);
  push('side', SIDE_X, SIDE_Z, SIDE_YAW);
  return poses;
}

function geometry() {
  const yaws = series(-60, 60, 0.5, 1);
  const elevs = series(8, 26, 0.25, 2);
  const charges = series(0.3, 0.9, 0.01, 2);
  let total = 0;
  let occluded = 0;
  let free = 0;
  let pocketIgnoringWall = 0;
  let pocketIgnoringWallOccluded = 0;
  let freeInPocket = 0;
  let minFree = Infinity;
  let minFreeAim = null;
  let minClearLandingZ = Infinity;
  let minClearLanding = null;
  let maxApex = 0;
  let maxApexAim = null;
  const freeBins = {};
  for (const yaw of yaws) {
    for (const elevation of elevs) {
      for (const charge of charges) {
        total += 1;
        const launch = launchOf({ yaw, elevation, charge });
        const tLand = landingTime(launch);
        if (tLand == null) continue;
        let apex = launch.muzzle.y;
        const vy = launch.direction.y * launch.speed;
        if (vy > 0) {
          const tApex = vy / RAIL_RULES.gravity;
          apex = at(launch, Math.min(tApex, tLand)).y;
        }
        if (apex > maxApex) { maxApex = apex; maxApexAim = { yaw, elevation, charge, apex }; }
        const landing = at(launch, tLand);
        const hit = hitsScreen(launch, tLand);
        const distance = pocketDistance(landing);
        if (distance <= PIN.r) {
          pocketIgnoringWall += 1;
          if (hit) pocketIgnoringWallOccluded += 1;
        }
        if (hit) { occluded += 1; continue; }
        free += 1;
        if (distance <= PIN.r) freeInPocket += 1;
        if (distance < minFree) { minFree = distance; minFreeAim = { yaw, elevation, charge, landing, distance }; }
        const bin = Math.min(40, Math.floor(distance));
        freeBins[bin] = (freeBins[bin] ?? 0) + 1;
        const zWall = 46.5;
        const vz = launch.direction.z * launch.speed;
        if (vz > 0.05) {
          const tWall = (zWall - launch.muzzle.z) / vz;
          if (tWall > 0 && tWall < tLand) {
            const cross = at(launch, tWall);
            if (cross.x >= SCREEN.minX && cross.x <= SCREEN.maxX && cross.y > SCREEN.maxY + RADIUS && landing.x >= PIN.x - PIN.r && landing.x <= PIN.x + PIN.r && landing.z < minClearLandingZ) {
              minClearLandingZ = landing.z;
              minClearLanding = { yaw, elevation, charge, landing, crossY: cross.y };
            }
          }
        }
      }
    }
  }
  return {
    model: 'unobstructed point mass, centre reaches y = radius, sphere versus the screen AABB',
    gravity: RAIL_RULES.gravity,
    radius: RADIUS,
    speed: '6 + 37 * charge',
    screen: SCREEN,
    pocket: PIN,
    lattice: { yawStep: 0.5, elevationStep: 0.25, chargeStep: 0.01, yaw: [-60, 60], elevation: [8, 26], charge: [0.3, 0.9] },
    total,
    occluded,
    free,
    pocketIgnoringWall,
    pocketIgnoringWallOccluded,
    freeInPocket,
    minFreeDistance: Number.isFinite(minFree) ? minFree : null,
    minFreeAim,
    maxApex,
    maxApexAim,
    minLandingZClearingScreenOnPocketX: Number.isFinite(minClearLandingZ) ? minClearLandingZ : null,
    minClearLanding,
    freeDistanceBins: freeBins,
  };
}

async function loadHavok() {
  return Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
}

function stamp(presetHash, label, campaign, extra = {}) {
  return { ...rangeProvenance({ presetId: 'back-pocket', presetHash, seed: SEED, label, campaign }), stepLoop: 'createRangeHarness', dirty: dirty(), ...extra };
}

async function fireAll(session, world, setups, onShot) {
  let index = 0;
  const started = performance.now();
  for (const setup of setups) {
    let line;
    try { line = shotLine(session.shoot(world, setup), setup, { index }); }
    catch (error) { line = { type: 'rejected', index, setup, error: error.message }; }
    onShot(line);
    index += 1;
    if (index % 500 === 0) {
      const elapsed = (performance.now() - started) / 1000;
      console.error(`  ${index}/${setups.length} in ${elapsed.toFixed(1)}s (${(index / elapsed).toFixed(1)} shots/s)`);
    }
  }
}

function summarizeDirect(lines) {
  let scored = 0;
  let ground = 0;
  let rejected = 0;
  let min = Infinity;
  let minLine = null;
  let withPiece = 0;
  const nearest = [];
  for (const line of lines) {
    if (line.type === 'rejected') { rejected += 1; continue; }
    if (line.scored) scored += 1;
    if (line.reason === 'first-ground-contact') ground += 1;
    if (line.contacts?.some(contact => contact.body.startsWith('worldcraft-object-'))) withPiece += 1;
    if (typeof line.distance === 'number' && line.distance < min) { min = line.distance; minLine = line; }
    if (typeof line.distance === 'number') {
      nearest.push(line);
      nearest.sort((a, b) => a.distance - b.distance);
      if (nearest.length > 25) nearest.pop();
    }
  }
  return {
    shots: lines.length - rejected,
    rejected,
    scored,
    ground,
    withPieceContact: withPiece,
    minDistance: Number.isFinite(min) ? min : null,
    minLine,
    nearest: nearest.map(line => ({ distance: line.distance, setup: line.setup, position: line.position, contacts: line.contacts, reason: line.reason })),
  };
}

function lipschitz(records) {
  const byKey = new Map(records.filter(line => line.reason === 'first-ground-contact' && line.position).map(line => [`${line.setup.yaw}|${line.setup.elevation}|${line.setup.charge}`, line]));
  let max = 0;
  let pair = null;
  let compared = 0;
  for (const line of byKey.values()) {
    const neighbors = [
      [seriesRound(line.setup.yaw + 2, 1), line.setup.elevation, line.setup.charge],
      [line.setup.yaw, seriesRound(line.setup.elevation + 1, 1), line.setup.charge],
      [line.setup.yaw, line.setup.elevation, seriesRound(line.setup.charge + 0.05, 2)],
    ];
    for (const [yaw, elevation, charge] of neighbors) {
      const other = byKey.get(`${yaw}|${elevation}|${charge}`);
      if (!other) continue;
      compared += 1;
      const jump = Math.hypot(line.position[0] - other.position[0], line.position[2] - other.position[2]);
      if (jump > max) { max = jump; pair = { a: line.setup, b: other.setup, jump, da: line.distance, db: other.distance }; }
    }
  }
  return { compared, maxJump: max, pair };
}
function seriesRound(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function cluster(clears) {
  const key = shot => `${shot.region}|${shot.ix}|${shot.iz}|${shot.iw}|${shot.iy}|${shot.ie}|${shot.ic}`;
  const by = new Map(clears.map(shot => [key(shot), shot]));
  const seen = new Set();
  const components = [];
  for (const shot of clears) {
    const start = key(shot);
    if (seen.has(start)) continue;
    const pile = [];
    const queue = [shot];
    seen.add(start);
    while (queue.length) {
      const current = queue.pop();
      pile.push(current);
      for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) for (const dw of [-1, 0, 1]) {
        for (const dy of [-1, 0, 1]) for (const de of [-1, 0, 1]) for (const dc of [-1, 0, 1]) {
          if (dx === 0 && dz === 0 && dw === 0 && dy === 0 && de === 0 && dc === 0) continue;
          const next = by.get(`${current.region}|${current.ix + dx}|${current.iz + dz}|${current.iw + dw}|${current.iy + dy}|${current.ie + de}|${current.ic + dc}`);
          if (!next) continue;
          const id = key(next);
          if (seen.has(id)) continue;
          seen.add(id);
          queue.push(next);
        }
      }
    }
    components.push(pile);
  }
  components.sort((a, b) => b.length - a.length || median(a.map(shot => shot.pose.z)) - median(b.map(shot => shot.pose.z)));
  return components;
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function span(values) {
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}
function describe(component, index) {
  const best = component.reduce((pick, shot) => shot.distance < pick.distance ? shot : pick);
  return {
    id: `family-${index + 1}`,
    region: best.region,
    clears: component.length,
    bankX: span(component.map(shot => shot.pose.x)),
    bankZ: span(component.map(shot => shot.pose.z)),
    bankYaw: span(component.map(shot => shot.pose.yaw)),
    aimYaw: span(component.map(shot => shot.setup.yaw)),
    elevation: span(component.map(shot => shot.setup.elevation)),
    charge: span(component.map(shot => shot.setup.charge)),
    distance: span(component.map(shot => shot.distance)),
    medianBankZ: median(component.map(shot => shot.pose.z)),
    medianBankYaw: median(component.map(shot => shot.pose.yaw)),
    medianCharge: median(component.map(shot => shot.setup.charge)),
    medianContactFirst: median(component.map(shot => bankContact(shot)?.first).filter(value => typeof value === 'number')),
    screenThenBank: component.filter(shot => screenContact(shot) && bankContact(shot)).length,
    bankWithoutScreen: component.filter(shot => bankContact(shot) && !screenContact(shot)).length,
    representative: { pose: best.pose, setup: best.setup, distance: best.distance, position: best.position, elapsed: best.elapsed, reason: best.reason, scored: best.scored, contacts: best.contacts },
  };
}

function intervals(samples) {
  const runs = [];
  let run = null;
  for (const sample of samples) {
    if (sample.scored) {
      if (!run) run = { min: sample.value, max: sample.value, count: 1, bestDistance: sample.distance };
      else { run.max = sample.value; run.count += 1; run.bestDistance = Math.min(run.bestDistance, sample.distance); }
    } else if (run) { runs.push(run); run = null; }
  }
  if (run) runs.push(run);
  return runs;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(APPENDIX, { recursive: true });
  const gitSha = rangeGitSha();
  console.error(`phase ${phase} HEAD ${gitSha}`);

  if (phase === 'geometry' || phase === 'campaign') {
    const started = performance.now();
    const result = geometry();
    result.seconds = (performance.now() - started) / 1000;
    await writeFile(`${OUT}/geometry.json`, `${JSON.stringify(result, null, 2)}\n`);
    console.error(`geometry free-in-pocket ${result.freeInPocket} pocket-arcs ${result.pocketIgnoringWall} occluded-among-them ${result.pocketIgnoringWallOccluded} min-free ${result.minFreeDistance} shadow-z ${result.minLandingZClearingScreenOnPocketX} in ${result.seconds.toFixed(1)}s`);
    if (phase === 'geometry') return;
  }

  let havok = await loadHavok();
  const opening = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };
  const pilots = [
    { name: 'near', pose: { region: 'back', x: -8, z: 62, yaw: 0 }, aim: { yaw: -6, elevation: 24, charge: 0.65 } },
    { name: 'far', pose: { region: 'back', x: -4, z: 70, yaw: 15 }, aim: { yaw: 0, elevation: 24, charge: 0.75 } },
    { name: 'far-yaw-20', pose: { region: 'back', x: -4, z: 70, yaw: 20 }, aim: { yaw: 0, elevation: 24, charge: 0.75 } },
  ];
  for (const pilot of pilots) {
    if (pilot.name === 'far-yaw-20') continue;
    for (const [label, value, list] of [['x', pilot.pose.x, BACK_X], ['z', pilot.pose.z, BACK_Z], ['yaw', pilot.pose.yaw, BACK_YAW]]) {
      if (!list.includes(value)) throw new Error(`pilot ${pilot.name} ${label} ${value} is off the uniform lattice`);
    }
    if (!AIM_YAW.includes(pilot.aim.yaw) || !AIM_ELEV.includes(pilot.aim.elevation) || !AIM_CHARGE.includes(pilot.aim.charge)) throw new Error(`pilot ${pilot.name} aim is off the uniform lattice`);
  }

  const defaultPreset = createBackPocketPreset();
  const defaultHash = await sha256Hex(exportRangePreset(defaultPreset));
  const bare = wallOnlyPreset();
  const bareAdapted = adaptRangePreset(bare);
  const bareHash = await sha256Hex(exportRangePreset(bareAdapted.preset));
  const defaultWorld = adaptRangePreset(defaultPreset).world;

  let session = createRangeHarness(havok, bareAdapted.world, gitSha);
  const renew = async world => {
    session?.dispose();
    session = null;
    havok = null;
    if (global.gc) global.gc();
    havok = await loadHavok();
    session = createRangeHarness(havok, world, gitSha);
  };
  try {
    if (phase === 'pilot' || phase === 'campaign') {
      const pilotLines = [];
      const bareOpen = shotLine(session.shoot(bareAdapted.world, opening), opening, { name: 'wall-only-opening' });
      pilotLines.push(bareOpen);
      await renew(defaultWorld);
      const parked = shotLine(session.shoot(defaultWorld, opening), opening, { name: 'default-opening', pose: { x: -22, z: 20, yaw: 0 } });
      pilotLines.push(parked);
      for (const pilot of pilots) {
        const preset = posedPreset(pilot.pose, pilot.aim);
        const adapted = adaptRangePreset(preset);
        await renew(adapted.world);
        const line = shotLine(session.shoot(adapted.world, { ...opening, ...pilot.aim }), { ...opening, ...pilot.aim }, { name: pilot.name, pose: pilot.pose });
        pilotLines.push(line);
        console.error(`pilot ${pilot.name} scored ${line.scored} d ${line.distance} reason ${line.reason} contacts ${line.contacts.map(contact => contact.body).join(',')}`);
      }
      await writeFile(`${OUT}/pilot.json`, `${JSON.stringify({ pilots: pilotLines }, null, 2)}\n`);
      const near = pilotLines.find(line => line.name === 'near');
      const far = pilotLines.find(line => line.name === 'far');
      if (!near?.scored || !far?.scored) {
        console.error('pilot solutions did not clear; campaign stopped before the sweeps');
        return;
      }
      if (phase === 'pilot') return;
    }

    let directSummary;
    let defaultSummary;
    let directLip;
    let refineSummary;
    if (phase === 'grid') {
      directSummary = JSON.parse(await readFile(`${OUT}/direct-summary.json`, 'utf8'));
      defaultSummary = JSON.parse(await readFile(`${OUT}/default-summary.json`, 'utf8'));
      directLip = directSummary.lipschitz;
      refineSummary = directSummary.refine;
      console.error(`loaded direct min ${directSummary.minDistance} default min ${defaultSummary.minDistance}`);
    } else {
    console.error('direct sweep');
    await renew(bareAdapted.world);
    const directAims = aimsOf(DIRECT_YAW, DIRECT_ELEV, DIRECT_CHARGE).map(aim => ({ railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge }));
    const directFile = jsonl(`${OUT}/direct.jsonl`);
    directFile.write(stamp(bareHash, 'wall-only direct fire', 'back-pocket-direct', {
      lattice: { yawStep: 2, elevationStep: 1, chargeStep: 0.05 },
      count: directAims.length,
    }));
    const directLines = [];
    await fireAll(session, bareAdapted.world, directAims, line => { directLines.push(line); directFile.write(line); });
    directSummary = summarizeDirect(directLines);
    directLip = lipschitz(directLines);
    const refineParents = directSummary.nearest.filter(line => line.distance <= Math.max(12, (directSummary.minDistance ?? 99) + 2));
    const refineLines = [];
    for (const parent of refineParents) {
      const yaws = series(Math.max(-60, parent.setup.yaw - 1), Math.min(60, parent.setup.yaw + 1), 0.5, 1);
      const elevs = series(Math.max(8, parent.setup.elevation - 0.5), Math.min(26, parent.setup.elevation + 0.5), 0.5, 1);
      const charges = series(Math.max(0.3, seriesRound(parent.setup.charge - 0.02, 2)), Math.min(0.9, seriesRound(parent.setup.charge + 0.02, 2)), 0.01, 2);
      for (const yaw of yaws) for (const elevation of elevs) for (const charge of charges) {
        if (yaw === parent.setup.yaw && elevation === parent.setup.elevation && charge === parent.setup.charge) continue;
        const setup = { railIndex: 1, originX: 0, yaw, elevation, charge };
        let line;
        try { line = shotLine(session.shoot(bareAdapted.world, setup), setup, { refineOf: parent.setup }); }
        catch (error) { line = { type: 'rejected', setup, error: error.message }; }
        refineLines.push(line);
        directFile.write(line);
      }
    }
    refineSummary = summarizeDirect(refineLines);
    directSummary.lipschitz = directLip;
    directSummary.refineParents = refineParents.length;
    directSummary.refine = { shots: refineSummary.shots, scored: refineSummary.scored, minDistance: refineSummary.minDistance, minLine: refineSummary.minLine };
    await directFile.close();
    await writeFile(`${OUT}/direct-summary.json`, `${JSON.stringify(directSummary, null, 2)}\n`);
    console.error(`direct min ${directSummary.minDistance} scored ${directSummary.scored} refine min ${refineSummary.minDistance} scored ${refineSummary.scored} lipschitz ${directLip.maxJump}`);

    console.error('default sweep');
    await renew(defaultWorld);
    const defaultFile = jsonl(`${OUT}/default.jsonl`);
    defaultFile.write(stamp(defaultHash, 'shipped arrangement, bank parked', 'back-pocket-default', {
      lattice: { yawStep: 2, elevationStep: 1, chargeStep: 0.05 },
      count: directAims.length,
      park: { x: -22, z: 20, yaw: 0 },
    }));
    const defaultLines = [];
    await fireAll(session, defaultWorld, directAims, line => { defaultLines.push(line); defaultFile.write(line); });
    defaultSummary = summarizeDirect(defaultLines);
    defaultSummary.bankContacts = defaultLines.filter(line => line.type === 'shot' && bankContact(line)).length;
    await defaultFile.close();
    await writeFile(`${OUT}/default-summary.json`, `${JSON.stringify(defaultSummary, null, 2)}\n`);
    console.error(`default min ${defaultSummary.minDistance} scored ${defaultSummary.scored} bank contacts ${defaultSummary.bankContacts}`);
    }

    console.error('uniform grid filter');
    const gridAims = aimsOf(AIM_YAW, AIM_ELEV, AIM_CHARGE);
    const traces = gridAims.map(aim => ({ aim, trace: traceOf(aim) }));
    const poseList = posesOf();
    const jobs = [];
    const illegal = [];
    let skipped = 0;
    for (const pose of poseList) {
      let adapted;
      try { adapted = adaptRangePreset(posedPreset(pose)); }
      catch (error) { illegal.push({ pose, error: error.message }); continue; }
      const meeting = [];
      for (const item of traces) {
        if (!item.trace) { skipped += 1; continue; }
        if (meetsBank(item.trace, pose)) meeting.push(item.aim);
        else skipped += 1;
      }
      if (meeting.length) jobs.push({ pose, world: adapted.world, aims: meeting });
    }
    for (const item of traces) item.trace = null;
    const simulated = jobs.reduce((sum, job) => sum + job.aims.length, 0);
    console.error(`grid poses ${poseList.length} illegal ${illegal.length} jobs ${jobs.length} simulated ${simulated} skipped ${skipped}`);
    for (const pilot of pilots.filter(item => item.name !== 'far-yaw-20')) {
      const job = jobs.find(item => item.pose.x === pilot.pose.x && item.pose.z === pilot.pose.z && item.pose.yaw === pilot.pose.yaw);
      const kept = job?.aims.some(aim => aim.yaw === pilot.aim.yaw && aim.elevation === pilot.aim.elevation && aim.charge === pilot.aim.charge);
      if (!kept) throw new Error(`filter dropped pilot ${pilot.name}`);
    }
    const gridPath = `${OUT}/grid.jsonl`;
    writeFileSync(gridPath, `${JSON.stringify(stamp(defaultHash, 'uniform rebound grid', 'back-pocket-grid', {
      filter: `unobstructed ballistic samples every 0.25 m; keep a pair when the centre comes within ${PAD} m of the bank box`,
      lattice: {
        back: { x: BACK_X, z: BACK_Z, yaw: BACK_YAW },
        side: { x: SIDE_X, z: SIDE_Z, yaw: SIDE_YAW },
        aim: { yaw: AIM_YAW, elevation: AIM_ELEV, charge: AIM_CHARGE },
      },
      poses: poseList.length,
      illegal,
      pairsConsidered: poseList.length * gridAims.length,
      simulated,
      skipped,
    }))}\n`);
    const clears = [];
    let gridShots = 0;
    const gridStarted = performance.now();
    for (const job of jobs) {
      if (!session || session.runtime.world !== job.world) {
        if (session?.runtime.mode === 'play') session.runtime.setMode('build');
        if (session && session.runtime.world !== job.world) {
          const replaced = session.runtime.replaceWorld(job.world, { intent: 'load' });
          if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
        }
      }
      for (const aim of job.aims) {
        if (gridShots > 0 && gridShots % 800 === 0) await renew(job.world);
        const setup = { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge };
        let line;
        try { line = shotLine(session.shoot(job.world, setup), setup, { pose: job.pose, region: job.pose.region, ix: job.pose.ix, iz: job.pose.iz, iw: job.pose.iw, iy: aim.iy, ie: aim.ie, ic: aim.ic }); }
        catch (error) {
          if (session.runtime.mode !== 'build') session.runtime.setMode('build');
          line = { type: 'rejected', pose: job.pose, setup, error: error.message };
        }
        appendFileSync(gridPath, `${JSON.stringify(line)}\n`);
        gridShots += 1;
        if (line.scored) clears.push(line);
        if (gridShots % 2000 === 0) {
          const elapsed = (performance.now() - gridStarted) / 1000;
          const heap = (process.memoryUsage().heapUsed / 1048576).toFixed(0);
          console.error(`  grid ${gridShots}/${simulated} clears ${clears.length} in ${elapsed.toFixed(1)}s heap ${heap} MB`);
        }
      }
    }
    const components = cluster(clears);
    const families = components.filter(component => component.length >= 2).map(describe);
    const singletons = components.filter(component => component.length < 2).map((component, index) => describe(component, families.length + index));
    const gridSummary = {
      simulated,
      skipped,
      illegal: illegal.length,
      clears: clears.length,
      components: components.length,
      families,
      singletons: singletons.slice(0, 12),
      singletonCount: singletons.length,
    };
    await writeFile(`${OUT}/grid-summary.json`, `${JSON.stringify(gridSummary, null, 2)}\n`);
    console.error(`grid clears ${clears.length} components ${components.length} families ${families.length}`);
    if (families.length < 2) {
      console.error('uniform grid did not yield two components of at least two clears; tolerance still runs on what exists');
    }

    console.error('tolerance');
    const subjects = (families.length ? families : components.slice(0, 2).map(describe)).slice(0, 2);
    const toleranceFile = jsonl(`${OUT}/tolerance.jsonl`);
    toleranceFile.write(stamp(defaultHash, 'one-axis local tolerance, separate from the discovery grid', 'back-pocket-tolerance'));
    const tolerance = [];
    for (const family of subjects) {
      const basePose = family.representative.pose;
      const baseAim = family.representative.setup;
      const axes = [
        { axis: 'aimYaw', values: DIRECT_YAW.map(value => ({ value, pose: basePose, aim: { ...baseAim, yaw: value } })) },
        { axis: 'elevation', values: series(8, 26, 0.5, 1).map(value => ({ value, pose: basePose, aim: { ...baseAim, elevation: value } })) },
        { axis: 'charge', values: series(0.3, 0.9, 0.01, 2).map(value => ({ value, pose: basePose, aim: { ...baseAim, charge: value } })) },
        { axis: 'bankX', values: series(-30, 30, 0.5, 1).map(value => ({ value, pose: { ...basePose, x: value }, aim: baseAim })) },
        { axis: 'bankZ', values: series(10, 96, 0.5, 1).map(value => ({ value, pose: { ...basePose, z: value }, aim: baseAim })) },
        { axis: 'bankYaw', values: series(-180, 175, 5, 1).map(value => ({ value, pose: { ...basePose, yaw: value }, aim: baseAim })) },
      ];
      const familyRecord = { id: family.id, representative: family.representative, axes: {} };
      for (const axis of axes) {
        const samples = [];
        for (const sample of axis.values) {
          let adapted;
          try { adapted = adaptRangePreset(posedPreset(sample.pose, sample.aim)); }
          catch (error) { samples.push({ value: sample.value, scored: false, invalid: error.message }); continue; }
          if (session.runtime.world !== adapted.world) {
            if (session.runtime.mode !== 'build') session.runtime.setMode('build');
            const replaced = session.runtime.replaceWorld(adapted.world, { intent: 'load' });
            if (!replaced.ok) { samples.push({ value: sample.value, scored: false, invalid: replaced.error }); continue; }
          }
          const setup = { railIndex: 1, originX: 0, yaw: sample.aim.yaw, elevation: sample.aim.elevation, charge: sample.aim.charge };
          let line;
          try { line = shotLine(session.shoot(adapted.world, setup), setup, { family: family.id, axis: axis.axis, value: sample.value, pose: { x: sample.pose.x, z: sample.pose.z, yaw: sample.pose.yaw } }); }
          catch (error) { line = { type: 'rejected', error: error.message, value: sample.value }; }
          toleranceFile.write(line);
          samples.push({ value: sample.value, scored: line.scored === true, distance: line.distance ?? null, reason: line.reason ?? null, invalid: line.invalid ?? line.error ?? null });
        }
        const runs = intervals(samples);
        const containing = runs.find(run => baseValue(axis.axis, family) >= run.min && baseValue(axis.axis, family) <= run.max) ?? null;
        familyRecord.axes[axis.axis] = { samples: samples.length, intervals: runs, containing };
        console.error(`  ${family.id} ${axis.axis} intervals ${runs.length} containing ${containing ? `${containing.min}..${containing.max} (${containing.count})` : 'none'}`);
      }
      const slice = [];
      for (const z of series(seriesRound(basePose.z - 2, 1), seriesRound(basePose.z + 2, 1), 0.5, 1)) {
        for (const charge of series(Math.max(0.3, seriesRound(baseAim.charge - 0.04, 2)), Math.min(0.9, seriesRound(baseAim.charge + 0.04, 2)), 0.01, 2)) {
          const pose = { ...basePose, z };
          const aim = { ...baseAim, charge };
          let adapted;
          try { adapted = adaptRangePreset(posedPreset(pose, aim)); }
          catch (error) { slice.push({ z, charge, scored: false, invalid: error.message }); continue; }
          if (session.runtime.mode !== 'build') session.runtime.setMode('build');
          const replaced = session.runtime.replaceWorld(adapted.world, { intent: 'load' });
          if (!replaced.ok) { slice.push({ z, charge, scored: false, invalid: replaced.error }); continue; }
          const setup = { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge };
          const line = shotLine(session.shoot(adapted.world, setup), setup, { family: family.id, axis: 'bankZ-charge', pose: { x: pose.x, z, yaw: pose.yaw } });
          toleranceFile.write(line);
          slice.push({ z, charge, scored: line.scored, distance: line.distance });
        }
      }
      familyRecord.bankZCharge = {
        scored: slice.filter(item => item.scored).length,
        tried: slice.length,
        z: span(slice.filter(item => item.scored).map(item => item.z)),
        charge: span(slice.filter(item => item.scored).map(item => item.charge)),
        cells: slice,
      };
      tolerance.push(familyRecord);
    }
    await toleranceFile.close();
    await writeFile(`${OUT}/tolerance-summary.json`, `${JSON.stringify(tolerance, null, 2)}\n`);

    console.error('appendix and reproduce');
    const appendix = [];
    for (const family of subjects) {
      const pose = family.representative.pose;
      const aim = family.representative.setup;
      const preset = adaptRangePreset(posedPreset(pose, aim)).preset;
      const text = exportRangePreset(preset);
      const file = `${APPENDIX}/${family.id}.json`;
      await writeFile(file, text.endsWith('\n') ? text : `${text}\n`);
      const imported = parseRangePreset(await readFile(file, 'utf8'));
      const again = exportRangePreset(imported);
      const setup = rangeOpeningSetup(imported);
      await renew(adaptRangePreset(preset).world);
      const first = shotLine(session.shoot(adaptRangePreset(preset).world, setup), setup, { family: family.id, pass: 'export' });
      await renew(adaptRangePreset(imported).world);
      const second = shotLine(session.shoot(adaptRangePreset(imported).world, setup), setup, { family: family.id, pass: 'import' });
      const same = JSON.stringify(first.position) === JSON.stringify(second.position)
        && first.reason === second.reason
        && first.scored === second.scored
        && JSON.stringify(first.contacts) === JSON.stringify(second.contacts)
        && text === again;
      appendix.push({ id: family.id, file, presetHash: await sha256Hex(text), same, first, second });
      console.error(`  reproduce ${family.id} same ${same} scored ${second.scored} d ${second.distance}`);
    }
    await writeFile(`${OUT}/reproduce.json`, `${JSON.stringify(appendix, null, 2)}\n`);

    console.error('failures and runRange spot check');
    const failureSpecs = [];
    const pushFailure = (name, preset, setup) => failureSpecs.push({ name, preset, setup });
    pushFailure('default-opening', defaultPreset, opening);
    pushFailure('wall-only-opening', bareAdapted.preset, opening);
    if (directSummary.minLine) pushFailure('direct-nearest', bareAdapted.preset, directSummary.minLine.setup);
    if (defaultSummary.minLine) pushFailure('default-nearest', defaultPreset, defaultSummary.minLine.setup);
    pushFailure('screen-face', bareAdapted.preset, { railIndex: 1, originX: 0, yaw: -8, elevation: 8, charge: 0.9 });
    for (const family of tolerance) {
      for (const axis of ['charge', 'bankYaw', 'aimYaw']) {
        const containing = family.axes[axis]?.containing;
        if (!containing) continue;
        const step = axis === 'charge' ? 0.01 : axis === 'bankYaw' ? 5 : 0.5;
        const above = seriesRound(containing.max + step, axis === 'charge' ? 2 : 1);
        const pose = { ...family.representative.pose };
        const aim = { yaw: family.representative.setup.yaw, elevation: family.representative.setup.elevation, charge: family.representative.setup.charge };
        if (axis === 'bankYaw') pose.yaw = above;
        if (axis === 'charge') aim.charge = above;
        if (axis === 'aimYaw') aim.yaw = above;
        try { pushFailure(`${family.id}-${axis}-above`, adaptRangePreset(posedPreset(pose, aim)).preset, { railIndex: 1, originX: 0, ...aim }); }
        catch { /* outside the legal piece or aim box */ }
      }
    }
    const failureLines = [];
    for (const spec of failureSpecs) {
      const bound = await runRange({ preset: spec.preset, setups: [spec.setup], seed: SEED, gitSha, havok, label: spec.name, campaign: 'back-pocket-failures', omitPoints: true });
      failureLines.push({ name: spec.name, line: bound.lines[1] ?? bound.lines[0], rejected: bound.rejected });
    }
    await writeFile(`${OUT}/failures.json`, `${JSON.stringify(failureLines, null, 2)}\n`);

    const checks = [];
    const check = async (name, preset, setup, harnessLine) => {
      const bound = await runRange({ preset, setups: [setup], seed: SEED, gitSha, havok, label: name, campaign: 'back-pocket-verify', omitPoints: true });
      const shot = bound.lines.find(line => line.type === 'shot');
      const match = shot && harnessLine && JSON.stringify(shot.terminal?.position) === JSON.stringify(harnessLine.position) && shot.terminal?.reason === harnessLine.reason && shot.outcome?.scored === harnessLine.scored;
      checks.push({ name, match, harness: harnessLine ? { position: harnessLine.position, reason: harnessLine.reason, scored: harnessLine.scored, distance: harnessLine.distance } : null, bound: shot ? { position: shot.terminal?.position, reason: shot.terminal?.reason, scored: shot.outcome?.scored, distance: shot.outcome?.distance } : null });
      console.error(`  verify ${name} match ${match}`);
    };
    if (directSummary.minLine) await check('direct-nearest', bareAdapted.preset, directSummary.minLine.setup, directSummary.minLine);
    if (defaultSummary.minLine) await check('default-nearest', defaultPreset, defaultSummary.minLine.setup, defaultSummary.minLine);
    for (const family of subjects) {
      const preset = adaptRangePreset(posedPreset(family.representative.pose, family.representative.setup)).preset;
      await check(family.id, preset, family.representative.setup, family.representative);
    }
    for (const item of appendix) await check(`${item.id}-import`, parseRangePreset(await readFile(item.file, 'utf8')), rangeOpeningSetup(parseRangePreset(await readFile(item.file, 'utf8'))), item.second);
    await writeFile(`${OUT}/verify.json`, `${JSON.stringify(checks, null, 2)}\n`);
    await writeFile(`${OUT}/campaign.json`, `${JSON.stringify({
      gitSha,
      dirty: dirty(),
      seed: SEED,
      defaultPresetHash: defaultHash,
      wallOnlyPresetHash: bareHash,
      direct: { minDistance: directSummary.minDistance, scored: directSummary.scored, lipschitz: directLip, refineMin: refineSummary.minDistance, refineScored: refineSummary.scored },
      parked: { minDistance: defaultSummary.minDistance, scored: defaultSummary.scored, bankContacts: defaultSummary.bankContacts },
      grid: { simulated, clears: clears.length, components: components.length, families: families.map(family => ({ id: family.id, clears: family.clears, medianBankZ: family.medianBankZ, medianBankYaw: family.medianBankYaw, medianCharge: family.medianCharge, representative: family.representative })) },
      reproduce: appendix.map(item => ({ id: item.id, same: item.same, presetHash: item.presetHash })),
      verify: checks.map(item => ({ name: item.name, match: item.match })),
    }, null, 2)}\n`);
  } finally { session.dispose(); }
}

function baseValue(axis, family) {
  if (axis === 'aimYaw') return family.representative.setup.yaw;
  if (axis === 'elevation') return family.representative.setup.elevation;
  if (axis === 'charge') return family.representative.setup.charge;
  if (axis === 'bankX') return family.representative.pose.x;
  if (axis === 'bankZ') return family.representative.pose.z;
  if (axis === 'bankYaw') return family.representative.pose.yaw;
  return null;
}

await main();
