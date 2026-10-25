// Headless range runner. One preset and a list of setups, real Havok, raw JSONL.
// The seed is recorded provenance. It is not applied to gravity, mass, radius,
// charge mapping, or the solver step.
//
//   node scripts/range/run.mjs --preset open-workshop --setups docs/experiments/range/setups/open-workshop.json --out docs/experiments/range/runs/open-workshop.jsonl
//   node scripts/range/run.mjs --preset-file docs/experiments/range/appendix/back-pocket/near-bank.json --setups <file> --out <file> --omit-points
//   node scripts/range/run.mjs --preset-file docs/experiments/range/appendix/soft-landing/forgiving.json --setups docs/experiments/range/setups/soft-landing-forgiving.json
// --preset-file is a preset document that is not in the player selector.
// --omit-points keeps terminal, contacts, and outcome, and drops sample trails.
// createRangeHarness is the same step loop. A campaign that moves pieces between
// shots reuses that loop and rangeProvenance; runRange itself is one preset
// unless documentAt supplies a world per setup. labels tag those rows.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { WORLDCRAFT_CATALOG_VERSION, WORLDCRAFT_PHYSICS_CONTRACT, validateWorldcraftShot, worldcraftBellTarget, worldcraftFixedSetup, worldcraftIdentity } from '../../lib/worldcraft-model.js';
import { adaptRangePreset, bindRangeShot, exportRangePreset, rangePreset, sha256Hex, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;

export function rangeGitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

export function createRangeHarness(havok, world, build) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build });
  return {
    runtime,
    shoot(next, setup) {
      if (runtime.mode !== 'build') runtime.setMode('build');
      if (worldcraftIdentity(runtime.world) !== worldcraftIdentity(next)) {
        const replaced = runtime.replaceWorld(next, { intent: 'load' });
        if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
      }
      runtime.setMode('play');
      if (!runtime.launch(setup)) throw new Error(runtime.error || 'launch failed');
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) {
        runtime.beforeStep();
        physics._step(1 / 120);
        runtime.afterStep();
      }
      const last = runtime.last;
      if (!last) throw new Error('shot did not resolve');
      runtime.setMode('build');
      return last;
    },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}

export function rangeProvenance({ presetId, presetHash, seed, gitSha = rangeGitSha(), label = null, campaign = null }) {
  const provenance = {
    type: 'provenance',
    gitSha,
    seed,
    presetId,
    presetHash,
    catalog: WORLDCRAFT_CATALOG_VERSION,
    physics: WORLDCRAFT_PHYSICS_CONTRACT,
    node: process.version,
    timestepHz: 120,
    substep: '1000/120',
    gravity: RAIL_RULES.gravity,
    projectileMass: RAIL_RULES.projectileMass,
    projectileRadius: RAIL_RULES.projectileRadius,
  };
  if (typeof label === 'string' && label) provenance.label = label;
  if (typeof campaign === 'string' && campaign) provenance.campaign = campaign;
  return provenance;
}

export async function runRange({ preset, setups, seed, gitSha = rangeGitSha(), havok, label = null, omitPoints = false, campaign = null, documentAt = null, labels = null }) {
  if (!Array.isArray(setups) || !setups.length) throw new Error('A range run needs at least one setup');
  if (!Number.isInteger(seed)) throw new Error('A range run needs an integer seed');
  if (labels && (!Array.isArray(labels) || labels.length !== setups.length)) throw new Error('Range labels must match the setups');
  const base = typeof preset === 'string' ? rangePreset(preset) : validateRangePreset(preset);
  const documentFor = index => documentAt ? validateRangePreset(documentAt(setups[index], index)) : base;
  const first = documentFor(0);
  const { world } = adaptRangePreset(first);
  const presetHash = await sha256Hex(exportRangePreset(base));
  const provenance = rangeProvenance({ presetId: base.id, presetHash, seed, gitSha, label, campaign });
  if (documentAt) provenance.worlds = 'per-setup';
  const lines = [provenance];
  const owned = havok ?? await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const session = createRangeHarness(owned, world, gitSha === 'unknown' ? 'unknown' : gitSha);
  let rejected = 0;
  try {
    for (let index = 0; index < setups.length; index++) {
      const document = documentFor(index);
      const adapted = documentAt ? adaptRangePreset(document) : { preset: base, world };
      const raw = setups[index] ?? {};
      const { launchPhase: requestedPhase, ...setupFields } = raw;
      let setup;
      try { setup = validateWorldcraftShot(adapted.world, setupFields); }
      catch (error) {
        rejected += 1;
        const row = { type: 'rejected', index, error: error.message };
        if (labels) row.label = labels[index] ?? null;
        lines.push(row);
        continue;
      }
      if (worldcraftBellTarget(adapted.world)) {
        const phased = session.runtime.setLaunchPhase(requestedPhase ?? 0);
        if (!phased.ok) {
          rejected += 1;
          const row = { type: 'rejected', index, error: phased.error ?? 'launch phase rejected' };
          if (labels) row.label = labels[index] ?? null;
          lines.push(row);
          continue;
        }
      } else if (requestedPhase !== undefined) {
        rejected += 1;
        const row = { type: 'rejected', index, error: 'Launch phase requires a travelling bell' };
        if (labels) row.label = labels[index] ?? null;
        lines.push(row);
        continue;
      }
      const last = session.shoot(adapted.world, setup);
      const shot = await bindRangeShot({
        preset: adapted.preset,
        world: adapted.world,
        setup,
        build: gitSha,
        launch: last.launch,
        points: last.samples,
        events: last.evidence,
        contacts: last.contacts,
        terminal: last.terminal,
        ...(typeof last.launchPhase === 'number' ? { launchPhase: last.launchPhase } : {}),
      });
      let row;
      if (omitPoints) {
        const { points, ...rest } = shot;
        row = { type: 'shot', index, seed, pointCount: points.length, ...rest };
      } else row = { type: 'shot', index, seed, ...shot };
      if (labels) row.label = labels[index] ?? null;
      lines.push(row);
    }
  } finally { session.dispose(); }
  return { lines, rejected };
}

