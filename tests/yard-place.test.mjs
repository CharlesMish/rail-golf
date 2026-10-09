import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import Havok from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {recognizedIntentEvents} from '../lib/intent-lab.js';
import {recordLineReceipt, scoreLine} from '../lib/line-score.js';
import {BAND, ENDING_WORD, EXPORT_FILENAME, PLACE_VOCABULARY, STORAGE_PREFIX, createYardJournal, lifecycleBounds, placeFor, resultCardMarkup, resultView, vocabularyViolations} from '../lib/yard-place.js';

const fixtures = JSON.parse(await readFile(new URL('./fixtures/e4-yard-fixtures.json', import.meta.url), 'utf8'));
const hv = await Havok({wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))});
const near = (a, b) => Math.abs(a - b) <= 0.01 + 1e-9;
const pointOf = value => Array.isArray(value) ? {x: value[0], y: value[1], z: value[2]} : value;
const terminalOf = fixture => ({reason: fixture.expect.reason, surface: fixture.expect.surface, point: pointOf(fixture.p)});
const ARM_TOKENS = /\b(control|treatment|place|arm|variant)\b|r6|h3/i;

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

function authority(ledger, elapsed) {
  const receipt = recordLineReceipt(ledger);
  const scored = scoreLine(ledger);
  const terminal = ledger.find(event => event.kind === 'contact' && event.terminal);
  return JSON.stringify({
    receipt: {total: receipt.total, claimIds: receipt.claimIds, run: receipt.run, runDistance: receipt.runDistance, ending: receipt.ending},
    awards: scored.awards,
    termination: ledger.find(event => event.kind === 'termination')?.reason ?? null,
    surface: terminal?.surface ?? null,
    point: terminal?.point ?? null,
    events: recognizedIntentEvents(ledger).map(event => event.label),
    elapsed,
  });
}

function shoot(fixture) {
  const hole = selectOpenLineStation(fixture.station);
  const harness = diverterHarness(hv, 'A', true, hole, {scoreLab: true, kicker: true, linecraft: true, teeWidth: 23});
  let steps = 0;
  const shot = harness.shoot(fixture.setup, {station: hole.station, onStep() { steps += 1; }});
  harness.dispose();
  return {shot, elapsed: steps / 120};
}

test('vocabulary stays the 19 phrases and rejects banned tokens', () => {
  assert.equal(BAND, 2.5);
  assert.equal(PLACE_VOCABULARY.length, 19);
  assert.deepEqual(vocabularyViolations(), []);
  assert.equal(new Set(PLACE_VOCABULARY).size, 19);
});

test('classifier matches every fixture place from the recorded terminal only', () => {
  assert.equal(fixtures.length, 47);
  for (const fixture of fixtures) {
    const ruling = placeFor(fixture.station, terminalOf(fixture));
    assert.equal(ruling.ending, fixture.expect.ending, fixture.id);
    assert.equal(ruling.place, fixture.expect.place, fixture.id);
    assert.equal(ruling.zone, fixture.expect.zone, fixture.id);
    assert.ok(ruling.place === null || PLACE_VOCABULARY.includes(ruling.place), fixture.id);
  }
});

test('classifier is called with the station and exactly reason, surface, and point', () => {
  const seen = [];
  const terminal = {reason: 'ground-contact', surface: 'ground', point: {x: 1, y: 2, z: 3}, ledger: [{kind: 'redirect'}], place: 'LEAK'};
  const view = resultView({
    stationId: 'gate',
    terminal,
    ledger: [],
    showPlace: true,
    classify(stationId, input) {
      seen.push({stationId, keys: Object.keys(input).sort(), input});
      return placeFor(stationId, input);
    },
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].stationId, 'gate');
  assert.deepEqual(seen[0].keys, ['point', 'reason', 'surface']);
  assert.equal(seen[0].input.reason, 'ground-contact');
  assert.equal(seen[0].input.surface, 'ground');
  assert.deepEqual(seen[0].input.point, {x: 1, y: 2, z: 3});
  assert.equal(Object.hasOwn(seen[0].input, 'ledger'), false);
  assert.match(view.endingLine, /^Ending: /);
});

