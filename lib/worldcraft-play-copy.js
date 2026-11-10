import { RAIL_RULES } from './rail-golf-v02.js';
import { WORLDCRAFT_CATALOG, worldcraftFootprint } from './worldcraft-model.js';

// Play-panel sentences for a foundry world. They are read from the manifest
// and the preset that was loaded. They do not name a world id, and they do
// not change a shot.

const KINDS = ['ramp', 'bank', 'block', 'plate'];

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function kindList(kinds) {
  const names = kinds.map(kind => `the ${kind}`);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

/** Kinds that are present, not fixed, and allowed. A kind is named only then. */
export function foundryMovableKinds(preset) {
  const fixed = new Set(preset?.rules?.fixed ?? []);
  const allowance = preset?.rules?.allowance ?? {};
  const kinds = [];
  for (const object of preset?.objects ?? []) {
    if (!KINDS.includes(object.kind) || fixed.has(object.id)) continue;
    if ((allowance[object.kind] ?? 0) <= 0) continue;
    if (!kinds.includes(object.kind)) kinds.push(object.kind);
  }
  return kinds;
}

export function foundryRulesSentence(preset) {
  const fixedLauncher = preset?.rules?.launcher?.fixed === true;
  const launcher = fixedLauncher
    ? 'The shot stays on the printed origin, yaw, elevation, and power.'
    : 'Origin, yaw, elevation, and power can change inside the rail stops.';
  const kinds = foundryMovableKinds(preset);
  const pieces = kinds.length
    ? `${capitalize(kindList(kinds))} can move.`
    : 'The pieces stay where they are.';
  const goalKind = preset?.rules?.goal?.kind;
  const goal = goalKind === 'first-ground-zone'
    ? 'The gold circle judges the first landing, and the landing is not a score.'
    : goalKind === 'none'
      ? 'There is no circle and no score. The line ends on first ground, or when the ball settles.'
      : '';
  return [launcher, pieces, goal].filter(Boolean).join(' ');
}

export function foundryPlayCopy(manifest, preset) {
  const rules = foundryRulesSentence(preset);
  return {
    heading: manifest.name,
    invitation: manifest.invitation,
    rules,
    playNotice: `${manifest.invitation} ${rules}`,
  };
}

/** Unchanged Musical Workshop card. A foundry world does not use this heading. */
export function musicalWorkshopPlayCard() {
  return {
    heading: 'Musical Workshop',
    body: 'The ramp, bank, and plate can move and ring. Origin, yaw, elevation, and power can change, inside the rail stops. No score. The earlier trail is the one that was recorded.',
  };
}

function pointInFootprint(foot, x, z) {
  const dx = x - foot.x;
  const dz = z - foot.z;
  const alongX = dx * foot.ux.x + dz * foot.ux.z;
  const alongZ = dx * foot.uz.x + dz * foot.uz.z;
  return Math.abs(alongX) <= foot.halfX + 1e-6 && Math.abs(alongZ) <= foot.halfZ + 1e-6;
}

/**
 * A settled rest whose centre sits on a raised piece. The sentence comes from
 * the final y and the piece that encloses it. A ground ending returns null.
 */
export function restingPlace(world, terminal) {
  const position = terminal?.position;
  if (terminal?.reason !== 'settled' || !Array.isArray(position) || position.length < 3) return null;
  const [x, y, z] = position;
  if (![x, y, z].every(Number.isFinite)) return null;
  const radius = RAIL_RULES.projectileRadius;
  let best = null;
  for (const object of world?.objects ?? []) {
    const prefab = WORLDCRAFT_CATALOG[object.kind];
    if (!prefab) continue;
    const foot = worldcraftFootprint(object);
    if (!pointInFootprint(foot, x, z)) continue;
    const surfaceY = prefab.centerY + prefab.height / 2;
    if (surfaceY <= 1.5) continue;
    const gap = Math.abs(y - (surfaceY + radius));
    if (gap > 0.08) continue;
    if (!best || gap < best.gap) best = { gap, kind: object.kind, x, z };
  }
  if (!best) return null;
  return {
    raised: true,
    kind: best.kind,
    x: best.x,
    z: best.z,
    sentence: `The ball came to rest up on the ${best.kind}, above the ground.`,
  };
}

/** Nearest legal carriage stop, half-metre grid, kept only inside −10..10. */
export function nearestCarriageStop(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  const nearest = Math.round(x * 2) / 2;
  if (nearest < -10 || nearest > 10) return null;
  return nearest;
}

export function deckExchangeSentence(contacts) {
  const tee = (Array.isArray(contacts) ? contacts : []).find(row => row?.body === 'worldcraft-tee' && row.point && Number.isFinite(row.point.x));
  if (!tee) return null;
  const x = tee.point.x;
  const nearest = Math.round(x * 2) / 2;
  const shownX = x.toFixed(2);
  if (nearest < -10 || nearest > 10) return `Deck contact at x ${shownX}. That landing is outside the carriage stops.`;
  const stop = Number.isInteger(nearest) ? String(nearest) : nearest.toFixed(1);
  return `Deck contact at x ${shownX}. The nearest carriage stop is ${stop}. The next launch starts from here.`;
}

/**
 * A line that touched two faces and came back toward the carriage without
 * landing on the deck. The distance is from the terminal to the carriage.
 */
export function returnReadout(world, contacts, terminal, setup) {
  if (!terminal?.position || !setup || !Number.isFinite(setup.originX)) return null;
  const list = Array.isArray(contacts) ? contacts : [];
  if (list.some(row => row?.body === 'worldcraft-tee')) return null;
  const ids = [];
  for (const row of list) {
    if (typeof row?.body !== 'string' || !row.body.startsWith('worldcraft-object-')) continue;
    const id = row.body.slice('worldcraft-object-'.length);
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length < 2) return null;
  const pieces = ids.map(id => world?.objects?.find(object => object.id === id)).filter(Boolean);
  if (pieces.length < 2) return null;
  const [x, , z] = terminal.position;
  if (![x, z].every(Number.isFinite)) return null;
  if (pieces.some(piece => !(z < piece.z))) return null;
  const distance = Math.hypot(x - setup.originX, z);
  const faces = ids.length === 2 ? 'Both faces were touched.' : `${ids.length} faces were touched.`;
  const xs = [...pieces.map(piece => piece.x), x];
  const zs = [...pieces.map(piece => piece.z), z];
  return {
    sentence: `${faces} The ball came back to ${distance.toFixed(1)} m from the carriage.`,
    frame: {
      x: xs.reduce((sum, item) => sum + item, 0) / xs.length,
      z: zs.reduce((sum, item) => sum + item, 0) / zs.length,
      radius: 56,
      elevation: 0.9,
      angle: 0.45,
    },
  };
}

export function foundryOutcomeSentence(last) {
  const goal = last?.goalResult;
  if (goal?.kind === 'first-ground-zone') {
    if (goal.status === 'clear' || goal.status === 'miss') {
      const where = goal.status === 'clear' ? 'Inside the circle' : 'Outside the circle';
      const metres = Number.isFinite(goal.distance) ? ` · ${goal.distance.toFixed(1)} m from centre` : '';
      return `${where}${metres}.`;
    }
    return 'No landing in the circle.';
  }
  const reason = last?.terminal?.reason ?? last?.reason;
  if (reason === 'first-ground-contact') return 'First ground ended the line.';
  return `The line ended: ${String(reason ?? 'ended').replaceAll('-', ' ')}.`;
}

/**
 * Which authored receipt this loaded foundry world may show.
 * The id is the manifest id. A contact pattern never selects a receipt.
 */
export function foundryReceiptKind(foundryId) {
  if (foundryId === 'bell-loft') return 'rest';
  if (foundryId === 'return-address') return 'deck';
  if (foundryId === 'right-angle') return 'return';
  return null;
}

export function foundryReceiptParts(foundryId, world, last) {
  const kind = foundryReceiptKind(foundryId);
  const terminal = last?.terminal ?? (last?.reason ? { reason: last.reason, position: last.position } : null);
  const rest = kind === 'rest' ? restingPlace(world, terminal)?.sentence ?? null : null;
  const deck = kind === 'deck' ? deckExchangeSentence(last?.contacts) ?? null : null;
  const back = kind === 'return' ? returnReadout(world, last?.contacts, terminal, last?.setup)?.sentence ?? null : null;
  return { rest, deck, back };
}

export function foundryReceiptLines(world, last, foundryId) {
  const parts = foundryReceiptParts(foundryId, world, last);
  return [parts.rest, parts.deck, parts.back].filter(Boolean);
}

export function foundryShotNotice(last, preset) {
  return [foundryOutcomeSentence(last), foundryRulesSentence(preset), ...foundryReceiptLines(last?.world, last, preset?.id)].join(' ');
}

// Worlds whose finished shot is shown from a side survey orbit. The follow camera ends
// between their two walls, where a wall face fills the view. Keyed on the manifest id,
// like the receipts. Other worlds keep the camera they had.
const SIDE_RESULT = new Set(['descending-resonance', 'descending-resonance-flat']);

/** Low and to one side of the pieces the shot touched, so heights and the gap between walls read. */
function sideResultFrame(world, contacts) {
  const touched = (Array.isArray(contacts) ? contacts : [])
    .filter(row => typeof row?.body === 'string' && row.body.startsWith('worldcraft-object-') && Number.isFinite(row.point?.x) && Number.isFinite(row.point?.z))
    .map(row => row.point);
  const points = touched.length ? touched : (world?.objects ?? []).map(object => ({ x: object.x, z: object.z }));
  if (!points.length) return null;
  const mid = values => (Math.min(...values) + Math.max(...values)) / 2;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  return { view: 'survey', x: clamp(mid(points.map(point => point.x)), -30, 30), z: clamp(mid(points.map(point => point.z)), 0, 100), radius: 48, elevation: 0.32, angle: 0.95 };
}

/** Survey orbit for the world that owns the receipt. Other worlds keep the camera they had. */
export function resultFraming(world, record, foundryId) {
  if (SIDE_RESULT.has(foundryId)) return sideResultFrame(world, record?.contacts);
  const kind = foundryReceiptKind(foundryId);
  if (kind === 'rest') {
    const place = restingPlace(world, record?.terminal);
    // High and in front of the piece, so a closed loft is seen from above its walls.
    if (place?.raised) return { view: 'survey', x: place.x, z: place.z, radius: 40, elevation: 1.15, angle: 0.55 };
  }
  if (kind === 'return') {
    const back = returnReadout(world, record?.contacts, record?.terminal, record?.setup);
    if (back?.frame) return { view: 'survey', ...back.frame };
  }
  return null;
}
