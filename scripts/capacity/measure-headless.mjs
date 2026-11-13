// Headless Havok capacity measurement. These timings are not browser frame times.
//
//   node scripts/capacity/measure-headless.mjs \
//     --column orig-12 --world descending-resonance --switch descending-resonance-flat \
//     --few opening --many four --runs 3 --cycles 60 \
//     --out docs/experiments/capacity-24/raw
//
// Each run is its own process so Havok startup stays inside that run's cold sample.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Havok from '@babylonjs/havok';
import { HavokPlugin, Logger, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { applyFoundryLayout, foundryContactBodies, foundryRecord } from '../../lib/worldcraft-foundry.js';
import { validateWorld, worldcraftIdentity } from '../../lib/worldcraft-model.js';
import { adaptRangePreset } from '../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';
import { gitSha, machineEnv } from './env.mjs';
import { round, roundSummary, slope, summarize } from './stats.mjs';

Logger.LogLevels = 0;

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const column = arg('--column', 'orig-12');
const worldId = arg('--world', 'descending-resonance');
const switchId = arg('--switch', 'descending-resonance-flat');
const fewId = arg('--few', 'opening');
const manyId = arg('--many', 'four');
const runs = Number(arg('--runs', '3'));
const run = Number(arg('--run', '1'));
const cycles = Number(arg('--cycles', '60'));
const outDir = resolve(arg('--out', 'docs/experiments/capacity-24/raw'));
const reproIds = (arg('--repro', 'ricochet-garden-loop') ?? '').split(',').map(item => item.trim()).filter(Boolean);

function shotSetup(shot) {
  return {
    railIndex: shot.setup.railIndex,
    originX: shot.setup.originX,
    yaw: shot.setup.yaw,
    elevation: shot.setup.elevation,
    charge: shot.setup.charge,
  };
}

function worldFor(preset, shot) {
  const document = shot?.layout ? applyFoundryLayout(preset, shot.layout).preset : preset;
  return adaptRangePreset(document).world;
}

function resources(scene, runtime) {
  const diagnostics = runtime.diagnostics();
  return {
    ...diagnostics,
    sceneMeshes: scene.meshes.length,
    sceneMaterials: scene.materials.length,
    sceneTextures: scene.textures.length,
    heapUsed: process.memoryUsage().heapUsed,
  };
}

function openHarness(havok, world, build) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const started = performance.now();
  const runtime = createWorldcraftRuntime(scene, { world, build });
  return { engine, scene, physics, runtime, coldConstructMs: performance.now() - started };
}

function ensureWorld(runtime, world) {
  if (runtime.diagnostics().worldIdentity === worldcraftIdentity(world)) return;
  if (runtime.mode !== 'build') runtime.setMode('build');
  const replaced = runtime.replaceWorld(world, { intent: 'load' });
  if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
}

function stepOnce(runtime, physics) {
  const started = performance.now();
  runtime.beforeStep();
  physics._step(1 / 120);
  runtime.afterStep();
  return performance.now() - started;
}

function fire(runtime, physics, world, setup, limit = 7300) {
  ensureWorld(runtime, world);
  if (runtime.mode !== 'build') runtime.setMode('build');
  runtime.setMode('play');
  if (!runtime.launch(setup)) throw new Error(runtime.error || 'launch failed');
  const steps = [];
  while (runtime.flight && !runtime.flight.ended && steps.length < limit) steps.push(stepOnce(runtime, physics));
  const last = runtime.last;
  if (!last) throw new Error('shot did not resolve');
  const resetStarted = performance.now();
  runtime.setMode('build');
  return { last, steps, resetMs: performance.now() - resetStarted };
}

