import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {
  COPY, EXPORT_FILENAME, FRESH_POWER, REQUIRED_SHOTS, ROUTE, STATUS_SENTENCES, STATION_SHOT, STORAGE_PREFIX, SURVEY_DATABASE,
  addedCopy, bannedInAddedCopy, createCarryRecord, keepsEndPallet, lockPallet, oppositePallet, palletAfterLeave,
  palletCarryStorage, readPalletCarry, resultChrome, stationToast, statusSentence,
} from '../lib/pallet-carry.js';
import {
  CODER_FACE_LINE, classifyNamedState, coderPacket, falseStateReference, namedFace, packetLeaks, redactPlan, screenCall,
} from '../lib/pallet-carry-coding.js';
import {BAND} from '../lib/yard-place.js';
import {floorForAction} from '../lib/diverter-lab.js';
import {returnLabToSetup} from '../lib/lab-controls.js';
import {KICKER_PALLET, KICKER_STATES, KICKER_SWITCH} from '../lib/kicker-pallet.js';
import {decodeShareLine, encodeShareLine, restoreShareLine} from '../lib/share-line.js';
import {chargeToSpeed} from '../lib/rail-golf-v02.js';

const TREATMENT = 'h7c2n5';
const CONTROL = 'm4p8k1';
const E6 = '10c97d03887eac32e77f26ca985b470c9e46a1ff';
const MAIN = 'cd9d41ddf6349b47e8d0035fd1707299ac255d55';
const source = readFileSync(new URL('../app/manners-game.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/lab/pallet-carry/page.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../app/pallet-carry-card.tsx', import.meta.url), 'utf8');

const blob = sha => path => execFileSync('git', ['rev-parse', `${sha}:${path}`], {encoding: 'utf8'}).trim();
const atE6 = blob(E6);
const atMain = blob(MAIN);

