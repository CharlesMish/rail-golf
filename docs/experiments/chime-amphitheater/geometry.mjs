// Faceted-arc feasibility against the validator that ships on this branch.
// No Havok. Placement, yaw, lift, tilt, overlap, and yard bounds only.
//
//   node docs/experiments/chime-amphitheater/geometry.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargeToSpeed, RAIL_RULES } from '../../../lib/rail-golf-v02.js';
import { stationMuzzle } from '../../../lib/stations.js';
import { validateRangePreset } from '../../../lib/worldcraft-range.js';
import {
  WORLDCRAFT_BOUNDS, WORLDCRAFT_CATALOG, WORLDCRAFT_ELEVATION, WORLDCRAFT_LIMITS,
  worldcraftBox,
} from '../../../lib/worldcraft-model.js';

const here = dirname(fileURLToPath(import.meta.url));
const BALL = RAIL_RULES.projectileRadius;

function snap(value, step) {
  return Math.round(value / step) * step;
}
function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function plate(id, x, z, yaw, { lift, tilt, degree = 0, material = 'metal' } = {}) {
  const object = { id, kind: 'plate', x, z, yaw, voice: { material, degree } };
  if (lift !== undefined) {
    object.lift = lift;
    object.tilt = tilt;
  }
  return object;
}

function presetOf(id, objects, capacity) {
  const preset = {
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id,
    name: id,
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher: { x: 0 },
    objects,
    rules: {
      launcher: { fixed: false, yaw: 0, elevation: 18, charge: 0.55 },
      fixed: objects.map(object => object.id),
      allowance: {},
      goal: { kind: 'none' },
    },
  };
  if (capacity) preset.capacity = capacity;
  return preset;
}

function tryPreset(preset) {
  try {
    const document = validateRangePreset(preset);
    return { ok: true, objects: document.objects };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function separation(a, b) {
  const dot = (u, v) => u.x * v.x + u.y * v.y + u.z * v.z;
  const axes = [...a.axes, ...b.axes];
  for (const u of a.axes) for (const v of b.axes) {
    const c = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    const length = Math.hypot(c.x, c.y, c.z);
    if (length > 1e-9) axes.push({ x: c.x / length, y: c.y / length, z: c.z / length });
  }
  let best = -Infinity;
  for (const axis of axes) {
    const pa = a.corners.map(point => dot(point, axis));
    const pb = b.corners.map(point => dot(point, axis));
    const gap = Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
    if (gap > best) best = gap;
  }
  return best;
}

function pairGaps(objects) {
  const boxes = objects.map(object => ({ id: object.id, box: worldcraftBox(object) }));
  const pairs = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      pairs.push({
        a: boxes[i].id,
        b: boxes[j].id,
        gap: round(separation(boxes[i].box, boxes[j].box), 4),
      });
    }
  }
  pairs.sort((left, right) => left.gap - right.gap);
  return pairs;
}

function verticalSpan(object) {
  const box = worldcraftBox(object);
  return { minY: round(box.minY, 3), maxY: round(box.maxY, 3) };
}

// θ = 0 is the far point of the arc (downrange). Positive θ is +x (east).
// The plate yaw equals θ, so the thin axis is radial and tilt -15 leans the top inward.
function arcObjects(spec) {
  const count = spec.count;
  const step = count === 1 ? 0 : (spec.to - spec.from) / (count - 1);
  const objects = [];
  for (let index = 0; index < count; index += 1) {
    const angle = spec.from + index * step;
    const radians = angle * Math.PI / 180;
    const yaw = snap(angle, 5);
    const radius = spec.radius + (spec.radialNudge?.[index] ?? 0);
    const x = snap(spec.cx + radius * Math.sin(radians), 0.5);
    const z = snap(spec.cz + radius * Math.cos(radians), 0.5);
    const pose = spec.pose ?? { lift: spec.lift, tilt: spec.tilt };
    objects.push(plate(`${spec.prefix}-${index}`, x, z, yaw, {
      ...pose,
      degree: index % 5,
    }));
  }
  return objects;
}