function compactShot(last, steps, expected) {
  const contacts = foundryContactBodies(last.contacts);
  const impacts = last.resonance?.impacts ?? [];
  const times = impacts.map(impact => impact.time).filter(time => Number.isFinite(time)).sort((a, b) => a - b);
  let closestMs = null;
  for (let index = 1; index < times.length; index += 1) {
    const gap = (times[index] - times[index - 1]) * 1000;
    if (closestMs === null || gap < closestMs) closestMs = gap;
  }
  const terminal = last.terminal;
  const matched = expected ? (
    terminal?.reason === expected.terminal.reason
    && Object.is(terminal?.elapsed, expected.terminal.elapsed)
    && Array.isArray(terminal?.position)
    && terminal.position.length === expected.terminal.position.length
    && terminal.position.every((item, index) => Object.is(item, expected.terminal.position[index]))
    && (!expected.contacts || (expected.contacts.length === contacts.length && expected.contacts.every((body, index) => body === contacts[index])))
  ) : null;
  return {
    contacts,
    contactCount: contacts.length,
    terminal: terminal ? { reason: terminal.reason, elapsed: terminal.elapsed, position: terminal.position } : null,
    impactCount: impacts.length,
    closestImpactGapMs: closestMs === null ? null : round(closestMs, 3),
    matchedManifest: matched,
    step: roundSummary(summarize(steps)),
    stepCount: steps.length,
  };
}

export function findLegalNudge(world) {
  const rules = world.rules;
  if (!rules) return null;
  const candidates = [...world.objects].sort((a, b) => b.x - a.x || b.z - a.z);
  for (const object of candidates) {
    const locked = (rules.locked ?? []).filter(id => id !== object.id);
    const allowance = { ...rules.allowance, [object.kind]: (rules.allowance?.[object.kind] ?? 0) + 1 };
    let base;
    try {
      base = validateWorld({
        ...world,
        objects: world.objects.map(item => ({ ...item, ...(item.voice ? { voice: { ...item.voice } } : {}) })),
        rules: { ...rules, locked, allowance },
      });
    } catch { continue; }
    const patches = [
      { x: round(object.x + 0.5, 1) },
      { x: round(object.x - 0.5, 1) },
      { z: round(object.z + 0.5, 1) },
      { z: round(object.z - 0.5, 1) },
      { yaw: object.yaw + 5 },
      { yaw: object.yaw - 5 },
    ];
    for (const patch of patches) {
      try {
        validateWorld({
          ...base,
          objects: base.objects.map(item => item.id === object.id ? { ...item, ...patch } : item),
        });
        return { pieceId: object.id, kind: object.kind, patch };
      } catch { /* overlap or grid; try the next patch */ }
    }
  }
  return null;
}

function measureLoaded(havok, id, build) {
  const record = foundryRecord(id);
  const world = worldFor(record.preset, null);
  const validateSamples = [];
  for (let index = 0; index < 80; index += 1) {
    const started = performance.now();
    validateWorld(world);
    validateSamples.push(performance.now() - started);
  }
  const harness = openHarness(havok, world, build);
  const { scene, physics, runtime } = harness;
  const coldResources = resources(scene, runtime);
  const rebuilds = [];
  for (let index = 0; index < 20; index += 1) {
    const started = performance.now();
    const replaced = runtime.replaceWorld(world, { intent: 'load' });
    if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
    rebuilds.push(performance.now() - started);
  }
  runtime.setMode('play');
  const idle = [];
  for (let index = 0; index < 600; index += 1) idle.push(stepOnce(runtime, physics));
  runtime.setMode('build');
  const byId = new Map(record.manifest.testedShots.map(shot => [shot.id, shot]));
  const few = byId.get(fewId);
  const many = byId.get(manyId);
  if (!few || !many) throw new Error(`${id} is missing shot ${few ? manyId : fewId}`);
  const fewResult = fire(runtime, physics, worldFor(record.preset, few), shotSetup(few));
  const manyResult = fire(runtime, physics, worldFor(record.preset, many), shotSetup(many));
  const reproduced = record.manifest.testedShots.map(shot => {
    const result = fire(runtime, physics, worldFor(record.preset, shot), shotSetup(shot));
    return { id: shot.id, ...compactShot(result.last, result.steps, shot), resetMs: round(result.resetMs, 4) };
  });
  return {
    id,
    objectCount: world.objects.length,
    coldConstructMs: round(harness.coldConstructMs, 4),
    coldResources,
    validate: { cold: roundSummary(summarize(validateSamples.slice(0, 1))), warm: roundSummary(summarize(validateSamples.slice(1))) },
    rebuild: { cold: round(rebuilds[0], 4), warm: roundSummary(summarize(rebuilds.slice(1))) },
    idleSteps: roundSummary(summarize(idle.slice(30))),
    few: { id: fewId, ...compactShot(fewResult.last, fewResult.steps, few), resetMs: round(fewResult.resetMs, 4) },
    many: { id: manyId, ...compactShot(manyResult.last, manyResult.steps, many), resetMs: round(manyResult.resetMs, 4) },
    reproduced,
    editorProbe: findLegalNudge(world),
    harness,
    world,
    preset: record.preset,
  };
}

