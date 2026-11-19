// Reproduce the authored world's actual Havok lines, controls and resource audit.
// This is a measurement script: it does not change the runtime or write physics.
// node scripts/horizons/crossing-house.mjs [--out <report.json>]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Havok from '@babylonjs/havok';
import { NullEngine, Scene, HavokPlugin, Vector3, Logger } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { adaptRangePreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';
import { rangeGitSha } from '../range/run.mjs';

Logger.LogLevels = 0;
export const SOURCE_BUILD = '0b151c5c94849b78ccda6c41a1755b66471e3fa2';
export const CASES = Object.freeze([
  { id: 'opening', setup: { railIndex: 1, originX: 0, yaw: 0, elevation: 13, charge: .45 } },
  { id: 'over-screen', setup: { railIndex: 1, originX: 0, yaw: 0, elevation: 13, charge: .60 } },
  { id: 'across-court', setup: { railIndex: 1, originX: 0, yaw: 4, elevation: 18, charge: .75 } },
  { id: 'second-visit-sensitive', setup: { railIndex: 1, originX: 0, yaw: 7.5, elevation: 18, charge: .75 } },
  { id: 'short-miss', setup: { railIndex: 1, originX: 0, yaw: 0, elevation: 8, charge: .30 } },
]);
export function neighbours(setup) {
  return [['yaw', .5], ['elevation', .5], ['charge', .01], ['originX', .5]].flatMap(([key, step]) => [-1, 1].map(sign => ({ id: `${key}${sign < 0 ? '-' : '+'}`, setup: { ...setup, [key]: Math.round((setup[key] + sign * step) * 100) / 100 } })));
}
const vector = v => v ? [v.x, v.y, v.z] : null;
const order = contacts => contacts.filter(c => c.body.startsWith('worldcraft-object-')).map(c => c.body.slice('worldcraft-object-'.length));
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))], max: sorted.at(-1) };
}
export async function loadPreset() { return validateRangePreset(JSON.parse(await readFile(new URL('../../worlds/foundry/crossing-house/preset.json', import.meta.url), 'utf8'))); }
export async function loadHavok() { return Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) }); }

export function openMeasurement(havok, preset) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120); physics.setSubTimeStep(1000 / 120);
  const { world } = adaptRangePreset(preset);
  // Registration counts only. This does not claim that NullEngine renders shadows.
  const casters = new Set();
  const shadows = { addShadowCaster(mesh) { casters.add(mesh); }, removeShadowCaster(mesh) { casters.delete(mesh); }, getShadowMap() { return { renderList: [...casters] }; } };
  const t0 = performance.now();
  const runtime = createWorldcraftRuntime(scene, { world, build: SOURCE_BUILD, shadows });
  const constructMs = performance.now() - t0;
  const resources = () => ({ staticBodies: runtime.diagnostics().staticBodies, totalBodies: physics.getBodies().length, meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length, casterRegistrations: casters.size, heapBytes: process.memoryUsage().heapUsed });
  function replace(next) {
    runtime.setMode('build');
    const started = performance.now();
    const result = runtime.replaceWorld(adaptRangePreset(next).world, { intent: 'load' });
    if (!result.ok) throw Error(result.error);
    return performance.now() - started;
  }
  function fire(setup, detailed = false) {
    runtime.setMode('build'); runtime.setMode('play');
    if (!runtime.launch(setup)) throw Error(runtime.error);
    const flight = runtime.flight, callbacks = [];
    let incoming = null;
    if (detailed) flight.aggregate.body.getCollisionObservable().add(event => {
      const other = event.collider === flight.aggregate.body ? event.collidedAgainst : event.collider;
      callbacks.push({ body: other?.transformNode?.name ?? '', t: flight.elapsed, point: vector(event.point), normal: vector(event.normal), incoming: incoming && [...incoming], callbackVelocity: vector(flight.aggregate.body.getLinearVelocity()) });
    });
    const stepMs = [];
    for (let i = 0; i < 7300 && !runtime.flight.ended; i++) {
      incoming = vector(flight.aggregate.body.getLinearVelocity());
      const started = performance.now();
      const callbackStart = callbacks.length;
      runtime.beforeStep(); physics._step(1 / 120);
      for (let event = callbackStart; event < callbacks.length; event++) callbacks[event].postStepVelocity = vector(flight.aggregate.body.getLinearVelocity());
      runtime.afterStep();
      stepMs.push(performance.now() - started);
    }
    if (!runtime.last) throw Error('Shot did not resolve');
    const last = runtime.last;
    const result = { setup, launchPhase: null, order: order(last.contacts), contacts: last.contacts, terminal: last.terminal, outcome: { kind: last.goalResult?.kind ?? 'none', status: last.goalResult?.status ?? 'none' }, stepMs: stats(stepMs), dynamicBodiesDuringShot: 1 };
    if (detailed) Object.assign(result, { callbacks, sampledActualPath: last.samples, maxSampledY: Math.max(...last.samples.map(p => p.y)) });
    runtime.setMode('build');
    return result;
  }
  return { constructMs, resources, replace, fire, dispose() {
    runtime.dispose();
    const afterRuntimeDispose = { bodies: physics.getBodies().length, meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length, casterRegistrations: casters.size };
    scene.dispose(); engine.dispose(); return afterRuntimeDispose;
  } };
}

