// Check a foundry manifest against its preset, then fire each tested shot
// through the range harness. The recorded terminal has to come back.
//
//   node scripts/foundry/validate.mjs
//   node scripts/foundry/validate.mjs worlds/foundry/soft-landing
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Havok from '@babylonjs/havok';
import { applyFoundryLayout, foundryContactBodies, foundryContactsMatch, loadFoundryPair } from '../../lib/worldcraft-foundry.js';
import { parseRangePreset } from '../../lib/worldcraft-range.js';
import { runRange } from '../range/run.mjs';

const roots = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const dirs = roots.length ? roots : [
  'worlds/foundry/_template',
  'worlds/foundry/bell-loft',
  'worlds/foundry/return-address',
  'worlds/foundry/right-angle',
  'worlds/foundry/open-contacts',
  'worlds/foundry/ricochet-garden-field',
  'worlds/foundry/the-carry',
  'worlds/foundry/the-other-way',
  'worlds/foundry/soft-landing',
];

function sameTerminal(actual, expected) {
  return actual.reason === expected.reason
    && Object.is(actual.elapsed, expected.elapsed)
    && actual.position.length === expected.position.length
    && actual.position.every((item, index) => Object.is(item, expected.position[index]));
}

export function evaluateFoundryShot(actual, expected) {
  const terminal = sameTerminal(actual.terminal, expected.terminal);
  const outcome = actual.outcome?.kind === expected.outcome.kind && actual.outcome?.status === expected.outcome.status;
  const contacts = expected.contacts ? foundryContactsMatch(expected.contacts, actual.contacts) : true;
  return {
    terminal,
    outcome,
    contacts,
    actualContacts: foundryContactBodies(actual.contacts),
  };
}

export async function validateFoundryDirectory(dir, havok) {
  const root = resolve(dir);
  const presetText = await readFile(resolve(root, 'preset.json'), 'utf8');
  const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
  const preset = parseRangePreset(presetText);
  const pair = loadFoundryPair(preset, manifest);
  const setups = pair.manifest.testedShots.map(shot => ({
    ...shot.setup,
    ...(shot.launchPhase === null ? {} : { launchPhase: shot.launchPhase }),
  }));
  const { lines, rejected } = await runRange({
    preset,
    setups,
    seed: pair.manifest.seed,
    havok,
    omitPoints: true,
    documentAt: (_setup, index) => {
      const shot = pair.manifest.testedShots[index];
      return shot.layout ? applyFoundryLayout(preset, shot.layout).preset : preset;
    },
  });
  if (rejected) throw new Error(`${pair.manifest.id}: ${rejected} tested shot${rejected === 1 ? '' : 's'} rejected`);
  const shots = lines.filter(line => line.type === 'shot');
  if (shots.length !== pair.manifest.testedShots.length) throw new Error(`${pair.manifest.id}: shot count mismatch`);
  const checks = shots.map((shot, index) => {
    const expected = pair.manifest.testedShots[index];
    const verdict = evaluateFoundryShot(shot, expected);
    return {
      id: expected.id,
      terminal: verdict.terminal,
      outcome: verdict.outcome,
      contacts: verdict.contacts,
      actual: {
        reason: shot.terminal.reason,
        elapsed: shot.terminal.elapsed,
        position: shot.terminal.position,
        outcome: { kind: shot.outcome.kind, status: shot.outcome.status },
        contacts: verdict.actualContacts,
      },
    };
  });
  const failed = checks.filter(check => !check.terminal || !check.outcome || !check.contacts);
  if (failed.length) {
    const error = new Error(`${pair.manifest.id}: tested shot mismatch`);
    error.checks = failed;
    throw error;
  }
  return {
    id: pair.manifest.id,
    kind: pair.manifest.kind,
    sourceBuild: pair.manifest.sourceBuild,
    customCode: pair.manifest.customCode,
    worldIdentity: pair.worldIdentity,
    shots: checks.map(check => check.id),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
  const havok = await Havok({ wasmBinary: wasm });
  try {
    const reports = [];
    for (const dir of dirs) reports.push(await validateFoundryDirectory(dir, havok));
    process.stdout.write(`${JSON.stringify({ ok: true, reports }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n${JSON.stringify(error.checks ?? null, null, 2)}\n`);
    process.exitCode = 1;
  }
}
