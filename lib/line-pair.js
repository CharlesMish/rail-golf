// Paired line record for /lab/line-pair.
// Classifier and trail are frozen at studio/e4-card-proto
// 43cfbf037525543770c0b83c315a3574c532fb69 (all seven E4 place-audit fixes).
import {resultView} from './yard-place.js';

export const STORAGE_PREFIX = 'rail-golf:line-pair:';
export const SURVEY_DATABASE = 'rail-golf:line-pair:survey';
export const EXPORT_FILENAME = 'line-pair.json';
export const CLASSIFIER_SHA = '43cfbf037525543770c0b83c315a3574c532fb69';

const KNOWN = Object.freeze(['f3k9m2', 'q8r4t1']);
const WITH_PARENT = new Set(['f3k9m2']);
const UNLOCKED = new Set(['retry-interrupted', 'interrupted', 'unresolved']);
const SEQUENCE_PREFIX = 'Observed contact sequence: ';
const ENDING_PREFIX = 'Ending: ';

export function readLinePair(value) {
  if (typeof value !== 'string' || !KNOWN.includes(value)) return null;
  return value;
}

export function showsParentLine(code) {
  return WITH_PARENT.has(code);
}

export function linePairStorage(storage) {
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

export function parentLineFrom(parent, kept) {
  if (!parent || parent.lineNumber == null) return null;
  const sequence = parent.card.sequence.startsWith(SEQUENCE_PREFIX) ? parent.card.sequence.slice(SEQUENCE_PREFIX.length) : parent.card.sequence;
  const ending = parent.card.ending.startsWith(ENDING_PREFIX) ? parent.card.ending.slice(ENDING_PREFIX.length) : parent.card.ending;
  return `Set up from Line ${parent.lineNumber}${kept ? ' (kept)' : ''}: ${sequence} / ${ending}`;
}

export function parentLineSegments(text) {
  const parts = [];
  const pattern = / \/ | · /g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(match[0]);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function normalizeSetup(setup) {
  return {
    yaw: setup.yaw,
    elevation: setup.elevation,
    charge: setup.charge,
    rail: setup.rail,
    origin: setup.origin,
  };
}

export function signedSetupDelta(child, parent) {
  if (!parent) return null;
  return {
    yaw: child.yaw - parent.yaw,
    elevation: child.elevation - parent.elevation,
    charge: child.charge - parent.charge,
    rail: child.rail - parent.rail,
    origin: child.origin - parent.origin,
  };
}

function copyShot(shot) {
  return {
    armCode: shot.armCode,
    build: shot.build,
    station: shot.station,
    lineNumber: shot.lineNumber,
    relationAction: shot.relationAction,
    parentAttemptId: shot.parentAttemptId,
    setup: {...shot.setup},
    setupDelta: shot.setupDelta ? {...shot.setupDelta} : null,
    terminal: {...shot.terminal},
    card: {...shot.card},
    receipt: shot.receipt,
    termination: shot.termination,
    rulingLockAt: shot.rulingLockAt,
    leaveResult: shot.leaveResult ? {...shot.leaveResult} : null,
    inputLog: shot.inputLog.map(event => ({...event})),
    pool: shot.pool,
    attemptId: shot.attemptId,
  };
}

export function createPairRecord({code, build}) {
  if (readLinePair(code) == null) throw new Error('Unknown line-pair code');
  const shots = [];
  const byAttempt = new Map();
  let pendingInputs = [];
  let armedInputs = [];
  let fps = null;
  let viewport = null;

  return {
    shotByAttempt(id) { return byAttempt.get(id) ?? null; },
    lockedCount() { return shots.reduce((count, shot) => count + (shot.lineNumber == null ? 0 : 1), 0); },
    noteInput(event) {
      pendingInputs.push({at: event.at, source: event.source, name: event.name, control: event.control});
    },
    dropLastInput() { pendingInputs.pop(); },
    armFire() { armedInputs = pendingInputs.splice(0); },
    noteLeave(action, at) {
      const last = shots.at(-1);
      if (!last || last.leaveResult) return false;
      last.leaveResult = {action, at};
      return true;
    },
    lock(input) {
      const termination = input.termination;
      const unlocked = UNLOCKED.has(termination);
      const lineNumber = unlocked ? null : shots.reduce((count, shot) => count + (shot.lineNumber == null ? 0 : 1), 0) + 1;
      const relation = input.relation && input.relation.action ? {action: input.relation.action, attemptId: input.relation.attemptId ?? null} : null;
      const parent = relation?.attemptId ? byAttempt.get(relation.attemptId) ?? null : null;
      const parentLocked = Boolean(parent && parent.lineNumber != null);
      const kept = relation?.action === 'restore-kept';
      const view = resultView({stationId: input.station, terminal: input.terminal, ledger: input.ledger ?? [], q: true});
      const setup = normalizeSetup(input.setup);
      const record = {
        armCode: code,
        build,
        station: input.station,
        lineNumber,
        relationAction: relation?.action ?? null,
        parentAttemptId: relation?.attemptId ?? null,
        setup,
        setupDelta: parent ? signedSetupDelta(setup, parent.setup) : null,
        terminal: {
          x: input.terminal.point.x,
          y: input.terminal.point.y,
          z: input.terminal.point.z,
          surface: input.terminal.surface ?? null,
          reason: input.terminal.reason,
        },
        card: {
          sequence: view.sequence,
          ending: view.endingLine,
          parentLine: parentLocked ? parentLineFrom(parent, kept) : null,
        },
        receipt: input.receipt,
        termination,
        rulingLockAt: input.at,
        leaveResult: null,
        inputLog: armedInputs.splice(0),
        pool: unlocked ? 'INTERRUPTED' : lineNumber <= 12 ? 'REQUIRED' : 'VOLUNTARY',
        attemptId: input.attemptId ?? null,
      };
      shots.push(record);
      if (record.attemptId) byAttempt.set(record.attemptId, record);
      return copyShot(record);
    },
    setSession({fps: nextFps, viewport: nextViewport} = {}) {
      if (nextFps != null) fps = nextFps;
      if (nextViewport) viewport = {width: nextViewport.width, height: nextViewport.height};
    },
    exportDocument() {
      return {
        fps,
        viewport,
        classifierSha: CLASSIFIER_SHA,
        shots: shots.map(copyShot),
      };
    },
    visibleParent(record) {
      if (!showsParentLine(code) || !record?.card.parentLine) return null;
      return record.card.parentLine;
    },
  };
}