function replayOnly(havok, id, build) {
  const record = foundryRecord(id);
  const opening = worldFor(record.preset, null);
  const harness = openHarness(havok, opening, build);
  const rows = [];
  try {
    for (const shot of record.manifest.testedShots) {
      const result = fire(harness.runtime, harness.physics, worldFor(record.preset, shot), shotSetup(shot));
      rows.push({ id: shot.id, ...compactShot(result.last, result.steps, shot) });
    }
  } finally {
    harness.runtime.dispose();
    harness.scene.dispose();
    harness.engine.dispose();
  }
  return { id, objectCount: opening.objects.length, shots: rows, allMatched: rows.every(row => row.matchedManifest === true) };
}

async function leakCycles(havok, primaryId, secondaryId, build, count) {
  const primary = foundryRecord(primaryId);
  const secondary = foundryRecord(secondaryId);
  const first = worldFor(primary.preset, null);
  const second = worldFor(secondary.preset, null);
  const shot = primary.manifest.testedShots.find(item => item.id === fewId) ?? primary.manifest.testedShots[0];
  const setup = shotSetup(shot);
  const harness = openHarness(havok, first, build);
  const rows = [];
  try {
    for (let index = 0; index < count; index += 1) {
      const next = index % 2 === 0 ? first : second;
      if (harness.runtime.mode !== 'build') harness.runtime.setMode('build');
      const replaceStarted = performance.now();
      const replaced = harness.runtime.replaceWorld(next, { intent: 'load' });
      if (!replaced.ok) throw new Error(replaced.error ?? 'leak replace failed');
      const replaceMs = performance.now() - replaceStarted;
      harness.runtime.setMode('play');
      if (!harness.runtime.launch(setup)) throw new Error(harness.runtime.error || `leak launch failed on ${next.id}`);
      while (harness.runtime.flight && !harness.runtime.flight.ended) stepOnce(harness.runtime, harness.physics);
      const last = harness.runtime.last;
      if (!last) throw new Error('leak shot did not resolve');
      const resetStarted = performance.now();
      harness.runtime.setMode('build');
      const resetMs = performance.now() - resetStarted;
      rows.push({
        cycle: index,
        worldId: next.id,
        replaceMs: round(replaceMs, 4),
        resetMs: round(resetMs, 4),
        contacts: foundryContactBodies(last.contacts).length,
        ...resources(harness.scene, harness.runtime),
      });
    }
    const beforeDispose = resources(harness.scene, harness.runtime);
    harness.runtime.dispose();
    const afterDispose = {
      sceneMeshes: harness.scene.meshes.length,
      sceneMaterials: harness.scene.materials.length,
      sceneTextures: harness.scene.textures.length,
      physicsBodies: harness.scene.getPhysicsEngine()?.getBodies().length ?? 0,
    };
    return { rows, beforeDispose, afterDispose };
  } finally {
    harness.scene.dispose();
    harness.engine.dispose();
  }
}