/** One Havok session, many piece layouts, the preset's fixed launch. Layouts that do not validate are rejected and not fired. */
export async function runLayoutShots({ preset, layouts, seed, gitSha = rangeGitSha(), havok }) {
  if (!Array.isArray(layouts) || !layouts.length) throw new Error('A layout run needs at least one layout');
  if (!Number.isInteger(seed)) throw new Error('A range run needs an integer seed');
  const base = typeof preset === 'string' ? rangePreset(preset) : validateRangePreset(preset);
  const { world: opening } = adaptRangePreset(base);
  const setup = worldcraftFixedSetup(opening);
  const presetHash = await sha256Hex(exportRangePreset(base));
  const provenance = {
    type: 'provenance',
    gitSha,
    seed,
    presetId: base.id,
    presetHash,
    catalog: WORLDCRAFT_CATALOG_VERSION,
    physics: WORLDCRAFT_PHYSICS_CONTRACT,
    node: process.version,
    timestepHz: 120,
    substep: '1000/120',
    gravity: RAIL_RULES.gravity,
    projectileMass: RAIL_RULES.projectileMass,
    projectileRadius: RAIL_RULES.projectileRadius,
    layouts: layouts.length,
  };
  const lines = [provenance];
  const owned = havok ?? await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const session = createRangeHarness(owned, opening, gitSha === 'unknown' ? 'unknown' : gitSha);
  let rejected = 0;
  try {
    for (let index = 0; index < layouts.length; index++) {
      const layout = layouts[index];
      // Declared here. The non-bell branch used to read this name before it existed.
      const requestedPhase = layout && Object.hasOwn(layout, 'launchPhase') ? layout.launchPhase : undefined;
      let document;
      let world;
      try {
        document = validateRangePreset({ ...base, objects: layout.objects });
        world = adaptRangePreset(document).world;
        validateWorldcraftShot(world, setup);
      } catch (error) {
        rejected += 1;
        lines.push({ type: 'rejected', index, id: layout.id ?? null, error: error.message });
        continue;
      }
      if (worldcraftBellTarget(world)) {
        const phased = session.runtime.setLaunchPhase(requestedPhase ?? 0);
        if (!phased.ok) {
          rejected += 1;
          lines.push({ type: 'rejected', index, error: phased.error ?? 'launch phase rejected' });
          continue;
        }
      } else if (requestedPhase !== undefined) {
        rejected += 1;
        lines.push({ type: 'rejected', index, error: 'Launch phase requires a travelling bell' });
        continue;
      }
      const last = session.shoot(world, setup);
      const shot = await bindRangeShot({
        preset: document,
        world,
        setup,
        build: gitSha,
        launch: last.launch,
        points: last.samples,
        events: last.evidence,
        contacts: last.contacts,
        terminal: last.terminal,
        ...(typeof last.launchPhase === 'number' ? { launchPhase: last.launchPhase } : {}),
      });
      const resonantContacts = shot.contacts.filter(contact => contact.body.startsWith('worldcraft-object-'));
      lines.push({
        type: 'shot',
        index,
        id: layout.id ?? null,
        seed,
        objects: document.objects,
        outcome: shot.outcome,
        bindingHash: shot.bindingHash,
        presetHash: shot.presetHash,
        worldIdentity: shot.worldSnapshot.worldIdentity,
        terminal: shot.terminal,
        contacts: shot.contacts,
        resonance: last.resonance,
        resonantContactRows: resonantContacts.length,
        pointCount: shot.points.length,
        pointHash: await sha256Hex(JSON.stringify(shot.points)),
        shotHash: await sha256Hex(JSON.stringify(shot)),
        shot,
      });
    }
  } finally { session.dispose(); }
  return { lines, rejected };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

async function main() {
  const presetId = arg('--preset');
  const presetFile = arg('--preset-file');
  const setupsPath = arg('--setups');
  const outPath = arg('--out');
  const omitPoints = process.argv.includes('--omit-points');
  if ((!presetId && !presetFile) || (presetId && presetFile) || !setupsPath) {
    console.error('usage: node scripts/range/run.mjs (--preset <id> | --preset-file <file.json>) --setups <file.json> [--out <file.jsonl>] [--omit-points]');
    process.exitCode = 2;
    return;
  }
  const file = JSON.parse(await readFile(setupsPath, 'utf8'));
  const setups = Array.isArray(file) ? file : file.setups;
  const seed = Array.isArray(file) ? null : file.seed;
  const preset = presetFile ? JSON.parse(await readFile(presetFile, 'utf8')) : presetId;
  const { lines, rejected } = await runRange({ preset, setups, seed, label: Array.isArray(file) ? null : file.label ?? null, omitPoints, campaign: arg('--campaign') });
  const text = lines.map(line => JSON.stringify(line)).join('\n') + '\n';
  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, text);
  } else process.stdout.write(text);
  if (rejected) process.exitCode = 1;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await main();
