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
import { WORLDCRAFT_CATALOG_VERSION, WORLDCRAFT_PHYSICS_CONTRACT, validateWorldcraftShot, worldcraftBellTarget } from '../../lib/worldcraft-model.js';
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
      const raw = setups[index] ?? {};
      const { launchPhase: requestedPhase, ...setupFields } = raw;
      let setup;
      try { setup = validateWorldcraftShot(world, setupFields); }
      catch (error) {
        rejected += 1;
        lines.push({ type: 'rejected', index, error: error.message });
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
      lines.push({ type: 'shot', index, seed, ...shot });
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