test('arm identity: only the ending line differs, and the card text does not name an arm', () => {
  const synthetic = [
    {station: 'gate', expect: {reason: 'dead-ball', surface: null, ending: 'SETTLED', place: null}, p: [0, 1, 10]},
    {station: 'gate', expect: {reason: 'safety-timeout', surface: null, ending: 'SAFETY STOP', place: null}, p: [0, 1, 40]},
    {station: 'gate', expect: {reason: 'invalid-physics', surface: null, ending: 'SAFETY STOP', place: null}, p: [0, 1, 40]},
    {station: 'gate', expect: {reason: 'oob', surface: null, ending: 'OUT OF BOUNDS', place: null}, p: [-50.2, 1, -15.2]},
    {station: 'lumber', expect: {reason: 'ground-contact', surface: 'tee', ending: 'FAR END OF THE YARD', place: 'FAR END OF THE YARD'}, p: [22, 0.4, 154]},
    {station: 'gate', expect: {reason: 'ground-contact', surface: 'other-solid', ending: 'FIRST KISS', place: null}, p: [0, 0, 20]},
  ];
  // The tee synthetic above stores the place in ending by mistake for the word check below.
  synthetic[4].expect.ending = 'FIRST KISS';
  const cases = [...fixtures, ...synthetic];
  for (const fixture of cases) {
    const ledger = [{kind: 'redirect', surface: 'bank-a', feature: 'bank-a', label: 'BANK A REJECT'}, {kind: 'contact', surface: 'mill', terminal: false}, {kind: 'contact', surface: 'bank-a', terminal: false}];
    const hidden = resultView({stationId: fixture.station, terminal: terminalOf(fixture), ledger, showPlace: false});
    const named = resultView({stationId: fixture.station, terminal: terminalOf(fixture), ledger, showPlace: true});
    const withoutLine = view => ({...view, endingLine: undefined});
    assert.deepEqual(withoutLine(hidden), withoutLine(named), fixture.id ?? fixture.station);
    assert.equal(hidden.endingLine, 'Ending: ' + ENDING_WORD[fixture.expect.reason], fixture.id ?? fixture.expect.reason);
    assert.equal(named.endingLine, hidden.endingLine + (named.classifier.place ? ' · ' + named.classifier.place : ''), fixture.id ?? fixture.station);
    for (const markup of [resultCardMarkup(hidden), resultCardMarkup(named)]) {
      assert.equal(ARM_TOKENS.test(markup), false, markup);
      assert.match(markup, /class="ending-line"/);
      assert.match(markup, /Your line/);
    }
    if (!named.classifier.place) assert.equal(resultCardMarkup(hidden), resultCardMarkup(named));
  }
  assert.equal(lifecycleBounds({x: 50.01, y: 2, z: -4}, 'oob').join(','), 'x>50');
  assert.deepEqual(lifecycleBounds({x: -50.2, y: 1, z: -15.2}, 'oob'), ['x<-50', 'z<-15']);
  assert.deepEqual(lifecycleBounds({x: 0, y: 1, z: 10}, 'dead-ball'), ['dead-ball']);
});

test('a 12-shot session writes only the study prefix and the same keys in both conditions', () => {
  const foreign = {'rail-golf-linecraft-v1': '1', 'rail-golf:linecraft:kept': '1', 'rail-golf-intent-v1': '1', 'rail-golf-line-lab-v1': '1', 'rail-golf-shot-library-v1-linecraft-v1': '1'};
  const keySets = [];
  for (const code of ['r6', 'h3']) {
    const storage = memoryStorage(foreign);
    const before = JSON.stringify([...storage.values]);
    const journal = createYardJournal(storage.api);
    for (let index = 0; index < 12; index += 1) {
      journal.record({k: code, build: 'test', station: index % 2 ? 'lumber' : 'gate', n: index, fps: 4, viewport: {width: 1440, height: 900}});
    }
    const keys = [...storage.values.keys()];
    assert.deepEqual(keys.filter(key => !key.startsWith(STORAGE_PREFIX)), Object.keys(foreign));
    assert.deepEqual(JSON.parse(before), [...storage.values].filter(([key]) => !key.startsWith(STORAGE_PREFIX)));
    keySets.push(keys.filter(key => key.startsWith(STORAGE_PREFIX)).sort());
    assert.equal(journal.filename, EXPORT_FILENAME);
    assert.equal(ARM_TOKENS.test(journal.filename), false);
    const saved = journal.exportDocument();
    assert.equal(saved.shots.length, 12);
    assert.equal(saved.shots[0].k, code);
    assert.equal(saved.fps, 4);
  }
  assert.deepEqual(keySets[0], keySets[1]);
});

