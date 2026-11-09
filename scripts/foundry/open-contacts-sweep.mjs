// Headless Havok search for Open Contacts. The seed is recorded and is not
// applied to the solver. Aim steps are the play sliders (0.5° yaw and
// elevation, 0.01 charge, 0.5 m origin). Bank steps are the editor steps
// (0.5 m, 5°). Dynamics are set to face speed so impact gains carry a normal
// speed. The flight does not depend on that setting.
//
//   node scripts/foundry/open-contacts-sweep.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { adaptRangePreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../range/run.mjs';

Logger.LogLevels = 0;

const seed = 20261109;
const outPath = 'docs/experiments/foundry/lanes/expressive/sweep.json';
const preset = validateRangePreset(JSON.parse(await readFile(new URL('../../worlds/foundry/open-contacts/preset.json', import.meta.url), 'utf8')));
const opening = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };

function withBank(yaw, x = 0, z = 34) {
  return validateRangePreset({
    ...preset,
    objects: preset.objects.map(object => object.id === 'bank-timber' ? { ...object, x, z, yaw } : object),
  });
}

function orderOf(last) {
  const impacts = last.resonance?.impacts ?? [];
  return impacts.map(impact => `${impact.piece}:${impact.note}`).join('>') || '(silent)';
}

function slim(impact) {
  return {
    piece: impact.piece,
    role: impact.role,
    time: impact.time,
    material: impact.material,
    degree: impact.degree,
    note: impact.note,
    hz: impact.hz,
    gain: impact.gain,
    speed: impact.speed,
    normalSpeed: impact.normalSpeed,
    callbacks: impact.callbacks,
  };
}

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const session = createRangeHarness(havok, adaptRangePreset(preset).world, rangeGitSha());
if (!session.runtime.setDynamics('normal-speed')) throw new Error('normal-speed was rejected');

const campaigns = new Map();
const exemplars = new Map();

function shoot(document, setup, campaign, exemplarId = null) {
  const world = adaptRangePreset(document).world;
  const last = session.shoot(world, setup);
  const order = orderOf(last);
  const bucket = campaigns.get(campaign) ?? [];
  bucket.push({ setup, order, bankYaw: document.objects.find(object => object.id === 'bank-timber').yaw, bankX: document.objects.find(object => object.id === 'bank-timber').x, bankZ: document.objects.find(object => object.id === 'bank-timber').z });
  campaigns.set(campaign, bucket);
  if (exemplarId) {
    exemplars.set(exemplarId, {
      id: exemplarId,
      setup,
      bank: { x: document.objects.find(object => object.id === 'bank-timber').x, z: document.objects.find(object => object.id === 'bank-timber').z, yaw: document.objects.find(object => object.id === 'bank-timber').yaw },
      order,
      terminal: last.terminal,
      outcome: { kind: 'none', status: 'none' },
      impacts: (last.resonance?.impacts ?? []).map(slim),
    });
  }
  return order;
}

function tally(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.order, (counts.get(row.order) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([order, count]) => ({ order, count }));
}

function bands(values, step) {
  const hits = [...new Set(values)].sort((a, b) => a - b);
  if (!hits.length) return [];
  const found = [];
  let start = hits[0];
  let previous = hits[0];
  for (const value of hits.slice(1)) {
    if (value - previous - step > 1e-6) {
      found.push([start, previous]);
      start = value;
    }
    previous = value;
  }
  found.push([start, previous]);
  return found;
}

function same(rows, key) {
  return rows.every(row => row.setup[key] === rows[0].setup[key]);
}

