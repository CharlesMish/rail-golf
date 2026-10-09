// Place-naming rulings. Reads only a terminal record. It never sees contacts,
// redirects, or recognition, and it does not change a score or a ruling.
import {recognizedIntentEvents} from './intent-lab.js';

export const BAND = 2.5;
export const STORAGE_PREFIX = 'rail-golf:yard-place:';
export const EXPORT_FILENAME = 'session.json';

export const ENDING_WORD = Object.freeze({
  'ground-contact': 'FIRST KISS',
  oob: 'OUT OF BOUNDS',
  'dead-ball': 'SETTLED',
  'safety-timeout': 'SAFETY STOP',
  'invalid-physics': 'SAFETY STOP',
});

export const PLACE_VOCABULARY = Object.freeze([
  'BETWEEN THE BANKS',
  'OUTSIDE BANK A',
  'OUTSIDE BANK B',
  'IN FRONT OF THE BANKS',
  'IN FRONT OF THE SKIP PADS',
  'BEYOND THE SKIP PADS',
  'IN FRONT OF THE TREADS',
  'BEYOND THE TREADS',
  'IN FRONT OF TREAD 1',
  'BETWEEN TREADS 1 AND 2',
  'BETWEEN TREADS 2 AND 3',
  'AMONG THE LUMBER STACKS',
  'BESIDE THE MILL',
  'FAR END OF THE YARD',
  'BEHIND THE RAIL',
  'ON THE TEE',
  'MILL SIDE',
  'LUMBER SIDE',
  'BEYOND THE FAR END',
]);

const SQ2 = Math.SQRT2;
const PADS = Object.freeze([{x: 0, z: 84, hw: 6, hd: 6}, {x: -15, z: 84, hw: 6, hd: 6}]);
const TREADS = Object.freeze([
  {x: 22, z: 122, w: 12, d: 12},
  {x: 22, z: 100, w: 12, d: 16},
  {x: 22, z: 73, w: 12, d: 16},
]);
const NAMED = Object.freeze({
  'bank-a': 'BANK A',
  'bank-b': 'BANK B',
  'step-a': 'TREAD 1',
  'step-b': 'TREAD 2',
  'step-c': 'TREAD 3',
  mill: 'MILL',
});
const BANNED_WORDS = Object.freeze(['KICK', 'REJECT', 'RETURN', 'REBOUND', 'OFF', 'PAST', 'SHORT', 'LONG', 'NEAR', 'CLOSE', 'ALMOST', 'MISS', 'HIT']);
const VERBS = Object.freeze(['BE', 'IS', 'WAS', 'ARE', 'WERE', 'HIT', 'HITS', 'LAND', 'LANDS', 'LANDED', 'BOUNCE', 'BOUNCED', 'MISS', 'MISSED', 'WENT', 'GO', 'GOES', 'GOING', 'CAME', 'COME', 'SKIPPED', 'KICK', 'KICKED', 'REJECT', 'REJECTED', 'RETURN', 'RETURNED', 'REBOUND', 'REBOUNDED', 'TOUCH', 'TOUCHED', 'TOUCHES', 'PASS', 'PASSED', 'FALL', 'FELL', 'FALLEN', 'STOP', 'STOPPED', 'LEAVE', 'LEFT', 'REACH', 'REACHED', 'CARRY', 'CARRIED']);

const between = (value, lo, hi) => value >= lo && value <= hi;
const ruled = (ending, zone, place, why) => ({ending, place, zone, why});

