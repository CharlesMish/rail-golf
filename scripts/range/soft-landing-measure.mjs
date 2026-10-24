// Soft Landing measurement. Three procedures stay in separate JSONL files:
// uniform grid, targeted neighborhood (widths and areas), player-like search.
// The seed is provenance. It is not applied to the solver.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Havok from '@babylonjs/havok';
import { createSoftLandingPreset, parseRangePreset, rangeStartingSetup, validateRangePreset } from '../../lib/worldcraft-range.js';
import { runRange, rangeGitSha } from './run.mjs';
import { clearRuns, contiguousArea, contiguousWidth } from './tolerance.mjs';

const root = resolve(import.meta.dirname, '../../docs/experiments/range');
const SEED = 20261024;
const gitSha = rangeGitSha();
const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });

function series(from, to, step) {
  const count = Math.round((to - from) / step);
  return Array.from({ length: count + 1 }, (_, index) => Math.round((from + index * step) * 1e6) / 1e6);
}
function tidy(value) {
  return Math.round(value * 1e9) / 1e9;
}
function place(preset, id, patch) {
  return validateRangePreset({
    ...preset,
    objects: preset.objects.map(object => object.id === id ? { ...object, ...patch } : { ...object }),
  });
}
function legal(preset) {
  try { validateRangePreset(preset); return true; } catch { return false; }
}
async function batch(preset, items) {
  const setups = items.map(item => item.setup);
  const labels = items.map(item => item.label);
  const varies = items.some(item => item.preset);
  const documentAt = varies ? (_setup, index) => items[index].preset ?? preset : null;
  const { lines, rejected } = await runRange({ preset, setups, seed: SEED, gitSha, havok, documentAt, labels });
  const rows = lines.filter(line => line.type === 'shot' || line.type === 'rejected');
  if (rows.length !== items.length) throw new Error(`Expected ${items.length} rows, got ${rows.length}`);
  return { lines, rejected, pairs: items.map((item, index) => ({ item, row: rows[index] })) };
}
function scored(row) {
  return row.type === 'shot' && row.outcome?.scored === true;
}
function widthOf(pairs, valueOf, representative, step) {
  const samples = pairs.map(({ item, row }) => ({
    value: valueOf(item),
    clear: scored(row),
    representative: Math.abs(valueOf(item) - representative) < 1e-6,
  }));
  const result = contiguousWidth(samples, step);
  return {
    ...result,
    first: tidy(result.first),
    last: tidy(result.last),
    width: tidy(result.width),
    bracketLow: result.bracketLow === null ? null : tidy(result.bracketLow),
    bracketHigh: result.bracketHigh === null ? null : tidy(result.bracketHigh),
  };
}
function axisItems(setup, label, field, values, representative) {
  return values.map(value => ({
    setup: { ...setup, [field]: value },
    label,
    value,
    representative: Math.abs(value - representative) < 1e-6,
  }));
}
function pieceItems(preset, setup, label, id, field, values, representative) {
  const items = [];
  for (const value of values) {
    let next = null;
    try { next = place(preset, id, { [field]: value }); } catch { next = null; }
    items.push({
      preset: next ?? preset,
      setup,
      label,
      value,
      representative: Math.abs(value - representative) < 1e-6,
      invalid: !next || !legal(next),
      skip: !next || !legal(next),
    });
  }
  return items;
}
async function shootValid(preset, items) {
  const live = [];
  const liveIndex = [];
  items.forEach((item, index) => { if (!item.skip) { live.push(item); liveIndex.push(index); } });
  const shot = live.length ? await batch(preset, live) : { lines: [], pairs: [] };
  const pairs = items.map(item => ({ item, row: { type: 'invalid', outcome: { scored: false } } }));
  shot.pairs.forEach((pair, index) => { pairs[liveIndex[index]] = pair; });
  return { lines: shot.lines, pairs, invalid: items.length - live.length };
}
function gridItems() {
  return gridSetups().map(setup => ({ setup, label: 'uniform-grid' }));
}
function gridSetups() {
  const setups = [];
  for (const originX of [-4, 0, 4]) {
    for (const yaw of [-12, -6, 0, 6, 12]) {
      for (const elevation of [18, 24, 30, 36]) {
        for (const charge of [0.45, 0.55, 0.65, 0.75]) {
          setups.push({ railIndex: 1, originX, yaw, elevation, charge });
        }
      }
    }
  }
  return setups;
}
function gridSummary(pairs) {
  const clears = pairs.filter(pair => scored(pair.row));
  return {
    shots: pairs.length,
    clears: clears.length,
    clearCells: clears.map(pair => pair.item.setup),
    note: 'This is a uniform-grid count. It is not a tolerance width and not a player success probability.',
  };
}
function areaOf(pairs, steps, origin) {
  const cells = pairs.map(({ item, row }) => ({
    yaw: item.setup.yaw,
    charge: item.setup.charge,
    clear: scored(row),
    representative: item.representative,
  }));
  const area = contiguousArea(cells, steps, origin);
  return { ...area, area: tidy(area.area), yawFirst: tidy(area.yawFirst), yawLast: tidy(area.yawLast), chargeFirst: tidy(area.chargeFirst), chargeLast: tidy(area.chargeLast) };
}
function blockAreaOf(pairs, steps, origin) {
  const cells = pairs.map(({ item, row }) => ({
    yaw: item.x,
    charge: item.z,
    clear: scored(row),
    representative: item.representative,
  }));
  const area = contiguousArea(cells, { yaw: steps.x, charge: steps.z }, { yaw: origin.x, charge: origin.z });
  return {
    count: area.count,
    area: tidy(area.area),
    stepX: steps.x,
    stepZ: steps.z,
    censored: area.censored,
    xFirst: tidy(area.yawFirst),
    xLast: tidy(area.yawLast),
    zFirst: tidy(area.chargeFirst),
    zLast: tidy(area.chargeLast),
    note: 'Area is square metres of the 4-connected component on the 0.5 m piece grid. yaw/charge names inside the helper are the two axes.',
  };
}
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function snap(value, step) {
  return Math.round((Math.round(value / step) * step) * 1e6) / 1e6;
}
const PLAYER_AXES = [
  { name: 'yaw', apply: (state, sign) => ({ ...state, setup: { ...state.setup, yaw: snap(state.setup.yaw + sign * 0.5, 0.5) } }) },
  { name: 'elevation', apply: (state, sign) => ({ ...state, setup: { ...state.setup, elevation: snap(state.setup.elevation + sign * 0.5, 0.5) } }) },
  { name: 'charge', apply: (state, sign) => ({ ...state, setup: { ...state.setup, charge: snap(state.setup.charge + sign * 0.01, 0.01) } }) },
  { name: 'originX', apply: (state, sign) => ({ ...state, setup: { ...state.setup, originX: snap(state.setup.originX + sign * 0.5, 0.5) } }) },
  { name: 'backstop.x', apply: (state, sign) => movePiece(state, 'backstop', 'x', sign * 0.5, 0.5) },
  { name: 'backstop.z', apply: (state, sign) => movePiece(state, 'backstop', 'z', sign * 0.5, 0.5) },
  { name: 'backstop.yaw', apply: (state, sign) => movePiece(state, 'backstop', 'yaw', sign * 5, 5) },
  { name: 'redirect.x', apply: (state, sign) => movePiece(state, 'redirect', 'x', sign * 0.5, 0.5) },
  { name: 'redirect.z', apply: (state, sign) => movePiece(state, 'redirect', 'z', sign * 0.5, 0.5) },
  { name: 'redirect.yaw', apply: (state, sign) => movePiece(state, 'redirect', 'yaw', sign * 5, 5) },
];
function movePiece(state, id, field, delta, step) {
  return {
    ...state,
    objects: state.objects.map(object => object.id === id ? { ...object, [field]: snap(object[field] + delta, step) } : object),
  };
}
function statePreset(base, state) {
  return validateRangePreset({ ...base, objects: state.objects.map(object => ({ ...object })) });
}
function playerPlan(base, start, seed, trials, steps, label) {
  const protocol = [];
  const items = [];
  for (let trial = 0; trial < trials; trial += 1) {
    const random = mulberry32(seed + trial);
    let state = {
      setup: { ...start },
      objects: base.objects.map(object => ({ ...object })),
    };
    for (let step = 0; step < steps; step += 1) {
      const axis = PLAYER_AXES[Math.floor(random() * PLAYER_AXES.length)];
      const sign = random() < 0.5 ? -1 : 1;
      const next = axis.apply(state, sign);
      let accepted = false;
      try {
        const preset = statePreset(base, next);
        const setup = { ...next.setup, railIndex: 1 };
        if (setup.yaw < -70 || setup.yaw > 70 || setup.elevation < 5 || setup.elevation > 85 || setup.charge < 0 || setup.charge > 1 || setup.originX < -10 || setup.originX > 10) {
          throw new Error('outside shot bounds');
        }
        accepted = true;
        state = { setup, objects: next.objects };
        items.push({ preset, setup, label, trial, step });
      } catch { accepted = false; }
      protocol.push({ trial, step, axis: axis.name, sign, accepted, seed: seed + trial });
    }
  }
  return { protocol, items };
}
function playerSummary(protocol, pairs) {
  const byTrial = new Map();
  for (const pair of pairs) {
    const list = byTrial.get(pair.item.trial) ?? [];
    list.push(pair);
    byTrial.set(pair.item.trial, list);
  }
  const firstClears = [];
  for (const [trial, list] of byTrial) {
    const hit = list.find(pair => scored(pair.row));
    if (hit) firstClears.push({ trial, step: hit.item.step, setup: hit.item.setup });
  }
  for (const entry of protocol) {
    if (!entry.accepted) continue;
    const pair = pairs.find(item => item.item.trial === entry.trial && item.item.step === entry.step);
    entry.cleared = pair ? scored(pair.row) : false;
  }
  return {
    trials: new Set(protocol.map(entry => entry.trial)).size,
    fired: pairs.length,
    trialsThatCleared: firstClears.length,
    firstClearSteps: firstClears.map(hit => hit.step),
    note: 'Random one-detent walks. Not a tolerance width and not a player success probability.',
  };
}