function describeArc(spec, capacity = 24) {
  const objects = arcObjects(spec);
  const result = tryPreset(presetOf(spec.id, objects, objects.length > 12 ? capacity : undefined));
  const row = {
    id: spec.id,
    count: spec.count,
    from: spec.from,
    to: spec.to,
    radius: spec.radius,
    cz: spec.cz,
    lift: spec.lift ?? null,
    tilt: spec.tilt ?? null,
    pieces: objects.length,
    ok: result.ok,
    error: result.ok ? null : result.error,
  };
  if (!result.ok) return row;
  const gaps = pairGaps(result.objects);
  const adjacent = [];
  for (let index = 0; index < result.objects.length - 1; index += 1) {
    const found = gaps.find(pair => (
      (pair.a === result.objects[index].id && pair.b === result.objects[index + 1].id)
      || (pair.b === result.objects[index].id && pair.a === result.objects[index + 1].id)
    ));
    if (found) adjacent.push(found.gap);
  }
  const span = verticalSpan(result.objects[0]);
  const xs = result.objects.map(object => object.x);
  const zs = result.objects.map(object => object.z);
  row.yawStep = countStep(spec);
  row.seamMin = adjacent.length ? Math.min(...adjacent) : null;
  row.seamMax = adjacent.length ? Math.max(...adjacent) : null;
  row.seamMedian = median(adjacent);
  row.ballClearsSeam = row.seamMin !== null && row.seamMin > BALL * 2;
  row.minY = span.minY;
  row.maxY = span.maxY;
  row.xMin = Math.min(...xs);
  row.xMax = Math.max(...xs);
  row.zMin = Math.min(...zs);
  row.zMax = Math.max(...zs);
  row.objects = result.objects.map(object => ({
    id: object.id, x: object.x, z: object.z, yaw: object.yaw,
    ...(object.lift !== undefined ? { lift: object.lift, tilt: object.tilt } : {}),
  }));
  return row;
}

function countStep(spec) {
  if (spec.count < 2) return 0;
  return round((spec.to - spec.from) / (spec.count - 1), 2);
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : round((sorted[mid - 1] + sorted[mid]) / 2, 4);
}

function analyticMinRadius(stepDeg) {
  const half = (stepDeg * Math.PI / 180) / 2;
  // Inner edge of a 4 m plate. Thickness is ignored; the validator is stricter once tilt grows the box.
  return round(2 / Math.tan(half) + WORLDCRAFT_CATALOG.plate.depth / 2, 2);
}

function flight(yaw, elevation, charge) {
  const speed = chargeToSpeed(charge);
  const muzzle = stationMuzzle({ railIndex: 1, originX: 0, yaw, elevation });
  const direction = {
    x: Math.sin(yaw * Math.PI / 180) * Math.cos(elevation * Math.PI / 180),
    y: Math.sin(elevation * Math.PI / 180),
    z: Math.cos(yaw * Math.PI / 180) * Math.cos(elevation * Math.PI / 180),
  };
  const samples = [];
  for (const z of [16, 20, 24, 28, 32, 36, 40, 46]) {
    const vz = direction.z * speed;
    if (vz <= 0.5) continue;
    const t = (z - muzzle.z) / vz;
    if (t < 0) continue;
    const y = muzzle.y + direction.y * speed * t - 0.5 * RAIL_RULES.gravity * t * t;
    const x = muzzle.x + direction.x * speed * t;
    samples.push({ z, t: round(t, 3), y: round(y, 2), x: round(x, 2), airborne: y > BALL });
  }
  return {
    yaw, elevation, charge, speed: round(speed, 2),
    muzzle: { x: round(muzzle.x, 2), y: round(muzzle.y, 2), z: round(muzzle.z, 2) },
    samples,
  };
}

const failures = [];
function expectFail(label, preset, pattern) {
  const result = tryPreset(preset);
  failures.push({
    label,
    rejected: !result.ok,
    error: result.ok ? null : result.error,
    matches: !result.ok && pattern.test(result.error),
  });
}

