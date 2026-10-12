// Route-only record for /lab/pallet-carry.
// The rebound flip is shared. The only arm difference is the pallet after
// Adjust (including Ghost-from-result) and after a station change.
import {resultView} from './yard-place.js';
import {scoreLine} from './line-score.js';

export const STORAGE_PREFIX = 'rail-golf:pallet-carry:';
export const SURVEY_DATABASE = 'rail-golf:pallet-carry:survey';
export const EXPORT_FILENAME = 'pallet-carry.json';
export const ROUTE = '/lab/pallet-carry';
export const FRESH_POWER = 0.5;
export const REQUIRED_SHOTS = 12;
export const STATION_SHOT = 8;

const KNOWN = Object.freeze(['h7c2n5', 'm4p8k1']);
const KEEPS_END = new Set(['h7c2n5']);
const UNLOCKED = new Set(['retry-interrupted', 'interrupted', 'unresolved']);
const LETTER = new Set(['A', 'B']);

export const COPY = Object.freeze({
  standing: 'A solid rebound off the pallet can change it, once per shot. A scrape does not. Recall restores a recorded line\'s starting pallet.',
  brief: 'Let every shot finish. Do not press Retry while a ball is in flight.',
  adjustToast: 'Aim and exact power restored.',
  retryNotice: 'Last setup restored. Current pallet state preserved.',
  stationToast: 'Fresh setup. PALLET {letter}.',
  status: 'This shot started {start} and ended {end}.',
  adjustInstruction: 'To set up the next shot, press Adjust Last Line.',
  stationInstruction: 'Change to the other station now.',
  continuation: 'The shots this session asked for are done. You can fire more if you want, or stop. Either is fine.',
  planPrompt: 'Write one line starting PLAN: saying what you are going for with the shot you are about to fire. If you have no particular aim, write PLAN: no particular aim. Both are completely fine.',
  adjustLabel: 'Adjust Last Line',
});

export function readPalletCarry(value) {
  if (typeof value !== 'string' || !KNOWN.includes(value)) return null;
  return value;
}

export function keepsEndPallet(code) {
  return KEEPS_END.has(code);
}

export function oppositePallet(state) {
  if (!LETTER.has(state)) throw new Error('Invalid pallet state');
  return state === 'A' ? 'B' : 'A';
}

export function statusSentence(start, end) {
  if (!LETTER.has(start) || !LETTER.has(end)) throw new Error('Invalid pallet letters');
  return COPY.status.replace('{start}', start).replace('{end}', end);
}

export function stationToast(letter) {
  if (!LETTER.has(letter)) throw new Error('Invalid pallet letters');
  return COPY.stationToast.replace('{letter}', letter);
}

export const STATUS_SENTENCES = Object.freeze(['A', 'B'].flatMap(start => ['A', 'B'].map(end => statusSentence(start, end))));

export function addedCopy() {
  return [
    COPY.standing,
    COPY.brief,
    COPY.adjustToast,
    COPY.retryNotice,
    stationToast('A'),
    stationToast('B'),
    ...STATUS_SENTENCES,
    COPY.adjustInstruction,
    COPY.stationInstruction,
    COPY.continuation,
    COPY.planPrompt,
    COPY.adjustLabel,
  ];
}

const BANNED = Object.freeze([
  ['treatment', /\btreatment\b/i],
  ['predicted', /\bpredicted\b/i],
  ['aim here', /\baim here\b/i],
  ['you should', /\byou should\b/i],
  ['try', /\btry\b/i],
  ['persist', /\bpersist\b/i],
  ['wipe', /\bwipe\b/i],
]);

export function bannedInAddedCopy(lines = addedCopy()) {
  const hits = [];
  for (const line of lines) {
    for (const [word, pattern] of BANNED) if (pattern.test(line)) hits.push({word, line});
  }
  return hits;
}