function memoryStorage() {
  const values = new Map();
  return {
    values,
    api: {
      get length() { return values.size; },
      key(index) { return [...values.keys()][index] ?? null; },
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
  };
}

function decision(launch, path) {
  return lockPallet({
    launch,
    switchFlipped: path === 'switch' || path === 'both',
    qualifiedRedirect: path === 'pallet' || path === 'both',
  });
}

function ledgerFor(path) {
  return [
    ...(path === 'pallet' || path === 'both' ? [{kind: 'redirect', feature: 'kicker-pallet', label: 'KICKER PALLET REBOUND', surface: 'floor-a'}] : []),
    ...(path === 'switch' || path === 'both' ? [{kind: 'contact', surface: 'machine', feature: null, body: 'kicker-switch'}, {kind: 'switch-use', state: 'B'}] : []),
    {kind: 'contact', surface: 'floor-a', feature: 'kicker-pallet', body: 'kicker-bounce-floor'},
    {kind: 'termination', reason: 'ground-contact'},
    {kind: 'ruling', label: 'LINE ENDED'},
  ];
}

function fire(record, over = {}) {
  const launch = over.launch ?? 'A';
  const path = over.path ?? 'pallet';
  const stamp = over.stamp ?? '2026-10-12T00:00:00.000Z';
  record.noteAddressReady(over.address ?? stamp);
  record.armShot({planText: over.plan ?? 'PLAN: the mill', planAt: over.planAt ?? stamp, firedAt: over.fired ?? stamp});
  return record.lock({
    termination: over.termination ?? 'ground-contact',
    station: over.station ?? 'gate',
    setup: {yaw: 1, elevation: 20, charge: 0.5, rail: 1, origin: 0, ...over.setup},
    launchPallet: launch,
    decision: over.decision ?? decision(launch, path),
    terminal: {reason: over.termination ?? 'ground-contact', surface: 'ground', point: {x: 1, y: 0.2, z: 40}},
    ledger: over.ledger ?? ledgerFor(path),
    at: over.at ?? stamp,
    attemptId: over.attemptId ?? null,
  });
}

test('opaque codes validate, and only one keeps the end pallet', () => {
  assert.equal(readPalletCarry(TREATMENT), TREATMENT);
  assert.equal(readPalletCarry(CONTROL), CONTROL);
  assert.equal(readPalletCarry(undefined), null);
  assert.equal(readPalletCarry(''), null);
  assert.equal(readPalletCarry('h7c2n5 '), null);
  assert.equal(keepsEndPallet(TREATMENT), true);
  assert.equal(keepsEndPallet(CONTROL), false);
  assert.equal(keepsEndPallet(null), false);
  assert.equal(ROUTE, '/lab/pallet-carry');
  assert.equal(EXPORT_FILENAME, 'pallet-carry.json');
  assert.equal(SURVEY_DATABASE, 'rail-golf:pallet-carry:survey');
  assert.equal(STORAGE_PREFIX, 'rail-golf:pallet-carry:');
  assert.equal(FRESH_POWER, 0.5);
  assert.equal(REQUIRED_SHOTS, 12);
  assert.equal(STATION_SHOT, 8);
  assert.equal(page.includes(CONTROL) || page.includes(TREATMENT), false);
  assert.match(page, /link not valid/);
  assert.doesNotMatch(page + card, /\btreatment\b|\bcontrol\b|data-arm/);
  assert.equal(addedCopy().some(line => /\btreatment\b/i.test(line)), false);
  assert.equal(source.includes("from '@/lib/pallet-carry-coding'") || source.includes('pallet-carry-coding'), false);
  assert.equal(page.includes('pallet-carry-coding'), false);
  assert.equal(card.includes('pallet-carry-coding'), false);
});

test('added copy keeps the banned words out, and Retry is not try', () => {
  assert.deepEqual(bannedInAddedCopy(), []);
  assert.deepEqual(STATUS_SENTENCES, [
    'This shot started A and ended A.',
    'This shot started A and ended B.',
    'This shot started B and ended A.',
    'This shot started B and ended B.',
  ]);
  assert.equal(statusSentence('A', 'B'), 'This shot started A and ended B.');
  assert.equal(COPY.adjustToast, 'Aim and exact power restored.');
  assert.equal(COPY.retryNotice, 'Last setup restored. Current pallet state preserved.');
  assert.equal(COPY.adjustLabel, 'Adjust Last Line');
  assert.equal(COPY.adjustInstruction, 'To set up the next shot, press Adjust Last Line.');
  assert.equal(COPY.stationInstruction, 'Change to the other station now.');
  assert.equal(stationToast('B'), 'Fresh setup. PALLET B.');
  assert.equal(COPY.standing.includes('→'), false);
  assert.equal(COPY.standing.includes('SHOOT SWITCH'), false);
  for (const line of addedCopy()) assert.equal(line.includes('→'), false);
  const exempt = 'Press Fire to try the line. Power control. hold the fire control to charge. landing prediction.';
  assert.deepEqual(bannedInAddedCopy([exempt, 'Retry']), [{word: 'try', line: exempt}]);
  assert.deepEqual(bannedInAddedCopy(['landing prediction']).map(hit => hit.word), []);
  assert.deepEqual(bannedInAddedCopy(['the word persist']).map(hit => hit.word), ['persist']);
  assert.deepEqual(bannedInAddedCopy(['a wipe of the card']).map(hit => hit.word), ['wipe']);
  assert.equal(bannedInAddedCopy(['treatment is named']).some(hit => hit.word === 'treatment'), true);
  assert.match(card, /COPY\.adjustLabel/);
  assert.match(card, /COPY\.adjustInstruction/);
  assert.equal(card.includes('Retry'), true);
  assert.match(card, /data-station-change="true"/);
  assert.match(card, /data-continuation="shown"/);
});

test('the rebound flips once at lock, a scrape does not, and a plate hit is not flipped again', () => {
  const pallet = lockPallet({launch: 'A', switchFlipped: false, qualifiedRedirect: true});
  assert.equal(pallet.end, 'B');
  assert.equal(pallet.path, 'pallet');
  assert.deepEqual(pallet.flipEvents, [{cause: 'qualified-rebound', palletBefore: 'A', palletAfter: 'B', applied: true}]);
  const back = lockPallet({launch: 'B', switchFlipped: false, qualifiedRedirect: true});
  assert.equal(back.end, 'A');
  assert.equal(back.path, 'pallet');
  const scrape = lockPallet({launch: 'A', switchFlipped: false, qualifiedRedirect: false});
  assert.equal(scrape.end, 'A');
  assert.equal(scrape.path, 'none');
  assert.deepEqual(scrape.flipEvents, []);
  const plate = lockPallet({launch: 'A', switchFlipped: true, qualifiedRedirect: false});
  assert.equal(plate.end, 'B');
  assert.equal(plate.path, 'switch');
  assert.equal(plate.flipEvents.filter(event => event.applied).length, 1);
  const both = lockPallet({launch: 'B', switchFlipped: true, qualifiedRedirect: true});
  assert.equal(both.end, 'A');
  assert.equal(both.path, 'both');
  assert.deepEqual(both.flipEvents.map(event => event.applied), [true, false]);
  assert.equal(oppositePallet('A'), 'B');
});

test('leaves diverge only after Adjust, Ghost-from-result, and station change', () => {
  const shared = {start: 'B', end: 'A', current: 'A', recordedStart: 'B'};
  assert.equal(palletAfterLeave({...shared, keepsEnd: false, leave: 'adjust'}), 'B');
  assert.equal(palletAfterLeave({...shared, keepsEnd: true, leave: 'adjust'}), 'A');
  assert.equal(palletAfterLeave({...shared, keepsEnd: false, leave: 'ghost-from-result'}), 'B');
  assert.equal(palletAfterLeave({...shared, keepsEnd: true, leave: 'ghost-from-result'}), 'A');
  assert.equal(palletAfterLeave({...shared, keepsEnd: false, leave: 'station'}), 'A');
  assert.equal(palletAfterLeave({...shared, keepsEnd: true, leave: 'station'}), 'A');
  const stayed = {start: 'A', end: 'B', current: 'B', recordedStart: 'A'};
  assert.equal(palletAfterLeave({...stayed, keepsEnd: false, leave: 'station'}), 'A');
  assert.equal(palletAfterLeave({...stayed, keepsEnd: true, leave: 'station'}), 'B');
  for (const keepsEnd of [false, true]) {
    assert.equal(palletAfterLeave({...stayed, keepsEnd, leave: 'retry'}), 'B');
    assert.equal(palletAfterLeave({...stayed, keepsEnd, leave: 'recall'}), 'A');
    assert.equal(palletAfterLeave({...stayed, keepsEnd, leave: 'restore'}), 'A');
    assert.equal(palletAfterLeave({...stayed, keepsEnd, leave: 'share'}), 'A');
  }
});

test('the 8th resolved shot at the first station is the only station prompt, and interrupts do not count', () => {
  const record = createCarryRecord({code: CONTROL, build: '10c97d0388'});
  fire(record, {termination: 'interrupted', path: 'none'});
  for (let i = 0; i < 7; i++) {
    const shot = fire(record, {path: i === 0 ? 'pallet' : 'none', launch: 'A'});
    assert.equal(shot.stationChangeNodeVisible, false);
    assert.equal(shot.adjustSentence, true);
    assert.equal(shot.continuationBannerVisible, false);
    assert.equal(shot.lineNumber, i + 1);
  }
  const eighth = fire(record);
  assert.equal(eighth.lineNumber, 8);
  assert.equal(eighth.stationChangeNodeVisible, true);
  assert.equal(eighth.adjustSentence, false);
  assert.equal(eighth.continuationBannerVisible, false);
  assert.equal(resultChrome({resolved: true, atFirstStation: true, resolvedAtFirstStation: 8, resolvedCount: 8}).stationChangeOnly, true);
  record.noteLeave('adjust', '2026-10-12T00:01:00.000Z', 'A');
  assert.equal(record.exportDocument().deliveryFailed, true);
  assert.ok(record.exportDocument().deliveryReasons.includes('adjust-on-station-result'));
});

test('Adjust and a station change on the 8th result fails delivery, and a station-only leave does not', () => {
  const legal = createCarryRecord({code: TREATMENT, build: '10c97d0388'});
  for (let i = 0; i < 7; i++) fire(legal, {path: 'none'});
  fire(legal, {launch: 'A', path: 'pallet'});
  assert.equal(legal.noteLeave('station', '2026-10-12T00:02:00.000Z', 'B'), true);
  assert.equal(legal.exportDocument().deliveryFailed, false);
  const both = createCarryRecord({code: CONTROL, build: '10c97d0388'});
  for (let i = 0; i < 7; i++) fire(both, {path: 'none'});
  fire(both);
  both.noteLeave('station', '2026-10-12T00:02:00.000Z', 'A');
  both.noteLeave('adjust', '2026-10-12T00:03:00.000Z', 'A');
  const reasons = both.exportDocument().deliveryReasons;
  assert.ok(reasons.includes('adjust-on-station-result'));
  assert.ok(reasons.includes('adjust-and-station'));
  const ghost = createCarryRecord({code: TREATMENT, build: '10c97d0388'});
  for (let i = 0; i < 7; i++) fire(ghost, {path: 'none'});
  fire(ghost);
  ghost.noteLeave('ghost-from-result', '2026-10-12T00:02:00.000Z', 'B');
  assert.ok(ghost.exportDocument().deliveryReasons.includes('adjust-on-station-result'));
  const retry = createCarryRecord({code: CONTROL, build: '10c97d0388'});
  for (let i = 0; i < 8; i++) fire(retry, {path: 'none'});
  retry.noteLeave('retry', '2026-10-12T00:02:00.000Z', 'A');
  assert.equal(retry.exportDocument().deliveryFailed, false);
});

test('continuation starts on the 12th resolved shot, and the export carries the shot fields', () => {
  const record = createCarryRecord({code: TREATMENT, build: '10c97d0388'});
  for (let i = 0; i < 8; i++) fire(record, {station: 'gate', path: i % 2 ? 'none' : 'pallet'});
  record.noteLeave('station', '2026-10-12T00:04:00.000Z', 'B');
  record.notePrompt('station', '2026-10-12T00:03:00.000Z');
  for (let i = 0; i < 3; i++) {
    const shot = fire(record, {station: 'lumber', path: 'none', launch: 'B', stamp: `2026-10-12T00:05:0${i}.000Z`});
    assert.equal(shot.continuationBannerVisible, false);
    assert.equal(shot.lineNumber, 9 + i);
  }
  const twelfth = fire(record, {station: 'lumber', path: 'pallet', launch: 'B'});
  assert.equal(twelfth.lineNumber, 12);
  assert.equal(twelfth.continuationBannerVisible, true);
  assert.equal(twelfth.stationChangeNodeVisible, false);
  record.notePrompt('continuation', '2026-10-12T00:06:00.000Z');
  record.notePrompt('continuation', '2026-10-12T00:07:00.000Z');
  const later = fire(record, {station: 'lumber', path: 'none', launch: 'A'});
  assert.equal(later.lineNumber, 13);
  assert.equal(later.continuationBannerVisible, true);
  const document = record.exportDocument();
  assert.equal(document.station_change_prompt_shown_at, '2026-10-12T00:03:00.000Z');
  assert.equal(document.continuation_shown_at, '2026-10-12T00:06:00.000Z');
  assert.equal(document.shots[12].pool, 'voluntary');
  const shot = document.shots[0];
  for (const key of ['lineNumber', 'station', 'setup', 'launchPallet', 'endPallet', 'changePath', 'leaveAction', 'leaveAt', 'addressReadyAt', 'terminal', 'qualifiedEvents', 'planText', 'planAt', 'flipEvents', 'contacts', 'palletAtNextAddress', 'stationChangeNodeVisible', 'continuationBannerVisible', 'qualifiedPalletRedirect', 'switchContact', 'engage', 'sequence', 'statusSentence']) {
    assert.ok(key in shot, key);
  }
  assert.equal(shot.changePath, 'pallet');
  assert.equal(shot.statusSentence, statusSentence(shot.launchPallet, shot.endPallet));
  assert.equal(shot.engage, true);
  assert.equal(document.shots[7].leaveAction, 'station');
  assert.equal(JSON.stringify(document).includes('treatment'), false);
  assert.equal(JSON.stringify(document).includes('keepsEnd'), false);
  assert.equal(shot.armCode, TREATMENT);
});

test('primary and carry pools follow the leave, and thin plan counts are flagged', () => {
  const record = createCarryRecord({code: CONTROL, build: '10c97d0388'});
  fire(record, {path: 'pallet', launch: 'A', stamp: '2026-10-12T00:00:00.000Z'});
  record.noteLeave('adjust', '2026-10-12T00:01:00.000Z', 'A');
  fire(record, {path: 'none', launch: 'A', stamp: '2026-10-12T00:01:10.000Z'});
  record.noteLeave('retry', '2026-10-12T00:02:00.000Z', 'A');
  fire(record, {path: 'pallet', launch: 'A', stamp: '2026-10-12T00:02:10.000Z'});
  record.noteLeave('ghost-from-result', '2026-10-12T00:03:00.000Z', 'A');
  fire(record, {path: 'none', launch: 'A', stamp: '2026-10-12T00:03:10.000Z'});
  fire(record, {path: 'none', launch: 'A', stamp: '2026-10-12T00:03:20.000Z', plan: 'no aim written'});
  fire(record, {path: 'none', launch: 'A', stamp: '2026-10-12T00:03:30.000Z', planAt: '2026-10-12T00:09:00.000Z', fired: '2026-10-12T00:03:30.000Z'});
  const early = record.exportDocument().shots;
  assert.equal(early[0].pool, 'pre-change');
  assert.equal(early[1].pool, 'primary');
  assert.equal(early[1].inWindow, true);
  assert.equal(early[2].pool, 'retry-leave');
  assert.equal(early[3].pool, 'ghost-from-result');
  assert.equal(early[4].pool, 'out-of-window');
  assert.equal(early[5].pool, 'out-of-window');
  const carry = createCarryRecord({code: TREATMENT, build: '10c97d0388'});
  for (let i = 0; i < 8; i++) fire(carry, {station: 'gate', path: 'pallet'});
  carry.noteLeave('station', '2026-10-12T00:04:00.000Z', 'B');
  fire(carry, {station: 'lumber', launch: 'B', path: 'pallet'});
  carry.noteLeave('adjust', '2026-10-12T00:05:00.000Z', 'A');
  fire(carry, {station: 'lumber', launch: 'A', path: 'none'});
  const pools = carry.exportDocument().shots.map(shot => shot.pool);
  assert.equal(pools[8], 'carry');
  assert.equal(pools[9], 'carry');
  for (let i = 0; i < 3; i++) fire(record, {termination: 'retry-interrupted', path: 'none', plan: ''});
  assert.ok(record.exportDocument().deliveryReasons.includes('in-flight-retries'));
  const missing = createCarryRecord({code: CONTROL, build: '10c97d0388'});
  for (let i = 0; i < 4; i++) fire(missing, {path: 'none', plan: 'looking around'});
  assert.ok(missing.exportDocument().deliveryReasons.includes('missing-plan'));
  const kept = createCarryRecord({code: CONTROL, build: '10c97d0388'});
  for (let i = 0; i < 3; i++) fire(kept, {path: 'none', plan: ''});
  assert.equal(kept.exportDocument().deliveryReasons.includes('missing-plan'), false);
});

test('a leave does not wipe the address that was just opened', () => {
  const record = createCarryRecord({code: TREATMENT, build: '10c97d0388'});
  fire(record);
  record.noteAddressReady('2026-10-12T00:08:00.000Z');
  record.noteLeave('adjust', '2026-10-12T00:08:01.000Z', 'B');
  record.armShot({planText: 'PLAN: no particular aim', planAt: '2026-10-12T00:08:02.000Z', firedAt: '2026-10-12T00:08:03.000Z'});
  const next = record.lock({
    termination: 'ground-contact', station: 'gate',
    setup: {yaw: 2, elevation: 21, charge: 0.4, rail: 1, origin: 0},
    launchPallet: 'B', decision: decision('B', 'none'),
    terminal: {reason: 'ground-contact', surface: 'ground', point: {x: 0, y: 0, z: 10}},
    ledger: ledgerFor('none'), at: '2026-10-12T00:08:04.000Z',
  });
  assert.equal(next.addressReadyAt, '2026-10-12T00:08:00.000Z');
  assert.equal(next.planText, 'PLAN: no particular aim');
  assert.equal(record.exportDocument().shots[1].inWindow, true);
});

test('storage stays under the pallet-carry prefix', () => {
  const memory = memoryStorage();
  memory.api.setItem('rail-golf:linecraft:keep-hint-v1', 'seen');
  const scoped = palletCarryStorage(memory.api);
  scoped.setItem('session', '{"ok":true}');
  assert.equal(scoped.getItem('session'), '{"ok":true}');
  assert.equal(memory.api.getItem('rail-golf:pallet-carry:session'), '{"ok":true}');
  assert.equal(memory.api.getItem('rail-golf:linecraft:keep-hint-v1'), 'seen');
  scoped.clear();
  assert.equal(memory.api.getItem('rail-golf:linecraft:keep-hint-v1'), 'seen');
  assert.equal(scoped.length, 0);
});

test('named faces map tipped, raised edge, and high edge to B, and both faces need a current face', () => {
  assert.equal(CODER_FACE_LINE, 'A is level and amber. B is tilted and violet.');
  assert.equal(namedFace('the pallet is tipped'), 'B');
  assert.equal(namedFace('use the raised edge'), 'B');
  assert.equal(namedFace('play the high edge'), 'B');
  assert.equal(namedFace('tilted violet B'), 'B');
  assert.equal(namedFace('level flat amber'), 'A');
  assert.equal(namedFace('letter A'), 'A');
  assert.equal(namedFace('go for the mill'), null);
  assert.equal(namedFace('tipped rather than level'), 'B');
  assert.equal(namedFace('rather than level, the high edge'), 'B');
  assert.equal(namedFace("it's level, not the raised edge"), 'A');
  assert.equal(namedFace('both the level face and the raised edge'), null);
  assert.deepEqual(classifyNamedState('tipped', 'A', 'B'), {mark: 'end-state', letter: 'B'});
  assert.deepEqual(classifyNamedState('level', 'A', 'B'), {mark: 'start-state', letter: 'A'});
  assert.deepEqual(classifyNamedState('violet', 'A', 'A'), {mark: 'unmappable', letter: 'B'});
  assert.deepEqual(classifyNamedState('the mill'), {mark: 'unmappable', letter: null});
  assert.equal(falseStateReference('B', 'A'), true);
  assert.equal(falseStateReference('A', 'A'), false);
  assert.equal(falseStateReference(null, 'B'), false);
});

test('the copy rule deletes status sentences in any case and a near-verbatim card line', () => {
  const sequence = 'Observed contact sequence: KICKER PALLET REBOUND';
  const ending = 'Ending: LINE ENDED · IN FRONT OF THE BANKS';
  assert.equal(redactPlan('THIS SHOT STARTED A AND ENDED B. then the high edge', {sequence, ending}), 'then the high edge');
  assert.equal(redactPlan(sequence, {sequence, ending}), '');
  assert.equal(redactPlan('pallet switch tilt', {sequence, ending}), 'pallet switch tilt');
  const packet = coderPacket({plan: 'PLAN: tipped', shotNumber: 4, station: 'gate', start: 'A', end: 'B', sequence, ending});
  assert.deepEqual(Object.keys(packet), ['plan', 'shotNumber', 'station', 'start', 'end']);
  assert.equal(packetLeaks(packet).length, 0);
  assert.ok(packetLeaks({...packet, plan: 'see https://example.test'}).length > 0);
  assert.ok(packetLeaks({...packet, plan: 'this is treatment'}).length > 0);
  assert.ok(packetLeaks({...packet, plan: TREATMENT}).length > 0);
  assert.equal(packetLeaks({...packet, plan: 'hold the control'}).length, 0);
});

function arm(over = {}) {
  return {validSessions: 4, primaryPlans: 8, inhabit: 1, sessionShares: [0.2, 0.2, 0.2, 0.2], falseShare: 0, ratsWithFalseReference: 0, engageRate: 0.5, retryLeaveRate: 0, ...over};
}

test('comparison arithmetic is locked before play', () => {
  const pass = screenCall({
    kappa: 0.8,
    control: arm({inhabit: 1, primaryPlans: 10, sessionShares: [0.1, 0.1, 0.1, 0.1]}),
    treatment: arm({inhabit: 3, primaryPlans: 10, sessionShares: [0.3, 0.3, 0.3, 0.3]}),
  });
  assert.equal(pass.call, 'pass');
  assert.equal(pass.criterion1, true);
  assert.equal(pass.gapPlans, 2);
  assert.ok(pass.gapPoints >= 0.10 - 1e-12);
  assert.equal(pass.passNeedsFourSessions, true);
  const three = screenCall({
    kappa: 1,
    control: arm({inhabit: 1}),
    treatment: arm({validSessions: 3, inhabit: 4, sessionShares: [0.5, 0.5, 0.5]}),
  });
  assert.equal(three.call, 'inconclusive');
  assert.equal(three.criterion1, false);
  assert.equal(three.criterion1Numbers, false);
  const low = screenCall({
    kappa: 1,
    control: arm({inhabit: 1, primaryPlans: 20}),
    treatment: arm({inhabit: 3, primaryPlans: 20, sessionShares: [0.15, 0.15, 0.15, 0.15]}),
  });
  assert.equal(low.call, 'pass');
  assert.equal(low.floor, true);
  const floor = screenCall({kappa: 1, control: arm({inhabit: 1}), treatment: arm({inhabit: 1, sessionShares: [0.125, 0.125, 0.125, 0.125]})});
  assert.equal(floor.call, 'floor');
  assert.equal(floor.criterion1, false);
  const harm = screenCall({
    kappa: 1,
    control: arm({inhabit: 1, primaryPlans: 10, falseShare: 0}),
    treatment: arm({inhabit: 4, primaryPlans: 10, falseShare: 0.06, sessionShares: [0.4, 0.4, 0.4, 0.4]}),
  });
  assert.equal(harm.call, 'harm');
  assert.equal(harm.criterion1, false);
  const rats = screenCall({kappa: 1, control: arm(), treatment: arm({ratsWithFalseReference: 2})});
  assert.equal(rats.call, 'harm');
  const thin = screenCall({kappa: 1, control: arm({validSessions: 2, inhabit: 8, primaryPlans: 8}), treatment: arm()});
  assert.equal(thin.call, 'under-delivered');
  const harmFirst = screenCall({kappa: 1, control: arm({validSessions: 1}), treatment: arm({validSessions: 1, ratsWithFalseReference: 2})});
  assert.equal(harmFirst.call, 'harm');
  const kappa = screenCall({kappa: 0.79, control: arm({inhabit: 1, primaryPlans: 10}), treatment: arm({inhabit: 4, primaryPlans: 10, sessionShares: [0.4, 0.4, 0.4, 0.4]})});
  assert.equal(kappa.call, 'inconclusive');
  const ceiling = screenCall({kappa: 1, control: arm({inhabit: 7, primaryPlans: 10}), treatment: arm({inhabit: 9, primaryPlans: 10, sessionShares: [0.9, 0.9, 0.9, 0.9]})});
  assert.equal(ceiling.call, 'inconclusive');
  const engage = screenCall({kappa: 1, control: arm({engageRate: 0.2}), treatment: arm({engageRate: 0.41, inhabit: 1})});
  assert.equal(engage.call, 'inconclusive');
  const retry = screenCall({kappa: 1, control: arm({retryLeaveRate: 0.3}), treatment: arm({retryLeaveRate: 0.09, inhabit: 1})});
  assert.equal(retry.call, 'inconclusive');
  const none = screenCall({kappa: 1, control: arm({inhabit: 2}), treatment: arm({inhabit: 2, sessionShares: [0.25, 0.25, 0.25, 0.25]})});
  assert.equal(none.call, 'no-pass');
  assert.equal(none.floor, false);
});

test('share links for this route do not fire and restore the recorded start pallet', () => {
  const payload = {v: 2, build: '10c97d0388', world: 'timber-courtyard', route: '/lab/pallet-carry', card: 'open-line', station: 'lumber', rail: 1, yaw: 23, elevation: 20, speed: chargeToSpeed(0.75), originX: 0, environment: {floor: 'B'}};
  const restored = restoreShareLine(decodeShareLine(encodeShareLine(payload)), '10c97d0388');
  assert.equal(restored.autoFire, false);
  assert.equal(restored.environment.floor, 'B');
  assert.equal(restored.setup.originX, 0);
  assert.throws(() => encodeShareLine({...payload, v: 1, originX: undefined}));
});

test('authority files match E6 and production main, and the other-route pallet rules are untouched', () => {
  for (const path of ['lib/rail-golf-v02.js', 'lib/line-score.js', 'lib/line-recognition.js', 'lib/line-run.js', 'lib/line-lifecycle.js', 'lib/kicker-pallet.js', 'lib/lab-controls.js', 'lib/diverter-lab.js']) {
    assert.equal(atE6(path), atMain(path), path);
    assert.equal(execFileSync('git', ['hash-object', path], {encoding: 'utf8'}).trim(), atE6(path), path);
  }
  assert.equal(execFileSync('git', ['hash-object', 'lib/yard-place.js'], {encoding: 'utf8'}).trim(), atE6('lib/yard-place.js'));
  assert.equal(BAND, 2.5);
  assert.equal(KICKER_STATES.B.roll, -18);
  assert.equal(KICKER_STATES.B.yOffset, 1.53);
  assert.equal(KICKER_STATES.B.material, 'violet');
  assert.equal(KICKER_STATES.A.material, 'amber');
  assert.equal(KICKER_PALLET.x, -32);
  assert.equal(KICKER_SWITCH.x, -39);
  assert.equal(KICKER_SWITCH.y, 2.2);
  assert.equal(KICKER_SWITCH.width, 2.4);
  assert.equal(floorForAction('B', 'station'), 'B');
  assert.equal(floorForAction('B', 'reset'), 'A');
  assert.equal(floorForAction('B', 'retry'), 'B');
  let restored = null;
  returnLabToSetup('adjust', {
    interrupt() {}, cancel() {}, memory: () => ({environment: {floor: 'B'}, charge: 0.4}), environment: () => 'A',
    restoreEnvironment: state => { restored = state; }, load() {}, exactPower() {},
  });
  assert.equal(restored, 'B');
  const block = source.slice(source.indexOf('const linecraftBlock='), source.indexOf('const restoreLinecraft='));
  assert.match(block, /returnLab\('reset'\)/);
  assert.equal(block.includes('palletAfterLeave'), false);
  assert.equal(block.includes('carryKeeps'), false);
});

test('the rebound is applied at ruling lock, not while the physics step is still running', () => {
  const callback = source.slice(source.indexOf('scene.onAfterPhysicsObservable.add'), source.indexOf('if (courtyard && !lineLab)'));
  assert.equal(callback.includes('lockPallet'), false);
  assert.equal(callback.includes('carryKeeps'), false);
  assert.ok(callback.indexOf('endStep') < callback.indexOf('.flush()'));
  const ruling = source.slice(source.indexOf('const lockRuling ='), source.indexOf('const updateSetup ='));
  const locked = ruling.indexOf('flight.locked = true');
  const termination = ruling.indexOf("kind:'termination'");
  const ruled = ruling.indexOf("kind:'ruling'");
  const flip = ruling.indexOf('lockPallet');
  assert.ok(locked >= 0 && locked < termination && termination < ruled && ruled < flip);
  assert.match(source, /carryStation=/);
  assert.match(source, /selectedPowerRef\.current=\.5/);
  assert.match(source, /leave:'station'/);
  assert.equal(/\btreatment\b/.test(source), false);
  assert.match(source, /reset: \(restore\?: boolean\) => \{ if\(\(linePair \|\| palletCarry\) && restore !== true\) return/);
  assert.match(card, /showAdjust \? <button/);
  assert.match(card, /<button type="button" onClick=\{onRetry\}>Retry<\/button>/);
});

test('built pallet-carry route rejects unknown codes and serves both arms without lesson controls', {skip: existsSync(new URL('../dist/server/index.js', import.meta.url)) ? false : 'build first'}, async () => {
  const workerURL = new URL('../dist/server/index.js', import.meta.url);
  workerURL.searchParams.set('pallet-carry-test', `${process.pid}-${Date.now()}`);
  const {default: worker} = await import(workerURL.href);
  const htmlAt = async path => {
    const response = await worker.fetch(new Request('http://localhost' + path, {headers: {accept: 'text/html'}}), {ASSETS: {fetch: async () => new Response('Not found', {status: 404})}}, {waitUntil() {}, passThroughOnException() {}});
    assert.equal(response.status, 200, path);
    return response.text();
  };
  for (const path of ['/lab/pallet-carry', '/lab/pallet-carry?k=', '/lab/pallet-carry?k=nope']) {
    const html = await htmlAt(path);
    assert.match(html, /link not valid/);
    assert.doesNotMatch(html, /End \/ Export|Attempts ·/);
  }
  const pages = {};
  for (const code of [TREATMENT, CONTROL]) {
    const html = (await htmlAt('/lab/pallet-carry?k=' + code)).replaceAll('<!-- -->', '');
    pages[code] = html;
    assert.match(html, /End \/ Export/);
    assert.match(html, /Attempts · 0/);
    assert.match(html, /Let every shot finish/);
    assert.match(html, /A solid rebound off the pallet can change it/);
    assert.match(html, /FLOOR A/);
    assert.doesNotMatch(html, /Restart Lessons|Skip Lessons|Next Lesson|Explore Here|Show provisional score|Reset Card|\btreatment\b|data-arm=|class="parent-line"|Set up from/);
    assert.equal(html.includes(code === TREATMENT ? CONTROL : TREATMENT), false, 'the other code stays out of this document');
  }
  assert.equal(pages[TREATMENT].replaceAll(TREATMENT, 'CODE'), pages[CONTROL].replaceAll(CONTROL, 'CODE'));
  const pair = await htmlAt('/lab/line-pair');
  assert.match(pair, /link not valid/);
  const root = await htmlAt('/');
  assert.doesNotMatch(root, /pallet-carry|link not valid/);
});
