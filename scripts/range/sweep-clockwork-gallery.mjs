// Launch-phase sweep for the Clockwork Gallery preset.
// Aim, power and the world stay fixed inside a layout. Launch phase is the only
// change on the coarse grid. Seed 20261025 is recorded and not applied to the solver.
//
//   node scripts/range/sweep-clockwork-gallery.mjs
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { worldcraftClockworkPose, worldcraftFixedSetup, worldcraftIdentity } from '../../lib/worldcraft-model.js';
import {
  adaptRangePreset, bindRangeShot, createClockworkGalleryPreset, exportRangePreset, exportRangeShot,
  parseRangeShot, sha256Hex, validateRangePreset,
} from '../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';

Logger.LogLevels = 0;
const COARSE = 0.025;
const TICK = 1 / 120;
const PERIOD = 8;
const root = new URL('../../docs/experiments/range/appendix/clockwork-gallery/', import.meta.url);

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
function figureContact(last) {
  return last.contacts.find(contact => contact.body === 'worldcraft-target-figure') ?? null;
}
function variant(base, patch) {
  const goal = {
    ...base.rules.goal,
    motion: patch.motion ? { ...base.rules.goal.motion, ...patch.motion } : base.rules.goal.motion,
  };
  const launcher = patch.launcher ? { ...base.rules.launcher, ...patch.launcher } : base.rules.launcher;
  return validateRangePreset({ ...base, rules: { ...base.rules, launcher, goal } });
}