export function placeFor(stationId, terminal) {
  const reason = terminal.reason;
  const surface = terminal.surface;
  const point = terminal.point;
  const ending = ENDING_WORD[reason] ?? 'LINE ENDED';
  const lumber = stationId === 'lumber';
  if (reason === 'dead-ball' || reason === 'safety-timeout' || reason === 'invalid-physics') {
    return ruled(ending, 'generic-' + reason, null, 'non-ground terminal never named');
  }
  const x = Number(point?.x);
  const z = Number(point?.z);
  if (reason === 'oob') {
    const side = Math.abs(x) >= 49.9;
    const far = z >= 197.9;
    const back = z <= -14.9;
    if ([side, far, back].filter(Boolean).length !== 1) return ruled(ending, 'oob-corner', null, 'corner exit');
    if (back) return ruled(ending, 'oob-back', lumber ? 'BEYOND THE FAR END' : 'BEHIND THE RAIL', 'z<-15');
    if (far) return ruled(ending, 'oob-far', lumber ? 'BEHIND THE RAIL' : 'BEYOND THE FAR END', 'z>198');
    return ruled(ending, x > 0 ? 'oob-lumber' : 'oob-mill', x > 0 ? 'LUMBER SIDE' : 'MILL SIDE', '|x|>50');
  }
  if (reason !== 'ground-contact') return ruled(ending, 'generic-' + reason, null, 'non-ground terminal never named');
  if (surface === 'tee') return ruled(ending, 'tee', lumber ? 'FAR END OF THE YARD' : 'ON THE TEE', 'tee body');
  if (surface !== 'ground') return ruled(ending, 'generic-surface', null, 'unknown surface');
  if (PADS.some(pad => Math.abs(x - pad.x) <= pad.hw + BAND && Math.abs(z - pad.z) <= pad.hd + BAND)) {
    return ruled(ending, 'pad-band', null, 'pad footprint + band');
  }
  if (Math.abs(x) > 50 - BAND) return ruled(ending, 'edge-band', null, 'yard edge band');
  if (between(z, 28 - BAND, 42 + BAND)) {
    const laneA = (x - (z - 45)) / SQ2;
    const laneB = ((z - 21) - x) / SQ2;
    const inside = between(z, 28 + BAND, 42 - BAND);
    if (inside && laneA >= BAND && laneB >= BAND) return ruled(ending, 'between-banks', 'BETWEEN THE BANKS', 'lane side of both bank centre-lines');
    if (inside && laneA <= -BAND && x >= -48) return ruled(ending, 'outside-a', 'OUTSIDE BANK A', 'far side of A');
    if (inside && laneB <= -BAND) return ruled(ending, 'outside-b', 'OUTSIDE BANK B', 'far side of B');
    return ruled(ending, 'bank-band', null, 'bank face or bank-depth band');
  }
  if (between(x, 16 + BAND, 28 - BAND)) {
    if (between(z, 108 + BAND, 116 - BAND)) return ruled(ending, 't1-t2', 'BETWEEN TREADS 1 AND 2', 'gap z 108-116');
    if (between(z, 81 + BAND, 92 - BAND)) return ruled(ending, 't2-t3', 'BETWEEN TREADS 2 AND 3', 'gap z 81-92');
  }
  if (TREADS.some(tread => Math.abs(x - tread.x) <= tread.w / 2 + BAND && Math.abs(z - tread.z) <= tread.d / 2 + BAND)) {
    return ruled(ending, 'tread-band', null, 'tread footprint + band');
  }
  if (between(x, 14, 34) && between(z, 42 + BAND, 65 - BAND)) {
    return lumber
      ? ruled(ending, 'past-treads', 'BEYOND THE TREADS', 'tread lane z 44.5-62.5')
      : ruled(ending, 'short-treads', 'IN FRONT OF THE TREADS', 'tread lane z 44.5-62.5');
  }
  if (x >= 31 && between(z, 52, 136)) return ruled(ending, 'stacks', 'AMONG THE LUMBER STACKS', 'x>=31 stack bays');
  if (x <= -22 && between(z, 74, 134)) return ruled(ending, 'mill', 'BESIDE THE MILL', 'x<=-22 mill wall run');
  if (!lumber) {
    if (z < -4.25 - BAND) return ruled(ending, 'behind', 'BEHIND THE RAIL', 'z<-6.75');
    if (between(z, 3.25 + BAND, 28 - BAND) && Math.abs(x) <= 30) return ruled(ending, 'short-banks', 'IN FRONT OF THE BANKS', 'z<25.5');
    if (between(z, 42 + BAND, 78 - BAND) && between(x, -20, 14)) return ruled(ending, 'short-pads', 'IN FRONT OF THE SKIP PADS', 'z 44.5-75.5');
    if (between(z, 90 + BAND, 150) && between(x, -20, 14)) return ruled(ending, 'past-pads', 'BEYOND THE SKIP PADS', 'z 92.5-150');
    if (z >= 152) return ruled(ending, 'far-end', 'FAR END OF THE YARD', 'z>=152');
  } else {
    if (z > 156 + BAND) return ruled(ending, 'behind', 'BEHIND THE RAIL', 'z>158.5');
    if (between(z, 128 + BAND, 152) && between(x, 8, 34)) return ruled(ending, 'short-t1', 'IN FRONT OF TREAD 1', 'z 130.5-152');
    if (between(z, 90 + BAND, 152) && between(x, -20, 16 - BAND)) return ruled(ending, 'l-short-pads', 'IN FRONT OF THE SKIP PADS', 'lumber central lane z 92.5-152');
    if (between(z, 42 + BAND, 78 - BAND) && between(x, -20, 14)) return ruled(ending, 'l-past-pads', 'BEYOND THE SKIP PADS', 'lumber central lane z 44.5-75.5');
    if (between(z, 3.25 + BAND, 28 - BAND) && Math.abs(x) <= 30) return ruled(ending, 'gate-end', 'FAR END OF THE YARD', 'z<25.5');
  }
  return ruled(ending, 'unmapped', null, 'no region');
}

export function vocabularyViolations(phrases = PLACE_VOCABULARY) {
  const problems = [];
  for (const phrase of phrases) {
    for (const word of phrase.split(/\s+/)) {
      if (BANNED_WORDS.includes(word)) problems.push(phrase + ': ' + word);
      if (VERBS.includes(word)) problems.push(phrase + ': verb ' + word);
    }
    if (/\bSKIP\b/.test(phrase) && !/\bSKIP PADS\b/.test(phrase)) problems.push(phrase + ': standalone SKIP');
    if (/\bON\b/.test(phrase) && phrase !== 'ON THE TEE') problems.push(phrase + ': ON feature');
  }
  return problems;
}

