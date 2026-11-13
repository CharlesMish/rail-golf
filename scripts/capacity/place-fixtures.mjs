// Place the 24-piece benchmark fixtures and record the shots that define them.
// Original Descending Resonance pieces and the seven tested shots stay put.
//   node scripts/capacity/place-fixtures.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { applyFoundryLayout, foundryContactBodies } from '../../lib/worldcraft-foundry.js';
import { adaptRangePreset, exportRangePreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from '../range/run.mjs';

Logger.LogLevels = 0;

const SOURCE = 'a95de239f4c3347cddcd247ffcae205587c627a6';
const descending = JSON.parse(await readFile(new URL('../../worlds/foundry/descending-resonance/preset.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../../worlds/foundry/descending-resonance/manifest.json', import.meta.url), 'utf8'));
const baseObjects = descending.objects.map(object => structuredClone(object));

function voiced(kind, id, x, z, degree) {
  return { id, kind, x, z, yaw: 0, voice: { material: degree % 2 ? 'metal' : 'timber', degree: degree % 5 } };
}
function plate(id, x, z, degree) { return voiced('plate', id, x, z, degree); }
function bank(id, x, z, degree) { return voiced('bank', id, x, z, degree); }

function presetFrom(id, name, extras) {
  const objects = [...baseObjects, ...extras];
  return validateRangePreset({
    format: descending.format,
    version: 1,
    id,
    name,
    capacity: 24,
    environment: descending.environment,
    launcher: descending.launcher,
    objects,
    rules: {
      launcher: descending.rules.launcher,
      fixed: objects.map(object => object.id),
      allowance: {},
      goal: { kind: 'none' },
    },
  });
}

const passive = presetFrom('capacity-24-passive', 'Capacity 24 Passive', [
  plate('back-1', -21, 72, 0), plate('back-2', -15, 72, 1), plate('back-3', -9, 72, 2), plate('back-4', -3, 72, 3),
  plate('back-5', 3, 72, 4), plate('back-6', 9, 72, 0), plate('back-7', 15, 72, 1), plate('back-8', 21, 72, 2),
  plate('back-9', -15, 84, 3), plate('back-10', -9, 84, 4), plate('back-11', -3, 84, 0), plate('back-12', 3, 84, 1),
]);

const active = presetFrom('capacity-24-active', 'Capacity 24 Active', [
  bank('east-1', 18, 38, 0), bank('east-2', 18, 46, 1), bank('east-3', 18, 54, 2),
  bank('east-4', 18, 62, 3), bank('east-5', 18, 70, 4), bank('east-6', 18, 78, 0),
  plate('east-7', 24, 42, 1), plate('east-8', 24, 50, 2), plate('east-9', 24, 58, 3),
  plate('east-10', 24, 66, 4), plate('east-11', 24, 74, 0), plate('east-12', 24, 82, 1),
]);

function sameTerminal(actual, expected) {
  return actual.reason === expected.reason
    && Object.is(actual.elapsed, expected.elapsed)
    && actual.position.every((item, index) => Object.is(item, expected.position[index]));
}

function shoot(harness, preset, shot) {
  const document = shot.layout ? applyFoundryLayout(preset, shot.layout).preset : preset;
  const world = adaptRangePreset(document).world;
  const setup = {
    railIndex: shot.setup.railIndex, originX: shot.setup.originX,
    yaw: shot.setup.yaw, elevation: shot.setup.elevation, charge: shot.setup.charge,
  };
  const last = harness.shoot(world, setup);
  return { last, contacts: foundryContactBodies(last.contacts) };
}

function checkOriginals(harness, preset) {
  const rows = [];
  for (const shot of manifest.testedShots) {
    const result = shoot(harness, preset, shot);
    const contacts = !shot.contacts || (shot.contacts.length === result.contacts.length && shot.contacts.every((body, index) => body === result.contacts[index]));
    const terminal = sameTerminal(result.last.terminal, shot.terminal);
    const originalBodies = new Set([...baseObjects.map(object => `worldcraft-object-${object.id}`), 'worldcraft-tee']);
    const extra = result.contacts.filter(body => !originalBodies.has(body));
    rows.push({ id: shot.id, terminal, contacts, extra, actual: result.contacts });
  }
  return rows;
}

const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const passiveHarness = createRangeHarness(havok, adaptRangePreset(passive).world, SOURCE);
const passiveRows = checkOriginals(passiveHarness, passive);
passiveHarness.dispose();
const passiveOk = passiveRows.every(row => row.terminal && row.contacts && row.extra.length === 0);
console.error('passive originals', passiveOk, passiveRows.map(row => `${row.id}:${row.terminal && row.contacts && !row.extra.length}`).join(' '));
if (!passiveOk) {
  console.error(JSON.stringify(passiveRows.filter(row => !row.terminal || !row.contacts || row.extra.length), null, 2));
  process.exit(1);
}

const activeHarness = createRangeHarness(havok, adaptRangePreset(active).world, SOURCE);
const activeRows = checkOriginals(activeHarness, active);
const activeOk = activeRows.every(row => row.terminal && row.contacts && row.extra.length === 0);
console.error('active originals', activeOk, activeRows.map(row => `${row.id}:${row.terminal && row.contacts && !row.extra.length}`).join(' '));

const newIds = new Set(active.objects.filter(object => object.id.startsWith('east-')).map(object => `worldcraft-object-${object.id}`));
let best = null;
if (activeOk) {
  for (let yaw = 4; yaw <= 18; yaw += 2) {
    for (let elevation = 10; elevation <= 28; elevation += 2) {
      for (let charge = 0.5; charge <= 0.9; charge = Math.round((charge + 0.05) * 100) / 100) {
        const shot = { setup: { railIndex: 1, originX: 0, yaw, elevation, charge } };
        const result = shoot(activeHarness, active, shot);
        const fresh = result.contacts.filter(body => newIds.has(body));
        const times = (result.last.resonance?.impacts ?? []).map(impact => impact.time).sort((a, b) => a - b);
        let gap = null;
        for (let index = 1; index < times.length; index += 1) {
          const delta = (times[index] - times[index - 1]) * 1000;
          if (gap === null || delta < gap) gap = delta;
        }
        if (fresh.length < 3 || result.contacts.length > 8) continue;
        const candidate = {
          yaw, elevation, charge,
          contacts: result.contacts,
          fresh: fresh.length,
          impacts: times.length,
          gap,
          terminal: result.last.terminal,
        };
        const score = fresh.length * 10 + result.contacts.length - (gap ?? 1000) / 1000;
        if (!best || score > best.score) best = { ...candidate, score };
      }
    }
  }
}
activeHarness.dispose();
console.error('best active', best ? { yaw: best.yaw, elevation: best.elevation, charge: best.charge, fresh: best.fresh, contacts: best.contacts, gap: best.gap, terminal: best.terminal } : null);

if (!activeOk || !best || best.fresh < 3) {
  console.error(JSON.stringify(activeRows.filter(row => !row.terminal || !row.contacts || row.extra.length), null, 2));
  process.exit(1);
}

function tested(shot, result) {
  return {
    id: shot.id,
    setup: shot.setup,
    launchPhase: null,
    terminal: { reason: result.terminal.reason, elapsed: result.terminal.elapsed, position: result.terminal.position },
    outcome: { kind: 'none', status: 'none' },
    contacts: result.contacts,
  };
}

function manifestFor(preset, shots, question, evidence) {
  return {
    format: 'rail-golf-worldcraft-foundry-manifest',
    version: 1,
    id: preset.id,
    name: preset.name,
    kind: 'shot-study',
    invitation: 'A measurement fixture. The original twelve pieces stay where Descending Resonance put them. Twelve more legal pieces stand in the yard. There is no target.',
    physicalQuestion: question,
    editable: { launcher: true, geometry: false },
    challenge: null,
    sourceBuild: SOURCE,
    seed: 20261113,
    testedShots: shots,
    nearbySensitivity: 'These shots are measurement points, not a tuned line. Neighbouring slider steps were not searched.',
    validationEvidence: evidence,
    limitations: [{
      category: 'authoring-tooling',
      concept: 'A benchmark fixture at the experimental 24-piece capacity.',
      missing: 'This is not a level. The extra pieces are placed to be measured, not to be played as a composition.',
      extension: 'Keep the capacity field opt-in. The production default remains 12.',
    }],
    customCode: null,
  };
}

const passiveShots = manifest.testedShots.map(shot => tested(shot, {
  terminal: shot.terminal,
  contacts: shot.contacts,
}));
const activeShots = [
  ...manifest.testedShots.filter(shot => ['opening', 'four', 'descent'].includes(shot.id)).map(shot => tested(shot, { terminal: shot.terminal, contacts: shot.contacts })),
  tested({
    id: 'east-rake',
    setup: { railIndex: 1, originX: 0, yaw: best.yaw, elevation: best.elevation, charge: best.charge },
  }, { terminal: best.terminal, contacts: best.contacts.slice(0, 8) }),
];

async function writePair(dir, preset, card) {
  const root = resolve(dir);
  await mkdir(root, { recursive: true });
  await writeFile(resolve(root, 'preset.json'), `${exportRangePreset(preset)}\n`);
  await writeFile(resolve(root, 'manifest.json'), `${JSON.stringify(card, null, 2)}\n`);
}

await writePair('worlds/foundry/capacity-24-passive', passive, manifestFor(
  passive,
  passiveShots,
  'Do the original seven Descending Resonance shots still end on the same bodies when twelve untouched plates stand behind them?',
  'Headless Havok replayed the seven Descending Resonance tested shots on this 24-piece document. Terminals and contact order matched the 12-piece record. None of those shots named a back plate.',
));
await writePair('worlds/foundry/capacity-24-active', active, manifestFor(
  active,
  activeShots,
  'What does a shot cost when it can reach twelve added plates as well as the original twelve?',
  'Headless Havok replayed opening, descent, and four on the added plates and matched the 12-piece terminals. east-rake is a separate aim that reaches the added plates. It is a measurement shot, not a designed line.',
));
console.log('wrote fixtures');