function without(preset, ids) {
  return validateRangePreset({ ...preset, objects: preset.objects.filter(o => !ids.includes(o.id)), rules: { ...preset.rules, fixed: preset.rules.fixed.filter(id => !ids.includes(id)) } });
}

export async function measure() {
  const preset = await loadPreset(), havok = await loadHavok();
  const h = openMeasurement(havok, preset);
  const initialResources = h.resources();
  const shots = CASES.map(c => ({ id: c.id, ...h.fire(c.setup, true) }));
  const nearby = CASES.slice(0, 4).map(c => ({ id: c.id, probes: neighbours(c.setup).map(n => ({ id: n.id, ...h.fire(n.setup) })) }));
  const variants = [
    { id: 'without-ramp', preset: without(preset, ['jump']), shotId: 'over-screen' },
    { id: 'without-screen', preset: without(preset, ['screen']), shotId: 'across-court' },
    { id: 'screen-only', preset: without(preset, ['jump', 'west', 'east', 'far']), shotId: 'across-court' },
    { id: 'screen-turn-minus', preset: { ...preset, objects: preset.objects.map(o => o.id === 'screen' ? { ...o, yaw: 25 } : o) }, shotId: 'across-court' },
    { id: 'screen-turn-plus', preset: { ...preset, objects: preset.objects.map(o => o.id === 'screen' ? { ...o, yaw: 35 } : o) }, shotId: 'across-court' },
    { id: 'screen-slide-minus', preset: { ...preset, objects: preset.objects.map(o => o.id === 'screen' ? { ...o, x: -.5 } : o) }, shotId: 'across-court' },
    { id: 'screen-slide-plus', preset: { ...preset, objects: preset.objects.map(o => o.id === 'screen' ? { ...o, x: .5 } : o) }, shotId: 'across-court' },
  ];
  const controls = variants.map(v => { h.replace(v.preset); return { id: v.id, objects: v.preset.objects, comparedShot: v.shotId, ...h.fire(CASES.find(c => c.id === v.shotId).setup, true) }; });
  const oldPreset = JSON.parse(await readFile(new URL('../../worlds/foundry/return-address/preset.json', import.meta.url), 'utf8'));
  const control = openMeasurement(havok, oldPreset);
  const oldResources = control.resources(); const oldRebuildMs = [];
  for (let i = 0; i < 20; i++) oldRebuildMs.push(control.replace(oldPreset));
  const controlDispose = control.dispose();
  const rebuildMs = [], cycles = [];
  for (let i = 0; i < 20; i++) {
    h.replace(oldPreset);
    rebuildMs.push(h.replace(preset));
    h.fire(CASES[i % 4].setup);
    cycles.push({ cycle: i + 1, ...h.resources() });
  }
  const replay = CASES.map(c => { const actual = h.fire(c.setup, true), before = shots.find(s => s.id === c.id); return { id: c.id, exact: JSON.stringify([before.contacts, before.terminal, before.sampledActualPath]) === JSON.stringify([actual.contacts, actual.terminal, actual.sampledActualPath]) }; });
  const finalResources = h.resources(); const afterDispose = h.dispose();
  return { schema: 'rail-golf-horizons-authored-evidence-v1', sourceBuild: SOURCE_BUILD, measuredCheckout: rangeGitSha(), branch: 'research/horizons-authored-20261119', authority: 'Actual Havok at 120 Hz through unchanged createWorldcraftRuntime, NullEngine; no rendered performance claim.', node: process.version, platform: process.platform, architecture: process.arch, physics: { gravity: RAIL_RULES.gravity, mass: RAIL_RULES.projectileMass, radius: RAIL_RULES.projectileRadius }, preset, shots, nearby, controls, replay, resources: { constructMs: h.constructMs, initial: initialResources, final: finalResources, warmRebuildMs: stats(rebuildMs), lifecycle: cycles, afterDispose, comparison: { id: 'return-address', constructMs: control.constructMs, resources: oldResources, warmRebuildMs: stats(oldRebuildMs), afterDispose: controlDispose }, renderedDrawCalls: null, renderedFrameTiming: null, renderedMemory: null, note: 'Counts cover the Worldcraft physics/layout runtime, not the full forest/launcher/React page. Caster counts are registrations. Heap samples include shared Havok and V8 and are not a leak proof.' } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--out');
  const out = resolve(index < 0 ? 'docs/experiments/horizons/crossing-house-evidence.json' : process.argv[index + 1]);
  const report = await measure(); await mkdir(dirname(out), { recursive: true }); await writeFile(out, JSON.stringify(report) + '\n');
  console.log(JSON.stringify({ out, shots: report.shots.map(s => ({ id: s.id, order: s.order, terminal: s.terminal })), controls: report.controls.map(s => ({ id: s.id, order: s.order, terminal: s.terminal })), resources: { initial: report.resources.initial, rebuild: report.resources.warmRebuildMs, afterDispose: report.resources.afterDispose }, replay: report.replay }, null, 2));
}