export function palletCarryStorage(storage) {
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

// Switch flush may already have moved the pallet. A qualified rebound applies
// one flip only when the plate has not flipped this shot, and only at lock.
export function lockPallet({launch, switchFlipped, qualifiedRedirect}) {
  if (!LETTER.has(launch)) throw new Error('Invalid pallet state');
  const events = [];
  let end = launch;
  if (switchFlipped) {
    end = oppositePallet(launch);
    events.push({cause: 'switch-plate', palletBefore: launch, palletAfter: end, applied: true});
  }
  if (qualifiedRedirect) {
    if (switchFlipped) events.push({cause: 'qualified-rebound', palletBefore: launch, palletAfter: end, applied: false});
    else {
      end = oppositePallet(launch);
      events.push({cause: 'qualified-rebound', palletBefore: launch, palletAfter: end, applied: true});
    }
  }
  const path = switchFlipped && qualifiedRedirect ? 'both' : switchFlipped ? 'switch' : qualifiedRedirect ? 'pallet' : 'none';
  return {end, path, flipEvents: events};
}

export function palletAfterLeave({keepsEnd, leave, start, end, current, recordedStart}) {
  if (leave === 'adjust' || leave === 'ghost-from-result') return keepsEnd ? end : start;
  if (leave === 'station') return keepsEnd ? end : 'A';
  if (leave === 'retry') return current;
  if (leave === 'recall' || leave === 'restore' || leave === 'share') return recordedStart;
  return current;
}

export function orderedContacts(ledger) {
  return (ledger ?? []).filter(event => event.kind === 'contact').map(event => ({
    surface: event.surface ?? null,
    feature: event.feature ?? null,
    body: event.body ?? null,
  }));
}

export function qualifiedEvents(ledger) {
  return (ledger ?? []).filter(event => event.kind === 'redirect').map(event => ({
    label: event.label ?? null,
    feature: event.feature ?? null,
  }));
}

export function resultChrome(shot) {
  const stationChangeNodeVisible = Boolean(shot?.resolved && shot.atFirstStation && shot.resolvedAtFirstStation === STATION_SHOT);
  const continuationBannerVisible = Boolean(shot?.resolved && shot.resolvedCount >= REQUIRED_SHOTS);
  return {
    stationChangeNodeVisible,
    continuationBannerVisible,
    adjustSentence: Boolean(shot?.resolved) && !stationChangeNodeVisible,
    stationChangeOnly: stationChangeNodeVisible,
  };
}

function hasPlan(text) {
  return typeof text === 'string' && /plan:/i.test(text);
}

function inWindow(shot) {
  return hasPlan(shot.planText) && Boolean(shot.addressReadyAt && shot.planAt && shot.firedAt)
    && shot.planAt >= shot.addressReadyAt && shot.planAt <= shot.firedAt;
}

export function poolFor(shot, parent, firstStation) {
  if (!shot.resolved) return 'interrupted';
  if (shot.lineNumber > REQUIRED_SHOTS) return 'voluntary';
  if (!inWindow(shot)) return 'out-of-window';
  const leave = parent?.leaveAction ?? null;
  if (leave === 'retry') return 'retry-leave';
  if (leave === 'ghost-from-result') return 'ghost-from-result';
  if (leave === 'recall' || leave === 'restore' || leave === 'share') return 'restore-leave';
  const changed = Boolean(parent && parent.launchPallet !== parent.endPallet);
  const sameStation = Boolean(parent && parent.station === shot.station);
  if (firstStation && shot.station !== firstStation) {
    if (parent && parent.station !== shot.station) return 'carry';
    if (leave === 'adjust' && changed && sameStation) return 'carry';
    return 'pre-change';
  }
  if (leave === 'adjust' && changed && sameStation) return 'primary';
  return 'pre-change';
}

function copyShot(shot) {
  return {
    ...shot,
    setup: {...shot.setup},
    terminal: {...shot.terminal},
    flipEvents: shot.flipEvents.map(event => ({...event})),
    contacts: shot.contacts.map(contact => ({...contact})),
    qualifiedEvents: shot.qualifiedEvents.map(event => ({...event})),
    claimIds: [...shot.claimIds],
    leaves: shot.leaves.map(leave => ({...leave})),
  };
}

export function createCarryRecord({code, build}) {
  if (readPalletCarry(code) == null) throw new Error('Unknown pallet-carry code');
  const shots = [];
  let pendingAddressAt = null;
  let pendingPlan = {text: '', at: null};
  let pendingFiredAt = null;
  let fps = null;
  let viewport = null;
  let stationChangePromptShownAt = null;
  let continuationShownAt = null;
  const reasons = new Set();

  const resolved = () => shots.filter(shot => shot.resolved);
  const firstStation = () => resolved()[0]?.station ?? null;
  const lastResolved = () => resolved().at(-1) ?? null;

  const flagStationLeaves = shot => {
    if (!shot?.stationChangeNodeVisible) return;
    const names = new Set(shot.leaves.map(leave => leave.action));
    const adjustLike = names.has('adjust') || names.has('ghost-from-result');
    if (adjustLike) reasons.add('adjust-on-station-result');
    if (adjustLike && names.has('station')) reasons.add('adjust-and-station');
  };

  return {
    lastResolved,
    stationChangePending() {
      const shot = shots.at(-1);
      return Boolean(shot?.stationChangeNodeVisible && !shot.leaves.some(leave => leave.action === 'station'));
    },
    noteAddressReady(at) {
      if (!pendingAddressAt) pendingAddressAt = at;
    },
    notePlan(text, at) {
      pendingPlan = {text: text ?? '', at: at ?? pendingPlan.at};
    },
    armShot({planText, planAt, firedAt}) {
      pendingPlan = {text: planText ?? '', at: planAt ?? null};
      pendingFiredAt = firedAt ?? null;
    },
    notePrompt(kind, at) {
      if (kind === 'station' && !stationChangePromptShownAt) stationChangePromptShownAt = at;
      if (kind === 'continuation' && !continuationShownAt) continuationShownAt = at;
    },
    noteLeave(action, at, palletAtNextAddress) {
      const shot = shots.at(-1);
      if (!shot) return false;
      shot.leaves.push({action, at, palletAtNextAddress});
      shot.leaveAction = action;
      shot.leaveAt = at;
      shot.palletAtNextAddress = palletAtNextAddress;
      flagStationLeaves(shot);
      return true;
    },
    lock(input) {
      const termination = input.termination;
      const unlocked = UNLOCKED.has(termination);
      const priorResolved = resolved();
      const lineNumber = unlocked ? null : priorResolved.length + 1;
      const station = input.station === 'lumber' ? 'lumber' : 'gate';
      const first = firstStation() ?? (unlocked ? null : station);
      const atFirst = !unlocked && first === station;
      const resolvedAtFirst = priorResolved.filter(shot => shot.station === first).length + (atFirst ? 1 : 0);
      const resolvedCount = priorResolved.length + (unlocked ? 0 : 1);
      const chrome = resultChrome({
        resolved: !unlocked,
        atFirstStation: atFirst,
        resolvedAtFirstStation: resolvedAtFirst,
        resolvedCount,
      });
      const decision = input.decision;
      const view = resultView({stationId: station, terminal: input.terminal, ledger: input.ledger ?? [], q: true});
      const receipt = scoreLine(input.ledger ?? []);
      const switchContact = (input.ledger ?? []).some(event => event.kind === 'switch-use' || (event.kind === 'contact' && event.body === 'kicker-switch'));
      const qualifiedPalletRedirect = (input.ledger ?? []).some(event => event.kind === 'redirect' && event.feature === 'kicker-pallet');
      const shot = {
        armCode: code,
        build,
        station,
        lineNumber,
        resolved: !unlocked,
        setup: {
          yaw: input.setup.yaw,
          elevation: input.setup.elevation,
          charge: input.setup.charge,
          rail: input.setup.rail,
          origin: input.setup.origin,
        },
        launchPallet: input.launchPallet,
        endPallet: decision.end,
        changePath: decision.path,
        flipEvents: decision.flipEvents.map(event => ({...event})),
        contacts: orderedContacts(input.ledger),
        qualifiedEvents: qualifiedEvents(input.ledger),
        claimIds: [...receipt.claimIds],
        qualifiedPalletRedirect,
        switchContact,
        engage: qualifiedPalletRedirect || switchContact,
        terminal: {
          x: input.terminal.point.x,
          y: input.terminal.point.y,
          z: input.terminal.point.z,
          surface: input.terminal.surface ?? null,
          reason: input.terminal.reason,
        },
        sequence: view.sequence,
        ending: view.endingLine,
        statusSentence: statusSentence(input.launchPallet, decision.end),
        leaves: [],
        leaveAction: null,
        leaveAt: null,
        palletAtNextAddress: null,
        stationChangeNodeVisible: chrome.stationChangeNodeVisible,
        continuationBannerVisible: chrome.continuationBannerVisible,
        adjustSentence: chrome.adjustSentence,
        planText: pendingPlan.text ?? '',
        planAt: pendingPlan.at,
        addressReadyAt: pendingAddressAt,
        firedAt: pendingFiredAt,
        termination,
        rulingLockAt: input.at,
        attemptId: input.attemptId ?? null,
      };
      shots.push(shot);
      pendingAddressAt = null;
      pendingPlan = {text: '', at: null};
      pendingFiredAt = null;
      return copyShot(shot);
    },
    setSession({fps: nextFps, viewport: nextViewport} = {}) {
      if (nextFps != null) fps = nextFps;
      if (nextViewport) viewport = {width: nextViewport.width, height: nextViewport.height};
    },
    exportDocument() {
      const first = firstStation();
      const exported = shots.map(shot => {
        const index = shots.indexOf(shot);
        const parent = [...shots.slice(0, index)].reverse().find(item => item.resolved) ?? null;
        return {...copyShot(shot), pool: poolFor(shot, parent, first), inWindow: inWindow(shot)};
      });
      const inFlightRetries = exported.filter(shot => !shot.resolved).length;
      if (inFlightRetries > 2) reasons.add('in-flight-retries');
      const missingPlans = exported.filter(shot => shot.resolved && shot.lineNumber != null && shot.lineNumber <= REQUIRED_SHOTS && !hasPlan(shot.planText)).length;
      if (missingPlans > 3) reasons.add('missing-plan');
      return {
        fps,
        viewport,
        station_change_prompt_shown_at: stationChangePromptShownAt,
        continuation_shown_at: continuationShownAt,
        deliveryFailed: reasons.size > 0,
        deliveryReasons: [...reasons],
        shots: exported,
      };
    },
  };
}
