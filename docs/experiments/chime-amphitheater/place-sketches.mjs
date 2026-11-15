// Place the three Phase 1 sketches on the real validator and sample the vacuum
// trajectory against each box. A sample that enters a plate is only the first
// plate a ball would meet if nothing bounced. It is not a Havok result.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargeToSpeed, RAIL_RULES } from '../../../lib/rail-golf-v02.js';
import { stationMuzzle, stationAim } from '../../../lib/stations.js';
import { validateRangePreset } from '../../../lib/worldcraft-range.js';
import { worldcraftBox } from '../../../lib/worldcraft-model.js';

const here = dirname(fileURLToPath(import.meta.url));
const BALL = RAIL_RULES.projectileRadius;

function snap(value, step) {
  return Math.round(value / step) * step;
}
function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function arc({ prefix, from, to, count, radius, cz, lift, tilt, material = 'metal', degreeOffset = 0 }) {
  const step = count === 1 ? 0 : (to - from) / (count - 1);
  const objects = [];
  for (let index = 0; index < count; index += 1) {
    const angle = from + index * step;
    const radians = angle * Math.PI / 180;
    const yaw = snap(angle, 5);
    const x = snap(radius * Math.sin(radians), 0.5);
    const z = snap(cz + radius * Math.cos(radians), 0.5);
    const object = {
      id: `${prefix}-${index}`,
      kind: 'plate',
      x, z, yaw,
      voice: { material, degree: (index + degreeOffset) % 5 },
    };
    if (lift !== undefined) {
      object.lift = lift;
      object.tilt = tilt;
    }
    objects.push(object);
  }
  return objects;
}

function presetOf(id, name, objects) {
  const preset = {
    format: 'rail-golf-worldcraft-range-preset',
    version: 1,
    id,
    name,
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
  if (objects.length > 12) preset.capacity = 24;
  return preset;
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

function insideExpanded(box, point, radius) {
  const dx = point.x - box.center.x;
  const dy = point.y - box.center.y;
  const dz = point.z - box.center.z;
  const local = box.axes.map(axis => dx * axis.x + dy * axis.y + dz * axis.z);
  const limit = box.half.map(half => half + radius);
  return local.every((value, index) => Math.abs(value) <= limit[index]);
}

function vacuumFirst(objects, aim) {
  const boxes = objects.map(object => ({ id: object.id, box: worldcraftBox(object) }));
  const speed = chargeToSpeed(aim.charge);
  const shot = { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation };
  const muzzle = stationMuzzle(shot);
  const direction = stationAim(shot);
  const dt = 1 / 120;
  for (let step = 1; step < 120 * 8; step += 1) {
    const t = step * dt;
    const point = {
      x: muzzle.x + direction.x * speed * t,
      y: muzzle.y + direction.y * speed * t - 0.5 * RAIL_RULES.gravity * t * t,
      z: muzzle.z + direction.z * speed * t,
    };
    if (point.y <= BALL) return { hit: null, landed: { t: round(t, 3), x: round(point.x, 2), y: round(point.y, 2), z: round(point.z, 2) } };
    for (const entry of boxes) {
      if (insideExpanded(entry.box, point, BALL)) {
        return { hit: entry.id, at: { t: round(t, 3), x: round(point.x, 2), y: round(point.y, 2), z: round(point.z, 2) } };
      }
    }
  }
  return { hit: null, landed: null };
}

const sketches = [
  {
    id: 'chime-arc',
    name: 'Arc Tier',
    why: 'Five plates, 20° apart, radius 13 m, one height. A shallow arc facing the tee.',
    objects: arc({ prefix: 'arc', from: -40, to: 40, count: 5, radius: 13, cz: 14, lift: 3, tilt: -15 }),
  },
  {
    id: 'chime-tiers',
    name: 'Two Tiers',
    why: 'Inner standing arc at radius 9 m. Outer arc at radius 13 m, lifted, so a higher shot can clear the inner tier.',
    objects: [
      ...arc({ prefix: 'in', from: -60, to: 60, count: 5, radius: 9, cz: 16 }),
      ...arc({ prefix: 'out', from: -40, to: 40, count: 5, radius: 13, cz: 16, lift: 4, tilt: -15, degreeOffset: 2 }),
    ],
  },
  {
    id: 'chime-horseshoe',
    name: 'Horseshoe',
    why: 'Seven plates, 20° apart, from -60° to 60°, radius 13 m. Open toward the tee. A full 180° mouth put the side walls outside the yaw cone.',
    objects: arc({ prefix: 'shoe', from: -60, to: 60, count: 7, radius: 13, cz: 16, lift: 3, tilt: -15 }),
  },
];

// The inner tier is standing, so arc() must omit lift. The helper adds lift only when defined.
// Rebuild the inner plates explicitly if the helper still wrote the keys. It does not.

const aims = [];
for (const yaw of [-24, -16, -8, 0, 8, 16, 24]) {
  for (const elevation of [8, 12, 18, 24]) {
    aims.push({ yaw, elevation, charge: 0.55 });
  }
}

const report = [];
for (const sketch of sketches) {
  let validated = null;
  let error = null;
  try {
    validated = validateRangePreset(presetOf(sketch.id, sketch.name, sketch.objects));
  } catch (caught) {
    error = caught.message;
  }
  if (!validated) {
    report.push({ id: sketch.id, ok: false, error, why: sketch.why });
    continue;
  }
  const objects = validated.objects;
  const boxes = objects.map(object => ({ id: object.id, box: worldcraftBox(object) }));
  const gaps = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      gaps.push({ a: boxes[i].id, b: boxes[j].id, gap: round(separation(boxes[i].box, boxes[j].box), 3) });
    }
  }
  gaps.sort((left, right) => left.gap - right.gap);
  const hits = {};
  for (const aim of aims) {
    const probe = vacuumFirst(objects, aim);
    const key = probe.hit ?? (probe.landed ? 'ground' : 'none');
    hits[key] = (hits[key] ?? 0) + 1;
  }
  const centre = vacuumFirst(objects, { yaw: 0, elevation: 18, charge: 0.55 });
  report.push({
    id: sketch.id,
    ok: true,
    why: sketch.why,
    pieces: objects.length,
    objects: objects.map(object => ({
      id: object.id, x: object.x, z: object.z, yaw: object.yaw,
      ...(object.lift !== undefined ? { lift: object.lift, tilt: object.tilt } : {}),
      y: [round(worldcraftBox(object).minY, 2), round(worldcraftBox(object).maxY, 2)],
    })),
    closestPairs: gaps.slice(0, 6),
    widestAdjacentHint: gaps[gaps.length - 1],
    vacuumHits: hits,
    vacuumCentre: centre,
  });
}

await mkdir(resolve(here, 'raw'), { recursive: true });
await mkdir(resolve(here, 'sketches'), { recursive: true });
for (const sketch of sketches) {
  const document = validateRangePreset(presetOf(sketch.id, sketch.name, sketch.objects));
  await writeFile(resolve(here, 'sketches', `${sketch.id}.json`), `${JSON.stringify(document, null, 2)}\n`);
}
await writeFile(resolve(here, 'raw/sketches-vacuum.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const row of report) {
  if (!row.ok) {
    process.stdout.write(`${row.id} REJECT ${row.error}\n`);
    continue;
  }
  process.stdout.write(`${row.id} pieces ${row.pieces} closest ${row.closestPairs.map(pair => `${pair.a}/${pair.b}:${pair.gap}`).join(' ')} centre ${JSON.stringify(row.vacuumCentre)} hits ${JSON.stringify(row.vacuumHits)}\n`);
}