function harness(havok, world) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(TICK);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: gitSha() });
  return {
    runtime, physics, scene, engine,
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
  const times = hits.map(trial => trial.contactTime).filter(time => time !== null);
  return {
    trials: trials.length,
    hits: hits.length,
    fraction: trials.length ? hits.length / trials.length : 0,
    orders,
    contactTime: times.length ? { min: Math.min(...times), max: Math.max(...times) } : null,
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
  const edges = [];
  for (const run of summary.runs) {
    const stepBack = (phase) => {
      let cursor = phase;
      let guard = 0;
      while (guard++ < 400) {
        const previous = cursor - TICK;
        const wrapped = previous < 0 ? previous + PERIOD : previous;
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
        const wrapped = next >= PERIOD ? next - PERIOD : next;
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
  const contact = figureContact(last);
  const pose = contact ? worldcraftClockworkPose(last.world.rules.target, phase + contact.first) : null;
  return {
    phase,
    hit: last.goalResult.status === 'hit',
    status: last.goalResult.status,
    reason: last.terminal.reason,
    order: orderOf(last),
    contactTime: contact?.first ?? null,
    targetPhase: pose?.u ?? null,
    scored: last.goalResult.scored,
    pin: last.pinResult,
  };
}

const preset = createClockworkGalleryPreset();
const opening = adaptRangePreset(preset);
const onPathPreset = variant(preset, { motion: { center: { x: 0, z: 44 } } });
const layouts = [
  { name: 'opening', note: 'Catalog preset. Plinth (−16, 32), side screen (18, 62), turntable center (4, 44), radius 2 m, period 8 s. Fixed rail yaw 0, elevation 18, charge 0.55.', preset },
  { name: 'on-path', note: 'Measurement only, not the catalog. Same pieces and period. Turntable center (0, 44), so the circle crosses the fixed shot.', preset: onPathPreset },
];
const aimOffsets = [
  { yaw: 0.5, elevation: 18 }, { yaw: -0.5, elevation: 18 },
  { yaw: 1, elevation: 18 }, { yaw: -1, elevation: 18 },
  { yaw: 2, elevation: 18 }, { yaw: -2, elevation: 18 },
  { yaw: 4, elevation: 18 }, { yaw: -4, elevation: 18 },
  { yaw: 6, elevation: 18 }, { yaw: 8, elevation: 18 },
  { yaw: 0, elevation: 18.5 }, { yaw: 0, elevation: 17.5 },
  { yaw: 0, elevation: 19 }, { yaw: 0, elevation: 17 },
];

const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const started = performance.now();
const session = harness(havok, opening.world);
const phases = coarsePhases(PERIOD);
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
      motion: adapted.world.rules.target.motion,
      worldIdentitySha256: sha256(identity),
      trials,
      coarse: { trials: summary.trials, hits: summary.hits, fraction: summary.hits / summary.trials, orders: summary.orders, contactTime: summary.contactTime },
      windows,
    });
    console.error(`${layout.name}: ${summary.hits}/${summary.trials} coarse hits, ${windows.length} windows`);
    if (layout.name === 'opening' && summary.hits !== 0) throw new Error(`opening solved the figure on ${summary.hits} phases`);
  }

  const aimReports = [];
  for (const offset of aimOffsets) {
    const aimed = variant(preset, { launcher: { yaw: offset.yaw, elevation: offset.elevation, charge: 0.55 } });
    const adapted = adaptRangePreset(aimed);
    const trials = [];
    for (const phase of phases) trials.push(recordTrial(session.shoot(adapted.world, phase), phase));
    const summary = summarize(trials);
    const windows = refineEdges(session, adapted.world, summary);
    aimReports.push({
      yaw: offset.yaw,
      elevation: offset.elevation,
      worldIdentitySha256: sha256(worldcraftIdentity(adapted.world)),
      coarse: { trials: summary.trials, hits: summary.hits, fraction: summary.hits / summary.trials, orders: summary.orders, contactTime: summary.contactTime },
      windows,
    });
    console.error(`aim yaw ${offset.yaw} elevation ${offset.elevation}: ${summary.hits}/${summary.trials}`);
  }

  const onPathWorld = adaptRangePreset(onPathPreset).world;
  let hitPhase = null;
  const onPathReport = layoutReports.find(layout => layout.name === 'on-path');
  hitPhase = onPathReport.trials.find(trial => trial.hit)?.phase ?? null;
  if (hitPhase === null) throw new Error('on-path layout has no coarse hit to bind');
  const first = session.shoot(onPathWorld, hitPhase);
  if (first.goalResult.status !== 'hit') throw new Error(`on-path missed at phase ${hitPhase}`);
  const second = session.shoot(onPathWorld, hitPhase);
  const same = JSON.stringify(recordTrial(first, hitPhase)) === JSON.stringify(recordTrial(second, hitPhase))
    && JSON.stringify(first.contacts) === JSON.stringify(second.contacts)
    && JSON.stringify(first.terminal) === JSON.stringify(second.terminal);
  const shot = await bindRangeShot({
    preset: onPathPreset, world: onPathWorld, setup: worldcraftFixedSetup(onPathWorld), build: gitSha(),
    launch: first.launch, points: first.samples, events: first.evidence, contacts: first.contacts,
    terminal: first.terminal, launchPhase: first.launchPhase,
  });
  const imported = parseRangeShot(exportRangeShot(shot));
  const refired = session.shoot(imported.worldSnapshot.world, imported.launchPhase);
  const refireMatch = JSON.stringify(recordTrial(refired, imported.launchPhase)) === JSON.stringify(recordTrial(first, hitPhase))
    && JSON.stringify(refired.contacts) === JSON.stringify(first.contacts)
    && JSON.stringify(refired.terminal) === JSON.stringify(first.terminal);
  const contact = figureContact(first);
  const pose = worldcraftClockworkPose(onPathWorld.rules.target, first.launchPhase + contact.first);
  const openingMiss = session.shoot(opening.world, 0);
  const openingAgain = session.shoot(opening.world, 0);
  const openingMatch = JSON.stringify(recordTrial(openingMiss, 0)) === JSON.stringify(recordTrial(openingAgain, 0))
    && JSON.stringify(openingMiss.contacts) === JSON.stringify(openingAgain.contacts)
    && JSON.stringify(openingMiss.terminal) === JSON.stringify(openingAgain.terminal);
  const presetHash = await sha256Hex(exportRangePreset(preset));
  const bodiesBefore = session.physics.getBodies().length;
  session.runtime.dispose();
  const bodiesAfter = session.physics.getBodies().length;
  const report = {
    seed: 20261025,
    gitSha: gitSha(),
    presetId: preset.id,
    presetHash,
    openingWorldIdentitySha256: sha256(worldcraftIdentity(opening.world)),
    onPathWorldIdentitySha256: sha256(worldcraftIdentity(onPathWorld)),
    aimLayout: 'opening',
    coarseStepSeconds: COARSE,
    fineStepSeconds: TICK,
    periodSeconds: PERIOD,
    radiusMeters: 2,
    arcSpeedMetersPerSecond: 2 * Math.PI * 2 / PERIOD,
    elapsedSeconds: (performance.now() - started) / 1000,
    disposal: { bodiesBefore, bodiesAfter },
    determinism: {
      openingPhase0: { match: openingMatch },
      onPath: { phase: hitPhase, match: same },
    },
    saveImportRefire: {
      phase: hitPhase,
      match: refireMatch,
      bindingHash: shot.bindingHash,
      presetHash: shot.presetHash,
      contactTime: contact.first,
      targetPhase: pose.u,
      contactPoint: contact.point,
      pose: { x: pose.x, y: pose.y, z: pose.z },
    },
    layouts: layoutReports,
    aim: aimReports,
  };
  await mkdir(root, { recursive: true });
  await writeFile(new URL('windows.json', root), JSON.stringify(report, null, 2));
  await writeFile(new URL('on-path-preset.json', root), exportRangePreset(onPathPreset));
  await writeFile(new URL('hit-shot.json', root), exportRangeShot(shot));
  console.error(`wrote windows in ${report.elapsedSeconds.toFixed(1)} s, refire ${refireMatch}, repeat ${same}, disposal ${bodiesBefore} -> ${bodiesAfter}`);
  if (!same || !refireMatch || !openingMatch || bodiesAfter !== 0) process.exitCode = 1;
} finally {
  session.runtime.dispose();
  session.scene.dispose();
  session.engine.dispose();
}
