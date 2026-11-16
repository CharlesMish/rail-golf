// One lab piece: a curved terrace step. An annular sector, filled from the
// ground up to its tread, cut into convex prisms. It is not a general solid.
// Friction and restitution are the existing resonant-piece pair. The yard
// floor and the tee stay the only rangeGround bodies.

export const WORLDCRAFT_TERRACE = Object.freeze({
  // 12° keeps the inner-wall sagitta under 0.10 m at a 18 m radius:
  // R * (1 - cos(6°)) = 0.099 m, about an eighth of the 0.86 m ball.
  // Tread tops of one step are coplanar, so a joint is not a vertical lip.
  // Facets meet on a shared face. A radial overlap would push one step's chord
  // through the next step, so the seam is closed by a shared face, not by overlap.
  facetDegrees: 12,
  seamOverlapM: 0,
  innerMin: 2, innerMax: 24, innerStep: 0.5,
  depthMin: 1, depthMax: 6, depthStep: 0.5,
  // 0.25 is the half step used by the phase 3 shallow copy. The 0.5 bowl
  // values stay on this grid. Restitution and friction are not in this table.
  riserMin: 0.25, riserMax: 6, riserStep: 0.25,
  spanMin: 60, spanMax: 240, spanStep: 12,
  elevationMin: 0.25, elevationMax: 12, elevationStep: 0.25,
  gapMin: 0, gapMax: 48, gapStep: 12,
});

const FACES = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 6, 2], [3, 7, 6], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

function fail(message) { throw Error(message); }
function onStep(value, unit) { return Math.abs(value / unit - Math.round(value / unit)) <= 1e-8; }

/** Radial error of one facet's chord against the arc, in metres. */
export function terraceSagitta(radius) {
  const half = WORLDCRAFT_TERRACE.facetDegrees * Math.PI / 360;
  return radius * (1 - Math.cos(half));
}

export function validateTerraceFields(item, label) {
  const limits = WORLDCRAFT_TERRACE;
  const read = (key, min, max, unit) => {
    const value = item[key];
    if (!Number.isFinite(value) || value < min || value > max) fail(`${label}: ${key} expected ${min} to ${max}`);
    if (!onStep(value, unit)) fail(`${label}: ${key} uses ${unit} increments`);
    return Object.is(value, -0) ? 0 : value;
  };
  const innerRadius = read('innerRadius', limits.innerMin, limits.innerMax, limits.innerStep);
  const depth = read('depth', limits.depthMin, limits.depthMax, limits.depthStep);
  const riser = read('riser', limits.riserMin, limits.riserMax, limits.riserStep);
  const span = read('span', limits.spanMin, limits.spanMax, limits.spanStep);
  const elevation = read('elevation', limits.elevationMin, limits.elevationMax, limits.elevationStep);
  if (elevation + 1e-9 < riser) fail(`${label}: the tread must be at least as high as the riser`);
  let gap = 0;
  if (Object.hasOwn(item, 'gap')) {
    gap = read('gap', limits.gapMin, limits.gapMax, limits.gapStep);
    if (gap === 0) fail(`${label}: omit gap when the arc is unbroken`);
    if (gap >= span) fail(`${label}: the gap must be narrower than the arc`);
  }
  const facetDegrees = Object.hasOwn(item, 'facetDegrees') ? item.facetDegrees : limits.facetDegrees;
  if (facetDegrees !== 12 && facetDegrees !== 24) fail(`${label}: facetDegrees must be 12 or 24`);
  if (Object.hasOwn(item, 'facetDegrees') && facetDegrees === 12) fail(`${label}: omit the default facetDegrees`);
  if (span % facetDegrees !== 0 || gap % facetDegrees !== 0) fail(`${label}: span and gap must close on the ${facetDegrees}° facet`);
  return { innerRadius, depth, riser, span, elevation, gap, facetDegrees };
}

/**
 * Convex prisms for one step. Local angle 0 is the facing direction.
 * World angle 0 is +z, and it increases toward +x.
 * The solid runs from (elevation - riser) up to the tread. This bowl sets
 * riser equal to elevation, so the step is filled down to the ground.
 */