for (let yaw = -4; yaw <= 4; yaw += 0.5) shoot(preset, { ...opening, yaw }, 'opening-yaw', yaw === 0 ? 'opening' : yaw === 4 ? 'two-note' : null);
for (const yaw of [-0.5, 0.5]) shoot(preset, { ...opening, yaw }, 'opening-step');
for (let elevation = 16; elevation <= 20; elevation += 0.5) shoot(preset, { ...opening, elevation }, 'opening-elevation');
for (let cents = 50; cents <= 60; cents += 1) shoot(preset, { ...opening, charge: cents / 100 }, 'opening-charge');
for (const originX of [-1, -0.5, 0.5, 1]) shoot(preset, { ...opening, originX }, 'opening-origin');

for (let yaw = 0; yaw <= 14; yaw += 0.5) {
  shoot(preset, { ...opening, yaw }, 'strip-elev-18', yaw === 6 ? 'rattle' : null);
  shoot(preset, { ...opening, yaw, elevation: 16 }, 'strip-elev-16');
}
for (let yaw = -10; yaw <= -4; yaw += 0.5) shoot(preset, { ...opening, yaw }, 'strip-elev-18-negative');

for (let yaw = 4; yaw <= 18; yaw += 0.5) shoot(preset, { ...opening, yaw, elevation: 12 }, 'direct-elev-12', yaw === 12 ? 'direct-plate' : null);
for (let yaw = 26; yaw <= 36; yaw += 0.5) shoot(preset, { ...opening, yaw, elevation: 10 }, 'outer-positive', yaw === 30 ? 'outer-plate' : null);
for (let yaw = -36; yaw <= -26; yaw += 0.5) shoot(preset, { ...opening, yaw, elevation: 10 }, 'outer-negative');

for (let elevation = 20; elevation <= 32; elevation += 0.5) shoot(preset, { ...opening, elevation }, 'lob-elevation', elevation === 26 ? 'lob' : null);
for (let yaw = -6; yaw <= 6; yaw += 0.5) shoot(preset, { ...opening, yaw, elevation: 26 }, 'lob-yaw');
for (let cents = 50; cents <= 60; cents += 1) shoot(preset, { ...opening, elevation: 26, charge: cents / 100 }, 'lob-charge');

for (const yaw of [-30, -25, -20, -15, -10, 0, 10, 15, 20, 25, 30]) {
  shoot(withBank(yaw), opening, 'bank-yaw', yaw === 20 ? 'bank-turned' : null);
}
for (const aim of [-0.5, 0.5]) shoot(withBank(20), { ...opening, yaw: aim }, 'bank-turned-aim');
for (const x of [-2, -1, -0.5, 0.5, 1, 2]) shoot(withBank(0, x, 34), opening, 'bank-x');
for (const z of [32, 33, 33.5, 34.5, 35, 36]) shoot(withBank(0, 0, z), opening, 'bank-z');

const coarse = [];
for (let yaw = -36; yaw <= 36; yaw += 2) {
  for (const elevation of [8, 12, 16, 18, 24, 26]) {
    for (const charge of [0.4, 0.55, 0.7]) coarse.push(shoot(preset, { railIndex: 1, originX: 0, yaw, elevation, charge }, 'coarse'));
  }
}

const neighbors = [
  ['two-note-yaw-minus', { ...opening, yaw: 3.5 }],
  ['two-note-yaw-plus', { ...opening, yaw: 4.5 }],
  ['two-note-elev-minus', { ...opening, yaw: 4, elevation: 17.5 }],
  ['two-note-elev-plus', { ...opening, yaw: 4, elevation: 18.5 }],
  ['two-note-charge-minus', { ...opening, yaw: 4, charge: 0.54 }],
  ['two-note-charge-plus', { ...opening, yaw: 4, charge: 0.56 }],
  ['rattle-yaw-minus', { ...opening, yaw: 5.5 }],
  ['rattle-yaw-plus', { ...opening, yaw: 6.5 }],
  ['rattle-elev-minus', { ...opening, yaw: 6, elevation: 17.5 }],
  ['rattle-elev-plus', { ...opening, yaw: 6, elevation: 18.5 }],
  ['rattle-charge-minus', { ...opening, yaw: 6, charge: 0.54 }],
  ['rattle-charge-plus', { ...opening, yaw: 6, charge: 0.56 }],
  ['lob-elev-minus', { ...opening, elevation: 25.5 }],
  ['lob-elev-plus', { ...opening, elevation: 26.5 }],
  ['lob-yaw', { ...opening, elevation: 26, yaw: 0.5 }],
  ['lob-charge-minus', { ...opening, elevation: 26, charge: 0.54 }],
  ['lob-charge-plus', { ...opening, elevation: 26, charge: 0.56 }],
];
for (const [id, setup] of neighbors) shoot(preset, setup, 'neighbors', id);

