import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CARD_EXPORT_FILENAME, CARD_STORAGE_PREFIX, STORAGE_PREFIX, createCardJournal, yardCardStorage, yardPlaceStorage} from '../lib/yard-place.js';
import {encodeShareLine, decodeShareLine, restoreShareLine} from '../lib/share-line.js';

const BASE = 'd3cb90a82cc52d0f734850e1af9f13a1c7f54f10';
const page = readFileSync(new URL('../app/lab/yard-place-card/page.tsx', import.meta.url), 'utf8');
const game = readFileSync(new URL('../app/manners-game.tsx', import.meta.url), 'utf8');
const study = readFileSync(new URL('../app/lab/yard-place/page.tsx', import.meta.url), 'utf8');

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

test('the card route is the production open-yard surface plus one ending line', () => {
  assert.match(page, /<MannersGame linecraftLab yardPlaceCard/);
  assert.doesNotMatch(page, /yardPlaceLab|r6|h3|showPlace/);
  assert.doesNotMatch(study, /yardPlaceCard/);
  assert.match(game, /className="yard-card-ending"/);
  assert.match(game, /q:true/);
  assert.doesNotMatch(game, /\br6\b|\bh3\b|showPlace/);
});

test('card storage never reads or writes the study, linecraft, or player keys', () => {
  const foreign = {
    'rail-golf-linecraft-v1': 'progress',
    'rail-golf:linecraft:kept': 'shelf',
    'rail-golf:linecraft:keep-hint-v1': 'seen',
    'rail-golf:yard-place:session': 'study',
    'rail-golf:yard-place:progress': 'study-progress',
    'rail-golf-shot-library-v1-linecraft-v1': 'library',
  };
  const storage = memoryStorage(foreign);
  const before = JSON.stringify([...storage.values]);
  const journal = createCardJournal(storage.api);
  journal.record({endingLine: 'Ending: FIRST KISS · ON THE TEE', fps: 5, viewport: {width: 1440, height: 900}});
  const keys = [...storage.values.keys()];
  assert.deepEqual(keys.filter(key => !key.startsWith(CARD_STORAGE_PREFIX)).sort(), Object.keys(foreign).sort());
  assert.deepEqual(JSON.parse(before), [...storage.values].filter(([key]) => !key.startsWith(CARD_STORAGE_PREFIX)));
  assert.equal(journal.filename, CARD_EXPORT_FILENAME);
  assert.equal(journal.exportDocument().shots.length, 1);
  assert.equal(yardCardStorage(storage.api).getItem('session')?.includes('ON THE TEE'), true);
  assert.equal(yardPlaceStorage(storage.api).getItem('session'), 'study');
  assert.equal(yardCardStorage(storage.api).getItem('progress'), null);
  assert.match(game, /yardPlaceCard \? "rail-golf:yard-place-card:progress"/);
  assert.match(game, /yardPlaceCard\?"rail-golf:yard-place-card:survey"/);
  assert.match(game, /yardPlaceCard\?'rail-golf:yard-place-card:keep-hint'/);
  assert.match(game, /createCardJournal/);
  assert.match(game, /linecraftLab\?linecraftStorage\(storage\)/);
  assert.match(game, /linecraftLab\?"rail-golf-linecraft-survey"/);
  assert.match(game, /if\(!intentLab&&!linecraftLab\)try/);
  assert.match(game, /const saved = linecraftLab\|\|yardPlaceLab\?\{\}/);
});

test('a card share link restores without firing and rejects a linecraft link', () => {
  const payload = {v: 2, build: 'abcdef0', world: 'timber-courtyard', route: '/lab/yard-place-card', card: 'open-line', station: 'gate', rail: 1, yaw: 0, elevation: 10, speed: 20, originX: 0, environment: {floor: 'A'}};
  const restored = restoreShareLine(decodeShareLine(encodeShareLine(payload)), payload.build);
  assert.equal(restored.autoFire, false);
  assert.equal(restored.route, '/lab/yard-place-card');
  assert.equal(restored.setup.originX, 0);
  assert.equal(restored.setup.charge > 0, true);
  const linecraft = {...payload, route: '/lab/linecraft'};
  assert.equal(restoreShareLine(decodeShareLine(encodeShareLine(linecraft)), payload.build).route, '/lab/linecraft');
  assert.match(game, /parsed\.route!==route/);
  assert.match(game, /route:'\/lab\/yard-place-card'/);
});

test('prototype edits do not assign physics, score, or recognition constants', () => {
  const diff = execFileSync('git', ['diff', '-U0', BASE, '--', 'app/manners-game.tsx', 'lib/yard-place.js', 'lib/share-line.js', 'app/globals.css', 'app/lab/yard-place-card/page.tsx', 'lib/yard-place.d.ts'], {encoding: 'utf8'});
  const added = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
  const offenders = added.filter(line => /\b(padImpulse|REDIRECT_GATES|LINE_SAFETY|RUN_RULE|VARIETY_RULE)\b/.test(line) || /\bRAIL_RULES\s*=/.test(line) || /RAIL_RULES\.(?!railPositions)/.test(line));
  assert.deepEqual(offenders, []);
  for (const path of ['app/page.tsx', 'app/courtyard/page.tsx', 'app/practice/page.tsx', 'app/lab/yard-place/page.tsx', 'app/lab/linecraft/page.tsx']) {
    assert.equal(execFileSync('git', ['diff', BASE, '--', path], {encoding: 'utf8'}), '', path);
  }
  assert.equal(STORAGE_PREFIX, 'rail-golf:yard-place:');
  assert.equal(CARD_STORAGE_PREFIX, 'rail-golf:yard-place-card:');
});