function leakSummary(rows, key) {
  const values = rows.map(row => row[key]).filter(value => Number.isFinite(value));
  const perCycle = slope(values);
  return {
    key,
    first: values[0] ?? null,
    last: values.at(-1) ?? null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    perCycle: perCycle === null ? null : round(perCycle, 6),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // A whole run is a fresh process. Sharing one process made later cold samples warm.
  if (runs > 1) {
    const forwarded = [];
    for (let index = 2; index < process.argv.length; index += 1) {
      if (process.argv[index] === '--runs' || process.argv[index] === '--run') { index += 1; continue; }
      forwarded.push(process.argv[index]);
    }
    for (let index = 1; index <= runs; index += 1) {
      execFileSync(process.execPath, [process.argv[1], ...forwarded, '--runs', '1', '--run', String(index)], { stdio: 'inherit' });
    }
    process.exit(0);
  }
  const sha = gitSha();
  const wasm = await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
  await mkdir(outDir, { recursive: true });
  const written = [];
  {
    const havok = await Havok({ wasmBinary: wasm });
    const started = performance.now();
    const primary = measureLoaded(havok, worldId, sha);
    const alternate = worldFor(foundryRecord(switchId).preset, null);
    if (primary.harness.runtime.mode !== 'build') primary.harness.runtime.setMode('build');
    const switchStarted = performance.now();
    const switched = primary.harness.runtime.replaceWorld(alternate, { intent: 'load' });
    const switchMs = performance.now() - switchStarted;
    if (!switched.ok) throw new Error(switched.error ?? 'switch failed');
    const switchResources = resources(primary.harness.scene, primary.harness.runtime);
    const backStarted = performance.now();
    const back = primary.harness.runtime.replaceWorld(primary.world, { intent: 'load' });
    const switchBackMs = performance.now() - backStarted;
    if (!back.ok) throw new Error(back.error ?? 'switch back failed');
    primary.harness.runtime.dispose();
    primary.harness.scene.dispose();
    primary.harness.engine.dispose();
    const repro = reproIds.map(id => replayOnly(havok, id, sha));
    const leak = await leakCycles(havok, worldId, switchId, sha, cycles);
    const bodyKeys = ['staticBodies', 'physicsBodies', 'sceneMeshes', 'sceneMaterials', 'sceneTextures', 'heapUsed'];
    const worldsInLeak = [...new Set(leak.rows.map(row => row.worldId))];
    const report = {
      kind: 'headless-havok',
      note: 'NullEngine timings. These are not browser frame times.',
      column,
      run,
      gitSha: sha,
      env: machineEnv(),
      capturedAt: new Date().toISOString(),
      wallMs: round(performance.now() - started, 1),
      world: {
        id: primary.id,
        objectCount: primary.objectCount,
        coldConstructMs: primary.coldConstructMs,
        coldResources: primary.coldResources,
        validate: primary.validate,
        rebuild: primary.rebuild,
        idleSteps: primary.idleSteps,
        few: primary.few,
        many: primary.many,
        reproduced: primary.reproduced,
        allTestedShotsMatched: primary.reproduced.every(row => row.matchedManifest === true),
        editorProbe: primary.editorProbe,
      },
      switchWorld: {
        id: switchId,
        objectCount: alternate.objects.length,
        replaceMs: round(switchMs, 4),
        replaceBackMs: round(switchBackMs, 4),
        resources: switchResources,
      },
      repro,
      leak: {
        cycles: leak.rows.length,
        series: worldsInLeak.map(id => ({
          worldId: id,
          metrics: bodyKeys.map(key => leakSummary(leak.rows.filter(row => row.worldId === id), key)),
        })),
        beforeDispose: leak.beforeDispose,
        afterDispose: leak.afterDispose,
        rows: leak.rows.map(row => ({
          cycle: row.cycle,
          worldId: row.worldId,
          replaceMs: row.replaceMs,
          resetMs: row.resetMs,
          contacts: row.contacts,
          staticBodies: row.staticBodies,
          physicsBodies: row.physicsBodies,
          sceneMeshes: row.sceneMeshes,
          sceneMaterials: row.sceneMaterials,
          sceneTextures: row.sceneTextures,
          heapUsed: row.heapUsed,
        })),
      },
    };
    const file = resolve(outDir, `${column}-headless-run-${run}.json`);
    await writeFile(file, JSON.stringify(report));
    written.push(file);
    const matched = report.world.allTestedShotsMatched && repro.every(item => item.allMatched);
    console.error(`${column} headless run ${run}: cold ${report.world.coldConstructMs} ms, idle median ${report.world.idleSteps?.median} ms, few ${report.world.few.contactCount} contacts, many ${report.world.many.contactCount}, shots matched ${matched}`);
  }
  console.log(written.join('\n'));
}