test('frozen authority files are untouched and the shared tee default stays 13 m', () => {
  const base = 'cd9d41ddf6349b47e8d0035fd1707299ac255d55';
  const frozen = {
    'lib/rail-golf-v02.js': '0292f8a258bb57c8bb2faebb88dfdf1cd0e97b5f',
    'lib/delivery-routes.js': 'cff96ccc5b1444853355d9594a7a257f661dd7fa',
    'lib/line-recognition.js': '499679c688714e7133d5fd0d7e0a14f3074ff373',
    'lib/line-lifecycle.js': '7e5b419023c3681103188403eb87d35dc8709cc2',
    'lib/line-run.js': 'bcb4ccac9af8bde3b184f40e11a46dd1eddd634d',
    'lib/line-score.js': '6dfa5b50b4a6d6c833befeda01c37bb56835435c',
  };
  for (const [path, hash] of Object.entries(frozen)) {
    assert.equal(execFileSync('git', ['hash-object', path], {encoding: 'utf8'}).trim(), hash, path);
  }
  try { execFileSync('git', ['cat-file', '-e', base], {stdio: 'ignore'}); }
  catch { execFileSync('git', ['fetch', '--depth=1', 'origin', base], {stdio: 'ignore'}); }
  const helper = execFileSync('git', ['diff', '-U0', base, '--', 'tests/helpers/diverter-physics.mjs'], {encoding: 'utf8'});
  assert.match(helper, /teeWidth=13/);
  assert.match(helper, /width:teeWidth/);
  assert.doesNotMatch(helper, /RAIL_RULES|padImpulse|REDIRECT_GATES|LINE_SAFETY|RUN_RULE|VARIETY_RULE/);
});

test('47 live-yard fixtures keep receipt, score, termination, contact, and recognition', async () => {
  const forward = [];
  for (const fixture of fixtures) forward.push(await reproduce(fixture));
  const reverse = [];
  for (const fixture of [...fixtures].reverse()) reverse.push(await reproduce(fixture));
  reverse.reverse();
  for (let index = 0; index < fixtures.length; index += 1) {
    const fixture = fixtures[index];
    const shot = forward[index];
    assert.equal(shot.reason, fixture.expect.reason, fixture.id);
    assert.equal(shot.surface, fixture.expect.surface, fixture.id);
    assert.ok(near(shot.point[0], fixture.p[0]) && near(shot.point[1], fixture.p[1]) && near(shot.point[2], fixture.p[2]), fixture.id + ' ' + shot.point.join(','));
    assert.deepEqual(shot.events, fixture.q, fixture.id);
    assert.equal(shot.authority, reverse[index].authority, fixture.id);
    const again = reproduce(fixture);
    assert.equal(again.authority, shot.authority, fixture.id);
    const ledger = JSON.parse(shot.ledger);
    const before = JSON.stringify(ledger);
    const hidden = resultView({stationId: fixture.station, terminal: {reason: shot.reason, surface: shot.surface, point: pointOf(shot.point)}, ledger, showPlace: false});
    const named = resultView({stationId: fixture.station, terminal: {reason: shot.reason, surface: shot.surface, point: pointOf(shot.point)}, ledger, showPlace: true});
    assert.equal(JSON.stringify(ledger), before, fixture.id);
    assert.equal(hidden.endingLine, 'Ending: ' + fixture.expect.ending, fixture.id);
    assert.equal(named.endingLine, fixture.expect.place ? hidden.endingLine + ' · ' + fixture.expect.place : hidden.endingLine, fixture.id);
    assert.equal(named.classifier.place, fixture.expect.place, fixture.id);
  }
});

function reproduce(fixture) {
  const {shot, elapsed} = shoot(fixture);
  const terminal = shot.ledger.find(event => event.kind === 'contact' && event.terminal);
  return {
    reason: shot.ledger.find(event => event.kind === 'termination')?.reason ?? null,
    surface: terminal?.surface ?? null,
    point: shot.point,
    events: recognizedIntentEvents(shot.ledger).map(event => event.label),
    authority: authority(shot.ledger, elapsed),
    ledger: JSON.stringify(shot.ledger),
  };
}
