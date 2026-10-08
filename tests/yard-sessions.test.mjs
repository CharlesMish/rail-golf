import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { COURTYARD_HOLES, COURTYARD_TARGETS } from '../lib/courtyard.js';
import { RAIL_RULES } from '../lib/rail-golf-v02.js';
import { surveyCSV } from '../lib/survey-ledger.js';
import { actionTraceCSV } from '../lib/action-trace.js';
import { courtyardShot } from './helpers/courtyard-physics.mjs';
import {
  YARD_SESSIONS_PROGRESS_KEY,
  YARD_SESSIONS_LIBRARY_KEY,
  YARD_SESSIONS_MESSAGE,
  YARD_SESSION_NEST_RADIUS,
  parseYardSessionQuery,
  yardSessionHole,
  yardSessionStorage,
  yardSessionOwnsKey,
  yardSessionKeyCollides,
  readYardSessionRecords,
  writeYardSessionProgress,
  readYardSessionLibrary,
  writeYardSessionLibrary,
} from '../lib/yard-sessions.js';

Logger.LogLevels = Logger.NoneLogLevel;

const gallery = COURTYARD_HOLES.find(hole => hole.id === 'switchback-gallery');
const roost = COURTYARD_TARGETS.find(target => target.id === 'gallery-roost');

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    get length() { return data.size; },
    key: index => [...data.keys()][index] ?? null,
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: key => { data.delete(key); },
    clear() { data.clear(); },
    keys() { return [...data.keys()]; },
  };
}

test('yard session query accepts only the two raw set numbers', () => {
  assert.deepEqual(parseYardSessionQuery('1'), { ok: true, mode: { set: '1', dare: true } });
  assert.deepEqual(parseYardSessionQuery('2'), { ok: true, mode: { set: '2', dare: false } });
  for (const value of [undefined, null, '', '3', '01', '1 ', ' 1', 'DARE', 'OPEN', 'dare', 'open', 1, 2, ['1'], ['1', '2']]) {
    const parsed = parseYardSessionQuery(value);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.message, YARD_SESSIONS_MESSAGE);
    assert.equal('mode' in parsed, false);
  }
});

test('both yard sessions reuse the gallery hole without changing the physical roost', () => {
  const dare = yardSessionHole('1');
  const open = yardSessionHole('2');
  assert.equal(dare.id, 'switchback-gallery');
  assert.equal(open.id, 'switchback-gallery');
  assert.deepEqual(dare.defaultShot, gallery.defaultShot);
  assert.deepEqual(open.defaultShot, gallery.defaultShot);
  assert.deepEqual(dare.banks, gallery.banks);
  assert.deepEqual(open.banks, gallery.banks);
  assert.equal(dare.instruction, 'Bank A → Bank B → land in the nest at the centre of the amber roost.');
  assert.equal(open.instruction, 'No target. Fire any shot you like.');
  assert.equal(dare.target.x, roost.x);
  assert.equal(dare.target.z, roost.z);
  assert.equal(dare.target.radius, YARD_SESSION_NEST_RADIUS);
  assert.equal(dare.target.id, 'gallery-roost');
  assert.deepEqual([...dare.requiredTags], ['bank-a', 'bank-b']);
  assert.equal(open.target, null);
  assert.deepEqual([...open.requiredTags], []);
  assert.equal(roost.radius, 5);
  assert.equal(gallery.target.radius, 5);
  assert.notEqual(dare.target, gallery.target);
});

