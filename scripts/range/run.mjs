// Headless range runner. One preset and a list of setups, real Havok, raw JSONL.
// The seed is recorded provenance. It is not applied to gravity, mass, radius,
// charge mapping, or the solver step.
//
//   node scripts/range/run.mjs --preset open-workshop --setups docs/experiments/range/setups/open-workshop.json --out docs/experiments/range/runs/open-workshop.jsonl
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { WORLDCRAFT_CATALOG_VERSION, WORLDCRAFT_PHYSICS_CONTRACT, validateWorldcraftShot, worldcraftFixedSetup } from '../../lib/worldcraft-model.js';
import { adaptRangePreset, bindRangeShot, exportRangePreset, rangePreset, sha256Hex, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;

export function rangeGitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

function harness(havok, world, build) {
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
      if (runtime.world !== next) {
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

export async function runRange({ preset, setups, seed, gitSha = rangeGitSha(), havok }) {
  if (!Array.isArray(setups) || !setups.length) throw new Error('A range run needs at least one setup');
  if (!Number.isInteger(seed)) throw new Error('A range run needs an integer seed');
  const document = typeof preset === 'string' ? rangePreset(preset) : validateRangePreset(preset);
  const { world } = adaptRangePreset(document);
  const presetHash = await sha256Hex(exportRangePreset(document));
  const provenance = {
    type: 'provenance',
    gitSha,
    seed,
    presetId: document.id,
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
  const lines = [provenance];
  const owned = havok ?? await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const session = harness(owned, world, gitSha === 'unknown' ? 'unknown' : gitSha);
  let rejected = 0;
  try {
    for (let index = 0; index < setups.length; index++) {
      let setup;
      try { setup = validateWorldcraftShot(world, setups[index]); }
      catch (error) {
        rejected += 1;
        lines.push({ type: 'rejected', index, error: error.message });
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
      });
      lines.push({ type: 'shot', index, seed, ...shot });
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
  const session = harness(owned, opening, gitSha === 'unknown' ? 'unknown' : gitSha);
  let rejected = 0;
  try {
    for (let index = 0; index < layouts.length; index++) {
      const layout = layouts[index];
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
  const setupsPath = arg('--setups');
  const outPath = arg('--out');
  if (!presetId || !setupsPath) {
    console.error('usage: node scripts/range/run.mjs --preset <id> --setups <file.json> [--out <file.jsonl>]');
    process.exitCode = 2;
    return;
  }
  const file = JSON.parse(await readFile(setupsPath, 'utf8'));
  const setups = Array.isArray(file) ? file : file.setups;
  const seed = Array.isArray(file) ? null : file.seed;
  const { lines, rejected } = await runRange({ preset: presetId, setups, seed });
  const text = lines.map(line => JSON.stringify(line)).join('\n') + '\n';
  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, text);
  } else process.stdout.write(text);
  if (rejected) process.exitCode = 1;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await main();