export function terraceMeshBuffers(facet) {
  return {
    positions: facet.corners.flatMap(point => [point.x, point.y, point.z]),
    indices: FACES.flat(),
  };
}

export function worldcraftTerraceFacets(object) {
  const fields = object.innerRadius ? object : validateTerraceFields(object, 'Terrace');
  const { innerRadius, depth, riser, span, elevation, gap } = fields;
  const facet = object.facetDegrees ?? WORLDCRAFT_TERRACE.facetDegrees;
  const overlap = WORLDCRAFT_TERRACE.seamOverlapM / innerRadius;
  const yaw = object.yaw * Math.PI / 180;
  const bottom = elevation - riser;
  const count = span / facet;
  const facets = [];
  for (let index = 0; index < count; index += 1) {
    const start = -span / 2 + index * facet;
    const end = start + facet;
    const center = (start + end) / 2;
    if (gap > 0 && Math.abs(center) < gap / 2) continue;
    const left = (start * Math.PI / 180) - overlap;
    const right = (end * Math.PI / 180) + overlap;
    const ring = (radius, angle) => ({
      x: object.x + Math.sin(yaw + angle) * radius,
      z: object.z + Math.cos(yaw + angle) * radius,
    });
    const at = (radius, angle, y) => {
      const point = ring(radius, angle);
      return { x: point.x, y, z: point.z };
    };
    const corners = [
      at(innerRadius, left, bottom), at(innerRadius, right, bottom), at(innerRadius + depth, right, bottom), at(innerRadius + depth, left, bottom),
      at(innerRadius, left, elevation), at(innerRadius, right, elevation), at(innerRadius + depth, right, elevation), at(innerRadius + depth, left, elevation),
    ];
    const plan = [ring(innerRadius, left), ring(innerRadius, right), ring(innerRadius + depth, right), ring(innerRadius + depth, left)];
    facets.push({ index: facets.length, corners, plan, bottom, top: elevation });
  }
  if (!facets.length) fail('Terrace: the gap removes every facet');
  return facets;
}

function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function pushAxis(axes, vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length > 1e-9) axes.push({ x: vector.x / length, y: vector.y / length, z: vector.z / length });
}

/** True when the two convex solids have overlapping volume. Face contact is allowed. */
export function convexSolidsOverlap(a, b) {
  const axes = [];
  const consider = corners => {
    for (const face of FACES) {
      const p = corners[face[0]], q = corners[face[1]], r = corners[face[2]];
      pushAxis(axes, cross(sub(q, p), sub(r, p)));
    }
  };
  consider(a);
  consider(b);
  const edgeDir = corners => EDGES.map(([i, j]) => sub(corners[j], corners[i]));
  const ea = edgeDir(a), eb = edgeDir(b);
  for (const u of ea) for (const v of eb) pushAxis(axes, cross(u, v));
  const project = (corners, axis) => corners.map(point => point.x * axis.x + point.y * axis.y + point.z * axis.z);
  for (const axis of axes) {
    const pa = project(a, axis), pb = project(b, axis);
    if (Math.max(...pa) <= Math.min(...pb) + 1e-5 || Math.max(...pb) <= Math.min(...pa) + 1e-5) return false;
  }
  return true;
}

function pushPlanAxis(axes, dx, dz) {
  const length = Math.hypot(dx, dz);
  if (length > 1e-9) axes.push({ x: -dz / length, z: dx / length });
}

/** True when two convex plan polygons have overlapping area. Edge contact is allowed. */
export function planPolygonsOverlap(a, b) {
  const axes = [];
  const consider = polygon => {
    for (let index = 0; index < polygon.length; index += 1) {
      const next = polygon[(index + 1) % polygon.length];
      pushPlanAxis(axes, next.x - polygon[index].x, next.z - polygon[index].z);
    }
  };
  consider(a);
  consider(b);
  const project = (polygon, axis) => polygon.map(point => point.x * axis.x + point.z * axis.z);
  for (const axis of axes) {
    const pa = project(a, axis), pb = project(b, axis);
    if (Math.max(...pa) <= Math.min(...pb) + 1e-5 || Math.max(...pb) <= Math.min(...pa) + 1e-5) return false;
  }
  return true;
}
