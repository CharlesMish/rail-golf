// Launch-phase sweep for the Travelling Bell preset.
// Aim, power and the world stay fixed inside a layout. Launch phase is the only
// change. Seed 20261024 is recorded and not applied to the solver.
//
//   node scripts/range/sweep-travelling-bell.mjs
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { createHash } from 'node:crypto';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { worldcraftFixedSetup, worldcraftIdentity } from '../../lib/worldcraft-model.js';
import {
  adaptRangePreset, bindRangeShot, createTravellingBellPreset, exportRangePreset, exportRangeShot,
  parseRangeShot, sha256Hex, validateRangePreset,
} from '../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const COARSE = 0.025;
const TICK = 1 / 120;
const root = new URL('../../docs/experiments/range/appendix/travelling-bell/', import.meta.url);

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
function gitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}
function orderOf(last) {
  return last.contacts.map(contact => contact.body.replace(/^worldcraft-/, '')).join('>');
}
function bellFirst(last) {
  return last.contacts.find(contact => contact.body === 'worldcraft-target-bell')?.first ?? null;
}
function variant(base, objects, launcher = base.rules.launcher) {
  return validateRangePreset({ ...base, objects, rules: { ...base.rules, launcher: { ...base.rules.launcher, ...launcher } } });
}

function harness(havok, world) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(TICK);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: gitSha() });
  return {
    runtime,
    shoot(next, phase) {
      if (runtime.mode !== 'build') runtime.setMode('build');
      if (worldcraftIdentity(runtime.world) !== worldcraftIdentity(next)) {
        const replaced = runtime.replaceWorld(next, { intent: 'load' });
        if (!replaced.ok) throw new Error(replaced.error ?? 'replace failed');
      }
      const phased = runtime.setLaunchPhase(phase);
      if (!phased.ok) throw new Error(phased.error ?? 'phase failed');
      const setup = worldcraftFixedSetup(runtime.world);
      runtime.setMode('play');
      if (!runtime.launch(setup)) throw new Error(runtime.error || 'launch failed');
      for (let i = 0; i < 7300 && !runtime.flight.ended; i++) {
        runtime.beforeStep();
        physics._step(TICK);
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

function coarsePhases(period) {
  const phases = [];
  for (let phase = 0; phase < period - 1e-9; phase += COARSE) phases.push(Math.round(phase * 1e9) / 1e9);
  return phases;
}

function summarize(trials) {
  const hits = trials.filter(trial => trial.hit);
  const runs = [];
  let run = null;
  for (const trial of trials) {
    if (trial.hit) {
      if (!run) run = [];
      run.push(trial);
    } else if (run) { runs.push(run); run = null; }
  }
  if (run) runs.push(run);
  let wraps = false;
  if (runs.length > 1 && trials[0]?.hit && trials.at(-1)?.hit) {
    const tail = runs.pop();
    runs[0] = [...tail, ...runs[0]];
    wraps = true;
  }
  const orders = {};
  for (const trial of hits) orders[trial.order] = (orders[trial.order] ?? 0) + 1;
  return {
    trials: trials.length,
    hits: hits.length,
    fraction: trials.length ? hits.length / trials.length : 0,
    orders,
    runs: runs.map(group => ({
      wraps: wraps && group === runs[0],
      first: group[0].phase,
      last: group.at(-1).phase,
      count: group.length,
      orders: group.reduce((map, trial) => { map[trial.order] = (map[trial.order] ?? 0) + 1; return map; }, {}),
    })),
  };
}

function refineEdges(session, world, summary) {
  const period = 8;
  const edges = [];
  for (const run of summary.runs) {
    const stepBack = (phase) => {
      let cursor = phase;
      let guard = 0;
      while (guard++ < 400) {
        const previous = cursor - TICK;
        const wrapped = previous < 0 ? previous + period : previous;
        const last = session.shoot(world, wrapped);
        if (last.goalResult.status !== 'hit') return cursor;
        cursor = wrapped;
        if (!run.wraps && cursor > phase) break;
      }
      return cursor;
    };
    const stepForward = (phase) => {
      let cursor = phase;
      let guard = 0;
      while (guard++ < 400) {
        const next = cursor + TICK;
        const wrapped = next >= period ? next - period : next;
        const last = session.shoot(world, wrapped);
        if (last.goalResult.status !== 'hit') return cursor;
        cursor = wrapped;
        if (!run.wraps && cursor < phase) break;
      }
      return cursor;
    };
    const start = stepBack(run.first);
    const end = stepForward(run.last);
    edges.push({ ...run, start, end, endOpen: true });
  }
  return edges;
}

function recordTrial(last, phase) {
  return {
    phase,
    hit: last.goalResult.status === 'hit',
    status: last.goalResult.status,
    reason: last.terminal.reason,
    order: orderOf(last),
    bellFirst: bellFirst(last),
    scored: last.goalResult.scored,
    pin: last.pinResult,
  };
}

const preset = createTravellingBellPreset();
const opening = adaptRangePreset(preset);
const layouts = [
  { name: 'opening', note: 'Catalog preset. Ramp (−8, 40, yaw 0), bank (0, 16, yaw 80), shield (−10, 52).', preset },
  { name: 'supplied', note: 'Prior-art supplied pieces. Ramp (0, 42, yaw 0), bank (14, 28, yaw 0), same shield and bell.', preset: variant(preset, [
    { id: 'ramp-yours', kind: 'ramp', x: 0, z: 42, yaw: 0 },
    { id: 'bank-yours', kind: 'bank', x: 14, z: 28, yaw: 0 },
    { id: 'shield', kind: 'block', x: -10, z: 52, yaw: 0 },
  ]) },
  { name: 'late', note: 'Late both-piece arrangement from the bell-rail sweep. Ramp (−1, 42, yaw 20), bank (−6, 68, yaw 20).', preset: variant(preset, [
    { id: 'ramp-yours', kind: 'ramp', x: -1, z: 42, yaw: 20 },
    { id: 'bank-yours', kind: 'bank', x: -6, z: 68, yaw: 20 },
    { id: 'shield', kind: 'block', x: -10, z: 52, yaw: 0 },
  ]) },
];
const aimOffsets = [
  { yaw: 0.5, elevation: 18 }, { yaw: -0.5, elevation: 18 }, { yaw: 1, elevation: 18 }, { yaw: -1, elevation: 18 },
  { yaw: 0, elevation: 18.5 }, { yaw: 0, elevation: 17.5 }, { yaw: 0, elevation: 19 }, { yaw: 0, elevation: 17 },
];

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const started = performance.now();
const session = harness(havok, opening.world);
const phases = coarsePhases(8);
const layoutReports = [];
try {
  for (const layout of layouts) {
    const adapted = adaptRangePreset(layout.preset);
    const identity = worldcraftIdentity(adapted.world);
    const trials = [];
    for (const phase of phases) {
      const last = session.shoot(adapted.world, phase);
      if (worldcraftIdentity(session.runtime.world) !== identity) throw new Error(`${layout.name} changed world while sweeping phase`);
      trials.push(recordTrial(last, phase));
    }
    const summary = summarize(trials);
    const windows = refineEdges(session, adapted.world, summary);
    layoutReports.push({
      name: layout.name,
      note: layout.note,
      objects: adapted.world.objects,
      launcher: adapted.world.rules.rail,
      worldIdentitySha256: sha256(identity),
      trials,
      coarse: { trials: summary.trials, hits: summary.hits, fraction: summary.hits / summary.trials, orders: summary.orders },
      windows,
    });
    console.error(`${layout.name}: ${summary.hits}/${summary.trials} coarse hits, ${windows.length} windows`);
  }

  const aimReports = [];
  for (const offset of aimOffsets) {
    const aimed = variant(preset, preset.objects, { yaw: offset.yaw, elevation: offset.elevation, charge: 0.55 });
    const adapted = adaptRangePreset(aimed);
    const trials = [];
    for (const phase of phases) trials.push(recordTrial(session.shoot(adapted.world, phase), phase));
    const summary = summarize(trials);
    const windows = refineEdges(session, adapted.world, summary);
    aimReports.push({
      yaw: offset.yaw,
      elevation: offset.elevation,
      worldIdentitySha256: sha256(worldcraftIdentity(adapted.world)),
      coarse: { trials: summary.trials, hits: summary.hits, fraction: summary.hits / summary.trials, orders: summary.orders },
      windows,
      trials,
    });
    console.error(`aim yaw ${offset.yaw} elevation ${offset.elevation}: ${summary.hits}/${summary.trials}`);
  }

  const hitPhase = 1;
  const first = session.shoot(opening.world, hitPhase);
  const second = session.shoot(opening.world, hitPhase);
  const same = JSON.stringify(recordTrial(first, hitPhase)) === JSON.stringify(recordTrial(second, hitPhase));
  const shot = await bindRangeShot({
    preset, world: opening.world, setup: worldcraftFixedSetup(opening.world), build: gitSha(),
    launch: first.launch, points: first.samples, events: first.evidence, contacts: first.contacts,
    terminal: first.terminal, launchPhase: first.launchPhase,
  });
  const imported = parseRangeShot(exportRangeShot(shot));
  const refired = session.shoot(imported.worldSnapshot.world, imported.launchPhase);
  const refireMatch = JSON.stringify(recordTrial(refired, imported.launchPhase)) === JSON.stringify(recordTrial(first, hitPhase));
  const presetHash = await sha256Hex(exportRangePreset(preset));
  const report = {
    seed: 20261024,
    gitSha: gitSha(),
    presetId: preset.id,
    presetHash,
    openingWorldIdentitySha256: sha256(worldcraftIdentity(opening.world)),
    coarseStepSeconds: COARSE,
    fineStepSeconds: TICK,
    periodSeconds: 8,
    speedMetersPerSecond: 1,
    lengthMeters: 4,
    elapsedSeconds: (performance.now() - started) / 1000,
    determinism: { phase: hitPhase, match: same },
    saveImportRefire: { phase: hitPhase, match: refireMatch, bindingHash: shot.bindingHash, presetHash: shot.presetHash },
    layouts: layoutReports,
    aim: aimReports,
  };
  await mkdir(root, { recursive: true });
  await writeFile(new URL('windows.json', root), JSON.stringify(report, null, 2));
  await writeFile(new URL('hit-shot.json', root), exportRangeShot(shot));
  console.error(`wrote windows in ${report.elapsedSeconds.toFixed(1)} s, refire ${refireMatch}, repeat ${same}`);
} finally { session.dispose(); }
