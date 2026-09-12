import { RAIL_RULES, collectShotStepEvents, verticalRecoveryImpulse, legacyChargeToCurrent } from './rail-golf-v02.js';

export const DELIVERY_ROUTES = Object.freeze([
  { id: 'direct', label: 'Direct', hint: 'Reach the bell without touching a mechanism or building.' },
  { id: 'sky', label: 'Sky', hint: 'Collect the gold sky token, then land on the bell.' },
  { id: 'skip', label: 'Skip', hint: 'Descend onto the violet pad, then land on the bell.' },
  { id: 'mill', label: 'Mill', hint: 'Rebound from the mill building, then land on the bell.' },
]);
export const DELIVERY_BOOK_KEY = 'rail-golf-delivery-routes-v2';
export const LEGACY_DELIVERY_BOOK_KEY = 'rail-golf-delivery-routes-v1';

// Use v2 when present, even if empty. Never migrate an already converted value.
export function readDeliveryBook(current, legacy) {
  if (current !== null) return normalizeDeliveryBook(current);
  const book = normalizeDeliveryBook(legacy);
  for (const setup of Object.values(book)) setup.charge = legacyChargeToCurrent(setup.charge);
  return book;
}
export const SKY_TOKEN = Object.freeze({ x: 0, y: 40, z: 110, radius: 6 });

export function segmentTokenIntersection(start, end, token = SKY_TOKEN) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const x = start.x - token.x, y = start.y - token.y, z = start.z - token.z;
  const radius = token.radius + RAIL_RULES.projectileRadius;
  const c = x*x + y*y + z*z - radius*radius;
  if (c <= 0) return 0;
  const a = dx*dx + dy*dy + dz*dz;
  if (!a) return null;
  const b = 2*(x*dx + y*dy + z*dz), discriminant = b*b - 4*a*c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2*a);
  return t >= 0 && t <= 1 ? t : null;
}

export function collectDeliveryStepEvents(start, end, hole, tags = [], routes = []) {
  const events = collectShotStepEvents(start, end, hole, tags);
  if (hole.id === 'mill-delivery' && !routes.includes('sky')) {
    const amount = segmentTokenIntersection(start, end);
    if (amount !== null) events.push({ kind: 'sky', amount, point: {
      x: start.x + (end.x-start.x)*amount, y: start.y + (end.y-start.y)*amount, z: start.z + (end.z-start.z)*amount,
    } });
  }
  // Terminal events retain precedence on a tie. Never collect after the ruling.
  return events.sort((a,b) => a.amount-b.amount || Number(a.kind === 'sky')-Number(b.kind === 'sky'));
}

export function padImpulse(velocity, hole) {
  return { x: 0, y: verticalRecoveryImpulse(velocity.y, hole.boost?.verticalSpeed ?? 15),
    z: (hole.boost?.forwardKick ?? 4.8) * RAIL_RULES.projectileMass };
}

export function earnedDeliveryRoutes(clear, routes, touchedSolid, mechanismTags = []) {
  if (!clear) return [];
  const earned = DELIVERY_ROUTES.filter(r => r.id !== 'direct' && routes.includes(r.id)).map(r => r.id);
  if (!earned.length && !touchedSolid && !mechanismTags.length) return ['direct'];
  return earned;
}

export function normalizeDeliveryBook(value) {
  const book = {};
  if (!value || typeof value !== 'object') return book;
  for (const { id } of DELIVERY_ROUTES) {
    const s = value[id];
    if (!s || !['railIndex','yaw','elevation','charge'].every(k => Number.isFinite(s[k]))) continue;
    if (!Number.isInteger(s.railIndex) || s.railIndex < 0 || s.railIndex >= RAIL_RULES.railPositions.length ||
      s.yaw < RAIL_RULES.minYaw || s.yaw > RAIL_RULES.maxYaw || s.elevation < RAIL_RULES.minElevation ||
      s.elevation > RAIL_RULES.maxElevation || s.charge < 0 || s.charge > 1) continue;
    book[id] = { railIndex:s.railIndex, yaw:s.yaw, elevation:s.elevation, charge:s.charge };
  }
  return book;
}
