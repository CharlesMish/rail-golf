import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {CLASSIFIER_SHA, EXPORT_FILENAME, STORAGE_PREFIX, SURVEY_DATABASE, createPairRecord, linePairStorage, parentLineFrom, parentLineSegments, readLinePair, showsParentLine, signedSetupDelta} from '../lib/line-pair.js';
import {resultView} from '../lib/yard-place.js';
import {recordLineReceipt} from '../lib/line-score.js';
import {encodeShareLine, decodeShareLine, restoreShareLine} from '../lib/share-line.js';

const WITH = 'f3k9m2';
const WITHOUT = 'q8r4t1';
const BASE = 'cd9d41ddf6349b47e8d0035fd1707299ac255d55';
const FROZEN = '43cfbf037525543770c0b83c315a3574c532fb69';
const source = readFileSync(new URL('../app/manners-game.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/lab/line-pair/page.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../app/line-pair-card.tsx', import.meta.url), 'utf8');
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/e4-yard-fixtures.json', import.meta.url), 'utf8'));

const blob = path => execFileSync('git', ['hash-object', path], {encoding: 'utf8'}).trim();
const committed = (sha, path) => execFileSync('git', ['rev-parse', `${sha}:${path}`], {encoding: 'utf8'}).trim();

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
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

function terminal(point, reason = 'ground-contact', surface = 'ground') {
  return {reason, surface, point};
}

function ledger(extra = []) {
  return [
    {kind: 'redirect', feature: 'bank-a', surface: 'bank-a', label: 'BANK A'},
    {kind: 'redirect', feature: 'bank-b', surface: 'bank-b', label: 'BANK B'},
    ...extra,
    {kind: 'contact', terminal: true, surface: 'ground', point: {x: 1, y: 0.2, z: 40}},
    {kind: 'termination', reason: 'ground-contact'},
  ];
}

function shotInput(over = {}) {
  const body = ledger(over.extra);
  return {
    attemptId: over.attemptId,
    station: over.station ?? 'gate',
    setup: {yaw: 0, elevation: 42, charge: 0.5, rail: 1, origin: 0, ...over.setup},
    terminal: over.terminal ?? terminal({x: 1.25, y: 0.2, z: 40.5}),
    ledger: over.ledger ?? body,
    receipt: recordLineReceipt(over.ledger ?? body),
    termination: over.termination ?? 'ground-contact',
    relation: over.relation ?? null,
    at: over.at ?? '2026-10-11T21:00:00.000Z',
  };
}

function markup(shot, parent) {
  return [
    shot.card.sequence,
    shot.card.ending,
    parent ?? '',
  ].join('\n');
}

test('opaque codes validate without an arm word, and only one shows the parent line', () => {
  assert.equal(readLinePair(WITH), WITH);
  assert.equal(readLinePair(WITHOUT), WITHOUT);
  assert.equal(readLinePair(undefined), null);
  assert.equal(readLinePair(''), null);
  assert.equal(readLinePair('1'), null);
  assert.equal(readLinePair('f3k9m2 '), null);
  assert.equal([...[WITH, WITHOUT].filter(showsParentLine)].length, 1);
  assert.equal(showsParentLine(WITH), true);
  assert.equal(showsParentLine(WITHOUT), false);
  assert.equal(CLASSIFIER_SHA, FROZEN);
  assert.equal(EXPORT_FILENAME, 'line-pair.json');
  assert.equal(SURVEY_DATABASE, 'rail-golf:line-pair:survey');
  assert.equal(STORAGE_PREFIX, 'rail-golf:line-pair:');
  assert.doesNotMatch(page, /treatment|control|f3k9m2|q8r4t1|data-arm/);
  assert.match(page, /link not valid/);
  assert.doesNotMatch(card, /treatment|control|f3k9m2|q8r4t1/);
  assert.match(card, /className="parent-line"/);
  assert.match(card, /data-export="end"/);
});

test('classifier and copied fixtures are byte-equal to the frozen proto SHA', () => {
  for (const path of [
    'lib/yard-place.js',
    'lib/yard-place.d.ts',
    'tests/yard-place.test.mjs',
    'tests/fixtures/e4-yard-fixtures.json',
    'tests/fixtures/e4-adversarial.json',
    'tests/fixtures/e4-audit-fixtures.json',
    'tests/fixtures/e4-clip-fixtures.json',
  ]) assert.equal(blob(path), committed(FROZEN, path), path);
});

