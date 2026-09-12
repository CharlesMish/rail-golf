import { RAIL_RULES, chargeToSpeed, speedToCharge } from './rail-golf-v02.js';

export const SHOT_LIBRARY_KEY = 'rail-golf-shot-library-v1';
const CONTACTS = new Set(['bank','bank-a','bank-b','boost','breach','step-a','step-b','step-c','sky','mill','first-kiss','wet']);
const vector = p => p && ['x','y','z'].every(k => Number.isFinite(p[k]) && Math.abs(p[k]) < 10000);
const copyPoint = p => ({ x:p.x, y:p.y, z:p.z });

// Store speed rather than tying a discovered line to a particular power scale.
// Sampled flight evidence is visual history only, never scoring authority.
export function packLine(line) {
  const points = line.points;
  const count = Math.min(points.length, 320);
  return { ...line, speed:chargeToSpeed(line.charge),
    points:Array.from({length:count}, (_,i) => copyPoint(points[count === 1 ? 0 : Math.round(i * (points.length-1)/(count-1))])),
    contacts:line.contacts.slice(0,32).map(c => ({id:c.id, kind:c.kind, point:copyPoint(c.point)})),
  };
}

export function lineFamily(line) {
  const kinds = line.contacts.filter(c => c.kind !== 'first-kiss' && c.kind !== 'wet').map(c => c.kind);
  return kinds.join(' → ') || 'clear carry';
}

// Misses and abandoned shots update recent history, never displace winning lines.
export function collectLine(shelf = {recent:[], wins:[]}, line) {
  const recent = [line, ...shelf.recent.filter(s => s.projectileId !== line.projectileId)].slice(0,3);
  const won = line.outcome === 'ace' || line.outcome === 'double';
  const wins = won ? [line, ...shelf.wins.filter(s => lineFamily(s) !== lineFamily(line))].slice(0,6) : shelf.wins;
  return { recent, wins };
}

export function normalizeShotLibrary(value, holes) {
  const library = {};
  if (!value || value.version !== 1 || !value.holes || typeof value.holes !== 'object') return library;
  for (const hole of holes) {
    const shelf = value.holes[hole.id];
    if (!shelf || typeof shelf !== 'object') continue;
    const normalize = line => {
      if (!line || line.holeId !== hole.id || line.stationId !== (hole.station?.id ?? 'gate') || line.windId !== hole.wind.id) return null;
      if (!Number.isSafeInteger(line.projectileId) || line.projectileId < 1 || line.projectileId > 1e12 ||
        !Number.isInteger(line.railIndex) || line.railIndex < 0 || line.railIndex >= RAIL_RULES.railPositions.length ||
        !Number.isFinite(line.yaw) || line.yaw < RAIL_RULES.minYaw || line.yaw > RAIL_RULES.maxYaw ||
        !Number.isFinite(line.elevation) || line.elevation < RAIL_RULES.minElevation || line.elevation > RAIL_RULES.maxElevation ||
        !Number.isFinite(line.speed) || line.speed < RAIL_RULES.minSpeed || line.speed > RAIL_RULES.maxSpeed ||
        ![null,'ace','double','breach','miss','wet','oob'].includes(line.outcome) ||
        typeof line.receipt !== 'string' || !Array.isArray(line.points) || line.points.length > 320 || !line.points.every(vector) ||
        !Array.isArray(line.contacts) || line.contacts.length > 32 || !line.contacts.every(c => c && CONTACTS.has(c.kind) && vector(c.point))) return null;
      return { holeId:hole.id, stationId:line.stationId, windId:line.windId, projectileId:line.projectileId,
        railIndex:line.railIndex, yaw:line.yaw, elevation:line.elevation, charge:speedToCharge(line.speed), speed:line.speed,
        outcome:line.outcome, receipt:line.receipt.slice(0,400), points:line.points.map(copyPoint),
        contacts:line.contacts.map((c,i) => ({ id:`${line.projectileId}-saved-${i}`, kind:c.kind, point:copyPoint(c.point) })),
      };
    };
    const list = (items, limit) => Array.isArray(items) ? items.slice(0,limit).map(normalize).filter(Boolean) : [];
    library[hole.id] = { recent:list(shelf.recent,3), wins:list(shelf.wins,6).filter(s => s.outcome === 'ace' || s.outcome === 'double') };
  }
  return library;
}