test('yard session storage stays in its own keys and sets do not read each other', () => {
  const production = {
    'rail-golf-timber-courtyard-v01': '{"mill-delivery":{"cleared":true}}',
    'rail-golf-delivery-routes-v1': '{"mill":{}}',
    'rail-golf-delivery-routes-v2': '{"sky":{}}',
    'rail-golf:line-survey:pending:baseline': 'baseline',
    'rail-golf:line-actions:baseline': 'baseline',
    'rail-golf-shot-library-v1-yard': '{"version":1}',
  };
  const storage = memoryStorage(production);
  const before = new Map(Object.entries(production));
  const holes = [{ id: 'switchback-gallery' }];
  const progress = writeYardSessionProgress(null, '1', {
    'switchback-gallery': { attempts: 2, bestOutcome: 'miss', hasAce: false, hasBreach: true, perfect: false, cleared: false },
  });
  const progressBoth = writeYardSessionProgress(progress, '2', {
    'switchback-gallery': { attempts: 4, bestOutcome: null, hasAce: false, hasBreach: false, perfect: false, cleared: false },
  });
  storage.setItem(YARD_SESSIONS_PROGRESS_KEY, JSON.stringify(progressBoth));
  const library = writeYardSessionLibrary(null, '1', 'switchback-gallery', {
    recent: [{ projectileId: 1, receipt: 'one' }],
    wins: [{ projectileId: 2, receipt: 'two' }],
  });
  const libraryBoth = writeYardSessionLibrary(library, '2', 'switchback-gallery', {
    recent: [{ projectileId: 9, receipt: 'other' }],
    wins: [],
  });
  storage.setItem(YARD_SESSIONS_LIBRARY_KEY, JSON.stringify(libraryBoth));
  const scoped = yardSessionStorage(storage, '1');
  scoped.setItem('rail-golf:line-survey:pending:shot', 'journal');
  scoped.setItem('rail-golf:line-actions:session', 'trace');
  yardSessionStorage(storage, '2').setItem('rail-golf:line-survey:pending:shot', 'other-journal');

  for (const [key, value] of before) assert.equal(storage.getItem(key), value);
  const written = storage.keys().filter(key => !before.has(key));
  assert.ok(written.length >= 4);
  for (const key of written) {
    assert.equal(yardSessionOwnsKey(key), true, key);
    assert.equal(yardSessionKeyCollides(key), false, key);
  }
  for (const key of before.keys()) assert.equal(yardSessionKeyCollides(key), true);
  assert.equal(storage.getItem('rail-golf:line-survey:pending:shot'), null);
  assert.equal(storage.getItem('rail-golf:line-actions:session'), null);

  const saved = JSON.parse(storage.getItem(YARD_SESSIONS_PROGRESS_KEY));
  const first = readYardSessionRecords(saved, '1', holes);
  const second = readYardSessionRecords(saved, '2', holes);
  assert.equal(first['switchback-gallery'].attempts, 2);
  assert.equal(first['switchback-gallery'].set, undefined);
  assert.equal(saved.sets['1']['switchback-gallery'].set, '1');
  assert.equal(second['switchback-gallery'].attempts, 4);
  assert.equal(saved.sets['2']['switchback-gallery'].set, '2');
  assert.equal(readYardSessionRecords({ ...saved, sets: { ...saved.sets, '1': { 'switchback-gallery': { ...saved.sets['1']['switchback-gallery'], set: '2' } } } }, '1', holes)['switchback-gallery'], undefined);

  const shelf = JSON.parse(storage.getItem(YARD_SESSIONS_LIBRARY_KEY));
  assert.equal(readYardSessionLibrary(shelf, '1', 'switchback-gallery').holes['switchback-gallery'].recent[0].projectileId, 1);
  assert.equal(readYardSessionLibrary(shelf, '1', 'switchback-gallery').holes['switchback-gallery'].recent[0].set, '1');
  assert.equal(readYardSessionLibrary(shelf, '2', 'switchback-gallery').holes['switchback-gallery'].recent[0].projectileId, 9);
  assert.equal(readYardSessionLibrary(shelf, '1', 'switchback-gallery').holes['switchback-gallery'].wins[0].set, '1');
  const swapped = readYardSessionLibrary({ version: 1, sets: { '1': { 'switchback-gallery': { recent: [{ projectileId: 9, set: '2' }], wins: [] } } } }, '1', 'switchback-gallery');
  assert.equal(swapped.holes['switchback-gallery'].recent.length, 0);
});

