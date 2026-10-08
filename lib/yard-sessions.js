import { COURTYARD_HOLES } from './courtyard.js';
import { SHOT_LIBRARY_KEY } from './shot-library.js';
import { normalizeHoleRecord } from './rail-golf-v02.js';

export const YARD_SESSIONS_PROGRESS_KEY = 'rail-golf-yard-sessions-v1';
export const YARD_SESSIONS_LIBRARY_SUFFIX = '-yard-sessions-v1';
export const YARD_SESSIONS_LIBRARY_KEY = SHOT_LIBRARY_KEY + YARD_SESSIONS_LIBRARY_SUFFIX;
export const YARD_SESSIONS_SURVEY_DATABASE = 'rail-golf-yard-sessions-survey';
export const YARD_SESSIONS_MESSAGE = 'This link is not a valid lab session.';
// Ruling-only. The roost cylinder in COURTYARD_TARGETS stays radius 5.
export const YARD_SESSION_NEST_RADIUS = 1.5;
// Shared by both sets. The gallery card's own defaultShot stays untouched.
export const YARD_SESSION_ADDRESS = Object.freeze({ railIndex: 0, yaw: -2.5, elevation: 25 });

const GALLERY_INSTRUCTION = 'Bank A → Bank B → land in the nest at the centre of the amber roost.';
const OPEN_INSTRUCTION = 'No target. Fire any shot you like.';

export function parseYardSessionQuery(set) {
  if (set === '1' || set === '2') return { ok: true, mode: { set, dare: set === '1' } };
  return { ok: false, message: YARD_SESSIONS_MESSAGE };
}

export function yardSessionHole(set) {
  const gallery = COURTYARD_HOLES.find(hole => hole.id === 'switchback-gallery');
  if (set === '1') return Object.freeze({
    ...gallery,
    instruction: GALLERY_INSTRUCTION,
    defaultShot: YARD_SESSION_ADDRESS,
    target: Object.freeze({ ...gallery.target, radius: YARD_SESSION_NEST_RADIUS }),
  });
  if (set === '2') return Object.freeze({
    ...gallery,
    instruction: OPEN_INSTRUCTION,
    defaultShot: YARD_SESSION_ADDRESS,
    target: null,
    requiredTags: Object.freeze([]),
    perfectAvailable: false,
  });
  throw new Error(YARD_SESSIONS_MESSAGE);
}

export function yardSessionDareResult(outcome) {
  if (outcome !== 'ace') return null;
  return {
    headline: 'NEST, NO BANKS',
    detail: 'Bank A then Bank B are required, not optional. This landing does not count.',
    clear: false,
  };
}

export function yardSessionDareRecord(previous, merged, outcome) {
  if (outcome !== 'ace') return merged;
  return {
    ...merged,
    cleared: previous?.cleared === true,
    hasAce: previous?.hasAce === true,
    perfect: previous?.perfect === true,
    bestOutcome: previous?.bestOutcome ?? null,
  };
}

export function yardSessionPrefix(set) {
  return `rail-golf:yard-sessions:${set}:`;
}

export function yardSessionStorage(storage, set) {
  const prefix = yardSessionPrefix(set);
  const keys = () => Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(key => key?.startsWith(prefix));
  return {
    get length() { return keys().length; },
    key: index => keys()[index]?.slice(prefix.length) ?? null,
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
    clear() { for (const key of keys()) storage.removeItem(key); },
  };
}

export function yardSessionOwnsKey(key) {
  return key === YARD_SESSIONS_PROGRESS_KEY
    || key === YARD_SESSIONS_LIBRARY_KEY
    || key.startsWith(yardSessionPrefix('1'))
    || key.startsWith(yardSessionPrefix('2'));
}

const PRODUCTION_KEYS = new Set([
  'rail-golf-timber-courtyard-v01',
  'rail-golf-delivery-routes-v1',
  'rail-golf-delivery-routes-v2',
  'rail-golf-mechanism-range-v03',
  'rail-golf-line-lab-v1',
  'rail-golf-linecraft-v1',
  'rail-golf-intent-v1',
  'rail-golf-timber-receiver-v1',
  'rail-golf-courtyard-diverter-v2',
  'rail-golf-diverter-lab-v1',
  'rail-golf-shot-library-v1',
  'rail-golf-shot-library-v1-yard',
  'rail-golf-shot-library-v1-range',
  'rail-golf-shot-library-v1-line-lab-v1',
  'rail-golf-shot-library-v1-linecraft-v1',
  'rail-golf-shot-library-v1-intent-v1',
  'rail-golf-shot-library-v1-timber-receiver-v1',
  'rail-golf-shot-library-v1-courtyard-diverter-v2',
  'rail-golf-shot-library-v1-diverter',
]);

export function yardSessionKeyCollides(key) {
  if (typeof key !== 'string' || yardSessionOwnsKey(key)) return false;
  if (PRODUCTION_KEYS.has(key)) return true;
  if (key.startsWith('rail-golf:line-survey:')) return true;
  if (key.startsWith('rail-golf:line-actions:')) return true;
  if (key.startsWith('rail-golf-shot-library-v1')) return true;
  if (key.startsWith('rail-golf-delivery-routes-')) return true;
  return false;
}

function setBucket(raw) {
  if (!raw || raw.version !== 1 || !raw.sets || typeof raw.sets !== 'object') return {};
  return { ...raw.sets };
}

export function readYardSessionRecords(raw, set, holes) {
  const records = {};
  const bucket = setBucket(raw)[set];
  if (!bucket || typeof bucket !== 'object') return records;
  for (const hole of holes) {
    const stored = bucket[hole.id];
    if (!stored || stored.set !== set) continue;
    const candidate = normalizeHoleRecord(stored);
    if (candidate) records[hole.id] = candidate;
  }
  return records;
}

export function writeYardSessionProgress(previous, set, records) {
  const sets = setBucket(previous);
  const bucket = {};
  for (const [id, record] of Object.entries(records ?? {})) if (record) bucket[id] = { ...record, set };
  sets[set] = bucket;
  return { version: 1, sets };
}

export function readYardSessionLibrary(raw, set, holeId) {
  const shelf = setBucket(raw)[set]?.[holeId];
  if (!shelf || typeof shelf !== 'object') return { version: 1, holes: {} };
  const keep = line => line && line.set === set;
  return {
    version: 1,
    holes: {
      [holeId]: {
        recent: Array.isArray(shelf.recent) ? shelf.recent.filter(keep) : [],
        wins: Array.isArray(shelf.wins) ? shelf.wins.filter(keep) : [],
      },
    },
  };
}

export function writeYardSessionLibrary(previous, set, holeId, shelf) {
  const sets = setBucket(previous);
  const bucket = { ...(sets[set] && typeof sets[set] === 'object' ? sets[set] : {}) };
  const stamp = line => line ? { ...line, set } : line;
  bucket[holeId] = {
    recent: Array.isArray(shelf?.recent) ? shelf.recent.map(stamp) : [],
    wins: Array.isArray(shelf?.wins) ? shelf.wins.map(stamp) : [],
  };
  sets[set] = bucket;
  return { version: 1, sets };
}
