// Headless range runner. One preset and a list of setups, real Havok, raw JSONL.
// The seed is recorded provenance. It is not applied to gravity, mass, radius,
// charge mapping, or the solver step.
//
//   node scripts/range/run.mjs --preset open-workshop --setups docs/experiments/range/setups/open-workshop.json --out docs/experiments/range/runs/open-workshop.jsonl
//   node scripts/range/run.mjs --preset-file docs/experiments/range/appendix/soft-landing/forgiving.json --setups docs/experiments/range/setups/soft-landing-forgiving.json
// Optional runRange fields `documentAt` and `labels` vary the world per setup and tag rows.
// They are omitted from the single-preset path.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { WORLDCRAFT_CATALOG_VERSION, WORLDCRAFT_PHYSICS_CONTRACT, validateWorldcraftShot, worldcraftIdentity } from '../../lib/worldcraft-model.js';
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

export async function runRange({ preset, setups, seed, gitSha = rangeGitSha(), havok, documentAt = null, labels = null }) {
  if (!Array.isArray(setups) || !setups.length) throw new Error('A range run needs at least one setup');
  if (!Number.isInteger(seed)) throw new Error('A range run needs an integer seed');
  if (labels && (!Array.isArray(labels) || labels.length !== setups.length)) throw new Error('Range labels must match the setups');
  const base = typeof preset === 'string' ? rangePreset(preset) : validateRangePreset(preset);
  const documentFor = index => documentAt ? validateRangePreset(documentAt(setups[index], index)) : base;
  const first = documentFor(0);
  const { world } = adaptRangePreset(first);
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
  };
  if (documentAt) provenance.worlds = 'per-setup';
  const lines = [provenance];
  const owned = havok ?? await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  const session = harness(owned, world, gitSha === 'unknown' ? 'unknown' : gitSha);
  let rejected = 0;
  try {
    for (let index = 0; index < setups.length; index++) {
      const document = documentFor(index);
      const adapted = documentAt ? adaptRangePreset(document) : { preset: base, world };
      let setup;
      try { setup = validateWorldcraftShot(adapted.world, setups[index]); }
      catch (error) {
        rejected += 1;
        const row = { type: 'rejected', index, error: error.message };
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
      });
      const row = { type: 'shot', index, seed, ...shot };
      if (labels) row.label = labels[index] ?? null;
      lines.push(row);
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
  if ((!presetId && !presetFile) || (presetId && presetFile) || !setupsPath) {
    console.error('usage: node scripts/range/run.mjs (--preset <id> | --preset-file <preset.json>) --setups <file.json> [--out <file.jsonl>]');
    process.exitCode = 2;
    return;
  }
  const file = JSON.parse(await readFile(setupsPath, 'utf8'));
  const setups = Array.isArray(file) ? file : file.setups;
  const seed = Array.isArray(file) ? null : file.seed;
  const preset = presetFile ? JSON.parse(await readFile(presetFile, 'utf8')) : presetId;
  const { lines, rejected } = await runRange({ preset, setups, seed });
  const text = lines.map(line => JSON.stringify(line)).join('\n') + '\n';
  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, text);
  } else process.stdout.write(text);
  if (rejected) process.exitCode = 1;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await main();