const opening = createSoftLandingPreset();
const fragile = parseRangePreset(await readFile(resolve(root, 'appendix/soft-landing/fragile.json'), 'utf8'));
const forgiving = parseRangePreset(await readFile(resolve(root, 'appendix/soft-landing/forgiving.json'), 'utf8'));
const fragileSetup = rangeStartingSetup(fragile);
const forgivingSetup = rangeStartingSetup(forgiving);
const openingSetup = rangeStartingSetup(opening);
const deeper = place(forgiving, 'backstop', { z: 71 });

console.log('grid');
const gridOpening = await batch(opening, gridItems());
const gridForgiving = await batch(forgiving, gridItems());

console.log('neighborhood axes');
const fragileAxes = {
  yaw: axisItems(fragileSetup, 'neighborhood-yaw', 'yaw', series(-8, 8, 0.25), fragileSetup.yaw),
  elevation: axisItems(fragileSetup, 'neighborhood-elevation', 'elevation', series(16, 36, 0.25), fragileSetup.elevation),
  charge: axisItems(fragileSetup, 'neighborhood-charge', 'charge', series(0.54, 0.74, 0.002), fragileSetup.charge),
  originX: axisItems(fragileSetup, 'neighborhood-origin', 'originX', series(-10, 10, 0.5), fragileSetup.originX),
};
const forgivingAxes = {
  yaw: axisItems(forgivingSetup, 'neighborhood-yaw', 'yaw', series(-8, 8, 0.25), forgivingSetup.yaw),
  elevation: axisItems(forgivingSetup, 'neighborhood-elevation', 'elevation', series(16, 36, 0.25), forgivingSetup.elevation),
  charge: axisItems(forgivingSetup, 'neighborhood-charge', 'charge', series(0.54, 0.74, 0.002), forgivingSetup.charge),
  originX: axisItems(forgivingSetup, 'neighborhood-origin', 'originX', series(-10, 10, 0.5), forgivingSetup.originX),
};
const fragileAxisShot = await batch(fragile, Object.values(fragileAxes).flat());
const forgivingAxisShot = await batch(forgiving, Object.values(forgivingAxes).flat());
function take(shot, items) {
  const wanted = new Set(items);
  return shot.pairs.filter(pair => wanted.has(pair.item));
}
const fragileWidths = {
  yaw: widthOf(take(fragileAxisShot, fragileAxes.yaw), item => item.value, fragileSetup.yaw, 0.25),
  elevation: widthOf(take(fragileAxisShot, fragileAxes.elevation), item => item.value, fragileSetup.elevation, 0.25),
  charge: widthOf(take(fragileAxisShot, fragileAxes.charge), item => item.value, fragileSetup.charge, 0.002),
  originX: widthOf(take(fragileAxisShot, fragileAxes.originX), item => item.value, fragileSetup.originX, 0.5),
};
const forgivingWidths = {
  yaw: widthOf(take(forgivingAxisShot, forgivingAxes.yaw), item => item.value, forgivingSetup.yaw, 0.25),
  elevation: widthOf(take(forgivingAxisShot, forgivingAxes.elevation), item => item.value, forgivingSetup.elevation, 0.25),
  charge: widthOf(take(forgivingAxisShot, forgivingAxes.charge), item => item.value, forgivingSetup.charge, 0.002),
  originX: widthOf(take(forgivingAxisShot, forgivingAxes.originX), item => item.value, forgivingSetup.originX, 0.5),
};