session.dispose();

function campaignSummary(name) {
  const rows = campaigns.get(name) ?? [];
  const summary = { shots: rows.length, orders: tally(rows) };
  if (!rows.length) return summary;
  const orders = [...new Set(rows.map(row => row.order))];
  if (same(rows, 'elevation') && same(rows, 'charge') && same(rows, 'originX')) {
    summary.yawBands = Object.fromEntries(orders.map(order => [order, bands(rows.filter(row => row.order === order).map(row => row.setup.yaw), 0.5)]));
  }
  if (same(rows, 'yaw') && same(rows, 'charge') && same(rows, 'originX')) {
    summary.elevationBands = Object.fromEntries(orders.map(order => [order, bands(rows.filter(row => row.order === order).map(row => row.setup.elevation), 0.5)]));
  }
  if (same(rows, 'yaw') && same(rows, 'elevation') && same(rows, 'originX')) {
    summary.chargeBands = Object.fromEntries(orders.map(order => [order, bands(rows.filter(row => row.order === order).map(row => row.setup.charge), 0.01)]));
  }
  if (new Set(rows.map(row => row.bankYaw)).size > 1 && same(rows, 'yaw') && same(rows, 'elevation') && same(rows, 'charge')) {
    summary.bankYaw = rows.map(row => ({ yaw: row.bankYaw, order: row.order }));
  }
  return summary;
}

const report = {
  seed,
  presetId: preset.id,
  gitSha: rangeGitSha(),
  dynamics: 'normal-speed',
  dynamicsNote: 'Face speed is recorded so a later render can voice the timber bank with the existing tuned-even function. The same contacts are what Havok stores. The gallery ear for this preset id stays total-speed and does not pass tuned-even. Flight does not change with the dynamics setting.',
  shots: [...campaigns.values()].reduce((sum, rows) => sum + rows.length, 0),
  campaigns: Object.fromEntries([...campaigns.keys()].map(name => [name, campaignSummary(name)])),
  exemplars: [...exemplars.values()],
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(report, null, 2) + '\n');

const expect = [
  ['opening', 'bank-timber:C4'],
  ['two-note', 'bank-timber:C4>plate-return-right:E4'],
  ['rattle', 'bank-timber:C4>plate-return-right:E4>bank-timber:C4'],
  ['lob', 'plate-deep:C4'],
  ['direct-plate', 'plate-return-right:E4'],
  ['outer-plate', 'plate-aim-right:A4'],
  ['bank-turned', 'bank-timber:C4>plate-return-left:D4'],
];
const failures = [];
for (const [id, order] of expect) {
  const found = exemplars.get(id);
  if (!found || found.order !== order) failures.push(`${id}: ${found?.order ?? 'missing'} expected ${order}`);
}
const openingSteps = (campaigns.get('opening-step') ?? []).map(row => row.order);
if (openingSteps.some(order => order !== 'bank-timber:C4')) failures.push('opening yaw step left the timber bank: ' + openingSteps.join(', '));
if (coarse.length < 600) failures.push('coarse grid was smaller than planned');

process.stdout.write(`${JSON.stringify({ shots: report.shots, campaigns: Object.fromEntries(Object.entries(report.campaigns).map(([name, item]) => [name, item.shots])), failures }, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