function mapEventLabel(label) {
  if (label === 'BANK A REJECT') return 'BANK A';
  if (label === 'BANK B REJECT') return 'BANK B';
  const tread = /^TREAD ([123]) KICK$/.exec(label ?? '');
  return tread ? 'TREAD ' + tread[1] : label;
}

function qualifiedBodies(ledger) {
  const ids = new Set();
  for (const event of ledger) {
    if (event.kind !== 'redirect') continue;
    for (const key of [event.surface, event.feature, ...(event.members ?? [])]) if (NAMED[key]) ids.add(key);
  }
  return ids;
}

export function sequenceLine(ledger) {
  const labels = recognizedIntentEvents(ledger).map(event => mapEventLabel(event.label));
  const qualified = qualifiedBodies(ledger);
  const seen = new Set();
  const touches = [];
  for (const event of ledger) {
    if (event.kind !== 'contact' || event.terminal) continue;
    const body = NAMED[event.surface] ? event.surface : NAMED[event.feature] ? event.feature : null;
    if (!body || qualified.has(body) || seen.has(body)) continue;
    seen.add(body);
    touches.push(NAMED[body]);
  }
  const base = labels.length ? labels.join(' → ') : 'none recognized';
  return 'Observed contact sequence: ' + base + touches.map(name => ' · touched ' + name).join('');
}

export function lifecycleBounds(point, reason) {
  if (reason === 'dead-ball' || reason === 'safety-timeout' || reason === 'invalid-physics') return [reason];
  if (reason !== 'oob' || !point) return [];
  const bounds = [];
  if (point.x < -50) bounds.push('x<-50');
  if (point.x > 50) bounds.push('x>50');
  if (point.z > 198) bounds.push('z>198');
  if (point.z < -15) bounds.push('z<-15');
  if (point.y < -8) bounds.push('y<-8');
  return bounds;
}

export function resultView({stationId, terminal, ledger, showPlace, classify = placeFor}) {
  const input = {reason: terminal.reason, surface: terminal.surface ?? null, point: terminal.point};
  const classifier = classify(stationId, input);
  const endingHead = 'Ending: ' + classifier.ending;
  const endingLine = showPlace && classifier.place ? endingHead + ' · ' + classifier.place : endingHead;
  return {
    heading: 'Your line',
    sequence: sequenceLine(ledger ?? []),
    classifier,
    endingLine,
  };
}

export function resultCardMarkup(view) {
  const esc = value => String(value).replace(/[&<>]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[char]));
  const mark = ' · ';
  const split = view.endingLine.indexOf(mark);
  const head = split < 0 ? view.endingLine : view.endingLine.slice(0, split);
  const tail = split < 0 ? '' : view.endingLine.slice(split);
  return '<section class="line-note"><h2>Your line</h2><p class="observed-line">' + esc(view.sequence) + '</p><p class="ending-line"><span class="ending-head">' + esc(head) + '</span>' + (tail ? '<span class="ending-tail">' + esc(tail) + '</span>' : '') + '</p></section>';
}

export function yardPlaceStorage(storage) {
  const keys = () => Array.from({length: storage.length}, (_, index) => storage.key(index)).filter(key => key?.startsWith(STORAGE_PREFIX));
  return {
    get length() { return keys().length; },
    key(index) { return keys()[index]?.slice(STORAGE_PREFIX.length) ?? null; },
    getItem: key => storage.getItem(STORAGE_PREFIX + key),
    setItem: (key, value) => storage.setItem(STORAGE_PREFIX + key, value),
    removeItem: key => storage.removeItem(STORAGE_PREFIX + key),
    clear() { for (const key of keys()) storage.removeItem(key); },
  };
}

export function createYardJournal(storage) {
  const box = yardPlaceStorage(storage);
  const read = () => JSON.parse(box.getItem('session') ?? '{"shots":[],"fps":null,"viewport":null}');
  return {
    filename: EXPORT_FILENAME,
    record(shot) {
      const saved = read();
      saved.shots.push(shot);
      if (shot.fps != null) saved.fps = shot.fps;
      if (shot.viewport) saved.viewport = shot.viewport;
      box.setItem('session', JSON.stringify(saved));
      return saved;
    },
    exportDocument: read,
  };
}

export function shotExport({code, build, station, setup, ledger, receipt, termination, point, classifier, endingLine, at, fps, viewport}) {
  return {
    k: code,
    build,
    station,
    setup,
    ledger,
    receipt,
    termination,
    bounds: lifecycleBounds(point, termination),
    point,
    classifier,
    endingLine,
    at,
    ...(fps != null ? {fps} : {}),
    ...(viewport ? {viewport} : {}),
  };
}