const one = plate('a', 0, 20, 0, { lift: 2, tilt: -15 });
expectFail('yaw 1°', presetOf('fail-yaw', [{ ...one, yaw: 1 }]), /yaw/);
expectFail('x 0.25 m', presetOf('fail-x', [{ ...one, x: 0.25 }]), /x/);
expectFail('lift 0.25 m', presetOf('fail-lift', [plate('a', 0, 20, 0, { lift: 0.25, tilt: -15 })]), /lift/);
expectFail('tilt -12°', presetOf('fail-tilt', [plate('a', 0, 20, 0, { lift: 2, tilt: -12 })]), /tilt/);
expectFail('lift without tilt', presetOf('fail-pair', [{ id: 'a', kind: 'plate', x: 0, z: 20, yaw: 0, lift: 2, voice: { material: 'metal', degree: 0 } }]), /both/);
expectFail('bank lift', presetOf('fail-bank', [{ id: 'a', kind: 'bank', x: 0, z: 24, yaw: 0, lift: 2, tilt: -15, voice: { material: 'timber', degree: 0 } }]), /unsupported|fields/);
expectFail('13 pieces without capacity', presetOf('fail-cap', Array.from({ length: 13 }, (_, index) => plate(`p-${index}`, -24 + index * 4, 40, 0))), /at most 12/);
expectFail('25 pieces at capacity 24', presetOf('fail-25', Array.from({ length: 25 }, (_, index) => plate(`p-${index}`, -12 + (index % 12) * 2, 40 + Math.floor(index / 12) * 6, 0, { lift: Math.floor(index / 12) * 6, tilt: -15 })), 24), /at most 24/);
expectFail('footprint past x=30', presetOf('fail-yard', [plate('a', 29.5, 20, 0)]), /footprint|yard/);
expectFail('corridor', presetOf('fail-corridor', [plate('a', 0, 10, 0)]), /corridor/);

// Same centre, stacked. Edge touch at lift 4 over a standing plate is the tightest legal stack.
const stacked = [
  plate('low', 0, 28, 0),
  plate('high', 0, 28, 0, { lift: 4, tilt: 0 }),
];
const stackOk = tryPreset(presetOf('stack-touch', stacked));
const stackTight = tryPreset(presetOf('stack-intersect', [
  plate('low', 0, 28, 0),
  plate('high', 0, 28, 0, { lift: 3.5, tilt: 0 }),
]));

const sweep = [];
for (const span of [120, 180]) {
  for (const step of [10, 15, 20, 30]) {
    if (Math.abs(span / step - Math.round(span / step)) > 1e-6) continue;
    const count = span / step + 1;
    for (const radius of [8, 10, 12, 14, 16, 18, 22, 26]) {
      for (const cz of [14, 18, 22]) {
        const spec = {
          id: `sweep-${span}-${step}-r${radius}-z${cz}`,
          count, from: -span / 2, to: span / 2, radius, cz, cx: 0,
          lift: 2, tilt: -15, prefix: 'f',
        };
        const row = describeArc(spec);
        delete row.objects;
        sweep.push(row);
      }
    }
  }
}

const legal = sweep.filter(row => row.ok);
const tight = legal.filter(row => row.seamMin !== null && row.seamMin <= BALL * 2 && row.seamMin > 0);
const leaking = legal.filter(row => row.ballClearsSeam);
const overlapRejected = sweep.filter(row => !row.ok && /overlaps/.test(row.error ?? ''));

function bestOf(rows) {
  return [...rows].sort((a, b) => a.seamMax - b.seamMax || a.pieces - b.pieces)[0] ?? null;
}

// Closed horseshoe at the finest step that still fits 24 pieces: 10° wants 19 plates.
const closed = [];
for (const step of [10, 15, 20, 30]) {
  const count = 180 / step + 1;
  let found = null;
  for (let radius = 6; radius <= 28; radius += 0.5) {
    const row = describeArc({
      id: `closed-${step}-r${radius}`,
      count, from: -90, to: 90, radius, cz: 18, cx: 0,
      lift: 2, tilt: -15, prefix: 'c',
    });
    if (row.ok) {
      found = { ...row, objects: undefined };
      delete found.objects;
      break;
    }
  }
  closed.push({
    step,
    pieces: count,
    analyticMinRadius: analyticMinRadius(step),
    needsCapacity24: count > 12,
    exceeds24: count > 24,
    firstLegal: found,
  });
}