console.log('piece neighborhoods');
async function pieceWidth(preset, setup, id, field, values, representative, step, label) {
  const items = pieceItems(preset, setup, label, id, field, values, representative);
  const shot = await shootValid(preset, items);
  return { shot, width: widthOf(shot.pairs, item => item.value, representative, step), invalid: shot.invalid };
}
const fragilePieces = {
  backstopX: await pieceWidth(fragile, fragileSetup, 'backstop', 'x', series(0, 24, 0.5), 18, 0.5, 'piece-backstop-x'),
  backstopZ: await pieceWidth(fragile, fragileSetup, 'backstop', 'z', series(60, 96, 0.5), 86, 0.5, 'piece-backstop-z'),
  backstopYaw: await pieceWidth(fragile, fragileSetup, 'backstop', 'yaw', series(-180, 175, 5), 0, 5, 'piece-backstop-yaw'),
  redirectX: await pieceWidth(fragile, fragileSetup, 'redirect', 'x', series(-27, -6, 0.5), -18, 0.5, 'piece-redirect-x'),
  redirectZ: await pieceWidth(fragile, fragileSetup, 'redirect', 'z', series(16, 48, 0.5), 28, 0.5, 'piece-redirect-z'),
  redirectYaw: await pieceWidth(fragile, fragileSetup, 'redirect', 'yaw', series(-180, 175, 5), 0, 5, 'piece-redirect-yaw'),
};
const forgivingPieces = {
  backstopX: await pieceWidth(forgiving, forgivingSetup, 'backstop', 'x', series(-8, 8, 0.5), 0, 0.5, 'piece-backstop-x'),
  backstopZ: await pieceWidth(forgiving, forgivingSetup, 'backstop', 'z', series(60, 84, 0.5), 69, 0.5, 'piece-backstop-z'),
  backstopYaw: await pieceWidth(forgiving, forgivingSetup, 'backstop', 'yaw', series(-180, 175, 5), 0, 5, 'piece-backstop-yaw'),
  redirectX: await pieceWidth(forgiving, forgivingSetup, 'redirect', 'x', series(-27, -6, 0.5), -18, 0.5, 'piece-redirect-x'),
  redirectZ: await pieceWidth(forgiving, forgivingSetup, 'redirect', 'z', series(16, 48, 0.5), 28, 0.5, 'piece-redirect-z'),
  redirectYaw: await pieceWidth(forgiving, forgivingSetup, 'redirect', 'yaw', series(-180, 175, 5), 0, 5, 'piece-redirect-yaw'),
};