test('survey and action exports carry the set number only for yard session records', () => {
  const setup = { railIndex: 0, yaw: 0, elevation: 25, charge: 0.5 };
  const receipt = { total: 0, claimIds: [], secondary: 0, run: 0, runDistance: 0, uniqueFeatureCount: 0 };
  const plain = surveyCSV([{ id: 'a', session: 's', sequence: 1, build: 'b', startedAt: '', resolvedAt: '', card: 'switchback-gallery', station: 'gate', setup, launchSpeed: 1, ending: 'ground-contact', receipt, targetClear: false }]);
  assert.equal(plain.startsWith('"id","session"'), true);
  const marked = surveyCSV([{ id: 'a', session: 's', sequence: 1, build: 'b', startedAt: '', resolvedAt: '', card: 'switchback-gallery', station: 'gate', setup, launchSpeed: 1, ending: 'ground-contact', receipt, targetClear: false, set: '1' }]);
  assert.equal(marked.startsWith('"set","id","session"'), true);
  assert.match(marked, /"1","a"/);
  const entry = { tabId: 't', documentId: 'd', componentId: 'c', mountId: 'm', mountNumber: 1, session: 's', sequence: 1, timestamp: 't', build: 'b', action: 'ruling', source: 'internal/programmatic', accepted: true, reason: 'miss', before: { phase: 'flight', card: 'switchback-gallery', station: 'gate' }, after: { phase: 'theatre', card: 'switchback-gallery', station: 'gate' }, category: 'action', detail: { ruling: 'GROUND CONTACT' } };
  assert.equal(actionTraceCSV({ entries: [entry] }).startsWith('"tabId","documentId"'), true);
  const traced = actionTraceCSV({ entries: [{ ...entry, set: '2' }] });
  assert.equal(traced.startsWith('"set","tabId","documentId"'), true);
  assert.match(traced, /"2","t"/);
});

test('the yard session page rejects an unknown set and does not touch production routes', async () => {
  const page = await readFile(new URL('../app/lab/yard-sessions/page.tsx', import.meta.url), 'utf8');
  const game = await readFile(new URL('../app/manners-game.tsx', import.meta.url), 'utf8');
  assert.match(page, /parseYardSessionQuery/);
  assert.match(page, /<MannersGame yardSession=\{parsed\.mode\} \/>/);
  assert.doesNotMatch(page, /DARE|OPEN|challenge|control/);
  assert.match(game, /courtyard && !lineLab && !yardSession/);
  assert.match(game, /YARD_SESSIONS_PROGRESS_KEY/);
  assert.match(game, /YARD_SESSIONS_LIBRARY_KEY/);
  assert.match(game, /!linecraftLab&&!intentLab&&!yardSession&&<nav/);
  assert.match(game, /!linecraftLab&&!yardSession\?\.dare&&<div/);
  assert.match(game, /if \(yardSession\?\.dare\)/);
  const nest = game.slice(game.indexOf('if (yardSession?.dare)'), game.indexOf('for (const station of courtyard', game.indexOf('if (yardSession?.dare)')));
  assert.match(nest, /gallery-roost-mark/);
  assert.match(nest, /diameter: YARD_SESSION_NEST_RADIUS \* 2/);
  assert.match(nest, /makeMaterial\('nest-mark'/);
  assert.match(nest, /isPickable = false/);
  assert.doesNotMatch(nest, /materials\.amber|PhysicsAggregate/);
  assert.match(game, /const saved = linecraftLab\?\{\}:intentLab\?\{\}:loadProgress/);
  for (const path of ['../app/page.tsx', '../app/courtyard/page.tsx', '../app/practice/page.tsx']) {
    assert.doesNotMatch(await readFile(new URL(path, import.meta.url), 'utf8'), /yardSession|yard-sessions/);
  }
});

test('registered nest is reachable from the gallery address', async () => {
  const havok = await HavokPhysics({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const hole = yardSessionHole('1');
  assert.equal(hole.target.radius, YARD_SESSION_NEST_RADIUS);
  assert.equal(roost.radius, 5);
  let found = false;
  for (let step = 90; step <= 98; step += 1) {
    const result = courtyardShot(havok, hole, { ...hole.defaultShot, charge: step / 100 });
    const centre = Math.hypot(result.point.x - hole.target.x, result.point.z - hole.target.z);
    if ((result.outcome === 'ace' || result.outcome === 'double') && centre <= hole.target.radius + RAIL_RULES.projectileRadius) found = true;
  }
  assert.equal(found, true);
});