// Five-degree facets across 180° is 37 plates, past both caps. Record the rejection without placing 37 ids that also fail the yard.
const fiveDegreeCount = 180 / 5 + 1;

const flights = [];
for (const elevation of [8, 12, 16, 18, 20, 24, 30, 40]) {
  for (const charge of [0.35, 0.55, 0.8]) {
    flights.push(flight(0, elevation, charge));
  }
}

const report = {
  kit: {
    positionStepM: 0.5,
    positionX: [WORLDCRAFT_BOUNDS.minX, WORLDCRAFT_BOUNDS.maxX],
    positionZ: [WORLDCRAFT_BOUNDS.minZ, WORLDCRAFT_BOUNDS.maxZ],
    yawStepDeg: 5,
    yawRange: [-180, 175],
    liftStepM: WORLDCRAFT_ELEVATION.liftStep,
    liftRange: [0, WORLDCRAFT_ELEVATION.maxLift],
    tiltStepDeg: WORLDCRAFT_ELEVATION.tiltStep,
    tiltRange: [WORLDCRAFT_ELEVATION.minTilt, WORLDCRAFT_ELEVATION.maxTilt],
    elevatedKinds: WORLDCRAFT_ELEVATION.kinds,
    defaultPieces: WORLDCRAFT_LIMITS.objects,
    optInPieces: 24,
    plate: WORLDCRAFT_CATALOG.plate,
    ballRadiusM: BALL,
    note: 'Tilt pitches about the plate width axis after yaw. Negative tilt leans the top toward -local Z, which is inward when yaw equals the radial bearing.',
  },
  failures,
  stack: {
    standingPlusLift4Tilt0: stackOk.ok ? 'accepted (edge touch)' : stackOk.error,
    standingPlusLift3_5Tilt0: stackTight.ok ? 'accepted' : stackTight.error,
  },
  sweep: {
    rows: sweep.length,
    legal: legal.length,
    rejected: sweep.length - legal.length,
    overlapRejected: overlapRejected.length,
    legalWithSeamUnderBallDiameter: tight.length,
    legalWithSeamOverBallDiameter: leaking.length,
    tightestLegal: bestOf(tight),
    leakiestExample: [...leaking].sort((a, b) => b.seamMin - a.seamMin)[0] ?? null,
  },
  closedSemicircle: closed,
  fiveDegreeSemicirclePieces: fiveDegreeCount,
  flights,
};

await mkdir(resolve(here, 'raw'), { recursive: true });
await writeFile(resolve(here, 'raw/geometry.json'), `${JSON.stringify(report, null, 2)}\n`);

const lines = [];
lines.push(`failures ${failures.filter(row => row.rejected && row.matches).length}/${failures.length} matched`);
for (const row of failures) lines.push(`  ${row.rejected ? 'REJECT' : 'ACCEPT'} ${row.matches ? 'ok' : 'UNEXPECTED'} ${row.label}: ${row.error ?? ''}`);
lines.push(`stack touch: ${report.stack.standingPlusLift4Tilt0}`);
lines.push(`stack 3.5: ${report.stack.standingPlusLift3_5Tilt0}`);
lines.push(`sweep legal ${legal.length}/${sweep.length}, seam < ball diameter ${tight.length}, seam > ball diameter ${leaking.length}`);
lines.push('closed semicircle, first legal radius at cz 18, lift 2, tilt -15:');
for (const row of closed) {
  const first = row.firstLegal;
  lines.push(`  step ${row.step}° pieces ${row.pieces} analyticR ${row.analyticMinRadius} capacity24 ${row.needsCapacity24} exceeds24 ${row.exceeds24} first ${first ? `R${first.radius} seam ${first.seamMin}..${first.seamMax} z ${first.zMin}-${first.zMax} y ${first.minY}-${first.maxY}` : 'NONE'}`);
}
lines.push(`5° semicircle would be ${fiveDegreeCount} plates`);
process.stdout.write(`${lines.join('\n')}\n`);