console.log('areas');
function aimArea(setup, yawValues, chargeValues) {
  const items = [];
  for (const yaw of yawValues) {
    for (const charge of chargeValues) {
      items.push({
        setup: { ...setup, yaw, charge },
        label: 'area-yaw-charge',
        representative: Math.abs(yaw - setup.yaw) < 1e-6 && Math.abs(charge - setup.charge) < 1e-6,
      });
    }
  }
  return items;
}
const fragileAreaItems = aimArea(fragileSetup, series(-4, 4, 0.5), series(0.55, 0.7, 0.005));
const forgivingAreaItems = aimArea(forgivingSetup, series(-4, 4, 0.5), series(0.55, 0.74, 0.005));
const fragileAreaShot = await batch(fragile, fragileAreaItems);
const forgivingAreaShot = await batch(forgiving, forgivingAreaItems);
const blockAreaItems = [];
for (const x of series(-6, 6, 0.5)) {
  for (const z of series(64, 78, 0.5)) {
    let next = null;
    try { next = place(forgiving, 'backstop', { x, z }); } catch { next = null; }
    blockAreaItems.push({
      preset: next ?? forgiving,
      setup: forgivingSetup,
      label: 'area-block-xz',
      x,
      z,
      representative: x === 0 && z === 69,
      skip: !next,
    });
  }
}
const blockAreaShot = await shootValid(forgiving, blockAreaItems);