test('authority files match main and the route diff does not retune physics', () => {
  for (const path of [
    'lib/rail-golf-v02.js',
    'lib/delivery-routes.js',
    'lib/line-recognition.js',
    'lib/line-lifecycle.js',
    'lib/line-run.js',
    'lib/line-score.js',
    'lib/intent-lab.js',
    'lib/linecraft-yard.js',
  ]) assert.equal(blob(path), committed(BASE, path), path);
  const diff = execFileSync('git', ['diff', '-U0', BASE, '--', 'app/manners-game.tsx', 'lib/line-pair.js', 'app/line-pair-card.tsx'], {encoding: 'utf8'});
  const added = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
  assert.equal(added.some(line => /(?:padImpulse|REDIRECT_GATES|LINE_SAFETY|RAIL_RULES|VARIETY_RULE|RUN_RULE)\s*=/.test(line)), false);
  assert.equal(added.some(line => /\btreatment\b/i.test(line) || /arm:\s*['"]control['"]/.test(line)), false);
  const helper = execFileSync('git', ['diff', '-U0', BASE, '--', 'tests/helpers/diverter-physics.mjs'], {encoding: 'utf8'});
  assert.match(helper, /teeWidth=13/);
  assert.doesNotMatch(helper, /RAIL_RULES|padImpulse|REDIRECT_GATES|LINE_SAFETY|RUN_RULE|VARIETY_RULE/);
});

test('storage wrapper only writes the line-pair prefix and can see foreign keys without changing them', () => {
  const store = memoryStorage({'rail-golf-linecraft-v1': 'legacy', 'rail-golf:linecraft:shelf-v1': 'shelf'});
  const wrapped = linePairStorage(store.api);
  wrapped.setItem('progress', '{"ok":true}');
  wrapped.setItem('session', '{}');
  assert.equal(store.api.getItem('rail-golf:line-pair:progress'), '{"ok":true}');
  assert.equal(store.api.getItem('rail-golf-linecraft-v1'), 'legacy');
  assert.equal(store.api.getItem('rail-golf:linecraft:shelf-v1'), 'shelf');
  assert.equal(wrapped.getItem('progress'), '{"ok":true}');
  assert.equal(wrapped.length, 2);
  wrapped.removeItem('session');
  assert.equal(store.values.has('rail-golf:line-pair:session'), false);
  assert.equal(store.values.has('rail-golf-linecraft-v1'), true);
  wrapped.clear();
  assert.equal([...store.values.keys()].some(key => key.startsWith(STORAGE_PREFIX)), false);
  assert.equal(store.api.getItem('rail-golf-linecraft-v1'), 'legacy');
});

test('signed deltas stay exact below the later coding floors', () => {
  const child = {yaw: 0.7, elevation: -0.5, charge: 0.51, rail: 1, origin: -0.25};
  const parent = {yaw: 0, elevation: 0, charge: 0.5, rail: 1, origin: 0};
  assert.deepEqual(signedSetupDelta(child, parent), {yaw: 0.7, elevation: -0.5, charge: 0.010000000000000009, rail: 0, origin: -0.25});
  assert.equal(signedSetupDelta(child, null), null);
});

test('lineage: adjust, retry, restore-kept, replay leaves no shot, station null, interrupt has no line number', () => {
  for (const code of [WITH, WITHOUT]) {
    const record = createPairRecord({code, build: 'cd9d41ddf6'});
    const lock = (over) => record.lock(shotInput(over));
    record.noteInput({at: '2026-10-11T21:00:01.000Z', source: 'key', name: 'nudgeYaw', control: 'yaw'});
    record.armFire();
    const a = lock({attemptId: 'A', at: '2026-10-11T21:00:02.000Z'});
    assert.equal(a.lineNumber, 1);
    assert.equal(a.parentAttemptId, null);
    assert.equal(a.card.parentLine, null);
    assert.equal(a.pool, 'REQUIRED');
    assert.equal(a.inputLog.length, 1);
    assert.equal(a.inputLog[0].source, 'key');
    assert.equal(record.visibleParent(a), null);

    assert.equal(record.noteLeave('adjust', '2026-10-11T21:00:03.000Z'), true);
    assert.equal(record.noteLeave('retry', '2026-10-11T21:00:04.000Z'), false);
    record.noteInput({at: '2026-10-11T21:00:05.000Z', source: 'button', name: 'nudgeYaw', control: 'yaw'});
    record.dropLastInput();
    record.noteInput({at: '2026-10-11T21:00:06.000Z', source: 'button', name: 'nudgeElevation', control: 'elevation'});
    record.armFire();
    const b = lock({
      attemptId: 'B',
      relation: {action: 'adjust', attemptId: 'A'},
      setup: {yaw: 0.7, elevation: 41.5, charge: 0.51, rail: 1, origin: 0},
      at: '2026-10-11T21:01:00.000Z',
    });
    assert.equal(b.lineNumber, 2);
    assert.equal(b.relationAction, 'adjust');
    assert.equal(b.parentAttemptId, 'A');
    assert.equal(b.setupDelta.yaw, 0.7);
    assert.equal(b.setupDelta.elevation, -0.5);
    assert.equal(b.inputLog.length, 1);
    assert.equal(b.inputLog[0].name, 'nudgeElevation');
    const expected = parentLineFrom(a, false);
    assert.equal(b.card.parentLine, expected);
    assert.equal(parentLineSegments(expected).join(''), expected);
    assert.equal(record.visibleParent(b), showsParentLine(code) ? expected : null);
    assert.equal(markup(a, null), markup(createPairRecord({code: WITHOUT, build: 'x'}).lock(shotInput({attemptId: 'A2'})), null));

    record.noteLeave('retry', '2026-10-11T21:01:10.000Z');
    record.armFire();
    const c = lock({attemptId: 'C', relation: {action: 'retry', attemptId: 'B'}, at: '2026-10-11T21:02:00.000Z'});
    assert.equal(c.card.parentLine, parentLineFrom(b, false));
    assert.match(c.card.parentLine, /^Set up from Line 2: /);
    assert.equal(c.card.parentLine.includes(b.card.sequence.replace('Observed contact sequence: ', '')), true);
    assert.equal(c.card.parentLine.includes(b.card.ending.replace('Ending: ', '')), true);

    assert.equal(record.lockedCount(), 3);
    record.noteLeave('replay', '2026-10-11T21:02:10.000Z');
    assert.equal(record.lockedCount(), 3);
    record.armFire();
    const d = lock({attemptId: 'D', relation: {action: 'restore-kept', attemptId: 'B'}, at: '2026-10-11T21:03:00.000Z'});
    assert.equal(d.lineNumber, 4);
    assert.equal(d.card.parentLine, `Set up from Line 2 (kept): ${b.card.sequence.replace('Observed contact sequence: ', '')} / ${b.card.ending.replace('Ending: ', '')}`);
    assert.equal(record.shotByAttempt('C').leaveResult.action, 'replay');

    record.noteLeave('adjust', '2026-10-11T21:03:10.000Z');
    record.armFire();
    const e = lock({attemptId: 'E', relation: {action: 'adjust', attemptId: 'D'}, at: '2026-10-11T21:04:00.000Z'});
    assert.match(e.card.parentLine, /^Set up from Line 4: /);
    assert.match(record.shotByAttempt('D').card.parentLine, /from Line 2 \(kept\)/);

    record.noteLeave('ghost', '2026-10-11T21:04:10.000Z');
    record.armFire();
    const f = lock({attemptId: 'F', relation: {action: 'adjust', attemptId: 'E'}, at: '2026-10-11T21:05:00.000Z'});
    assert.match(f.card.parentLine, /^Set up from Line 5: /);
    assert.equal(record.shotByAttempt('E').leaveResult.action, 'ghost');

    record.noteLeave('station', '2026-10-11T21:05:10.000Z');
    record.armFire();
    const g = lock({attemptId: 'G', station: 'lumber', relation: null, terminal: terminal({x: 22, y: 0.1, z: 10.4}), at: '2026-10-11T21:06:00.000Z'});
    assert.equal(g.parentAttemptId, null);
    assert.equal(g.card.parentLine, null);
    assert.equal(g.setupDelta, null);
    assert.equal(record.visibleParent(g), null);

    record.noteLeave('retry', '2026-10-11T21:06:10.000Z');
    record.armFire();
    const h = lock({attemptId: 'H', termination: 'retry-interrupted', ledger: [{kind: 'termination', reason: 'retry-interrupted'}], at: '2026-10-11T21:07:00.000Z'});
    assert.equal(h.lineNumber, null);
    assert.equal(h.pool, 'INTERRUPTED');
    assert.equal(record.lockedCount(), 7);
    record.noteLeave('retry', '2026-10-11T21:07:10.000Z');
    record.armFire();
    const i = lock({attemptId: 'I', relation: {action: 'retry', attemptId: 'H'}, at: '2026-10-11T21:08:00.000Z'});
    assert.equal(i.card.parentLine, null);
    assert.equal(i.lineNumber, 8);
    assert.equal(i.parentAttemptId, 'H');
    assert.ok(i.setupDelta);
    assert.equal(record.visibleParent(i), null);
  }
});

test('no-parent cards are byte-identical across arms and the only render difference is the parent line', () => {
  const input = shotInput({attemptId: 'A'});
  const left = createPairRecord({code: WITH, build: 'build'}).lock(input);
  const right = createPairRecord({code: WITHOUT, build: 'build'}).lock(input);
  assert.equal(markup(left, null), markup(right, null));
  assert.deepEqual(left.card, right.card);
  const child = {attemptId: 'B', relation: {action: 'adjust', attemptId: 'A'}};
  const withRecord = createPairRecord({code: WITH, build: 'build'});
  const withoutRecord = createPairRecord({code: WITHOUT, build: 'build'});
  withRecord.lock(input);
  withoutRecord.lock({...shotInput({attemptId: 'A'})});
  withRecord.armFire();
  withoutRecord.armFire();
  const shown = withRecord.lock(shotInput(child));
  const hidden = withoutRecord.lock(shotInput(child));
  assert.equal(shown.card.parentLine, hidden.card.parentLine);
  assert.equal(shown.card.sequence, hidden.card.sequence);
  assert.equal(shown.card.ending, hidden.card.ending);
  assert.equal(withRecord.visibleParent(shown), shown.card.parentLine);
  assert.equal(withoutRecord.visibleParent(hidden), null);
  const stripped = markup(shown, null);
  assert.equal(stripped, markup(hidden, null));
  assert.notEqual(markup(shown, withRecord.visibleParent(shown)), stripped);
});

test('every E4 fixture can be a snapshotted parent and the child quotes that snapshot', () => {
  assert.equal(fixtures.length, 47);
  const record = createPairRecord({code: WITH, build: 'build'});
  for (const fixture of fixtures) {
    const point = Array.isArray(fixture.p) ? {x: fixture.p[0], y: fixture.p[1], z: fixture.p[2]} : fixture.p;
    const parent = record.lock(shotInput({
      attemptId: fixture.id,
      station: fixture.station,
      terminal: {reason: fixture.expect.reason, surface: fixture.expect.surface, point},
      ledger: [],
    }));
    record.armFire();
    const child = record.lock(shotInput({
      attemptId: fixture.id + '-child',
      relation: {action: 'adjust', attemptId: fixture.id},
      station: fixture.station,
    }));
    const view = resultView({stationId: fixture.station, terminal: {reason: fixture.expect.reason, surface: fixture.expect.surface, point}, ledger: [], q: true});
    assert.equal(parent.card.sequence, view.sequence, fixture.id);
    assert.equal(parent.card.ending, view.endingLine, fixture.id);
    assert.equal(child.card.parentLine, parentLineFrom(parent, false), fixture.id);
    assert.equal(child.card.parentLine.includes(view.sequence.slice('Observed contact sequence: '.length)), true, fixture.id);
    assert.equal(child.card.parentLine.includes(view.endingLine.slice('Ending: '.length)), true, fixture.id);
    assert.equal(record.shotByAttempt(fixture.id).card.parentLine, parent.card.parentLine, fixture.id);
  }
});

test('required shots stay 1-12 and the next locked shot is voluntary', () => {
  const record = createPairRecord({code: WITHOUT, build: 'build'});
  for (let index = 1; index <= 13; index += 1) {
    record.armFire();
    const shot = record.lock(shotInput({attemptId: 'n' + index, relation: index === 1 ? null : {action: 'adjust', attemptId: 'n' + (index - 1)}}));
    assert.equal(shot.pool, index <= 12 ? 'REQUIRED' : 'VOLUNTARY');
    assert.equal(shot.lineNumber, index);
  }
});

test('open-only route, export button, and non-firing setup links are wired in source', () => {
  assert.match(source, /enterLinecraftOpen\(createLinecraftSession\(\),'cold'\)/);
  assert.match(source, /next\(\)\{\},\s*explore\(\)\{\},\s*open\(\)\{\},\s*restart\(\)\{\},\s*score\(\)\{\}/);
  assert.match(source, /linecraftLab&&!linePair&&!palletCarry&&<LinecraftControls/);
  assert.match(source, /if\(\(linePair \|\| palletCarry\) && restore !== true\) return/);
  assert.match(source, /replay:id=>\{leave\('replay'\);const before=floorStateRef\.current;inner\.replay\(id\);/);
  assert.match(source, /restore:id=>\{[\s\S]*?leave\('restore-kept'\);\s*if\(inner\.restore\(id\)/);
  assert.match(source, /ghost:id=>\{[\s\S]*?leave\('ghost'\);\s*inner\.ghost\(id\);/);
  assert.match(source, /noteLeave\('station'/);
  assert.match(source, /linecraftRelationRef\.current=\{action:'restore-kept',attemptId:id\}/);
  assert.match(source, /Historical path only: no PhysicsAggregate/);
  assert.match(source, /pairRecordRef\.current\?\.armFire\(\);setPairView\(null\)/);
  assert.match(source, /SURVEY_DATABASE/);
  assert.match(source, /data-export="end"/);
  assert.match(source, /Attempts · \{pairAttempts\}/);
  assert.doesNotMatch(page, /Restart Lessons|Skip Lessons|Next Lesson|Explore Here/);
  for (const path of ['../app/page.tsx', '../app/courtyard/page.tsx', '../app/practice/page.tsx', '../app/lab/linecraft/page.tsx', '../app/lab/lines/page.tsx']) {
    const text = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.equal(text.includes('line-pair') || text.includes('linePair'), false, path);
  }
  const link = {
    v: 2, build: 'cd9d41ddf6', world: 'timber-courtyard', route: '/lab/line-pair', card: 'open-line', station: 'gate',
    rail: 1, yaw: 0, elevation: 42, speed: 18, originX: 0, environment: {floor: 'A'},
  };
  const restored = restoreShareLine(decodeShareLine(encodeShareLine(link)), link.build);
  assert.equal(restored.autoFire, false);
  assert.equal(restored.route, '/lab/line-pair');
  assert.equal(restored.setup.originX, 0);
  assert.throws(() => encodeShareLine({...link, v: 1, originX: undefined}));
});

test('scripted 12-shot export carries every required field', () => {
  const record = createPairRecord({code: WITH, build: 'cd9d41ddf6'});
  record.setSession({fps: 5.25, viewport: {width: 1440, height: 900}});
  const stations = [...Array(6).fill('gate'), ...Array(6).fill('lumber')];
  for (let index = 0; index < 12; index += 1) {
    const previous = index === 0 || index === 6 ? null : 'shot-' + index;
    if (index > 0) record.noteLeave(index === 6 ? 'station' : 'adjust', `2026-10-11T21:${String(index).padStart(2, '0')}:00.000Z`);
    if (previous) {
      record.noteInput({at: `2026-10-11T21:${String(index).padStart(2, '0')}:01.000Z`, source: index % 2 ? 'key' : 'button', name: 'nudgeYaw', control: 'yaw'});
      record.noteInput({at: `2026-10-11T21:${String(index).padStart(2, '0')}:02.000Z`, source: 'button', name: 'release', control: 'charge'});
    }
    record.armFire();
    const yaw = index === 0 || index === 6 ? 0 : 0.7;
    record.lock(shotInput({
      attemptId: 'shot-' + (index + 1),
      station: stations[index],
      relation: previous ? {action: index === 6 ? 'adjust' : 'adjust', attemptId: previous} : null,
      setup: {yaw, elevation: 42, charge: index === 2 ? 0.51 : 0.5, rail: 1, origin: index === 4 ? 0.5 : 0},
      at: `2026-10-11T21:${String(10 + index).padStart(2, '0')}:00.000Z`,
    }));
    if (index === 6) {
      const switched = record.shotByAttempt('shot-7');
      assert.equal(switched.parentAttemptId, null);
      assert.equal(switched.card.parentLine, null);
    }
  }
  const keptParent = record.shotByAttempt('shot-6').card.parentLine;
  const document = record.exportDocument();
  assert.equal(document.fps, 5.25);
  assert.deepEqual(document.viewport, {width: 1440, height: 900});
  assert.equal(document.classifierSha, FROZEN);
  assert.equal(document.shots.length, 12);
  assert.equal(document.shots.every(shot => shot.pool === 'REQUIRED'), true);
  assert.equal(document.shots[5].card.parentLine, keptParent);
  assert.equal(document.shots[5].leaveResult.action, 'station');
  for (const shot of document.shots) {
    assert.equal(shot.armCode, WITH);
    assert.equal(shot.build, 'cd9d41ddf6');
    assert.ok(shot.station === 'gate' || shot.station === 'lumber');
    assert.equal(typeof shot.lineNumber, 'number');
    assert.ok('relationAction' in shot);
    assert.ok('parentAttemptId' in shot);
    for (const key of ['yaw', 'elevation', 'charge', 'rail', 'origin']) assert.equal(typeof shot.setup[key], 'number');
    assert.ok(shot.setupDelta === null || ['yaw', 'elevation', 'charge', 'rail', 'origin'].every(key => typeof shot.setupDelta[key] === 'number'));
    for (const key of ['x', 'y', 'z', 'reason']) assert.ok(shot.terminal[key] !== undefined);
    assert.equal(typeof shot.card.sequence, 'string');
    assert.equal(typeof shot.card.ending, 'string');
    assert.ok('parentLine' in shot.card);
    assert.ok(shot.receipt);
    assert.equal(typeof shot.termination, 'string');
    assert.match(shot.rulingLockAt, /T/);
    assert.ok(shot.leaveResult === null || (typeof shot.leaveResult.action === 'string' && typeof shot.leaveResult.at === 'string'));
    assert.ok(Array.isArray(shot.inputLog));
  }
  assert.equal(document.shots[0].parentAttemptId, null);
  assert.equal(document.shots[0].setupDelta, null);
  assert.equal(document.shots[1].setupDelta.yaw, 0.7);
  assert.equal(document.shots[2].setupDelta.charge, 0.010000000000000009);
  assert.equal(document.shots[4].setupDelta.origin, 0.5);
  assert.equal(document.shots[1].inputLog[0].control, 'yaw');
  assert.equal(document.shots[11].leaveResult, null);
  assert.equal(document.shots[10].leaveResult.action, 'adjust');
  const other = createPairRecord({code: WITHOUT, build: 'cd9d41ddf6'});
  assert.equal(other.exportDocument().shots.length, 0);
  mkdirSync('/opt/cursor/artifacts', {recursive: true});
  writeFileSync('/opt/cursor/artifacts/line-pair-dry-run.json', JSON.stringify(document, null, 2));
});

test('built line-pair route rejects unknown codes and serves both arms without lesson controls', {skip: existsSync(new URL('../dist/server/index.js', import.meta.url)) ? false : 'build first'}, async () => {
  const workerURL = new URL('../dist/server/index.js', import.meta.url);
  workerURL.searchParams.set('line-pair-test', `${process.pid}-${Date.now()}`);
  const {default: worker} = await import(workerURL.href);
  const htmlAt = async path => {
    const response = await worker.fetch(new Request('http://localhost' + path, {headers: {accept: 'text/html'}}), {ASSETS: {fetch: async () => new Response('Not found', {status: 404})}}, {waitUntil() {}, passThroughOnException() {}});
    assert.equal(response.status, 200, path);
    return response.text();
  };
  for (const path of ['/lab/line-pair', '/lab/line-pair?k=', '/lab/line-pair?k=nope']) {
    const html = await htmlAt(path);
    assert.match(html, /link not valid/);
    assert.doesNotMatch(html, /End \/ Export|parent-line|Attempts ·/);
  }
  const pages = {};
  for (const code of [WITH, WITHOUT]) {
    const html = (await htmlAt('/lab/line-pair?k=' + code)).replaceAll('<!-- -->', '');
    pages[code] = html;
    assert.match(html, /End \/ Export/);
    assert.match(html, /Attempts · 0/);
    assert.match(html, /data-export="end"/);
    assert.match(html, /data-linecraft-stage="open"/);
    assert.match(html, /BANK A/);
    assert.match(html, /BANK B/);
    assert.match(html, /SKIP PAD/);
    assert.match(html, /MILL/);
    assert.match(html, /LUMBER STACKS/);
    assert.match(html, /TREAD 1/);
    assert.doesNotMatch(html, /Restart Lessons|Skip Lessons|Next Lesson|Explore Here|Show provisional score|Reset Card|\btreatment\b|data-arm=|class="parent-line"/);
    assert.equal(html.includes(code === WITH ? WITHOUT : WITH), false, 'the other code stays out of this document');
    assert.match(html, new RegExp('linePairCode\\\\":\\\\"' + code + '\\\\"'));
  }
  assert.equal(pages[WITH].replaceAll(WITH, 'CODE'), pages[WITHOUT].replaceAll(WITHOUT, 'CODE'));
  const linecraft = await htmlAt('/lab/linecraft');
  assert.match(linecraft, /Skip Lessons/);
  const root = await htmlAt('/');
  assert.doesNotMatch(root, /line-pair|link not valid/);
});