console.log('deeper control');
const deeperItems = series(0.54, 0.74, 0.002).map(charge => ({
  setup: { ...forgivingSetup, charge },
  label: 'control-deeper-charge',
  value: charge,
  representative: Math.abs(charge - forgivingSetup.charge) < 1e-6,
}));
const deeperShot = await batch(deeper, deeperItems);
const deeperSamples = deeperShot.pairs.map(({ item, row }) => ({ value: item.value, clear: scored(row) }));

console.log('player search');
const openingPlan = playerPlan(opening, openingSetup, SEED, 30, 40, 'player-opening');
const openingPlayer = await batch(opening, openingPlan.items);
const nearCharge = bracket => Math.floor(bracket * 100 + 1e-9) / 100;
if (fragileWidths.charge.bracketLow === null || forgivingWidths.charge.bracketLow === null) {
  throw new Error('Charge neighborhood reached the scan edge, so the near-miss walk has no bracket');
}
const fragileNearSetup = { ...fragileSetup, charge: nearCharge(fragileWidths.charge.bracketLow) };
const forgivingNearSetup = { ...forgivingSetup, charge: nearCharge(forgivingWidths.charge.bracketLow) };
const fragileNear = playerPlan(fragile, fragileNearSetup, SEED + 1000, 20, 12, 'player-near-fragile');
const forgivingNear = playerPlan(forgiving, forgivingNearSetup, SEED + 2000, 20, 12, 'player-near-forgiving');
const fragileNearShot = fragileNear.items.length ? await batch(fragile, fragileNear.items) : { lines: [], pairs: [] };
const forgivingNearShot = forgivingNear.items.length ? await batch(forgiving, forgivingNear.items) : { lines: [], pairs: [] };

console.log('reproduction');
const reproduction = await batch(opening, [
  { preset: opening, setup: openingSetup, label: 'reproduce-opening' },
  { preset: fragile, setup: fragileSetup, label: 'reproduce-fragile' },
  { preset: forgiving, setup: forgivingSetup, label: 'reproduce-forgiving' },
  { preset: fragile, setup: forgivingSetup, label: 'reproduce-forgiving-aim-on-fragile-pieces' },
]);

function representative(pairs, predicate) {
  const pair = pairs.find(predicate);
  if (!pair || pair.row.type !== 'shot') throw new Error('Missing representative shot');
  return {
    setup: pair.row.setup,
    scored: pair.row.outcome.scored,
    distance: pair.row.outcome.distance,
    contacts: pair.row.contacts.map(contact => contact.body),
    terminal: pair.row.terminal,
    presetHash: pair.row.presetHash,
  };
}
const fragileRep = representative(reproduction.pairs, pair => pair.item.label === 'reproduce-fragile');
const forgivingRep = representative(reproduction.pairs, pair => pair.item.label === 'reproduce-forgiving');
const openingRep = representative(reproduction.pairs, pair => pair.item.label === 'reproduce-opening');
const crossed = representative(reproduction.pairs, pair => pair.item.label === 'reproduce-forgiving-aim-on-fragile-pieces');
if (!fragileRep.scored || !forgivingRep.scored || openingRep.scored || crossed.scored) {
  throw new Error('Representative outcomes changed: ' + JSON.stringify({ fragileRep, forgivingRep, openingRep, crossed }));
}
if (!forgivingRep.contacts.includes('worldcraft-object-backstop') || fragileRep.contacts.includes('worldcraft-object-backstop')) {
  throw new Error('Backstop contact did not match the arrangement roles');
}

const summary = {
  seed: SEED,
  gitSha,
  node: process.version,
  opening: openingRep,
  fragile: fragileRep,
  forgiving: forgivingRep,
  forgivingAimOnFragilePieces: crossed,
  grid: { opening: gridSummary(gridOpening.pairs), forgiving: gridSummary(gridForgiving.pairs) },
  widths: {
    fragile: { ...fragileWidths, pieces: Object.fromEntries(Object.entries(fragilePieces).map(([key, value]) => [key, value.width])) },
    forgiving: { ...forgivingWidths, pieces: Object.fromEntries(Object.entries(forgivingPieces).map(([key, value]) => [key, value.width])) },
  },
  areas: {
    fragileYawCharge: areaOf(fragileAreaShot.pairs, { yaw: 0.5, charge: 0.005 }, { yaw: -4, charge: 0.55 }),
    forgivingYawCharge: areaOf(forgivingAreaShot.pairs, { yaw: 0.5, charge: 0.005 }, { yaw: -4, charge: 0.55 }),
    forgivingBlockXZ: blockAreaOf(blockAreaShot.pairs, { x: 0.5, z: 0.5 }, { x: -6, z: 64 }),
  },
  controlDeeper: {
    blockZ: 71,
    runs: clearRuns(deeperSamples, 0.002).map(run => ({ ...run, first: tidy(run.first), last: tidy(run.last), width: tidy(run.width) })),
    forgivingChargeClears: deeperSamples.some(sample => Math.abs(sample.value - forgivingSetup.charge) < 1e-6 && sample.clear),
    note: 'Same launcher as the forgiving representative, block 2 m deeper. Runs are contiguous clear islands. Their endpoint span is not one window.',
  },
  player: {
    opening: { ...playerSummary(openingPlan.protocol, openingPlayer.pairs), steps: 40, trialsPlanned: 30, start: openingSetup },
    nearFragile: { ...playerSummary(fragileNear.protocol, fragileNearShot.pairs), steps: 12, trialsPlanned: 20, start: fragileNearSetup },
    nearForgiving: { ...playerSummary(forgivingNear.protocol, forgivingNearShot.pairs), steps: 12, trialsPlanned: 20, start: forgivingNearSetup },
  },
  presetHashes: {
    opening: reproduction.pairs[0].row.presetHash,
    fragile: fragileRep.presetHash,
    forgiving: forgivingRep.presetHash,
  },
};

function jsonl(lines) { return lines.map(line => JSON.stringify(line)).join('\n') + '\n'; }
async function emit(path, lines) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, jsonl(lines));
}
await emit(resolve(root, 'runs/soft-landing-grid.jsonl'), [...gridOpening.lines, ...gridForgiving.lines]);
await emit(resolve(root, 'runs/soft-landing-neighborhood.jsonl'), [
  ...fragileAxisShot.lines,
  ...forgivingAxisShot.lines,
  ...Object.values(fragilePieces).flatMap(value => value.shot.lines),
  ...Object.values(forgivingPieces).flatMap(value => value.shot.lines),
  ...deeperShot.lines,
]);
await emit(resolve(root, 'runs/soft-landing-area.jsonl'), [
  ...fragileAreaShot.lines,
  ...forgivingAreaShot.lines,
  ...blockAreaShot.lines,
]);
await emit(resolve(root, 'runs/soft-landing-player.jsonl'), [
  ...openingPlayer.lines,
  ...fragileNearShot.lines,
  ...forgivingNearShot.lines,
]);
await emit(resolve(root, 'runs/soft-landing-reproduction.jsonl'), reproduction.lines);
await writeFile(resolve(root, 'appendix/soft-landing/summary.json'), JSON.stringify(summary, null, 2) + '\n');
await writeFile(resolve(root, 'appendix/soft-landing/player-opening.json'), JSON.stringify({ seed: SEED, trials: 30, steps: 40, protocol: openingPlan.protocol }, null, 2) + '\n');
await writeFile(resolve(root, 'appendix/soft-landing/player-near.json'), JSON.stringify({
  fragile: { seedBase: SEED + 1000, start: fragileNearSetup, protocol: fragileNear.protocol },
  forgiving: { seedBase: SEED + 2000, start: forgivingNearSetup, protocol: forgivingNear.protocol },
}, null, 2) + '\n');
console.log(JSON.stringify({
  gitSha,
  grid: summary.grid,
  widths: { fragile: fragileWidths, forgiving: forgivingWidths },
  areas: summary.areas,
  controlDeeper: summary.controlDeeper,
  player: summary.player,
  distances: { opening: openingRep.distance, fragile: fragileRep.distance, forgiving: forgivingRep.distance, crossed: crossed.distance },
}, null, 2));
